'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CocktailRecipe } from '@/data/RecipeManager';
import type { ReceiptEntity } from '@/lib/receipt/types';
import { createReceiptEntity } from '@/lib/receipt/mapTicketToReceipt';
import ReceiptPaper from './ReceiptPaper';
import '@/app/receipt.css';

type DragState = {
  instanceId: string;
  startX: number;
  startY: number;
  initLeft: number;
  initTop: number;
} | null;

type ReceiptContextValue = {
  activeTicket: CocktailRecipe | null;
  /** Free receipt currently owning the mat build (null = freestyle / unbound). */
  activeReceiptId: string | null;
  /** Active mode id/label for closed receipt titles. */
  modeName: string;
  stageRef: React.RefObject<HTMLDivElement | null>;
  printing: ReceiptEntity[];
  free: ReceiptEntity[];
  /** True when any free receipt is expanded (full face). */
  anyInspected: boolean;
  toast: string | null;
  handleGenerate: () => void;
  handleAnimationEnd: (instanceId: string, rect: DOMRect) => void;
  onPointerDown: (instanceId: string, e: React.PointerEvent) => void;
  onPointerMove: (instanceId: string, e: React.PointerEvent) => void;
  onPointerUp: (instanceId: string, e: React.PointerEvent) => void;
  onContextMenu: (instanceId: string, e: React.MouseEvent) => void;
  onToggleExpand: (instanceId: string) => void;
};

const ReceiptContext = createContext<ReceiptContextValue | null>(null);

function useReceipt(): ReceiptContextValue {
  const ctx = useContext(ReceiptContext);
  if (!ctx) throw new Error('Receipt components must be used within ReceiptProvider');
  return ctx;
}

/** Stage chrome flags for host (POV overflow, etc.). Must be under ReceiptProvider. */
export function useReceiptStageFlags(): { anyInspected: boolean } {
  const { anyInspected } = useReceipt();
  return { anyInspected };
}

type ReceiptProviderProps = {
  activeTicket: CocktailRecipe | null;
  /** Receipt instance currently bound to drink_placement. */
  activeReceiptId: string | null;
  /** Active mode id/label for closed receipt titles (e.g. OBELISCO, CLASSICS). */
  modeName: string;
  onActiveTicketChange: (ticket: CocktailRecipe | null) => void;
  onGenerate: () => CocktailRecipe | null;
  /**
   * Fired when a free receipt is focused/selected — host parks previous mat
   * build and loads this order’s parked build.
   */
  onSelectReceipt: (instanceId: string, ticket: CocktailRecipe) => void;
  /**
   * Host fills this ref to call success-validate ticket exit (slide away + remove).
   */
  handoffExitRef?: React.MutableRefObject<((instanceId: string) => void) | null>;
  /**
   * Host reads frozen pricedOrder.total for an instance (FS49 money flyby).
   * Provider assigns the lookup function; host calls at success validate.
   */
  getReceiptTotalRef?: React.MutableRefObject<
    ((instanceId: string) => number | null) | null
  >;
  children: React.ReactNode;
};

/** Desktop max of --receipt-paper-w (min(260px, 28vw)); clamp uses this max. */
const PAPER_W = 260;
/**
 * Matches --receipt-paper-h desktop max (min(300px, 38vh)).
 * Standard fixed outer height for all free paper (summary + full).
 */
const PAPER_H = 300;

/** Match CSS transition (~0.9s) + small buffer before remove. */
export const RECEIPT_HANDOFF_EXIT_MS = 1000;

export function ReceiptProvider({
  activeTicket,
  activeReceiptId,
  modeName,
  onActiveTicketChange,
  onGenerate,
  onSelectReceipt,
  handoffExitRef,
  getReceiptTotalRef,
  children,
}: ReceiptProviderProps) {
  const [receipts, setReceipts] = useState<ReceiptEntity[]>([]);
  const [activeZ, setActiveZ] = useState(501);
  const [toast, setToast] = useState<string | null>(null);
  const dragRef = useRef<DragState>(null);
  /** True once pointer moved past drag threshold (real drag, not a click). */
  const dragMovedRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const printQueueRef = useRef<CocktailRecipe[]>([]);
  const printingRef = useRef(false);
  /** Keep z counter in a ref so we never nest setState inside another updater. */
  const activeZRef = useRef(501);
  /** Print-complete fallback timers by instanceId. */
  const printTimeoutsRef = useRef<Map<string, number>>(new Map());
  /** Handoff exit remove timers by instanceId. */
  const handoffExitTimeoutsRef = useRef<Map<string, number>>(new Map());
  /** Latest receipts for total lookup without stale closures (FS49). */
  const receiptsRef = useRef(receipts);
  receiptsRef.current = receipts;

  const isPrinting = receipts.some((r) => r.phase === 'printing');
  const anyInspected = receipts.some(
    (r) => r.phase === 'free' && !r.inMask && r.inspected && !r.crumpled
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  /** Allocate next z-index without impure setState nesting (Strict Mode safe). */
  const allocZ = useCallback(() => {
    activeZRef.current += 1;
    const z = activeZRef.current;
    setActiveZ(z);
    return z;
  }, []);

  const resolvePaperWidth = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return PAPER_W;
    const paperEl = stage.querySelector('.receipt-wrapper') as HTMLElement | null;
    if (paperEl?.offsetWidth && paperEl.offsetWidth > 0) return paperEl.offsetWidth;
    return Math.min(PAPER_W, Math.round(stage.clientWidth * 0.28));
  }, []);

  const resolvePaperHeight = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return PAPER_H;
    const paperEl = stage.querySelector('.receipt-wrapper') as HTMLElement | null;
    if (paperEl?.offsetHeight && paperEl.offsetHeight > 0) return paperEl.offsetHeight;
    // Mirror CSS: min(300px, 38vh)
    return Math.min(PAPER_H, Math.round(window.innerHeight * 0.38));
  }, []);

  const clampPosition = useCallback(
    (left: number, top: number) => {
      const stage = stageRef.current;
      if (!stage) return { left, top };
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const paperW = resolvePaperWidth();
      const paperH = resolvePaperHeight();
      const maxL = Math.max(0, w - paperW);
      const maxT = Math.max(0, h - paperH);
      return {
        left: Math.min(Math.max(0, left), maxL),
        top: Math.min(Math.max(0, top), maxT),
      };
    },
    [resolvePaperWidth, resolvePaperHeight]
  );

  /** Nudge paper fully on-stage when Inspect opens (same standard size). */
  const positionForInspect = useCallback(
    (current: { left: number; top: number }) => {
      const stage = stageRef.current;
      if (!stage) return current;
      const w = stage.clientWidth;
      const paperW = resolvePaperWidth();
      const preferredLeft = Math.max(12, Math.min(current.left, w - paperW - 24));
      const preferredTop = Math.max(10, Math.min(current.top, stage.clientHeight * 0.06));
      return clampPosition(preferredLeft, preferredTop);
    },
    [clampPosition, resolvePaperWidth]
  );

  const releaseToFree = useCallback(
    (instanceId: string, rect?: DOMRect | null) => {
      const stage = stageRef.current;
      let pos = { left: 12, top: 56 };
      if (stage && rect) {
        const sRect = stage.getBoundingClientRect();
        pos = clampPosition(rect.left - sRect.left, rect.top - sRect.top);
      } else if (stage) {
        const paperW = resolvePaperWidth();
        pos = clampPosition(stage.clientWidth - paperW - 8, 56);
      }

      setReceipts((prev) => {
        const target = prev.find((r) => r.instanceId === instanceId);
        if (!target || target.phase !== 'printing') return prev;
        return prev.map((r) =>
          r.instanceId === instanceId
            ? {
                ...r,
                phase: 'free' as const,
                inMask: false,
                position: pos,
                inspected: false,
              }
            : r
        );
      });
      printingRef.current = false;

      const t = printTimeoutsRef.current.get(instanceId);
      if (t != null) {
        window.clearTimeout(t);
        printTimeoutsRef.current.delete(instanceId);
      }
    },
    [clampPosition, resolvePaperWidth]
  );

  const startPrint = useCallback(
    (ticket: CocktailRecipe) => {
      printingRef.current = true;
      // Pure: create entity once outside any setState updater (Strict Mode safe)
      const nextZ = allocZ();
      const entity = createReceiptEntity(ticket, nextZ);
      // Print only — do not steal selection / mat / active ticket (FS40)
      setReceipts((prev) => [...prev, entity]);

      // Fallback if CSS animationend never fires
      const timeoutId = window.setTimeout(() => {
        releaseToFree(entity.instanceId, null);
      }, 1700);
      printTimeoutsRef.current.set(entity.instanceId, timeoutId);
    },
    [allocZ, releaseToFree]
  );

  const enqueueOrPrint = useCallback(
    (ticket: CocktailRecipe) => {
      if (printingRef.current) {
        printQueueRef.current.push(ticket);
        return;
      }
      startPrint(ticket);
    },
    [startPrint]
  );

  useEffect(() => {
    if (isPrinting) {
      printingRef.current = true;
      return;
    }
    printingRef.current = false;
    if (printQueueRef.current.length > 0) {
      const next = printQueueRef.current.shift()!;
      startPrint(next);
    }
  }, [isPrinting, startPrint]);

  useEffect(() => {
    return () => {
      printTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      printTimeoutsRef.current.clear();
      handoffExitTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      handoffExitTimeoutsRef.current.clear();
    };
  }, []);

  /**
   * Success validate: mark receipt for upward slide, then remove from stage.
   * Other receipts are untouched.
   */
  const handoffExitReceipt = useCallback((instanceId: string) => {
    setReceipts((prev) => {
      const target = prev.find((r) => r.instanceId === instanceId);
      if (!target || target.handoffExit) return prev;
      return prev.map((r) =>
        r.instanceId === instanceId ? { ...r, handoffExit: true, inspected: false } : r
      );
    });

    const existing = handoffExitTimeoutsRef.current.get(instanceId);
    if (existing != null) window.clearTimeout(existing);

    const timeoutId = window.setTimeout(() => {
      setReceipts((prev) => prev.filter((r) => r.instanceId !== instanceId));
      handoffExitTimeoutsRef.current.delete(instanceId);
      const printT = printTimeoutsRef.current.get(instanceId);
      if (printT != null) {
        window.clearTimeout(printT);
        printTimeoutsRef.current.delete(instanceId);
      }
    }, RECEIPT_HANDOFF_EXIT_MS);
    handoffExitTimeoutsRef.current.set(instanceId, timeoutId);
  }, []);

  useEffect(() => {
    if (!handoffExitRef) return;
    handoffExitRef.current = handoffExitReceipt;
    return () => {
      handoffExitRef.current = null;
    };
  }, [handoffExitRef, handoffExitReceipt]);

  const getReceiptTotal = useCallback((instanceId: string): number | null => {
    const entity = receiptsRef.current.find((r) => r.instanceId === instanceId);
    if (!entity) return null;
    const t = entity.pricedOrder?.total;
    return typeof t === 'number' && Number.isFinite(t) ? t : null;
  }, []);

  useEffect(() => {
    if (!getReceiptTotalRef) return;
    getReceiptTotalRef.current = getReceiptTotal;
    return () => {
      getReceiptTotalRef.current = null;
    };
  }, [getReceiptTotalRef, getReceiptTotal]);

  const handleGenerate = useCallback(() => {
    const ticket = onGenerate();
    if (!ticket) {
      showToast('NO RECIPES AVAILABLE');
      return;
    }
    enqueueOrPrint(ticket);
  }, [onGenerate, enqueueOrPrint, showToast]);

  const handleAnimationEnd = useCallback(
    (instanceId: string, rect: DOMRect) => {
      releaseToFree(instanceId, rect);
    },
    [releaseToFree]
  );

  const bumpZ = useCallback(
    (instanceId: string, opts?: { clearInspect?: boolean }) => {
      const nextZ = allocZ();
      const clearInspect = opts?.clearInspect !== false;
      setReceipts((prev) =>
        prev.map((r) =>
          r.instanceId === instanceId
            ? {
                ...r,
                zIndex: nextZ,
                inspected: clearInspect ? false : r.inspected,
              }
            : r
        )
      );
    },
    [allocZ]
  );

  /** Bind mat ownership to a free receipt (idempotent if already active). */
  const selectFreeReceipt = useCallback(
    (instanceId: string) => {
      const entity = receipts.find((r) => r.instanceId === instanceId);
      if (!entity || entity.phase !== 'free' || entity.inMask || entity.handoffExit)
        return;
      onSelectReceipt(entity.instanceId, entity.ticket);
      onActiveTicketChange(entity.ticket);
    },
    [receipts, onSelectReceipt, onActiveTicketChange]
  );

  /** Click receipt: toggle expanded full face ↔ compact summary. */
  const toggleExpand = useCallback(
    (instanceId: string) => {
      selectFreeReceipt(instanceId);
      const nextZ = allocZ();
      setReceipts((prev) =>
        prev.map((r) => {
          if (r.instanceId !== instanceId) return r;
          if (r.crumpled || r.phase === 'printing' || r.inMask || r.handoffExit)
            return r;
          if (!r.inspected) {
            return {
              ...r,
              inspected: true,
              zIndex: nextZ,
              position: positionForInspect(r.position),
            };
          }
          return { ...r, inspected: false, zIndex: nextZ };
        })
      );
    },
    [allocZ, positionForInspect, selectFreeReceipt]
  );

  const onPointerDown = useCallback(
    (instanceId: string, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const entity = receipts.find((r) => r.instanceId === instanceId);
      if (
        !entity ||
        entity.phase === 'printing' ||
        entity.inMask ||
        entity.handoffExit
      )
        return;

      // Focus/select free receipt → mat shows this order’s parked build
      selectFreeReceipt(instanceId);

      e.currentTarget.setPointerCapture(e.pointerId);
      dragMovedRef.current = false;
      dragRef.current = {
        instanceId,
        startX: e.clientX,
        startY: e.clientY,
        initLeft: entity.position.left,
        initTop: entity.position.top,
      };
      // Raise stack; keep expand until a real drag (or click toggle on up)
      bumpZ(instanceId, { clearInspect: false });
    },
    [receipts, bumpZ, selectFreeReceipt]
  );

  const onPointerMove = useCallback(
    (instanceId: string, e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.instanceId !== instanceId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      // Drag threshold — real drag contracts to summary and moves paper
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      dragMovedRef.current = true;
      const pos = clampPosition(drag.initLeft + dx, drag.initTop + dy);
      setReceipts((prev) =>
        prev.map((r) =>
          r.instanceId === instanceId ? { ...r, position: pos, inspected: false } : r
        )
      );
    },
    [clampPosition]
  );

  const onPointerUp = useCallback(
    (instanceId: string, e: React.PointerEvent) => {
      if (dragRef.current?.instanceId !== instanceId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      const wasDrag = dragMovedRef.current;
      dragRef.current = null;
      dragMovedRef.current = false;
      // Pure click (no drag) → expand / contract
      if (!wasDrag) {
        toggleExpand(instanceId);
      }
    },
    [toggleExpand]
  );

  /** Suppress browser context menu; no receipt action popup. */
  const onContextMenu = useCallback((_instanceId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const printing = receipts.filter((r) => r.phase === 'printing' && r.inMask);
  const free = receipts.filter((r) => r.phase === 'free' && !r.inMask);

  const value = useMemo<ReceiptContextValue>(
    () => ({
      activeTicket,
      activeReceiptId,
      modeName,
      stageRef,
      printing,
      free,
      anyInspected,
      toast,
      handleGenerate,
      handleAnimationEnd,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onContextMenu,
      onToggleExpand: toggleExpand,
    }),
    [
      activeTicket,
      activeReceiptId,
      modeName,
      printing,
      free,
      anyInspected,
      toast,
      handleGenerate,
      handleAnimationEnd,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onContextMenu,
      toggleExpand,
    ]
  );

  return <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>;
}

/** Printer + paper assets only — mount inside Obelisco POV stage. */
export function ReceiptStageOverlay() {
  const {
    stageRef,
    printing,
    free,
    anyInspected,
    activeReceiptId,
    modeName,
    toast,
    handleAnimationEnd,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onContextMenu,
    onToggleExpand,
  } = useReceipt();

  const paperProps = {
    modeName,
    onAnimationEnd: handleAnimationEnd,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onContextMenu,
    onToggleExpand,
  };

  return (
    <div
      className={`receipt-system receipt-system--pov${anyInspected ? ' receipt-system--has-inspect' : ''}`}
      aria-hidden={false}
    >
      <div className="receipt-stage-root" ref={stageRef}>
        <div className="receipt-hardware-cluster">
          <div className="receipt-hardware-wall">
            <div className="receipt-printer-bezel">
              <div className="receipt-printer-slot" />
            </div>
          </div>
        </div>

        <div className="receipt-printer-mask">
          {printing.map((entity) => (
            <ReceiptPaper
              key={entity.instanceId}
              entity={entity}
              isActiveOrder={entity.instanceId === activeReceiptId}
              {...paperProps}
            />
          ))}
        </div>

        <div
          className={`receipt-free-layer${anyInspected ? ' receipt-free-layer--inspecting' : ''}`}
        >
          {free.map((entity) => (
            <ReceiptPaper
              key={entity.instanceId}
              entity={entity}
              isActiveOrder={entity.instanceId === activeReceiptId}
              {...paperProps}
            />
          ))}
        </div>

        {toast ? <div className="receipt-copy-toast">{toast}</div> : null}
      </div>
    </div>
  );
}

type ReceiptToolbarProps = {
  errors: string[];
  validationPassed: boolean;
  onValidate: () => void;
};

/** Generate / Validate / feedback — mount outside the POV corner art. */
export function ReceiptToolbar({ errors, validationPassed, onValidate }: ReceiptToolbarProps) {
  const { activeTicket, handleGenerate } = useReceipt();

  return (
    <div className="receipt-system receipt-toolbar">
      <div className="receipt-controls">
        <button type="button" className="btn-8bit" onClick={handleGenerate}>
          Generate Ticket
        </button>
        <button type="button" className="btn-8bit btn-8bit-green" onClick={onValidate}>
          Validate Drink
        </button>
        <span className="receipt-active-hint">
          {activeTicket ? `ACTIVE: ${activeTicket.name}` : 'NO ACTIVE TICKET'}
        </span>
      </div>
      <div className="receipt-validation">
        {errors.length > 0 && (
          <div className="receipt-validation-errors">
            {errors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
          </div>
        )}
        {validationPassed && (
          <div className="receipt-validation-pass">VALIDATION PASSED!</div>
        )}
      </div>
    </div>
  );
}

/** @deprecated Prefer ReceiptProvider + ReceiptStageOverlay + ReceiptToolbar */
export default function ReceiptSystem() {
  return null;
}

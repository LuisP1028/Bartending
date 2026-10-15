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
  /** Expanded (full face) when gesture began — FS62: allow body scroll, no paper-drag. */
  wasInspected: boolean;
  /** True when wrapper captured the pointer (summary drag path only). */
  captured: boolean;
  pointerId: number;
  /** Full-face scrollport scrollTop at pointerdown (detect real scroll vs tap). */
  startScrollTop: number;
} | null;

export type PatronReceiptMeta = {
  characterId: string;
  seatId: string;
  patronName: string;
};

export type PrinterLifecyclePhase =
  | 'idle'
  | 'fading-in'
  | 'printing'
  | 'holding'
  | 'fading-out';

export interface ReceiptInspectController {
  inspectReceipt: (instanceId: string | null) => void;
  getInspectedId: () => string | null;
}

type ReceiptContextValue = {
  activeTicket: CocktailRecipe | null;
  /** Free receipt currently owning the mat build (null = freestyle / unbound). */
  activeReceiptId: string | null;
  /** Active mode id/label for closed receipt titles. */
  modeName: string;
  stageRef: React.RefObject<HTMLDivElement | null>;
  printerPhase: PrinterLifecyclePhase;
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
  onPointerCancel: (instanceId: string, e: React.PointerEvent) => void;
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
  /**
   * FS51/FS114: host prints character-attached tickets on sit-complete.
   * Always returns new receipt instanceId synchronously (even when queued).
   */
  printAttachedTicketRef?: React.MutableRefObject<
    | ((
        ticket: CocktailRecipe,
        meta: PatronReceiptMeta
      ) => string)
    | null
  >;
  /**
   * FS51: host reads characterId/seatId/patronName for leave after success validate.
   */
  getReceiptAttachmentRef?: React.MutableRefObject<
    ((instanceId: string) => PatronReceiptMeta | null) | null
  >;
  /**
   * FS114: Imperative inspect controller for patron-click receipt inspection & dismissal.
   */
  inspectControllerRef?: React.MutableRefObject<ReceiptInspectController | null>;
  /**
   * FS114: Notifies host when the inspected receipt instanceId changes (or null on dismiss).
   */
  onInspectChange?: (instanceId: string | null) => void;
  children: React.ReactNode;
};

/** Design-max paper width (px) at full POV stage; clamp/fallback ceiling (FS52/FS60). */
const PAPER_W = 280;
/**
 * Design-max paper height (px) at full POV stage; inspect outer bound ceiling.
 * Fallbacks use stage size with coverage caps (FS60).
 */
const PAPER_H = 320;
/** POV design width — match PovStageShell aspect + hotspot viewBox. */
const STAGE_DESIGN_W = 1184;
/** Soft absolute floors (under coverage caps) — mirror receipt.css FS60. */
const PAPER_W_SOFT_MIN = 120;
const PAPER_H_SOFT_MIN = 100;
/** FS60 stage-coverage budgets (must match receipt.css). */
const PAPER_W_STAGE_FRAC = 0.32;
const PAPER_H_STAGE_FRAC = 0.42;
const PAPER_W_CQ_FRAC = 0.26;
const PAPER_H_CQ_FRAC = 0.38;

/**
 * Probe computed CSS custom props on .receipt-system--pov (canonical size source).
 * Falls back to FS60 JS mirror of coverage-capped hybrid math.
 */
function readCssPaperMetrics(
  stage: HTMLElement
): { w: number; h: number; scale: number } | null {
  const sys =
    (stage.closest('.receipt-system--pov') as HTMLElement | null) ??
    (stage.parentElement?.closest('.receipt-system--pov') as HTMLElement | null) ??
    (document.querySelector('.receipt-system--pov') as HTMLElement | null);
  if (!sys) return null;

  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;' +
    'width:var(--receipt-paper-w);height:var(--receipt-paper-h);' +
    'font-size:calc(100px * var(--receipt-ui-scale, 1));';
  sys.appendChild(probe);
  const cs = getComputedStyle(probe);
  const w = parseFloat(cs.width);
  const h = parseFloat(cs.height);
  const scalePx = parseFloat(cs.fontSize);
  probe.remove();

  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) return null;
  const scale =
    Number.isFinite(scalePx) && scalePx > 0 ? Math.min(1, Math.max(0.45, scalePx / 100)) : NaN;
  return {
    w: Math.round(w),
    h: Math.round(h),
    scale: Number.isFinite(scale) ? scale : NaN,
  };
}

/** FS60 mirror when CSS probe unavailable — coverage caps win over viewport floors. */
function computePaperMetricsFromStage(
  stageW: number,
  stageH: number
): { w: number; h: number; scale: number } {
  /* Mirror CSS: clamp(0.45, stageW/1184 + 0.05, 1) */
  const scale = Math.min(1, Math.max(0.45, stageW / STAGE_DESIGN_W + 0.05));

  const vwFloor =
    typeof window !== 'undefined'
      ? Math.min(window.innerWidth * 0.5, 240)
      : 240;
  const vhFloor =
    typeof window !== 'undefined'
      ? Math.min(window.innerHeight * 0.42, 280)
      : 280;

  const w = Math.round(
    Math.min(
      PAPER_W,
      stageW * PAPER_W_STAGE_FRAC,
      Math.max(stageW * PAPER_W_CQ_FRAC, vwFloor, PAPER_W_SOFT_MIN)
    )
  );
  const h = Math.round(
    Math.min(
      PAPER_H,
      stageH * PAPER_H_STAGE_FRAC,
      Math.max(stageH * PAPER_H_CQ_FRAC, vhFloor, PAPER_H_SOFT_MIN)
    )
  );
  return { w: Math.max(1, w), h: Math.max(1, h), scale };
}

/** Match CSS transition (~0.9s) + small buffer before remove. */
export const RECEIPT_HANDOFF_EXIT_MS = 1000;

/** Transient printer timing constants (INV-PRINTER-TRANSIENT-01) */
const PRINTER_FADE_IN_MS = 180;
const PRINTER_UNROLL_MS = 650;
const PRINTER_HOLD_MS = 900;
const PRINTER_FADE_OUT_MS = 280;

export function ReceiptProvider({
  activeTicket,
  activeReceiptId,
  modeName,
  onActiveTicketChange,
  onGenerate,
  onSelectReceipt,
  handoffExitRef,
  getReceiptTotalRef,
  printAttachedTicketRef,
  getReceiptAttachmentRef,
  inspectControllerRef,
  onInspectChange,
  children,
}: ReceiptProviderProps) {
  const [receipts, setReceipts] = useState<ReceiptEntity[]>([]);
  const [, setActiveZ] = useState(501);
  const [printerPhase, setPrinterPhase] = useState<PrinterLifecyclePhase>('idle');
  const [toast, setToast] = useState<string | null>(null);
  const dragRef = useRef<DragState>(null);
  /** True once pointer moved past drag threshold (real paper drag, not a click). */
  const dragMovedRef = useRef(false);
  /**
   * FS62: true when expanded-face gesture moved enough to count as scroll/pan
   * (suppresses toggle-collapse on pointerup).
   */
  const scrollGestureRef = useRef(false);
  /**
   * FS86 / RE86 — Summary paper-drag ownership (Safari-first).
   */
  const dragScrollLockRef = useRef(false);
  const summaryTouchClaimRef = useRef(false);
  const acquireDragScrollLock = useCallback(() => {
    if (dragScrollLockRef.current) return;
    dragScrollLockRef.current = true;
    document.documentElement.classList.add('receipt-dragging');
    document.body.classList.add('receipt-dragging');
  }, []);
  const releaseDragScrollLock = useCallback(() => {
    if (!dragScrollLockRef.current) return;
    dragScrollLockRef.current = false;
    document.documentElement.classList.remove('receipt-dragging');
    document.body.classList.remove('receipt-dragging');
  }, []);
  const stageRef = useRef<HTMLDivElement>(null);
  /** Queue of receipt instanceIds waiting for their transient print animation */
  const printQueueRef = useRef<string[]>([]);
  const printingRef = useRef(false);
  const activePrintIdRef = useRef<string | null>(null);
  /** Keep z counter in a ref so we never nest setState inside another updater. */
  const activeZRef = useRef(501);
  /** Transient printer phase timers */
  const printerTimersRef = useRef<number[]>([]);
  /** Handoff exit remove timers by instanceId. */
  const handoffExitTimeoutsRef = useRef<Map<string, number>>(new Map());
  /** Latest receipts for synchronous lookup without stale closures (FS49/FS114). */
  const receiptsRef = useRef(receipts);
  receiptsRef.current = receipts;
  const onInspectChangeRef = useRef(onInspectChange);
  onInspectChangeRef.current = onInspectChange;

  const anyInspected = receipts.some(
    (r) => r.phase === 'free' && !r.inMask && r.inspected && !r.crumpled
  );

  const clearPrinterTimers = useCallback(() => {
    printerTimersRef.current.forEach((id) => window.clearTimeout(id));
    printerTimersRef.current = [];
  }, []);

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
    const probed = readCssPaperMetrics(stage);
    if (probed) return probed.w;
    return computePaperMetricsFromStage(stage.clientWidth, stage.clientHeight).w;
  }, []);

  const resolvePaperHeight = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return PAPER_H;
    const paperEl = stage.querySelector('.receipt-wrapper') as HTMLElement | null;
    if (paperEl?.offsetHeight && paperEl.offsetHeight > 0) return paperEl.offsetHeight;
    const probed = readCssPaperMetrics(stage);
    if (probed) return probed.h;
    return computePaperMetricsFromStage(stage.clientWidth, stage.clientHeight).h;
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

  /**
   * FS114 (INV-PRINTER-TRANSIENT-01):
   * Execute transient printer sequence for `instanceId`:
   * fading-in -> printing -> holding -> fading-out -> release to stored free & advance queue or idle.
   */
  const runPrintCycleRef = useRef<(instanceId: string) => void>(() => {});
  const advancePrintQueue = useCallback(() => {
    clearPrinterTimers();
    while (printQueueRef.current.length > 0) {
      const nextId = printQueueRef.current.shift()!;
      const exists = receiptsRef.current.find(
        (r) => r.instanceId === nextId && r.phase === 'queued'
      );
      if (exists) {
        runPrintCycleRef.current(nextId);
        return;
      }
    }
    printingRef.current = false;
    activePrintIdRef.current = null;
    setPrinterPhase('idle');
  }, [clearPrinterTimers]);

  const runPrintCycle = useCallback(
    (instanceId: string) => {
      clearPrinterTimers();
      printingRef.current = true;
      activePrintIdRef.current = instanceId;

      setReceipts((prev) => {
        const next = prev.map((r) =>
          r.instanceId === instanceId
            ? { ...r, phase: 'printing' as const, inMask: true }
            : r
        );
        receiptsRef.current = next;
        return next;
      });

      setPrinterPhase('fading-in');

      const t1 = window.setTimeout(() => {
        setPrinterPhase('printing');
      }, PRINTER_FADE_IN_MS);

      const t2 = window.setTimeout(() => {
        setPrinterPhase('holding');
      }, PRINTER_FADE_IN_MS + PRINTER_UNROLL_MS);

      const t3 = window.setTimeout(() => {
        setPrinterPhase('fading-out');
      }, PRINTER_FADE_IN_MS + PRINTER_UNROLL_MS + PRINTER_HOLD_MS);

      const t4 = window.setTimeout(() => {
        setReceipts((prev) => {
          const next = prev.map((r) =>
            r.instanceId === instanceId && r.phase === 'printing'
              ? {
                  ...r,
                  phase: 'free' as const,
                  inMask: false,
                }
              : r
          );
          receiptsRef.current = next;
          return next;
        });
        advancePrintQueue();
      }, PRINTER_FADE_IN_MS + PRINTER_UNROLL_MS + PRINTER_HOLD_MS + PRINTER_FADE_OUT_MS);

      printerTimersRef.current = [t1, t2, t3, t4];
    },
    [clearPrinterTimers, advancePrintQueue]
  );
  runPrintCycleRef.current = runPrintCycle;

  /** Keep free paper on-stage when stage box resizes (FS52 §7.3). */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;

    const reclampFree = () => {
      setReceipts((prev) => {
        let changed = false;
        const next = prev.map((r) => {
          if (r.phase !== 'free' || r.inMask || r.crumpled) return r;
          const clamped = clampPosition(r.position.left, r.position.top);
          if (
            clamped.left === r.position.left &&
            clamped.top === r.position.top
          ) {
            return r;
          }
          changed = true;
          return { ...r, position: clamped };
        });
        return changed ? next : prev;
      });
    };

    const ro = new ResizeObserver(() => {
      reclampFree();
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [clampPosition]);

  const enqueueOrStartEntity = useCallback(
    (entity: ReceiptEntity): string => {
      if (printingRef.current) {
        const queuedEntity: ReceiptEntity = {
          ...entity,
          phase: 'queued',
          inMask: true,
        };
        receiptsRef.current = [...receiptsRef.current, queuedEntity];
        setReceipts((prev) => {
          const next = prev.some((r) => r.instanceId === queuedEntity.instanceId)
            ? prev
            : [...prev, queuedEntity];
          receiptsRef.current = next;
          return next;
        });
        printQueueRef.current.push(entity.instanceId);
        return entity.instanceId;
      }

      const printingEntity: ReceiptEntity = {
        ...entity,
        phase: 'printing',
        inMask: true,
      };
      receiptsRef.current = [...receiptsRef.current, printingEntity];
      setReceipts((prev) => {
        const next = prev.some((r) => r.instanceId === printingEntity.instanceId)
          ? prev
          : [...prev, printingEntity];
        receiptsRef.current = next;
        return next;
      });
      runPrintCycle(entity.instanceId);
      return entity.instanceId;
    },
    [runPrintCycle]
  );

  useEffect(() => {
    return () => {
      clearPrinterTimers();
      handoffExitTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      handoffExitTimeoutsRef.current.clear();
    };
  }, [clearPrinterTimers]);

  /**
   * Success validate: remove receipt (or animate handoffExit if currently inspected),
   * and notify inspect listener if this receipt was inspected.
   */
  const handoffExitReceipt = useCallback(
    (instanceId: string) => {
      const target = receiptsRef.current.find((r) => r.instanceId === instanceId);
      if (!target) return;

      printQueueRef.current = printQueueRef.current.filter((id) => id !== instanceId);
      if (activePrintIdRef.current === instanceId) {
        advancePrintQueue();
      }

      if (target.inspected) {
        onInspectChangeRef.current?.(null);
      }

      // If uninspected, remove immediately (zero screen footprint invariant)
      if (!target.inspected) {
        setReceipts((prev) => {
          const next = prev.filter((r) => r.instanceId !== instanceId);
          receiptsRef.current = next;
          return next;
        });
        return;
      }

      setReceipts((prev) => {
        const next = prev.map((r) =>
          r.instanceId === instanceId
            ? { ...r, handoffExit: true, inspected: false }
            : r
        );
        receiptsRef.current = next;
        return next;
      });

      const existing = handoffExitTimeoutsRef.current.get(instanceId);
      if (existing != null) window.clearTimeout(existing);

      const timeoutId = window.setTimeout(() => {
        setReceipts((prev) => {
          const next = prev.filter((r) => r.instanceId !== instanceId);
          receiptsRef.current = next;
          return next;
        });
        handoffExitTimeoutsRef.current.delete(instanceId);
      }, RECEIPT_HANDOFF_EXIT_MS);
      handoffExitTimeoutsRef.current.set(instanceId, timeoutId);
    },
    [advancePrintQueue]
  );

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

  const getReceiptAttachment = useCallback(
    (instanceId: string): PatronReceiptMeta | null => {
      const entity = receiptsRef.current.find((r) => r.instanceId === instanceId);
      if (!entity?.characterId || !entity?.seatId || !entity?.patronName) return null;
      return {
        characterId: entity.characterId,
        seatId: entity.seatId,
        patronName: entity.patronName,
      };
    },
    []
  );

  useEffect(() => {
    if (!getReceiptAttachmentRef) return;
    getReceiptAttachmentRef.current = getReceiptAttachment;
    return () => {
      getReceiptAttachmentRef.current = null;
    };
  }, [getReceiptAttachmentRef, getReceiptAttachment]);

  /**
   * FS51/FS114: sit-complete print with character/seat/patronName attachment.
   * Always creates entity synchronously and returns its instanceId.
   */
  const printAttachedTicket = useCallback(
    (ticket: CocktailRecipe, meta: PatronReceiptMeta): string => {
      const nextZ = allocZ();
      const entity = createReceiptEntity(ticket, nextZ, {
        characterId: meta.characterId,
        seatId: meta.seatId,
        patronName: meta.patronName,
      });
      return enqueueOrStartEntity(entity);
    },
    [allocZ, enqueueOrStartEntity]
  );

  useEffect(() => {
    if (!printAttachedTicketRef) return;
    printAttachedTicketRef.current = printAttachedTicket;
    return () => {
      printAttachedTicketRef.current = null;
    };
  }, [printAttachedTicketRef, printAttachedTicket]);

  const handleGenerate = useCallback(() => {
    if (!onGenerate) {
      showToast('NO RECIPES AVAILABLE');
      return;
    }
    const ticket = onGenerate();
    if (!ticket) {
      showToast('NO RECIPES AVAILABLE');
      return;
    }
    const nextZ = allocZ();
    const entity = createReceiptEntity(ticket, nextZ, {
      patronName: 'BAR TICKET',
    });
    enqueueOrStartEntity(entity);
  }, [onGenerate, allocZ, enqueueOrStartEntity, showToast]);

  const handleAnimationEnd = useCallback(
    (_instanceId: string, _rect: DOMRect) => {
      // Transient lifecycle timer governs hold -> fade-out -> release deterministically.
    },
    []
  );

  const bumpZ = useCallback(
    (instanceId: string, opts?: { clearInspect?: boolean }) => {
      const nextZ = allocZ();
      const clearInspect = opts?.clearInspect !== false;
      setReceipts((prev) => {
        const next = prev.map((r) =>
          r.instanceId === instanceId
            ? {
                ...r,
                zIndex: nextZ,
                inspected: clearInspect ? false : r.inspected,
              }
            : r
        );
        receiptsRef.current = next;
        return next;
      });
    },
    [allocZ]
  );

  /** Bind mat ownership to a receipt (idempotent if already active). */
  const selectFreeReceipt = useCallback(
    (instanceId: string) => {
      const entity = receiptsRef.current.find((r) => r.instanceId === instanceId);
      if (!entity || entity.handoffExit) return;
      onSelectReceipt(entity.instanceId, entity.ticket);
      onActiveTicketChange(entity.ticket);
    },
    [onSelectReceipt, onActiveTicketChange]
  );

  /**
   * FS114: Programmatically inspect a specific receipt (or null to dismiss inspection).
   */
  const inspectReceipt = useCallback(
    (instanceId: string | null) => {
      if (instanceId === null) {
        let hadInspected = false;
        setReceipts((prev) => {
          hadInspected = prev.some((r) => r.inspected);
          if (!hadInspected) return prev;
          const next = prev.map((r) =>
            r.inspected ? { ...r, inspected: false } : r
          );
          receiptsRef.current = next;
          return next;
        });
        onInspectChangeRef.current?.(null);
        return;
      }

      const target = receiptsRef.current.find((r) => r.instanceId === instanceId);
      if (!target) {
        throw new Error(
          `[ReceiptInspectController] Fatal: Receipt ${instanceId} not found (INV-FAILFAST-01).`
        );
      }

      // If target was queued or actively printing, release it to free immediately so it can be inspected cleanly
      printQueueRef.current = printQueueRef.current.filter((id) => id !== instanceId);
      if (activePrintIdRef.current === instanceId) {
        advancePrintQueue();
      }

      const nextZ = allocZ();
      setReceipts((prev) => {
        const next = prev.map((r) => {
          if (r.instanceId === instanceId) {
            return {
              ...r,
              phase: 'free' as const,
              inMask: false,
              inspected: true,
              zIndex: nextZ,
              position: positionForInspect(r.position),
            };
          }
          return r.inspected ? { ...r, inspected: false } : r;
        });
        receiptsRef.current = next;
        return next;
      });

      selectFreeReceipt(instanceId);
      onInspectChangeRef.current?.(instanceId);
    },
    [allocZ, advancePrintQueue, positionForInspect, selectFreeReceipt]
  );

  const getInspectedId = useCallback((): string | null => {
    const found = receiptsRef.current.find(
      (r) => r.phase === 'free' && !r.inMask && r.inspected && !r.crumpled
    );
    return found ? found.instanceId : null;
  }, []);

  useEffect(() => {
    if (!inspectControllerRef) return;
    inspectControllerRef.current = {
      inspectReceipt,
      getInspectedId,
    };
    return () => {
      inspectControllerRef.current = null;
    };
  }, [inspectControllerRef, inspectReceipt, getInspectedId]);

  /** Click receipt: toggle expanded full face ↔ dismiss inspection. */
  const toggleExpand = useCallback(
    (instanceId: string) => {
      const target = receiptsRef.current.find((r) => r.instanceId === instanceId);
      if (!target || target.crumpled || target.handoffExit) return;
      if (target.inspected) {
        inspectReceipt(null);
      } else {
        inspectReceipt(instanceId);
      }
    },
    [inspectReceipt]
  );

  const endPointerGesture = useCallback(
    (
      instanceId: string,
      opts?: {
        releaseTarget?: EventTarget | null;
        pointerId?: number;
        /** Live scrollport for scrollTop delta check */
        scrollEl?: HTMLElement | null;
        /**
         * true when browser cancelled the pointer (overscroll / chrome gesture).
         * Keep final paper position; never treat as expand/collapse click.
         */
        cancelled?: boolean;
      }
    ) => {
      const drag = dragRef.current;
      if (!drag || drag.instanceId !== instanceId) return;

      if (drag.captured && opts?.releaseTarget && opts.pointerId != null) {
        try {
          (opts.releaseTarget as HTMLElement).releasePointerCapture?.(opts.pointerId);
        } catch {
          /* already released */
        }
      }

      // Always drop mobile scroll-lock for summary capture path
      if (drag.captured) {
        releaseDragScrollLock();
        summaryTouchClaimRef.current = false;
      }

      const wasDrag = dragMovedRef.current;
      const scrollDelta =
        opts?.scrollEl != null
          ? Math.abs(opts.scrollEl.scrollTop - drag.startScrollTop)
          : 0;
      const wasScroll = scrollGestureRef.current || scrollDelta > 1;
      const wasInspected = drag.wasInspected;
      const cancelled = !!opts?.cancelled;
      dragRef.current = null;
      dragMovedRef.current = false;
      scrollGestureRef.current = false;

      // Cancelled mid-gesture: leave paper where it is; no toggle
      if (cancelled) return;

      if (wasInspected) {
        // Pure short tap (no pan / no scrollTop change) → collapse
        if (!wasScroll) {
          toggleExpand(instanceId);
        }
        return;
      }

      // Summary: pure click (no drag) → expand
      if (!wasDrag) {
        toggleExpand(instanceId);
      }
    },
    [toggleExpand, releaseDragScrollLock]
  );

  /*
   * FS86 Model B — Permanent non-passive Touch Event listeners (mount-time).
   * Must exist BEFORE the first touchmove of a summary drag so Safari still
   * delivers cancelable events. Gate: only preventDefault for summary free
   * paper sequences; never while expanded (FS62 pan-y).
   */
  useEffect(() => {
    const isSummaryCaptureDrag = () => {
      const d = dragRef.current;
      return !!(d && d.captured && !d.wasInspected);
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const wrap = t.closest('.receipt-wrapper');
      if (
        !wrap ||
        wrap.classList.contains('state-inspected') ||
        wrap.classList.contains('anim-printing') ||
        wrap.classList.contains('receipt-wrapper--handoff-exit')
      ) {
        return;
      }
      // Contact began on summary free paper — claim this touch sequence
      summaryTouchClaimRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current?.wasInspected) return;
      if (!summaryTouchClaimRef.current && !isSummaryCaptureDrag()) return;
      if (e.cancelable) e.preventDefault();
    };

    const clearSummaryTouchClaim = () => {
      summaryTouchClaimRef.current = false;
    };

    const teOpts: AddEventListenerOptions = { passive: false, capture: true };
    const bubbleCapture: AddEventListenerOptions = { capture: true };
    document.addEventListener('touchstart', onTouchStart, teOpts);
    document.addEventListener('touchmove', onTouchMove, teOpts);
    document.addEventListener('touchend', clearSummaryTouchClaim, bubbleCapture);
    document.addEventListener('touchcancel', clearSummaryTouchClaim, bubbleCapture);

    return () => {
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('touchend', clearSummaryTouchClaim, true);
      document.removeEventListener('touchcancel', clearSummaryTouchClaim, true);
      releaseDragScrollLock();
      summaryTouchClaimRef.current = false;
    };
  }, [releaseDragScrollLock]);

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

      dragMovedRef.current = false;
      scrollGestureRef.current = false;

      const wasInspected = !!entity.inspected;
      const pointerId = e.pointerId;
      const scrollEl =
        (e.target instanceof Element
          ? e.target.closest('.receipt-paper--full')
          : null) as HTMLElement | null;
      const startScrollTop = scrollEl?.scrollTop ?? 0;

      /*
       * FS62 — Expanded full face: do NOT capture or start paper-drag.
       * Let .receipt-paper--full own pan-y scroll; pure short tap still collapses on up.
       * Window listeners finish the gesture if the finger lifts outside the wrapper.
       */
      if (wasInspected) {
        dragRef.current = {
          instanceId,
          startX: e.clientX,
          startY: e.clientY,
          initLeft: entity.position.left,
          initTop: entity.position.top,
          wasInspected: true,
          captured: false,
          pointerId,
          startScrollTop,
        };
        bumpZ(instanceId, { clearInspect: false });

        const onPaperScroll = () => {
          scrollGestureRef.current = true;
        };
        scrollEl?.addEventListener('scroll', onPaperScroll, { passive: true });

        const onWinMove = (ev: PointerEvent) => {
          const d = dragRef.current;
          if (!d || d.instanceId !== instanceId || d.pointerId !== ev.pointerId) return;
          const dx = ev.clientX - d.startX;
          const dy = ev.clientY - d.startY;
          if (Math.abs(dx) >= 4 || Math.abs(dy) >= 4) {
            scrollGestureRef.current = true;
          }
        };
        const onWinUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          window.removeEventListener('pointermove', onWinMove);
          window.removeEventListener('pointerup', onWinUp);
          window.removeEventListener('pointercancel', onWinUp);
          scrollEl?.removeEventListener('scroll', onPaperScroll);
          endPointerGesture(instanceId, { scrollEl });
        };
        window.addEventListener('pointermove', onWinMove);
        window.addEventListener('pointerup', onWinUp);
        window.addEventListener('pointercancel', onWinUp);
        return;
      }

      // Summary face: capture for drag-to-move / click-to-expand.
      // Pre-contact touch-action:none + permanent TE listeners own pan (FS86).
      // PE preventDefault cannot stop viewport pan (PE3); still call for good measure.
      if (e.cancelable) e.preventDefault();
      summaryTouchClaimRef.current = true;
      e.currentTarget.setPointerCapture(pointerId);
      dragRef.current = {
        instanceId,
        startX: e.clientX,
        startY: e.clientY,
        initLeft: entity.position.left,
        initTop: entity.position.top,
        wasInspected: false,
        captured: true,
        pointerId,
        startScrollTop: 0,
      };
      // Secondary body class (overscroll); not the sole Safari ownership mechanism
      acquireDragScrollLock();
      bumpZ(instanceId, { clearInspect: false });
    },
    [receipts, bumpZ, selectFreeReceipt, endPointerGesture, acquireDragScrollLock]
  );

  const onPointerMove = useCallback(
    (instanceId: string, e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.instanceId !== instanceId) return;
      // Expanded gestures are tracked on window (no capture) — ignore wrapper moves
      if (drag.wasInspected) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;

      // Summary: real drag moves paper — keep browser from taking over mid-gesture
      if (e.cancelable) e.preventDefault();
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
      const drag = dragRef.current;
      // Expanded: finished via window listeners
      if (drag?.wasInspected) return;
      endPointerGesture(instanceId, {
        releaseTarget: e.currentTarget,
        pointerId: e.pointerId,
      });
    },
    [endPointerGesture]
  );

  /** Browser stole the gesture (scroll/overscroll) — end cleanly, keep paper position. */
  const onPointerCancel = useCallback(
    (instanceId: string, e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (drag?.wasInspected) return;
      endPointerGesture(instanceId, {
        releaseTarget: e.currentTarget,
        pointerId: e.pointerId,
        cancelled: true,
      });
    },
    [endPointerGesture]
  );

  /** Suppress browser context menu; no receipt action popup. */
  const onContextMenu = useCallback((_instanceId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const printing = receipts.filter((r) => r.phase === 'printing' && r.inMask);
  // FS114 (INV-PRINTER-TRANSIENT-01): Uninspected free receipts occupy zero screen footprint;
  // only inspected receipts (or active handoffExit) render on the stage.
  const free = receipts.filter(
    (r) =>
      r.phase === 'free' &&
      !r.inMask &&
      ((r.inspected && !r.crumpled) || r.handoffExit)
  );

  const value = useMemo<ReceiptContextValue>(
    () => ({
      activeTicket,
      activeReceiptId,
      modeName,
      stageRef,
      printerPhase,
      printing,
      free,
      anyInspected,
      toast,
      handleGenerate,
      handleAnimationEnd,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu,
      onToggleExpand: toggleExpand,
    }),
    [
      activeTicket,
      activeReceiptId,
      modeName,
      printerPhase,
      printing,
      free,
      anyInspected,
      toast,
      handleGenerate,
      handleAnimationEnd,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
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
    printerPhase,
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
    onPointerCancel,
    onContextMenu,
    onToggleExpand,
  } = useReceipt();

  const paperProps = {
    modeName,
    onAnimationEnd: handleAnimationEnd,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onContextMenu,
    onToggleExpand,
  };

  // INV-PATRON-ISOLATION-01: Printer bezel must never be visible during receipt inspection
  const effectivePrinterPhase: PrinterLifecyclePhase = anyInspected
    ? 'idle'
    : printerPhase;

  return (
    <div
      className={`receipt-system receipt-system--pov${anyInspected ? ' receipt-system--has-inspect' : ''}`}
      aria-hidden={false}
    >
      <div className="receipt-stage-root" ref={stageRef}>
        <div
          className={`receipt-hardware-cluster printer-phase--${effectivePrinterPhase}`}
          data-printer-phase={effectivePrinterPhase}
          data-testid="receipt-printer-cluster"
        >
          <div className="receipt-hardware-wall">
            <div className="receipt-printer-bezel">
              <div className="receipt-printer-slot" />
            </div>
          </div>
        </div>

        <div
          className={`receipt-printer-mask printer-phase--${effectivePrinterPhase}`}
          data-printer-phase={effectivePrinterPhase}
        >
          {effectivePrinterPhase !== 'idle' &&
            printing.map((entity) => (
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

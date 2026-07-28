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
};

type QueuedPrint = {
  ticket: CocktailRecipe;
  characterId?: string;
  seatId?: string;
};

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
  /**
   * FS51: host prints character-attached tickets on sit-complete.
   * Returns new receipt instanceId (sync create).
   */
  printAttachedTicketRef?: React.MutableRefObject<
    | ((
        ticket: CocktailRecipe,
        meta: PatronReceiptMeta
      ) => string | null)
    | null
  >;
  /**
   * FS51: host reads characterId/seatId for leave after success validate.
   */
  getReceiptAttachmentRef?: React.MutableRefObject<
    ((instanceId: string) => PatronReceiptMeta | null) | null
  >;
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
  children,
}: ReceiptProviderProps) {
  const [receipts, setReceipts] = useState<ReceiptEntity[]>([]);
  const [activeZ, setActiveZ] = useState(501);
  const [toast, setToast] = useState<string | null>(null);
  const dragRef = useRef<DragState>(null);
  /** True once pointer moved past drag threshold (real paper drag, not a click). */
  const dragMovedRef = useRef(false);
  /**
   * FS62: true when expanded-face gesture moved enough to count as scroll/pan
   * (suppresses toggle-collapse on pointerup).
   */
  const scrollGestureRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const printQueueRef = useRef<QueuedPrint[]>([]);
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
    const probed = readCssPaperMetrics(stage);
    if (probed) return probed.w;
    return computePaperMetricsFromStage(stage.clientWidth, stage.clientHeight).w;
  }, []);

  const resolvePaperHeight = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return PAPER_H;
    // Prefer live free-paper painted height when present (summary is content-sized).
    const paperEl = stage.querySelector('.receipt-wrapper') as HTMLElement | null;
    if (paperEl?.offsetHeight && paperEl.offsetHeight > 0) return paperEl.offsetHeight;
    const probed = readCssPaperMetrics(stage);
    if (probed) return probed.h;
    return computePaperMetricsFromStage(stage.clientWidth, stage.clientHeight).h;
  }, []);

  /** Stage UI scale for printer-aligned release offsets (matches CSS --receipt-ui-scale FS60). */
  const stageUiScale = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || stage.clientWidth <= 0) return 1;
    const probed = readCssPaperMetrics(stage);
    if (probed && Number.isFinite(probed.scale)) return probed.scale;
    return computePaperMetricsFromStage(stage.clientWidth, stage.clientHeight).scale;
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
      // FS61: stage-fraction insets (avoid broken px * scale that disagreed with CSS)
      const releaseTop = stage
        ? Math.max(8, Math.round(stage.clientHeight * 0.06))
        : 10;
      const releaseInset = stage
        ? Math.max(4, Math.round(stage.clientWidth * 0.015))
        : 8;
      let pos = { left: releaseInset, top: releaseTop };
      if (stage && rect) {
        const sRect = stage.getBoundingClientRect();
        // Prefer painted rect, but clamp; if rect is left-stuck mid-print, snap top-right family
        const fromRect = clampPosition(rect.left - sRect.left, rect.top - sRect.top);
        const paperW = resolvePaperWidth();
        const preferRight = stage.clientWidth - paperW - releaseInset;
        const nearLeft = fromRect.left < stage.clientWidth * 0.15;
        pos = nearLeft
          ? clampPosition(preferRight, Math.min(fromRect.top, releaseTop))
          : fromRect;
      } else if (stage) {
        const paperW = resolvePaperWidth();
        pos = clampPosition(stage.clientWidth - paperW - releaseInset, releaseTop);
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

  const startPrint = useCallback(
    (job: QueuedPrint): string => {
      printingRef.current = true;
      // Pure: create entity once outside any setState updater (Strict Mode safe)
      const nextZ = allocZ();
      const entity = createReceiptEntity(job.ticket, nextZ, {
        characterId: job.characterId,
        seatId: job.seatId,
      });
      // Print only — do not steal selection / mat / active ticket (FS40)
      setReceipts((prev) => [...prev, entity]);

      // Fallback if CSS animationend never fires
      const timeoutId = window.setTimeout(() => {
        releaseToFree(entity.instanceId, null);
      }, 1700);
      printTimeoutsRef.current.set(entity.instanceId, timeoutId);
      return entity.instanceId;
    },
    [allocZ, releaseToFree]
  );

  const enqueueOrPrint = useCallback(
    (job: QueuedPrint): string | null => {
      if (printingRef.current) {
        printQueueRef.current.push(job);
        // instanceId not known until dequeued — callers that need sync id
        // should only print when idle; attached print prefers immediate start.
        return null;
      }
      return startPrint(job);
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

  const getReceiptAttachment = useCallback(
    (instanceId: string): PatronReceiptMeta | null => {
      const entity = receiptsRef.current.find((r) => r.instanceId === instanceId);
      if (!entity?.characterId || !entity?.seatId) return null;
      return { characterId: entity.characterId, seatId: entity.seatId };
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

  /** FS51: sit-complete print with character/seat attachment. Sync instanceId when not busy. */
  const printAttachedTicket = useCallback(
    (ticket: CocktailRecipe, meta: PatronReceiptMeta): string | null => {
      // If printer busy, queue with meta; instanceId deferred (still prints without mat steal)
      if (printingRef.current) {
        printQueueRef.current.push({
          ticket,
          characterId: meta.characterId,
          seatId: meta.seatId,
        });
        return null;
      }
      return startPrint({
        ticket,
        characterId: meta.characterId,
        seatId: meta.seatId,
      });
    },
    [startPrint]
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
    enqueueOrPrint({ ticket });
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

  const endPointerGesture = useCallback(
    (
      instanceId: string,
      opts?: {
        releaseTarget?: EventTarget | null;
        pointerId?: number;
        /** Live scrollport for scrollTop delta check */
        scrollEl?: HTMLElement | null;
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

      const wasDrag = dragMovedRef.current;
      const scrollDelta =
        opts?.scrollEl != null
          ? Math.abs(opts.scrollEl.scrollTop - drag.startScrollTop)
          : 0;
      const wasScroll = scrollGestureRef.current || scrollDelta > 1;
      const wasInspected = drag.wasInspected;
      dragRef.current = null;
      dragMovedRef.current = false;
      scrollGestureRef.current = false;

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
    [toggleExpand]
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

      // Summary face: capture for drag-to-move / click-to-expand
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
      bumpZ(instanceId, { clearInspect: false });
    },
    [receipts, bumpZ, selectFreeReceipt, endPointerGesture]
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

      // Summary: real drag moves paper
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

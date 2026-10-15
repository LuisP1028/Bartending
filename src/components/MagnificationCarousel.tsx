"use client";

import React, {
  useRef,
  useEffect,
  useContext,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { CarouselFocusContext } from './CategoryOverlay';

interface MagnificationCarouselProps {
  children: React.ReactNode;
  /**
   * `page` — accordion row.
   * `overlay` / `local` — optical centering; amber art glow on focus (no proximity scale).
   */
  layout?: 'page' | 'overlay' | 'local';
  /** FS114: callback fired whenever the centered/focused item label changes */
  onFocusedLabelChange?: (label: string) => void;
}

/** FS77 / FS009: shell D-pad & B-button control of the open local carousel */
export type MagnificationCarouselHandle = {
  /** -1 previous, +1 next; wraps at ends */
  step: (delta: -1 | 1) => void;
  goFirst: () => void;
  goLast: () => void;
  /** Activate (click) the currently centered/focused carousel item */
  activateFocused: () => void;
};

function getWrappers(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll('.carousel-item-wrapper')
  ) as HTMLElement[];
}

function extractWrapperLabel(wrapper: HTMLElement | null | undefined): string {
  if (!wrapper) return '';
  const direct =
    wrapper.getAttribute('data-carousel-label') ||
    wrapper.getAttribute('aria-label');
  if (direct) return direct;
  const child = wrapper.querySelector(
    '[data-carousel-label], [aria-label]'
  ) as HTMLElement | null;
  if (!child) return '';
  return (
    child.getAttribute('data-carousel-label') ||
    child.getAttribute('aria-label') ||
    ''
  );
}

function scrollWrapperToCenter(
  container: HTMLElement,
  wrapper: HTMLElement,
  smooth = false
) {
  const cRect = container.getBoundingClientRect();
  const wRect = wrapper.getBoundingClientRect();
  const delta =
    wRect.left + wRect.width / 2 - (cRect.left + cRect.width / 2);
  const target = container.scrollLeft + delta;
  if (smooth) {
    container.scrollTo({ left: target, behavior: 'smooth' });
  } else {
    container.scrollLeft = target;
  }
}

function nearestWrapperIndex(container: HTMLElement): number {
  const wrappers = getWrappers(container);
  if (!wrappers.length) return -1;
  const cRect = container.getBoundingClientRect();
  const center = cRect.left + cRect.width / 2;
  let best = 0;
  let bestDist = Infinity;
  wrappers.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const mid = r.left + r.width / 2;
    const d = Math.abs(mid - center);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

const MagnificationCarousel = forwardRef<
  MagnificationCarouselHandle,
  MagnificationCarouselProps
>(function MagnificationCarousel(
  { children, layout = 'page', onFocusedLabelChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextSetFocusedLabel = useContext(CarouselFocusContext);
  const onFocusedLabelChangeRef = useRef(onFocusedLabelChange);
  onFocusedLabelChangeRef.current = onFocusedLabelChange;
  const contextSetFocusedLabelRef = useRef(contextSetFocusedLabel);
  contextSetFocusedLabelRef.current = contextSetFocusedLabel;
  const lastReportedLabelRef = useRef<string>('');

  const reportFocusedLabel = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (lastReportedLabelRef.current !== trimmed) {
      lastReportedLabelRef.current = trimmed;
    }
    contextSetFocusedLabelRef.current?.(trimmed);
    onFocusedLabelChangeRef.current?.(trimmed);
  }, []);

  /** Persist scroll across remeasures (parent re-renders must not restart controller). */
  const scrollLeftRef = useRef(0);
  /** True after first successful layout of this carousel instance. */
  const hasMountedRef = useRef(false);
  /** Track layout so a layout switch can re-init sensibly. */
  const layoutRef = useRef(layout);
  /** Last observed wrapper count — remeasure when inventory DOM changes without effect restart. */
  const wrapperCountRef = useRef(0);

  // Immediately seed the first child's label on mount / children change
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const wrappers = getWrappers(container);
      const cur = nearestWrapperIndex(container);
      const targetWrapper = cur >= 0 ? wrappers[cur] : wrappers[0];
      const domLabel = extractWrapperLabel(targetWrapper);
      if (domLabel) {
        reportFocusedLabel(domLabel);
        return;
      }
    }
    const childArr = React.Children.toArray(children);
    const first = childArr[0] as React.ReactElement<{ label?: string }> | undefined;
    if (first?.props?.label) {
      reportFocusedLabel(first.props.label);
    }
  }, [children, reportFocusedLabel]);

  useImperativeHandle(
    ref,
    () => ({
      step(delta: -1 | 1) {
        const container = containerRef.current;
        if (!container) return;
        const wrappers = getWrappers(container);
        if (!wrappers.length) return;
        const cur = nearestWrapperIndex(container);
        if (cur < 0) return;
        const next =
          (cur + delta + wrappers.length) % wrappers.length;
        scrollWrapperToCenter(container, wrappers[next], false);
        scrollLeftRef.current = container.scrollLeft;
        const nextLabel = extractWrapperLabel(wrappers[next]);
        if (nextLabel) reportFocusedLabel(nextLabel);
        // Fire scroll so focus glow updates
        container.dispatchEvent(new Event('scroll'));
      },
      goFirst() {
        const container = containerRef.current;
        if (!container) return;
        const wrappers = getWrappers(container);
        if (!wrappers[0]) return;
        scrollWrapperToCenter(container, wrappers[0], false);
        scrollLeftRef.current = container.scrollLeft;
        const firstLabel = extractWrapperLabel(wrappers[0]);
        if (firstLabel) reportFocusedLabel(firstLabel);
        container.dispatchEvent(new Event('scroll'));
      },
      goLast() {
        const container = containerRef.current;
        if (!container) return;
        const wrappers = getWrappers(container);
        if (!wrappers.length) return;
        const lastWrapper = wrappers[wrappers.length - 1];
        scrollWrapperToCenter(
          container,
          lastWrapper,
          false
        );
        scrollLeftRef.current = container.scrollLeft;
        const lastLabel = extractWrapperLabel(lastWrapper);
        if (lastLabel) reportFocusedLabel(lastLabel);
        container.dispatchEvent(new Event('scroll'));
      },
      activateFocused() {
        const container = containerRef.current;
        if (!container) return;
        const wrappers = getWrappers(container);
        if (!wrappers.length) return;
        const cur = nearestWrapperIndex(container);
        if (cur < 0) return;
        const wrapper = wrappers[cur];
        const target =
          (wrapper.firstElementChild as HTMLElement | null) ?? wrapper;
        target.click();
      },
    }),
    [reportFocusedLabel]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId = 0;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const isArtFocus = layout === 'overlay' || layout === 'local';
    const isLocal = layout === 'local';

    // Layout mode changed: treat as fresh mount for centering
    if (layoutRef.current !== layout) {
      layoutRef.current = layout;
      hasMountedRef.current = false;
      scrollLeftRef.current = 0;
      wrapperCountRef.current = 0;
    }

    const syncLayoutMetrics = () => {
      const wrappers = getWrappers(container);
      if (!wrappers.length) return;

      wrappers.forEach((el) => {
        el.style.minWidth = '';
        el.style.width = '';
        el.style.height = '';
        el.style.maxHeight = '';
        el.style.overflow = isLocal ? 'hidden' : 'visible';
      });

      const cw = container.clientWidth || 0;
      const ch = container.clientHeight || 0;

      let maxItemW = 0;
      wrappers.forEach((el) => {
        const w = el.offsetWidth;
        if (w > maxItemW) maxItemW = w;
      });
      if (maxItemW <= 0 && !isLocal) return;

      // Local: cell fits inside frame — uses full vertical height so bottles fill ~94% cleanly
      let cellW: number;
      let cellH: number | null = null;
      if (isLocal && cw > 0) {
        const budgetW = Math.max(24, cw * 0.92);
        const budgetH = ch > 0 ? Math.max(24, ch * 0.96) : budgetW;
        cellH = budgetH;
        cellW = Math.min(budgetW, Math.max(48, cellH * 0.82));
      } else {
        cellW = maxItemW;
      }

      wrappers.forEach((el) => {
        el.style.minWidth = `${cellW}px`;
        el.style.width = `${cellW}px`;
        if (cellH != null) {
          el.style.height = `${cellH}px`;
          el.style.maxHeight = `${cellH}px`;
        }
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.boxSizing = 'border-box';
        el.style.overflow = isLocal ? 'hidden' : 'visible';
      });

      const pad = Math.max(0, (cw - cellW) / 2);
      container.style.paddingLeft = `${pad}px`;
      container.style.paddingRight = `${pad}px`;
      container.style.paddingTop = isLocal ? '2px' : layout === 'page' ? '40px' : '16px';
      container.style.paddingBottom = isLocal ? '2px' : layout === 'page' ? '40px' : '16px';
    };

    const scrollToCenter = (wrapper: HTMLElement, smooth = false) => {
      scrollWrapperToCenter(container, wrapper, smooth);
      scrollLeftRef.current = container.scrollLeft;
    };

    const nearestWrapper = (): HTMLElement | null => {
      const wrappers = getWrappers(container);
      const i = nearestWrapperIndex(container);
      return i >= 0 ? wrappers[i] ?? null : null;
    };

    const handleScroll = () => {
      if (!containerRef.current) return;
      const c = containerRef.current;
      scrollLeftRef.current = c.scrollLeft;
      const containerRect = c.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      const wrappers = getWrappers(c);
      const nearestIdx = nearestWrapperIndex(c);

      if (nearestIdx >= 0 && wrappers[nearestIdx]) {
        const nearestLabel = extractWrapperLabel(wrappers[nearestIdx]);
        if (nearestLabel) {
          reportFocusedLabel(nearestLabel);
        }
      }

      wrappers.forEach((el, idx) => {
        const childRect = el.getBoundingClientRect();
        const childCenter = childRect.left + childRect.width / 2;
        const distance = Math.abs(containerCenter - childCenter);
        const focusThreshold = Math.max(containerRect.width * 0.28, isLocal ? 28 : 60);
        const focused = isLocal ? idx === nearestIdx : distance <= focusThreshold;

        const artRoot = el.querySelector('.asset-art-root') as HTMLElement | null;
        const artSvg = artRoot?.querySelector('svg') as SVGElement | null;

        // No proximity scale — fixed size; focus is amber glow only
        el.style.transform = 'none';
        el.style.boxShadow = 'none';
        el.style.filter = 'none';
        el.style.outline = 'none';
        el.style.zIndex = focused ? '10' : '1';

        if (artRoot) {
          artRoot.style.transform = 'none';
          artRoot.style.filter = 'none';
        }
        if (artSvg) {
          artSvg.style.filter = '';
        }

        if (isArtFocus) {
          if (artRoot) {
            if (focused) artRoot.classList.add('is-focused');
            else artRoot.classList.remove('is-focused');
          }
        } else {
          // Accordion cards: soft amber on focused wrapper (card context)
          if (artRoot) artRoot.classList.remove('is-focused');
          el.style.boxShadow = focused
            ? '0 0 22px rgba(255, 176, 0, 0.55)'
            : 'none';
        }
      });
    };

    const onScrollEvent = () => {
      scrollLeftRef.current = container.scrollLeft;
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(handleScroll);

      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const near = nearestWrapper();
        if (near) {
          scrollToCenter(near, false);
          handleScroll();
        }
      }, 80);
    };

    /** First mount only: center first item. */
    const remeasureAndCenterFirst = () => {
      syncLayoutMetrics();
      const wrappers = getWrappers(container);
      wrapperCountRef.current = wrappers.length;
      if (wrappers[0]) {
        scrollToCenter(wrappers[0], false);
      } else {
        container.scrollLeft = 0;
        scrollLeftRef.current = 0;
      }
      handleScroll();
    };

    /**
     * Remeasure and keep the user's place in the list.
     * First mount → center first; later remeasures → restore scroll + nearest.
     */
    const remeasureAndRestore = () => {
      syncLayoutMetrics();
      const wrappers = getWrappers(container);
      wrapperCountRef.current = wrappers.length;
      if (!wrappers.length) {
        handleScroll();
        return;
      }

      if (!hasMountedRef.current) {
        remeasureAndCenterFirst();
        hasMountedRef.current = true;
        return;
      }

      // Restore prior scroll, then optically snap to nearest cell
      container.scrollLeft = scrollLeftRef.current;
      const near = nearestWrapper();
      if (near) {
        scrollToCenter(near, false);
      } else {
        container.scrollLeft = scrollLeftRef.current;
      }
      scrollLeftRef.current = container.scrollLeft;
      handleScroll();
    };

    const onResize = () => {
      const near = nearestWrapper();
      syncLayoutMetrics();
      if (near) {
        scrollToCenter(near, false);
      } else if (hasMountedRef.current) {
        container.scrollLeft = scrollLeftRef.current;
      } else {
        remeasureAndCenterFirst();
      }
      scrollLeftRef.current = container.scrollLeft;
      handleScroll();
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;

    /** When wrapper count changes (catalog swap without effect re-run), remeasure. */
    const onDomInventoryChange = () => {
      const wrappers = getWrappers(container);
      const count = wrappers.length;
      wrappers.forEach((w) => ro?.observe(w));
      if (count === wrapperCountRef.current) return;
      remeasureAndRestore();
    };

    remeasureAndRestore();

    // One rAF + one delayed pass for late SVG/layout (RE38 B3 — no multi-timeout thrash)
    const t1 = requestAnimationFrame(() => {
      remeasureAndRestore();
    });
    const t2 = window.setTimeout(remeasureAndRestore, 100);

    container.addEventListener('scroll', onScrollEvent, { passive: true });
    window.addEventListener('resize', onResize);

    ro?.observe(container);
    getWrappers(container).forEach((w) => ro?.observe(w));

    const mo =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(onDomInventoryChange)
        : null;
    mo?.observe(container, { childList: true, subtree: false });

    return () => {
      // Persist scroll before effect teardown
      scrollLeftRef.current = container.scrollLeft;
      container.removeEventListener('scroll', onScrollEvent);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
      mo?.disconnect();
      cancelAnimationFrame(animationFrameId);
      cancelAnimationFrame(t1);
      clearTimeout(t2);
      if (settleTimer) clearTimeout(settleTimer);
      getWrappers(container).forEach((el) => {
        el.style.minWidth = '';
        el.style.width = '';
        el.style.boxShadow = '';
        el.style.transform = '';
      });
      container.querySelectorAll('.asset-art-root').forEach((node) => {
        const el = node as HTMLElement;
        el.classList.remove('is-focused');
        el.style.transform = '';
        el.style.filter = '';
      });
    };
    // layout only — do not re-bind on children identity (RE38 B1-a)
  }, [layout, reportFocusedLabel]);

  const scrollToItem = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrapper = e.currentTarget;
    const c = containerRef.current;
    if (!c) return;
    const clickedLabel = extractWrapperLabel(wrapper);
    if (clickedLabel) reportFocusedLabel(clickedLabel);
    const cRect = c.getBoundingClientRect();
    const wRect = wrapper.getBoundingClientRect();
    const delta =
      wRect.left + wRect.width / 2 - (cRect.left + cRect.width / 2);
    c.scrollTo({ left: c.scrollLeft + delta, behavior: 'smooth' });
    scrollLeftRef.current = c.scrollLeft + delta;
  };

  const isLocal = layout === 'local';

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollSnapType: 'x mandatory',
        padding: isLocal ? '4px 0' : '40px 0',
        gap: isLocal ? 'clamp(6px, 1.5vw, 14px)' : 'clamp(16px, 4vw, 48px)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        width: '100%',
        height: isLocal ? '100%' : undefined,
        maxWidth: '100%',
        maxHeight: isLocal ? '100%' : undefined,
        boxSizing: 'border-box',
        background: 'transparent',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
      className={`carousel-container${isLocal ? ' carousel-container--local' : ''}`}
    >
      <style>{`
        .carousel-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {React.Children.map(children, (child) => (
        <div
          className="carousel-item-wrapper"
          onClick={scrollToItem}
          style={{
            flex: '0 0 auto',
            scrollSnapAlign: 'center',
            scrollSnapStop: 'always',
            background: 'transparent',
            lineHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: isLocal ? '100%' : undefined,
            maxHeight: isLocal ? '100%' : undefined,
            maxWidth: isLocal ? '100%' : undefined,
            boxSizing: 'border-box',
            overflow: isLocal ? 'hidden' : undefined,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
});

export default MagnificationCarousel;

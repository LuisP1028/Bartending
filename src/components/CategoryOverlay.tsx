"use client";

import React, {
  forwardRef,
  useState,
  useMemo,
  useRef,
  useLayoutEffect,
} from 'react';
import type { StageFrameStyle } from '@/data/hotspotGeometry';

export const CarouselFocusContext = React.createContext<
  ((label: string) => void) | null
>(null);

type CategoryOverlayProps = {
  /** Accessibility name only — not painted as chrome. */
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Stage-relative placement (% of POV stage). */
  frameStyle: StageFrameStyle;
  /** Optional controlled override for focused item label. */
  focusedItemLabel?: string;
};

/**
 * Localized hotspot carousel host: small frame fully on-stage, plus
 * FS114/FS117 Retro RPG Dialogue-themed item name popup synchronized with scroll/D-Pad
 * and strictly clamped inside the visible Game Boy screen across all viewports.
 */
const CategoryOverlay = forwardRef<HTMLDivElement, CategoryOverlayProps>(
  function CategoryOverlay(
    {
      title,
      onClose: _onClose,
      children,
      isEmpty = false,
      emptyMessage = 'NO ITEMS AVAILABLE FOR CURRENT MODE',
      frameStyle,
      focusedItemLabel,
    },
    ref
  ) {
    const [internalFocusedLabel, setInternalFocusedLabel] = useState<string>('');
    const activeLabel = (focusedItemLabel ?? internalFocusedLabel).trim();
    const popupRef = useRef<HTMLDivElement>(null);

    const clampedFrameStyle = useMemo<React.CSSProperties>(() => {
      const safeW = `min(${frameStyle.width}, calc(var(--shell-glass-w, 100%) - 8px))`;
      const safeH = `min(${frameStyle.height}, calc(var(--shell-glass-h, 100%) - 8px))`;
      const safeLeft = `clamp(calc(var(--shell-glass-inset-x, 0px) + 4px), ${frameStyle.left}, calc(var(--shell-glass-inset-x, 0px) + var(--shell-glass-w, 100%) - ${safeW} - 4px))`;
      const safeTop = `clamp(calc(var(--shell-glass-inset-y, 0px) + 4px), ${frameStyle.top}, calc(var(--shell-glass-inset-y, 0px) + var(--shell-glass-h, 100%) - ${safeH} - 4px))`;
      return {
        left: safeLeft,
        top: safeTop,
        width: safeW,
        height: safeH,
        transform: frameStyle.transform,
      };
    }, [frameStyle.left, frameStyle.top, frameStyle.width, frameStyle.height, frameStyle.transform]);

    const popupStyle = useMemo<React.CSSProperties>(() => {
      const leftPct = parseFloat(frameStyle.left) || 0;
      const topPct = parseFloat(frameStyle.top) || 0;
      const widthPct = parseFloat(frameStyle.width) || 30;
      const heightPct = parseFloat(frameStyle.height) || 30;
      const centerXPct = Math.min(82, Math.max(18, leftPct + widthPct / 2));
      const placeBelow = topPct < 20;

      const clampedLeft = `clamp(calc(var(--shell-glass-inset-x, 0px) + 18cqi), ${centerXPct}%, calc(var(--shell-glass-inset-x, 0px) + var(--shell-glass-w, 100%) - 18cqi))`;

      if (placeBelow) {
        const belowTopPct = Math.min(88, topPct + heightPct);
        return {
          left: clampedLeft,
          top: `max(calc(var(--shell-glass-inset-y, 0px) + 6px), calc(${belowTopPct}% + 4px))`,
          transform: 'translateX(-50%)',
        };
      }

      const aboveBottomPct = Math.max(8, 100 - topPct);
      return {
        left: clampedLeft,
        bottom: `max(calc(100% - var(--shell-glass-inset-y, 0px) - var(--shell-glass-h, 100%) + 6px), calc(${aboveBottomPct}% + 4px))`,
        transform: 'translateX(-50%)',
      };
    }, [frameStyle.left, frameStyle.top, frameStyle.width, frameStyle.height]);

    // FS117 (AC-04, INV-ASSET-BOX-ONSCREEN-01): Deterministically clamp descriptive box inside visible Game Boy screen
    useLayoutEffect(() => {
      const el = popupRef.current;
      if (!el || isEmpty || !activeLabel) return;

      const clampPopupToScreen = () => {
        const popupEl = popupRef.current;
        if (!popupEl) return;
        const screenEl =
          (popupEl.closest('.pov-shell-section') as HTMLElement | null) ??
          (popupEl.closest('.gb-shell__playfield') as HTMLElement | null) ??
          (popupEl.closest('.pov-stage') as HTMLElement | null);
        if (!screenEl) return;

        const screenRect = screenEl.getBoundingClientRect();
        if (screenRect.width <= 0 || screenRect.height <= 0) return;

        const margin = 5;
        popupEl.style.maxWidth = `${Math.max(72, screenRect.width - margin * 2)}px`;
        popupEl.style.transform = 'translateX(-50%)';

        const rect = popupEl.getBoundingClientRect();
        if (rect.width <= 0) return;

        const minLeft = screenRect.left + margin;
        const maxRight = screenRect.right - margin;
        const minTop = screenRect.top + margin;
        const maxBottom = screenRect.bottom - margin;

        let dx = 0;
        if (rect.left < minLeft) {
          dx = minLeft - rect.left;
        } else if (rect.right > maxRight) {
          dx = maxRight - rect.right;
        }

        let dy = 0;
        if (rect.top < minTop) {
          dy = minTop - rect.top;
        } else if (rect.bottom > maxBottom) {
          dy = maxBottom - rect.bottom;
        }

        if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
          popupEl.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), ${dy.toFixed(1)}px)`;
        }
      };

      clampPopupToScreen();

      const ro =
        typeof ResizeObserver !== 'undefined'
          ? new ResizeObserver(() => clampPopupToScreen())
          : null;
      if (ro && popupRef.current) {
        ro.observe(popupRef.current);
        const screenEl =
          popupRef.current.closest('.pov-shell-section') ??
          popupRef.current.closest('.pov-stage');
        if (screenEl) ro.observe(screenEl);
      }
      window.addEventListener('resize', clampPopupToScreen);
      return () => {
        ro?.disconnect();
        window.removeEventListener('resize', clampPopupToScreen);
      };
    }, [
      activeLabel,
      isEmpty,
      frameStyle.left,
      frameStyle.top,
      frameStyle.width,
      frameStyle.height,
    ]);

    return (
      <CarouselFocusContext.Provider value={setInternalFocusedLabel}>
        <div className="hotspot-carousel-layer" aria-hidden={false}>
          {/* Soft local dim — clamped inside visible Game Boy glass */}
          <div
            className="hotspot-carousel-local-dim"
            style={clampedFrameStyle}
            aria-hidden="true"
          />

          {/* FS114 / FS117 (AC-04): Retro RPG Dialogue-themed item name popup */}
          {!isEmpty && activeLabel ? (
            <div
              ref={popupRef}
              className="carousel-dialogue-popup"
              data-testid="carousel-dialogue-popup"
              role="status"
              aria-live="polite"
              style={popupStyle}
            >
              <span
                className="carousel-dialogue-popup__corner carousel-dialogue-popup__corner--tl"
                aria-hidden="true"
              />
              <span
                className="carousel-dialogue-popup__corner carousel-dialogue-popup__corner--tr"
                aria-hidden="true"
              />
              <span
                className="carousel-dialogue-popup__corner carousel-dialogue-popup__corner--bl"
                aria-hidden="true"
              />
              <span
                className="carousel-dialogue-popup__corner carousel-dialogue-popup__corner--br"
                aria-hidden="true"
              />
              <span className="carousel-dialogue-popup__label">{activeLabel}</span>
            </div>
          ) : null}

          <div
            ref={ref}
            className="hotspot-carousel-frame"
            role="dialog"
            aria-modal="false"
            aria-label={title}
            tabIndex={-1}
            style={{
              ...clampedFrameStyle,
              outline: 'none',
              overflow: 'hidden',
              maxWidth: '100%',
              maxHeight: '100%',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="hotspot-carousel-body">
              {isEmpty ? (
                <div className="hotspot-carousel-empty">{emptyMessage}</div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </CarouselFocusContext.Provider>
    );
  }
);

export default CategoryOverlay;

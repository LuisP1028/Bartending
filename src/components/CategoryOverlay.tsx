"use client";

import React, { forwardRef, useState, useMemo } from 'react';
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
 * FS114 Retro RPG Dialogue-themed item name popup synchronized with scroll/D-Pad.
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

    return (
      <CarouselFocusContext.Provider value={setInternalFocusedLabel}>
        <div className="hotspot-carousel-layer" aria-hidden={false}>
          {/* Soft local dim — same box as frame (no inflate past stage) */}
          <div
            className="hotspot-carousel-local-dim"
            style={{
              left: frameStyle.left,
              top: frameStyle.top,
              width: frameStyle.width,
              height: frameStyle.height,
              transform: frameStyle.transform,
            }}
            aria-hidden="true"
          />

          {/* FS114 (AC-07): Retro RPG Dialogue-themed item name popup */}
          {!isEmpty && activeLabel ? (
            <div
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
              left: frameStyle.left,
              top: frameStyle.top,
              width: frameStyle.width,
              height: frameStyle.height,
              transform: frameStyle.transform,
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


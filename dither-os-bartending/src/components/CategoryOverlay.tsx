"use client";

import React, { forwardRef } from 'react';
import type { StageFrameStyle } from '@/data/hotspotGeometry';

type CategoryOverlayProps = {
  /** Accessibility name only — not painted as chrome. */
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Stage-relative placement (% of POV stage). */
  frameStyle: StageFrameStyle;
};

/**
 * Localized hotspot carousel host: small frame fully on-stage.
 * Contained so assets do not spill outside the Obelisco UI.
 */
const CategoryOverlay = forwardRef<HTMLDivElement, CategoryOverlayProps>(
  function CategoryOverlay(
    {
      title,
      onClose,
      children,
      isEmpty = false,
      emptyMessage = 'NO ITEMS AVAILABLE FOR CURRENT MODE',
      frameStyle,
    },
    ref
  ) {
    return (
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
    );
  }
);

export default CategoryOverlay;

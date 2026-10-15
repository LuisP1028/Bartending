"use client";

import React, { useEffect, useId, useLayoutEffect, useRef } from 'react';

export type DrinkBuildLine = {
  id: string;
  label: string;
  oz: number;
};

/** Drink-placement vessel box in viewport CSS pixels */
export type DrinkBuildAnchorRect = {
  w: number;
  h: number;
  left: number;
  top: number;
};

type DrinkBuildCardProps = {
  open: boolean;
  /** Drink name, e.g. "NEGRONI" or "(no ticket)" */
  drinkTitle: string;
  lines: DrinkBuildLine[];
  /** Vessel box for optional anchor reference */
  sizePx?: DrinkBuildAnchorRect | null;
  onClose: () => void;
  onTrash: () => void;
};

/**
 * FS117 (AC-02, AC-03, INV-MAT-POPUP-DIALOGUE-01):
 * Retro RPG Dialogue-themed mat drink pop-up displaying drink title,
 * pour count, poured proportions, close control, and Trash? option,
 * strictly contained within the visible Game Boy screen across all viewports.
 */
export default function DrinkBuildCard({
  open,
  drinkTitle,
  lines,
  sizePx,
  onClose,
  onTrash,
}: DrinkBuildCardProps) {
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open || !shellRef.current) return;

    const clampToScreen = () => {
      const el = shellRef.current;
      if (!el) return;
      const screenEl =
        (el.closest('.pov-shell-section') as HTMLElement | null) ??
        (el.closest('.gb-shell__playfield') as HTMLElement | null) ??
        (el.closest('.pov-stage') as HTMLElement | null);
      if (!screenEl) return;

      const screenRect = screenEl.getBoundingClientRect();
      if (screenRect.width <= 0 || screenRect.height <= 0) return;

      el.style.maxWidth = `${Math.max(110, screenRect.width - 14)}px`;
      el.style.maxHeight = `${Math.max(96, screenRect.height * 0.62)}px`;
      el.style.transform = 'translateX(-50%)';

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;

      const margin = 6;
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
        el.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), ${dy.toFixed(1)}px)`;
      }
    };

    clampToScreen();

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => clampToScreen())
        : null;
    if (ro && shellRef.current) {
      ro.observe(shellRef.current);
      const screenEl =
        shellRef.current.closest('.pov-shell-section') ??
        shellRef.current.closest('.pov-stage');
      if (screenEl) ro.observe(screenEl);
    }
    window.addEventListener('resize', clampToScreen);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', clampToScreen);
    };
  });

  if (!open) return null;

  const pourCountLabel = `${lines.length} ${lines.length === 1 ? 'POUR' : 'POURS'}`;

  return (
    <>
      {/* Transparent click-catcher scoped to stage */}
      <div
        className="drink-build-backdrop"
        role="presentation"
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <div
        ref={shellRef}
        className="drink-build-card-shell"
        data-testid="drink-build-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* 4 Retro RPG 16-bit Corner Loops */}
        <svg
          className="drink-build-corner drink-build-corner--tl"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect
            x="0"
            y="0"
            width="8"
            height="8"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="0.5"
          />
          <rect x="2" y="2" width="4" height="4" fill="#09133b" />
          <rect x="8" y="2" width="6" height="4" fill="#ffffff" />
          <rect x="2" y="8" width="4" height="6" fill="#ffffff" />
          <rect x="7" y="7" width="5" height="5" fill="#ffffff" />
        </svg>
        <svg
          className="drink-build-corner drink-build-corner--tr"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="0"
            width="8"
            height="8"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="0.5"
          />
          <rect x="18" y="2" width="4" height="4" fill="#09133b" />
          <rect x="10" y="2" width="6" height="4" fill="#ffffff" />
          <rect x="18" y="8" width="4" height="6" fill="#ffffff" />
          <rect x="12" y="7" width="5" height="5" fill="#ffffff" />
        </svg>
        <svg
          className="drink-build-corner drink-build-corner--bl"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect
            x="0"
            y="16"
            width="8"
            height="8"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="0.5"
          />
          <rect x="2" y="18" width="4" height="4" fill="#09133b" />
          <rect x="8" y="18" width="6" height="4" fill="#ffffff" />
          <rect x="2" y="10" width="4" height="6" fill="#ffffff" />
          <rect x="7" y="12" width="5" height="5" fill="#ffffff" />
        </svg>
        <svg
          className="drink-build-corner drink-build-corner--br"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="16"
            width="8"
            height="8"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="0.5"
          />
          <rect x="18" y="18" width="4" height="4" fill="#09133b" />
          <rect x="10" y="18" width="6" height="4" fill="#ffffff" />
          <rect x="18" y="10" width="4" height="6" fill="#ffffff" />
          <rect x="12" y="12" width="5" height="5" fill="#ffffff" />
        </svg>

        <div className="drink-build-window">
          <div className="drink-build-inner">
            <div className="drink-build-header">
              <h2 id={titleId} className="drink-build-title">
                {drinkTitle}
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="drink-build-close"
                onClick={onClose}
                aria-label="Close drink build card"
              >
                ×
              </button>
            </div>

            <div
              className="drink-build-pour-count"
              data-testid="drink-build-pour-count"
            >
              {pourCountLabel}
            </div>

            <div className="drink-build-proportions">
              {lines.length === 0 ? (
                <p className="drink-build-empty">NO POURS YET</p>
              ) : (
                lines.map((line) => (
                  <div key={line.id} className="drink-build-line">
                    {line.label} = {line.oz.toFixed(2)}OZ
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="drink-build-trash"
              data-testid="drink-build-trash"
              onClick={onTrash}
            >
              TRASH?
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

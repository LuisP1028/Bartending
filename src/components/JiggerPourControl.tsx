"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { POUR_VOLUME_OZ } from '@/data/pourVolumes';

type JiggerPourControlProps = {
  pourVolumeOz: number;
  onSelectVolume: (oz: number) => void;
};

function isActiveVol(selected: number, option: number) {
  return Math.abs(selected - option) < 1e-6;
}

/**
 * Bottom-right Japanese jigger: opens stepped pour-volume picker on the POV stage.
 */
export default function JiggerPourControl({
  pourVolumeOz,
  onSelectVolume,
}: JiggerPourControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) {
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open, close]);

  return (
    <div className="jigger-pour-control" ref={rootRef}>
      {open && (
        <div
          className="jigger-pour-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <div id={titleId} className="jigger-pour-panel-title">
            SYSTEM CTRL // POUR VOLUME
          </div>
          {POUR_VOLUME_OZ.map((vol) => {
            const active = isActiveVol(pourVolumeOz, vol);
            return (
              <button
                key={vol}
                type="button"
                className={`jigger-pour-option${active ? ' jigger-pour-option--active' : ''}`}
                aria-pressed={active}
                onClick={() => {
                  onSelectVolume(vol);
                  close();
                }}
              >
                {vol.toFixed(2)} oz
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className={`jigger-pour-trigger${open ? ' jigger-pour-trigger--open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Japanese jigger — pour volume"
        title="Japanese jigger — pour volume"
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          className="jigger-pour-icon"
          /* Glyph sits ~x28–52, y20–64 in the 64×96 def — crop/center on ink */
          viewBox="22 16 36 54"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <use href="#JAPANESE_JIGGER" />
        </svg>
        <span className="jigger-pour-caption">JIGGER</span>
        <span className="jigger-pour-current">{pourVolumeOz.toFixed(2)} oz</span>
      </button>
    </div>
  );
}

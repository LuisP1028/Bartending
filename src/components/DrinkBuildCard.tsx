"use client";

import React, { useEffect, useId, useMemo, useRef } from 'react';
import { LiquidGlassCard } from 'react-liquid-glass-card';

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
  /** Vessel box for scale + pad-anchored position */
  sizePx?: DrinkBuildAnchorRect | null;
  onClose: () => void;
  onTrash: () => void;
};

const MIN_W = 112;
const FALLBACK_W = 140;
const FALLBACK_H = 160;
/** Space between card bottom and vessel top — small so card sits close to the pad */
const GAP_ABOVE_VESSEL = -28;

/**
 * Drink-build card: name, poured proportions, Trash?.
 * Scene-clear (no backdrop blur); levitates over drink pad (FS36).
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

  const { cardW, maxH, cssVars, shellStyle } = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const vesselW = sizePx?.w && sizePx.w > 0 ? sizePx.w : FALLBACK_W;
    const vesselH = sizePx?.h && sizePx.h > 0 ? sizePx.h : FALLBACK_H;
    const w = Math.min(Math.max(vesselW, MIN_W), vw * 0.92);
    const maxHeight = Math.min(Math.max(vesselH * 1.75, 140), vh * 0.42);

    // Prefer measured card height if available; else estimate from maxHeight
    const estimatedH = Math.min(maxHeight, Math.max(120, w * 1.1));

    let left = vw / 2;
    let top = vh * 0.35;
    if (sizePx && sizePx.w > 0) {
      left = sizePx.left + sizePx.w / 2;
      // Sit low over the pad: card bottom near vessel top (negative gap = overlap)
      top = sizePx.top - estimatedH - GAP_ABOVE_VESSEL;
      if (top < 8) {
        top = Math.max(8, sizePx.top - estimatedH * 0.2);
      }
      if (top + estimatedH > vh - 8) {
        top = Math.max(8, vh - estimatedH - 8);
      }
      // Keep horizontally on-screen
      const half = w / 2;
      if (left - half < 8) left = half + 8;
      if (left + half > vw - 8) left = vw - half - 8;
    }

    return {
      cardW: w,
      maxH: maxHeight,
      cssVars: {
        ['--drink-build-w' as string]: `${w}px`,
      },
      shellStyle: {
        position: 'fixed' as const,
        left,
        top,
        width: w,
        maxWidth: '92vw' as const,
        maxHeight: maxHeight,
        zIndex: 2200,
        transform: 'translateX(-50%)',
      },
    };
  }, [sizePx]);

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

  // Refine vertical position once shell has real height
  useEffect(() => {
    if (!open || !sizePx || !shellRef.current) return;
    const el = shellRef.current;
    const h = el.getBoundingClientRect().height;
    if (h <= 0) return;
    const vh = window.innerHeight;
    let top = sizePx.top - h - GAP_ABOVE_VESSEL;
    if (top < 8) top = Math.max(8, sizePx.top - h * 0.2);
    if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
    el.style.top = `${top}px`;
  }, [open, sizePx, lines, drinkTitle, cardW, maxH]);

  if (!open) return null;

  const pad = `max(8px, calc(${cardW}px * 0.1))`;

  return (
    <>
      {/* Transparent click-catcher — no blur, no dim */}
      <div
        className="drink-build-backdrop"
        role="presentation"
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <div
        ref={shellRef}
        className="drink-build-card-shell drink-build-card-shell--levitate"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          ...shellStyle,
          ...cssVars,
        }}
      >
        <div className="drink-build-card-float">
          <LiquidGlassCard
            padding={pad}
            borderRadius={`min(20px, calc(${cardW}px * 0.12))`}
            blur={12}
            brightness={1.15}
            backgroundColor="rgba(255, 255, 255, 0.12)"
            boxShadow="0 16px 32px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)"
          >
            <div className="drink-build-inner">
              <button
                ref={closeBtnRef}
                type="button"
                className="drink-build-close"
                onClick={onClose}
                aria-label="Close drink build card"
              >
                ×
              </button>
              <h2 id={titleId} className="drink-build-title">
                {drinkTitle}
              </h2>
              <div className="drink-build-proportions">
                {lines.length === 0 ? (
                  <p className="drink-build-empty">No pours yet</p>
                ) : (
                  lines.map((line) => (
                    <div key={line.id} className="drink-build-line">
                      {line.label} = {line.oz.toFixed(2)}oz
                    </div>
                  ))
                )}
              </div>
              <button type="button" className="drink-build-trash" onClick={onTrash}>
                Trash?
              </button>
            </div>
          </LiquidGlassCard>
        </div>
      </div>
    </>
  );
}

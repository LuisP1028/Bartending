'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CHARACTER_ELDER,
  characterToPatronDef,
  requireCharacter,
  type PatronDef,
} from '@/data/characters';
import {
  buildWalkPath,
  pointAlongPath,
  stagePointToPct,
  type PatronLayout,
  type StagePoint,
} from '@/data/patronLayout';
import { resolveBarSeatAnchor } from '@/lib/patronSeats';
import { POV_VIEWBOX } from '@/data/hotspotGeometry';
import { roomMinusBarClipPathCss } from '@/lib/svgPathScale';

export type PatronSeatInput = {
  zoneId: string;
  d: string;
};

type Phase = 'walking' | 'seated';

type PatronInstance = {
  def: PatronDef;
  layout: PatronLayout;
  phase: Phase;
  seatId: string;
  t: number;
  walkPath: StagePoint[];
  sitPoint: StagePoint;
  flipX: boolean;
  walkFrameIndex: number;
};

type PatronLayerProps = {
  seats: PatronSeatInput[];
  layout: PatronLayout;
  /**
   * Stage-space bar_cutoff path (HOTSPOT EDIT offsets applied).
   * Patron is clipped to stage − this region so lower body sits behind the bar photo.
   */
  barCutoffD?: string;
  editMode?: boolean;
  spawnDelayMs?: number;
  /** Stage sprite pack (from characterToPatronDef). */
  patron?: PatronDef;
  /**
   * Character id — when set (and patron omitted), resolves assets via registry.
   * Shared walk path is always layout-driven, not character-branched.
   */
  characterId?: string;
};

/**
 * Runtime walk/sit using PatronLayout (character-agnostic path math).
 * Depth: CSS even-odd clip (room minus bar_cutoff) — no second bar re-paint.
 */
export default function PatronLayer({
  seats,
  layout,
  barCutoffD = '',
  editMode = false,
  spawnDelayMs = 400,
  patron: patronProp,
  characterId,
}: PatronLayerProps) {
  const patron =
    patronProp ??
    characterToPatronDef(
      characterId ? requireCharacter(characterId) : CHARACTER_ELDER
    );
  const layerRef = useRef<HTMLDivElement>(null);
  const [layerSize, setLayerSize] = useState({ w: 0, h: 0 });
  const [instance, setInstance] = useState<PatronInstance | null>(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  // Measure layer so clip-path path() is in element pixels (matches stage box)
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setLayerSize({ w: cr.width, h: cr.height });
    });
    ro.observe(el);
    setLayerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const barClipCss = useMemo(
    () =>
      roomMinusBarClipPathCss(
        barCutoffD,
        layerSize.w,
        layerSize.h,
        POV_VIEWBOX.width,
        POV_VIEWBOX.height
      ),
    [barCutoffD, layerSize.w, layerSize.h]
  );

  const seatKey = useMemo(
    () => seats.map((s) => `${s.zoneId}:${s.d}`).join('|'),
    [seats]
  );

  const layoutKey = useMemo(() => JSON.stringify(layout), [layout]);

  const buildPaths = useMemo(() => {
    return (): {
      walkPath: StagePoint[];
      sitPoint: StagePoint;
      seatId: string;
    } | null => {
      if (!seats.length) return null;

      let seatId = layout.preferredSeatId;
      if (!seatId || !seats.some((s) => s.zoneId === seatId)) {
        seatId = seats[Math.floor(Math.random() * seats.length)].zoneId;
      }
      const seat = seats.find((s) => s.zoneId === seatId);
      if (!seat) return null;

      const a = resolveBarSeatAnchor(seat.zoneId, seat.d);
      if (!a) return null;

      const seatEnd: StagePoint = {
        x: (a.leftPct / 100) * POV_VIEWBOX.width,
        y: (a.topPct / 100) * POV_VIEWBOX.height,
      };

      const { walkPath, sitPoint } = buildWalkPath(layout, seatEnd);
      return { walkPath, sitPoint, seatId };
    };
  }, [seats, layout]);

  useEffect(() => {
    if (editMode) {
      setInstance(null);
      return;
    }
    if (!seats.length) return;

    let cancelled = false;
    let startTimer: ReturnType<typeof setTimeout> | null = null;

    const begin = () => {
      if (cancelled) return;
      const built = buildPaths();
      if (!built || built.walkPath.length < 2) {
        startTimer = setTimeout(begin, 120);
        return;
      }

      const start = built.walkPath[0];
      const end = built.walkPath[built.walkPath.length - 1];
      const flipX = end.x < start.x;

      setInstance({
        def: patron,
        layout,
        phase: 'walking',
        seatId: built.seatId,
        t: 0,
        walkPath: built.walkPath,
        sitPoint: built.sitPoint,
        flipX,
        walkFrameIndex: 0,
      });

      startRef.current = performance.now();
      const walkMs = Math.max(400, layout.walkMs);

      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - startRef.current;
        const t = Math.min(1, elapsed / walkMs);
        setInstance((prev) =>
          prev && prev.phase === 'walking' ? { ...prev, t } : prev
        );
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setInstance((prev) =>
            prev
              ? {
                  ...prev,
                  phase: 'seated',
                  t: 1,
                  flipX: false,
                  walkFrameIndex: 0,
                }
              : prev
          );
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    startTimer = setTimeout(begin, spawnDelayMs);

    return () => {
      cancelled = true;
      if (startTimer) clearTimeout(startTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatKey, layoutKey, editMode, spawnDelayMs, patron]);

  useEffect(() => {
    if (!instance || instance.phase !== 'walking') return;
    const frames = instance.def.walkFrames;
    if (!frames.length) return;
    const ms = instance.def.walkFrameMs ?? 120;
    const id = window.setInterval(() => {
      setInstance((prev) => {
        if (!prev || prev.phase !== 'walking') return prev;
        const n = prev.def.walkFrames.length;
        return { ...prev, walkFrameIndex: (prev.walkFrameIndex + 1) % n };
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [instance?.phase, instance?.def.walkFrameMs, instance?.def.walkFrames]);

  // Edit mode: PatronPlacementEditor owns walk + sit previews (no double ghosts).
  if (editMode) {
    return <div ref={layerRef} className="pov-patron-layer" aria-hidden="true" />;
  }

  if (!instance) {
    return <div ref={layerRef} className="pov-patron-layer" aria-hidden="true" />;
  }

  const isSeated = instance.phase === 'seated';
  const pos = isSeated
    ? instance.sitPoint
    : pointAlongPath(instance.walkPath, instance.t);
  const pct = stagePointToPct(pos);
  const frames = instance.def.walkFrames;
  const src = isSeated
    ? instance.def.sitSrc
    : frames[instance.walkFrameIndex % Math.max(frames.length, 1)] ?? frames[0];
  const widthPct = isSeated
    ? layout.sitDisplayWidthPct
    : layout.walkDisplayWidthPct;

  return (
    <div
      ref={layerRef}
      className="pov-patron-layer"
      aria-hidden="true"
      style={barClipCss ? { clipPath: barClipCss, WebkitClipPath: barClipCss } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`pov-patron-sprite${
          isSeated ? ' pov-patron-sprite--sit' : ' pov-patron-sprite--walk'
        }`}
        src={src}
        alt=""
        draggable={false}
        style={{
          left: `${pct.leftPct}%`,
          top: `${pct.topPct}%`,
          width: `${widthPct}%`,
          transform: `translate(-50%, -100%)${
            instance.flipX ? ' scaleX(-1)' : ''
          }`,
        }}
      />
    </div>
  );
}

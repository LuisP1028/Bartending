'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  characterToPatronDef,
  listCharacters,
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
import { resolvePatronLayout } from '@/lib/patronLayoutStorage';
import { POV_VIEWBOX } from '@/data/hotspotGeometry';
import { roomMinusBarClipPathCss } from '@/lib/svgPathScale';
import {
  AUTO_FILL_INITIAL_DELAY_MS,
  AUTO_FILL_INTERVAL_MS,
} from '@/data/patronServiceConstants';
import { BAR_SEAT_ZONE_IDS } from '@/data/patrons';

export type PatronSeatInput = {
  zoneId: string;
  d: string;
};

type Phase = 'walking' | 'seated';

type PatronInstance = {
  instanceKey: string;
  characterId: string;
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
  /**
   * Optional per-character layout overrides (PATRON EDIT / localStorage map).
   * Defaults resolve via resolvePatronLayout when omitted.
   */
  layoutOverrides?: Record<string, PatronLayout>;
  /**
   * Stage-space bar_cutoff path (HOTSPOT EDIT offsets applied).
   * Patron is clipped to stage − this region so lower body sits behind the bar photo.
   */
  barCutoffD?: string;
  editMode?: boolean;
  /** Optional; reserved for sit-complete order print (FS51). */
  onSitComplete?: (info: {
    instanceKey: string;
    characterId: string;
    seatId: string;
  }) => void;
};

function freeSeats(
  seats: PatronSeatInput[],
  instances: PatronInstance[]
): PatronSeatInput[] {
  const taken = new Set(
    instances.map((i) => i.seatId).filter((id) => Boolean(id))
  );
  return seats.filter(
    (s) =>
      s.zoneId &&
      BAR_SEAT_ZONE_IDS.includes(s.zoneId as (typeof BAR_SEAT_ZONE_IDS)[number]) &&
      !taken.has(s.zoneId)
  );
}

function livingCharacterIds(instances: PatronInstance[]): Set<string> {
  return new Set(instances.map((i) => i.characterId));
}

function pickRandomFreeCharacterId(instances: PatronInstance[]): string | null {
  const living = livingCharacterIds(instances);
  const pool = listCharacters().filter((c) => !living.has(c.id));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function buildEntryForSeat(
  seat: PatronSeatInput,
  layout: PatronLayout
): { walkPath: StagePoint[]; sitPoint: StagePoint; seatId: string } | null {
  const a = resolveBarSeatAnchor(seat.zoneId, seat.d);
  if (!a) return null;
  const seatEnd: StagePoint = {
    x: (a.leftPct / 100) * POV_VIEWBOX.width,
    y: (a.topPct / 100) * POV_VIEWBOX.height,
  };
  const { walkPath, sitPoint } = buildWalkPath(layout, seatEnd);
  if (walkPath.length < 2) return null;
  return { walkPath, sitPoint, seatId: seat.zoneId };
}

let keySeq = 0;
function nextInstanceKey(): string {
  keySeq += 1;
  return `patron-${keySeq}-${Date.now().toString(36)}`;
}

/**
 * FS83 multi-patron layer: auto-fill free seats with unique character ids.
 * Invariants: living count ≤ seats; one living patron per seat; no clone ids.
 */
export default function PatronLayer({
  seats,
  layoutOverrides = {},
  barCutoffD = '',
  editMode = false,
  onSitComplete,
}: PatronLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [layerSize, setLayerSize] = useState({ w: 0, h: 0 });
  const [instances, setInstances] = useState<PatronInstance[]>([]);
  const instancesRef = useRef<PatronInstance[]>([]);
  instancesRef.current = instances;

  const seatsRef = useRef(seats);
  seatsRef.current = seats;
  const layoutOverridesRef = useRef(layoutOverrides);
  layoutOverridesRef.current = layoutOverrides;
  const onSitCompleteRef = useRef(onSitComplete);
  onSitCompleteRef.current = onSitComplete;

  const rafByKey = useRef(new Map<string, number>());
  const walkStartByKey = useRef(new Map<string, number>());

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

  const cancelMotion = useCallback((instanceKey: string) => {
    const id = rafByKey.current.get(instanceKey);
    if (id) {
      cancelAnimationFrame(id);
      rafByKey.current.delete(instanceKey);
    }
    walkStartByKey.current.delete(instanceKey);
  }, []);

  const cancelAllMotion = useCallback(() => {
    for (const id of rafByKey.current.values()) {
      cancelAnimationFrame(id);
    }
    rafByKey.current.clear();
    walkStartByKey.current.clear();
  }, []);

  const runWalkMotion = useCallback(
    (instanceKey: string, walkMs: number) => {
      cancelMotion(instanceKey);
      walkStartByKey.current.set(instanceKey, performance.now());

      const tick = (now: number) => {
        const start = walkStartByKey.current.get(instanceKey);
        if (start == null) return;
        const t = Math.min(1, (now - start) / Math.max(400, walkMs));

        setInstances((prev) => {
          const idx = prev.findIndex((p) => p.instanceKey === instanceKey);
          if (idx < 0) return prev;
          const cur = prev[idx];
          if (cur.phase !== 'walking') return prev;

          if (t < 1) {
            const next = [...prev];
            next[idx] = { ...cur, t };
            instancesRef.current = next;
            return next;
          }

          const seated: PatronInstance = {
            ...cur,
            phase: 'seated',
            t: 1,
            flipX: false,
            walkFrameIndex: 0,
          };
          const next = [...prev];
          next[idx] = seated;
          instancesRef.current = next;
          return next;
        });

        if (t < 1) {
          rafByKey.current.set(instanceKey, requestAnimationFrame(tick));
        } else {
          rafByKey.current.delete(instanceKey);
          walkStartByKey.current.delete(instanceKey);
          const done = instancesRef.current.find(
            (p) => p.instanceKey === instanceKey
          );
          if (done?.phase === 'seated') {
            onSitCompleteRef.current?.({
              instanceKey,
              characterId: done.characterId,
              seatId: done.seatId,
            });
          }
        }
      };

      rafByKey.current.set(instanceKey, requestAnimationFrame(tick));
    },
    [cancelMotion]
  );

  const trySpawn = useCallback(() => {
    if (editMode) return;

    const current = instancesRef.current;
    const seatList = seatsRef.current;
    if (!seatList.length) return;

    // Capacity: never exceed total seats available
    if (current.length >= seatList.length) return;

    const free = freeSeats(seatList, current);
    if (!free.length) return;

    const characterId = pickRandomFreeCharacterId(current);
    if (!characterId) return;

    const seat = free[Math.floor(Math.random() * free.length)];
    const layout = resolvePatronLayout(characterId, layoutOverridesRef.current);
    const built = buildEntryForSeat(seat, layout);
    if (!built) return;

    const def = characterToPatronDef(requireCharacter(characterId));
    const instanceKey = nextInstanceKey();
    const start = built.walkPath[0];
    const end = built.walkPath[built.walkPath.length - 1];
    const flipX = end.x < start.x;

    let spawned: PatronInstance | null = null;

    setInstances((prev) => {
      // Atomic re-check: seat + character exclusivity + capacity
      if (prev.length >= seatList.length) return prev;
      if (prev.some((p) => p.seatId === built.seatId)) return prev;
      if (prev.some((p) => p.characterId === characterId)) return prev;

      const nextInst: PatronInstance = {
        instanceKey,
        characterId,
        def,
        layout,
        phase: 'walking',
        seatId: built.seatId,
        t: 0,
        walkPath: built.walkPath,
        sitPoint: built.sitPoint,
        flipX,
        walkFrameIndex: 0,
      };
      const next = [...prev, nextInst];
      instancesRef.current = next;
      spawned = nextInst;
      return next;
    });

    // Start motion after claim succeeds (raf next frame so state is committed)
    requestAnimationFrame(() => {
      const still = instancesRef.current.find((p) => p.instanceKey === instanceKey);
      if (still && still.phase === 'walking') {
        runWalkMotion(instanceKey, still.layout.walkMs);
      }
    });

    void spawned;
  }, [editMode, runWalkMotion]);

  // Auto-fill scheduler
  useEffect(() => {
    if (editMode) {
      cancelAllMotion();
      setInstances([]);
      instancesRef.current = [];
      return;
    }
    if (!seats.length) return;

    let cancelled = false;
    const initial = window.setTimeout(() => {
      if (!cancelled) trySpawn();
    }, AUTO_FILL_INITIAL_DELAY_MS);

    const interval = window.setInterval(() => {
      if (!cancelled) trySpawn();
    }, AUTO_FILL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [editMode, seats, trySpawn, cancelAllMotion]);

  const walkingCount = instances.filter((i) => i.phase === 'walking').length;

  // Walk frame animation for all walking patrons
  useEffect(() => {
    if (walkingCount === 0) return;
    const id = window.setInterval(() => {
      setInstances((prev) => {
        let changed = false;
        const next = prev.map((p) => {
          if (p.phase !== 'walking') return p;
          const n = p.def.walkFrames.length;
          if (n <= 0) return p;
          changed = true;
          return {
            ...p,
            walkFrameIndex: (p.walkFrameIndex + 1) % n,
          };
        });
        if (changed) instancesRef.current = next;
        return changed ? next : prev;
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [walkingCount]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => cancelAllMotion();
  }, [cancelAllMotion]);

  if (editMode) {
    return <div ref={layerRef} className="pov-patron-layer" aria-hidden="true" />;
  }

  return (
    <div
      ref={layerRef}
      className="pov-patron-layer"
      aria-hidden="true"
      style={barClipCss ? { clipPath: barClipCss, WebkitClipPath: barClipCss } : undefined}
    >
      {instances.map((inst) => {
        const isSeated = inst.phase === 'seated';
        const pos = isSeated
          ? inst.sitPoint
          : pointAlongPath(inst.walkPath, inst.t);
        const pct = stagePointToPct(pos);
        const frames = inst.def.walkFrames;
        const src = isSeated
          ? inst.def.sitSrc
          : frames[inst.walkFrameIndex % Math.max(frames.length, 1)] ??
            frames[0];
        const widthPct = isSeated
          ? inst.layout.sitDisplayWidthPct
          : inst.layout.walkDisplayWidthPct;

        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={inst.instanceKey}
            className={`pov-patron-sprite${
              isSeated ? ' pov-patron-sprite--sit' : ' pov-patron-sprite--walk'
            }`}
            src={src}
            alt=""
            draggable={false}
            data-character-id={inst.characterId}
            data-seat-id={inst.seatId}
            style={{
              left: `${pct.leftPct}%`,
              top: `${pct.topPct}%`,
              width: `${widthPct}%`,
              transform: `translate(-50%, -100%)${
                inst.flipX ? ' scaleX(-1)' : ''
              }`,
            }}
          />
        );
      })}
    </div>
  );
}

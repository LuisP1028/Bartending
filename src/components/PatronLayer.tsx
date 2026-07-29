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
  layoutOverrides?: Record<string, PatronLayout>;
  barCutoffD?: string;
  editMode?: boolean;
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
      BAR_SEAT_ZONE_IDS.includes(
        s.zoneId as (typeof BAR_SEAT_ZONE_IDS)[number]
      ) &&
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
 * FS83/84 multi-patron layer: auto-fill free seats with unique character ids.
 * Walk motion starts immediately on successful claim (FS84 unfreeze).
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
  /** Authoritative living list for spawn exclusivity + motion; never overwritten from stale render. */
  const instancesRef = useRef<PatronInstance[]>([]);

  const seatsRef = useRef(seats);
  seatsRef.current = seats;
  const layoutOverridesRef = useRef(layoutOverrides);
  layoutOverridesRef.current = layoutOverrides;
  const onSitCompleteRef = useRef(onSitComplete);
  onSitCompleteRef.current = onSitComplete;

  const rafByKey = useRef(new Map<string, number>());
  const walkStartByKey = useRef(new Map<string, number>());
  const walkMsByKey = useRef(new Map<string, number>());

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
    walkMsByKey.current.delete(instanceKey);
  }, []);

  const cancelAllMotion = useCallback(() => {
    for (const id of rafByKey.current.values()) {
      cancelAnimationFrame(id);
    }
    rafByKey.current.clear();
    walkStartByKey.current.clear();
    walkMsByKey.current.clear();
  }, []);

  /** Commit array to both React state and exclusivity ref (single source after claim). */
  const commitInstances = useCallback((next: PatronInstance[]) => {
    instancesRef.current = next;
    setInstances(next);
  }, []);

  const runWalkMotion = useCallback(
    (instanceKey: string, walkMs: number) => {
      cancelMotion(instanceKey);
      const duration = Math.max(400, walkMs);
      walkMsByKey.current.set(instanceKey, duration);
      walkStartByKey.current.set(instanceKey, performance.now());

      const tick = (now: number) => {
        const start = walkStartByKey.current.get(instanceKey);
        if (start == null) return;

        const durationMs = walkMsByKey.current.get(instanceKey) ?? duration;
        const t = Math.min(1, (now - start) / durationMs);

        const prev = instancesRef.current;
        const idx = prev.findIndex((p) => p.instanceKey === instanceKey);

        // Instance not claimed into ref yet — keep ticking until it appears or cancelled
        if (idx < 0) {
          if (t < 1) {
            rafByKey.current.set(instanceKey, requestAnimationFrame(tick));
          }
          return;
        }

        const cur = prev[idx];
        if (cur.phase !== 'walking') {
          cancelMotion(instanceKey);
          return;
        }

        if (t < 1) {
          const next = [...prev];
          next[idx] = { ...cur, t };
          commitInstances(next);
          rafByKey.current.set(instanceKey, requestAnimationFrame(tick));
          return;
        }

        // Sit
        const seated: PatronInstance = {
          ...cur,
          phase: 'seated',
          t: 1,
          flipX: false,
          walkFrameIndex: 0,
        };
        const next = [...prev];
        next[idx] = seated;
        commitInstances(next);
        rafByKey.current.delete(instanceKey);
        walkStartByKey.current.delete(instanceKey);
        walkMsByKey.current.delete(instanceKey);

        onSitCompleteRef.current?.({
          instanceKey,
          characterId: seated.characterId,
          seatId: seated.seatId,
        });
      };

      rafByKey.current.set(instanceKey, requestAnimationFrame(tick));
    },
    [cancelMotion, commitInstances]
  );

  const trySpawn = useCallback(() => {
    if (editMode) return;

    const current = instancesRef.current;
    const seatList = seatsRef.current;
    if (!seatList.length) return;
    if (current.length >= seatList.length) return;

    const free = freeSeats(seatList, current);
    if (!free.length) return;

    const characterId = pickRandomFreeCharacterId(current);
    if (!characterId) return;

    const seat = free[Math.floor(Math.random() * free.length)];
    const layout = resolvePatronLayout(characterId, layoutOverridesRef.current);
    const built = buildEntryForSeat(seat, layout);
    if (!built) return;

    // Atomic claim on ref first (before React paint) so motion never races state
    const latest = instancesRef.current;
    if (latest.length >= seatList.length) return;
    if (latest.some((p) => p.seatId === built.seatId)) return;
    if (latest.some((p) => p.characterId === characterId)) return;

    const def = characterToPatronDef(requireCharacter(characterId));
    const instanceKey = nextInstanceKey();
    const pathStart = built.walkPath[0];
    const pathEnd = built.walkPath[built.walkPath.length - 1];
    const flipX = pathEnd.x < pathStart.x;

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

    commitInstances([...latest, nextInst]);

    // FS84: start walk immediately — do not wait for a later rAF state check
    runWalkMotion(instanceKey, layout.walkMs);
  }, [editMode, commitInstances, runWalkMotion]);

  // Auto-fill scheduler — stable deps: do not tear down when trySpawn identity churns mid-session
  const trySpawnRef = useRef(trySpawn);
  trySpawnRef.current = trySpawn;

  useEffect(() => {
    if (editMode) {
      cancelAllMotion();
      commitInstances([]);
      return;
    }
    if (!seats.length) return;

    let cancelled = false;
    const initial = window.setTimeout(() => {
      if (!cancelled) trySpawnRef.current();
    }, AUTO_FILL_INITIAL_DELAY_MS);

    const interval = window.setInterval(() => {
      if (!cancelled) trySpawnRef.current();
    }, AUTO_FILL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [editMode, seats, cancelAllMotion, commitInstances]);

  const walkingCount = instances.filter((i) => i.phase === 'walking').length;

  useEffect(() => {
    if (walkingCount === 0) return;
    const id = window.setInterval(() => {
      const prev = instancesRef.current;
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
      if (changed) commitInstances(next);
    }, 120);
    return () => window.clearInterval(id);
  }, [walkingCount, commitInstances]);

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
      style={
        barClipCss
          ? { clipPath: barClipCss, WebkitClipPath: barClipCss }
          : undefined
      }
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

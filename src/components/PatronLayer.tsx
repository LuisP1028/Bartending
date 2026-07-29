'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  characterToPatronDef,
  listCharacters,
  requireCharacter,
  type PatronDef,
} from '@/data/characters';
import { setClientRuntimePatronCache } from '@/data/runtimePatrons';
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

type MotionClock = {
  startMs: number;
  walkMs: number;
  frameMs: number;
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
 * FS83/85 multi-patron layer.
 * Exclusivity: living ≤ seats; one per seat; unique character ids.
 * Motion: single rAF driver advances all walkers each frame (future-proof; no last-write-wins).
 * Leave can join the same driver later as phase `leaving`.
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

  const seatsRef = useRef(seats);
  seatsRef.current = seats;
  const layoutOverridesRef = useRef(layoutOverrides);
  layoutOverridesRef.current = layoutOverrides;
  const onSitCompleteRef = useRef(onSitComplete);
  onSitCompleteRef.current = onSitComplete;

  /** Per-instance walk clocks (data only). Single driver owns progression. */
  const motionClockRef = useRef(new Map<string, MotionClock>());
  const driverRafRef = useRef(0);
  const driverRunningRef = useRef(false);
  /** Sit-complete events queued during functional update, flushed after. */
  const pendingSitRef = useRef<
    { instanceKey: string; characterId: string; seatId: string }[]
  >([]);

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

  /** FS94 — refresh runtime (join-generated) patrons into listCharacters pool */
  useEffect(() => {
    let cancelled = false;
    const loadRoster = async () => {
      try {
        const res = await fetch('/api/patrons/roster');
        if (!res.ok) return;
        const data = (await res.json()) as {
          characters?: {
            id: string;
            displayName: string;
            personality: string;
            walkFrameCount?: number;
            walkFrameMs?: number;
          }[];
        };
        if (cancelled || !data.characters) return;
        // Built-ins are already in CHARACTERS; only cache join-generated extras
        const BUILTIN = new Set([
          'patron_elder',
          'caesar_9aea2cd1a4bf32d6',
          'trump_ca36306f5c662816',
        ]);
        setClientRuntimePatronCache(
          data.characters
            .filter((c) => !BUILTIN.has(c.id))
            .map((c) => ({
              id: c.id,
              displayName: c.displayName,
              personality: c.personality,
              walkFrameCount: c.walkFrameCount ?? 2,
              walkFrameMs: c.walkFrameMs ?? 120,
            }))
        );
      } catch {
        /* roster optional offline */
      }
    };
    void loadRoster();
    const t = window.setInterval(loadRoster, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
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

  const stopMotionDriver = useCallback(() => {
    if (driverRafRef.current) {
      cancelAnimationFrame(driverRafRef.current);
      driverRafRef.current = 0;
    }
    driverRunningRef.current = false;
  }, []);

  const clearAllMotion = useCallback(() => {
    stopMotionDriver();
    motionClockRef.current.clear();
    pendingSitRef.current = [];
  }, [stopMotionDriver]);

  /**
   * Single rAF loop — advances every walking patron from wall-clock.
   * One setInstances(prev => …) per frame so concurrent walkers never clobber each other.
   */
  const ensureMotionDriver = useCallback(() => {
    if (driverRunningRef.current) return;
    driverRunningRef.current = true;

    const tick = (now: number) => {
      pendingSitRef.current = [];
      let stillWalking = false;

      // Sync apply so instancesRef + stillWalking are correct this frame
      flushSync(() => {
        setInstances((prev) => {
          let changed = false;

          const next = prev.map((p) => {
            if (p.phase !== 'walking') return p;

            const clock = motionClockRef.current.get(p.instanceKey);
            if (!clock) {
              stillWalking = true;
              return p;
            }

            const t = Math.min(1, (now - clock.startMs) / clock.walkMs);
            const nFrames = Math.max(p.def.walkFrames.length, 1);
            const frameIndex =
              Math.floor((now - clock.startMs) / clock.frameMs) % nFrames;

            if (t < 1) {
              stillWalking = true;
              if (
                Math.abs(p.t - t) < 0.0001 &&
                p.walkFrameIndex === frameIndex
              ) {
                return p;
              }
              changed = true;
              return { ...p, t, walkFrameIndex: frameIndex };
            }

            changed = true;
            motionClockRef.current.delete(p.instanceKey);
            pendingSitRef.current.push({
              instanceKey: p.instanceKey,
              characterId: p.characterId,
              seatId: p.seatId,
            });
            return {
              ...p,
              phase: 'seated' as const,
              t: 1,
              flipX: false,
              walkFrameIndex: 0,
            };
          });

          // Drop orphan clocks (no matching living instance)
          for (const key of [...motionClockRef.current.keys()]) {
            if (!next.some((p) => p.instanceKey === key)) {
              motionClockRef.current.delete(key);
            }
          }

          if (motionClockRef.current.size > 0) {
            stillWalking = true;
          }

          if (!changed) {
            instancesRef.current = prev;
            return prev;
          }
          instancesRef.current = next;
          return next;
        });
      });

      const sits = pendingSitRef.current;
      pendingSitRef.current = [];
      for (const ev of sits) {
        onSitCompleteRef.current?.(ev);
      }

      if (stillWalking) {
        driverRafRef.current = requestAnimationFrame(tick);
      } else {
        driverRunningRef.current = false;
        driverRafRef.current = 0;
      }
    };

    driverRafRef.current = requestAnimationFrame(tick);
  }, []);

  const trySpawn = useCallback(() => {
    if (editMode) return;
    const seatList = seatsRef.current;
    if (!seatList.length) return;

    const snapshot = instancesRef.current;
    if (snapshot.length >= seatList.length) return;

    const free = freeSeats(seatList, snapshot);
    if (!free.length) return;

    const characterId = pickRandomFreeCharacterId(snapshot);
    if (!characterId) return;

    const seat = free[Math.floor(Math.random() * free.length)];
    const layout = resolvePatronLayout(characterId, layoutOverridesRef.current);
    const built = buildEntryForSeat(seat, layout);
    if (!built) return;

    const def = characterToPatronDef(requireCharacter(characterId));
    const instanceKey = nextInstanceKey();
    const pathStart = built.walkPath[0];
    const pathEnd = built.walkPath[built.walkPath.length - 1];
    const flipX = pathEnd.x < pathStart.x;
    const walkMs = Math.max(400, layout.walkMs);
    const frameMs = Math.max(60, def.walkFrameMs ?? 120);

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

    let accepted = false;

    // flushSync: functional claim runs now so clock attaches only after success
    flushSync(() => {
      setInstances((prev) => {
        if (prev.length >= seatList.length) {
          instancesRef.current = prev;
          return prev;
        }
        if (prev.some((p) => p.seatId === built.seatId)) {
          instancesRef.current = prev;
          return prev;
        }
        if (prev.some((p) => p.characterId === characterId)) {
          instancesRef.current = prev;
          return prev;
        }
        if (prev.some((p) => p.instanceKey === instanceKey)) {
          instancesRef.current = prev;
          return prev;
        }

        accepted = true;
        const next = [...prev, nextInst];
        instancesRef.current = next;
        return next;
      });
    });

    if (!accepted) return;

    motionClockRef.current.set(instanceKey, {
      startMs: performance.now(),
      walkMs,
      frameMs,
    });
    ensureMotionDriver();
  }, [editMode, ensureMotionDriver]);

  const trySpawnRef = useRef(trySpawn);
  trySpawnRef.current = trySpawn;

  useEffect(() => {
    if (editMode) {
      clearAllMotion();
      instancesRef.current = [];
      setInstances([]);
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
  }, [editMode, seats, clearAllMotion]);

  useEffect(() => {
    return () => clearAllMotion();
  }, [clearAllMotion]);

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

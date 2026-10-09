/**
 * Authorable layout for walkable patrons (HOTSPOT EDIT analogue).
 * Coordinates are POV viewBox units (0 0 1184 880).
 *
 * Character-agnostic motion: keyed by character id string only.
 * Walk size and sit size are independent so full-body walk frames are not
 * distorted by bust sit art (and vice versa).
 * Does not store personality or sprite URLs (see characters.ts).
 *
 * Stage presentation defaults (walk %, sit %, spawn, sitOffset, …) live in
 * DEFAULT_PATRON_STAGE — shared by every character. Elder is not the template;
 * all patrons (including Elder) resolve from these abstract parameters.
 */

import { POV_VIEWBOX } from './hotspotGeometry';

export type StagePoint = {
  x: number;
  y: number;
};

/** Base layout for any walkable patron component (shared walk-path system). */
export type PatronLayout = {
  /** Character id (matches CharacterDef.id) */
  patronId: string;
  /** Full-body walk sprite width as % of stage */
  walkDisplayWidthPct: number;
  /** Sit/bust sprite width as % of stage (independent of walk) */
  sitDisplayWidthPct: number;
  /** Feet / bottom-center spawn in viewBox space */
  spawn: StagePoint;
  /** Optional mid-path points (viewBox) before seat */
  waypoints: StagePoint[];
  /**
   * Seat zone to sit at, or null = random free bar_seat_*.
   */
  preferredSeatId: string | null;
  /** Nudge final sit position from seat anchor (viewBox dx/dy) */
  sitOffset: StagePoint;
  /**
   * When true, walk motion keeps Y = spawn.y (horizontal along bar).
   * Sit still uses seat Y + sitOffset when seated.
   */
  lockHorizontalWalk: boolean;
  /** Walk duration ms */
  walkMs: number;
};

export const AUTHORITATIVE_SPAWN_ORIGIN: Readonly<StagePoint> = Object.freeze({
  x: 143,
  y: 659,
});

export const AUTHORITATIVE_GROUND_Y = 659;

export const STANDARDIZED_PATRON_SCALE = {
  /** Target full-body walking height as % of stage height (880px) -> 545.6px */
  walkTargetHeightPct: 62,
  /** Target seated bust height as % of stage height (880px) -> 422.4px */
  sitTargetHeightPct: 48,
  /** Canonical aspect ratios for stock cast */
  stockAspectRatios: {
    patron_elder: 832 / 1248,
    caesar_9aea2cd1a4bf32d6: 1.0,
    trump_ca36306f5c662816: 1056 / 976,
    default_runtime: 1280 / 720,
  } as Record<string, number>,
};

/** Compute stage width percentage for a patron sprite given target height % and aspect ratio (W/H) */
export function computeNormalizedWidthPct(
  targetHeightPct: number,
  aspectRatio: number,
  viewW = POV_VIEWBOX.width,
  viewH = POV_VIEWBOX.height
): number {
  const heightPx = (targetHeightPct / 100) * viewH;
  const clampedAr = Math.max(0.2, Math.min(3.0, aspectRatio));
  const widthPx = heightPx * clampedAr;
  return (widthPx / viewW) * 100;
}

/**
 * Character-agnostic stage presentation defaults.
 * All patrons use these unless a stored PATRON EDIT override exists.
 * Locked shared stage: walk 57%, sit 35%,
 * spawn (143, 659), sitOffset (0, 73). Sit absolute = seat anchor + offset.
 */
export const DEFAULT_PATRON_STAGE = {
  walkDisplayWidthPct: 57,
  sitDisplayWidthPct: 35,
  spawn: { ...AUTHORITATIVE_SPAWN_ORIGIN } as StagePoint,
  waypoints: [] as StagePoint[],
  preferredSeatId: null as string | null,
  sitOffset: { x: 0, y: 73 } as StagePoint,
  lockHorizontalWalk: true,
  walkMs: 2400,
};

/** @deprecated Prefer DEFAULT_PATRON_STAGE — kept empty; no per-id special defaults. */
export const DEFAULT_PATRON_LAYOUTS: Record<string, PatronLayout> = {};

/** Legacy shape from localStorage v1 (single size). */
type LegacyPatronLayoutPatch = Partial<PatronLayout> & {
  displayWidthPct?: number;
  sitScale?: number;
};

/** Build default layout for any character id from shared stage parameters. */
export function getDefaultPatronLayout(patronId: string): PatronLayout {
  return {
    patronId,
    walkDisplayWidthPct: DEFAULT_PATRON_STAGE.walkDisplayWidthPct,
    sitDisplayWidthPct: DEFAULT_PATRON_STAGE.sitDisplayWidthPct,
    spawn: { ...DEFAULT_PATRON_STAGE.spawn },
    waypoints: DEFAULT_PATRON_STAGE.waypoints.map((p) => ({ ...p })),
    preferredSeatId: DEFAULT_PATRON_STAGE.preferredSeatId,
    sitOffset: { ...DEFAULT_PATRON_STAGE.sitOffset },
    lockHorizontalWalk: DEFAULT_PATRON_STAGE.lockHorizontalWalk,
    walkMs: DEFAULT_PATRON_STAGE.walkMs,
  };
}

export function clonePatronLayout(layout: PatronLayout): PatronLayout {
  return {
    ...layout,
    spawn: { ...layout.spawn },
    waypoints: layout.waypoints.map((p) => ({ ...p })),
    sitOffset: { ...layout.sitOffset },
  };
}

/** Normalize legacy single-width layouts into walk/sit widths. */
export function normalizePatronLayoutPatch(
  patch: LegacyPatronLayoutPatch | undefined
): Partial<PatronLayout> | undefined {
  if (!patch) return undefined;
  const {
    displayWidthPct,
    sitScale,
    walkDisplayWidthPct,
    sitDisplayWidthPct,
    ...rest
  } = patch;

  const out: Partial<PatronLayout> = { ...rest };

  if (walkDisplayWidthPct != null) {
    out.walkDisplayWidthPct = walkDisplayWidthPct;
  } else if (displayWidthPct != null) {
    out.walkDisplayWidthPct = displayWidthPct;
  }

  if (sitDisplayWidthPct != null) {
    out.sitDisplayWidthPct = sitDisplayWidthPct;
  } else if (displayWidthPct != null) {
    const scale = sitScale != null && sitScale > 0 ? sitScale : 0.65;
    out.sitDisplayWidthPct = Math.max(8, displayWidthPct * scale);
  }

  return out;
}

export function mergePatronLayout(
  base: PatronLayout,
  patch: LegacyPatronLayoutPatch | undefined
): PatronLayout {
  const normalized = normalizePatronLayoutPatch(patch);
  if (!normalized) return clonePatronLayout(base);
  return {
    ...clonePatronLayout(base),
    ...normalized,
    spawn: { ...base.spawn, ...(normalized.spawn ?? {}) },
    waypoints: normalized.waypoints
      ? normalized.waypoints.map((p) => ({ ...p }))
      : base.waypoints.map((p) => ({ ...p })),
    sitOffset: { ...base.sitOffset, ...(normalized.sitOffset ?? {}) },
  };
}

export function clampStagePoint(p: StagePoint, margin = 8): StagePoint {
  return {
    x: Math.min(POV_VIEWBOX.width - margin, Math.max(margin, p.x)),
    y: Math.min(POV_VIEWBOX.height - margin, Math.max(margin, p.y)),
  };
}

export function stagePointToPct(p: StagePoint): { leftPct: number; topPct: number } {
  return {
    leftPct: (p.x / POV_VIEWBOX.width) * 100,
    topPct: (p.y / POV_VIEWBOX.height) * 100,
  };
}

export function pctToStagePoint(leftPct: number, topPct: number): StagePoint {
  return {
    x: (leftPct / 100) * POV_VIEWBOX.width,
    y: (topPct / 100) * POV_VIEWBOX.height,
  };
}

export function pathLength(points: StagePoint[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    len += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return len;
}

export function pointAlongPath(points: StagePoint[], t: number): StagePoint {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { ...points[0] };
  const clamped = Math.min(1, Math.max(0, t));
  const total = pathLength(points);
  if (total <= 0) return { ...points[points.length - 1] };
  let dist = clamped * total;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist <= seg || i === points.length - 1) {
      const u = seg > 0 ? dist / seg : 1;
      return {
        x: a.x + (b.x - a.x) * u,
        y: a.y + (b.y - a.y) * u,
      };
    }
    dist -= seg;
  }
  return { ...points[points.length - 1] };
}

/**
 * Build walk polyline. All walking patrons originate at AUTHORITATIVE_SPAWN_ORIGIN
 * and travel along AUTHORITATIVE_GROUND_Y (level floor baseline).
 * Walk terminus and sit point enforce strict horizontal continuity (walkEnd.x === sitPoint.x).
 */
export function buildWalkPath(
  layout: PatronLayout,
  seatEnd: StagePoint
): { walkPath: StagePoint[]; sitPoint: StagePoint } {
  const groundY = AUTHORITATIVE_GROUND_Y;
  const spawn: StagePoint = { ...AUTHORITATIVE_SPAWN_ORIGIN };

  // Guaranteed strict horizontal match between walk terminus and sit point
  const targetX = seatEnd.x + (layout.sitOffset?.x ?? 0);
  const sitY = seatEnd.y + (layout.sitOffset?.y ?? 0);

  const wps = (layout.waypoints ?? []).map((p) =>
    clampStagePoint({ x: p.x, y: groundY })
  );

  const walkEnd: StagePoint = clampStagePoint({
    x: targetX,
    y: groundY,
  });

  const sitPoint: StagePoint = {
    x: targetX,
    y: sitY,
  };

  return {
    walkPath: [spawn, ...wps, walkEnd],
    sitPoint,
  };
}

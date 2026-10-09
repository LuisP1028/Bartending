import {
  measureHotspotElementBounds,
  measurePathBounds,
  POV_VIEWBOX,
} from '@/data/hotspotGeometry';

export type SeatAnchor = {
  leftPct: number;
  topPct: number;
  /** Countertop Y coordinate in stage viewBox space for verification */
  counterTopY: number;
  /** Calibrated sit anchor in stage viewBox coordinates (feet/bust base) */
  sitPoint: { x: number; y: number };
};

/**
 * FS107 — Standardized bar seat anchors with calibrated counterline clearance.
 * Derived from canonical bar_seat_* path extents and POV_BAR_CUTOFF edge elevation (viewBox 1184×880).
 */
export const STANDARDIZED_BAR_SEATS: Record<string, SeatAnchor> = {
  bar_seat_1: {
    leftPct: (218 / 1184) * 100,
    topPct: (449 / 880) * 100,
    counterTopY: 384,
    sitPoint: { x: 218, y: 534 },
  },
  bar_seat_2: {
    leftPct: (453 / 1184) * 100,
    topPct: (445 / 880) * 100,
    counterTopY: 367,
    sitPoint: { x: 453, y: 518 },
  },
  bar_seat_3: {
    leftPct: (705 / 1184) * 100,
    topPct: (445 / 880) * 100,
    counterTopY: 367,
    sitPoint: { x: 705, y: 518 },
  },
  bar_seat_4: {
    leftPct: (974 / 1184) * 100,
    topPct: (447 / 880) * 100,
    counterTopY: 368,
    sitPoint: { x: 974, y: 520 },
  },
};

/**
 * Sit anchor for a bar seat path: horizontal center, bottom of bbox,
 * as % of POV stage (viewBox 1184×880).
 * Returns standardized calibrated anchor for known bar seats.
 */
export function resolveBarSeatAnchor(
  zoneId: string,
  pathD: string
): SeatAnchor | null {
  if (STANDARDIZED_BAR_SEATS[zoneId]) {
    return STANDARDIZED_BAR_SEATS[zoneId];
  }
  const bounds =
    measureHotspotElementBounds(zoneId) ?? measurePathBounds(pathD);
  if (bounds && bounds.width > 0 && bounds.height > 0) {
    const { width: VW, height: VH } = POV_VIEWBOX;
    const cx = bounds.x + bounds.width / 2;
    const bottom = bounds.y + bounds.height;
    return {
      leftPct: (cx / VW) * 100,
      topPct: (bottom / VH) * 100,
      counterTopY: 367,
      sitPoint: { x: cx, y: bottom + 73 },
    };
  }
  return null;
}

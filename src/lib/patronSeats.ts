import {
  measureHotspotElementBounds,
  measurePathBounds,
  POV_VIEWBOX,
} from '@/data/hotspotGeometry';

export type SeatAnchor = {
  leftPct: number;
  topPct: number;
};

/**
 * FS97 — Fallback sit feet (bottom-center) if SVG getBBox fails.
 * Derived from canonical bar_seat_* path extents in povHotspots (viewBox 1184×880).
 */
const FALLBACK_SEAT_ANCHORS: Record<string, SeatAnchor> = {
  bar_seat_1: { leftPct: (218 / 1184) * 100, topPct: (449 / 880) * 100 },
  bar_seat_2: { leftPct: (453 / 1184) * 100, topPct: (445 / 880) * 100 },
  bar_seat_3: { leftPct: (705 / 1184) * 100, topPct: (445 / 880) * 100 },
  bar_seat_4: { leftPct: (974 / 1184) * 100, topPct: (447 / 880) * 100 },
};

/**
 * Sit anchor for a bar seat path: horizontal center, bottom of bbox,
 * as % of POV stage (viewBox 1184×880).
 * Never returns null for known bar seats (FS97 stock spawn reliability).
 */
export function resolveBarSeatAnchor(
  zoneId: string,
  pathD: string
): SeatAnchor | null {
  const bounds =
    measureHotspotElementBounds(zoneId) ?? measurePathBounds(pathD);
  if (bounds && bounds.width > 0 && bounds.height > 0) {
    const { width: VW, height: VH } = POV_VIEWBOX;
    const cx = bounds.x + bounds.width / 2;
    const bottom = bounds.y + bounds.height;
    return {
      leftPct: (cx / VW) * 100,
      topPct: (bottom / VH) * 100,
    };
  }
  return FALLBACK_SEAT_ANCHORS[zoneId] ?? null;
}

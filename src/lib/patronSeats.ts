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
 * Sit anchor for a bar seat path: horizontal center, bottom of bbox,
 * as % of POV stage (viewBox 1184×880).
 */
export function resolveBarSeatAnchor(
  zoneId: string,
  pathD: string
): SeatAnchor | null {
  const bounds =
    measureHotspotElementBounds(zoneId) ?? measurePathBounds(pathD);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  const { width: VW, height: VH } = POV_VIEWBOX;
  const cx = bounds.x + bounds.width / 2;
  const bottom = bounds.y + bounds.height;

  return {
    leftPct: (cx / VW) * 100,
    topPct: (bottom / VH) * 100,
  };
}

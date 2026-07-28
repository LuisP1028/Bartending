export type HotspotOffset = { dx: number; dy: number };

const STORAGE_KEY = 'pov-hotspot-offsets-v1';

export function loadHotspotOffsets(): Record<string, HotspotOffset> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, HotspotOffset>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveHotspotOffsets(offsets: Record<string, HotspotOffset>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(offsets));
  } catch {
    /* ignore */
  }
}

export function getOffset(
  offsets: Record<string, HotspotOffset>,
  zoneId: string
): HotspotOffset {
  return offsets[zoneId] ?? { dx: 0, dy: 0 };
}

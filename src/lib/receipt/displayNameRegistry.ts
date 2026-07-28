/**
 * Print-time id → manifest label for receipts.
 * Catalog is the full DefaultFreestyleManifest (all domains).
 * Ticket identity stays on raw ids; only display strings use labels.
 */

import {
  DefaultFreestyleManifest,
  type Ingredient,
} from '@/data/Manifest';

export type DisplayNameResolver = (id: string) => string;

let cachedMap: Record<string, string> | null = null;

/** Plain text for thermal receipt (glass labels may embed HTML in catalog). */
export function sanitizeReceiptLabel(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function addItems(map: Record<string, string>, items: Ingredient[]) {
  for (const item of items) {
    if (!item?.id) continue;
    // First non-empty label wins (stable catalog order)
    if (map[item.id] == null && item.label) {
      map[item.id] = sanitizeReceiptLabel(item.label);
    }
  }
}

/** Full freestyle catalog id → label (lazy singleton). */
export function getDisplayNameMap(): Record<string, string> {
  if (cachedMap) return cachedMap;
  const manifest = new DefaultFreestyleManifest();
  const map: Record<string, string> = {};
  addItems(map, manifest.getLiquors());
  addItems(map, manifest.getSyrups());
  addItems(map, manifest.getGarnishes());
  addItems(map, manifest.getGlasses());
  addItems(map, manifest.getRims());
  addItems(map, manifest.getHardware());
  cachedMap = map;
  return map;
}

/**
 * Resolve inventory/recipe id to manifest label.
 * Fallback: raw id when unmapped (LLM orphans, typos).
 */
export function resolveDisplayName(id: string): string {
  if (!id) return id;
  const map = getDisplayNameMap();
  return map[id] ?? id;
}

/**
 * Vessel code → receipt-safe glass name.
 * Full glass catalog labels can include "VOL: …" which crowds the VESSEL row;
 * strip volume clause for the ticket face (body still clear).
 */
export function resolveVesselDisplay(vessel: string): string {
  let name = resolveDisplayName(vessel);
  // Drop trailing volume specs: "… VOL: 4-10oz" or "… VOL:4-10oz"
  name = name.replace(/\s*VOL\s*:\s*[^\n|]*$/i, '').trim();
  // Drop broken trailing "VOL: 4-1" mid-clip artifacts
  name = name.replace(/\s*VOL\s*:\s*.*$/i, '').trim();
  return name || vessel;
}

/** Test helper / hot reload: clear singleton. */
export function clearDisplayNameMapCache(): void {
  cachedMap = null;
}

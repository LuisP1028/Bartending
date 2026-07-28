import type { ModeData } from './types';
import type { NormalizedRestaurantPayload } from '@/utils/LLMMenuMapper';

/**
 * Load mode payload JSON by mode name.
 * Primary: src/data/modes/<MODE>.json
 * Fallback: legacy obelisco_mapped.json when mode is OBELISCO / obelisco_mapped
 */
export async function loadMode(modeName: string): Promise<NormalizedRestaurantPayload> {
  const candidates: string[] = [];

  // Normalize: obelisco_mapped → OBELISCO
  const normalized =
    modeName === 'obelisco_mapped' || modeName === 'obelisco'
      ? 'OBELISCO'
      : modeName;

  candidates.push(normalized);

  for (const name of candidates) {
    try {
      const mod = await import(`../../data/modes/${name}.json`);
      return (mod.default ?? mod) as NormalizedRestaurantPayload;
    } catch {
      /* try next */
    }
  }

  if (normalized === 'OBELISCO') {
    try {
      console.warn(
        `[modeLoader] modes/OBELISCO.json missing; falling back to legacy obelisco_mapped.json`
      );
      const legacy = await import('../../data/obelisco_mapped.json');
      return (legacy.default ?? legacy) as NormalizedRestaurantPayload;
    } catch (err) {
      console.warn(`Failed to load mode JSON for ${modeName}`, err);
    }
  }

  throw new Error(
    `Mode payload not found for "${modeName}" (tried src/data/modes/${normalized}.json)`
  );
}

/** Adapter for older ModeData consumers */
export async function loadModeData(modeName: string): Promise<ModeData> {
  const payload = await loadMode(modeName);
  return payload as unknown as ModeData;
}

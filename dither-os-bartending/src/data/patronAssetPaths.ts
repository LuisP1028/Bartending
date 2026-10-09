/**
 * Convention-based walk/sit asset paths for all bar characters.
 *
 * Nested (default for new patrons / folder layout):
 *   public/assets/patrons/{characterId}/walk_01.png … walk_0N.png
 *   public/assets/patrons/{characterId}/sit.png
 *   Web: /assets/patrons/{characterId}/sit.png
 *
 * Legacy flat (elder, user, and any id listed in LEGACY_FLAT_PATRON_IDS):
 *   public/assets/patrons/{characterId}_walk_01.png
 *   public/assets/patrons/{characterId}_sit.png
 *
 * Runtime does not generate images — only resolves paths for PatronLayer.
 */

/** Visual pack for stage walk/sit — not identity, not dialogue. */
export type PatronAssets = {
  walkFrames: string[];
  sitSrc: string;
  /** Mouth-open sit still for future talking effect (optional until generated). */
  talkSrc?: string;
  walkFrameMs: number;
  /** Defaults used when creating layout for this character */
  defaultWalkDisplayWidthPct?: number;
  defaultSitDisplayWidthPct?: number;
};

export const PATRON_ASSETS_PUBLIC_BASE = '/assets/patrons/';

/** Legacy / Elder default (four walk files). New skill-driven packs use 2. */
export const DEFAULT_WALK_FRAME_COUNT = 4;

/** Skill-driven packs (map-012 / FS24): walk_01 + walk_02 only. */
export const DEFAULT_NEW_PACK_WALK_FRAME_COUNT = 2;

export const DEFAULT_WALK_FRAME_MS = 120;

/**
 * Characters that keep pre-folder flat filenames on disk.
 * Everyone else uses nested `{id}/sit.png` layout.
 */
export const LEGACY_FLAT_PATRON_IDS = new Set([
  'patron_elder',
]);

export function usesNestedPatronAssets(characterId: string): boolean {
  return !LEGACY_FLAT_PATRON_IDS.has(characterId);
}

export function padWalkFrameIndex(i: number): string {
  return String(i).padStart(2, '0');
}

export function walkFrameSrc(
  characterId: string,
  frameIndex1Based: number
): string {
  const n = padWalkFrameIndex(frameIndex1Based);
  if (usesNestedPatronAssets(characterId)) {
    return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}/walk_${n}.png`;
  }
  return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}_walk_${n}.png`;
}

export function sitSrcForCharacter(characterId: string): string {
  if (usesNestedPatronAssets(characterId)) {
    return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}/sit.png`;
  }
  return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}_sit.png`;
}

export function talkSrcForCharacter(characterId: string): string {
  if (usesNestedPatronAssets(characterId)) {
    return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}/talk.png`;
  }
  return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}_talk.png`;
}

export function buildWalkFrameSrcs(
  characterId: string,
  frameCount: number = DEFAULT_WALK_FRAME_COUNT
): string[] {
  const count = Math.max(1, Math.floor(frameCount));
  const frames: string[] = [];
  for (let i = 1; i <= count; i++) {
    frames.push(walkFrameSrc(characterId, i));
  }
  return frames;
}

export type ResolvePatronAssetsOptions = {
  characterId: string;
  walkFrameCount?: number;
  walkFrameMs?: number;
  defaultWalkDisplayWidthPct?: number;
  defaultSitDisplayWidthPct?: number;
  /** Escape hatch: partial override of convention-built assets */
  override?: Partial<PatronAssets>;
};

/** Build PatronAssets for any character id from the shared path convention. */
export function resolvePatronAssets(
  options: ResolvePatronAssetsOptions
): PatronAssets {
  const id = options.characterId;
  const count = options.walkFrameCount ?? DEFAULT_WALK_FRAME_COUNT;
  const base: PatronAssets = {
    walkFrames: buildWalkFrameSrcs(id, count),
    sitSrc: sitSrcForCharacter(id),
    talkSrc: talkSrcForCharacter(id),
    walkFrameMs: options.walkFrameMs ?? DEFAULT_WALK_FRAME_MS,
    defaultWalkDisplayWidthPct: options.defaultWalkDisplayWidthPct,
    defaultSitDisplayWidthPct: options.defaultSitDisplayWidthPct,
  };

  if (!options.override) return base;

  const { override } = options;
  return {
    ...base,
    ...override,
    walkFrames: override.walkFrames ?? base.walkFrames,
    sitSrc: override.sitSrc ?? base.sitSrc,
    talkSrc: override.talkSrc ?? base.talkSrc,
    walkFrameMs: override.walkFrameMs ?? base.walkFrameMs,
  };
}

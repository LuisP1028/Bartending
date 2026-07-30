/**
 * First-class bar characters: identity + personality (LLM routing)
 * separate from stage visual packs (PatronAssets) and walk layout math.
 *
 * Walk/sit URLs are convention-resolved via patronAssetPaths (not hand-listed).
 * After your image pipeline writes public PNGs, register with buildCharacterDef.
 */

import { DEFAULT_PATRON_STAGE } from './patronLayout';
import {
  resolvePatronAssets,
  type PatronAssets,
} from './patronAssetPaths';

export type { PatronAssets } from './patronAssetPaths';
export {
  PATRON_ASSETS_PUBLIC_BASE,
  DEFAULT_WALK_FRAME_COUNT,
  DEFAULT_WALK_FRAME_MS,
  padWalkFrameIndex,
  walkFrameSrc,
  sitSrcForCharacter,
  buildWalkFrameSrcs,
  resolvePatronAssets,
  type ResolvePatronAssetsOptions,
} from './patronAssetPaths';

/**
 * Character record.
 * `personality` is the stable key for LLM dialogue system-prompt routing.
 */
export type CharacterDef = {
  id: string;
  displayName: string;
  /** Routes LLM node → PERSONALITY_SYSTEM_PROMPTS catalog entry */
  personality: string;
  assets: PatronAssets;
};

/** Authoring input — assets built from path convention. */
export type CharacterDefInput = {
  id: string;
  displayName: string;
  personality: string;
  /** Walk frame count (legacy default 4; new skill packs use 2) */
  walkFrameCount?: number;
  walkFrameMs?: number;
  defaultWalkDisplayWidthPct?: number;
  defaultSitDisplayWidthPct?: number;
  /** Rare escape hatch for non-convention paths */
  assetsOverride?: Partial<PatronAssets>;
};

/**
 * Stage sprite view used by PatronLayer (derived from CharacterDef.assets).
 */
export type PatronDef = {
  id: string;
  walkFrames: string[];
  sitSrc: string;
  displayWidthPct: number;
  walkFrameMs: number;
};

/** Build a CharacterDef with convention-resolved walkFrames + sitSrc. */
export function buildCharacterDef(input: CharacterDefInput): CharacterDef {
  return {
    id: input.id,
    displayName: input.displayName,
    personality: input.personality,
    assets: resolvePatronAssets({
      characterId: input.id,
      walkFrameCount: input.walkFrameCount,
      walkFrameMs: input.walkFrameMs,
      // Shared stage sizes unless explicitly overridden
      defaultWalkDisplayWidthPct:
        input.defaultWalkDisplayWidthPct ??
        DEFAULT_PATRON_STAGE.walkDisplayWidthPct,
      defaultSitDisplayWidthPct:
        input.defaultSitDisplayWidthPct ??
        DEFAULT_PATRON_STAGE.sitDisplayWidthPct,
      override: input.assetsOverride,
    }),
  };
}

/**
 * Registry of all stage characters.
 * Keep only production patrons: Elder, Caesar, Trump.
 * Register new characters with buildCharacterDef after pipeline writes public PNGs.
 */

export const CHARACTER_ELDER: CharacterDef = buildCharacterDef({
  id: 'patron_elder',
  displayName: 'Elder',
  personality: 'elder_wry',
  walkFrameCount: 4,
  walkFrameMs: 120,
});

export const CHARACTER_CAESAR_9AEA2CD1A4BF32D6 = buildCharacterDef({
  id: 'caesar_9aea2cd1a4bf32d6',
  displayName: 'Caesar',
  personality: 'caesar_9aea2cd1a4bf32d6_friendly',
  walkFrameCount: 2,
  walkFrameMs: 120,
});

export const CHARACTER_TRUMP_CA36306F5C662816 = buildCharacterDef({
  id: 'trump_ca36306f5c662816',
  displayName: 'Trump',
  personality: 'trump_ca36306f5c662816_friendly',
  walkFrameCount: 2,
  walkFrameMs: 120,
});

export const CHARACTERS: Record<string, CharacterDef> = {
  [CHARACTER_ELDER.id]: CHARACTER_ELDER,
  [CHARACTER_CAESAR_9AEA2CD1A4BF32D6.id]: CHARACTER_CAESAR_9AEA2CD1A4BF32D6,
  [CHARACTER_TRUMP_CA36306F5C662816.id]: CHARACTER_TRUMP_CA36306F5C662816,
};

/**
 * Built-in + client runtime cache (FS94).
 * FS97: never return empty — stock CHARACTERS if runtime merge fails
 * (require()/ESM interop has broken client pools in production).
 */
export function listCharacters(): CharacterDef[] {
  try {
    // Deferred import keeps buildCharacterDef cycle one-way at runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rt = require('./runtimePatrons') as {
      listAllCharactersClient?: () => CharacterDef[];
      default?: { listAllCharactersClient?: () => CharacterDef[] };
    };
    const fn =
      rt.listAllCharactersClient ?? rt.default?.listAllCharactersClient;
    if (typeof fn === 'function') {
      const list = fn();
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {
    /* fall through to stock */
  }
  return Object.values(CHARACTERS);
}

export function getCharacter(id: string): CharacterDef | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rt = require('./runtimePatrons') as {
      getCharacterMerged?: (id: string) => CharacterDef | undefined;
      default?: {
        getCharacterMerged?: (id: string) => CharacterDef | undefined;
      };
    };
    const fn = rt.getCharacterMerged ?? rt.default?.getCharacterMerged;
    if (typeof fn === 'function') {
      const hit = fn(id);
      if (hit) return hit;
    }
  } catch {
    /* fall through */
  }
  return CHARACTERS[id];
}

/** Resolve character; unknown ids fall back to elder. */
export function requireCharacter(id: string): CharacterDef {
  return getCharacter(id) ?? CHARACTER_ELDER;
}

export function getCharacterAssets(id: string): PatronAssets {
  return requireCharacter(id).assets;
}

export function getCharacterPersonality(id: string): string {
  return requireCharacter(id).personality;
}

/** Map character → PatronLayer sprite def (walk/sit only). */
export function characterToPatronDef(character: CharacterDef): PatronDef {
  const { assets } = character;
  return {
    id: character.id,
    walkFrames: assets.walkFrames,
    sitSrc: assets.sitSrc,
    walkFrameMs: assets.walkFrameMs,
    displayWidthPct:
      assets.defaultWalkDisplayWidthPct ??
      DEFAULT_PATRON_STAGE.walkDisplayWidthPct,
  };
}

/** Backward-compatible elder stage def. */
export const PATRON_ELDER: PatronDef = characterToPatronDef(CHARACTER_ELDER);

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

export const CHARACTER_ELDER: CharacterDef = buildCharacterDef({
  id: 'patron_elder',
  displayName: 'Elder',
  personality: 'elder_wry',
  walkFrameCount: 4,
  walkFrameMs: 120,
  // sizes from DEFAULT_PATRON_STAGE
});

/** Pipeline-generated patron from user photo (walk/sit under public/assets/patrons/). */
export const CHARACTER_USER: CharacterDef = buildCharacterDef({
  id: 'patron_user',
  displayName: 'User',
  personality: 'user_friendly',
  walkFrameCount: 4,
  walkFrameMs: 120,
});

/**
 * Registry of all stage characters.
 * Register new characters with buildCharacterDef({ id, displayName, personality, ... })
 * after the image pipeline writes matching public PNGs.
 */

/** Pipeline auto-registered patron (patron_229997671c4ef590). */
export const CHARACTER_229997671C4EF590 = buildCharacterDef({
  id: 'patron_229997671c4ef590',
  displayName: '229997671c4ef590',
  personality: '229997671c4ef590_friendly',
  walkFrameCount: 4,
  walkFrameMs: 120,
});


/** Pipeline auto-registered patron (test_patron_86f6021625b14357). */
export const CHARACTER_TEST_PATRON_86F6021625B14357 = buildCharacterDef({
  id: 'test_patron_86f6021625b14357',
  displayName: 'Test Patron',
  personality: 'test_patron_86f6021625b14357_friendly',
  walkFrameCount: 4,
  walkFrameMs: 120,
});


/** Pipeline auto-registered patron (tini_tin_feed74f76de4d558). */
export const CHARACTER_TINI_TIN_FEED74F76DE4D558 = buildCharacterDef({
  id: 'tini_tin_feed74f76de4d558',
  displayName: 'Tini tin',
  personality: 'tini_tin_feed74f76de4d558_friendly',
  walkFrameCount: 4,
  walkFrameMs: 120,
});


/** Pipeline auto-registered patron (tini_feed74f76de4d558). */
export const CHARACTER_TINI_FEED74F76DE4D558 = buildCharacterDef({
  id: 'tini_feed74f76de4d558',
  displayName: 'Tini',
  personality: 'tini_feed74f76de4d558_friendly',
  walkFrameCount: 4,
  walkFrameMs: 120,
});


/** Pipeline auto-registered patron (zyn_9ddba23b1dce75cb). */
export const CHARACTER_ZYN_9DDBA23B1DCE75CB = buildCharacterDef({
  id: 'zyn_9ddba23b1dce75cb',
  displayName: 'Zyn',
  personality: 'zyn_9ddba23b1dce75cb_friendly',
  walkFrameCount: 4,
  walkFrameMs: 120,
});


/** Pipeline auto-registered patron (maya_f1311a048f27c747). */
export const CHARACTER_MAYA_F1311A048F27C747 = buildCharacterDef({
  id: 'maya_f1311a048f27c747',
  displayName: 'Maya',
  personality: 'maya_f1311a048f27c747_friendly',
  walkFrameCount: 2,
  walkFrameMs: 120,
});


/** Pipeline auto-registered patron (maya_27e4cf21966d8d8a). */
export const CHARACTER_MAYA_27E4CF21966D8D8A = buildCharacterDef({
  id: 'maya_27e4cf21966d8d8a',
  displayName: 'Maya',
  personality: 'maya_27e4cf21966d8d8a_friendly',
  walkFrameCount: 2,
  walkFrameMs: 120,
});


/** Pipeline auto-registered patron (maya_97f9afac54d31705). */
export const CHARACTER_MAYA_97F9AFAC54D31705 = buildCharacterDef({
  id: 'maya_97f9afac54d31705',
  displayName: 'Maya',
  personality: 'maya_97f9afac54d31705_friendly',
  walkFrameCount: 2,
  walkFrameMs: 120,
});


/** Pipeline auto-registered patron (maya_0e62d3d31580bbe9). */
export const CHARACTER_MAYA_0E62D3D31580BBE9 = buildCharacterDef({
  id: 'maya_0e62d3d31580bbe9',
  displayName: 'Maya',
  personality: 'maya_0e62d3d31580bbe9_friendly',
  walkFrameCount: 2,
  walkFrameMs: 120,
});


/** Pipeline auto-registered patron (caesar_9aea2cd1a4bf32d6). */
export const CHARACTER_CAESAR_9AEA2CD1A4BF32D6 = buildCharacterDef({
  id: 'caesar_9aea2cd1a4bf32d6',
  displayName: 'Caesar',
  personality: 'caesar_9aea2cd1a4bf32d6_friendly',
  walkFrameCount: 2,
  walkFrameMs: 120,
});


/** Pipeline auto-registered patron (trump_ca36306f5c662816). */
export const CHARACTER_TRUMP_CA36306F5C662816 = buildCharacterDef({
  id: 'trump_ca36306f5c662816',
  displayName: 'Trump',
  personality: 'trump_ca36306f5c662816_friendly',
  walkFrameCount: 2,
  walkFrameMs: 120,
});

export const CHARACTERS: Record<string, CharacterDef> = {
  [CHARACTER_TRUMP_CA36306F5C662816.id]: CHARACTER_TRUMP_CA36306F5C662816,
  [CHARACTER_CAESAR_9AEA2CD1A4BF32D6.id]: CHARACTER_CAESAR_9AEA2CD1A4BF32D6,
  [CHARACTER_MAYA_0E62D3D31580BBE9.id]: CHARACTER_MAYA_0E62D3D31580BBE9,
  [CHARACTER_MAYA_97F9AFAC54D31705.id]: CHARACTER_MAYA_97F9AFAC54D31705,
  [CHARACTER_MAYA_27E4CF21966D8D8A.id]: CHARACTER_MAYA_27E4CF21966D8D8A,
  [CHARACTER_MAYA_F1311A048F27C747.id]: CHARACTER_MAYA_F1311A048F27C747,
  [CHARACTER_ZYN_9DDBA23B1DCE75CB.id]: CHARACTER_ZYN_9DDBA23B1DCE75CB,
  [CHARACTER_TINI_FEED74F76DE4D558.id]: CHARACTER_TINI_FEED74F76DE4D558,
  [CHARACTER_TINI_TIN_FEED74F76DE4D558.id]: CHARACTER_TINI_TIN_FEED74F76DE4D558,
  [CHARACTER_TEST_PATRON_86F6021625B14357.id]: CHARACTER_TEST_PATRON_86F6021625B14357,
  [CHARACTER_229997671C4EF590.id]: CHARACTER_229997671C4EF590,
  [CHARACTER_ELDER.id]: CHARACTER_ELDER,
  [CHARACTER_USER.id]: CHARACTER_USER,
};

export function listCharacters(): CharacterDef[] {
  return Object.values(CHARACTERS);
}

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS[id];
}

/** Resolve character; unknown ids fall back to elder. */
export function requireCharacter(id: string): CharacterDef {
  return CHARACTERS[id] ?? CHARACTER_ELDER;
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

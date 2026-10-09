/**
 * FS94 — Merge built-in CHARACTERS with runtime-patrons.json (server)
 * and optional client-side cache after roster fetch.
 */

import {
  buildCharacterDef,
  CHARACTERS,
  CHARACTER_ELDER,
  type CharacterDef,
  type CharacterDefInput,
} from './characters';

export type RuntimePatronPublic = {
  id: string;
  displayName: string;
  personality: string;
  walkFrameCount: number;
  walkFrameMs: number;
  /** FS98 — optional explicit URLs (runtime-served API paths) */
  sitSrc?: string;
  walkFrames?: string[];
  talkSrc?: string;
};

/** Client/module cache of runtime patrons (filled by roster fetch). */
let clientRuntimeCache: RuntimePatronPublic[] = [];

export function setClientRuntimePatronCache(
  entries: RuntimePatronPublic[]
): void {
  clientRuntimeCache = Array.isArray(entries) ? entries : [];
}

export function getClientRuntimePatronCache(): RuntimePatronPublic[] {
  return clientRuntimeCache;
}

export function characterDefFromRuntime(
  r: RuntimePatronPublic
): CharacterDef {
  const walkN = r.walkFrameCount ?? 2;
  const apiBase = `/api/patrons/assets/${r.id}`;
  const defaultWalks = Array.from({ length: walkN }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return `${apiBase}/walk_${n}.png`;
  });
  const input: CharacterDefInput = {
    id: r.id,
    displayName: r.displayName,
    personality: r.personality,
    walkFrameCount: walkN,
    walkFrameMs: r.walkFrameMs ?? 120,
    assetsOverride: {
      sitSrc: r.sitSrc || `${apiBase}/sit.png`,
      talkSrc: r.talkSrc || `${apiBase}/talk.png`,
      walkFrames:
        r.walkFrames && r.walkFrames.length > 0 ? r.walkFrames : defaultWalks,
    },
  };
  return buildCharacterDef(input);
}

/** Built-ins + client cache (safe on browser). */
export function listAllCharactersClient(): CharacterDef[] {
  const builtIns = Object.values(CHARACTERS);
  const extra = clientRuntimeCache
    .filter((r) => !CHARACTERS[r.id])
    .map(characterDefFromRuntime);
  return [...builtIns, ...extra];
}

export function getCharacterMerged(id: string): CharacterDef | undefined {
  if (CHARACTERS[id]) return CHARACTERS[id];
  const hit = clientRuntimeCache.find((r) => r.id === id);
  return hit ? characterDefFromRuntime(hit) : undefined;
}

export function requireCharacterMerged(id: string): CharacterDef {
  return getCharacterMerged(id) ?? CHARACTER_ELDER;
}

/** Server-only: read data/runtime-patrons.json */
export function listRuntimePatronRecordsServer(): RuntimePatronPublic[] {
  if (typeof window !== 'undefined') return clientRuntimeCache;
  try {
    // Dynamic require path for server components/routes
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readRuntimePatrons } = require('@/lib/runtimePatronStore') as {
      readRuntimePatrons: (root: string) => RuntimePatronPublic[];
    };
    return readRuntimePatrons(process.cwd());
  } catch {
    return [];
  }
}

export function listAllCharactersServer(): CharacterDef[] {
  const builtIns = Object.values(CHARACTERS);
  const runtime = listRuntimePatronRecordsServer()
    .filter((r) => !CHARACTERS[r.id])
    .map(characterDefFromRuntime);
  return [...builtIns, ...runtime];
}

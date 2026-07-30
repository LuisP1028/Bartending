/**
 * FS96 — Ready pack gate for join-generated (nested) patrons.
 * Matches product --run install: sit + talk + walk_01 + walk_02.
 */

import fs from 'fs';
import path from 'path';

/** Basenames written by installPackFromStagingDir (walkFrameCount = 2). */
export const JOIN_PACK_BASENAMES = [
  'sit.png',
  'talk.png',
  'walk_01.png',
  'walk_02.png',
] as const;

export function publicPatronPackDir(
  repoRoot: string,
  characterId: string
): string {
  return path.join(repoRoot, 'public', 'assets', 'patrons', characterId);
}

export function listPatronPackPaths(
  repoRoot: string,
  characterId: string
): string[] {
  const dir = publicPatronPackDir(repoRoot, characterId);
  return JOIN_PACK_BASENAMES.map((name) => path.join(dir, name));
}

/**
 * True when all four nested pack files exist, are files, and non-empty.
 * Use for join/runtime ids only (not legacy flat Elder).
 */
export function isPatronPackReady(
  repoRoot: string,
  characterId: string
): boolean {
  if (!characterId || characterId.includes('..') || characterId.includes('/')) {
    return false;
  }
  for (const p of listPatronPackPaths(repoRoot, characterId)) {
    try {
      if (!fs.existsSync(p)) return false;
      const st = fs.statSync(p);
      if (!st.isFile() || st.size <= 0) return false;
    } catch {
      return false;
    }
  }
  return true;
}

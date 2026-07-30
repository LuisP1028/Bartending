/**
 * FS96/FS97 — Ready pack gate for join-generated (nested) patrons.
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

/** Prefer explicit app root; HF/Next can leave cwd ambiguous. */
export function resolveAppRoot(repoRoot?: string): string {
  const candidates = [
    repoRoot,
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    '/home/node/app',
  ].filter((x): x is string => typeof x === 'string' && x.length > 0);

  for (const root of candidates) {
    try {
      if (
        fs.existsSync(path.join(root, 'public', 'assets', 'patrons')) ||
        fs.existsSync(path.join(root, 'public'))
      ) {
        return root;
      }
    } catch {
      /* try next */
    }
  }
  return process.cwd();
}

export function publicPatronPackDir(
  repoRoot: string,
  characterId: string
): string {
  return path.join(
    resolveAppRoot(repoRoot),
    'public',
    'assets',
    'patrons',
    characterId
  );
}

export function listPatronPackPaths(
  repoRoot: string,
  characterId: string
): string[] {
  const dir = publicPatronPackDir(repoRoot, characterId);
  return JOIN_PACK_BASENAMES.map((name) => path.join(dir, name));
}

function isNonEmptyFile(p: string): boolean {
  try {
    if (!fs.existsSync(p)) return false;
    const st = fs.statSync(p);
    if (!st.isFile() || st.size <= 0) return false;
    const buf = Buffer.alloc(Math.min(120, st.size));
    const fd = fs.openSync(p, 'r');
    try {
      fs.readSync(fd, buf, 0, buf.length, 0);
    } finally {
      fs.closeSync(fd);
    }
    const asText = buf.toString('utf8');
    if (
      asText.includes('git-lfs') ||
      asText.startsWith('version https://git-lfs')
    ) {
      return false;
    }
    const isPng =
      buf.length >= 4 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47;
    return isPng && st.size >= 256;
  } catch {
    return false;
  }
}

/**
 * True when all four nested pack files exist as real non-empty PNGs.
 * Use for join/runtime ids only (not legacy flat Elder).
 */
export function isPatronPackReady(
  repoRoot: string,
  characterId: string
): boolean {
  if (
    !characterId ||
    characterId.includes('..') ||
    characterId.includes('/') ||
    characterId.includes('\\')
  ) {
    return false;
  }
  const root = resolveAppRoot(repoRoot);
  for (const p of listPatronPackPaths(root, characterId)) {
    if (!isNonEmptyFile(p)) return false;
  }
  return true;
}

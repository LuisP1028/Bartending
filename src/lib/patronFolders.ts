/**
 * Patron folders — TypeScript port of scripts/patron-pipeline/lib/patronFolder.mjs
 * (FS95 / RE95). Paths must match CLI layout.
 *
 * Public art: public/assets/patrons/{folderSlug}/
 * Staging:    scripts/patron-pipeline/staging/{folderSlug}/
 */

import fs from 'fs';
import path from 'path';

export type PatronFolderIdentity = {
  characterId: string;
  folderSlug?: string;
  displayName: string;
  contactHash: string;
  contactKind?: string;
};

export type PatronMeta = {
  version: number;
  characterId: string;
  folderSlug: string;
  displayName: string;
  contactHash: string;
  contactKind: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PatronFoldersResult = {
  publicDir: string;
  stagingDir: string;
  metaPath: string;
  meta: PatronMeta;
};

export function ensurePatronFolders(
  repoRoot: string,
  identity: PatronFolderIdentity,
  opts: { createStaging?: boolean; createPublic?: boolean } = {}
): PatronFoldersResult {
  const createStaging = opts.createStaging !== false;
  const createPublic = opts.createPublic !== false;
  const slug = identity.folderSlug || identity.characterId;

  const publicDir = path.join(repoRoot, 'public/assets/patrons', slug);
  const stagingDir = path.join(
    repoRoot,
    'scripts/patron-pipeline/staging',
    slug
  );

  if (createPublic) fs.mkdirSync(publicDir, { recursive: true });
  if (createStaging) fs.mkdirSync(stagingDir, { recursive: true });

  const metaPath = path.join(publicDir, 'meta.json');
  const meta: PatronMeta = {
    version: 1,
    characterId: identity.characterId,
    folderSlug: slug,
    displayName: identity.displayName,
    contactHash: identity.contactHash,
    contactKind: identity.contactKind || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (fs.existsSync(metaPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as Partial<PatronMeta>;
      meta.createdAt = prev.createdAt || meta.createdAt;
      meta.displayName = identity.displayName || prev.displayName || meta.displayName;
    } catch {
      /* replace */
    }
  }
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  if (createStaging) {
    fs.writeFileSync(
      path.join(stagingDir, 'meta.json'),
      JSON.stringify(meta, null, 2),
      'utf8'
    );
  }

  return { publicDir, stagingDir, metaPath, meta };
}

export function publicPatronDir(repoRoot: string, folderSlug: string): string {
  return path.join(repoRoot, 'public/assets/patrons', folderSlug);
}

export function stagingPatronDir(repoRoot: string, folderSlug: string): string {
  return path.join(repoRoot, 'scripts/patron-pipeline/staging', folderSlug);
}

/**
 * Ensure per-patron folder + meta.json (no raw email/phone in meta).
 *
 * Public art: public/assets/patrons/{folderSlug}/
 * Staging:    scripts/patron-pipeline/staging/{folderSlug}/
 */

import fs from 'fs';
import path from 'path';

/**
 * @param {string} repoRoot
 * @param {{
 *   characterId: string,
 *   folderSlug?: string,
 *   displayName: string,
 *   contactHash: string,
 *   contactKind?: string,
 * }} identity
 * @param {{ createStaging?: boolean, createPublic?: boolean }} [opts]
 */
export function ensurePatronFolders(repoRoot, identity, opts = {}) {
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
  const meta = {
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
      const prev = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      meta.createdAt = prev.createdAt || meta.createdAt;
      // preserve displayName updates
      meta.displayName = identity.displayName || prev.displayName;
    } catch {
      /* replace */
    }
  }
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  // staging copy of meta for operators
  if (createStaging) {
    fs.writeFileSync(
      path.join(stagingDir, 'meta.json'),
      JSON.stringify(meta, null, 2),
      'utf8'
    );
  }

  return { publicDir, stagingDir, metaPath, meta };
}

export function publicPatronDir(repoRoot, folderSlug) {
  return path.join(repoRoot, 'public/assets/patrons', folderSlug);
}

export function stagingPatronDir(repoRoot, folderSlug) {
  return path.join(repoRoot, 'scripts/patron-pipeline/staging', folderSlug);
}

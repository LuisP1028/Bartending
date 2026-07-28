/**
 * Mirrors src/data/patronAssetPaths.ts for the Node CLI.
 * Nested public: public/assets/patrons/{id}/sit.png
 * Legacy flat: public/assets/patrons/{id}_sit.png (elder, user)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** scripts/patron-pipeline/lib → repo root */
export const PIPELINE_REPO_ROOT = path.resolve(__dirname, '../../..');

export const PATRON_ASSETS_PUBLIC_BASE = '/assets/patrons/';
export const PUBLIC_DIR_REL = 'public/assets/patrons';
/** Legacy default (Elder / four-frame packs). */
export const DEFAULT_WALK_FRAME_COUNT = 4;
/** New skill-driven packs (map-012 / FS24): walk_01 + walk_02 only. */
export const DEFAULT_NEW_PACK_WALK_FRAME_COUNT = 2;

/** Skill folder names under scripts/patron-pipeline/skills/ */
export const PRODUCT_SKILL_NAMES = [
  'style',
  'headon',
  'profile',
  'sit',
  'talk',
  'walk',
  'walk2',
];

/** Operator walk mesh template filename (pose source of truth) */
export const WALK_TEMPLATE_FILENAME = 'walkframetemplate.jpg';

/** Operator sit mesh template filename (pose source of truth) */
export const SIT_TEMPLATE_FILENAME = 'sitframetemplate.jpg';

/**
 * Canonical mesh template dir under the pipeline package:
 *   scripts/patron-pipeline/mesh-templates/{sit|walk}/
 * @param {string} [repoRoot]
 */
export function meshTemplatesDir(repoRoot = PIPELINE_REPO_ROOT) {
  return path.join(repoRoot, 'scripts', 'patron-pipeline', 'mesh-templates');
}

/**
 * @param {string} [repoRoot]
 * @returns {string} absolute path to mesh-templates/walk/walkframetemplate.jpg
 */
export function walkTemplatePath(repoRoot = PIPELINE_REPO_ROOT) {
  return path.join(
    meshTemplatesDir(repoRoot),
    'walk',
    WALK_TEMPLATE_FILENAME
  );
}

/**
 * @param {string} [repoRoot]
 * @returns {string} absolute path to mesh-templates/sit/sitframetemplate.jpg
 */
export function sitTemplatePath(repoRoot = PIPELINE_REPO_ROOT) {
  return path.join(meshTemplatesDir(repoRoot), 'sit', SIT_TEMPLATE_FILENAME);
}

/**
 * Require template on disk (map-010: hard fail if missing).
 * @param {string} [repoRoot]
 * @returns {string} absolute path
 */
export function requireWalkTemplatePath(repoRoot = PIPELINE_REPO_ROOT) {
  const p = walkTemplatePath(repoRoot);
  if (!fs.existsSync(p) || fs.statSync(p).size <= 0) {
    const err = new Error(
      `Walk pose template missing or empty: ${p}. ` +
        `Place walkframetemplate.jpg under scripts/patron-pipeline/mesh-templates/walk/ ` +
        `(required for walk generation).`
    );
    err.code = 'WALK_TEMPLATE_MISSING';
    throw err;
  }
  return p;
}

/**
 * Require sit pose template on disk (map-011: hard fail if missing).
 * @param {string} [repoRoot]
 * @returns {string} absolute path
 */
export function requireSitTemplatePath(repoRoot = PIPELINE_REPO_ROOT) {
  const p = sitTemplatePath(repoRoot);
  if (!fs.existsSync(p) || fs.statSync(p).size <= 0) {
    const err = new Error(
      `Sit pose template missing or empty: ${p}. ` +
        `Place sitframetemplate.jpg under scripts/patron-pipeline/mesh-templates/sit/ ` +
        `(required for sit generation).`
    );
    err.code = 'SIT_TEMPLATE_MISSING';
    throw err;
  }
  return p;
}

/**
 * Repo-canonical skills tree (map-012 residency C).
 * @param {string} [repoRoot]
 */
export function skillsDir(repoRoot = PIPELINE_REPO_ROOT) {
  return path.join(repoRoot, 'scripts', 'patron-pipeline', 'skills');
}

/**
 * @param {string} [repoRoot]
 * @param {string} name skill short name e.g. "headon" → 8bit-headon/skill.md
 */
export function skillPath(repoRoot, name) {
  const root = repoRoot || PIPELINE_REPO_ROOT;
  return path.join(skillsDir(root), `8bit-${name}`, 'skill.md');
}

/**
 * Hard-fail if any product skill.md is missing.
 * @param {string} [repoRoot]
 * @returns {string[]} absolute paths to skill.md files
 */
export function requireProductSkills(repoRoot = PIPELINE_REPO_ROOT) {
  const missing = [];
  const paths = [];
  for (const name of PRODUCT_SKILL_NAMES) {
    const p = skillPath(repoRoot, name);
    if (!fs.existsSync(p) || fs.statSync(p).size <= 0) {
      missing.push(p);
    } else {
      paths.push(p);
    }
  }
  if (missing.length) {
    const err = new Error(
      `Product skills missing or empty:\n` +
        missing.map((m) => `  • ${m}`).join('\n')
    );
    err.code = 'SKILLS_MISSING';
    throw err;
  }
  return paths;
}

export const LEGACY_FLAT_PATRON_IDS = new Set(['patron_elder', 'patron_user']);

export function usesNestedPatronAssets(characterId) {
  return !LEGACY_FLAT_PATRON_IDS.has(characterId);
}

export function padWalkFrameIndex(i) {
  return String(i).padStart(2, '0');
}

export function walkFilename(characterId, frameIndex1Based) {
  const n = padWalkFrameIndex(frameIndex1Based);
  if (usesNestedPatronAssets(characterId)) {
    return path.join(characterId, `walk_${n}.png`);
  }
  return `${characterId}_walk_${n}.png`;
}

export function sitFilename(characterId) {
  if (usesNestedPatronAssets(characterId)) {
    return path.join(characterId, 'sit.png');
  }
  return `${characterId}_sit.png`;
}

export function talkFilename(characterId) {
  if (usesNestedPatronAssets(characterId)) {
    return path.join(characterId, 'talk.png');
  }
  return `${characterId}_talk.png`;
}

export function walkWebSrc(characterId, frameIndex1Based) {
  const n = padWalkFrameIndex(frameIndex1Based);
  if (usesNestedPatronAssets(characterId)) {
    return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}/walk_${n}.png`;
  }
  return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}_walk_${n}.png`;
}

export function sitWebSrc(characterId) {
  if (usesNestedPatronAssets(characterId)) {
    return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}/sit.png`;
  }
  return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}_sit.png`;
}

export function talkWebSrc(characterId) {
  if (usesNestedPatronAssets(characterId)) {
    return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}/talk.png`;
  }
  return `${PATRON_ASSETS_PUBLIC_BASE}${characterId}_talk.png`;
}

export function walkOutputPath(repoRoot, characterId, frameIndex1Based) {
  return path.join(
    repoRoot,
    PUBLIC_DIR_REL,
    walkFilename(characterId, frameIndex1Based)
  );
}

export function sitOutputPath(repoRoot, characterId) {
  return path.join(repoRoot, PUBLIC_DIR_REL, sitFilename(characterId));
}

export function talkOutputPath(repoRoot, characterId) {
  return path.join(repoRoot, PUBLIC_DIR_REL, talkFilename(characterId));
}

export function patronsDir(repoRoot) {
  return path.join(repoRoot, PUBLIC_DIR_REL);
}

/** Multi-stage staging filenames (inside staging/{id}/) — FS24 */
export const STAGING = {
  headOn: 'head_on.png',
  profile: 'profile.png',
  sit: 'sit.png',
  talk: 'talk.png',
  /** @deprecated legacy intermediate; not on product path */
  walkSheet: 'walk_sheet.png',
};

export function stagingWalkName(frameIndex1Based) {
  return `walk_${padWalkFrameIndex(frameIndex1Based)}.png`;
}

export function stagingSitName() {
  return STAGING.sit;
}

export function stagingTalkName() {
  return STAGING.talk;
}

export function stagingProfileName() {
  return STAGING.profile;
}

export function stagingHeadOnName() {
  return STAGING.headOn;
}

export function stagingWalkSheetName() {
  return STAGING.walkSheet;
}

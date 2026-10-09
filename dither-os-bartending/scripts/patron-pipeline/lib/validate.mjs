import fs from 'fs';
import path from 'path';

import {
  DEFAULT_NEW_PACK_WALK_FRAME_COUNT,
  DEFAULT_WALK_FRAME_COUNT,
  padWalkFrameIndex,
  requireProductSkills,
  skillsDir,
} from './paths.mjs';

const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const PLACEHOLDER_RE = /^USER_PROMPT_/i;

export function validateCharacterId(id) {
  if (id == null || typeof id !== 'string' || !id.trim()) {
    throw new Error('characterId is required (non-empty string)');
  }
  const trimmed = id.trim();
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error(`characterId must not contain path segments: ${id}`);
  }
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    throw new Error(
      `characterId must match [a-z0-9_]+ (got "${trimmed}"). Example: patron_joe`
    );
  }
  return trimmed;
}

export function validatePhoto(photoPath) {
  if (!photoPath || typeof photoPath !== 'string') {
    throw new Error('--photo path is required');
  }
  const resolved = path.resolve(photoPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Photo not found: ${resolved}`);
  }
  const st = fs.statSync(resolved);
  if (!st.isFile() || st.size <= 0) {
    throw new Error(`Photo must be a non-empty file: ${resolved}`);
  }
  const ext = path.extname(resolved).toLowerCase();
  if (!PHOTO_EXTS.has(ext)) {
    throw new Error(
      `Photo extension must be one of ${[...PHOTO_EXTS].join(', ')} (got ${ext})`
    );
  }
  return resolved;
}

/**
 * @deprecated map-012 / FS24: product path uses agent-executed skills (W3), not JSON compose.
 * Kept only for optional --legacy-json tooling if revived; do not call from product prepare/install/run.
 */
export function composePrompt(pack, rolePrompt) {
  const prefix = (pack.stylePrefix || '').trim();
  const suffix = (pack.styleSuffix || '').trim();
  const body = (rolePrompt || '').trim();
  return [prefix, body, suffix].filter(Boolean).join(' ').trim();
}

/**
 * Assert all product skill.md files exist under scripts/patron-pipeline/skills/.
 * @param {string} [repoRoot]
 */
export function assertSkillsPresent(repoRoot) {
  return requireProductSkills(repoRoot);
}

export function productSkillsRoot(repoRoot) {
  return skillsDir(repoRoot);
}

export { DEFAULT_NEW_PACK_WALK_FRAME_COUNT, DEFAULT_WALK_FRAME_COUNT };

function assertCutoutLanguage(label, text) {
  const lower = text.toLowerCase();
  const hasKey =
    text.includes('#FF00FF') ||
    text.includes('#ff00ff') ||
    text.includes('FF00FF') ||
    text.includes('ff00ff');
  const hasIsolation =
    lower.includes('isolated') ||
    lower.includes('magenta') ||
    lower.includes('no room');
  if (!hasKey || !hasIsolation) {
    throw new Error(
      `Strict mode: "${label}" must include isolation cue (isolated|magenta|no room) ` +
        `and key color #FF00FF (FS20 cutout prompts).`
    );
  }
}

function assertPrompt(label, text, strict) {
  if (text == null || String(text).trim() === '') {
    throw new Error(`Prompt pack missing non-empty "${label}"`);
  }
  const trimmed = String(text).trim();
  if (strict && PLACEHOLDER_RE.test(trimmed)) {
    throw new Error(
      `Strict mode: "${label}" is still a placeholder. Paste your real prompt.`
    );
  }
  return trimmed;
}

/**
 * @deprecated map-012 / FS24: JSON prompt pack is off the product path.
 * Do not call from product prepare/install/run.
 *
 * Load multi-stage (v2) prompt pack.
 * @param {string} packPath
 * @param {{ strict?: boolean }} [opts]
 */
export function loadAndValidatePromptPack(packPath, opts = {}) {
  const strict = Boolean(opts.strict);
  const resolved = path.resolve(packPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Prompt pack not found: ${resolved}`);
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (e) {
    throw new Error(`Invalid prompt pack JSON: ${e.message}`);
  }

  // Reject flat v1 pack (walk + sit peers)
  if (raw.walk && !raw.stages) {
    throw new Error(
      'Prompt pack looks like v1 (flat walk/sit). Upgrade to version 2 with stages: ' +
        'profile, sit, walkSheet, walkSplit. See scripts/patron-pipeline/prompts/patron-asset-prompts.json'
    );
  }

  if (!raw.stages || typeof raw.stages !== 'object') {
    throw new Error('Prompt pack requires "stages" object (version 2 multi-stage pipeline)');
  }

  const walkFrameCount = Math.max(
    1,
    Math.floor(raw.walkFrameCount ?? DEFAULT_WALK_FRAME_COUNT)
  );
  const s = raw.stages;

  const stylePrefix = raw.stylePrefix ?? '';
  const styleSuffix = raw.styleSuffix ?? '';

  // Strict cutout language may live in stylePrefix; validate composed text
  const check = (label, body) => {
    const trimmed = assertPrompt(label, body, strict);
    if (strict) {
      const composed = [stylePrefix, trimmed, styleSuffix]
        .filter(Boolean)
        .join(' ')
        .trim();
      assertCutoutLanguage(label + ' (composed)', composed);
    }
    return trimmed;
  };

  const profile = check('stages.profile', s.profile);
  const sit = check('stages.sit', s.sit);
  const talk = check(
    'stages.talk',
    s.talk ??
      'Keep sit identical; open mouth for talking. Isolated on #FF00FF.'
  );
  const walkSheet = check('stages.walkSheet', s.walkSheet);

  const splitIn =
    s.walkSplit && typeof s.walkSplit === 'object' ? s.walkSplit : {};
  const walkSplit = {};
  for (let i = 1; i <= walkFrameCount; i++) {
    const key = padWalkFrameIndex(i);
    walkSplit[key] = check(`stages.walkSplit["${key}"]`, splitIn[key]);
  }

  return {
    version: raw.version ?? 2,
    stylePrefix,
    styleSuffix,
    walkFrameCount,
    stages: {
      profile,
      sit,
      talk,
      walkSheet,
      walkSplit,
    },
    packPath: resolved,
  };
}

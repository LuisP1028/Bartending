/**
 * Load repo-root .env into process.env (does not override existing exports).
 * Applies project aliases so pipeline code and operator .env names both work.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

export function stripOuterQuotes(raw) {
  let val = String(raw ?? '').trim();
  while (
    val.length >= 2 &&
    ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'")))
  ) {
    val = val.slice(1, -1).trim();
  }
  return val;
}

/**
 * @param {string} [envPath]
 */
export function loadRepoEnv(envPath) {
  const candidates = [
    envPath,
    process.env.REPO_ROOT ? path.join(process.env.REPO_ROOT, '.env') : null,
    path.join(REPO_ROOT, '.env'),
    path.resolve(REPO_ROOT, '../.env'),
    path.resolve(REPO_ROOT, '../../.env'),
    path.resolve(REPO_ROOT, '../../../.env'),
    path.join(REPO_ROOT, '.env.local'),
    path.resolve(REPO_ROOT, '../../../.env.local'),
  ].filter((p) => Boolean(p) && fs.existsSync(p));

  let loaded = false;
  for (const candidate of candidates) {
    try {
      const text = fs.readFileSync(candidate, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = stripOuterQuotes(trimmed.slice(eq + 1));
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
      loaded = true;
    } catch {
      /* try next candidate */
    }
  }
  applyEnvAliases();
  return { loaded, paths: candidates, path: candidates[0] || envPath };
}

/**
 * Map operator .env names → names expected by clients / docs,
 * and strip outer single/double quotes from container-injected variables.
 * Never overwrite an already-set target with an alias.
 */
export function applyEnvAliases() {
  const keysToSanitize = [
    'XAIKEY',
    'XAI_KEY',
    'XAI_API_KEY',
    'HUGGINGFACE_TOKEN',
    'HF_TOKEN',
    'HUGGINGFACE_MODEL',
    'HF_IMAGE_MODEL',
    'HUGGINGFACE_VISION_TOKEN',
    'HF_VLM_TOKEN',
    'HUGGINGFACE_VISION_MODEL',
    'HF_VLM_MODEL',
    'POSTGRES_URL',
    'DATABASE_URL',
    'PGSSLMODE',
    'PII_ENCRYPTION_KEY',
    'GCS_BUCKET',
    'GCS_BUCKET_NAME',
    'GOOGLE_CLOUD_PROJECT',
    'GCS_PROJECT_ID',
    'GCS_CREDENTIALS_JSON',
    'GOOGLE_APPLICATION_CREDENTIALS',
  ];

  for (const key of keysToSanitize) {
    if (typeof process.env[key] === 'string') {
      const cleaned = stripOuterQuotes(process.env[key]);
      if (cleaned !== process.env[key]) {
        process.env[key] = cleaned;
      }
    }
  }

  const alias = (from, to) => {
    if (process.env[to] === undefined && process.env[from]) {
      process.env[to] = process.env[from];
    }
  };

  // Imagine (xAI)
  alias('XAIKEY', 'XAI_API_KEY');
  alias('XAI_KEY', 'XAI_API_KEY');

  // HF image provider (optional img2img path)
  alias('HUGGINGFACE_TOKEN', 'HF_TOKEN');
  alias('HUGGINGFACE_MODEL', 'HF_IMAGE_MODEL');

  // Walk-sheet VLM gate (canonical operator names → locked short names)
  alias('HUGGINGFACE_VISION_TOKEN', 'HF_VLM_TOKEN');
  alias('HUGGINGFACE_VISION_MODEL', 'HF_VLM_MODEL');
  // If only general HF token is set, allow VLM to reuse it
  if (!process.env.HF_VLM_TOKEN && process.env.HUGGINGFACE_VISION_TOKEN) {
    process.env.HF_VLM_TOKEN = process.env.HUGGINGFACE_VISION_TOKEN;
  }
  if (!process.env.HF_VLM_TOKEN && process.env.HF_TOKEN) {
    process.env.HF_VLM_TOKEN = process.env.HF_TOKEN;
  }
  if (!process.env.HF_VLM_TOKEN && process.env.HUGGINGFACE_TOKEN) {
    process.env.HF_VLM_TOKEN = process.env.HUGGINGFACE_TOKEN;
  }

  // PostgreSQL (FS106)
  alias('POSTGRES_URL', 'DATABASE_URL');
  if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
  }

  // Google Cloud Storage (FS106)
  alias('GCS_BUCKET', 'GCS_BUCKET_NAME');
  alias('GOOGLE_CLOUD_PROJECT', 'GCS_PROJECT_ID');
}

/**
 * Resolve VLM credentials after loadRepoEnv / applyEnvAliases.
 * Prefers HUGGINGFACE_VISION_* then HF_VLM_* then HF_TOKEN.
 */
export function resolveVlmEnv() {
  const token =
    process.env.HUGGINGFACE_VISION_TOKEN ||
    process.env.HF_VLM_TOKEN ||
    process.env.HF_TOKEN ||
    process.env.HUGGINGFACE_TOKEN ||
    '';
  const model =
    process.env.HUGGINGFACE_VISION_MODEL ||
    process.env.HF_VLM_MODEL ||
    '';
  return {
    token: token.trim(),
    model: model.trim(),
  };
}

/**
 * Load repo-root .env into process.env (does not override existing exports).
 * Applies project aliases so pipeline code and operator .env names both work.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * @param {string} [envPath]
 */
export function loadRepoEnv(envPath = path.join(REPO_ROOT, '.env')) {
  if (!fs.existsSync(envPath)) return { loaded: false, path: envPath };
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
  applyEnvAliases();
  return { loaded: true, path: envPath };
}

/**
 * Map operator .env names → names expected by clients / docs.
 * Never overwrite an already-set target.
 */
export function applyEnvAliases() {
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

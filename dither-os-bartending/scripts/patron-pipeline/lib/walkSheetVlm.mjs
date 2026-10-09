/**
 * Walk-sheet VLM hard gate (map-009 / map-010).
 * Compares generated walk_sheet.png to walkframetemplate.jpg (pose mesh) by default.
 * Provider: Hugging Face vision (HUGGINGFACE_VISION_MODEL + HUGGINGFACE_VISION_TOKEN).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { resolveVlmEnv } from './loadEnv.mjs';
import { walkTemplatePath } from './paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

/** @deprecated use DEFAULT_WALK_GAIT_BAR — alias kept for callers */
export const DEFAULT_WALKFRAMES_BAR = walkTemplatePath(REPO_ROOT);
/** Default VLM bar = operator walk mesh template (map-010) */
export const DEFAULT_WALK_GAIT_BAR = walkTemplatePath(REPO_ROOT);
export const HF_CHAT_COMPLETIONS_URL =
  'https://router.huggingface.co/v1/chat/completions';

const JUDGE_SYSTEM = `You are a strict game-animation QA judge for 4-frame walk cycles.
Score GAIT / POSE only relative to the walk mesh template.
Ignore art style differences (pixel vs silhouette, colors, clothing).
Ignore the template's black fill, tan background, yellow joints, and green bones — use only limb layout.
You must respond with a single JSON object and no other text.`;

const JUDGE_USER_TEXT = `Image 1 is the GENERATED walk sheet (candidate patron sprites).
Image 2 is the WALK MESH TEMPLATE (black silhouettes with skeleton overlay) — pose source of truth.
The template encodes TRUE ALTERNATING opposite strides (pose A vs pose B: one leg forward with opposite arm back, then the other leg forward with arms swapped). Consecutive template cells must not all be the same mid-stride.

Pass ONLY if ALL of the following are true for Image 1:
1. Exactly four full-body right-profile walk cells left-to-right.
2. Cell 1 limb pose matches template figure 1; cell 2 matches figure 2; cell 3 matches figure 3; cell 4 matches figure 4 (same leg/arm configuration, allowing pixel-art stylization).
3. True alternating walk across the set: consecutive cells alternate opposite strides (not four near-identical mid-strides).
4. Grounded: no jump, leap, airborne, high kick, dance, crossed-arms idle, or both feet off ground as action pose.
5. Same approximate character height and shared foot baseline across cells.
6. Full-body figures (not bust-only); character art is fine — do not require black silhouettes.

If unsure about any check, fail.

Respond with ONLY this JSON shape:
{"pass":true|false,"reasons":["short reason",...]}`;

/**
 * @param {string} imagePath
 * @returns {string} data URI
 */
function fileToDataUri(imagePath) {
  const buf = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.webp'
        ? 'image/webp'
        : ext === '.gif'
          ? 'image/gif'
          : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Parse model content into { pass, reasons }.
 * Unsure / unparseable → pass: false (map-009).
 * @param {string} raw
 */
export function parseJudgeJson(raw) {
  if (raw == null || String(raw).trim() === '') {
    return { pass: false, reasons: ['empty VLM response'], raw: '' };
  }
  let text = String(raw).trim();
  // Strip markdown fences if present
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // Extract first JSON object
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }
  try {
    const obj = JSON.parse(text);
    const pass = obj.pass === true;
    const reasons = Array.isArray(obj.reasons)
      ? obj.reasons.map(String)
      : obj.reason
        ? [String(obj.reason)]
        : pass
          ? []
          : ['no reasons provided'];
    return { pass, reasons, raw: String(raw) };
  } catch {
    return {
      pass: false,
      reasons: ['unparseable VLM JSON — treat as fail'],
      raw: String(raw),
    };
  }
}

/**
 * @param {{
 *   sheetPath: string,
 *   barPath?: string,
 *   model?: string,
 *   token?: string,
 *   endpoint?: string,
 * }} opts
 * @returns {Promise<{ pass: boolean, reasons: string[], model: string, raw?: string, error?: string }>}
 */
export async function judgeWalkSheet(opts) {
  const env = resolveVlmEnv();
  const token = (opts.token || env.token || '').trim();
  const model = (opts.model || env.model || '').trim();
  const barPath = opts.barPath || DEFAULT_WALK_GAIT_BAR;
  const endpoint = opts.endpoint || HF_CHAT_COMPLETIONS_URL;

  if (!token) {
    return {
      pass: false,
      reasons: [
        'HUGGINGFACE_VISION_TOKEN (or HF_VLM_TOKEN) missing — hard fail',
      ],
      model: model || '(none)',
      error: 'VLM_TOKEN_MISSING',
    };
  }
  if (!model) {
    return {
      pass: false,
      reasons: [
        'HUGGINGFACE_VISION_MODEL (or HF_VLM_MODEL) missing — hard fail',
      ],
      model: '(none)',
      error: 'VLM_MODEL_MISSING',
    };
  }
  if (!fs.existsSync(opts.sheetPath)) {
    return {
      pass: false,
      reasons: [`walk sheet not found: ${opts.sheetPath}`],
      model,
      error: 'SHEET_MISSING',
    };
  }
  if (!fs.existsSync(barPath)) {
    return {
      pass: false,
      reasons: [`gait bar not found: ${barPath}`],
      model,
      error: 'BAR_MISSING',
    };
  }

  const sheetUri = fileToDataUri(opts.sheetPath);
  const barUri = fileToDataUri(barPath);

  const body = {
    model,
    messages: [
      { role: 'system', content: JUDGE_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: JUDGE_USER_TEXT },
          {
            type: 'image_url',
            image_url: { url: sheetUri },
          },
          {
            type: 'image_url',
            image_url: { url: barUri },
          },
        ],
      },
    ],
    max_tokens: 400,
    temperature: 0,
  };

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      pass: false,
      reasons: [`VLM network error: ${e.message || e}`],
      model,
      error: 'VLM_NETWORK',
    };
  }

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      pass: false,
      reasons: [
        `VLM non-JSON HTTP ${res.status}: ${text.slice(0, 240)}`,
      ],
      model,
      error: 'VLM_HTTP',
      raw: text.slice(0, 500),
    };
  }

  if (!res.ok) {
    const msg =
      json.error?.message || json.message || text.slice(0, 300);
    return {
      pass: false,
      reasons: [`VLM HTTP ${res.status}: ${msg}`],
      model,
      error: 'VLM_HTTP',
      raw: text.slice(0, 500),
    };
  }

  const content =
    json.choices?.[0]?.message?.content ??
    json.choices?.[0]?.text ??
    json.generated_text ??
    '';
  const contentStr = Array.isArray(content)
    ? content.map((c) => (typeof c === 'string' ? c : c?.text || '')).join('')
    : String(content);

  const parsed = parseJudgeJson(contentStr);
  return {
    pass: parsed.pass,
    reasons: parsed.reasons,
    model,
    raw: parsed.raw?.slice?.(0, 800) || contentStr.slice(0, 800),
  };
}

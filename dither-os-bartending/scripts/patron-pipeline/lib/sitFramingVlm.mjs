/**
 * Sit framing VLM hard gate (map-011 / FS23).
 * Compares generated sit.png (center front head-on candidate) to sitframetemplate.jpg.
 * Provider: Hugging Face vision (same env as walk sheet VLM).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { resolveVlmEnv } from './loadEnv.mjs';
import { sitTemplatePath } from './paths.mjs';
import { parseJudgeJson } from './walkSheetVlm.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

export const DEFAULT_SIT_FRAMING_BAR = sitTemplatePath(REPO_ROOT);
export const HF_CHAT_COMPLETIONS_URL =
  'https://router.huggingface.co/v1/chat/completions';

const JUDGE_SYSTEM = `You are a strict game-character QA judge for seated bar bust framing.
Score FRAMING / POSE only relative to the sit mesh template.
Ignore art style differences (pixel vs silhouette, colors, clothing).
Ignore the template's black fill, tan background, yellow joints, and green bones — use only camera angle and pose layout.
You must respond with a single JSON object and no other text.`;

const JUDGE_USER_TEXT = `Image 1 is the GENERATED sit candidate (patron sprite that should be the bar seated guest).
Image 2 is the SIT MESH TEMPLATE (single black silhouette head-on seated bust with skeleton overlay) — pose/framing source of truth.

Pass ONLY if ALL of the following are true for Image 1:
1. Centered FRONT HEAD-ON facing the camera (not side profile, not three-quarter profile).
2. Seated bust framing: head through mid-torso (not full-body walk, not standing full figure).
3. Arms rest forward as if leaning on a bar (bar-lean pose); no requirement to draw a bar.
4. Pose/camera job matches the template's head-on seated bust (allowing pixel-art stylization and character clothing).
5. Character art is fine — do not require black silhouettes.

FAIL if Image 1 is primarily a side or three-quarter profile (same camera job as a profile bust).
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
 * @param {{
 *   sitPath: string,
 *   templatePath?: string,
 *   model?: string,
 *   token?: string,
 *   endpoint?: string,
 * }} opts
 * @returns {Promise<{ pass: boolean, reasons: string[], model: string, raw?: string, error?: string }>}
 */
export async function judgeSitFraming(opts) {
  const env = resolveVlmEnv();
  const token = (opts.token || env.token || '').trim();
  const model = (opts.model || env.model || '').trim();
  const templatePath = opts.templatePath || DEFAULT_SIT_FRAMING_BAR;
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
  if (!fs.existsSync(opts.sitPath)) {
    return {
      pass: false,
      reasons: [`sit candidate not found: ${opts.sitPath}`],
      model,
      error: 'SIT_MISSING',
    };
  }
  if (!fs.existsSync(templatePath)) {
    return {
      pass: false,
      reasons: [`sit template not found: ${templatePath}`],
      model,
      error: 'SIT_TEMPLATE_MISSING',
    };
  }

  const sitUri = fileToDataUri(opts.sitPath);
  const templateUri = fileToDataUri(templatePath);

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
            image_url: { url: sitUri },
          },
          {
            type: 'image_url',
            image_url: { url: templateUri },
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

/**
 * Imagine providers for automated patron pipeline.
 * - xai (default): POST https://api.x.ai/v1/images/edits  (XAI_API_KEY)
 * - hf: Hugging Face Inference API (HF_TOKEN + HF_IMAGE_MODEL)
 *
 * Multi-image: xAI supports up to 3 refs; pass imagePaths: [first, second, …]
 * (first image drives default aspect ratio).
 */

import fs from 'fs';
import path from 'path';

import { ensurePngFile } from './imageDecode.mjs';

export const DEFAULT_XAI_MODEL = 'grok-imagine-image-quality';
export const XAI_EDITS_URL = 'https://api.x.ai/v1/images/edits';

/**
 * @param {string} imagePath
 * @returns {string} data URI
 */
export function fileToDataUri(imagePath) {
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
 * Normalize opts to an ordered list of existing image paths.
 * @param {{ imagePath?: string, imagePaths?: string[] }} opts
 * @returns {string[]}
 */
export function resolveImagePaths(opts) {
  const list = [];
  if (Array.isArray(opts.imagePaths) && opts.imagePaths.length) {
    for (const p of opts.imagePaths) {
      if (p) list.push(p);
    }
  } else if (opts.imagePath) {
    list.push(opts.imagePath);
  }
  return list;
}

/**
 * xAI `image` field for images/edits:
 * - 1 ref: `{ url, type: "image_url" }` (proven working for profile/sit/talk)
 * - 2–3 refs: string[] of data URIs / URLs (API expects strings in the array,
 *   not maps — 422 "image[0]: invalid type: map, expected a string")
 * Order preserved (first image drives default aspect ratio).
 * @param {string[]} imagePaths
 */
function buildXaiImageField(imagePaths) {
  const uris = imagePaths.map((p) => fileToDataUri(p));
  if (uris.length === 1) {
    return { url: uris[0], type: 'image_url' };
  }
  return uris;
}

async function downloadToFile(url, outputPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image (${res.status}): ${url.slice(0, 80)}`);
  }
  const ab = await res.arrayBuffer();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(ab));
  return outputPath;
}

function writeBase64ToFile(b64, outputPath) {
  const raw = b64.replace(/^data:image\/\w+;base64,/, '');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(raw, 'base64'));
  return outputPath;
}

/**
 * xAI Imagine image edit (1–3 reference images).
 * @param {{ prompt: string, imagePath?: string, imagePaths?: string[], outputPath: string, model?: string }} opts
 */
export async function editImageXai(opts) {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    const err = new Error(
      'XAI_API_KEY missing. export XAI_API_KEY=... then re-run --run'
    );
    err.code = 'IMAGINE_API_NOT_CONFIGURED';
    throw err;
  }
  const model = opts.model || process.env.XAI_IMAGINE_MODEL || DEFAULT_XAI_MODEL;
  const paths = resolveImagePaths(opts);
  if (!paths.length) {
    throw new Error('editImageXai requires imagePath or imagePaths');
  }
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      throw new Error(`Reference image not found: ${p}`);
    }
  }
  if (paths.length > 3) {
    throw new Error('xAI images/edits supports at most 3 reference images');
  }

  const body = {
    model,
    prompt: opts.prompt,
    image: buildXaiImageField(paths),
    n: 1,
    response_format: 'b64_json',
  };

  const res = await fetch(XAI_EDITS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // 422 schema errors sometimes return plain text, not JSON
    const err = new Error(
      `xAI images/edits failed (${res.status}): ${text.slice(0, 400)}`
    );
    err.code = 'IMAGINE_HTTP';
    throw err;
  }

  if (!res.ok) {
    const msg =
      json.error?.message || json.message || text.slice(0, 400);
    const err = new Error(`xAI images/edits failed (${res.status}): ${msg}`);
    err.code = res.status === 401 || res.status === 403 ? 'IMAGINE_AUTH' : 'IMAGINE_HTTP';
    throw err;
  }

  const item = json.data?.[0] || json;
  let written = null;
  if (item.b64_json) {
    written = writeBase64ToFile(item.b64_json, opts.outputPath);
  } else if (item.url) {
    written = await downloadToFile(item.url, opts.outputPath);
  } else if (json.url) {
    written = await downloadToFile(json.url, opts.outputPath);
  } else {
    throw new Error(
      'xAI images/edits: no b64_json or url in response: ' +
        JSON.stringify(json).slice(0, 400)
    );
  }
  try {
    ensurePngFile(written);
  } catch (e) {
    console.warn(`  Warning: could not normalize to PNG: ${e.message}`);
  }
  return written;
}

/**
 * Hugging Face Inference API image-to-image / edit-style call.
 * Single primary image only (first path if multiple provided).
 * @param {{ prompt: string, imagePath?: string, imagePaths?: string[], outputPath: string, model?: string }} opts
 */
export async function editImageHf(opts) {
  const token = process.env.HF_TOKEN;
  const model = opts.model || process.env.HF_IMAGE_MODEL;
  if (!token) {
    const err = new Error('HF_TOKEN missing for --provider hf');
    err.code = 'IMAGINE_API_NOT_CONFIGURED';
    throw err;
  }
  if (!model) {
    const err = new Error(
      'HF_IMAGE_MODEL required when --provider hf (no default model). ' +
        'export HF_IMAGE_MODEL=org/model-id'
    );
    err.code = 'IMAGINE_API_NOT_CONFIGURED';
    throw err;
  }

  const paths = resolveImagePaths(opts);
  if (!paths.length) {
    throw new Error('editImageHf requires imagePath or imagePaths');
  }
  if (paths.length > 1) {
    console.warn(
      '  HF Imagine: multi-image not supported; using first image only ' +
        `(${path.basename(paths[0])})`
    );
  }
  const dataUri = fileToDataUri(paths[0]);
  const url = `https://router.huggingface.co/hf-inference/models/${model}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: dataUri,
      parameters: {
        prompt: opts.prompt,
      },
    }),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `HF inference failed (${res.status}) model=${model}: ${errText.slice(0, 400)}`
    );
  }

  fs.mkdirSync(path.dirname(opts.outputPath), { recursive: true });
  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (json.image || json.b64_json || json[0]?.image) {
      const b64 = json.b64_json || json.image || json[0]?.image;
      return writeBase64ToFile(b64, opts.outputPath);
    }
    throw new Error(
      'HF JSON response missing image: ' + JSON.stringify(json).slice(0, 300)
    );
  }

  const ab = await res.arrayBuffer();
  fs.writeFileSync(opts.outputPath, Buffer.from(ab));
  try {
    ensurePngFile(opts.outputPath);
  } catch (e) {
    console.warn(`  Warning: could not normalize HF output to PNG: ${e.message}`);
  }
  return opts.outputPath;
}

/**
 * Provider-agnostic edit.
 * @param {{
 *   prompt: string,
 *   imagePath?: string,
 *   imagePaths?: string[],
 *   outputPath?: string,
 *   provider?: 'xai'|'hf',
 *   model?: string
 * }} opts
 * @returns {Promise<string>} path written
 */
export async function editImage(opts) {
  const provider = (opts.provider || process.env.PATRON_IMAGINE_PROVIDER || 'xai')
    .toLowerCase();
  const paths = resolveImagePaths(opts);
  if (!opts.prompt || !paths.length) {
    throw new Error('editImage requires prompt and imagePath or imagePaths');
  }
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      throw new Error(`Reference image not found: ${p}`);
    }
  }

  const outputPath =
    opts.outputPath ||
    path.join(path.dirname(paths[0]), `.imagine-out-${Date.now()}.png`);

  const payload = { ...opts, imagePath: paths[0], imagePaths: paths, outputPath };

  if (provider === 'hf' || provider === 'huggingface') {
    return editImageHf(payload);
  }
  if (provider === 'xai' || provider === 'grok') {
    return editImageXai(payload);
  }
  throw new Error(`Unknown Imagine provider: ${provider} (use xai|hf)`);
}

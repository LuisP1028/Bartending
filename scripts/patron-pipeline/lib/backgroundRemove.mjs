/**
 * Product background removal via @imgly/background-removal-node (map-013 / FS25).
 * Soft imgly alpha is hardened to a binary matte (0 or 255) so sprites are not ghosted.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

import { PNG } from 'pngjs';
import { removeBackground } from '@imgly/background-removal-node';

/** Default: α >= T → 255 (figure), else → 0 (cut). Override: PATRON_BG_ALPHA_THRESHOLD */
export const DEFAULT_ALPHA_HARDEN_THRESHOLD = 128;

/**
 * Snap soft alpha to binary: 0 or 255. Keeps RGB; only mutates A.
 * @param {Buffer} pngBuf PNG buffer from imgly
 * @param {{ threshold?: number }} [opts]
 * @returns {Buffer} PNG buffer
 */
export function hardenAlphaPngBuffer(pngBuf, opts = {}) {
  if (!pngBuf || !Buffer.isBuffer(pngBuf) || pngBuf.length <= 0) {
    throw new Error('hardenAlphaPngBuffer requires a non-empty PNG Buffer');
  }
  const raw =
    opts.threshold != null
      ? opts.threshold
      : process.env.PATRON_BG_ALPHA_THRESHOLD != null
        ? Number(process.env.PATRON_BG_ALPHA_THRESHOLD)
        : DEFAULT_ALPHA_HARDEN_THRESHOLD;
  const T = Number.isFinite(raw)
    ? Math.max(1, Math.min(254, Math.floor(raw)))
    : DEFAULT_ALPHA_HARDEN_THRESHOLD;

  const png = PNG.sync.read(pngBuf);
  const { data } = png;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = data[i + 3] >= T ? 255 : 0;
  }
  return PNG.sync.write(png);
}

/**
 * @param {Buffer} buf
 * @param {{ model?: string, threshold?: number, harden?: boolean }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function removeBackgroundBuffer(buf, opts = {}) {
  if (!buf || !Buffer.isBuffer(buf) || buf.length <= 0) {
    throw new Error('removeBackgroundBuffer requires a non-empty Buffer');
  }
  const model = opts.model || process.env.PATRON_BG_MODEL || 'medium';
  const blob = await removeBackground(buf, {
    model,
    output: { format: 'image/png', quality: 0.9 },
  });
  const ab = await blob.arrayBuffer();
  let out = Buffer.from(ab);
  if (opts.harden !== false) {
    out = hardenAlphaPngBuffer(out, { threshold: opts.threshold });
  }
  return out;
}

/**
 * Remove background from an image file; write PNG with hardened alpha cutout.
 *
 * @param {string} inputPath absolute path to staging PNG/JPEG
 * @param {string} outputPath absolute path for RGBA PNG
 * @param {{ model?: 'small'|'medium'|'large', threshold?: number, harden?: boolean }} [opts]
 * @returns {Promise<{ outputPath: string, bytes: number }>}
 */
export async function removeBackgroundToFile(inputPath, outputPath, opts = {}) {
  const resolvedIn = path.resolve(inputPath);
  if (!fs.existsSync(resolvedIn)) {
    throw new Error(`Background removal input missing: ${resolvedIn}`);
  }
  const st = fs.statSync(resolvedIn);
  if (!st.isFile() || st.size <= 0) {
    throw new Error(`Background removal input empty: ${resolvedIn}`);
  }

  try {
    const src = pathToFileURL(resolvedIn).href;
    const model = opts.model || process.env.PATRON_BG_MODEL || 'medium';
    const blob = await removeBackground(src, {
      model,
      output: { format: 'image/png', quality: 0.9 },
    });
    const ab = await blob.arrayBuffer();
    let outBuf = Buffer.from(ab);
    if (outBuf.length <= 0) {
      throw new Error('imgly returned empty blob');
    }
    if (opts.harden !== false) {
      outBuf = hardenAlphaPngBuffer(outBuf, { threshold: opts.threshold });
    }
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, outBuf);
    const outSt = fs.statSync(outputPath);
    if (outSt.size <= 0) {
      throw new Error(`Background removal write empty: ${outputPath}`);
    }
    return { outputPath, bytes: outSt.size };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Background removal failed for ${resolvedIn}: ${msg}`);
  }
}

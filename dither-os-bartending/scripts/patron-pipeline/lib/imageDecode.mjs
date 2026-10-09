/**
 * Decode PNG or JPEG buffers to RGBA (Imagine output normalize / image tools).
 * Imagine often returns JPEG even when we save as .png.
 */

import fs from 'fs';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

/**
 * @param {Buffer} buf
 * @returns {'png'|'jpeg'|'webp'|'unknown'}
 */
export function sniffImageFormat(buf) {
  if (!buf || buf.length < 12) return 'unknown';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'png';
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpeg';
  }
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }
  return 'unknown';
}

/**
 * @param {Buffer} buf
 * @returns {{ width: number, height: number, data: Buffer }}
 *   data is length width*height*4 RGBA
 */
export function decodeToRgba(buf) {
  const kind = sniffImageFormat(buf);
  if (kind === 'png') {
    const src = PNG.sync.read(buf);
    // pngjs may return RGB without alpha depending on color type — normalize
    const { width, height, data } = src;
    if (data.length === width * height * 4) {
      return { width, height, data: Buffer.from(data) };
    }
    // unexpected stride — rebuild via PNG colorType path
    const out = Buffer.alloc(width * height * 4);
    // If 3 channels somehow
    if (data.length === width * height * 3) {
      for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
        out[j] = data[i];
        out[j + 1] = data[i + 1];
        out[j + 2] = data[i + 2];
        out[j + 3] = 255;
      }
      return { width, height, data: out };
    }
    return { width, height, data: Buffer.from(data) };
  }
  if (kind === 'jpeg') {
    const decoded = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
    return {
      width: decoded.width,
      height: decoded.height,
      data: Buffer.from(decoded.data),
    };
  }
  if (kind === 'webp') {
    throw new Error(
      'WebP Imagine output is not supported for cutout yet. ' +
        'Ask Imagine for PNG/JPEG or convert the file first.'
    );
  }
  throw new Error(
    `Unrecognised image format for cutout (not PNG/JPEG). ` +
      `First bytes: ${buf.slice(0, 8).toString('hex')}`
  );
}

/**
 * Ensure file at path is a real PNG on disk (convert JPEG → PNG if needed).
 * @param {string} filePath
 * @returns {string} same path
 */
export function ensurePngFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const kind = sniffImageFormat(buf);
  if (kind === 'png') return filePath;
  if (kind === 'jpeg') {
    const { width, height, data } = decodeToRgba(buf);
    const png = new PNG({ width, height, colorType: 6 });
    data.copy(png.data);
    fs.writeFileSync(filePath, PNG.sync.write(png));
    return filePath;
  }
  throw new Error(
    `Cannot convert ${kind} to PNG at ${filePath}`
  );
}

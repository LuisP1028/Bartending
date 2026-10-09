/**
 * Field-level encryption for patron PII (AES-256-GCM).
 * Key: env PII_ENCRYPTION_KEY as 32-byte base64 or 64-char hex.
 * Never log plaintext. Never use NEXT_PUBLIC_*.
 */

import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const VERSION = 1;

/**
 * @returns {Buffer} 32 bytes
 */
export function loadPiiKey() {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw || !String(raw).trim()) {
    const err = new Error(
      'PII_ENCRYPTION_KEY missing. Set a 32-byte key as base64 or 64-char hex.'
    );
    err.code = 'PII_KEY_MISSING';
    throw err;
  }
  const s = String(raw).trim();
  let key;
  if (/^[0-9a-fA-F]{64}$/.test(s)) {
    key = Buffer.from(s, 'hex');
  } else {
    key = Buffer.from(s, 'base64');
  }
  if (key.length !== 32) {
    const err = new Error(
      `PII_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). ` +
        'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
    err.code = 'PII_KEY_INVALID';
    throw err;
  }
  return key;
}

/**
 * Encrypt UTF-8 string → versioned base64 blob: v1:iv:tag:ciphertext (all b64)
 * @param {string} plaintext
 * @param {Buffer} [key]
 * @returns {string}
 */
export function encryptPiiField(plaintext, key = loadPiiKey()) {
  if (plaintext == null || plaintext === '') {
    return null;
  }
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    `v${VERSION}`,
    iv.toString('base64'),
    tag.toString('base64'),
    ct.toString('base64'),
  ].join(':');
}

/**
 * @param {string|null|undefined} blob
 * @param {Buffer} [key]
 * @returns {string|null}
 */
export function decryptPiiField(blob, key = loadPiiKey()) {
  if (blob == null || blob === '') return null;
  const parts = String(blob).split(':');
  if (parts.length !== 4 || !parts[0].startsWith('v')) {
    throw new Error('Invalid PII ciphertext format');
  }
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const ct = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
    'utf8'
  );
}

export function hasPiiKey() {
  try {
    loadPiiKey();
    return true;
  } catch {
    return false;
  }
}

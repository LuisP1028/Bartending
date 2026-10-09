import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export function loadPiiKey(): string {
  const raw = process.env.PII_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error('PII_ENCRYPTION_KEY environment variable is required for PII operations');
  }
  const buf = Buffer.from(raw, /^[0-9a-fA-F]{64}$/.test(raw) ? 'hex' : 'utf8');
  if (buf.length < KEY_LENGTH) {
    return crypto.createHash('sha256').update(buf).digest('hex');
  }
  return buf.subarray(0, KEY_LENGTH).toString('hex');
}

export function hasPiiKey(): boolean {
  return Boolean(process.env.PII_ENCRYPTION_KEY?.trim());
}

export function encryptPiiField(plainText: string, keyHex?: string): string {
  const key = Buffer.from(keyHex || loadPiiKey(), 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptPiiField(cipherPayload: string, keyHex?: string): string {
  const parts = cipherPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted field format; expected iv:tag:data');
  }
  const [ivHex, tagHex, dataHex] = parts;
  const key = Buffer.from(keyHex || loadPiiKey(), 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

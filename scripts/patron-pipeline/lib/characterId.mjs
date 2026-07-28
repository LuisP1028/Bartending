/**
 * Patron identity: stable hash from email/phone + folder slug from name + hash.
 *
 * characterId / folder name: {sanitizedName}_{hash16}  (a-z0-9_)
 * contactHash: 16-hex sha256 of normalized contact (no raw PII in filenames)
 */

import crypto from 'crypto';
import path from 'path';

export const IDENTITY_HASH_LEN = 16;

/**
 * Normalize contact for hashing (stable across sessions).
 * Prefers email if both provided.
 * @param {{ email?: string|null, phone?: string|null }} contact
 */
export function normalizeContact(contact = {}) {
  const email = contact.email != null ? String(contact.email).trim().toLowerCase() : '';
  let phone = contact.phone != null ? String(contact.phone).trim() : '';
  // keep digits and leading +
  if (phone) {
    const plus = phone.startsWith('+') ? '+' : '';
    phone = plus + phone.replace(/\D/g, '');
  }
  if (email) return { kind: 'email', value: email };
  if (phone) return { kind: 'phone', value: phone };
  return null;
}

/**
 * @param {string} emailOrPhone
 * @returns {string} 16-char hex
 */
export function contactHashFromString(emailOrPhone) {
  const normalized = String(emailOrPhone).trim().toLowerCase();
  if (!normalized) {
    throw new Error('emailOrPhone required for identity hash');
  }
  return crypto
    .createHash('sha256')
    .update(`patron-identity:v1:${normalized}`)
    .digest('hex')
    .slice(0, IDENTITY_HASH_LEN);
}

/**
 * @param {{ email?: string|null, phone?: string|null }} contact
 * @returns {{ kind: string, value: string, hash: string }}
 */
export function resolveContactIdentity(contact) {
  const n = normalizeContact(contact);
  if (!n) {
    throw new Error('email or phone is required');
  }
  const hash = contactHashFromString(n.value);
  return { ...n, hash };
}

/**
 * Sanitize display name for filesystem / characterId segment.
 * @param {string} name
 * @returns {string} non-empty [a-z0-9_]+
 */
export function sanitizePatronName(name) {
  let s = String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!s) s = 'patron';
  // keep short for paths
  if (s.length > 32) s = s.slice(0, 32).replace(/_$/g, '') || 'patron';
  return s;
}

/**
 * Folder + characterId: {sanitizedName}_{hash}
 * @param {string} displayName
 * @param {string} contactHash 16-hex
 */
export function buildPatronFolderSlug(displayName, contactHash) {
  const hash = String(contactHash).replace(/[^a-f0-9]/gi, '').slice(0, IDENTITY_HASH_LEN);
  if (hash.length < 8) {
    throw new Error('contactHash too short');
  }
  return `${sanitizePatronName(displayName)}_${hash.toLowerCase()}`;
}

/**
 * Full identity resolution for UI / API / --run.
 * @param {{ name: string, email?: string|null, phone?: string|null }} input
 */
export function resolvePatronIdentity(input) {
  const displayName = String(input.name || '').trim();
  if (!displayName) {
    throw new Error('name is required');
  }
  const contact = resolveContactIdentity({
    email: input.email,
    phone: input.phone,
  });
  const characterId = buildPatronFolderSlug(displayName, contact.hash);
  return {
    displayName,
    characterId,
    folderSlug: characterId,
    contactHash: contact.hash,
    contactKind: contact.kind,
    // never return raw email/phone in meta writers — caller has it if needed
  };
}

/** @deprecated use contactHashFromString / resolvePatronIdentity */
export function generateCharacterIdFromIdentity(emailOrPhone) {
  const hash = contactHashFromString(emailOrPhone);
  return `patron_${hash}`;
}

/**
 * Phase 1 fallback: unique id per run from photo path + time.
 */
export function generateCharacterIdFromPhotoRun(photoPath, opts = {}) {
  const abs = path.resolve(photoPath);
  const now = opts.now ?? Date.now();
  const entropy = crypto.randomBytes(4).toString('hex');
  const hex = crypto
    .createHash('sha256')
    .update(`patron-run:v1:${abs}:${now}:${entropy}`)
    .digest('hex')
    .slice(0, IDENTITY_HASH_LEN);
  return `patron_${hex}`;
}

/**
 * Resolve character id for --run.
 * Prefer identity (name + email/phone); else explicit; else photo-run hash.
 *
 * @param {{
 *   characterId?: string|null,
 *   name?: string|null,
 *   email?: string|null,
 *   phone?: string|null,
 *   photoPath?: string|null,
 * }} opts
 */
export function resolveRunCharacterId(opts = {}) {
  if (opts.name && (opts.email || opts.phone)) {
    return resolvePatronIdentity({
      name: opts.name,
      email: opts.email,
      phone: opts.phone,
    }).characterId;
  }
  if (opts.characterId != null && String(opts.characterId).trim() !== '') {
    return String(opts.characterId).trim();
  }
  if (opts.photoPath) {
    return generateCharacterIdFromPhotoRun(opts.photoPath);
  }
  throw new Error(
    'Provide --name with --email or --phone, or --character-id, or --photo for run id'
  );
}

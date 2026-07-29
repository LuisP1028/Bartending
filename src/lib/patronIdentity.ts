/**
 * Patron identity — TypeScript port of scripts/patron-pipeline/lib/characterId.mjs
 * (FS95 / RE95). Hash + slug algorithms must stay identical for CLI parity.
 */

import crypto from 'crypto';

export const IDENTITY_HASH_LEN = 16;

export type ContactInput = {
  email?: string | null;
  phone?: string | null;
};

export type NormalizedContact = {
  kind: 'email' | 'phone';
  value: string;
};

export type ContactIdentity = NormalizedContact & { hash: string };

export type PatronIdentity = {
  displayName: string;
  characterId: string;
  folderSlug: string;
  contactHash: string;
  contactKind: string;
};

/**
 * Normalize contact for hashing (stable across sessions).
 * Prefers email if both provided.
 */
export function normalizeContact(
  contact: ContactInput = {}
): NormalizedContact | null {
  const email =
    contact.email != null ? String(contact.email).trim().toLowerCase() : '';
  let phone = contact.phone != null ? String(contact.phone).trim() : '';
  if (phone) {
    const plus = phone.startsWith('+') ? '+' : '';
    phone = plus + phone.replace(/\D/g, '');
  }
  if (email) return { kind: 'email', value: email };
  if (phone) return { kind: 'phone', value: phone };
  return null;
}

/** 16-char hex sha256 of normalized contact. */
export function contactHashFromString(emailOrPhone: string): string {
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

export function resolveContactIdentity(contact: ContactInput): ContactIdentity {
  const n = normalizeContact(contact);
  if (!n) {
    throw new Error('email or phone is required');
  }
  const hash = contactHashFromString(n.value);
  return { ...n, hash };
}

/** Sanitize display name for filesystem / characterId segment. */
export function sanitizePatronName(name: string): string {
  let s = String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!s) s = 'patron';
  if (s.length > 32) s = s.slice(0, 32).replace(/_$/g, '') || 'patron';
  return s;
}

/** Folder + characterId: {sanitizedName}_{hash} */
export function buildPatronFolderSlug(
  displayName: string,
  contactHash: string
): string {
  const hash = String(contactHash)
    .replace(/[^a-f0-9]/gi, '')
    .slice(0, IDENTITY_HASH_LEN);
  if (hash.length < 8) {
    throw new Error('contactHash too short');
  }
  return `${sanitizePatronName(displayName)}_${hash.toLowerCase()}`;
}

/**
 * Full identity resolution for UI / API / --run.
 * Never returns raw email/phone — caller keeps those if needed.
 */
export function resolvePatronIdentity(input: {
  name: string;
  email?: string | null;
  phone?: string | null;
}): PatronIdentity {
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
  };
}

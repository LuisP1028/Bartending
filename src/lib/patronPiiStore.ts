import { query } from './db';
import { encryptPiiField, decryptPiiField, hasPiiKey, loadPiiKey } from './patronCrypto';

export interface PatronPiiInput {
  characterId: string;
  contactHash: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface PatronPiiRecord {
  id: number;
  characterId: string;
  contactHash: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function upsertPatronPiiDb(
  input: PatronPiiInput
): Promise<{ id: number; contactHash: string; characterId: string; inserted: boolean }> {
  if (!input.characterId || !input.contactHash || !input.name) {
    throw new Error('characterId, contactHash, and name are required for PII upsert');
  }
  if (!hasPiiKey()) {
    throw new Error('PII_ENCRYPTION_KEY missing; cannot encrypt patron PII');
  }

  const key = loadPiiKey();
  const nameEnc = encryptPiiField(input.name, key);
  const emailEnc = input.email ? encryptPiiField(input.email, key) : null;
  const phoneEnc = input.phone ? encryptPiiField(input.phone, key) : null;

  const existing = await query<{ id: number; character_id: string }>(
    'SELECT id, character_id FROM patron_pii WHERE contact_hash = $1',
    [input.contactHash]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    await query(
      `UPDATE patron_pii
       SET character_id = $1, name_enc = $2, email_enc = $3, phone_enc = $4, updated_at = NOW()
       WHERE contact_hash = $5`,
      [input.characterId, nameEnc, emailEnc, phoneEnc, input.contactHash]
    );
    return {
      id: row.id,
      contactHash: input.contactHash,
      characterId: input.characterId,
      inserted: false,
    };
  }

  const inserted = await query<{ id: number }>(
    `INSERT INTO patron_pii (character_id, contact_hash, name_enc, email_enc, phone_enc)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [input.characterId, input.contactHash, nameEnc, emailEnc, phoneEnc]
  );

  return {
    id: inserted.rows[0].id,
    contactHash: input.contactHash,
    characterId: input.characterId,
    inserted: true,
  };
}

export async function getPatronPiiByContactHashDb(
  contactHash: string
): Promise<PatronPiiRecord | null> {
  const res = await query<{
    id: number;
    character_id: string;
    contact_hash: string;
    name_enc: string;
    email_enc: string | null;
    phone_enc: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    'SELECT * FROM patron_pii WHERE contact_hash = $1',
    [contactHash]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  const key = loadPiiKey();

  return {
    id: row.id,
    characterId: row.character_id,
    contactHash: row.contact_hash,
    name: decryptPiiField(row.name_enc, key),
    email: row.email_enc ? decryptPiiField(row.email_enc, key) : null,
    phone: row.phone_enc ? decryptPiiField(row.phone_enc, key) : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

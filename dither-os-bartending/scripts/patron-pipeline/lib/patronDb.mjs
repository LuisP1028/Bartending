/**
 * Local-first SQLite store for encrypted patron PII.
 * Default path: data/patrons.sqlite (override PATRON_DB_PATH).
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

import { encryptPiiField, decryptPiiField, loadPiiKey, hasPiiKey } from './piiCrypto.mjs';

let _db = null;
let _dbPath = null;

export function defaultDbPath(repoRoot = process.cwd()) {
  if (process.env.PATRON_DB_PATH) {
    return path.resolve(process.env.PATRON_DB_PATH);
  }
  return path.join(repoRoot, 'data', 'patrons.sqlite');
}

/**
 * @param {string} [repoRoot]
 * @returns {import('better-sqlite3').Database}
 */
export function openPatronDb(repoRoot = process.cwd()) {
  const dbPath = defaultDbPath(repoRoot);
  if (_db && _dbPath === dbPath) return _db;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS patrons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id TEXT NOT NULL UNIQUE,
      contact_hash TEXT NOT NULL UNIQUE,
      name_enc TEXT NOT NULL,
      email_enc TEXT,
      phone_enc TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_patrons_contact_hash ON patrons(contact_hash);
  `);

  _db = db;
  _dbPath = dbPath;
  return db;
}

export function closePatronDb() {
  if (_db) {
    _db.close();
    _db = null;
    _dbPath = null;
  }
}

/**
 * Upsert encrypted PII. Requires PII_ENCRYPTION_KEY.
 *
 * @param {string} repoRoot
 * @param {{
 *   characterId: string,
 *   contactHash: string,
 *   name: string,
 *   email?: string|null,
 *   phone?: string|null,
 * }} row
 */
export function upsertPatronPii(repoRoot, row) {
  if (!row.characterId || !row.contactHash || !row.name) {
    throw new Error('characterId, contactHash, and name are required for PII upsert');
  }
  if (!row.email && !row.phone) {
    throw new Error('email or phone required for PII upsert');
  }

  const key = loadPiiKey();
  const now = new Date().toISOString();
  const nameEnc = encryptPiiField(row.name, key);
  const emailEnc = row.email ? encryptPiiField(row.email, key) : null;
  const phoneEnc = row.phone ? encryptPiiField(row.phone, key) : null;

  const db = openPatronDb(repoRoot);
  const existing = db
    .prepare('SELECT id, created_at FROM patrons WHERE contact_hash = ?')
    .get(row.contactHash);

  if (existing) {
    db.prepare(
      `UPDATE patrons SET
        character_id = ?,
        name_enc = ?,
        email_enc = ?,
        phone_enc = ?,
        updated_at = ?
       WHERE contact_hash = ?`
    ).run(
      row.characterId,
      nameEnc,
      emailEnc,
      phoneEnc,
      now,
      row.contactHash
    );
    return { id: existing.id, contactHash: row.contactHash, characterId: row.characterId, inserted: false };
  }

  const info = db
    .prepare(
      `INSERT INTO patrons (
        character_id, contact_hash, name_enc, email_enc, phone_enc, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.characterId,
      row.contactHash,
      nameEnc,
      emailEnc,
      phoneEnc,
      now,
      now
    );

  return {
    id: Number(info.lastInsertRowid),
    contactHash: row.contactHash,
    characterId: row.characterId,
    inserted: true,
  };
}

/**
 * Lookup by contact hash; decrypt for server-side use only. Never send to client by default.
 * @param {string} repoRoot
 * @param {string} contactHash
 */
export function getPatronPiiByContactHash(repoRoot, contactHash) {
  const db = openPatronDb(repoRoot);
  const row = db
    .prepare('SELECT * FROM patrons WHERE contact_hash = ?')
    .get(contactHash);
  if (!row) return null;
  return decryptPatronRow(row);
}

/**
 * @param {string} repoRoot
 * @param {string} characterId
 */
export function getPatronPiiByCharacterId(repoRoot, characterId) {
  const db = openPatronDb(repoRoot);
  const row = db
    .prepare('SELECT * FROM patrons WHERE character_id = ?')
    .get(characterId);
  if (!row) return null;
  return decryptPatronRow(row);
}

function decryptPatronRow(row) {
  const key = loadPiiKey();
  return {
    id: row.id,
    characterId: row.character_id,
    contactHash: row.contact_hash,
    name: decryptPiiField(row.name_enc, key),
    email: decryptPiiField(row.email_enc, key),
    phone: decryptPiiField(row.phone_enc, key),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Safe summary without decrypting secrets (for listings).
 */
export function listPatronPiiSummaries(repoRoot) {
  const db = openPatronDb(repoRoot);
  return db
    .prepare(
      `SELECT id, character_id AS characterId, contact_hash AS contactHash,
              created_at AS createdAt, updated_at AS updatedAt
       FROM patrons ORDER BY id`
    )
    .all();
}

export { hasPiiKey };

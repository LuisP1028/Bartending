---
ticket_id: "005"
title: "Secure PII Storage Migration & Deduplication Architecture"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-002.md"]
governing_specification: "functional_specification_106.md"
---

# Ticket 005: Secure PII Storage Migration & Deduplication Architecture

## Question
How does the system migrate encrypted patron contact data from local SQLite (`patrons.sqlite`) to the PostgreSQL `patron_pii` table, maintain AES-256-GCM field-level encryption with `PII_ENCRYPTION_KEY`, enforce deduplication rules via deterministic `contact_hash` keys, and strictly segregate player PII from public game APIs?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_106.md`
  - §Desired Functionality (2): "Secure Patron Contact Store (`patron_pii`): Player contact details (name, email, phone) provided during registration must be persistently recorded in an isolated `patron_pii` table linked by character identifier. Contact hashes must enforce deduplication rules while keeping sensitive personal information strictly segregated from public game APIs."
  - §Edge Cases & Behavioral Boundaries (4): "Duplicate Contact Registrations: Submitting a registration with previously used contact information must gracefully update or associate with the existing character record in accordance with identity deduplication rules."

## Codebase Audit & Technical Discrepancy Analysis

### 1. SQLite Storage in `patronDb.mjs`
- In `scripts/patron-pipeline/lib/patronDb.mjs` (L8–L52):
  - SQLite database is created at `data/patrons.sqlite` via `better-sqlite3`.
  - Schema defines table `patrons` with fields `character_id`, `contact_hash`, `name_enc`, `email_enc`, `phone_enc`.
- Local SQLite files are ephemeral on cloud runtimes and omitted from version control.
- In `src/app/api/patrons/register/route.ts` (L58–L64), PII storage on the API path is currently bypassed with note: `"PII store not wired on API path — folder + generate still proceed"`.

### 2. Encryption Primitives in `piiCrypto.mjs`
- `scripts/patron-pipeline/lib/piiCrypto.mjs` implements AES-256-GCM encryption using `crypto.createCipheriv` and `PII_ENCRYPTION_KEY`.
- The encryption logic is solid, but needs to be accessible from both TypeScript API routes (`src/lib/`) and Node.js pipeline scripts (`scripts/`).

## Architectural Decision & Solution Design

### 1. Relational Table Schema for Encrypted PII
- As established in Ticket 002, table `patron_pii` in PostgreSQL:
  ```sql
  CREATE TABLE IF NOT EXISTS patron_pii (
    id SERIAL PRIMARY KEY,
    character_id VARCHAR(255) NOT NULL,
    contact_hash VARCHAR(255) NOT NULL UNIQUE,
    name_enc TEXT NOT NULL,
    email_enc TEXT,
    phone_enc TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```

### 2. TypeScript PII Cryptographic Utility (`src/lib/patronCrypto.ts`)
- Port/mirror the AES-256-GCM cryptographic functions from `scripts/patron-pipeline/lib/piiCrypto.mjs` to `src/lib/patronCrypto.ts`:
  - `encryptPiiField(plainText: string, keyHex: string): string`
  - `decryptPiiField(cipherPayload: string, keyHex: string): string`
  - `loadPiiKey(): string`
  - `hasPiiKey(): boolean`
- Ensure uniform 32-byte key handling from `process.env.PII_ENCRYPTION_KEY`.

### 3. Deduplication Logic on Registration
- When player registers:
  1. Derive `contactHash` via `resolvePatronIdentity({ name, email, phone })`.
  2. In `patron_pii` store:
     - Check if `contact_hash` exists:
       - If exists: Update `character_id`, `name_enc`, `email_enc`, `phone_enc`, `updated_at = NOW()`.
       - If new: Insert new row into `patron_pii`.
  3. Return deduplication metadata `{ inserted: boolean, contactHash: string }` without leaking encrypted fields to the client.

### 4. Strict Public API Isolation
- Endpoints `GET /api/patrons/roster`, `GET /api/patrons/generate-status`, and all client-facing data structures MUST NOT include `patron_pii` fields.
- PII is accessible strictly through administrative or server-internal utilities requiring `PII_ENCRYPTION_KEY`.

## Precise Contract & Transformation Specifications

### 1. Database Store Functions (`src/lib/patronPiiStore.ts`)
```typescript
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
): Promise<{ id: number; contactHash: string; characterId: string; inserted: boolean }>;

export async function getPatronPiiByContactHashDb(
  contactHash: string
): Promise<PatronPiiRecord | null>;
```

### 2. Error & Security Guardrails
- If `PII_ENCRYPTION_KEY` is missing when attempting to store PII: Log a warning and fail fast or record `piiError` without exposing plain-text secrets.
- Encrypted payloads use format `ivHex:authTagHex:ciphertextHex`.

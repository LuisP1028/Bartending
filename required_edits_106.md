# RE106 — Master Component-to-Edit Matrix: Production Persistence Architecture (GCS Visual Asset Storage and PostgreSQL Patron Registry)

**Spec:** [functional_specification_106.md](./functional_specification_106.md)  
**Map:** [wayfinder/20261009T192221-847-fh8d/map.md](./wayfinder/20261009T192221-847-fh8d/map.md)  
**Tickets:**
- [Ticket 001: GCS Visual Asset Client, Autonomous Cloud Publishing & Direct Public URL Resolution](./wayfinder/20261009T192221-847-fh8d/tickets/ticket-001.md)
- [Ticket 002: PostgreSQL Managed Connection Pool, Lifecycle Governance & Database Schema Architecture](./wayfinder/20261009T192221-847-fh8d/tickets/ticket-002.md)
- [Ticket 003: Durable Job Telemetry & Asynchronous Lifecycle Tracking via PostgreSQL](./wayfinder/20261009T192221-847-fh8d/tickets/ticket-003.md)
- [Ticket 004: Relational Active Roster Management, Cloud Readiness Verification & Ghost Prevention](./wayfinder/20261009T192221-847-fh8d/tickets/ticket-004.md)
- [Ticket 005: Secure PII Storage Migration & Deduplication Architecture](./wayfinder/20261009T192221-847-fh8d/tickets/ticket-005.md)

---

## 1. System Layer Component Ownership Register

| Lifecycle / Architectural Responsibility | Primary Component & File Path | Supporting Modules & Data Definitions | Key Functions, Hooks & Data Structures |
| :--- | :--- | :--- | :--- |
| **Package Dependencies & Driver Registration** | `package.json` | `package-lock.json` | `@google-cloud/storage`, `pg`, `@types/pg` |
| **GCS Client & Autonomous Cloud Publishing** | `src/lib/gcsStorage.ts` | `scripts/patron-pipeline/lib/writeAssets.mjs` | `getGcsStorage()`, `getGcsBucket()`, `uploadPatronPackToGcs()`, `verifyGcsAssetExists()`, `buildGcsPublicUrl()` |
| **Managed PostgreSQL Pool & Relational Schemas** | `src/lib/db.ts` | `scripts/patron-pipeline/lib/loadEnv.mjs` | `getDbPool()`, `query()`, `ensureSchema()`, DDL for `patrons`, `generation_jobs`, `patron_pii` |
| **Relational Active Patron Roster Store** | `src/lib/runtimePatronStore.ts` | `src/app/api/patrons/roster/route.ts` | `readRuntimePatrons()`, `upsertRuntimePatron()`, `RuntimePatronRecord`, `PatronCloudAssets` |
| **Durable Asynchronous Job Telemetry** | `src/lib/runtimePatronStore.ts` | `src/app/api/patrons/generate-status/route.ts` | `insertGenerationJobDb()`, `getGenerationJobDb()`, `updateGenerationJobDb()`, `GenerationJobRecord` |
| **Cloud Ready-Pack Verification & Ghost Prevention** | `src/lib/patronPackReady.ts` | `src/app/api/patrons/register/route.ts` | `isPatronPackCloudReady()`, GCS object existence checks, atomic admission gating |
| **Encrypted Patron PII Store & Deduplication** | `src/lib/patronPiiStore.ts`<br>`src/lib/patronCrypto.ts` | `scripts/patron-pipeline/lib/patronDb.mjs` | `upsertPatronPiiDb()`, `encryptPiiField()`, `decryptPiiField()`, `contact_hash` unique constraint |
| **Pipeline Script Cloud Publishing & Registration** | `scripts/patron-pipeline/generate-patron-assets.mjs` | `scripts/patron-pipeline/lib/writeAssets.mjs` | `runFull()`, `installPackFromStagingDir()`, cloud upload invocation, database upsert |
| **Environment Variable Loading & Credential Aliases** | `scripts/patron-pipeline/lib/loadEnv.mjs` | `src/lib/runtimePatronStore.ts` | `loadRepoEnv()`, `applyEnvAliases()`, `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_CREDENTIALS_JSON`, `DATABASE_URL` |
| **Game Client Roster Consumption & Asset Rendering** | `src/app/api/patrons/roster/route.ts`<br>`src/components/PatronLayer.tsx` | `src/data/characters.ts`<br>`src/data/runtimePatrons.ts` | Direct HTTPS GCS URLs, `assetsOverride`, canvas/DOM rendering, stock fallback resilience |

---

## 2. Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `package.json` | L21–L28 (`dependencies`), L29–L42 (`devDependencies`) | `ticket-001.md`, `ticket-002.md` | Add GCS and PostgreSQL dependencies | Include `@google-cloud/storage` in `dependencies`, `pg` in `dependencies`, and `@types/pg` in `devDependencies`. |
| `src/lib/gcsStorage.ts` | New file | `ticket-001.md` | Core Google Cloud Storage client & publishing adapter | Implement `getGcsStorage()`, `getGcsBucket()`, `uploadPatronPackToGcs()`, `verifyGcsAssetExists()`, and `buildGcsPublicUrl()` with standard cache-control headers and public HTTPS URL resolution. |
| `src/lib/db.ts` | New file | `ticket-002.md` | Core PostgreSQL connection pool & schema bootstrap | Implement singleton `pg.Pool` with reconnect handling, connection lifecycle controls, query helper, and idempotent `ensureSchema()` DDL for `patrons`, `generation_jobs`, and `patron_pii`. |
| `src/lib/patronCrypto.ts` | New file | `ticket-005.md` | TypeScript AES-256-GCM cryptographic helper | Implement `encryptPiiField()`, `decryptPiiField()`, and `loadPiiKey()` for secure field-level contact encryption in Next.js server components. |
| `src/lib/patronPiiStore.ts` | New file | `ticket-005.md` | PostgreSQL PII repository & deduplication store | Implement `upsertPatronPiiDb()` and `getPatronPiiByContactHashDb()` with unique `contact_hash` deduplication and sensitive field isolation. |
| `src/lib/patronPackReady.ts` | L97–L114: `isPatronPackReady()` | `ticket-004.md` | Cloud ready-pack verification adapter | Add `isPatronPackCloudReady()` to verify all four sprite PNGs (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) exist in GCS and are non-empty; maintain local file fallback for offline/development environments. |
| `src/lib/runtimePatronStore.ts` | L12–L158: JSON file stores | `ticket-002.md`, `ticket-003.md`, `ticket-004.md` | Transition from disk JSON files to PostgreSQL queries | Replace `readRuntimePatronsRaw` / `writeRuntimePatronsList` with queries to `patrons` table; replace `writeGenerationJob` / `readGenerationJob` / `updateGenerationJob` with async queries to `generation_jobs`. |
| `src/app/api/patrons/register/route.ts` | L57–L65: PII wiring; L141–L156: job creation; L318–L368: exit handler | `ticket-001.md`, `ticket-003.md`, `ticket-004.md`, `ticket-005.md` | Durable DB job tracking, GCS upload, and PII storage | Insert initial job to PostgreSQL `generation_jobs`; persist encrypted PII to `patron_pii`; on pipeline success upload assets to GCS, verify cloud ready pack, and upsert to `patrons` table. |
| `src/app/api/patrons/generate-status/route.ts` | L15–L49: `GET` handler | `ticket-003.md` | Query job status from PostgreSQL | Fetch job record via `getGenerationJobDb(jobId)`; return structured JSON with stage progress, log tail, error, and cloud `sitSrc`. |
| `src/app/api/patrons/roster/route.ts` | L30–L70: `GET` handler | `ticket-004.md` | Relational patron querying & stock fallback | Query active ready patrons (`is_ready = TRUE AND is_active = TRUE`) from PostgreSQL; assemble direct GCS sprite URLs; merge with stock characters (`CHARACTERS`); return stock patrons gracefully if DB query fails. |
| `scripts/patron-pipeline/lib/writeAssets.mjs` | L71–L185: `installPackFromStagingDir` | `ticket-001.md` | Integrate cloud asset upload step | Invoke GCS upload for transparent sprite pack (`sit`, `talk`, `walk_01`, `walk_02`) and source image upon completion of background removal; return cloud URLs. |
| `scripts/patron-pipeline/generate-patron-assets.mjs` | L470–L547: `runFull` | `ticket-001.md`, `ticket-002.md`, `ticket-004.md` | Cloud publishing & DB upsert support | Receive GCS URLs from asset installer; verify ready pack in GCS; update PostgreSQL `patrons` record if database credentials are present. |
| `scripts/patron-pipeline/lib/loadEnv.mjs` | L58–L89: `applyEnvAliases()` | `ticket-001.md`, `ticket-002.md` | GCS and PostgreSQL environment variable aliases | Ensure `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_CREDENTIALS_JSON`, `DATABASE_URL`, and `POSTGRES_URL` are recognized and normalized across execution contexts. |

---

## 3. Detailed Step-by-Step Edit Instructions

### 1. `package.json`: Add Cloud Storage and PostgreSQL Dependencies (`ticket-001.md`, `ticket-002.md`)

- Add `@google-cloud/storage` and `pg` to `dependencies`:
  ```json
  "dependencies": {
    "@google-cloud/storage": "^7.15.0",
    "@imgly/background-removal-node": "^1.4.5",
    "better-sqlite3": "^12.11.1",
    "next": "16.2.9",
    "pg": "^8.13.1",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-liquid-glass-card": "^1.2.0"
  },
  ```
- Add `@types/pg` to `devDependencies`:
  ```json
  "devDependencies": {
    "@ai-hero/sandcastle": "^0.12.0",
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^20",
    "@types/pg": "^8.11.10",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "jpeg-js": "^0.4.4",
    "playwright": "^1.49.0",
    "pngjs": "^7.0.0",
    "typescript": "^5"
  }
  ```

---

### 2. `src/lib/gcsStorage.ts`: Google Cloud Storage Client & Publishing Adapter (`ticket-001.md`)

- Create `src/lib/gcsStorage.ts` implementing the following:
  ```typescript
  import { Storage, Bucket } from '@google-cloud/storage';
  import fs from 'fs';
  import path from 'path';

  let _storage: Storage | null = null;

  export function getGcsBucketName(): string {
    return process.env.GCS_BUCKET_NAME || 'bartending-patron-assets';
  }

  export function getGcsStorage(): Storage {
    if (_storage) return _storage;

    const projectId = process.env.GCS_PROJECT_ID || 'new-queries-492815';
    const credentialsJson = process.env.GCS_CREDENTIALS_JSON;
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (credentialsJson) {
      try {
        const credentials = JSON.parse(credentialsJson);
        _storage = new Storage({ projectId, credentials });
        return _storage;
      } catch (err) {
        throw new Error(`Failed to parse GCS_CREDENTIALS_JSON: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (keyFile && fs.existsSync(keyFile)) {
      _storage = new Storage({ projectId, keyFilename: keyFile });
      return _storage;
    }

    _storage = new Storage({ projectId });
    return _storage;
  }

  export function getGcsBucket(): Bucket {
    const storage = getGcsStorage();
    const bucketName = getGcsBucketName();
    return storage.bucket(bucketName);
  }

  export function buildGcsPublicUrl(bucketName: string, objectPath: string): string {
    const cleanPath = objectPath.startsWith('/') ? objectPath.slice(1) : objectPath;
    return `https://storage.googleapis.com/${bucketName}/${cleanPath}`;
  }

  export async function uploadFileToGcs(
    localFilePath: string,
    destinationPath: string,
    contentType: string = 'image/png'
  ): Promise<string> {
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Cannot upload to GCS: local file not found at ${localFilePath}`);
    }
    const stat = fs.statSync(localFilePath);
    if (stat.size <= 0) {
      throw new Error(`Cannot upload to GCS: local file is empty (0 bytes) at ${localFilePath}`);
    }

    const bucket = getGcsBucket();
    const cleanDest = destinationPath.startsWith('/') ? destinationPath.slice(1) : destinationPath;
    const file = bucket.file(cleanDest);

    await file.save(fs.readFileSync(localFilePath), {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
      },
      resumable: false,
    });

    return buildGcsPublicUrl(getGcsBucketName(), cleanDest);
  }

  export async function verifyGcsAssetExists(destinationPath: string): Promise<boolean> {
    try {
      const bucket = getGcsBucket();
      const cleanDest = destinationPath.startsWith('/') ? destinationPath.slice(1) : destinationPath;
      const file = bucket.file(cleanDest);
      const [exists] = await file.exists();
      if (!exists) return false;
      const [metadata] = await file.getMetadata();
      return Number(metadata.size || 0) >= 256;
    } catch {
      return false;
    }
  }

  export interface PatronCloudPackUrls {
    sitUrl: string;
    talkUrl: string;
    walk01Url: string;
    walk02Url: string;
    sourceUrl?: string;
  }

  export async function uploadPatronPackToGcs(
    characterId: string,
    localPaths: {
      sit: string;
      talk: string;
      walk_01: string;
      walk_02: string;
      source?: string;
    }
  ): Promise<PatronCloudPackUrls> {
    const sitUrl = await uploadFileToGcs(
      localPaths.sit,
      `patrons/${characterId}/sit.png`,
      'image/png'
    );
    const talkUrl = await uploadFileToGcs(
      localPaths.talk,
      `patrons/${characterId}/talk.png`,
      'image/png'
    );
    const walk01Url = await uploadFileToGcs(
      localPaths.walk_01,
      `patrons/${characterId}/walk_01.png`,
      'image/png'
    );
    const walk02Url = await uploadFileToGcs(
      localPaths.walk_02,
      `patrons/${characterId}/walk_02.png`,
      'image/png'
    );

    let sourceUrl: string | undefined = undefined;
    if (localPaths.source && fs.existsSync(localPaths.source)) {
      const ext = path.extname(localPaths.source).toLowerCase() || '.jpg';
      const cType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      sourceUrl = await uploadFileToGcs(
        localPaths.source,
        `patrons/${characterId}/source${ext}`,
        cType
      );
    }

    return {
      sitUrl,
      talkUrl,
      walk01Url,
      walk02Url,
      sourceUrl,
    };
  }
  ```

---

### 3. `src/lib/db.ts`: PostgreSQL Connection Pool & Schema Bootstrap (`ticket-002.md`)

- Create `src/lib/db.ts`:
  ```typescript
  import { Pool, QueryResult, QueryResultRow } from 'pg';

  let _pool: Pool | null = null;
  let _schemaEnsured = false;
  let _schemaPromise: Promise<void> | null = null;

  export function getDbPool(): Pool {
    if (_pool) return _pool;

    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    const isSslDisabled = process.env.PGSSLMODE === 'disable';

    if (connectionString) {
      _pool = new Pool({
        connectionString,
        ssl: isSslDisabled ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    } else {
      _pool = new Pool({
        host: process.env.PGHOST || '127.0.0.1',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'bartending',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }

    _pool.on('error', (err) => {
      console.error('[PostgreSQL] Unexpected error on idle client:', err);
    });

    return _pool;
  }

  export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    await ensureSchema();
    const pool = getDbPool();
    return pool.query<T>(text, params);
  }

  export async function ensureSchema(): Promise<void> {
    if (_schemaEnsured) return;
    if (_schemaPromise) return _schemaPromise;

    _schemaPromise = (async () => {
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS patrons (
            id VARCHAR(255) PRIMARY KEY,
            display_name VARCHAR(255) NOT NULL,
            personality VARCHAR(255) NOT NULL,
            walk_frame_count INT NOT NULL DEFAULT 2,
            walk_frame_ms INT NOT NULL DEFAULT 120,
            sit_url TEXT NOT NULL,
            talk_url TEXT NOT NULL,
            walk_01_url TEXT NOT NULL,
            walk_02_url TEXT NOT NULL,
            source_url TEXT,
            is_ready BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_patrons_active_ready ON patrons(is_active, is_ready);
          CREATE INDEX IF NOT EXISTS idx_patrons_created_at ON patrons(created_at);

          CREATE TABLE IF NOT EXISTS generation_jobs (
            job_id VARCHAR(255) PRIMARY KEY,
            character_id VARCHAR(255) NOT NULL,
            display_name VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL,
            current_stage VARCHAR(100),
            stage_index INT,
            total_stages INT,
            progress_pct INT,
            status_message TEXT,
            error TEXT,
            log_tail TEXT,
            photo_path TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_generation_jobs_character_id ON generation_jobs(character_id);
          CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);

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

          CREATE INDEX IF NOT EXISTS idx_patron_pii_contact_hash ON patron_pii(contact_hash);
          CREATE INDEX IF NOT EXISTS idx_patron_pii_character_id ON patron_pii(character_id);
        `);
        _schemaEnsured = true;
      } finally {
        client.release();
      }
    })();

    return _schemaPromise;
  }
  ```

---

### 4. `src/lib/patronCrypto.ts`: AES-256-GCM Encryption (`ticket-005.md`)

- Create `src/lib/patronCrypto.ts` providing cryptographic encryption/decryption:
  ```typescript
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
  ```

---

### 5. `src/lib/patronPiiStore.ts`: PostgreSQL PII Repository (`ticket-005.md`)

- Create `src/lib/patronPiiStore.ts`:
  ```typescript
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
  ```

---

### 6. `src/lib/patronPackReady.ts`: Cloud Ready-Pack Verification (`ticket-004.md`)

- Add `isPatronPackCloudReady()` to `src/lib/patronPackReady.ts`:
  ```typescript
  import { verifyGcsAssetExists } from '@/lib/gcsStorage';

  export async function isPatronPackCloudReady(characterId: string): Promise<boolean> {
    if (!characterId || characterId.includes('..') || characterId.includes('/')) {
      return false;
    }

    const requiredAssets = [
      `patrons/${characterId}/sit.png`,
      `patrons/${characterId}/talk.png`,
      `patrons/${characterId}/walk_01.png`,
      `patrons/${characterId}/walk_02.png`,
    ];

    try {
      const results = await Promise.all(
        requiredAssets.map((assetPath) => verifyGcsAssetExists(assetPath))
      );
      return results.every((exists) => exists === true);
    } catch {
      return false;
    }
  }
  ```

---

### 7. `src/lib/runtimePatronStore.ts`: PostgreSQL State Integration (`ticket-002.md`, `ticket-003.md`, `ticket-004.md`)

- Refactor `src/lib/runtimePatronStore.ts`:
  ```typescript
  import { query } from './db';
  import { isPatronPackCloudReady } from './patronPackReady';

  export interface RuntimePatronRecord {
    id: string;
    displayName: string;
    personality: string;
    walkFrameCount: number;
    walkFrameMs: number;
    sitUrl: string;
    talkUrl: string;
    walk01Url: string;
    walk02Url: string;
    sourceUrl?: string;
    isReady: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export type GenerationJobStatus = 'queued' | 'running' | 'done' | 'failed';

  export interface GenerationJobRecord {
    jobId: string;
    characterId: string;
    displayName: string;
    status: GenerationJobStatus;
    currentStage?: string;
    stageIndex?: number;
    totalStages?: number;
    progressPct?: number;
    statusMessage?: string;
    error?: string;
    logTail?: string;
    photoPath?: string;
    createdAt: string;
    updatedAt: string;
  }

  export async function readRuntimePatronsDb(): Promise<RuntimePatronRecord[]> {
    const res = await query<{
      id: string;
      display_name: string;
      personality: string;
      walk_frame_count: number;
      walk_frame_ms: number;
      sit_url: string;
      talk_url: string;
      walk_01_url: string;
      walk_02_url: string;
      source_url: string | null;
      is_ready: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM patrons
       WHERE is_ready = TRUE AND is_active = TRUE
       ORDER BY created_at ASC`
    );

    return res.rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      personality: row.personality,
      walkFrameCount: row.walk_frame_count,
      walkFrameMs: row.walk_frame_ms,
      sitUrl: row.sit_url,
      talkUrl: row.talk_url,
      walk01Url: row.walk_01_url,
      walk02Url: row.walk_02_url,
      sourceUrl: row.source_url ?? undefined,
      isReady: row.is_ready,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  export async function upsertRuntimePatronDb(record: {
    id: string;
    displayName: string;
    personality: string;
    walkFrameCount?: number;
    walkFrameMs?: number;
    sitUrl: string;
    talkUrl: string;
    walk01Url: string;
    walk02Url: string;
    sourceUrl?: string;
  }): Promise<void> {
    const cloudReady = await isPatronPackCloudReady(record.id);
    if (!cloudReady) {
      throw new Error(`Cannot upsert patron "${record.id}": ready pack missing in GCS`);
    }

    await query(
      `INSERT INTO patrons (
        id, display_name, personality, walk_frame_count, walk_frame_ms,
        sit_url, talk_url, walk_01_url, walk_02_url, source_url, is_ready, is_active, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, TRUE, NOW())
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        personality = EXCLUDED.personality,
        walk_frame_count = EXCLUDED.walk_frame_count,
        walk_frame_ms = EXCLUDED.walk_frame_ms,
        sit_url = EXCLUDED.sit_url,
        talk_url = EXCLUDED.talk_url,
        walk_01_url = EXCLUDED.walk_01_url,
        walk_02_url = EXCLUDED.walk_02_url,
        source_url = EXCLUDED.source_url,
        is_ready = TRUE,
        is_active = TRUE,
        updated_at = NOW()`,
      [
        record.id,
        record.displayName,
        record.personality,
        record.walkFrameCount ?? 2,
        record.walkFrameMs ?? 120,
        record.sitUrl,
        record.talkUrl,
        record.walk01Url,
        record.walk02Url,
        record.sourceUrl || null,
      ]
    );
  }

  export async function writeGenerationJobDb(job: GenerationJobRecord): Promise<void> {
    await query(
      `INSERT INTO generation_jobs (
        job_id, character_id, display_name, status,
        current_stage, stage_index, total_stages, progress_pct,
        status_message, error, log_tail, photo_path, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (job_id) DO UPDATE SET
        status = EXCLUDED.status,
        current_stage = EXCLUDED.current_stage,
        stage_index = EXCLUDED.stage_index,
        total_stages = EXCLUDED.total_stages,
        progress_pct = EXCLUDED.progress_pct,
        status_message = EXCLUDED.status_message,
        error = EXCLUDED.error,
        log_tail = EXCLUDED.log_tail,
        updated_at = NOW()`,
      [
        job.jobId,
        job.characterId,
        job.displayName,
        job.status,
        job.currentStage || null,
        job.stageIndex ?? null,
        job.totalStages ?? null,
        job.progressPct ?? null,
        job.statusMessage || null,
        job.error || null,
        job.logTail || null,
        job.photoPath || null,
        job.createdAt,
        job.updatedAt,
      ]
    );
  }

  export async function readGenerationJobDb(jobId: string): Promise<GenerationJobRecord | null> {
    const res = await query<{
      job_id: string;
      character_id: string;
      display_name: string;
      status: GenerationJobStatus;
      current_stage: string | null;
      stage_index: number | null;
      total_stages: number | null;
      progress_pct: number | null;
      status_message: string | null;
      error: string | null;
      log_tail: string | null;
      photo_path: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      'SELECT * FROM generation_jobs WHERE job_id = $1',
      [jobId]
    );

    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      jobId: r.job_id,
      characterId: r.character_id,
      displayName: r.display_name,
      status: r.status,
      currentStage: r.current_stage ?? undefined,
      stageIndex: r.stage_index ?? undefined,
      totalStages: r.total_stages ?? undefined,
      progressPct: r.progress_pct ?? undefined,
      statusMessage: r.status_message ?? undefined,
      error: r.error ?? undefined,
      logTail: r.log_tail ?? undefined,
      photoPath: r.photo_path ?? undefined,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    };
  }

  export async function updateGenerationJobDb(
    jobId: string,
    patch: Partial<GenerationJobRecord>
  ): Promise<GenerationJobRecord | null> {
    const cur = await readGenerationJobDb(jobId);
    if (!cur) return null;
    const next: GenerationJobRecord = {
      ...cur,
      ...patch,
      jobId,
      updatedAt: new Date().toISOString(),
    };
    await writeGenerationJobDb(next);
    return next;
  }
  ```

---

### 8. `src/app/api/patrons/generate-status/route.ts`: PostgreSQL Polling Route (`ticket-003.md`)

- Update `src/app/api/patrons/generate-status/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { readGenerationJobDb } from '@/lib/runtimePatronStore';
  import { buildGcsPublicUrl, getGcsBucketName } from '@/lib/gcsStorage';

  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';

  export async function GET(req: Request) {
    try {
      const url = new URL(req.url);
      const jobId = url.searchParams.get('jobId')?.trim();
      if (!jobId) {
        return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
      }

      const job = await readGenerationJobDb(jobId);
      if (!job) {
        return NextResponse.json({ error: 'job not found' }, { status: 404 });
      }

      const bucket = getGcsBucketName();
      const sitSrc =
        job.status === 'done'
          ? buildGcsPublicUrl(bucket, `patrons/${job.characterId}/sit.png`)
          : null;

      return NextResponse.json({
        ok: true,
        jobId: job.jobId,
        characterId: job.characterId,
        displayName: job.displayName,
        status: job.status,
        currentStage: job.currentStage ?? null,
        stageIndex: job.stageIndex ?? null,
        totalStages: job.totalStages ?? null,
        progressPct: job.progressPct ?? null,
        statusMessage: job.statusMessage ?? null,
        error: job.error ?? null,
        logTail: job.logTail ?? null,
        sitSrc,
        updatedAt: job.updatedAt,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  ```

---

### 9. `src/app/api/patrons/roster/route.ts`: Relational Roster & Built-In Stock Fallback (`ticket-004.md`)

- Update `src/app/api/patrons/roster/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server';
  import { CHARACTERS, buildCharacterDef, type CharacterDef } from '@/data/characters';
  import { readRuntimePatronsDb } from '@/lib/runtimePatronStore';

  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';

  export async function GET() {
    const builtIns = Object.values(CHARACTERS);

    try {
      const runtimeRows = await readRuntimePatronsDb();
      const extras: CharacterDef[] = runtimeRows
        .filter((r) => !CHARACTERS[r.id])
        .map((r) =>
          buildCharacterDef({
            id: r.id,
            displayName: r.displayName,
            personality: r.personality,
            walkFrameCount: r.walkFrameCount || 2,
            walkFrameMs: r.walkFrameMs || 120,
            assetsOverride: {
              sitSrc: r.sitUrl,
              talkSrc: r.talkUrl,
              walkFrames: [r.walk01Url, r.walk02Url],
            },
          })
        );

      const characters = [...builtIns, ...extras];

      return NextResponse.json({
        ok: true,
        storage: 'gcs-postgres',
        characters: characters.map((c) => ({
          id: c.id,
          displayName: c.displayName,
          personality: c.personality,
          walkFrameCount: c.assets.walkFrames.length,
          walkFrameMs: c.assets.walkFrameMs,
          sitSrc: c.assets.sitSrc,
          walkFrames: c.assets.walkFrames,
          talkSrc: c.assets.talkSrc ?? null,
        })),
        runtimeCount: extras.length,
      });
    } catch (dbError: unknown) {
      console.error('[roster] PostgreSQL query failed, activating stock patron resilience fallback:', dbError);
      return NextResponse.json({
        ok: true,
        storage: 'stock-fallback',
        fallback: true,
        characters: builtIns.map((c) => ({
          id: c.id,
          displayName: c.displayName,
          personality: c.personality,
          walkFrameCount: c.assets.walkFrames.length,
          walkFrameMs: c.assets.walkFrameMs,
          sitSrc: c.assets.sitSrc,
          walkFrames: c.assets.walkFrames,
          talkSrc: c.assets.talkSrc ?? null,
        })),
        runtimeCount: 0,
      });
    }
  }
  ```

---

### 10. `src/app/api/patrons/register/route.ts`: Cloud Publishing & Database Integration (`ticket-001.md`, `ticket-003.md`, `ticket-004.md`, `ticket-005.md`)

- In `src/app/api/patrons/register/route.ts`:
  1. **Persist Contact PII:**
     ```typescript
     let piiResult: { inserted: boolean; contactHash: string } | null = null;
     let piiError: string | null = null;
     if (hasPiiKey()) {
       try {
         piiResult = await upsertPatronPiiDb({
           characterId: identity.characterId,
           contactHash: identity.contactHash,
           name,
           email,
           phone,
         });
       } catch (err) {
         piiError = err instanceof Error ? err.message : String(err);
         console.warn('[register] PII storage warning:', piiError);
       }
     } else {
       piiError = 'PII_ENCRYPTION_KEY not set — contact record not persisted';
     }
     ```
  2. **Create Initial Job in PostgreSQL:**
     ```typescript
     await writeGenerationJobDb(job);
     ```
  3. **Stream Progress Telemetry to PostgreSQL:**
     In `handleOutput`, debounce and await `updateGenerationJobDb(jobId, patch)`.
  4. **Post-Processing Cloud Upload & Readiness Gating in `child.on('close')`:**
     ```typescript
     child.on('close', async (code) => {
       clearInterval(watchdogTimer);
       if (code === 0) {
         try {
           const stagingDir = folders.stagingDir;
           const ext = photoPath?.endsWith('.png') ? '.png' : photoPath?.endsWith('.webp') ? '.webp' : '.jpg';
           const cloudUrls = await uploadPatronPackToGcs(identity.characterId, {
             sit: path.join(stagingDir, 'sit.nobg.png'),
             talk: path.join(stagingDir, 'talk.nobg.png'),
             walk_01: path.join(stagingDir, 'walk_01.nobg.png'),
             walk_02: path.join(stagingDir, 'walk_02.nobg.png'),
             source: photoPath || undefined,
           });

           await upsertRuntimePatronDb({
             id: identity.characterId,
             displayName: identity.displayName,
             personality: `${identity.characterId.replace(/^patron_/, '').replace(/[^a-z0-9]+/gi, '_')}_friendly`,
             walkFrameCount: 2,
             walkFrameMs: 120,
             sitUrl: cloudUrls.sitUrl,
             talkUrl: cloudUrls.talkUrl,
             walk01Url: cloudUrls.walk01Url,
             walk02Url: cloudUrls.walk02Url,
             sourceUrl: cloudUrls.sourceUrl,
           });

           await updateGenerationJobDb(jobId, {
             status: 'done',
             currentStage: 'done',
             stageIndex: 8,
             totalStages: 8,
             progressPct: 100,
             statusMessage: `Assets published to GCS. Patron ${identity.displayName} admitted to database roster.`,
             logTail: logBuf,
           });
         } catch (e: unknown) {
           const msg = e instanceof Error ? e.message : String(e);
           await updateGenerationJobDb(jobId, {
             status: 'failed',
             error: `Cloud upload / database persistence failed: ${msg}`,
             logTail: logBuf,
           });
         }
       } else {
         await updateGenerationJobDb(jobId, {
           status: 'failed',
           error: `Pipeline exited with code ${code}`,
           logTail: logBuf,
         });
       }
     });
     ```

---

### 11. `scripts/patron-pipeline/lib/writeAssets.mjs` & `generate-patron-assets.mjs` (`ticket-001.md`)

- In `scripts/patron-pipeline/lib/writeAssets.mjs`:
  - Retain local `.nobg.png` staging outputs.
  - Add cloud publishing helper or delegate to `src/lib/gcsStorage` when GCS credentials exist in environment.
- In `scripts/patron-pipeline/lib/loadEnv.mjs`:
  - Register `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_CREDENTIALS_JSON`, `DATABASE_URL`, and `POSTGRES_URL` in `applyEnvAliases()`.

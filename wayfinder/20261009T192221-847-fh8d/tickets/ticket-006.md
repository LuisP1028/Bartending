---
ticket_id: "006"
title: "FS106 Production Persistence Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol"
type: task
status: resolved
claimed_by: "wayfinder-test-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md", "ticket-004.md", "ticket-005.md"]
governing_specification: "functional_specification_106.md"
---

# Ticket 006: FS106 Production Persistence Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol

## Question
What deterministic integration test decisions, authentic codebase schemas, admissible observed payloads, and specification oracles govern the verification of the modified persistence components (`package.json`, `src/lib/db.ts`, `src/lib/gcsStorage.ts`, `src/lib/patronCrypto.ts`, `src/lib/patronPackReady.ts`, `src/lib/patronPiiStore.ts`, `src/lib/runtimePatronStore.ts`, `src/app/api/patrons/generate-status/route.ts`, `src/app/api/patrons/register/route.ts`, `src/app/api/patrons/roster/route.ts`, `scripts/patron-pipeline/generate-patron-assets.mjs`, `scripts/patron-pipeline/lib/gcsStorage.mjs`, `scripts/patron-pipeline/lib/loadEnv.mjs`, `scripts/patron-pipeline/lib/writeAssets.mjs`) to guarantee that all generated patron visual assets reside in Google Cloud Storage (`gs://bartending-patron-assets`), active rosters and asynchronous job lifecycles reside in PostgreSQL, sensitive PII is encrypted and deduplicated, ghost patrons are strictly prevented via cloud readiness gates, and immutable stock patrons remain resiliently available under `INV-PAYLOAD-01` and `INV-ASSERTION-01` without synthesizing test fixtures or writing executable test code?

---

## Context & Specification Grounding

- **Governing Specification:** `functional_specification_106.md` (FS106 — Production persistence architecture: GCS visual asset storage and PostgreSQL patron registry)
  - §Purpose: "Establish required product `{functionality}` for durable, production-grade persistence across the 'Join the bar!' patron pipeline, transitioning all generated character assets to Google Cloud Storage (GCS) and all relational game state, roster data, and job tracking to a PostgreSQL database. This eliminates the limitation where patron visual assets, runtime rosters, and registration records reside exclusively on the host server's local ephemeral filesystem, enabling permanent character retention across server restarts, container rebuilds, and machine migrations."
  - §Current Baseline & Observed `{errors}`:
    - Local Filesystem Confinement: Staging artifacts and ready-pack PNGs confined to `public/assets/patrons/` and `scripts/patron-pipeline/staging/`; active rosters in `data/runtime-patrons.json`; job metadata in `data/generation-jobs/*.json`.
    - Ephemeral Data Loss: Restarting servers or rebuilding containers destroys local filesystem state, reverting the game to stock characters.
    - Bandwidth Bottlenecks: Serving full-resolution sprite animations directly from disk creates network bottlenecks for mobile clients.
  - §Desired Functionality:
    1. Permanent Cloud Asset Storage in GCS: Autonomous cloud publishing to bucket `bartending-patron-assets`, direct public HTTPS accessibility, CORS configuration, standard cache-control headers (`public, max-age=31536000, immutable`).
    2. Relational PostgreSQL State Persistence: Central relational database maintaining active patron roster (`patrons`), asynchronous generation job tracking (`generation_jobs`), and encrypted PII store (`patron_pii`).
    3. Atomicity & Ghost Patron Prevention: A patron record in `patrons` must never be flagged as ready or active (`is_ready = true`) until all four ready-pack assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) are verified to exist in GCS and are publicly readable. Failed cloud uploads set terminal `failed` state with zero ghosts admitted.
    4. Machine Migration & Remote Parity: Application state independent of the physical host machine; mobile clients over HTTPS load cloud-hosted sprite assets seamlessly.
    5. Built-in Fallback Resilience: Immutable stock patrons (Elder, Caesar, Trump) preserved even during database latency or transient cloud storage degradation.
  - §Acceptance Criteria:
    - **AC1** (Cloud Sprite Publishing): Newly generated patron assets uploaded to and served from GCS bucket `bartending-patron-assets`.
    - **AC2** (PostgreSQL Roster Querying): Live bar simulation queries active patrons from PostgreSQL, correctly displaying both stock and cloud-persisted patrons.
    - **AC3** (Durable Job Tracking): In-game registration jobs tracked in PostgreSQL; status polling returns accurate real-time states and logs until completion or failure.
    - **AC4** (Host Restart & Migration Persistence): Restarting Next.js server, clearing local scratch directories, or launching on a new host preserves all created patrons without data loss.
    - **AC5** (Strict Cloud Readiness Gate): Patrons admitted to active spawn roster only after all four required sprite PNGs are confirmed readable in GCS; failed jobs create zero ghost patrons.
    - **AC6** (Mobile Remote Parity): Mobile clients accessing application over HTTPS load cloud-hosted sprite assets seamlessly, successfully rendering walk cycles and bar seating.
- **Upstream Manifest Context:**
  - `handoff/20261009T192221-847-fh8d/wayfinder-read-and-plan.txt`
  - `handoff/20261009T192221-847-fh8d/implementer.txt`
  - `handoff/20261009T192221-847-fh8d/reviewer.txt`
- **Predecessor Decision Tickets:**
  - [Ticket 001: GCS Visual Asset Client, Autonomous Cloud Publishing & Direct Public URL Resolution](./ticket-001.md)
  - [Ticket 002: PostgreSQL Managed Connection Pool, Lifecycle Governance & Database Schema Architecture](./ticket-002.md)
  - [Ticket 003: Durable Job Telemetry & Asynchronous Lifecycle Tracking via PostgreSQL](./ticket-003.md)
  - [Ticket 004: Relational Active Roster Management, Cloud Readiness Verification & Ghost Prevention](./ticket-004.md)
  - [Ticket 005: Secure PII Storage Migration & Deduplication Architecture](./ticket-005.md)

---

## Architectural Decisions to Lock

### 1. Ground-Truth Codebase Interface & Schema Definition (Zero Mocks)
The integration test interfaces for verifying the FS106 production persistence implementation are grounded strictly in authentic TypeScript types, database schemas, GCS storage contracts, and HTTP endpoints without synthetic wrappers or mock layers:

#### A. PostgreSQL Relational Database Schema (`src/lib/db.ts`)
```sql
-- Active Patron Roster Table (patrons)
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

-- Asynchronous Generation Jobs Table (generation_jobs)
CREATE TABLE IF NOT EXISTS generation_jobs (
  job_id VARCHAR(255) PRIMARY KEY,
  character_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'queued' | 'running' | 'done' | 'failed'
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

-- Encrypted Patron Contact PII Table (patron_pii)
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

#### B. Google Cloud Storage Adapter Contract (`src/lib/gcsStorage.ts`)
```typescript
export interface PatronCloudPackUrls {
  sitUrl: string;
  talkUrl: string;
  walk01Url: string;
  walk02Url: string;
  sourceUrl?: string;
}

export function getGcsBucketName(): string;
export function getGcsStorage(): Storage;
export function getGcsBucket(): Bucket;
export function buildGcsPublicUrl(bucketName: string, objectPath: string): string;
export async function uploadFileToGcs(localFilePath: string, destinationPath: string, contentType?: string): Promise<string>;
export async function verifyGcsAssetExists(destinationPath: string): Promise<boolean>;
export async function uploadPatronPackToGcs(characterId: string, localPaths: { sit: string; talk: string; walk_01: string; walk_02: string; source?: string }): Promise<PatronCloudPackUrls>;
```

#### C. Database-Backed Runtime Store Contracts (`src/lib/runtimePatronStore.ts`)
```typescript
export interface RuntimePatronRecord {
  id: string;
  displayName: string;
  personality: string;
  walkFrameCount: number;
  walkFrameMs: number;
  sitUrl?: string;
  talkUrl?: string;
  walk01Url?: string;
  walk02Url?: string;
  sourceUrl?: string;
  isReady?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  createdAt: string;
  updatedAt: string;
  photoPath?: string;
}

export async function readRuntimePatronsDb(): Promise<RuntimePatronRecord[]>;
export async function upsertRuntimePatronDb(record: { id: string; displayName: string; personality: string; walkFrameCount?: number; walkFrameMs?: number; sitUrl: string; talkUrl: string; walk01Url: string; walk02Url: string; sourceUrl?: string }): Promise<void>;
export async function writeGenerationJobDb(job: GenerationJobRecord): Promise<void>;
export async function readGenerationJobDb(jobId: string): Promise<GenerationJobRecord | null>;
export async function updateGenerationJobDb(jobId: string, patch: Partial<GenerationJobRecord>): Promise<GenerationJobRecord | null>;
```

#### D. Cloud Readiness Verification Contract (`src/lib/patronPackReady.ts`)
```typescript
export async function isPatronPackCloudReady(characterId: string): Promise<boolean>;
```

#### E. Encrypted PII Store Contract (`src/lib/patronPiiStore.ts` & `src/lib/patronCrypto.ts`)
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

export async function upsertPatronPiiDb(input: PatronPiiInput): Promise<{ id: number; contactHash: string; characterId: string; inserted: boolean }>;
export async function getPatronPiiByContactHashDb(contactHash: string): Promise<PatronPiiRecord | null>;
export function encryptPiiField(plainText: string, keyHex?: string): string; // returns iv:tag:cipher in hex
export function decryptPiiField(cipherPayload: string, keyHex?: string): string;
```

#### F. Server Route Endpoint Contracts
- `POST /api/patrons/register`:
  - Multipart form data: `name`, `email`, `phone`, `photo`, `runPipeline`
  - HTTP 200 Response:
    ```typescript
    {
      ok: true,
      characterId: string,
      displayName: string,
      contactHash: string,
      registered: { inserted: boolean },
      walkFrameCount: 2,
      pii: { inserted: boolean, contactHash: string } | null,
      piiError: string | null,
      jobId: string | null,
      status: 'running' | 'registered',
      pipeline: { ok: true, mode: 'run-async' } | null,
      generationNote: string,
      sitSrc: string,
      storage: 'gcs-postgres'
    }
    ```
- `GET /api/patrons/generate-status?jobId=...`:
  - HTTP 200 Response:
    ```typescript
    {
      ok: true,
      jobId: string,
      characterId: string,
      displayName: string,
      status: 'queued' | 'running' | 'done' | 'failed',
      currentStage: string | null,
      stageIndex: number | null,
      totalStages: number | null,
      progressPct: number | null,
      statusMessage: string | null,
      error: string | null,
      logTail: string | null,
      sitSrc: string | null,
      updatedAt: string
    }
    ```
- `GET /api/patrons/roster`:
  - HTTP 200 Response (Standard Postgres + GCS):
    ```typescript
    {
      ok: true,
      storage: 'gcs-postgres',
      characters: Array<{
        id: string,
        displayName: string,
        personality: string,
        walkFrameCount: number,
        walkFrameMs: number,
        sitSrc: string,
        walkFrames: string[],
        talkSrc: string | null
      }>,
      runtimeCount: number
    }
    ```
  - HTTP 200 Response (Stock Patron Resilience Fallback):
    ```typescript
    {
      ok: true,
      storage: 'stock-fallback',
      fallback: true,
      characters: Array<{
        id: string,
        displayName: string,
        personality: string,
        walkFrameCount: number,
        walkFrameMs: number,
        sitSrc: string,
        walkFrames: string[],
        talkSrc: string | null
      }>,
      runtimeCount: 0
    }
    ```

---

### 2. Admissible Observed Payloads Register (`INV-PAYLOAD-01`)
Under `INV-PAYLOAD-01`, test inputs must derive exclusively from real observed system objects, authentic image binaries, actual SQL row records, and real HTTP requests. Synthetic JSON fixtures, stand-in placeholders, and renamed fields are strictly forbidden:

1. `PAYLOAD-IMG-JPEG-VALID`: Authentic binary buffer $\ge 256$ bytes with JPEG magic bytes `0xFF, 0xD8, 0xFF`.
2. `PAYLOAD-IMG-PNG-VALID`: Authentic binary buffer $\ge 256$ bytes with PNG magic bytes `0x89, 0x50, 0x4E, 0x47`.
3. `PAYLOAD-IMG-WEBP-VALID`: Authentic binary buffer $\ge 256$ bytes with RIFF/WEBP header `0x52, 0x49, 0x46, 0x46 ... 0x57, 0x45, 0x42, 0x50`.
4. `PAYLOAD-FORM-VALID-RUN`: `FormData` instance with:
   - `name`: `"Maya"`
   - `email`: `"maya@example.com"`
   - `photo`: `File` with `PAYLOAD-IMG-JPEG-VALID`
   - `runPipeline`: `"1"`
5. `PAYLOAD-FORM-VALID-NO-RUN`: `FormData` instance with:
   - `name`: `"Maya"`
   - `email`: `"maya@example.com"`
   - `photo`: `File` with `PAYLOAD-IMG-JPEG-VALID`
   - `runPipeline`: `"0"`
6. `PAYLOAD-FORM-MISSING-NAME`: `FormData` instance with `name: ""` and `email: "test@example.com"`.
7. `PAYLOAD-FORM-MISSING-CONTACT`: `FormData` instance with `name: "Maya"`, `email: ""`, `phone: ""`.
8. `PAYLOAD-FORM-MISSING-PHOTO`: `FormData` instance with `name: "Maya"`, `email: "test@example.com"`, `runPipeline: "1"`, photo omitted.
9. `PAYLOAD-GCS-READYPACK-COMPLETE`: 4 uploaded cloud objects under `patrons/${characterId}/`:
   - `sit.png` (PNG $\ge 256$ bytes)
   - `talk.png` (PNG $\ge 256$ bytes)
   - `walk_01.png` (PNG $\ge 256$ bytes)
   - `walk_02.png` (PNG $\ge 256$ bytes)
10. `PAYLOAD-GCS-READYPACK-INCOMPLETE`: GCS directory under `patrons/${characterId}/` where `sit.png` is absent or 0 bytes.
11. `PAYLOAD-DB-PATRON-ROW`: Row in PostgreSQL `patrons` table with:
    - `id`: `"patron_maya_test1"`
    - `display_name`: `"Maya"`
    - `personality`: `"maya_friendly"`
    - `walk_frame_count`: `2`
    - `walk_frame_ms`: `120`
    - `sit_url`: `"https://storage.googleapis.com/bartending-patron-assets/patrons/patron_maya_test1/sit.png"`
    - `talk_url`: `"https://storage.googleapis.com/bartending-patron-assets/patrons/patron_maya_test1/talk.png"`
    - `walk_01_url`: `"https://storage.googleapis.com/bartending-patron-assets/patrons/patron_maya_test1/walk_01.png"`
    - `walk_02_url`: `"https://storage.googleapis.com/bartending-patron-assets/patrons/patron_maya_test1/walk_02.png"`
    - `source_url`: `"https://storage.googleapis.com/bartending-patron-assets/patrons/patron_maya_test1/source.jpg"`
    - `is_ready`: `true`
    - `is_active`: `true`
12. `PAYLOAD-DB-JOB-ROW`: Row in PostgreSQL `generation_jobs` table with:
    - `job_id`: `"e6b72a6b-968b-4f96-857e-e28a5ff6640c"`
    - `character_id`: `"patron_maya_test1"`
    - `display_name`: `"Maya"`
    - `status`: `"running"`
    - `current_stage`: `"bg_removal"`
    - `stage_index`: `7`
    - `total_stages`: `8`
    - `progress_pct`: `87`
    - `status_message`: `"Processing transparent sprites (7/8)..."`
    - `error`: `null`
    - `log_tail`: `"=== Install (imgly background removal) ==="`

---

## Discrete Integration Test Decisions

### Decision 1: Verification of GCS Client & Cloud Upload Adapter (`src/lib/gcsStorage.ts`)
- **Governing Requirement:** AC1 (Cloud Sprite Publishing)
- **Component:** `src/lib/gcsStorage.ts`, `uploadFileToGcs`, `uploadPatronPackToGcs`, `verifyGcsAssetExists`
- **Schema Grounding:** `PatronCloudPackUrls`, `@google-cloud/storage` `Storage` & `Bucket`
- **Admissible Input:** `PAYLOAD-IMG-PNG-VALID` at local temporary files for `sit`, `talk`, `walk_01`, `walk_02`
- **Correct Required Outputs:**
  - Standard public HTTPS URL strings matching `https://storage.googleapis.com/${bucketName}/patrons/${characterId}/${fileName}`
  - GCS metadata includes `cacheControl: 'public, max-age=31536000, immutable'` and correct `contentType: 'image/png'`
  - `verifyGcsAssetExists` returns `true` for uploaded objects $\ge 256$ bytes
- **Explicit Error States:**
  - Non-existent local file throws `Error("Cannot upload to GCS: local file not found at ...")`
  - Empty (0-byte) local file throws `Error("Cannot upload to GCS: local file is empty (0 bytes) at ...")`
  - Malformed credentials throws `Error("Failed to parse GCS_CREDENTIALS_JSON: ...")`

### Decision 2: Verification of PostgreSQL Managed Connection Pool & Idempotent Schema Bootstrap (`src/lib/db.ts`)
- **Governing Requirement:** AC2, AC4, Edge Case 2
- **Component:** `src/lib/db.ts`, `getDbPool`, `ensureSchema`, `query`, `checkDatabaseHealth`
- **Schema Grounding:** `pg.Pool`, `QueryResult`, DDL for `patrons`, `generation_jobs`, `patron_pii`
- **Admissible Input:** Connection credentials from `DATABASE_URL` or standard PG parameters (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`)
- **Correct Required Outputs:**
  - Connection pool initialized with `max: 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`
  - Error handler attached to pool (`pool.on('error', ...)`) preventing unhandled process termination on idle client drop
  - Idempotent execution of `ensureSchema()`: executes `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` without throwing errors on repeated invocations
  - `checkDatabaseHealth()` returns `true` when database is responsive
- **Explicit Error States:**
  - Unreachable host or invalid password causes `query()` to reject with explicit database connection error without crashing the server process.

### Decision 3: Verification of Durable Generation Job Tracking & Status Polling (`src/lib/runtimePatronStore.ts`, `src/app/api/patrons/generate-status/route.ts`)
- **Governing Requirement:** AC3 (Durable Job Tracking)
- **Component:** `writeGenerationJobDb`, `readGenerationJobDb`, `updateGenerationJobDb`, `GET /api/patrons/generate-status`
- **Schema Grounding:** `GenerationJobRecord`, `GET /api/patrons/generate-status?jobId=...` response contract
- **Admissible Input:** Valid `GenerationJobRecord` instance inserted into `generation_jobs`
- **Correct Required Outputs:**
  - `GET /api/patrons/generate-status?jobId=${jobId}` queries PostgreSQL table `generation_jobs`
  - Returns HTTP 200 with `{ ok: true, jobId, characterId, displayName, status, currentStage, stageIndex, totalStages, progressPct, statusMessage, error, logTail, sitSrc, updatedAt }`
  - When `status === 'done'`, `sitSrc` resolves to the permanent GCS URL `https://storage.googleapis.com/.../sit.png`
  - When `status !== 'done'`, `sitSrc` is `null`
- **Explicit Error States:**
  - Query missing `jobId` parameter returns HTTP 400 `{ error: 'jobId is required' }`
  - Query with non-existent `jobId` returns HTTP 404 `{ error: 'job not found' }`

### Decision 4: Verification of Cloud Readiness Gating & Ghost Prevention (`src/lib/patronPackReady.ts`, `src/app/api/patrons/register/route.ts`)
- **Governing Requirement:** AC5 (Strict Cloud Readiness Gate)
- **Component:** `isPatronPackCloudReady`, `upsertRuntimePatronDb`, `POST /api/patrons/register` exit handler
- **Schema Grounding:** `isPatronPackCloudReady(characterId: string): Promise<boolean>`
- **Admissible Input:** GCS bucket containing `PAYLOAD-GCS-READYPACK-COMPLETE` vs `PAYLOAD-GCS-READYPACK-INCOMPLETE`
- **Correct Required Outputs:**
  - If all 4 sprite PNGs exist in GCS and are $\ge 256$ bytes: `isPatronPackCloudReady` returns `true`; patron is upserted into `patrons` with `is_ready = TRUE, is_active = TRUE`; job status updated to `'done'` with `progressPct = 100`
  - If any sprite PNG is missing or $< 256$ bytes: `isPatronPackCloudReady` returns `false`; patron is **never** inserted into `patrons`; job status updated to `'failed'` with diagnostic error
- **Explicit Error States:**
  - Invoking `upsertRuntimePatronDb` when `isPatronPackCloudReady` is `false` throws `Error('Cannot upsert patron "${id}": ready pack missing in GCS')`
  - Path traversal attempts in `characterId` (`..`, `/`, `\`) immediately return `false`

### Decision 5: Verification of PostgreSQL Active Roster Delivery (`src/app/api/patrons/roster/route.ts`)
- **Governing Requirement:** AC2 (PostgreSQL Roster Querying), AC6 (Mobile Remote Parity)
- **Component:** `GET /api/patrons/roster`, `readRuntimePatronsDb`, `CHARACTERS`
- **Schema Grounding:** `PatronRosterResponse` contract, `CharacterDef`
- **Admissible Input:** PostgreSQL `patrons` table populated with `PAYLOAD-DB-PATRON-ROW`
- **Correct Required Outputs:**
  - Returns HTTP 200 with `{ ok: true, storage: 'gcs-postgres', characters: [...], runtimeCount: N }`
  - Character array combines immutable stock characters (Elder, Caesar, Trump) with cloud patrons from PostgreSQL
  - Cloud patron entries feature direct, permanent GCS URLs for `sitSrc`, `talkSrc`, and `walkFrames` (`[walk01Url, walk02Url]`)
  - Only rows where `is_ready = TRUE` and `is_active = TRUE` and all 4 URLs are non-null are admitted
- **Explicit Error States:**
  - Patrons with `is_ready = false` are omitted from `characters`
  - Zero ghost patrons or broken image paths returned

### Decision 6: Verification of Built-In Stock Patron Fallback Resilience (`src/app/api/patrons/roster/route.ts`)
- **Governing Requirement:** Desired Functionality (5) & AC2
- **Component:** `GET /api/patrons/roster` error boundary catch block
- **Schema Grounding:** `CHARACTERS` stock character definitions
- **Admissible Input:** Simulated PostgreSQL outage (invalid database host, network partition, or connection error)
- **Correct Required Outputs:**
  - Catches database error gracefully without unhandled exception or HTTP 500 error
  - Logs explicit diagnostic error: `console.error('[roster] PostgreSQL query failed, activating stock patron resilience fallback:', dbError)`
  - Returns HTTP 200 with `{ ok: true, storage: 'stock-fallback', fallback: true, characters: [...], runtimeCount: 0 }`
  - Characters array contains exactly the 3 stock characters (Elder, Caesar, Trump) with local static asset paths
  - Guarantees zero blank barrooms or game crashes during database downtime

### Decision 7: Verification of Encrypted PII Store & Deduplication (`src/lib/patronPiiStore.ts`, `src/lib/patronCrypto.ts`)
- **Governing Requirement:** Desired Functionality (2) & Edge Case 4
- **Component:** `upsertPatronPiiDb`, `getPatronPiiByContactHashDb`, `encryptPiiField`, `decryptPiiField`
- **Schema Grounding:** `PatronPiiInput`, `PatronPiiRecord`, AES-256-GCM `iv:tag:data`
- **Admissible Input:** Registration contact info: name `"Maya"`, email `"maya@example.com"`, phone `"555-0199"`
- **Correct Required Outputs:**
  - Name, email, and phone encrypted using AES-256-GCM with 12-byte IV and 16-byte authentication tag
  - Initial registration inserts row into `patron_pii`, returning `{ inserted: true, contactHash, characterId }`
  - Subsequent registration with identical contact information updates existing row without error, returning `{ inserted: false, contactHash, characterId }`
  - `getPatronPiiByContactHashDb` decrypts fields and returns plain-text values matching initial input
  - PII fields are never exposed in public game APIs (`/api/patrons/roster`, `/api/patrons/generate-status`)
- **Explicit Error States:**
  - Calling PII functions when `PII_ENCRYPTION_KEY` is missing throws `Error('PII_ENCRYPTION_KEY missing; cannot encrypt patron PII')`
  - Tampered ciphertext or mismatched auth tag in `decryptPiiField` throws unhandled decryption authentication error
  - Malformed encrypted string (not 3 colon-separated segments) throws `Error('Invalid encrypted field format; expected iv:tag:data')`

---

## Coding Boundary Affirmation (`INV-BOUNDARY-01`)
DO NOT CODE YET: Implementation coding gate remains locked. Zero test code, test fixtures, parsers, or expected-output files have been generated during this session. Coding waits on an empty frontier and explicit operator authorization.

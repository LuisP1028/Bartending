# TM106 — Master Integration Test Matrix: Production Persistence Architecture (GCS Visual Asset Storage and PostgreSQL Patron Registry)

**Governing Specification:** `functional_specification_106.md` (FS106)  
**Run ID:** `20261009T192221-847-fh8d`  
**Decision Ticket:** [Ticket 006: FS106 Production Persistence Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./tickets/ticket-006.md)  
**Upstream Predecessor Decision Tickets:**
- [Ticket 001: GCS Visual Asset Client, Autonomous Cloud Publishing & Direct Public URL Resolution](./tickets/ticket-001.md)
- [Ticket 002: PostgreSQL Managed Connection Pool, Lifecycle Governance & Database Schema Architecture](./tickets/ticket-002.md)
- [Ticket 003: Durable Job Telemetry & Asynchronous Lifecycle Tracking via PostgreSQL](./tickets/ticket-003.md)
- [Ticket 004: Relational Active Roster Management, Cloud Readiness Verification & Ghost Prevention](./tickets/ticket-004.md)
- [Ticket 005: Secure PII Storage Migration & Deduplication Architecture](./tickets/ticket-005.md)

---

## 1. Upstream Manifest Binding & Audit Summary

- **Modified / Created Source Components (from `handoff/20261009T192221-847-fh8d/implementer.txt` & `reviewer.txt`):**
  1. `package.json` & `package-lock.json` (`@google-cloud/storage`, `pg`, `@types/pg` dependencies)
  2. `src/lib/gcsStorage.ts` (Google Cloud Storage client, bucket resolver, file upload, public HTTPS URL builder, asset verifier)
  3. `src/lib/db.ts` (PostgreSQL managed connection pool, idle client listener, idempotent DDL schema bootstrap)
  4. `src/lib/patronCrypto.ts` (AES-256-GCM encryption/decryption primitives, 32-byte key normalization)
  5. `src/lib/patronPiiStore.ts` (PostgreSQL PII repository, contact hash deduplication, encrypted field isolation)
  6. `src/lib/patronPackReady.ts` (Cloud-aware ready-pack verification `isPatronPackCloudReady` checking GCS objects)
  7. `src/lib/runtimePatronStore.ts` (Relational roster queries, durable generation job state persistence, cloud readiness upsert gate)
  8. `src/app/api/patrons/generate-status/route.ts` (Durable job polling route querying PostgreSQL `generation_jobs`)
  9. `src/app/api/patrons/register/route.ts` (PostgreSQL job tracking, encrypted PII upsert, GCS cloud publishing, cloud readiness gate)
  10. `src/app/api/patrons/roster/route.ts` (Relational active roster querying, direct GCS sprite URLs, built-in stock patron fallback resilience)
  11. `scripts/patron-pipeline/generate-patron-assets.mjs` (CLI `--run` pipeline, cloud upload invocation, database upsert)
  12. `scripts/patron-pipeline/lib/gcsStorage.mjs` (Node.js pipeline GCS client and upload helper)
  13. `scripts/patron-pipeline/lib/loadEnv.mjs` (Environment variable aliases: `DATABASE_URL` $\leftrightarrow$ `POSTGRES_URL`, `GCS_BUCKET` $\rightarrow$ `GCS_BUCKET_NAME`)
  14. `scripts/patron-pipeline/lib/writeAssets.mjs` (Pipeline asset installer, GCS upload integration)

- **Zero-Mock Verification Certification (`INV-PAYLOAD-01` & `INV-ASSERTION-01`):**
  - All test definitions are grounded strictly in authentic codebase types, real PostgreSQL DDL schemas, Google Cloud Storage object paths, valid image binary signatures, and HTTP endpoint contracts.
  - Zero synthetic mock objects, dummy JSON fixtures, placeholder strings, or renamed fields are used.

---

## 2. Admissible Observed Payloads Register (`INV-PAYLOAD-01`)

| Payload Reference | Description & Binary / Data Signature | Source / Origin | Schema Grounding |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-IMG-JPEG-VALID` | Authentic JPEG image buffer $\ge 256$ bytes (`0xFF, 0xD8, 0xFF`) | Device camera canvas capture | `File` / `Buffer` |
| `PAYLOAD-IMG-PNG-VALID` | Authentic PNG image buffer $\ge 256$ bytes (`0x89, 0x50, 0x4E, 0x47`) | Local photo file upload / sprite asset | `File` / `Buffer` |
| `PAYLOAD-IMG-WEBP-VALID` | Authentic WebP image buffer $\ge 256$ bytes (`RIFF....WEBP`) | Local photo file upload | `File` / `Buffer` |
| `PAYLOAD-IMG-EMPTY` | 0-byte or $< 256$ byte buffer | Truncated / empty canvas capture | `File` / `Buffer` |
| `PAYLOAD-IMG-CORRUPT` | Non-image text data formatted as file (`"NOT_AN_IMAGE_BUFFER"`) | Corrupted upload stream | `File` / `Buffer` |
| `PAYLOAD-FORM-VALID-RUN` | `FormData` with `name="Maya"`, `email="maya@example.com"`, `photo=PAYLOAD-IMG-JPEG-VALID`, `runPipeline="1"` | Comm-Link transmit form | `POST /api/patrons/register` |
| `PAYLOAD-FORM-VALID-NO-RUN` | `FormData` with `name="Maya"`, `email="maya@example.com"`, `photo=PAYLOAD-IMG-JPEG-VALID`, `runPipeline="0"` | Comm-Link metadata registration | `POST /api/patrons/register` |
| `PAYLOAD-FORM-MISSING-NAME` | `FormData` with `name=""`, `email="maya@example.com"`, `photo=PAYLOAD-IMG-JPEG-VALID`, `runPipeline="1"` | Incomplete Comm-Link input | `POST /api/patrons/register` |
| `PAYLOAD-FORM-MISSING-CONTACT` | `FormData` with `name="Maya"`, `email=""`, `phone=""`, `photo=PAYLOAD-IMG-JPEG-VALID`, `runPipeline="1"` | Incomplete Comm-Link input | `POST /api/patrons/register` |
| `PAYLOAD-FORM-MISSING-PHOTO` | `FormData` with `name="Maya"`, `email="maya@example.com"`, `runPipeline="1"` (photo omitted) | Incomplete Comm-Link input | `POST /api/patrons/register` |
| `PAYLOAD-GCS-READYPACK-COMPLETE` | 4 verified non-empty PNG objects in GCS (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png` $\ge 256$ bytes each) under `patrons/${characterId}/` | GCS Cloud Storage Bucket | `gs://bartending-patron-assets/patrons/{id}/` |
| `PAYLOAD-GCS-READYPACK-MISSING-SIT` | Defective GCS pack: `talk.png`, `walk_01.png`, `walk_02.png` exist in GCS; `sit.png` is absent | Incomplete cloud publishing | `gs://bartending-patron-assets/patrons/{id}/` |
| `PAYLOAD-GCS-READYPACK-ZERO-BYTE` | Defective GCS pack: all 4 objects exist in GCS but `sit.png` has size 0 bytes | Aborted cloud upload | `gs://bartending-patron-assets/patrons/{id}/` |
| `PAYLOAD-DB-PATRON-ROW` | PostgreSQL row in `patrons`: `id="patron_test_123"`, `display_name="Maya"`, `personality="maya_friendly"`, `walk_frame_count=2`, `walk_frame_ms=120`, `sit_url="https://storage.googleapis.com/.../sit.png"`, `talk_url="https://storage.googleapis.com/.../talk.png"`, `walk_01_url="https://storage.googleapis.com/.../walk_01.png"`, `walk_02_url="https://storage.googleapis.com/.../walk_02.png"`, `is_ready=true`, `is_active=true` | PostgreSQL Database | Table `patrons` |
| `PAYLOAD-DB-JOB-ROW` | PostgreSQL row in `generation_jobs`: `job_id="uuid"`, `character_id="patron_test_123"`, `display_name="Maya"`, `status="running"`, `current_stage="sit"`, `stage_index=3`, `total_stages=8`, `progress_pct=37` | PostgreSQL Database | Table `generation_jobs` |
| `PAYLOAD-PII-INPUT` | Authentic PII input: `characterId="patron_test_123"`, `contactHash="hash_abc"`, `name="Maya Angelou"`, `email="maya@example.com"`, `phone="555-0199"` | Registration service layer | `PatronPiiInput` |

---

## 3. Master Integration Test Matrix

| Test Case ID | Target Component | Acceptance Criterion / Boundary | Authentic Codebase Schema / Interface | Admissible Observed Input Payload (`INV-PAYLOAD-01`) | `{correct required outputs}` (`INV-ASSERTION-01`) | Explicit `{errors}` (`LANGUAGE.md`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-FS106-01** | `src/lib/gcsStorage.ts` | **AC1** (Cloud Sprite Publishing) | `uploadPatronPackToGcs()`<br>`uploadFileToGcs()`<br>`verifyGcsAssetExists()` | `PAYLOAD-IMG-PNG-VALID` for `sit`, `talk`, `walk_01`, `walk_02` at local staging paths | Returns `PatronCloudPackUrls` with permanent HTTPS URLs `https://storage.googleapis.com/${bucket}/patrons/${id}/...`; uploaded objects have `cacheControl: 'public, max-age=31536000, immutable'` and `contentType: 'image/png'`; `verifyGcsAssetExists` returns `true` | Upload fails on missing local file; 0-byte local file throws `Cannot upload to GCS: local file is empty`; invalid credentials JSON throws parse error |
| **IT-FS106-02** | `src/lib/db.ts` | **AC2**, **AC4** (Relational State Persistence & Host Migration) | `getDbPool()`<br>`ensureSchema()`<br>`query()`<br>`checkDatabaseHealth()` | PostgreSQL connection configuration (`DATABASE_URL` or `PG*` parameters) | `ensureSchema()` idempotently creates tables `patrons`, `generation_jobs`, `patron_pii` and indexes; pool configured with `max: 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`; `checkDatabaseHealth()` returns `true` | Database connection timeout $> 5000$ms; unhandled error on idle client crashes process; schema DDL syntax failure |
| **IT-FS106-03** | `src/lib/runtimePatronStore.ts`<br>`src/app/api/patrons/generate-status/route.ts` | **AC3** (Durable Job Tracking) | `writeGenerationJobDb()`<br>`readGenerationJobDb()`<br>`updateGenerationJobDb()`<br>`GET /api/patrons/generate-status` | `PAYLOAD-DB-JOB-ROW` in `generation_jobs` table | `readGenerationJobDb(jobId)` returns full record; `GET /api/patrons/generate-status?jobId=...` returns HTTP 200 with `{ ok: true, jobId, characterId, displayName, status, currentStage, stageIndex, totalStages, progressPct, statusMessage, error, logTail, sitSrc, updatedAt }`; when `status === 'done'`, `sitSrc` is valid GCS URL; when `status !== 'done'`, `sitSrc` is `null` | Missing `jobId` returns HTTP 400 `{ error: 'jobId is required' }`; non-existent `jobId` returns HTTP 404 `{ error: 'job not found' }`; unhandled database error |
| **IT-FS106-04** | `src/lib/patronPackReady.ts`<br>`src/lib/runtimePatronStore.ts` | **AC5** (Strict Cloud Readiness Gate & Ghost Prevention) | `isPatronPackCloudReady()`<br>`upsertRuntimePatronDb()` | `PAYLOAD-GCS-READYPACK-COMPLETE` vs `PAYLOAD-GCS-READYPACK-MISSING-SIT` in GCS | When all 4 sprites exist in GCS and are $\ge 256$ bytes: `isPatronPackCloudReady` returns `true`, `upsertRuntimePatronDb` inserts/updates patron with `is_ready = TRUE`; when `sit.png` is missing: `isPatronPackCloudReady` returns `false`, `upsertRuntimePatronDb` throws fatal error, preventing admission | Ghost patron created with `is_ready = TRUE` when sprites are missing; `upsertRuntimePatronDb` silent failure without throwing error |
| **IT-FS106-05** | `src/app/api/patrons/roster/route.ts`<br>`src/lib/runtimePatronStore.ts` | **AC2**, **AC6** (PostgreSQL Roster Querying & Mobile Remote Parity) | `readRuntimePatronsDb()`<br>`GET /api/patrons/roster`<br>`CHARACTERS` | PostgreSQL `patrons` table populated with `PAYLOAD-DB-PATRON-ROW` | HTTP 200 OK with `{ ok: true, storage: 'gcs-postgres', characters: [...], runtimeCount: N }`; characters list merges built-in stock patrons (Elder, Caesar, Trump) with active ready cloud patrons; cloud patron records have direct permanent GCS URLs for `sitSrc`, `talkSrc`, `walkFrames`; canvas can render images without auth bottlenecks | Empty roster; omission of stock characters; broken local file URLs (`/api/patrons/assets/...`) instead of GCS URLs; unready patrons (`is_ready = false`) admitted |
| **IT-FS106-06** | `src/app/api/patrons/roster/route.ts` | **Desired Functionality (5)** (Built-In Stock Patron Fallback Resilience) | `GET /api/patrons/roster` error boundary | Simulated database failure (connection refused / timeout) | HTTP 200 OK with `{ ok: true, storage: 'stock-fallback', fallback: true, characters: [...], runtimeCount: 0 }`; returns all 3 immutable stock characters; bar simulation continues running smoothly with zero crashes or empty barrooms | HTTP 500 error; unhandled crash; blank barroom scene; browser client exception |
| **IT-FS106-07** | `src/lib/patronPiiStore.ts`<br>`src/lib/patronCrypto.ts` | **Desired Functionality (2)**, **Edge Case 4** (Secure PII Store & Deduplication) | `upsertPatronPiiDb()`<br>`getPatronPiiByContactHashDb()`<br>`encryptPiiField()`<br>`decryptPiiField()` | `PAYLOAD-PII-INPUT` with `PII_ENCRYPTION_KEY` configured | Contact fields encrypted via AES-256-GCM (`iv:tag:ciphertext`); initial insert returns `{ inserted: true }`; subsequent registration with identical contact hash updates record returning `{ inserted: false }`; `getPatronPiiByContactHashDb` decrypts plain-text matching original input; PII strictly excluded from public APIs | Plain-text contact info written to DB; duplicate key constraint violation crashing pipeline; PII leaked in `/api/patrons/roster`; missing encryption key fails silently |
| **IT-FS106-08** | `src/app/api/patrons/register/route.ts` | **AC1**, **AC2**, **AC3**, **AC5** (Full Autonomous Registration & Persistence Integration) | `POST /api/patrons/register`<br>`generation_jobs`<br>`patrons`<br>`patron_pii` | `PAYLOAD-FORM-VALID-RUN` with `hasImagineCredentials() === true` | HTTP 200 OK with `{ ok: true, characterId, jobId, status: 'running', storage: 'gcs-postgres' }`; initial job written to PostgreSQL `generation_jobs`; contact encrypted to `patron_pii`; child process executes detached with telemetry streamed to DB; on close (code 0) assets uploaded to GCS, ready pack verified, patron upserted to `patrons` with `is_ready = TRUE` | Process hangs; local filesystem dependency; job state lost on server restart; unhandled child process error |
| **IT-FS106-09** | `src/lib/gcsStorage.ts`<br>`src/app/api/patrons/register/route.ts` | **Edge Case 1** (Transient Cloud Storage Outages & Failure Surfacing) | `uploadPatronPackToGcs()`<br>`updateGenerationJobDb()` | Child pipeline completes but GCS upload encounters network error / timeout | Child exit catch block intercepts upload error; updates `generation_jobs` with `status: 'failed'` and descriptive error `"Cloud upload / database persistence failed: ..."`; character is **not** admitted to `patrons` (zero ghosts) | Silent failure; job marked `'done'` when assets are missing; ghost patron added to active roster |
| **IT-FS106-10** | `src/app/api/patrons/register/route.ts`<br>`src/lib/db.ts` | **Edge Case 3** (Concurrent Player Registration Job Isolation) | `POST /api/patrons/register`<br>`generation_jobs`<br>`patrons` | Two simultaneous registration requests for `"Maya"` and `"Alex"` | Distinct UUID `jobId`s allocated; independent rows in `generation_jobs`; independent GCS object paths (`patrons/${charId}/`); zero database deadlock or state corruption | Shared job row collision; cross-job stage pollution; connection pool exhaustion crashing server |
| **IT-FS106-11** | `src/lib/patronPackReady.ts`<br>`src/app/api/patrons/roster/route.ts` | **Edge Case 5** (Partial Cloud Asset Loss Exclusion) | `isPatronPackCloudReady()`<br>`GET /api/patrons/roster` | Previously ready patron in database whose `walk_02.png` is deleted from GCS bucket | `isPatronPackCloudReady` evaluates to `false` due to missing `walk_02.png`; `readRuntimePatronsDb` / roster route excludes patron with partial assets from active spawn pool; game renders only fully intact patrons | Broken sprite rendered in barroom; missing asset 404 loop; client canvas render crash |
| **IT-FS106-12** | `src/lib/db.ts`<br>`src/lib/runtimePatronStore.ts`<br>`src/app/api/patrons/roster/route.ts` | **AC4** (Host Server Restart & Machine Migration Persistence) | `readRuntimePatronsDb()`<br>`GET /api/patrons/roster` | Application restart in clean environment with empty `data/` and empty `public/assets/patrons/`, but valid PostgreSQL and GCS environment variables | `ensureSchema()` connects to existing database; `readRuntimePatronsDb()` queries persistent `patrons` table; `/api/patrons/roster` immediately returns all previously created cloud patrons and stock characters; zero data loss | Vanishing patrons on container restart or host transfer; reliance on local JSON files |

---

## 4. Evaluation Criteria & Assertions Mapping (`LANGUAGE.md`)

### 4.1 Evaluation Parameters
- **`{errors}`**:
  - Missing GCS credentials or invalid JSON: throws `Failed to parse GCS_CREDENTIALS_JSON`.
  - Empty or 0-byte local file during cloud upload: throws `Cannot upload to GCS: local file is empty (0 bytes)`.
  - Cloud upload failure: throws descriptive error detailing destination path.
  - Upserting patron when cloud ready pack is incomplete: throws `Cannot upsert patron "${id}": ready pack missing in GCS`.
  - Missing `jobId` parameter on status endpoint: returns HTTP 400 `{ error: 'jobId is required' }`.
  - Non-existent `jobId` on status endpoint: returns HTTP 404 `{ error: 'job not found' }`.
  - Database connection timeout or query failure: logged with diagnostic trace; handled gracefully by stock fallback on roster query.
  - Missing `PII_ENCRYPTION_KEY`: throws `PII_ENCRYPTION_KEY missing; cannot encrypt patron PII`.
  - Malformed encrypted string: throws `Invalid encrypted field format; expected iv:tag:data`.
  - Missing name on registration: returns HTTP 400 `{ error: 'name is required' }`.
  - Missing contact (email and phone) on registration: returns HTTP 400 `{ error: 'email or phone is required' }`.
  - Missing photo on generative registration: returns HTTP 400 `{ error: 'photo is required when generating a character' }`.
  - Invalid photo format or size $< 256$ bytes: returns HTTP 400 with diagnostic error.
- **`{correctness}`**:
  - Exact relational key alignment: `characterId` matches across `patrons`, `generation_jobs`, `patron_pii`, and GCS path `patrons/${characterId}/`.
  - 100% schema fidelity: payloads contain only authentic field names with exact optionality and typing.
  - AES-256-GCM authenticated encryption guarantees cryptographic integrity with 12-byte IV and 16-byte auth tag.
  - Permanent GCS URLs follow format `https://storage.googleapis.com/${bucketName}/patrons/${characterId}/${fileName}` with immutable cache headers.
- **`{functionality}`**:
  - An integrated persistence architecture ensuring that character sprites reside permanently in Google Cloud Storage, game roster state, jobs, and contact records reside in PostgreSQL, and players retained across machine migrations and host restarts without ghost patrons or downtime.
- **`{correct required outputs}`**:
  - Objectively measurable return statuses, exact JSON response properties, database row states, and GCS asset existence defined in the test matrix above.
- **`{sufficient}`**:
  - This matrix provides complete schema grounding, explicit failure modes, and concrete observed inputs for every acceptance criterion (AC1–AC6) and edge case (1–5) of FS106.
- **`{insufficient}`**:
  - Any test plan containing synthetic mock data, stand-in placeholders, arbitrary delays, or assertions against unmandated structures.

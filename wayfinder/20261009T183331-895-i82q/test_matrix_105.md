# TM105 — Master Integration Test Matrix: End-to-End In-Game "Join the Bar" Patron Generation and Automatic Spawn Availability

**Governing Specification:** `functional_specification_105.md` (FS105)  
**Run ID:** `20261009T183331-895-i82q`  
**Decision Ticket:** [Ticket 005: FS105 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./tickets/ticket-005.md)  
**Upstream Predecessor Tickets:**
- [Ticket 001: Deterministic Credential Discovery, Execution Context & Root Path Alignment](./tickets/ticket-001.md)
- [Ticket 002: Detached Process Execution, Stream Telemetry & Real-Time Progress Persistence](./tickets/ticket-002.md)
- [Ticket 003: Non-Blocking Client UX, Shell Navigation & In-Game Status Feedback](./tickets/ticket-003.md)
- [Ticket 004: Strict Ready-Pack Verification, Ghost Prevention & Instant Live Barroom Discovery](./tickets/ticket-004.md)

---

## 1. Upstream Manifest Binding & Audit Summary

- **Modified / Created Source Components (from `handoff/20261009T183331-895-i82q/implementer.txt` & `reviewer.txt`):**
  1. `scripts/patron-pipeline/generate-patron-assets.mjs` (CLI `--repo-root`, per-job `plan.json` staging isolation)
  2. `scripts/patron-pipeline/lib/loadEnv.mjs` (Multi-candidate `.env` traversal, environment aliases)
  3. `src/app/api/patrons/generate-status/route.ts` (Real-time telemetry progress serialization)
  4. `src/app/api/patrons/register/route.ts` (Image validation, detached execution, stream parser, ready-pack gating)
  5. `src/app/page.tsx` (Non-blocking back navigation, HUD progress display, `'patron-roster-updated'` event dispatch)
  6. `src/components/JoinBarCamera.tsx` (Photo buffer pre-validation, non-blocking close button)
  7. `src/components/PatronLayer.tsx` (Event-driven instant discovery, stock patron seating priority)
  8. `src/lib/runtimePatronStore.ts` (Telemetry fields, `hasImagineCredentials()`, atomic job persistence)
- **Zero-Mock Verification Certification (`INV-PAYLOAD-01` & `INV-ASSERTION-01`):**
  - All test definitions are grounded strictly in authentic codebase types, real HTTP endpoint signatures, valid image magic bytes, and host filesystem artifacts.
  - Zero synthetic mock objects, dummy JSON fixtures, placeholder strings, or renamed fields are used.

---

## 2. Admissible Observed Payloads Register (`INV-PAYLOAD-01`)

| Payload Reference | Description & Binary Signature | Source / Origin | Schema Grounding |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-IMG-JPEG-VALID` | Authentic JPEG image buffer $\ge 256$ bytes (`0xFF, 0xD8, 0xFF`) | Device camera canvas capture | `File` / `Buffer` |
| `PAYLOAD-IMG-PNG-VALID` | Authentic PNG image buffer $\ge 256$ bytes (`0x89, 0x50, 0x4E, 0x47`) | Local photo file upload | `File` / `Buffer` |
| `PAYLOAD-IMG-WEBP-VALID` | Authentic WebP image buffer $\ge 256$ bytes (`RIFF....WEBP`) | Local photo file upload | `File` / `Buffer` |
| `PAYLOAD-IMG-EMPTY` | 0-byte or $< 256$ byte buffer | Truncated / empty canvas capture | `File` / `Buffer` |
| `PAYLOAD-IMG-CORRUPT` | Non-image text data formatted as file (`"NOT_AN_IMAGE_BUFFER"`) | Corrupted upload stream | `File` / `Buffer` |
| `PAYLOAD-FORM-VALID-RUN` | `FormData` with `name="Maya"`, `email="maya@example.com"`, `photo=PAYLOAD-IMG-JPEG-VALID`, `runPipeline="1"` | Comm-Link transmit form | `POST /api/patrons/register` |
| `PAYLOAD-FORM-VALID-NO-RUN` | `FormData` with `name="Maya"`, `email="maya@example.com"`, `photo=PAYLOAD-IMG-JPEG-VALID`, `runPipeline="0"` | Comm-Link metadata registration | `POST /api/patrons/register` |
| `PAYLOAD-FORM-MISSING-NAME` | `FormData` with `name=""`, `email="maya@example.com"`, `photo=PAYLOAD-IMG-JPEG-VALID`, `runPipeline="1"` | Incomplete Comm-Link input | `POST /api/patrons/register` |
| `PAYLOAD-FORM-MISSING-CONTACT` | `FormData` with `name="Maya"`, `email=""`, `phone=""`, `photo=PAYLOAD-IMG-JPEG-VALID`, `runPipeline="1"` | Incomplete Comm-Link input | `POST /api/patrons/register` |
| `PAYLOAD-FORM-MISSING-PHOTO` | `FormData` with `name="Maya"`, `email="maya@example.com"`, `runPipeline="1"` (photo omitted) | Incomplete Comm-Link input | `POST /api/patrons/register` |
| `PAYLOAD-READYPACK-COMPLETE` | 4 verified non-empty PNGs (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png` $\ge 256$ bytes each) | Staged asset pipeline output | Host filesystem (`public/assets/patrons/{id}/`) |
| `PAYLOAD-READYPACK-MISSING-SIT` | Defective pack: `talk.png`, `walk_01.png`, `walk_02.png` present; `sit.png` missing | Incomplete background removal | Host filesystem (`public/assets/patrons/{id}/`) |
| `PAYLOAD-READYPACK-ZERO-BYTE` | Defective pack: all 4 files present but `sit.png` is 0 bytes | Aborted image write | Host filesystem (`public/assets/patrons/{id}/`) |

---

## 3. Master Integration Test Matrix

| Test Case ID | Target Component | Acceptance Criterion / Boundary | Authentic Codebase Schema / Interface | Admissible Observed Input Payload (`INV-PAYLOAD-01`) | `{correct required outputs}` (`INV-ASSERTION-01`) | Explicit `{errors}` (`LANGUAGE.md`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-FS105-01** | `src/app/api/patrons/register/route.ts`<br>`src/lib/runtimePatronStore.ts` | **AC1** (Autonomous In-Game Generation) | `POST /api/patrons/register`<br>`GenerationJobRecord` | `PAYLOAD-FORM-VALID-RUN` with `hasImagineCredentials() === true` | HTTP 200 OK; returns `ok: true`, valid `jobId`, authentic `characterId` (starts with `patron_`), `status: 'running'`, `pipeline.mode: 'run-async'`; child spawned detached with `child.unref()`; job record written to `data/generation-jobs/${jobId}.json` with `status: 'running'`, `progressPct: 0` | Silent hang; child process attached to request group; missing `jobId`; HTTP 500 error; unhandled exception |
| **IT-FS105-02** | `scripts/patron-pipeline/generate-patron-assets.mjs`<br>`src/lib/patronPackReady.ts` | **AC2** (Ready Pack Completeness) | `isPatronPackReady()`<br>`public/assets/patrons/{id}/` | Child pipeline completes with exit code 0 (`--run`, `--photo`, `--name`, `--character-id`) | All 4 files exist under `public/assets/patrons/${characterId}/`: `sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`; each is a valid PNG $\ge 256$ bytes (not LFS pointer); `isPatronPackReady(root, characterId) === true` | One or more sprite files missing; zero-byte asset; LFS pointer text file; `isPatronPackReady()` evaluates to `false` |
| **IT-FS105-03** | `src/app/api/patrons/register/route.ts`<br>`src/lib/runtimePatronStore.ts`<br>`src/app/api/patrons/roster/route.ts` | **AC3** (Readiness Gating & Zero Ghosts — Success Case) | `upsertRuntimePatron()`<br>`readRuntimePatrons()`<br>`GET /api/patrons/roster` | Pipeline exit code 0 with `PAYLOAD-READYPACK-COMPLETE` | `upsertRuntimePatron` adds patron to `data/runtime-patrons.json`; job marked `status: 'done'`, `progressPct: 100`, `error: undefined`; `GET /api/patrons/roster` includes newly registered character with runtime asset URLs | Missing roster entry; job status remaining `'running'`; failure to update runtime JSON |
| **IT-FS105-04** | `src/app/api/patrons/register/route.ts`<br>`src/lib/runtimePatronStore.ts`<br>`src/app/api/patrons/roster/route.ts` | **AC3** (Readiness Gating & Zero Ghosts — Failure Case) | `isPatronPackReady()`<br>`updateGenerationJob()`<br>`GET /api/patrons/roster` | Pipeline exit code 0 with `PAYLOAD-READYPACK-MISSING-SIT` or non-zero exit code | Character is **never** added to `data/runtime-patrons.json`; job marked `status: 'failed'` with explicit diagnostic error (`'ready pack missing...'`); `GET /api/patrons/roster` excludes character; zero ghost entries | Ghost patron registered without ready pack; invisible character returned in `/api/patrons/roster`; silent status hang |
| **IT-FS105-05** | `src/app/page.tsx`<br>`src/components/PatronLayer.tsx` | **AC4** (Immediate Gameplay Discovery) | `patron-roster-updated` CustomEvent<br>`loadRoster()`<br>`trySpawn()` | Job poll returns `status: 'done'` with `{ characterId: 'patron_maya123' }` | `page.tsx` dispatches `patron-roster-updated`; `PatronLayer` catches event, immediately invokes `loadRoster()` and `trySpawn()`; new character enters live barroom simulation without page reload or 20s polling delay | Event not dispatched; event listener missing; 20-second delay persists; browser reload required to display patron |
| **IT-FS105-06** | `src/app/api/patrons/generate-status/route.ts`<br>`src/app/page.tsx`<br>`src/components/JoinBarCamera.tsx` | **AC5** (User-Facing Status Feedback & HUD Progress) | `GET /api/patrons/generate-status`<br>`GenerationJobRecord` | Child emits progress marker `--- [3] sit ---` then `--- [6] walk_02 ---` | `GET /api/patrons/generate-status` returns `status: 'running'`, `currentStage: 'sit'`, `stageIndex: 3`, `totalStages: 8`, `progressPct: 37`, `statusMessage: 'Generating sitting pose (3/8)...'`; HUD displays dynamic stage message and percentage | Static unchanging "GENERATING..." message; null stage fields; polling timeout failure |
| **IT-FS105-07** | `src/components/PatronLayer.tsx`<br>`src/data/characters.ts` | **AC6** (Stock Patron Preservation & Stool Priority) | `pickRandomFreeCharacterId()`<br>`STOCK_CHARACTER_IDS` | 4 canonical stools (`bar_seat_1`..`4`); 3 stock characters + 1 join patron | Stock characters (Elder, Caesar, Trump) claim stools 1–3; join patron claims stool 4; auto-fill halts when all 4 stools are filled; zero displacement of stock patrons | Stock patron evicted or replaced; join patron takes stool 1 over stock characters; runaway spawn loop past stool 4 |
| **IT-FS105-08** | `src/app/api/patrons/register/route.ts`<br>`src/lib/runtimePatronStore.ts` | **Edge Case 1** (Missing Generation Credentials) | `POST /api/patrons/register`<br>`hasImagineCredentials()` | `PAYLOAD-FORM-VALID-RUN` with `process.env.XAI_API_KEY` unset and no parent `.env` keys | HTTP 503 Service Unavailable; `{ error: 'Image generation credentials missing on server. Please configure XAI_API_KEY (or XAIKEY / HF_TOKEN) in .env' }`; zero background processes spawned; zero dangling files | Background process spawned with missing key; unhandled exception; silent hanging task; empty output files |
| **IT-FS105-09** | `src/app/api/patrons/register/route.ts`<br>`scripts/patron-pipeline/generate-patron-assets.mjs` | **Edge Case 2** (Concurrent User Registrations) | `data/generation-jobs/`<br>`data/patrons-staging/` | Two concurrent registration requests: `Maya` and `Alex` submitted simultaneously | Distinct `jobId`s (UUID v4) allocated; independent staging folders (`data/patrons-staging/patron_...`); per-job `plan.json` written; independent telemetry streams without file contention | Shared `.last-plan.json` clobbering; cross-job stage pollution; race condition crashing pipeline |
| **IT-FS105-10** | `src/app/page.tsx`<br>`src/components/JoinBarCamera.tsx` | **Edge Case 3** (Non-Blocking Navigation & Session Disconnect) | `onShellBack()`<br>`child.unref()` | Player clicks "Run in Background" or presses B-button / Escape during active generation | Camera modal closes cleanly (`setJoinStage(null)`); shell returns to main menu; server child process continues executing detached; polling loop tracks job to completion in background | Shell back navigation locked/trapped; closing camera kills server child process; browser freeze |
| **IT-FS105-11** | `src/app/api/patrons/register/route.ts`<br>`src/components/JoinBarCamera.tsx` | **Edge Case 4** (Corrupt / Empty Photo Validation) | `POST /api/patrons/register`<br>`isValidImageBuffer()` | Submission with `PAYLOAD-IMG-EMPTY` or `PAYLOAD-IMG-CORRUPT` | HTTP 400 Bad Request; `{ error: 'Photo file is empty or corrupted (under 256 bytes).' }` or `{ error: 'Invalid image format. Please submit a valid JPEG, PNG, or WebP photo.' }`; zero background processes spawned | Corrupt buffer written to disk; child process spawned; image processing crash in `@imgly` or `Imagine` |
| **IT-FS105-12** | `src/lib/runtimePatronStore.ts`<br>`src/app/api/patrons/roster/route.ts` | **Edge Case 5** (Host Storage Ephemerality & Dynamic Pruning) | `readRuntimePatrons()`<br>`GET /api/patrons/roster` | Entry in `runtime-patrons.json` whose folder under `public/assets/patrons/{id}/` was removed from disk | `readRuntimePatrons(root)` detects missing pack via `isPatronPackReady(root, id)`, prunes record from `runtime-patrons.json`, and returns clean list; `/api/patrons/roster` serves zero ghosts | Ghost record returned to client; 404 image load errors in game client; stale cache retention |

---

## 4. Evaluation Criteria & Assertions Mapping

### 4.1 Evaluation Parameters (`LANGUAGE.md`)
- **`{errors}`**:
  - HTTP 400 when name is missing: `{ error: 'name is required' }`.
  - HTTP 400 when contact is missing: `{ error: 'email or phone is required' }`.
  - HTTP 400 when photo is missing for generation: `{ error: 'photo is required when generating a character' }`.
  - HTTP 400 when photo buffer is under 256 bytes: `{ error: 'Photo file is empty or corrupted (under 256 bytes).' }`.
  - HTTP 400 when photo format is unsupported: `{ error: 'Invalid image format. Please submit a valid JPEG, PNG, or WebP photo.' }`.
  - HTTP 404 when query jobId is unknown: `{ error: 'job not found' }`.
  - HTTP 503 when credentials are unconfigured: `{ error: 'Image generation credentials missing on server. Please configure XAI_API_KEY (or XAIKEY / HF_TOKEN) in .env' }`.
  - Fatal child process failure or missing ready pack: `job.status === 'failed'` with descriptive error in `job.error`.
- **`{correctness}`**:
  - Relational key alignment: `jobId` in `data/generation-jobs/${jobId}.json` matches query `jobId` and response `jobId`.
  - Character identifier alignment: `characterId` in registration matches `characterId` in job, folder slug, and runtime patron record.
  - Ready-pack integrity: Exactly 4 valid PNG files exist with size $\ge 256$ bytes.
- **`{functionality}`**:
  - An integrated pipeline verifying that in-game registration triggers background asset creation, tracks real-time progress, prevents ghost patrons, and immediately seats newly created patrons at the bar counter during live gameplay.
- **`{correct required outputs}`**:
  - Objectively measurable return statuses, exact JSON response properties, file existence on disk, and DOM event dispatches defined in the matrix above.
- **`{sufficient}`**:
  - This matrix provides 100% schema grounding, explicit failure modes, and concrete observed inputs for every acceptance criterion and edge case of FS105.
- **`{insufficient}`**:
  - Any test plan containing synthetic mock data, stand-in placeholders, or assertions against unmandated structures.

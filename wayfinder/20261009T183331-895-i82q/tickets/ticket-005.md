---
ticket_id: 005
title: "FS105 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol"
type: task
status: resolved
claimed_by: "wayfinder-test-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md", "ticket-004.md"]
governing_specification: "functional_specification_105.md"
---

# Ticket 005: FS105 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol

## Question
What deterministic integration test decisions, authentic codebase schemas, admissible observed payloads, and specification oracles govern the verification of the modified components (`scripts/patron-pipeline/generate-patron-assets.mjs`, `scripts/patron-pipeline/lib/loadEnv.mjs`, `src/app/api/patrons/generate-status/route.ts`, `src/app/api/patrons/register/route.ts`, `src/app/page.tsx`, `src/components/JoinBarCamera.tsx`, `src/components/PatronLayer.tsx`, `src/lib/runtimePatronStore.ts`) to guarantee that in-game patron registration autonomously executes the generative asset pipeline, enforces zero-ghost ready-pack gating, and immediately delivers spawnable seated patrons into live barroom gameplay under `INV-PAYLOAD-01` and `INV-ASSERTION-01` without synthesizing test fixtures or writing executable test code?

---

## Context & Specification Grounding

- **Governing Specification:** `functional_specification_105.md` (FS105 — End-to-end in-game "Join the bar" patron generation and automatic spawn availability)
  - §Purpose: "Establish required product {functionality} enabling players to complete the in-game 'Join the bar!' registration flow (providing an alias, contact info, and a selfie photo) such that the system autonomously generates a complete patron visual asset pack, registers the patron into the active runtime pool, and renders them spawnable and seated at the bar counter during live gameplay. This eliminates the defect condition where the automated in-game generation flow fails, stalls, or times out, forcing operators to bypass the game interface and manually invoke the generative pipeline script from a command-line terminal."
  - §Current Functionality & Observed {errors}:
    - In-Game Submission Stalling: "When a player navigates to the 'Join the bar!' interface, enters their name and contact information, captures a selfie, and selects 'Use Photo', the interface transitions to a generating state... In live testing, this automated request consistently fails to complete successfully: it either terminates with a generation failure error, hangs until the client polling timer expires (timeout), or exits without producing the required visual assets."
    - Missing Ready Pack & Omission from Game: "Because the background process fails to produce the verified ready pack on disk, the system's readiness checks properly prevent the character from being marked as ready. Consequently, the newly registered player never appears in the runtime roster and is never spawned into the active barroom scene."
    - Reliance on Manual CLI Execution: "To successfully bring a new patron into the game, operators have had to bypass the web interface entirely and manually execute the command-line script in a local terminal (`node scripts/patron-pipeline/generate-patron-assets.mjs --run ...`)."
  - §Desired Functionality:
    1. Autonomous In-Game Initiation: Complete registration from within the game UI (Comm-Link -> alias -> contact -> photo -> submit) autonomously starting full generative pipeline without manual intervention.
    2. Reliable Background Generation Execution: Background execution across all 6 stages (`head_on` -> `profile` -> `sit` -> `talk` -> `walk_01` -> `walk_02`), background removal producing transparent sprites (`sit`, `talk`, `walk_01`, `walk_02`), and ready pack installation.
    3. Clear, Non-Blocking Player UX & Status Feedback: Visual feedback during active generation; responsive shell navigation (B-button/Escape does not abort or corrupt in-flight generation); real-time stage progress polling; descriptive user-readable errors on failure.
    4. Zero Ghost Patrons & Strict Readiness Verification: Admitted into runtime roster if and only if all four assets of the ready pack (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) are verified non-empty, valid PNGs on host disk.
    5. Instant In-Game Availability: Immediate discovery by live simulation on completion, auto-fill eligibility and bar counter seating alongside stock patrons without page reload or server restart.
  - §Edge Cases & Behavioral Boundaries:
    1. Missing or Invalid Generation Credentials: Fail-fast rejection with intelligible error before starting background jobs.
    2. Concurrent User Registrations: Isolated job identities, staging paths, and plan configurations.
    3. Session Interruption & Client Navigation: Detached server generation continuing uninterrupted upon tab close or modal navigation.
    4. Invalid or Unprocessable Images: Early validation rejecting empty/corrupt files with HTTP 400.
    5. Host Storage Ephemerality: Dynamic ready-pack re-validation across disk lifecycle.
  - §Acceptance Criteria:
    - AC1: Autonomous In-Game Generation
    - AC2: Ready Pack Completeness
    - AC3: Readiness Gating & Ghost Prevention
    - AC4: Immediate Gameplay Discovery
    - AC5: User-Facing Status & Error Clarity
    - AC6: Stock Patron Preservation
- **Upstream Manifest Context:**
  - `handoff/20261009T183331-895-i82q/wayfinder-read-and-plan.txt`
  - `handoff/20261009T183331-895-i82q/implementer.txt`
  - `handoff/20261009T183331-895-i82q/reviewer.txt`
- **Predecessor Decision Tickets:**
  - [Ticket 001: Deterministic Credential Discovery, Execution Context & Root Path Alignment](./ticket-001.md)
  - [Ticket 002: Detached Process Execution, Stream Telemetry & Real-Time Progress Persistence](./ticket-002.md)
  - [Ticket 003: Non-Blocking Client UX, Shell Navigation & In-Game Status Feedback](./ticket-003.md)
  - [Ticket 004: Strict Ready-Pack Verification, Ghost Prevention & Instant Live Barroom Discovery](./ticket-004.md)

---

## Architectural Decisions to Lock

### 1. Ground-Truth Codebase Interface & Schema Definition (Zero Mocks)
The integration test interfaces for verifying the FS105 implementation are grounded strictly in authentic TypeScript types, HTTP endpoint contracts, file formats, and Node.js child process events without synthetic wrappers or mock layers:

#### A. Registration API Request & Response Schema (`src/app/api/patrons/register/route.ts`)
```typescript
// HTTP POST /api/patrons/register
// Body: multipart/form-data
export type RegisterRequestBody = {
  name: string; // required
  email?: string | null; // required if phone missing
  phone?: string | null; // required if email missing
  photo?: File; // required if runPipeline=true; Buffer >= 256 bytes; JPEG, PNG, or WebP
  runPipeline?: '1' | 'true' | '0' | 'false';
};

// HTTP 200 OK (runPipeline === true)
export type RegisterSuccessResponse = {
  ok: true;
  characterId: string; // e.g. "patron_a1b2c3d4e5f6g7h8"
  displayName: string;
  contactHash: string;
  registered: { inserted: boolean };
  walkFrameCount: number; // 2
  pii: null;
  piiError: string | null;
  jobId: string; // UUID v4
  status: 'running';
  pipeline: {
    ok: true;
    mode: 'run-async';
  };
  generationNote: string;
  sitSrc: string; // "/api/patrons/assets/{characterId}/sit.png"
  storage: 'runtime-only';
};

// HTTP 400 Bad Request
export type RegisterErrorResponse400 = {
  error:
    | 'name is required'
    | 'email or phone is required'
    | 'photo is required when generating a character'
    | 'Photo file is empty or corrupted (under 256 bytes).'
    | 'Invalid image format. Please submit a valid JPEG, PNG, or WebP photo.';
};

// HTTP 503 Service Unavailable
export type RegisterErrorResponse503 = {
  error: 'Image generation credentials missing on server. Please configure XAI_API_KEY (or XAIKEY / HF_TOKEN) in .env';
};
```

#### B. Generation Job Telemetry & Status API Schema (`src/app/api/patrons/generate-status/route.ts`)
```typescript
// HTTP GET /api/patrons/generate-status?jobId={jobId}
export type GenerateStatusSuccessResponse = {
  ok: true;
  jobId: string;
  characterId: string;
  displayName: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  currentStage: string | null; // 'head_on' | 'profile' | 'sit' | 'talk' | 'walk_01' | 'walk_02' | 'bg_removal' | 'install' | 'done'
  stageIndex: number | null; // 0..8
  totalStages: number | null; // 8
  progressPct: number | null; // 0..100
  statusMessage: string | null;
  error: string | null;
  logTail: string | null;
  sitSrc: string | null; // "/api/patrons/assets/{characterId}/sit.png" when status === 'done', otherwise null
  updatedAt: string; // ISO 8601
};

// HTTP 400 Bad Request
export type GenerateStatusErrorResponse400 = {
  error: 'jobId is required';
};

// HTTP 404 Not Found
export type GenerateStatusErrorResponse404 = {
  error: 'job not found';
};
```

#### C. Runtime Store Data Structures (`src/lib/runtimePatronStore.ts`)
```typescript
export type RuntimePatronRecord = {
  id: string; // "patron_..."
  displayName: string;
  personality: string;
  walkFrameCount: number; // 2
  walkFrameMs: number; // 120
  createdAt: string; // ISO 8601
};

export type GenerationJobRecord = {
  jobId: string;
  characterId: string;
  displayName: string;
  status: 'queued' | 'running' | 'done' | 'failed';
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
};
```

#### D. Ready-Pack Integrity Contract (`src/lib/patronPackReady.ts`)
```typescript
// Verified files under public/assets/patrons/{characterId}/:
// 1. sit.png     (>= 256 bytes, magic bytes 0x89 0x50 0x4E 0x47, not git LFS pointer)
// 2. talk.png    (>= 256 bytes, magic bytes 0x89 0x50 0x4E 0x47, not git LFS pointer)
// 3. walk_01.png (>= 256 bytes, magic bytes 0x89 0x50 0x4E 0x47, not git LFS pointer)
// 4. walk_02.png (>= 256 bytes, magic bytes 0x89 0x50 0x4E 0x47, not git LFS pointer)
export function isPatronPackReady(repoRoot: string, characterId: string): boolean;
```

#### E. In-Game Simulation Discovery Event (`src/app/page.tsx` & `src/components/PatronLayer.tsx`)
```typescript
// Window CustomEvent dispatched by page.tsx upon generation status: 'done'
export type PatronRosterUpdatedEvent = CustomEvent<{
  characterId: string;
  displayName?: string;
}>;
// Dispatched: window.dispatchEvent(new CustomEvent('patron-roster-updated', { detail: { characterId } }));
// Consumed: window.addEventListener('patron-roster-updated', handleRosterUpdate);
```

---

## 2. Authentic Observed Payloads & Admissibility Register (`INV-PAYLOAD-01`)

Under `INV-PAYLOAD-01`, test inputs must never be synthesized or mock-shaped. Every admissible payload is drawn directly from observed runtime structures or actual image files:

| Payload Identifier | Origin / Producer | Schema Alignment | Key Fields / Byte Signatures | Admissibility Classification |
| :--- | :--- | :--- | :--- | :--- |
| **PAYLOAD-PHOTO-JPEG** | Camera canvas capture (`JoinBarCamera.tsx`) | Real JPEG binary | Size $\ge 256$ bytes; Header `[0xFF, 0xD8, 0xFF, ...]` | **Admissible** (observed photo) |
| **PAYLOAD-PHOTO-PNG** | Uploaded file input | Real PNG binary | Size $\ge 256$ bytes; Header `[0x89, 0x50, 0x4E, 0x47]` | **Admissible** (observed photo) |
| **PAYLOAD-PHOTO-WEBP** | Uploaded file input | Real WebP binary | Size $\ge 256$ bytes; Header `'RIFF' ... 'WEBP'` | **Admissible** (observed photo) |
| **PAYLOAD-PHOTO-EMPTY** | Corrupted / 0-byte capture | Binary buffer | Size $< 256$ bytes | **Admissible** (observed error input) |
| **PAYLOAD-PHOTO-CORRUPT** | Non-image text/corrupted file | Binary buffer | Size $\ge 256$ bytes; Header ASCII `'INVALID...'` | **Admissible** (observed error input) |
| **PAYLOAD-FORM-VALID** | Comm-Link transmit form | `FormData` | `{ name: 'Maya', email: 'maya@example.com', photo: PAYLOAD-PHOTO-JPEG, runPipeline: '1' }` | **Admissible** (standard submission) |
| **PAYLOAD-FORM-NO-NAME** | Comm-Link missing name | `FormData` | `{ name: '', email: 'maya@example.com', runPipeline: '1' }` | **Admissible** (observed error input) |
| **PAYLOAD-FORM-NO-CONTACT** | Comm-Link missing contact | `FormData` | `{ name: 'Maya', email: '', phone: '', runPipeline: '1' }` | **Admissible** (observed error input) |
| **PAYLOAD-FORM-NO-PHOTO** | Comm-Link run without photo | `FormData` | `{ name: 'Maya', email: 'maya@example.com', runPipeline: '1' }` (photo omitted) | **Admissible** (observed error input) |
| **PAYLOAD-STDOUT-HEADON** | `generate-patron-assets.mjs` stdout | Stream text chunk | Contains `'--- [1] head_on ---'` | **Admissible** (observed stdout) |
| **PAYLOAD-STDOUT-BGREMOVE** | `generate-patron-assets.mjs` stdout | Stream text chunk | Contains `'=== Install (imgly background removal) ==='` | **Admissible** (observed stdout) |
| **PAYLOAD-STDOUT-DONE** | `generate-patron-assets.mjs` stdout | Stream text chunk | Contains `'=== DONE ==='` | **Admissible** (observed stdout) |
| **PAYLOAD-PACK-COMPLETE** | Ready pack directory on disk | Filesystem assets | 4 files: `sit.png`, `talk.png`, `walk_01.png`, `walk_02.png` ($\ge 256$ bytes each, PNG magic bytes) | **Admissible** (observed verified ready pack) |
| **PAYLOAD-PACK-INCOMPLETE**| Failed pack directory on disk | Filesystem assets | Missing `sit.png` or 0-byte placeholder | **Admissible** (observed defective pack) |

---

## 3. Master Specification Oracles & Assertion Rules (`INV-ASSERTION-01`)

Under `INV-ASSERTION-01`, assertions must evaluate `{correct required outputs}` strictly against the functional specification and locked ticket resolutions. Zero handwritten, unmandated expected blobs are permitted:

### Oracle AC1: Autonomous In-Game Initiation & Execution
- **Trigger:** Dispatch valid `POST /api/patrons/register` with `PAYLOAD-FORM-VALID` (`runPipeline: '1'`).
- **Required Outputs:**
  - Status 200 OK.
  - Returns `ok: true`, valid UUID `jobId`, authentic `characterId` (starts with `patron_`), `status: 'running'`, `pipeline.mode: 'run-async'`.
  - Child process spawned detached with `child.unref()`, passing `--repo-root`, `--photo`, `--name`, `--character-id`, `--no-register`.
  - Job record written to `data/generation-jobs/${jobId}.json` with `status: 'running'`, `currentStage: 'init'`, `stageIndex: 0`, `totalStages: 8`, `progressPct: 0`.

### Oracle AC2: Ready Pack Completeness
- **Trigger:** Child pipeline process completes with exit code 0.
- **Required Outputs:**
  - All four files exist on host disk under `public/assets/patrons/${characterId}/`:
    1. `sit.png`
    2. `talk.png`
    3. `walk_01.png`
    4. `walk_02.png`
  - Each file satisfies `st.size >= 256`, has valid PNG magic bytes (`0x89, 0x50, 0x4E, 0x47`), and is not a Git LFS pointer text file.

### Oracle AC3: Readiness Gating & Ghost Prevention
- **Case 3A (Success Gating):**
  - Trigger: Pipeline exits 0 AND `isPatronPackReady(root, characterId)` returns `true`.
  - Required Outputs:
    - `upsertRuntimePatron(root, record)` appends character to `data/runtime-patrons.json`.
    - `updateGenerationJob` transitions job to `status: 'done'`, `progressPct: 100`, `error: undefined`.
    - `GET /api/patrons/roster` returns the character with full `assetsOverride` URLs.
- **Case 3B (Ghost Prevention on Defective Pack):**
  - Trigger: Pipeline exits with code 0 OR non-zero, but `isPatronPackReady(root, characterId)` returns `false` (e.g. `sit.png` missing).
  - Required Outputs:
    - Character is **never** added to `data/runtime-patrons.json`.
    - `updateGenerationJob` transitions job to `status: 'failed'` with explicit diagnostic error: `'Pipeline exited 0 but ready pack missing...'` or `'Pipeline exited with code...'`.
    - `GET /api/patrons/roster` filters out the character with zero ghost entries.

### Oracle AC4: Immediate Gameplay Discovery & Counter Seating
- **Trigger:** Client generation status poll receives `status: 'done'`.
- **Required Outputs:**
  - `src/app/page.tsx` dispatches `patron-roster-updated` window event with `detail: { characterId }`.
  - `src/components/PatronLayer.tsx` event handler receives event and immediately invokes `loadRoster()` and `trySpawn()`.
  - Stool allocation:
    - Stock characters (Elder, Caesar, Trump) claim seats 1–3 (`STOCK_CHARACTER_IDS` priority).
    - Newly registered join patron fills seat 4 (`bar_seat_4`).
  - Patron sprites render dynamically from `/api/patrons/assets/${characterId}/sit.png` and `walk_01.png` without page reload or server restart.

### Oracle AC5: Non-Blocking UX & Real-Time Progress Telemetry
- **Case 5A (Real-Time Stage Telemetry):**
  - Trigger: Pipeline emits stage marker `--- [3] sit ---`.
  - Required Outputs:
    - Job updated to `{ currentStage: 'sit', stageIndex: 3, totalStages: 8, progressPct: 37, statusMessage: 'Generating sitting pose (3/8)...' }`.
    - Polling `GET /api/patrons/generate-status?jobId=${jobId}` returns HTTP 200 with matching telemetry fields.
    - Camera HUD displays `GENERATING [Alias]… [37%]`.
- **Case 5B (Non-Blocking Navigation):**
  - Trigger: User presses B-button, Escape, or clicks "Run in Background" while `joinBusy === true`.
  - Required Outputs:
    - Overlay closes (`setJoinStage(null)`), returning user to main menu.
    - Server generation child process continues running in background uninterrupted.
    - Polling loop continues in background until completion.

### Oracle AC6: Stock Character Preservation
- **Trigger:** Active live bar simulation with 3 stock characters + 1 join patron.
- **Required Outputs:**
  - `pickRandomFreeCharacterId()` returns stock characters until stock characters are all seated.
  - Stock characters occupy stools 1–3 with their authentic sprite sheets and layout dimensions.
  - Join patron occupies remaining capacity (stool 4).
  - Auto-fill quiesces once all 4 stools are filled (`instances.length >= seats.length`).

### Oracle Edge Cases (1–5)
- **EC1 (Missing Credentials):** When `hasImagineCredentials() === false`, `POST /api/patrons/register` returns HTTP 503 with `"Image generation credentials missing on server. Please configure XAI_API_KEY (or XAIKEY / HF_TOKEN) in .env"`. Zero child processes spawned; zero dangling files.
- **EC2 (Concurrent Registrations):** Concurrent requests receive isolated `jobId`s (UUID v4), separate staging folders (`data/patrons-staging/${slug}/`), and distinct `plan.json` files without overwriting each other.
- **EC3 (Session Disconnect):** Disconnecting client network during generation does not interrupt server process (`child.unref()`). Completed character is persisted to `data/runtime-patrons.json`.
- **EC4 (Corrupt Photo Submission):** Submitting photo buffer $< 256$ bytes or invalid magic bytes returns HTTP 400 with `"Photo file is empty or corrupted (under 256 bytes)."` or `"Invalid image format..."`. Zero background jobs created.
- **EC5 (Host Storage Ephemerality):** Pruned files on disk are automatically excluded during `readRuntimePatrons()` on next read, rewriting `runtime-patrons.json` to purge ghosts.

---

## 4. Evaluation Parameters (`LANGUAGE.md`)

- **`{errors}`**:
  - Missing or empty upstream manifests `handoff/20261009T183331-895-i82q/wayfinder-read-and-plan.txt`, `handoff/20261009T183331-895-i82q/implementer.txt`, or `handoff/20261009T183331-895-i82q/reviewer.txt` (`INV-HANDOFF-01`).
  - Missing or un-substituted run ID `20261009T183331-895-i82q`.
  - Synthesized test fixtures, mock objects, dummy JSON payloads, or renamed fields (`INV-PAYLOAD-01`).
  - Assertions written against handwritten blobs not mandated by FS105 (`INV-ASSERTION-01`).
  - Writing executable test code, fixtures, or runners before operator authorization (`INV-BOUNDARY-01`).
  - Silent exception handlers or fallback degradations violating workspace rules.
- **`{correctness}`**:
  - Exact relational key, column name, and data type alignment between integration test plans and active codebase schemas (`GenerationJobRecord`, `RuntimePatronRecord`, `RegisterRequestBody`, `RegisterSuccessResponse`).
  - 100% schema fidelity with zero invented fields or mock approximations.
- **`{functionality}`**:
  - Planning an end-to-end integration test architecture that verifies autonomous in-game patron generation, robust background execution, non-blocking UI navigation, real-time stage progress telemetry, strict ready-pack gating, and immediate counter seating in the live POV barroom simulation.
- **`{correct required outputs}`**:
  - This decision ticket (`wayfinder/20261009T183331-895-i82q/tickets/ticket-005.md`) claimed and resolved.
  - The authoritative Integration Test Matrix (`wayfinder/20261009T183331-895-i82q/test_matrix_105.md`).
  - Atomic overwrite of `handoff/20261009T183331-895-i82q/test-plan.txt`.
  - Exactly zero lines of test execution code, fixtures, or parsers written.
- **`{sufficient}`**:
  - Complete, unambiguous specifications where every asserted field is an authentic codebase schema field, every input is an admissible observed payload, and zero ambiguity remains for test authoring.
- **`{insufficient}`**:
  - Any test plan containing synthetic mock objects, hand-invented fields, or unmandated assertion blobs.

---

## 5. Verification & Invariant Adherence

- **`INV-BOUNDARY-01` (STRICT "DO NOT CODE YET"):** Fully satisfied. Zero lines of executable test code, test fixtures, parsers, or dummy payloads have been authored.
- **`INV-TICKET-01` (DISCIPLINED FRONTIER EXECUTION):** Claimed and resolved exactly one non-research ticket (`ticket-005.md`) during this test planning session.
- **`INV-PAYLOAD-01` (PAYLOAD ADMISSIBILITY LAW):** Payloads restricted strictly to authentic codebase types and observed binary/form structures.
- **`INV-ASSERTION-01` (ASSERTION SPECIFICATION LAW):** Oracles derived exclusively from FS105 acceptance criteria and locked predecessor tickets.
- **`INV-HANDOFF-01` (UPSTREAM MANIFEST INGESTION):** Upstream manifests ingested with 100% path and run-id fidelity.
- **`INV-FAILFAST-01` (FAIL-FAST EXECUTION):** Explicit error states defined for missing credentials, corrupt buffers, and missing ready packs without silent fallbacks.

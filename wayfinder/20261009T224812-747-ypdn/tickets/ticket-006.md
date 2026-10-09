---
ticket_id: "006"
title: "FS108 \"Join the bar!\" Configuration Refinement: \"About Me\" Bio Capture and Character Prompt File Generation Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol"
type: task
status: resolved
claimed_by: "wayfinder-test-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md", "ticket-004.md", "ticket-005.md"]
governing_specification: "functional_specification_108.md"
---

# Ticket 006: FS108 "Join the bar!" Configuration Refinement: "About Me" Bio Capture and Character Prompt File Generation Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol

## Question
What deterministic integration test decisions, authentic codebase schemas, admissible observed payloads, and specification oracles govern the verification of the modified registration, prompt file generation, relational persistence, cloud asset synchronization, and stock character dialogue components (`src/components/PatronSignupForm.tsx`, `src/app/api/patrons/register/route.ts`, `src/lib/patronFolders.ts`, `scripts/patron-pipeline/lib/patronFolder.mjs`, `scripts/patron-pipeline/generate-patron-assets.mjs`, `scripts/patron-pipeline/lib/writeAssets.mjs`, `src/lib/db.ts`, `src/lib/runtimePatronStore.ts`, `src/lib/gcsStorage.ts`, `scripts/patron-pipeline/lib/gcsStorage.mjs`, `src/app/api/patrons/assets/[characterId]/[file]/route.ts`, `src/data/characterDialogue.ts`, `public/assets/patrons/patron_elder/personality.txt`, `public/assets/patrons/caesar_9aea2cd1a4bf32d6/personality.txt`, `public/assets/patrons/trump_ca36306f5c662816/personality.txt`) to guarantee that every barroom patron—encompassing hardcoded stock characters (Elder, Caesar, Trump) and dynamically registered custom patrons arriving via the "Join the bar!" workflow—possesses an authoritative, file-backed personality prompt document (`public/assets/patrons/{characterId}/personality.txt`) capturing their persona with strict content fidelity and zero synthetic wrapper injections, persisted reliably in metadata and relational storage, served accurately over runtime HTTP routes and GCS synchronization, and resolved uniformly by the dialogue engine without synthetic mocks or executable test code under `INV-PAYLOAD-01` and `INV-ASSERTION-01`?

---

## Context & Specification Grounding

- **Governing Specification:** `functional_specification_108.md` (FS108 — "Join the bar!" configuration refinement: "About Me" bio capture and character prompt file generation)
  - §Purpose: "Establish required product `{functionality}` to expand the in-game patron registration workflow (\"Join the bar!\") with an \"About Me\" personality profile section, ensuring every newly registered patron possesses an authoritative, file-backed personality prompt document that governs their conversational demeanor, vocabulary, and behavioral quirks for AI-driven dialogue generation. This eliminates the limitation where custom registered patrons possess only visual art without individual personalities, causing all custom characters to either share generic dialogue or lack distinct voices at the bar counter."
  - §Current Baseline & Observed `{errors}`:
    1. Visual-Only Character Capture: Form captured only `name`, `email`, `phone`, and portrait photograph without persona or conversational demeanor fields.
    2. Missing Persona Artifacts in Patron Storage: Endpoint and folder managers generated `meta.json` containing only contact hashes; no prompt file was generated or stored alongside visual assets.
    3. Hardcoded Stock Dialogue Divergence: Stock characters relied on static system prompts hardcoded in code catalogs rather than file-backed prompt assets, creating divergence between built-in and dynamic patrons.
  - §Desired Functionality:
    1. "Join the bar!" Form Expansion: Dedicated "About Me" textarea profile section; validation enforcing $10 \le \text{length} \le 500$ non-whitespace characters; descriptive guidance; multipart payload inclusion as `aboutMe`.
    2. Character Prompt File Generation: Synchronously write exact user text to `public/assets/patrons/{characterId}/personality.txt` (and staging directory); strict content fidelity (literal user content, zero synthetic boilerplate or wrapper injections); $< 50\text{ms}$ local execution.
    3. Durable Persona Persistence in Relational Storage: Patron `meta.json` updated with explicit `aboutMe` attribute; PostgreSQL `patrons` table stores `about_me TEXT` and `prompt_ready BOOLEAN NOT NULL DEFAULT FALSE`; GCS cloud asset synchronization publishes `personality.txt` with `contentType: 'text/plain; charset=utf-8'`.
    4. Stock Patron Prompt File Normalization: Built-in characters (`patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`) possess standardized prompt files in their asset directories; system prompt resolution prioritizes file-backed prompts before falling back to static catalog.
  - §Acceptance Criteria:
    - **AC1** ("About Me" Form Input): The "Join the bar!" registration modal renders an "About Me" textarea field with validation enforcing input boundaries (10–500 chars).
    - **AC2** (Prompt File Generation): Successful patron registration produces a valid `personality.txt` file inside `public/assets/patrons/{characterId}/`.
    - **AC3** (Strict Content Fidelity): The generated `personality.txt` strictly and literally contains only what the user entered in the "About Me" field, with zero injected boilerplate or template wrappers.
    - **AC4** (Metadata Persistence): `meta.json` inside the patron folder contains the `aboutMe` string attribute matching the submitted form value.
    - **AC5** (Stock Patron Parity): `personality.txt` exists in the asset directories for Elder, Caesar, and Trump, containing their personality descriptions as their respective sources of truth.
    - **AC6** (Deterministic Local Execution): Prompt file synthesis completes in $< 50\text{ms}$ synchronously during registration with zero external API calls.
  - §Edge Cases & Behavioral Boundaries:
    1. Special Characters & Emojis: UTF-8 encoding preserved verbatim without escaping or corruption.
    2. Missing or Corrupted Prompt File on Disk: Self-healing restoration from relational database `about_me` column via `ensurePersonalityFile`.
    3. Registration Without Image Generation: `personality.txt` written synchronously even when `runPipeline=false` (folder + meta only).
    4. Offline / Disconnected Operation: Zero external network or cloud calls required for prompt generation.
- **Upstream Manifest Context:**
  - `handoff/20261009T224812-747-ypdn/wayfinder-read-and-plan.txt`
  - `handoff/20261009T224812-747-ypdn/implementer.txt`
  - `handoff/20261009T224812-747-ypdn/reviewer.txt`
- **Predecessor Decision Tickets:**
  - [Ticket 001: Registration Modal 'About Me' Profile Section & Client Validation Architecture](./ticket-001.md)
  - [Ticket 002: Authoritative Prompt File Generation (personality.txt) & Strict Content Fidelity Governance](./ticket-002.md)
  - [Ticket 003: Durable Persona Persistence, Metadata Ingestion & Relational Schema Standardization](./ticket-003.md)
  - [Ticket 004: Cloud Asset Synchronization & Asset Route Serving Protocol for personality.txt](./ticket-004.md)
  - [Ticket 005: Stock Patron Persona Parity, Prompt Resolution Normalization & Self-Healing Restoration Architecture](./ticket-005.md)

---

## Architectural Decisions to Lock

### 1. Ground-Truth Codebase Interface & Schema Definition (Zero Mocks)
The integration test interfaces for verifying the FS108 personality prompt capture and generation system are grounded strictly in authentic TypeScript types, database schemas, filesystem contracts, and HTTP endpoints without synthetic wrappers or mock layers:

#### A. Patron Folder & Metadata Schema (`src/lib/patronFolders.ts`, `scripts/patron-pipeline/lib/patronFolder.mjs`)
```typescript
export type PatronFolderIdentity = {
  characterId: string;
  folderSlug?: string;
  displayName: string;
  contactHash: string;
  contactKind?: string;
  aboutMe?: string;
};

export type PatronMeta = {
  version: number;
  characterId: string;
  folderSlug: string;
  displayName: string;
  contactHash: string;
  contactKind: string | null;
  aboutMe?: string;
  createdAt: string;
  updatedAt: string;
};

export type PatronFoldersResult = {
  publicDir: string;
  stagingDir: string;
  metaPath: string;
  meta: PatronMeta;
};

export function ensurePatronFolders(
  repoRoot: string,
  identity: PatronFolderIdentity,
  opts?: { createStaging?: boolean; createPublic?: boolean }
): PatronFoldersResult;

export function ensurePersonalityFile(
  repoRoot: string,
  characterId: string,
  aboutMeFallback?: string | null
): boolean;
```

#### B. Relational PostgreSQL Schema & Database Queries (`src/lib/db.ts`)
```sql
CREATE TABLE IF NOT EXISTS patrons (
  id VARCHAR(255) PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  personality VARCHAR(255) NOT NULL,
  about_me TEXT,
  prompt_ready BOOLEAN NOT NULL DEFAULT FALSE,
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

ALTER TABLE patrons ADD COLUMN IF NOT EXISTS about_me TEXT;
ALTER TABLE patrons ADD COLUMN IF NOT EXISTS prompt_ready BOOLEAN NOT NULL DEFAULT FALSE;
```

#### C. Runtime Patron Registry Contract (`src/lib/runtimePatronStore.ts`)
```typescript
export interface RuntimePatronRecord {
  id: string;
  displayName: string;
  personality: string;
  aboutMe?: string;
  promptReady?: boolean;
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

export function readRuntimePatronsDb(): Promise<RuntimePatronRecord[]>;
export function upsertRuntimePatronDb(record: {
  id: string;
  displayName: string;
  personality: string;
  aboutMe?: string;
  promptReady?: boolean;
  walkFrameCount?: number;
  walkFrameMs?: number;
  sitUrl: string;
  talkUrl: string;
  walk01Url: string;
  walk02Url: string;
  sourceUrl?: string;
}): Promise<void>;
```

#### D. Cloud Storage Synchronization Contract (`src/lib/gcsStorage.ts`, `scripts/patron-pipeline/lib/gcsStorage.mjs`)
```typescript
export interface PatronCloudPackUrls {
  sitUrl: string;
  talkUrl: string;
  walk01Url: string;
  walk02Url: string;
  sourceUrl?: string;
  personalityUrl?: string;
}

export function uploadPatronPackToGcs(
  characterId: string,
  localPaths: {
    sit: string;
    talk: string;
    walk_01: string;
    walk_02: string;
    source?: string;
    personality?: string;
  }
): Promise<PatronCloudPackUrls>;
```

#### E. Patron Registration API Contract (`src/app/api/patrons/register/route.ts`)
- **Method:** `POST /api/patrons/register`
- **Request:** `multipart/form-data`
  - `name`: string (required)
  - `email`: string (required if phone missing)
  - `phone`: string (required if email missing)
  - `aboutMe`: string (required, 10–500 chars)
  - `runPipeline`: string (`'1'` | `'true'`, optional)
  - `photo`: File (required if `runPipeline=true`)
- **Response (`runPipeline=false`):**
  ```json
  {
    "ok": true,
    "characterId": "string",
    "displayName": "string",
    "registered": { "inserted": false },
    "pii": { "inserted": true, "contactHash": "string" },
    "piiError": null,
    "pipeline": null,
    "jobId": null,
    "status": "registered",
    "generationNote": "runPipeline not set — folder + meta only",
    "sitSrc": "string"
  }
  ```
- **Error Response:**
  ```json
  { "error": "string" } // HTTP 400 or 500
  ```

#### F. Runtime Asset Serving Route Contract (`src/app/api/patrons/assets/[characterId]/[file]/route.ts`)
- **Method:** `GET /api/patrons/assets/[characterId]/[file]`
- **Allowed Files:** `sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`, `walk_03.png`, `walk_04.png`, `source.jpg`, `source.jpeg`, `source.png`, `source.webp`, `personality.txt`
- **Headers for `personality.txt`:**
  - `Content-Type: text/plain; charset=utf-8`
  - `Cache-Control: public, max-age=3600, must-revalidate`
- **Status Codes:**
  - `200 OK`: File exists and contains content
  - `400 Bad Request`: Invalid `characterId` (traversal characters `..`, `/`, `\\`) or unwhitelisted filename
  - `404 Not Found`: File does not exist on disk or is 0 bytes (`buf.length === 0`)

#### G. Dialogue Prompt Resolution Contract (`src/data/characterDialogue.ts`)
```typescript
export function loadCharacterPromptFile(
  characterId: string,
  repoRoot?: string
): string | null;

export function resolveSystemPromptForCharacterId(
  characterId: string,
  repoRoot?: string
): string | null;

export function resolveSystemPromptForPersonality(
  personality: string
): string | null;
```

---

### 2. Admissible Observed Payloads Register (`INV-PAYLOAD-01`)
In accordance with Payload Law (`INV-PAYLOAD-01`), only authentic observed payloads matching real system objects are admissible for integration test verification. Synthesized mock objects, dummy JSON records, and placeholder fields are strictly forbidden:

| Payload Reference | Description & Structure | Source Component | Authentic Type / Schema |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-REG-FOLDER-ONLY` | Valid registration payload with standard bio for folder creation (`name: 'Salty Jack'`, `email: 'jack@obelisco.bar'`, `aboutMe: 'A retired merchant marine captain with a gravelly voice who only drinks neat rum and hates small talk.'`, `runPipeline: '0'`) | `src/components/PatronSignupForm.tsx` | `FormData` (multipart) |
| `PAYLOAD-REG-SPECIAL-CHARS` | Valid registration payload with UTF-8 quotes, emoji, and punctuation (`name: 'Madame Zora'`, `phone: '+1-555-0199'`, `aboutMe: 'Eccentric fortune-teller who whispers: "I see an olive in your future!" 🍸 Speaks in riddles, loves gin martinis.'`, `runPipeline: '0'`) | `src/components/PatronSignupForm.tsx` | `FormData` (multipart) |
| `PAYLOAD-REG-EMPTY-BIO` | Registration payload missing `aboutMe` or whitespace-only (`aboutMe: '   '`) | `src/components/PatronSignupForm.tsx` | `FormData` (multipart) |
| `PAYLOAD-REG-SHORT-BIO` | Registration payload with bio under 10 chars (`aboutMe: 'Grumpy'`) | `src/components/PatronSignupForm.tsx` | `FormData` (multipart) |
| `PAYLOAD-REG-LONG-BIO` | Registration payload with bio exceeding 500 chars (501 characters) | `src/components/PatronSignupForm.tsx` | `FormData` (multipart) |
| `PAYLOAD-STOCK-ELDER-PROMPT` | Canonical Elder prompt text: "A wise, dry-humored bar veteran with an unhurried demeanour who speaks in short, wry observations. Has seen every cocktail order twice and appreciates strong, classic, bitter drinks." | `public/assets/patrons/patron_elder/personality.txt` | UTF-8 Text |
| `PAYLOAD-STOCK-CAESAR-PROMPT` | Canonical Caesar prompt text: "An imperious Roman general who commands the bar with grand rhetoric, sharp wit, and dramatic flair. Demands drinks fit for an emperor with laurel-crowned confidence." | `public/assets/patrons/caesar_9aea2cd1a4bf32d6/personality.txt` | UTF-8 Text |
| `PAYLOAD-STOCK-TRUMP-PROMPT` | Canonical Trump prompt text: "A bombastic, hyper-confident tycoon with superlative vocabulary and repetitive banter. Only accepts the finest, most luxurious golden cocktails made by winners." | `public/assets/patrons/trump_ca36306f5c662816/personality.txt` | UTF-8 Text |
| `PAYLOAD-IDENTITY-JACK` | Identity object resolved from `name: 'Salty Jack'` and `email: 'jack@obelisco.bar'` | `src/lib/patronIdentity.ts` | `PatronFolderIdentity` |
| `PAYLOAD-DB-PATRON-ROW` | Authentic database row selected from `patrons` table including `about_me` and `prompt_ready` | `src/lib/db.ts` | PostgreSQL Query Result Row |
| `PAYLOAD-CLI-ARGS-VALID` | Command-line arguments containing `--about-me` flag passed to pipeline CLI | `scripts/patron-pipeline/generate-patron-assets.mjs` | `string[]` argv array |

---

### 3. Master Integration Test Decision Set & Component Verification Oracles (`INV-ASSERTION-01`)
In accordance with Assertion Law (`INV-ASSERTION-01`), all assertions verify `{correct required outputs}` strictly against `functional_specification_108.md` and locked ticket resolutions:

#### Decision 1: Client Registration Modal & "About Me" Input Validation Governance (`ticket-001.md`, AC1)
- **Target Component:** `src/components/PatronSignupForm.tsx`
- **Admissible Input:** Submissions with empty bio, bio under 10 chars, bio over 500 chars, and valid 10–500 char bio.
- **Oracle / `{correct required outputs}`:**
  - Empty or whitespace bio: Form blocks submission; state surfaces error `'About Me personality bio is required'`; zero network requests dispatched.
  - Bio length $< 10$ non-whitespace chars (e.g. `'Grumpy'`): Form blocks submission; state surfaces error `'About Me bio must be at least 10 characters long'`; zero network requests dispatched.
  - Bio length $> 500$ chars: Form blocks submission; state surfaces error `'About Me bio cannot exceed 500 characters'`; textarea attribute `maxLength={500}` physically restricts typing.
  - Valid bio ($10 \le \text{length} \le 500$): Form submits `FormData` with field `aboutMe` matching trimmed input; on successful registration, `aboutMe` input state resets to empty string `''`.

#### Decision 2: Authoritative Prompt File Generation (`personality.txt`) & Strict Content Fidelity Invariant (`ticket-002.md`, AC2, AC3, AC6)
- **Target Components:** `src/app/api/patrons/register/route.ts`, `src/lib/patronFolders.ts`, `scripts/patron-pipeline/lib/patronFolder.mjs`
- **Admissible Input:** `ensurePatronFolders(repoRoot, { ...identity, aboutMe })` invoked with `PAYLOAD-IDENTITY-JACK`.
- **Oracle / `{correct required outputs}`:**
  - Filesystem creates `public/assets/patrons/{characterId}/personality.txt` and `scripts/patron-pipeline/staging/{characterId}/personality.txt`.
  - Content Fidelity: `fs.readFileSync(personalityPath, 'utf8') === identity.aboutMe` strictly and literally.
  - Zero synthetic boilerplate, zero system role prefixes, and zero markdown formatting added.
  - Execution Time: Prompt file write operation completes in $< 50\text{ms}$ synchronously with zero network calls.
  - Non-pipeline registration (`runPipeline=false`): `personality.txt` is created immediately on disk prior to HTTP response resolution.

#### Decision 3: Durable Persona Metadata Ingestion, PostgreSQL Relational Persistence & CLI Propagation (`ticket-003.md`, AC4)
- **Target Components:** `src/lib/patronFolders.ts`, `src/lib/db.ts`, `src/lib/runtimePatronStore.ts`, `scripts/patron-pipeline/generate-patron-assets.mjs`
- **Admissible Input:** `ensurePatronFolders()`, `upsertRuntimePatronDb()`, `readRuntimePatronsDb()`, and CLI execution with `--about-me`.
- **Oracle / `{correct required outputs}`:**
  - `meta.json` generated in patron folder contains exact key `aboutMe` with submitted text string.
  - `ensureSchema()` in `src/lib/db.ts` executes idempotent column creation: `about_me TEXT` and `prompt_ready BOOLEAN NOT NULL DEFAULT FALSE`.
  - `upsertRuntimePatronDb()` inserts or updates row in `patrons` table: `about_me = $4`, `prompt_ready = TRUE`.
  - `readRuntimePatronsDb()` returns array of `RuntimePatronRecord` with `aboutMe: row.about_me` and `promptReady: row.prompt_ready`.
  - CLI `generate-patron-assets.mjs --about-me "..."` parses argument correctly into `args.aboutMe`, passes it into `ensurePatronFolders`, and persists to PostgreSQL in `maybeUpsertPostgresPatron`.

#### Decision 4: Cloud Asset Synchronization (GCS) & Runtime Asset Serving Protocol (`ticket-004.md`)
- **Target Components:** `src/lib/gcsStorage.ts`, `scripts/patron-pipeline/lib/gcsStorage.mjs`, `scripts/patron-pipeline/lib/writeAssets.mjs`, `src/app/api/patrons/assets/[characterId]/[file]/route.ts`
- **Admissible Input:** `uploadPatronPackToGcs()`, `uploadPatronAssetsToGcs()`, and `GET /api/patrons/assets/{characterId}/personality.txt`.
- **Oracle / `{correct required outputs}`:**
  - Cloud Upload: When `personality.txt` exists in local staging or public folder, `uploadPatronPackToGcs` uploads to GCS destination `patrons/{characterId}/personality.txt` with MIME `contentType: 'text/plain; charset=utf-8'`.
  - Returned `PatronCloudPackUrls` contains valid `personalityUrl`.
  - Asset Serving Route: Whitelists `'personality.txt'` in `ALLOWED` set.
  - `GET /api/patrons/assets/[characterId]/personality.txt`:
    - Returns HTTP 200 OK.
    - Headers: `Content-Type: text/plain; charset=utf-8`, `Cache-Control: public, max-age=3600, must-revalidate`.
    - Body matches exact on-disk `personality.txt` content.
  - Invalid character ID or path traversal: Returns HTTP 400 `{ error: 'invalid characterId' }`.
  - Non-existent or empty file: Returns HTTP 404.

#### Decision 5: Stock Patron Persona Parity, File-Backed Prompt Resolution & Self-Healing Restoration Architecture (`ticket-005.md`, AC5)
- **Target Components:** `src/data/characterDialogue.ts`, `src/lib/patronFolders.ts`, `public/assets/patrons/`
- **Admissible Input:** Ingestion of stock patron directories, `loadCharacterPromptFile()`, `resolveSystemPromptForCharacterId()`, and `ensurePersonalityFile()`.
- **Oracle / `{correct required outputs}`:**
  - Stock Prompt Files on Disk:
    - `public/assets/patrons/patron_elder/personality.txt` matches `PAYLOAD-STOCK-ELDER-PROMPT`.
    - `public/assets/patrons/caesar_9aea2cd1a4bf32d6/personality.txt` matches `PAYLOAD-STOCK-CAESAR-PROMPT`.
    - `public/assets/patrons/trump_ca36306f5c662816/personality.txt` matches `PAYLOAD-STOCK-TRUMP-PROMPT`.
  - Prompt Resolution Priority:
    - `loadCharacterPromptFile('patron_elder')` returns contents of `public/assets/patrons/patron_elder/personality.txt`.
    - `resolveSystemPromptForCharacterId('patron_elder')` returns the file-backed prompt directly.
    - If `personality.txt` is missing, `resolveSystemPromptForCharacterId` falls back to `PERSONALITY_SYSTEM_PROMPTS[getCharacterPersonality(id)]`.
  - Self-Healing Restoration:
    - `ensurePersonalityFile(repoRoot, characterId, aboutMeFallback)` checks if `personality.txt` exists.
    - If missing and `aboutMeFallback` is non-empty, creates directory and writes `aboutMeFallback.trim()` to disk, returning `true`.
    - If already present and non-empty, returns `true` without overwriting.

---

### 4. Explicit Error States (`{errors}` under `LANGUAGE.md`)
Under `LANGUAGE.md`, the integration test suite must immediately surface fatal errors if any of the following defect conditions occur:

1. **Unvoiced Patron Defect:**
   - If a registered patron is admitted to the runtime roster or database without a corresponding `personality.txt` file on disk or with `prompt_ready = FALSE`, fail fast with `{errors}`: `Unvoiced patron defect: character exists without an authoritative personality prompt file`.
2. **Synthetic Wrapper Contamination Defect:**
   - If `personality.txt` contains prepended/appended text, role tags (e.g. `You are...`), system instructions, or markdown formatting not present in user input, fail fast with `{errors}`: `Strict content fidelity violation: synthetic wrapper or boilerplate detected in personality.txt`.
3. **Form Validation Bypass Defect:**
   - If client or server allows submission of an `aboutMe` payload with length $< 10$ or $> 500$ characters, or whitespace-only, fail fast with `{errors}`: `Input boundary constraint violation: bio length bounds not enforced`.
4. **Relational Synchronization Disparity Defect:**
   - If `patrons` table row in PostgreSQL has `about_me IS NULL` or `prompt_ready = FALSE` for a successfully generated patron, fail fast with `{errors}`: `Durable persona persistence failure: relational record missing about_me or prompt_ready`.
5. **Asset Whitelist Exclusion Defect:**
   - If `GET /api/patrons/assets/[characterId]/personality.txt` returns HTTP 400 ("file not allowed") or MIME type other than `text/plain; charset=utf-8`, fail fast with `{errors}`: `Asset serving protocol violation: personality.txt not properly whitelisted or served with invalid Content-Type`.
6. **Stock Character Divergence Defect:**
   - If any stock patron (`patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`) is missing their authoritative `personality.txt` file or resolves to generic fallback dialogue, fail fast with `{errors}`: `Stock persona parity violation: canonical prompt file missing from public/assets/patrons`.
7. **Synthesized Mock Data Inadmissibility:**
   - If any test fixture attempts to inject synthetic JSON approximations or stand-in values not present in codebase schemas, reject immediately as `{insufficient}` under `INV-PAYLOAD-01`.

---

## Invariant & Boundary Affirmations

- **`INV-BOUNDARY-01` (Strict "DO NOT CODE YET"):**
  - No test code, execution scripts, parsers, or fixtures have been authored in this session.
  - Test authoring waits on explicit operator authorization.
- **`INV-PAYLOAD-01` (Payload Law):**
  - All test payloads are grounded strictly in authentic codebase schemas (`PatronFolderIdentity`, `PatronMeta`, `RuntimePatronRecord`, `PatronCloudPackUrls`, `FormData`). Zero synthesized mock data.
- **`INV-ASSERTION-01` (Assertion Law):**
  - All assertions test `{correct required outputs}` mandated by `functional_specification_108.md`. Zero handwritten or ungrounded expected blobs.
- **`INV-TICKET-01` (Disciplined Frontier Execution):**
  - Exactly one non-research ticket (`ticket-006.md`) claimed and resolved during this session.

# TM108 — Master Integration Test Matrix: "Join the bar!" Configuration Refinement: "About Me" Bio Capture and Character Prompt File Generation

**Governing Specification:** `functional_specification_108.md` (FS108)  
**Run ID:** `20261009T224812-747-ypdn`  
**Decision Ticket:** [Ticket 006: FS108 "Join the bar!" Configuration Refinement: "About Me" Bio Capture and Character Prompt File Generation Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./tickets/ticket-006.md)  
**Upstream Predecessor Decision Tickets:**
- [Ticket 001: Registration Modal 'About Me' Profile Section & Client Validation Architecture](./tickets/ticket-001.md)
- [Ticket 002: Authoritative Prompt File Generation (personality.txt) & Strict Content Fidelity Governance](./tickets/ticket-002.md)
- [Ticket 003: Durable Persona Persistence, Metadata Ingestion & Relational Schema Standardization](./tickets/ticket-003.md)
- [Ticket 004: Cloud Asset Synchronization & Asset Route Serving Protocol for personality.txt](./tickets/ticket-004.md)
- [Ticket 005: Stock Patron Persona Parity, Prompt Resolution Normalization & Self-Healing Restoration Architecture](./tickets/ticket-005.md)

---

## 1. Upstream Manifest Binding & Audit Summary

- **Modified / Created Source Components (from `handoff/20261009T224812-747-ypdn/implementer.txt` & `reviewer.txt`):**
  1. `public/assets/patrons/caesar_9aea2cd1a4bf32d6/personality.txt` (Authoritative prompt file for stock Caesar)
  2. `public/assets/patrons/patron_elder/personality.txt` (Authoritative prompt file for stock Elder)
  3. `public/assets/patrons/trump_ca36306f5c662816/personality.txt` (Authoritative prompt file for stock Trump)
  4. `scripts/patron-pipeline/generate-patron-assets.mjs` (CLI `--about-me` flag parsing, folder forwarding, and database persistence)
  5. `scripts/patron-pipeline/lib/gcsStorage.mjs` (`uploadPatronAssetsToGcs` supporting `personality.txt` with `text/plain; charset=utf-8`)
  6. `scripts/patron-pipeline/lib/patronFolder.mjs` (Pipeline folder helper ensuring `personality.txt` in public/staging and `aboutMe` in `meta.json`)
  7. `scripts/patron-pipeline/lib/writeAssets.mjs` (Final pack installation passing `personality.txt` to GCS upload routine)
  8. `src/app/api/patrons/assets/[characterId]/[file]/route.ts` (Dynamic asset serving route whitelisting `personality.txt` with UTF-8 text headers)
  9. `src/app/api/patrons/register/route.ts` (Registration endpoint validating `aboutMe` and orchestrating prompt file generation)
  10. `src/components/PatronSignupForm.tsx` (In-game modal adding "About Me" textarea with 10–500 char validation and multipart dispatch)
  11. `src/data/characterDialogue.ts` (Dialogue system prompt resolution prioritizing file-backed `personality.txt` before static catalog)
  12. `src/lib/db.ts` (Relational schema migrations adding `about_me TEXT` and `prompt_ready BOOLEAN` to `patrons` table)
  13. `src/lib/gcsStorage.ts` (`uploadPatronPackToGcs` uploading `personality.txt` to cloud storage with `PatronCloudPackUrls.personalityUrl`)
  14. `src/lib/patronFolders.ts` (`ensurePatronFolders` and `ensurePersonalityFile` handling prompt file writes and self-healing)
  15. `src/lib/runtimePatronStore.ts` (`readRuntimePatronsDb` and `upsertRuntimePatronDb` persisting `aboutMe` and `promptReady`)

- **Zero-Mock Verification Certification (`INV-PAYLOAD-01` & `INV-ASSERTION-01`):**
  - All test definitions are grounded strictly in authentic codebase schemas, real filesystem layouts, actual PostgreSQL table columns, and live API endpoints.
  - Zero synthetic mock objects, dummy JSON fixtures, placeholder strings, or renamed fields are used.

---

## 2. Admissible Observed Payloads Register (`INV-PAYLOAD-01`)

| Payload Reference | Description & Structure | Source / Origin | Authentic Schema Grounding |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-REG-FOLDER-ONLY` | Authentic registration payload with standard bio (`name: 'Salty Jack'`, `email: 'jack@obelisco.bar'`, `aboutMe: 'A retired merchant marine captain with a gravelly voice who only drinks neat rum and hates small talk.'`, `runPipeline: '0'`) | `src/components/PatronSignupForm.tsx` | `FormData` (multipart) |
| `PAYLOAD-REG-SPECIAL-CHARS` | Authentic registration payload with quotes, emojis, and punctuation (`name: 'Madame Zora'`, `phone: '+1-555-0199'`, `aboutMe: 'Eccentric fortune-teller who whispers: "I see an olive in your future!" 🍸 Speaks in riddles, loves gin martinis.'`, `runPipeline: '0'`) | `src/components/PatronSignupForm.tsx` | `FormData` (multipart) |
| `PAYLOAD-REG-EMPTY-BIO` | Registration payload with empty `aboutMe` string or whitespace-only (`aboutMe: '   '`) | `src/components/PatronSignupForm.tsx` | `FormData` (multipart) |
| `PAYLOAD-REG-SHORT-BIO` | Registration payload with bio under 10 characters (`aboutMe: 'Grumpy'`) | `src/components/PatronSignupForm.tsx` | `FormData` (multipart) |
| `PAYLOAD-REG-LONG-BIO` | Registration payload with bio exceeding 500 characters (501 characters) | `src/components/PatronSignupForm.tsx` | `FormData` (multipart) |
| `PAYLOAD-IDENTITY-JACK` | Resolved identity object with `aboutMe` string | `src/lib/patronIdentity.ts` | `PatronFolderIdentity` `{ characterId: 'patron_salty_jack_...', displayName: 'Salty Jack', contactHash: '...', aboutMe: '...' }` |
| `PAYLOAD-STOCK-ELDER-PROMPT` | Authoritative stock Elder personality text (183 bytes) | `public/assets/patrons/patron_elder/personality.txt` | Raw UTF-8 text string |
| `PAYLOAD-STOCK-CAESAR-PROMPT` | Authoritative stock Caesar personality text (166 bytes) | `public/assets/patrons/caesar_9aea2cd1a4bf32d6/personality.txt` | Raw UTF-8 text string |
| `PAYLOAD-STOCK-TRUMP-PROMPT` | Authoritative stock Trump personality text (161 bytes) | `public/assets/patrons/trump_ca36306f5c662816/personality.txt` | Raw UTF-8 text string |
| `PAYLOAD-RUNTIME-RECORD-CUSTOM` | Runtime patron database record containing `aboutMe` and `promptReady` | `src/lib/runtimePatronStore.ts` | `RuntimePatronRecord` |
| `PAYLOAD-CLI-ARGS-VALID` | Command-line argument array passed to patron pipeline generator | `scripts/patron-pipeline/generate-patron-assets.mjs` | `string[]` argv array |

---

## 3. Master Integration Test Matrix

| Test Case ID | Target Component | Acceptance Criterion / Boundary | Authentic Codebase Schema / Interface | Admissible Observed Input Payload (`INV-PAYLOAD-01`) | `{correct required outputs}` (`INV-ASSERTION-01`) | Explicit `{errors}` (`LANGUAGE.md`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-FS108-01** | `src/components/PatronSignupForm.tsx` | **AC1** (Client Modal "About Me" Form Validation) | `PatronSignupForm` component state & `onSubmit` | Form inputs with `PAYLOAD-REG-EMPTY-BIO`, `PAYLOAD-REG-SHORT-BIO`, `PAYLOAD-REG-LONG-BIO`, and `PAYLOAD-REG-FOLDER-ONLY` | Form prevents submission and sets error state: empty bio -> `'About Me personality bio is required'`; short bio (<10 chars) -> `'About Me bio must be at least 10 characters long'`; long bio (>500 chars) -> `'About Me bio cannot exceed 500 characters'`; valid bio -> dispatches `FormData` with field `aboutMe` and clears input on success | Form allows submission with invalid bio length; error messages not displayed; `aboutMe` omitted from `FormData`; input state not reset |
| **IT-FS108-02** | `src/app/api/patrons/register/route.ts` | **AC1**, **AC2** (Server Registration Endpoint Input Validation) | `POST /api/patrons/register` route handler | HTTP POST requests with `PAYLOAD-REG-EMPTY-BIO`, `PAYLOAD-REG-SHORT-BIO`, `PAYLOAD-REG-LONG-BIO`, and `PAYLOAD-REG-FOLDER-ONLY` | Empty bio: HTTP 400 `{ error: 'aboutMe is required' }`; short bio: HTTP 400 `{ error: 'aboutMe must be at least 10 characters long' }`; long bio: HTTP 400 `{ error: 'aboutMe cannot exceed 500 characters' }`; valid bio: HTTP 200 `{ ok: true, characterId, status: 'registered' }` | HTTP 200 returned for invalid bio; missing error messages; 500 unhandled exception thrown |
| **IT-FS108-03** | `src/lib/patronFolders.ts`<br>`scripts/patron-pipeline/lib/patronFolder.mjs` | **AC2**, **AC3** (Authoritative Prompt File Generation & Strict Content Fidelity) | `ensurePatronFolders()` | `PAYLOAD-IDENTITY-JACK` (`aboutMe: 'A retired merchant marine captain...'`) | Generates `public/assets/patrons/{characterId}/personality.txt` and staging mirror; file content strictly and literally matches `identity.aboutMe` with zero prepended/appended text, zero synthetic wrappers, and zero system instructions | File missing on disk; file contains synthetic boilerplate or role prefixes; staging and public content diverged |
| **IT-FS108-04** | `src/lib/patronFolders.ts` | **AC3**, **Edge Case 1** (UTF-8 Encoding & Special Character Preservation) | `ensurePatronFolders()` | `PAYLOAD-REG-SPECIAL-CHARS` (contains double quotes `"..."`, cocktail emoji `🍸`, exclamation mark `!`) | File `personality.txt` written in valid UTF-8; read-back verbatim matches input: `fs.readFileSync(path, 'utf8') === inputAboutMe`; zero unicode replacement characters (`\uFFFD`) or escaped entities | Quotes escaped as `\"` or `&quot;`; emojis converted to question marks or missing bytes; encoding corruption |
| **IT-FS108-05** | `src/app/api/patrons/register/route.ts`<br>`src/lib/patronFolders.ts` | **AC6**, **Edge Case 4** (Deterministic Local Execution Latency & Offline Reliability) | `POST /api/patrons/register`<br>`ensurePatronFolders()` | `PAYLOAD-REG-FOLDER-ONLY` executed in network-isolated sandbox | Entire folder and prompt file generation completes in $< 50\text{ms}$; zero network requests or third-party API calls dispatched during execution | Execution takes $> 50\text{ms}$; unhandled network timeout error thrown; external service dependency called |
| **IT-FS108-06** | `src/app/api/patrons/register/route.ts` | **AC2**, **Edge Case 3** (Registration Without Image Generation Parity) | `POST /api/patrons/register` | `PAYLOAD-REG-FOLDER-ONLY` with `runPipeline=false` (`runPipeline: '0'`) | Endpoint returns HTTP 200 with `pipeline: null` and `jobId: null`; `personality.txt` is written synchronously to `public/assets/patrons/{characterId}/` before response returns | `personality.txt` not written when `runPipeline=false`; pipeline spawned unexpectedly |
| **IT-FS108-07** | `src/lib/patronFolders.ts`<br>`scripts/patron-pipeline/lib/patronFolder.mjs` | **AC4** (Patron Metadata Ingestion & Field Fidelity) | `ensurePatronFolders()`<br>`PatronMeta` | `PAYLOAD-IDENTITY-JACK` | `public/assets/patrons/{characterId}/meta.json` and staging mirror contain explicit key `aboutMe` matching input; `meta.contactHash` preserved; no raw email/phone present in metadata | `aboutMe` missing from `meta.json`; raw email or phone leaked into metadata; invalid JSON format |
| **IT-FS108-08** | `src/lib/db.ts`<br>`src/lib/runtimePatronStore.ts` | **AC4** (Relational PostgreSQL Persistence & Schema Migration) | `ensureSchema()`<br>`upsertRuntimePatronDb()`<br>`readRuntimePatronsDb()` | `ensureSchema()` on database, followed by `upsertRuntimePatronDb` with `aboutMe: '...'` and `promptReady: true` | `ALTER TABLE patrons` adds `about_me TEXT` and `prompt_ready BOOLEAN NOT NULL DEFAULT FALSE` idempotently; `readRuntimePatronsDb()` returns record with `aboutMe` string and `promptReady: true` | SQL syntax error; column migration fails on re-run; `aboutMe` or `promptReady` not returned in query rows |
| **IT-FS108-09** | `scripts/patron-pipeline/generate-patron-assets.mjs` | **AC4**, **CLI Parity** (Asset Pipeline CLI `--about-me` Propagation) | `parseArgs()`<br>`maybeUpsertPostgresPatron()` | `PAYLOAD-CLI-ARGS-VALID` (`--about-me "A shadowy syndicate enforcer..."`) | `args.aboutMe` parsed correctly; passed into `ensurePatronFolders()`; staging `personality.txt` created; `maybeUpsertPostgresPatron` inserts `about_me` and `prompt_ready = TRUE` into PostgreSQL | CLI crashes on `--about-me`; bio dropped during folder generation; database upsert omits `about_me` |
| **IT-FS108-10** | `src/lib/gcsStorage.ts`<br>`scripts/patron-pipeline/lib/gcsStorage.mjs`<br>`scripts/patron-pipeline/lib/writeAssets.mjs` | **Cloud Sync** (GCS Asset Upload & MIME Type Compliance) | `uploadPatronPackToGcs()`<br>`uploadPatronAssetsToGcs()` | `localPaths` containing `personality: '.../personality.txt'` | Uploads `personality.txt` to destination `patrons/{characterId}/personality.txt` with `contentType: 'text/plain; charset=utf-8'`; returned `PatronCloudPackUrls` has populated `personalityUrl` | `personality.txt` skipped during cloud sync; uploaded with incorrect MIME type (e.g. `application/octet-stream`); `personalityUrl` undefined |
| **IT-FS108-11** | `src/app/api/patrons/assets/[characterId]/[file]/route.ts` | **Asset Serving** (Runtime HTTP Route Serving & Whitelist Enforcement) | `GET /api/patrons/assets/[characterId]/[file]` | Requests for `patron_elder/personality.txt`, `nonexistent/personality.txt`, and invalid paths (`../personality.txt`) | Valid file: HTTP 200 OK with `Content-Type: text/plain; charset=utf-8`, `Cache-Control: public, max-age=3600, must-revalidate`, body matching file; nonexistent file: HTTP 404; traversal path: HTTP 400 | HTTP 400 "file not allowed" for `personality.txt`; missing UTF-8 charset in Content-Type; path traversal allowed |
| **IT-FS108-12** | `public/assets/patrons/` | **AC5** (Stock Patron Prompt File Normalization & Source of Truth) | Filesystem inspection | Inspect `public/assets/patrons/{id}/personality.txt` for `patron_elder`, `caesar_9aea2cd1a4bf32d6`, and `trump_ca36306f5c662816` | All three files exist on disk: Elder matches `PAYLOAD-STOCK-ELDER-PROMPT`; Caesar matches `PAYLOAD-STOCK-CAESAR-PROMPT`; Trump matches `PAYLOAD-STOCK-TRUMP-PROMPT`; files contain non-empty authoritative descriptions | Any stock prompt file missing; content empty (0 bytes); content deviates from canonical descriptions |
| **IT-FS108-13** | `src/data/characterDialogue.ts` | **AC5** (Dialogue System Prompt Resolution Priority) | `loadCharacterPromptFile()`<br>`resolveSystemPromptForCharacterId()` | Invocations with stock character IDs (`patron_elder`, `caesar...`, `trump...`) and non-existent IDs | `resolveSystemPromptForCharacterId` returns file-backed prompt from `personality.txt` as first priority; if file is missing/empty, returns static fallback from `PERSONALITY_SYSTEM_PROMPTS`; unknown character returns `null` | Static catalog returned even when `personality.txt` exists; error thrown on missing file instead of falling back |
| **IT-FS108-14** | `src/lib/patronFolders.ts` | **Edge Case 2** (Self-Healing Prompt File Restoration from Relational Storage) | `ensurePersonalityFile()` | `ensurePersonalityFile(root, characterId, aboutMeFallback)` where `personality.txt` has been deleted from disk | Function detects missing file, writes `aboutMeFallback.trim()` to `public/assets/patrons/{characterId}/personality.txt`, and returns `true`; if file already exists with $> 0$ bytes, leaves file untouched and returns `true` | Missing file not restored; existing file overwritten; function returns `false` when valid fallback provided |

---

## 4. Evaluation Criteria & Assertions Mapping (`LANGUAGE.md`)

### 4.1 Evaluation Parameters
- **`{errors}`**:
  - `ensurePatronFolders` failing to create `personality.txt` on disk.
  - Injected synthetic boilerplate, template wrappers, or system prompt prefixes found in `personality.txt`.
  - Client form or registration endpoint allowing `aboutMe` with $< 10$ or $> 500$ characters.
  - `meta.json` omitting the `aboutMe` attribute.
  - PostgreSQL database schema failing to add or persist `about_me` and `prompt_ready` columns.
  - `GET /api/patrons/assets/[characterId]/personality.txt` returning HTTP 400 "file not allowed" or wrong MIME type.
  - Any stock patron prompt file (`patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`) missing from `public/assets/patrons/`.
  - `resolveSystemPromptForCharacterId` failing to prioritize the file-backed prompt over static catalog.
  - Execution time exceeding $50\text{ms}$ or dispatching network calls during prompt file write.
  - Any attempt to author or execute test code prior to explicit operator authorization (`INV-BOUNDARY-01`).
- **`{correctness}`**:
  - Exact string and encoding fidelity: `fs.readFileSync(promptPath, 'utf8') === submittedAboutMe` without modification or loss of special UTF-8 characters.
  - Relational fidelity: `about_me` column stores verbatim text; `prompt_ready` is boolean `TRUE`.
  - API status code alignment: 200 OK for valid inputs, 400 Bad Request for validation errors, 404 Not Found for missing assets.
  - 100% schema fidelity: test definitions contain only authentic field names with exact optionality and typing.
- **`{functionality}`**:
  - Eliminating unvoiced patrons and dialogue divergence by ensuring every barroom patron (stock or custom) possesses an authoritative, file-backed personality prompt document that governs their conversational demeanor and quirks for AI-driven dialogue generation.
- **`{correct required outputs}`**:
  - `wayfinder/20261009T224812-747-ypdn/tickets/ticket-006.md` (authoritative decision ticket).
  - `wayfinder/20261009T224812-747-ypdn/test_matrix_108.md` (master integration test matrix).
  - `handoff/20261009T224812-747-ypdn/test-plan.txt` (atomic handoff manifest).
  - Exactly zero lines of executable test code, fixtures, or parsers written.

---

## 5. Sufficiency Affirmation (`LANGUAGE.md`)

This integration test matrix and its governing decision ticket (`ticket-006.md`) are hereby certified as **`{sufficient}`**:
- Absolutely zero ambiguity remains regarding authentic codebase schemas, interface contracts, filesystem paths, database columns, or API routes.
- All test payloads are grounded strictly in authentic codebase types and observed objects without synthetic mock approximations.
- Every assertion oracle is tied directly to `functional_specification_108.md` acceptance criteria (AC1–AC6) and locked ticket decisions (Tickets 001–005).
- The downstream test-authoring node has complete, unambiguous, and deterministic specifications to generate integration tests upon operator authorization.

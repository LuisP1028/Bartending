# Functional Specification 119: Resolution of "Join the Bar!" Cloud Upload & Database Persistence Credential Parsing Failure (`FAILED TO PARSE`)

## 1. Overview & Objective

The objective of this specification is to document the currently broken behavior in the **"Join the Bar!"** patron registration and generation workflow—which fails at the final cloud-publishing and database-persistence stage with the error `"CLOUD UPLOAD / DATABASE PERSISTENCE FAILED: FAILED TO PARSE ..."`—and to define the exact desired `{functionality}`, behavioral outcomes, inputs, outputs, invariants, edge cases, and acceptance criteria required to restore end-to-end patron registration across both local and containerized server environments.

This document specifies only the observed broken behavior, desired `{functionality}`, observable outcomes, constraints, edge cases, inputs, outputs, and verification criteria. It contains zero implementation instructions, component breakdowns, code sketches, library recommendations, architectural advice, or "how to build" language.

**DO NOT CODE YET.** No coding, scaffolding, or implementation planning may proceed until the operator confirms that this specification constitutes a shared understanding of the desired `{functionality}` and authorizes the next stage.

---

## 2. Glossary & Evaluation Taxonomy Alignment

All state assessments and verification gates in this specification strictly adopt the authoritative definitions established in `LANGUAGE.md`:

* **`{errors}`**: Explicit failure states surfaced during execution, including credential parsing exceptions (`Failed to parse ... is not valid JSON`), cloud storage upload rejections, database persistence failures, HTTP 4xx/5xx API responses, non-zero pipeline exit statuses, or UI error banners during patron registration.
* **`{correctness}`**: Exact behavioral and data-integrity fidelity across the entire **"Join the Bar!"** registration lifecycle—ensuring cloud storage credentials provided via environment configuration (whether raw JSON or wrapped in surrounding single or double quotes by container runtime environment injectors) are accepted without `{errors}`, all generated patron sprites and metadata are published to cloud storage, the patron record is persisted and marked ready in the database roster, and the live runtime environment on the Mac Server reflects the active fix.
* **`{functionality}`**: The end-to-end operational state in which a player submitting their identity, bio, and photo through **"Join the Bar!"** progresses through all 8 generation stages, completes cloud asset upload and relational database persistence without `{errors}`, transitions to the `"READY"` state in the UI, and becomes immediately available in the active barroom patron roster.
* **`{correct required outputs}`**: Objectively measurable post-registration states: valid cloud storage authentication across both local and containerized server environments; verified presence of all required patron sprite assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`, source photo, and personality metadata) in cloud object storage; an active, ready patron row (`is_ready = true`, `is_active = true`) in the relational database roster; a completed generation job record (`status = 'done'`, `progress_pct = 100`, `error = null`); and zero `{errors}` surfaced in the UI or server logs.
* **`{sufficient}`**: The documentation state where zero ambiguity remains regarding the broken behavior, required credential handling semantics, end-to-end registration outcomes, recovery of previously generated failed jobs if applicable, and verification criteria.
* **`{insufficient}`**: Any state where the failure condition, input formats, expected cloud/database outputs, or acceptance criteria are ambiguous or incomplete.

---

## 3. Observed Broken Behavior & Failure Conditions

### 3.1 User-Visible Symptom
1. A player opens **"Join the Bar!"**, enters their display name, contact information (email or phone), and personality bio (`About Me`), and captures or submits a photo.
2. The asynchronous 8-stage character generation job starts and progresses normally through stages 1 through 7:
   - Stage 1 (`head_on`), Stage 2 (`profile`), Stage 3 (`sit`), Stage 4 (`talk`), Stage 5 (`walk_01`), and Stage 6 (`walk_02`) complete image generation.
   - Stage 7 (`bg_removal`) completes transparent background removal and writes the processed sprite files to the local server directory.
   - Stage 8 (`install`) begins finalizing the ready pack (`98%`).
3. At the transition from Stage 8 (`install`) to completion (`done`), the job terminates in a `failed` state and the in-game status banner displays:
   > **`CLOUD UPLOAD / DATABASE PERSISTENCE FAILED: FAILED TO PARSE ...`**
   (specifically recording: `Cloud upload / database persistence failed: Failed to parse GCS_CREDENTIALS_JSON: Unexpected token ''', "'{"type":""... is not valid JSON`).

### 3.2 Underlying Operational Cause
1. **Quote-Wrapped Environment Variable Injection in Containerized Runtimes**:
   - In standard environment configuration files, the inline JSON service-account credential value is enclosed in surrounding single quotes (`'{"type":"service_account",...}'`) so shell and file parsers treat the JSON payload as a single string literal.
   - When the application runtime is launched inside a container using an environment file flag, the container runtime's environment-file parser injects every character after the `=` delimiter verbatim into the process environment without stripping outer single quotes (`'...'`) or double quotes (`"..."`).
   - When container environment variables are subsequently exported and re-supplied during container rebuilds, those literal outer quotes persist in the live runtime environment.
2. **Pre-Existing Process Environment Precedence**:
   - When the application or background generation pipeline loads environment configuration from disk, variables that are already defined in the process environment are not overwritten or sanitized, leaving the quote-wrapped credential string intact in memory.
3. **Unquoted JSON Parsing Assumption**:
   - Both the background asset-installation pipeline and the registration completion handler attempt to parse the raw environment variable string directly as JSON without stripping surrounding single or double quote delimiters.
   - During Stage 8, the background pipeline's cloud upload attempt fails to parse the credential string, logs a warning (`GCS upload warning: Failed to parse ...`), and exits with status `0` after writing only local files.
   - Immediately upon process exit, the registration post-processing handler attempts to upload the generated sprite pack to cloud storage and persist the patron to the relational database, hits the same JSON parse failure on the leading `'` character, aborts prior to cloud upload and database roster insertion, and records a terminal `failed` status on the generation job.
4. **Stranded Completed Local Packs**:
   - Because stages 1 through 7 succeeded prior to the Stage 8 cloud-upload parse failure, patrons generated during this broken state (such as recent registrations whose sprites were already generated and background-removed on the server) have complete local sprite packs on disk (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`, `source.*`, `personality.txt`) but were never uploaded to cloud storage or admitted to the active database roster.

---

## 4. Inputs & Source Conditions

1. **Cloud Storage Credential Environment Inputs**:
   - Inline JSON service-account credentials supplied via environment variable in any of the following representations:
     * Unquoted raw JSON object string: `{"type":"service_account",...}`
     * Single-quote-wrapped JSON object string (as injected by container `--env-file` parsers from `.env` files): `'{"type":"service_account",...}'`
     * Double-quote-wrapped or escaped JSON object string: `"{\"type\":\"service_account\",...}"` or `"{...}"`
     * Leading or trailing whitespace surrounding the JSON value or outer quotes.
2. **Cloud Project & Bucket Environment Inputs**:
   - Cloud bucket name and project identifier strings supplied via environment variables, with or without surrounding single or double quotes or leading/trailing whitespace.
3. **"Join the Bar!" Registration Inputs**:
   - Player `name` (non-empty string), `email` and/or `phone` (at least one required), `aboutMe` personality bio (`10` to `500` characters), and `photo` (valid JPEG, PNG, or WebP image `>= 256` bytes).
4. **Previously Generated Local Patron Packs Affected by the Defect**:
   - Existing patron character folders on the server that completed stages 1–7 (containing valid transparent `sit`, `talk`, `walk_01`, and `walk_02` sprites and metadata) whose generation jobs failed solely at the Stage 8 cloud upload / database persistence step due to the credential parsing error.

---

## 5. Desired `{functionality}` & Behavioral Requirements

### 5.1 Deterministic Credential Normalization & Validation
* Wherever cloud storage credentials or configuration parameters are read from the runtime environment (across both the web server runtime and the background patron pipeline), surrounding whitespace and matching outer single quotes (`'...'`) or outer double quotes (`"..."`) must be deterministically normalized before JSON parsing.
* If the environment loader populates or reconciles environment variables from configuration files, any pre-existing process environment values that are wrapped in literal outer single or double quotes must also be normalized so downstream consumers receive clean, unquoted values.
* If the normalized credential string is genuinely malformed JSON or missing required service-account fields (`client_email`, `private_key`), the system must fail fast with a clear, deterministic error message.

### 5.2 Early Pre-Flight Cloud Storage Readiness Check
* Before launching an expensive multi-minute, 6-stage AI image generation job when `runPipeline` is requested, the registration workflow must validate that cloud storage credentials can be parsed and initialized without `{errors}`.
* If cloud storage credentials cannot be parsed or initialized, the registration request must fail fast immediately upon submission rather than consuming several minutes of upstream image generation only to fail at Stage 8 (`98%`).

### 5.3 End-to-End Cloud Asset Publishing & Database Roster Admission
* During a **"Join the Bar!"** registration run:
  1. Both the background pipeline installation stage and the registration completion handler must authenticate cleanly with cloud object storage using the configured service-account credentials.
  2. All required patron assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`, `source.<ext>`, and `personality.txt`) must be uploaded to `patrons/<characterId>/` in the target cloud storage bucket with public read accessibility.
  3. Cloud readiness verification must confirm that all four required animation sprites exist in cloud storage and meet minimum byte-size validity (`>= 256` bytes).
  4. The patron must be upserted into the relational `patrons` table with `is_ready = true`, `is_active = true`, the player's `about_me` bio, `prompt_ready = true`, and canonical public cloud URLs for all sprite assets.
  5. The `generation_jobs` record must transition to `status = 'done'`, `current_stage = 'done'`, `stage_index = 8`, `progress_pct = 100`, and `error = null`.
  6. The in-game **"Join the Bar!"** UI must transition from the progress indicator to `"READY: <DISPLAY NAME> (<characterId>)"`, broadcast the roster update event to the active game session, and make the new patron immediately eligible to spawn and walk into the bar.

### 5.4 Recovery & Admission of Stranded Failed Jobs on the Live Server
* Any patron registration jobs on the live server that already completed stages 1–7 and wrote complete, valid transparent sprite packs (`sit`, `talk`, `walk_01`, `walk_02`) to disk, but were stranded in `status = 'failed'` solely due to `Failed to parse GCS_CREDENTIALS_JSON`, must have their completed sprite packs published to cloud storage, their patron records upserted into the active PostgreSQL `patrons` roster (`is_ready = true`, `is_active = true`), and their `generation_jobs` records updated to `status = 'done'` with `error = null`.

### 5.5 Live Mac Server Runtime Synchronization
* The live containerized Bartending runtime on the Mac Server must be updated with both the normalized credential handling and a clean, unquoted runtime environment so that live **"Join the Bar!"** submissions over LAN or the public HTTPS ingress succeed end-to-end without `{errors}`.

---

## 6. Invariants, Constraints & Edge Cases

* **`INV-CRED-PARSE-01` (Quote-Agnostic Credential Parsing)**:
  - Identical JSON service-account credentials must parse into an identical, valid credential object regardless of whether the environment variable was loaded by a shell, a `.env` file reader, or a container `--env-file` injector that preserves outer `'...'` or `"..."` quotes.
* **`INV-FAILFAST-PREFLIGHT-01` (Immediate Pre-Flight Credential Validation)**:
  - Malformed or unparseable cloud storage credentials must be rejected immediately before spawning background image generation, never after 6 stages of AI image generation have already executed.
* **`INV-NO-GHOST-PATRON-01` (Strict Cloud Readiness Gate)**:
  - No patron record may be marked `is_ready = true` in the database unless all four required sprite assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) are verified present and non-empty (`>= 256` bytes) in cloud object storage.
* **`INV-PIPELINE-STAGE8-PARITY-01` (Zero Silent Stage 8 Upload Failure)**:
  - Stage 8 of the patron pipeline must not log a silent cloud-upload parse warning while exiting `0`; credential parsing in both the pipeline process and the server process must succeed consistently.
* **`INV-RUNTIME-ENV-01` (Preserved Server Connectivity & Secrets)**:
  - Updating the live Mac Server runtime must preserve all active environment variables, persistent volume mounts, database connectivity, and the public HTTPS ingress tunnel without downtime or regression.

---

## 7. Acceptance Criteria & Verification (`{correct required outputs}`)

| ID | Criterion | Expected Measurable Outcome (`{correct required outputs}`) |
| :--- | :--- | :--- |
| **`AC-01`** | **Quote-Wrapped & Raw Credential Parsing** | Cloud storage initialization succeeds with zero `{errors}` whether `GCS_CREDENTIALS_JSON` is provided as raw JSON (`{...}`), single-quote-wrapped JSON (`'{...}'`), or double-quote-wrapped JSON (`"{...}"`). |
| **`AC-02`** | **Pre-Flight Fail-Fast on Invalid Credentials** | If `GCS_CREDENTIALS_JSON` contains invalid, non-JSON text, `POST /api/patrons/register` with `runPipeline=1` fails immediately before spawning background generation rather than failing at Stage 8 (`98%`). |
| **`AC-03`** | **End-to-End Cloud Upload & Database Persistence** | Completing a patron installation uploads `sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`, source photo, and `personality.txt` to cloud storage (`bartending-patron-assets`), verifies cloud readiness, upserts the patron into PostgreSQL `patrons` (`is_ready = true`, `is_active = true`), and marks the `generation_jobs` row `status = 'done'` with `error = null`. |
| **`AC-04`** | **Recovery of Stranded Completed Registrations** | Previously stranded registrations on the live server that completed all sprite generation and background removal stages (`hb_bf612b75fe714e2c` and `h_b2d808b6370e9c49`) have their ready packs uploaded to cloud storage, are admitted to the PostgreSQL `patrons` table (`is_ready = true`), and have their `generation_jobs` records updated to `status = 'done'`. |
| **`AC-05`** | **Live Server Roster & Status Verification** | On the live Mac Server runtime (and public HTTPS ingress), `GET /api/patrons/roster` returns the newly admitted cloud-backed patrons with reachable HTTPS sprite URLs (`HTTP 200`), and `GET /api/patrons/generate-status` reports `status = 'done'` with zero `Failed to parse` errors in server or container logs. |

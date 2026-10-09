# FS106 — Production persistence architecture: GCS visual asset storage and PostgreSQL patron registry

## Purpose

Establish required product `{functionality}` for durable, production-grade persistence across the "Join the bar!" patron pipeline, transitioning all generated character assets to Google Cloud Storage (GCS) and all relational game state, roster data, and job tracking to a PostgreSQL database.

This eliminates the limitation where patron visual assets, runtime rosters, and registration records reside exclusively on the host server's local ephemeral filesystem, enabling permanent character retention across server restarts, container rebuilds, and machine migrations (such as deploying to a dedicated local home server).

**Prior:**
- [functional_specification_105.md](./functional_specification_105.md) (End-to-end in-game Join the bar patron generation and automatic spawn availability)
- [functional_specification_98.md](./functional_specification_98.md) (Runtime-only join character storage)
- [functional_specification_96.md](./functional_specification_96.md) (No ghost patrons without ready pack)
- [functional_specification_94.md](./functional_specification_94.md) (Join selfie drives full generative patron pipeline)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|:---|:---|
| **GCS Visual Asset Storage** | Cloud object storage (`gs://bartending-patron-assets`) designated to store all generated patron sprite PNGs and source photographs with public HTTPS accessibility. |
| **PostgreSQL Patron Registry** | The central relational database responsible for persistently maintaining the active patron roster, generation job lifecycles, and contact records. |
| **Durable Ready Pack** | The required quartet of transparent sprite assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) stored permanently in cloud storage rather than local disk. |
| **Durable Roster** | The persistent list of spawnable barroom patrons queried by the game client, combining hardcoded stock characters with dynamically registered cloud-backed patrons. |
| **Generation Job Record** | A durable database entity tracking the lifecycle, status (`queued`, `running`, `done`, `failed`), timestamps, and output log tail of an in-flight character generation request. |
| **Ephemeral Wipe Defect** | The operational defect state where restarting the server, rebuilding containers, or transferring project files to another computer destroys all newly generated patron assets and roster entries. |

---

## Current Baseline & Observed `{errors}`

### Current Architecture Limitations
1. **Local Filesystem Confinement**:
   - Source photographs, intermediate generation frames, and final ready pack PNGs are written directly to local filesystem paths ([`public/assets/patrons/`](file:///Users/diesel/Desktop/bartending/Bartending/public/assets/patrons/) and [`scripts/patron-pipeline/staging/`](file:///Users/diesel/Desktop/bartending/Bartending/scripts/patron-pipeline/staging/)).
   - The active in-game patron roster is stored as a flat JSON file at [`data/runtime-patrons.json`](file:///Users/diesel/Desktop/bartending/Bartending/data/runtime-patrons.json).
   - Generation job metadata is written to per-file JSON records under [`data/generation-jobs/`](file:///Users/diesel/Desktop/bartending/Bartending/data/generation-jobs/).
2. **Ephemeral Data Loss Across Runs & Deploys**:
   - Whenever the application environment restarts, Docker containers rebuild, or code is transferred to a new computer, all local filesystem records under `data/` and `public/assets/patrons/` are wiped or left behind.
   - Newly joined patrons completely vanish upon deployment or host migration, reverting the game entirely to stock characters.
3. **Bandwidth & Serving Overhead on Local Host**:
   - Serving full-resolution sprite animations directly from a home computer's disk creates network bottlenecks when accessed remotely from mobile devices.

---

## Desired `{functionality}`

### 1. Permanent Cloud Asset Storage in GCS
- **Autonomous Cloud Publishing**:
  - Upon completion of background removal for a generated character, the system must upload the complete ready pack (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) and the source photo to the configured GCS bucket (`bartending-patron-assets`).
  - Staging artifacts must not linger on host disks as permanent single-points-of-failure.
- **Direct Public Accessibility & CORS**:
  - Stored sprites must be resolvable via standard, permanent HTTPS URLs (e.g. `https://storage.googleapis.com/bartending-patron-assets/patrons/{id}/...`).
  - Cross-Origin Resource Sharing (CORS) must allow any authorized web client (desktop or mobile) to fetch and render sprite images into canvas or DOM elements without authentication bottlenecks or expiring signed URLs.

### 2. Relational PostgreSQL State Persistence
- **Active Patron Roster (`patrons`)**:
  - The system must persist character identity records in a PostgreSQL database table containing:
    - Unique character identifier (`id`, e.g. `cool_guy_9abf409e3dc3bafd`).
    - Display alias (`display_name`).
    - Personality routing key (`personality`).
    - Animation configuration (`walk_frame_count`, `walk_frame_ms`).
    - Direct GCS URLs for seated, talking, and walking sprite assets.
    - Readiness and active operational flags (`is_ready`, `is_active`).
    - Timestamps for creation and updates.
  - The live game API route (`GET /api/patrons/roster`) must query PostgreSQL to deliver a unified, validated patron roster to [`PatronLayer.tsx`](file:///Users/diesel/Desktop/bartending/Bartending/src/components/PatronLayer.tsx).
- **Asynchronous Generation Job Tracking (`generation_jobs`)**:
  - Registration requests must write their initial job state to a durable `generation_jobs` table.
  - The pipeline must update job status (`queued` $\rightarrow$ `running` $\rightarrow$ `done` | `failed`), error messages, and log tails directly in PostgreSQL.
  - Clients polling `GET /api/patrons/generate-status?jobId=...` must receive consistent status updates from the database without race conditions or file-system locking failures.
- **Secure Patron Contact Store (`patron_pii`)**:
  - Player contact details (name, email, phone) provided during registration must be persistently recorded in an isolated `patron_pii` table linked by character identifier.
  - Contact hashes must enforce deduplication rules while keeping sensitive personal information strictly segregated from public game APIs.

### 3. Atomicity & Ghost Patron Prevention
- A patron record in the `patrons` table must never be flagged as ready or active (`is_ready = true`) until all four ready pack assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) are verified to exist in GCS and are publicly readable.
- If cloud upload fails or is interrupted, the generation job must record a terminal `failed` state in the database, preventing any phantom or broken character from appearing in the barroom simulation.

### 4. Machine Migration & Remote Parity
- **Full Portability**:
  - The entire application state must be independent of the physical machine running the server. When transferring the application repository from a development workstation to a local home server, no manual copying of local images, JSON files, or SQLite databases shall be required.
  - Simply supplying production configuration (Postgres connection credentials, GCS bucket details, and API keys) on the new host must immediately restore access to all previously created patrons.
- **Remote Mobile Play Parity**:
  - Players accessing the game from mobile devices over secure public tunnels must experience identical sprite loading performance, patron arrival animations, and seating persistence as local desktop players.

### 5. Built-in Fallback Resilience
- The system must retain built-in stock patrons (Elder, Caesar, Trump) as an immutable foundation. In the event of temporary database latency or transient cloud storage degradation, the bar simulation must gracefully preserve stock patron gameplay without crashing or rendering an empty barroom.

---

## Edge cases & behavioral boundaries

1. **Transient Cloud Storage Outages**:
   - If GCS is unreachable during sprite upload, the pipeline must catch the upload error, mark the database job as failed with an actionable diagnostic message, and refrain from admitting the patron to the active roster.
2. **Database Reconnection & Connection Pool Exhaustion**:
   - The application must utilize managed connection pooling with reconnection handling so transient network hiccups between the server and the PostgreSQL database do not crash the Next.js process.
3. **Concurrent Job Execution**:
   - Multiple concurrent player registrations must operate on independent rows in `generation_jobs` and isolated GCS object paths (`patrons/{characterId}/`), preventing collisions or corrupted states.
4. **Duplicate Contact Registrations**:
   - Submitting a registration with previously used contact information must gracefully update or associate with the existing character record in accordance with identity deduplication rules.
5. **Partial Asset Loss**:
   - If any individual sprite in GCS is deleted or inaccessible, the roster query must detect the missing asset and exclude that patron from the active spawn pool until the ready pack is intact.

---

## Acceptance criteria

| ID | Criteria | Desired Outcome |
|:---|:---|:---|
| **AC1** | **Cloud Sprite Publishing** | Newly generated patron assets (`sit`, `talk`, `walk_01`, `walk_02`, `source`) are uploaded to and served from GCS bucket `bartending-patron-assets`. |
| **AC2** | **PostgreSQL Roster Querying** | The live bar simulation queries active patrons from the PostgreSQL database, correctly displaying both stock and cloud-persisted patrons. |
| **AC3** | **Durable Job Tracking** | In-game registration jobs are tracked in PostgreSQL; status polling returns accurate real-time states and logs until completion or failure. |
| **AC4** | **Host Restart & Migration Persistence** | Restarting the Next.js server, clearing local scratch directories, or launching the app on a new host preserves all created patrons without data loss. |
| **AC5** | **Strict Cloud Readiness Gate** | Patrons are admitted to the active spawn roster only after all four required sprite PNGs are confirmed readable in GCS; failed jobs create zero ghost patrons. |
| **AC6** | **Mobile Remote Parity** | Mobile clients accessing the application over HTTPS load cloud-hosted sprite assets seamlessly, successfully rendering walk cycles and bar seating. |

---

## Instruction to Coding Assistant

The coding assistant is instructed to:
1. **Architect Storage & Database Integration**:
   - Design clean adapter interfaces for Google Cloud Storage and PostgreSQL that decouple asset publishing and roster queries from local disk structures.
2. **Map Code Modifications**:
   - Identify all components requiring migration, specifically:
     - Pipeline completion and asset installer scripts ([`generate-patron-assets.mjs`](file:///Users/diesel/Desktop/bartending/Bartending/scripts/patron-pipeline/generate-patron-assets.mjs), [`writeAssets.mjs`](file:///Users/diesel/Desktop/bartending/Bartending/scripts/patron-pipeline/lib/writeAssets.mjs)).
     - Server endpoints ([`register/route.ts`](file:///Users/diesel/Desktop/bartending/Bartending/src/app/api/patrons/register/route.ts), [`generate-status/route.ts`](file:///Users/diesel/Desktop/bartending/Bartending/src/app/api/patrons/generate-status/route.ts), [`roster/route.ts`](file:///Users/diesel/Desktop/bartending/Bartending/src/app/api/patrons/roster/route.ts)).
     - Runtime store utilities ([`runtimePatronStore.ts`](file:///Users/diesel/Desktop/bartending/Bartending/src/lib/runtimePatronStore.ts)).
3. **Formulate Architectural Plan**:
   - Document the exact schema migration steps, connection management, GCS client configuration, and fallback handling in a comprehensive required edits plan.
   - Do not write implementation code until the plan has been reviewed and authorized by the operator.

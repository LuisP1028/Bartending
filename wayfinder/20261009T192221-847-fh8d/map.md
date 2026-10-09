# Wayfinder Map: FS106 Production Persistence Architecture (GCS Visual Asset Storage and PostgreSQL Patron Registry)

## Destination
Establish an exhaustive, deterministic, and verified architectural decision set and component ownership registry detailing every interface, schema definition, database connection pool, Google Cloud Storage publishing workflow, cloud readiness verification rule, and runtime roster loader edit required across the codebase to transition all generated patron visual assets to Google Cloud Storage (`gs://bartending-patron-assets`) and all relational game state, active rosters, asynchronous generation job tracking, and encrypted contact records to a persistent PostgreSQL database, eliminating host-local filesystem confinement and ephemeral wipe defects across container rebuilds, host server restarts, and machine migrations while preserving immutable stock patron resilience.

## Notes
- **Governing Specification:** `functional_specification_106.md` (FS106 — Production persistence architecture: GCS visual asset storage and PostgreSQL patron registry)
- **Run ID:** `20261009T192221-847-fh8d`
- **Domain:** Production cloud persistence, Google Cloud Storage asset publishing, PostgreSQL relational state, connection pooling, asynchronous generation job lifecycle tracking, AES-256-GCM encrypted contact deduplication, and resilient in-game patron roster delivery.
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-BOUNDARY-01`: No implementation code written during planning; output files omit coding prohibitions and downstream execution holds.
  - `INV-MAP-01`: Monotonic ticketing in run directory (`ticket-001.md` through `ticket-006.md`); human-readable titles used throughout.
  - `INV-ATOMIC-01`: Discrete, atomic decision tickets resolving one architectural question each.
  - `INV-FAILFAST-01`: Fail fast without silent fallbacks, hack patches, or arbitrary timeouts.
  - `INV-HANDOFF-01`: Deterministic manifest overwrite at `handoff/20261009T192221-847-fh8d/wayfinder-read-and-plan.txt` and `handoff/20261009T192221-847-fh8d/test-plan.txt`.

## Decisions so far
- [GCS Visual Asset Client, Autonomous Cloud Publishing & Direct Public URL Resolution (ticket-001.md)](./tickets/ticket-001.md) — Establish `@google-cloud/storage` integration, credentials initialization from `GCS_CREDENTIALS_JSON`/`GCS_PROJECT_ID`, upload pipeline for the transparent ready-pack quartet (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) and source photo to `patrons/{characterId}/`, configure standard cache headers (`public, max-age=31536000, immutable`), and resolve direct, permanent HTTPS URLs.
- [PostgreSQL Managed Connection Pool, Lifecycle Governance & Database Schema Architecture (ticket-002.md)](./tickets/ticket-002.md) — Establish production `pg.Pool` connection management with reconnect handling, SSL support, and automatic table bootstrap for `patrons`, `generation_jobs`, and `patron_pii` relational schemas, ensuring process resilience during transient database latency.
- [Durable Job Telemetry & Asynchronous Lifecycle Tracking via PostgreSQL (ticket-003.md)](./tickets/ticket-003.md) — Migrate generation job lifecycle tracking (`queued`, `running`, `done`, `failed`) from ephemeral local JSON files to the durable `generation_jobs` table, streaming real-time stage progress, log tails, and fail-fast diagnostic error surfaces to `GET /api/patrons/generate-status`.
- [Relational Active Roster Management, Cloud Readiness Verification & Ghost Prevention (ticket-004.md)](./tickets/ticket-004.md) — Redesign `isPatronPackReady` to verify asset existence in GCS, transition `GET /api/patrons/roster` to query active cloud-backed patrons from PostgreSQL, enforce atomic admission gating (`is_ready = true`) only after full ready-pack cloud verification, and guarantee immutable stock patron fallback resilience if the database is unreachable.
- [Secure PII Storage Migration & Deduplication Architecture (ticket-005.md)](./tickets/ticket-005.md) — Migrate patron registration contact store from local SQLite (`patrons.sqlite`) to PostgreSQL `patron_pii`, retaining AES-256-GCM encryption with `PII_ENCRYPTION_KEY`, enforcing strict `contact_hash` deduplication, and ensuring sensitive PII remains strictly isolated from public game APIs.
- [FS106 Production Persistence Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol (ticket-006.md)](./tickets/ticket-006.md) — Establish exhaustive, deterministic integration test decision mappings, authentic codebase schema bindings, admissible observed payloads under `INV-PAYLOAD-01`, and specification oracles under `INV-ASSERTION-01` across GCS visual asset storage, PostgreSQL connection pooling, asynchronous generation job tracking, encrypted PII deduplication, cloud readiness verification, and stock patron fallback resilience in [TM106 Master Integration Test Matrix (test_matrix_106.md)](./test_matrix_106.md).

## Not yet specified
*(None. All architectural, schema, pipeline, server endpoint, resilience, and integration test planning decisions required for FS106 are fully specified, verified, and locked across decision tickets ticket-001.md through ticket-006.md, required_edits_106.md, and test_matrix_106.md).*

## Out of scope
- Modifying drink crafting recipes, glass pouring physics, or inventory carousel mechanics.
- Altering the Game Boy frame styling, diegetic receipt printer, or checkout audio.
- Removing or altering the core stock patron assets (Elder, Caesar, Trump) in `src/data/characters.ts`.
- Replacing the client-side canvas render engine in `src/components/PatronLayer.tsx`.

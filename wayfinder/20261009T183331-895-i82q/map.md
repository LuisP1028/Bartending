# Wayfinder Map: FS105 End-to-end In-Game "Join the Bar" Patron Generation and Automatic Spawn Availability

## Destination
Establish an exhaustive, deterministic, and verified architectural decision set and component ownership registry detailing every interface, server endpoint, background process supervision rule, progress telemetry stream, client navigation flow, ready-pack readiness check, and runtime roster loader edit required across the codebase to enable players to complete the in-game "Join the bar!" registration flow (providing alias, contact info, and selfie photo) through the Game Boy Comm-Link interface such that the system autonomously executes the full generative visual asset pipeline, verifies the ready pack, updates the runtime roster, and renders the newly registered patron spawnable and seated at the bar counter during live gameplay without manual operator CLI terminal execution or server restarts.

## Notes
- **Governing Specification:** `functional_specification_105.md` (FS105 — End-to-end in-game "Join the bar" patron generation and automatic spawn availability)
- **Run ID:** `20261009T183331-895-i82q`
- **Domain:** In-game character registration, background image generation pipeline, Game Boy Comm-Link UX, transparent sprite background removal, runtime roster management, and POV barroom simulation.
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-BOUNDARY-01`: No implementation code written during planning; output files omit coding prohibitions and downstream execution holds.
  - `INV-MAP-01`: Monotonic ticketing in run directory (`ticket-001.md` through `ticket-004.md`); human-readable titles used throughout.
  - `INV-ATOMIC-01`: Discrete, atomic decision tickets resolving one architectural question each.
  - `INV-FAILFAST-01`: Fail fast without silent fallbacks, hack patches, or arbitrary timeouts.
  - `INV-HANDOFF-01`: Deterministic manifest overwrite at `handoff/20261009T183331-895-i82q/wayfinder-read-and-plan.txt`.

## Decisions so far
- [Deterministic Credential Discovery, Execution Context & Root Path Alignment (ticket-001.md)](./tickets/ticket-001.md) — Establish multi-root `.env` credential resolution across worktrees and server environments, unify `repoRoot` path derivation across web handlers and CLI scripts, pre-flight credentials and photo decodability before spawning jobs, and isolate per-job plan configurations to eliminate concurrency collisions.
- [Detached Process Execution, Stream Telemetry & Real-Time Progress Persistence (ticket-002.md)](./tickets/ticket-002.md) — Establish resilient background process supervision (`spawn`, detached execution, stream piping), real-time stdout/stderr stage progress parsing, atomic job record persistence to `data/generation-jobs/${jobId}.json`, heartbeat tracking, and descriptive error surface formatting.
- [Non-Blocking Client UX, Shell Navigation & In-Game Status Feedback (ticket-003.md)](./tickets/ticket-003.md) — Decouple `joinBusy` from shell back/escape handlers in `src/app/page.tsx` and `JoinBarCamera.tsx` to maintain full Game Boy navigation responsiveness during in-flight generation, stream fine-grained stage progress from `GET /api/patrons/generate-status` into the camera HUD, and provide clear completion confirmation and actionable failure explanations.
- [Strict Ready-Pack Verification, Ghost Prevention & Instant Live Barroom Discovery (ticket-004.md)](./tickets/ticket-004.md) — Lock strict ready-pack gating ensuring all four sprite assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) are verified non-empty PNGs on host disk before upserting to `data/runtime-patrons.json`, guarantee zero ghost patrons, trigger immediate client-side roster re-fetch upon job completion, and integrate the newly registered patron into `PatronLayer` auto-fill seating while preserving stock character priority.

## Not yet specified
*(None. All architectural, process supervision, progress telemetry, UI navigation, asset verification, and runtime roster decisions required for FS105 are fully specified, verified, and locked across decision tickets ticket-001.md through ticket-004.md and required_edits_105.md).*

## Out of scope
- Altering drink crafting, recipe verification, or inventory carousel mechanisms.
- Changing diegetic receipt printer, paper roll, or checkout animations.
- Modifying mode selection menu containment or startup video sequences.
- Migrating host storage to remote Google Cloud Storage (GCS) or S3 in this phase.

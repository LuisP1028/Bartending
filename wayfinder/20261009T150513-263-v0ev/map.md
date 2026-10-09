# Wayfinder Map: FS99 Local Hosting Migration and Runtime Verification

## Destination
Establish a complete, deterministic, and verified decision set detailing every architectural, configuration, service, and code edit required across the codebase to migrate the retro 8-bit bartending game to a fully self-contained local environment (`localhost`) and verify all local runtime components and services without invention, ready for implementation handoff.

## Notes
- **Governing Specification:** `functional_specification_99.md` (Local hosting migration and runtime verification)
- **Run ID:** `20261009T150513-263-v0ev`
- **Domain:** Retro 8-bit bartending simulation (Next.js 16, React 19, SQLite via `better-sqlite3`, local asset streaming, Game Boy shell navigation, local media permissions)
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-BOUNDARY-01`: No implementation code written during planning; output files omit coding prohibitions and downstream execution holds.
  - `INV-MAP-01`: Monotonic ticketing in run directory (`ticket-001.md` to `ticket-006.md`); human-readable titles used throughout.
  - `INV-ATOMIC-01`: Discrete, atomic decision tickets resolving one architectural question each.
  - `INV-FAILFAST-01`: Fail fast without silent fallbacks, hack patches, or arbitrary timeouts.
  - `INV-HANDOFF-01`: Deterministic manifest overwrite at `handoff/20261009T150513-263-v0ev/wayfinder-read-and-plan.txt`.

## Decisions so far
- [Local Server Startup & Port Binding Configuration (ticket-001.md)](./tickets/ticket-001.md) — Configure standard local development and production startup scripts in `package.json` to bind to `localhost:3000` with deterministic environment port override (`PORT`) and host binding, severing remote Hugging Face flags (`-H 0.0.0.0 -p 7860`) as defaults for local play.
- [Presentation Shell Decoupling & Remote Endpoint Severing (ticket-002.md)](./tickets/ticket-002.md) — Decouple `docs/index.html` from `https://choppedcheese-dither-os-bartending.hf.space` by redirecting the iframe to target the local runtime instance dynamically with local camera permission delegation, ensuring zero network traffic to remote Hugging Face domains.
- [Local SQLite Database & Runtime JSON Persistence (ticket-003.md)](./tickets/ticket-003.md) — Establish persistent local filesystem storage under `data/` for both encrypted patron PII in SQLite (`data/patrons.sqlite`) via `better-sqlite3` and runtime rosters (`data/runtime-patrons.json`), ensuring deterministic initialization and state retention across server restarts.
- [Local Static & Dynamic Asset Serving and Zero-Ghost Integrity (ticket-004.md)](./tickets/ticket-004.md) — Serve all built-in game media (boot video, synthwave backgrounds, audio, glassware) and dynamic patron sprite packs through local endpoints (`/assets/*` and `/api/patrons/assets/*`), strictly enforcing 4-file ready-pack verification (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) to prevent ghost patrons from entering the bar stage.
- [Local Camera Uplink & Missing Key Graceful Degradation (ticket-005.md)](./tickets/ticket-005.md) — Rely on native browser secure origin permissions for `getUserMedia` on `localhost`, and enforce graceful degradation where absence of external AI credentials (`XAI_API_KEY`, `PII_ENCRYPTION_KEY`) produces clear UI status alerts while keeping core bartending gameplay, stock patrons, and local drink mixing fully operational.
- [Local Runtime Verification Protocol & Subsystem Smoke Test (ticket-006.md)](./tickets/ticket-006.md) — Define an end-to-end local runtime verification protocol covering all five functional subsystems (Boot Intro -> Main Menu -> Bar Playfield -> Bartending Mechanics -> Comm-Link) to certify operational readiness before gameplay or aesthetic changes are introduced.

## Not yet specified
*(None. All architectural decisions required for FS99 are fully specified and locked across decision tickets ticket-001.md through ticket-006.md).*

## Out of scope
- Implementation of new bartending drink recipes or cocktail mechanics beyond existing mode definitions (`OBELISCO`, `CLASSICS`).
- Visual style or aesthetic overhauls of the Game Boy shell, HUD typography, or sprite artwork.
- Remote cloud deployment configurations or external Hugging Face Space volume management products.
- Redesign of the 8-bit patron pipeline skill prompts.

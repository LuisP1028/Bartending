# Wayfinder Map: FS108 "Join the bar!" Configuration Refinement: "About Me" Bio Capture and Character Prompt File Generation

## Destination
Establish an exhaustive, deterministic, and verified architectural decision set and component edit roadmap detailing every form field, client validation constraint, file generation protocol, strict content fidelity invariant, metadata structure, relational schema modification, cloud asset synchronization mechanism, and stock patron prompt normalization rule required across the codebase to ensure every barroom patron—encompassing hardcoded stock characters (Elder, Caesar, Trump) and dynamically registered custom patrons arriving via the "Join the bar!" registration workflow—possesses an authoritative, file-backed personality prompt document (`public/assets/patrons/{characterId}/personality.txt`) that governs their conversational demeanor, vocabulary, and behavioral quirks for AI-driven dialogue generation, eliminating unvoiced patrons and dialogue divergence.

## Notes
- **Governing Specification:** `functional_specification_108.md` (FS108 — "Join the bar!" configuration refinement: "About Me" bio capture and character prompt file generation)
- **Run ID:** `20261009T224812-747-ypdn`
- **Domain:** In-game patron registration, client-side input validation, filesystem asset contracts, strict content fidelity, metadata schema updates, relational PostgreSQL persistence, Google Cloud Storage synchronization, and stock character prompt parity.
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-BOUNDARY-01`: Planning node produces architectural decisions and edit matrices; no implementation code or execution holds written to output files.
  - `INV-MAP-01`: Monotonic ticketing in run directory (`ticket-001.md` through `ticket-005.md`); human-readable titles used throughout.
  - `INV-ATOMIC-01`: Discrete, atomic decision tickets resolving one architectural question each.
  - `INV-FAILFAST-01`: Fail fast without silent fallbacks, hack patches, or arbitrary timeouts.
  - `INV-HANDOFF-01`: Deterministic manifest overwrite at `handoff/20261009T224812-747-ypdn/wayfinder-read-and-plan.txt`.

## Decisions so far
- [Registration Modal 'About Me' Profile Section & Client Validation Architecture (ticket-001.md)](./tickets/ticket-001.md) — Expand `src/components/PatronSignupForm.tsx` to incorporate a dedicated multi-line `<textarea>` for "About Me" persona input with character length validation ($10 \le \text{length} \le 500$ non-whitespace chars), descriptive placeholder guidance, clear validation error surfacing, and inclusion in the multipart form payload as `aboutMe`.
- [Authoritative Prompt File Generation (`personality.txt`) & Strict Content Fidelity Governance (ticket-002.md)](./tickets/ticket-002.md) — Standardize synchronous local prompt file creation in `src/app/api/patrons/register/route.ts`, `src/lib/patronFolders.ts`, and `scripts/patron-pipeline/lib/patronFolder.mjs`, writing literal user input verbatim to `public/assets/patrons/{characterId}/personality.txt` and mirroring to `scripts/patron-pipeline/staging/{characterId}/personality.txt` with zero synthetic template wrappers, completed in $< 50\text{ms}$ with offline reliability across both pipeline and folder-only registrations.
- [Durable Persona Persistence, Metadata Ingestion & Relational Schema Standardization (ticket-003.md)](./tickets/ticket-003.md) — Extend patron `meta.json` with explicit `aboutMe` attribute, update PostgreSQL `patrons` table in `src/lib/db.ts` with `about_me TEXT` and `prompt_ready BOOLEAN NOT NULL DEFAULT FALSE` columns, update runtime record interfaces in `src/lib/runtimePatronStore.ts`, and wire `--about-me` CLI argument propagation into `scripts/patron-pipeline/generate-patron-assets.mjs`.
- [Cloud Asset Synchronization & Asset Route Serving Protocol for `personality.txt` (ticket-004.md)](./tickets/ticket-004.md) — Enhance cloud synchronization routines in `src/lib/gcsStorage.ts` and `scripts/patron-pipeline/lib/gcsStorage.mjs` to upload `personality.txt` to Google Cloud Storage alongside sprite PNGs using `contentType: 'text/plain; charset=utf-8'`, and update `src/app/api/patrons/assets/[characterId]/[file]/route.ts` to whitelist and serve `personality.txt` over HTTP.
- [Stock Patron Persona Parity, Prompt Resolution Normalization & Self-Healing Restoration Architecture (ticket-005.md)](./tickets/ticket-005.md) — Establish authoritative `personality.txt` files for stock patrons (`patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`) in `public/assets/patrons/`, unify system prompt resolution in `src/data/characterDialogue.ts` to resolve file-backed prompt assets identically across stock and dynamic patrons, and implement self-healing restoration logic from relational database records when disk files are missing or corrupted.

## Not yet specified
*(None. All architectural, schema, file contract, synchronization, and parity decisions required for FS108 are fully specified, verified, and locked across decision tickets ticket-001.md through ticket-005.md and required_edits_108.md).*

## Out of scope
- Modifying sprite generation skills (`scripts/patron-pipeline/skills/*`) or image model prompt architectures.
- Altering visual scale, spawn origins, or bar stool seating anchors calibrated under FS107.
- Modifying drink crafting recipes, glass pouring physics, or checkout receipt generation.
- Implementing the downstream LLM inference client or dialogue completion logic (governed separately by FS109).

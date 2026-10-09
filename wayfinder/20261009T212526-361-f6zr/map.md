# Wayfinder Map: FS107 Patron Visual Scale, Spawn Origin, and Bar Stool Seating Standardization

## Destination
Establish an exhaustive, deterministic, and verified architectural decision set and component edit roadmap detailing every mathematical formula, CSS rendering rule, layout storage schema, stage coordinate transformation, camera capture constraint, and asset pipeline adjustment required across the codebase to ensure all barroom patrons—encompassing hardcoded stock characters (Elder, Caesar, Trump) and dynamically registered custom patrons arriving via the in-game generative pipeline—maintain standardized physical dimensions, originate from an identical entrance spawn point `(spawn.x, spawn.y)`, walk along a level floor baseline, and sit at uniform bar counter heights with consistent eye-line and shoulder-line alignment, completely eliminating the sunken peeking patron defect, scale disparity across cast members, and walk-to-sit snapping.

## Notes
- **Governing Specification:** `functional_specification_107.md` (FS107 — Patron visual scale, spawn origin, and bar stool seating standardization)
- **Run ID:** `20261009T212526-361-f6zr`
- **Domain:** Sprite aspect-ratio normalization, visual scale normalization, authoritative entrance spawn coordinates, horizontal floor walking baseline, bar stool seating anchors, counterline clearance, occlusion mask fidelity, and seamless motion-to-sit continuity.
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-BOUNDARY-01`: No implementation code written during planning; output files omit coding prohibitions and downstream execution holds.
  - `INV-MAP-01`: Monotonic ticketing in run directory (`ticket-001.md` through `ticket-005.md`); human-readable titles used throughout.
  - `INV-ATOMIC-01`: Discrete, atomic decision tickets resolving one architectural question each.
  - `INV-FAILFAST-01`: Fail fast without silent fallbacks, hack patches, or arbitrary timeouts.
  - `INV-HANDOFF-01`: Deterministic manifest overwrite at `handoff/20261009T212526-361-f6zr/wayfinder-read-and-plan.txt`.

## Decisions so far
- [Standardized Visual Scale & Aspect-Ratio Normalization Architecture (ticket-001.md)](./tickets/ticket-001.md) — Establish aspect-ratio-aware bounding box and visual normalization formulas in `src/components/PatronLayer.tsx`, `src/components/PatronPlacementEditor.tsx`, and `src/app/globals.css`, normalizing sprite heights and widths based on character silhouette dimensions so that 2:3 portrait (Elder), 1:1 square (Caesar/Trump), and 16:9 landscape (pipeline joiners) render with matching bust and full-body physical volumes (within $\pm 5\%$ scale variance).
- [Standardized Bar Stool Seating Anchors, Vertical Offsets & Counterline Alignment (ticket-002.md)](./tickets/ticket-002.md) — Standardize spatial anchors and vertical offsets in `src/lib/patronSeats.ts` and `src/data/patronLayout.ts` across `bar_seat_1` through `bar_seat_4`, calibrating seated bust placement so that every patron's upper chest, shoulders, chin, and entire face clear the bar countertop foreground mask (`POV_BAR_CUTOFF.d`), eliminating sunken peeking heads and mid-air hovering.
- [Authoritative Entrance Spawn Origin & Horizontal Walking Baseline Governance (ticket-003.md)](./tickets/ticket-003.md) — Enforce a single authoritative entrance spawn coordinate `(spawn.x, spawn.y)` at `(143, 659)` and a level horizontal floor baseline across all characters and seats in `src/data/patronLayout.ts`, `src/lib/patronLayoutStorage.ts`, and `src/components/PatronLayer.tsx`, eliminating per-character spawn drift, elevation variance, and directional flip horizontal jumps.
- [Seamless Motion-to-Sit Transition Continuity & Visual Stability Invariant (ticket-004.md)](./tickets/ticket-004.md) — Re-architect the walking-to-seated state transition in `src/components/PatronLayer.tsx` and `src/data/patronLayout.ts` to align the final walking arrival pose with the seated bust posture, locking eye-line and silhouette center continuity to eliminate vertical coordinate snapping (125px drop) and abrupt visual scale popping at `t = 1`.
- [Generative Pipeline Ingestion, Camera Framing & Aspect Ratio Standardization (ticket-005.md)](./tickets/ticket-005.md) — Standardize user camera capture framing in `src/components/JoinBarCamera.tsx` (centered square/portrait framing guide) and asset pipeline stage references in `scripts/patron-pipeline/generate-patron-assets.mjs` and `scripts/patron-pipeline/lib/imagineClient.mjs` (prioritizing 2:3 / 1:1 portrait reference templates) so newly generated patron assets arrive with standardized proportions and minimal transparent padding from creation.
- [FS107 Patron Visual Scale, Spawn Origin, and Bar Stool Seating Standardization Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol (ticket-006.md)](./tickets/ticket-006.md) — Chart deterministic integration test decisions, authentic codebase schemas, admissible observed payloads, and verification oracles for verifying visual scale normalization, calibrated seating anchors, authoritative spawn invariants, seamless walk-to-sit transitions, and pipeline aspect ratio ingestion under `INV-PAYLOAD-01` and `INV-ASSERTION-01` without mocks.

## Not yet specified
*(None. All architectural, geometric, mathematical, component, pipeline, and integration test planning decisions required for FS107 are fully specified, verified, and locked across decision tickets ticket-001.md through ticket-006.md, required_edits_107.md, and test_matrix_107.md).*

## Out of scope
- Modifying drink crafting recipes, glass pouring physics, or inventory carousel mechanics.
- Altering the Game Boy frame styling, diegetic receipt printer, or checkout audio.
- Removing or altering the core stock patron identities (Elder, Caesar, Trump) in `src/data/characters.ts`.
- Replacing the SVG path definitions of the bar counter (`POV_BAR_CUTOFF`) in `src/data/povHotspots.ts`.

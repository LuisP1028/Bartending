# Wayfinder Map: FS103 Patron Arrival Seating Persistence and Re-spawning Cycle Elimination

## Destination
Establish a complete, deterministic, and verified decision set detailing every architectural, state machine, motion clock, asset rendering, and auto-spawning rule edit required across the codebase to ensure arriving patron characters cleanly transition to and persist in their seated state at designated bar stools, maintain seat occupancy throughout their stay, eliminate runaway re-spawning cycles, and enforce auto-fill capacity quiescence across all window aspect ratios and device orientations.

## Notes
- **Governing Specification:** `functional_specification_103.md` (FS103 — Patron arrival seating persistence and re-spawning cycle elimination)
- **Run ID:** `20261009T170644-141-kn3t`
- **Domain:** 8-bit POV barroom patron lifecycle (Next.js 16, React 19, requestAnimationFrame driver, SVG stage geometry, sprite animation)
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-BOUNDARY-01`: No implementation code written during planning; output files omit coding prohibitions and downstream execution holds.
  - `INV-MAP-01`: Monotonic ticketing in run directory (`ticket-001.md` through `ticket-003.md`); human-readable titles used throughout.
  - `INV-ATOMIC-01`: Discrete, atomic decision tickets resolving one architectural question each.
  - `INV-FAILFAST-01`: Fail fast without silent fallbacks, hack patches, or arbitrary timeouts.
  - `INV-HANDOFF-01`: Deterministic manifest overwrite at `handoff/20261009T170644-141-kn3t/wayfinder-read-and-plan.txt`.

## Decisions so far
- [Patron Arrival Seating Transition & Motion Driver Quiescence (ticket-001.md)](./tickets/ticket-001.md) — Lock deterministic arrival evaluation (`t >= 1 || elapsed >= walkMs`), definitive transition to `phase: 'seated'`, progress lock `t = 1`, orientation reset `flipX: false`, walk frame index reset `walkFrameIndex: 0`, clock removal from `motionClockRef`, and graceful rAF driver quiescence when all active patrons are seated.
- [Patron Seated State Persistence, Asset Rendering & Despawn Prevention (ticket-002.md)](./tickets/ticket-002.md) — Enforce immutable persistence of seated instances in `instances` state array, deterministic seated sprite rendering displaying `inst.def.sitSrc` and `inst.layout.sitDisplayWidthPct` at `inst.sitPoint` with `.pov-patron-sprite--sit`, zero eviction/despawn triggers, and preservation of `barClipCss` counter occluder clipping.
- [Seat Occupancy Invariance & Auto-Fill Capacity Quiescence (ticket-003.md)](./tickets/ticket-003.md) — Enforce continuous seat reservation from walk inception through seated duration in `freeSeats`, prevent duplicate patron or seat claims in `trySpawn`, ensure full auto-fill capacity quiescence when all stools are occupied, prioritize stock character cast, and ensure complete isolation of patron state from window resize and device orientation changes.
- [FS103 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol (ticket-004.md)](./tickets/ticket-004.md) — Lock deterministic integration test decisions, authentic codebase schemas (`PatronLayerProps`, `PatronInstance`, `PatronDef`, `PatronLayout`), admissible observed payloads (`PAYLOAD-SEATS-01` through `PAYLOAD-BARCUT-01`), specification oracles (AC1–AC5, Edge Cases 1–4), and Master Integration Test Matrix (`test_matrix_103.md`) under `INV-PAYLOAD-01` and `INV-ASSERTION-01` with zero synthetic mocks.

## Not yet specified
*(None. All architectural, state machine, asset selection, auto-spawning, and integration test decisions required for FS103 are fully specified, verified, and locked across decision tickets ticket-001.md through ticket-004.md, required_edits_103.md, and test_matrix_103.md).*

## Out of scope
- Altering drink crafting, recipe verification, or inventory carousel mechanisms.
- Changing diegetic receipt printer, paper roll, or checkout animations.
- Modifying mode selection menu containment or startup video sequences.

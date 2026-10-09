# Wayfinder Map: FS104 Patron Arrival Seating Persistence, Re-spawn Cycle Elimination, and Component Ownership Identification

## Destination
Establish an exhaustive, deterministic, and verified architectural decision set and component ownership registry detailing every interface, state machine, motion clock, asset rendering, and auto-spawning rule edit required across the codebase to ensure arriving patron characters cleanly transition to and persist in their seated state at designated bar stools, maintain uninterrupted seat occupancy, eliminate runaway re-spawning cycles, and enforce auto-fill capacity quiescence across all window aspect ratios and device orientations.

## Notes
- **Governing Specification:** `functional_specification_104.md` (FS104 — Patron arrival seating persistence, re-spawn cycle elimination, and component ownership identification)
- **Run ID:** `20261009T173934-056-vq3o`
- **Domain:** 8-bit POV barroom patron lifecycle (Next.js 16, React 19, requestAnimationFrame driver, SVG stage geometry, sprite animation)
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-BOUNDARY-01`: No implementation code written during planning; output files omit coding prohibitions and downstream execution holds.
  - `INV-MAP-01`: Monotonic ticketing in run directory (`ticket-001.md` through `ticket-004.md`); human-readable titles used throughout.
  - `INV-ATOMIC-01`: Discrete, atomic decision tickets resolving one architectural question each.
  - `INV-FAILFAST-01`: Fail fast without silent fallbacks, hack patches, or arbitrary timeouts.
  - `INV-HANDOFF-01`: Deterministic manifest overwrite at `handoff/20261009T173934-056-vq3o/wayfinder-read-and-plan.txt`.

## Decisions so far
- [Component Ownership Identification & System Layer Architecture Mapping (ticket-001.md)](./tickets/ticket-001.md) — Identify and lock architectural ownership across all 6 system areas: spawning cadence and character selection, bar seat anchor geometry and walk polyline construction, frame timing and motion clock progression, arrival detection and seating transition, continuous seat occupancy reservation, and sprite asset switching and counter occluder clipping.
- [Deterministic Arrival Detection, Seated Transition & Motion Driver Quiescence (ticket-002.md)](./tickets/ticket-002.md) — Lock deterministic arrival evaluation (`t >= 1 || elapsed >= walkMs`), definitive transition to `phase: 'seated'`, progress lock `t = 1`, orientation reset `flipX: false`, walk frame index reset `walkFrameIndex: 0`, clock removal from `motionClockRef`, and graceful rAF driver quiescence when all active patrons are seated.
- [Seated State Persistence, Visual Asset Switching & Counter Occlusion (ticket-003.md)](./tickets/ticket-003.md) — Enforce immutable persistence of seated instances in `instances` state array, deterministic seated sprite rendering displaying `inst.def.sitSrc` and `inst.layout.sitDisplayWidthPct` at `inst.sitPoint` with `.pov-patron-sprite--sit`, zero eviction/despawn triggers, and preservation of `barClipCss` counter occluder clipping.
- [Continuous Seat Occupancy Integrity & Auto-Fill Capacity Quiescence (ticket-004.md)](./tickets/ticket-004.md) — Enforce continuous seat reservation from walk inception through seated duration in `freeSeats`, prevent duplicate patron or seat claims in `trySpawn`, ensure full auto-fill capacity quiescence when all stools are occupied, prioritize stock character cast, and ensure complete isolation of patron state from window resize and device orientation changes.

## Not yet specified
*(None. All architectural, state machine, asset selection, auto-spawning, and component ownership decisions required for FS104 are fully specified, verified, and locked across decision tickets ticket-001.md through ticket-004.md and required_edits_104.md).*

## Out of scope
- Altering drink crafting, recipe verification, or inventory carousel mechanisms.
- Changing diegetic receipt printer, paper roll, or checkout animations.
- Modifying mode selection menu containment or startup video sequences.

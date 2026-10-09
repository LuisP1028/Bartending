# Wayfinder Map: FS110 Physical Drag-and-Drop Cocktail Service: Multi-Patron Order Concurrency, Validation Snap-Back, Reversed Departure Motion, and Continuous Turnover

## Destination
Establish an exhaustive, verified architectural decision roadmap and master component edit plan detailing the multi-seat order registry isolation, diegetic drag-and-drop vessel interaction, fail-fast recipe validation gate, snap-back error physics, patron reversed walk departure animation, immediate stool vacating, and continuous turnover spawning required across the codebase to establish an authentic, physical barroom service gameplay loop.

## Notes
- **Governing Specification:** `functional_specification_110.md` (FS110 — Physical drag-and-drop cocktail service: Multi-patron order concurrency, validation snap-back, reversed departure motion, and continuous turnover)
- **Run ID:** `20261009T232731-335-sqow`
- **Domain:** Gameplay loop orchestration, diegetic pointer drag physics, collision detection, recipe validation, multi-patron seating state machine, reversed walk kinematics, and continuous turnover simulation.
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-BOUNDARY-01`: Planning node produces architectural decisions and edit matrices without application code execution. Output files contain pure architectural decisions and edit specifications.
  - `INV-MAP-01`: Monotonic ticketing inside run directory (`ticket-001.md` through `ticket-006.md`) using human-readable titles.
  - `INV-ATOMIC-01`: Discrete, atomic decision tickets resolving one architectural question each.
  - `INV-FAILFAST-01`: Fail fast without silent exception handling, mock fallbacks, or simulated hardcoded responses.
  - `INV-HANDOFF-01`: Deterministic manifest overwrite at `handoff/20261009T232731-335-sqow/wayfinder-read-and-plan.txt`.

## Decisions so far
- [Concurrent Multi-Seat Order Registry & State Lifecycle Isolation (ticket-001.md)](./tickets/ticket-001.md) — Isolate state management across `bar_seat_1` through `bar_seat_4`, synchronize `PatronSeatOrder` lifecycle records (`seatId`, `instanceKey`, `characterId`, `assignedRecipe`, `orderStatus`: `'waiting'` | `'served'` | `'departing'`, `activeDialogue`), deterministically pin catalog recipes upon `onSitComplete` via `pinRandomVariant`, and link ticket rack receipts via `printAttachedTicketRef` and `handoffExitRef`.
- [Diegetic Drag-and-Drop Vessel Interaction & Pointer Physics (ticket-002.md)](./tickets/ticket-002.md) — Implement unified pointer event drag session on the live preparation mat (`drink_placement` / `pov-active-vessel`) when `state.vessel !== null`, enforce scale-invariant coordinate tracking across responsive Game Boy playfield wrappers and mobile touch screens, calculate centroid collision distances to seated patrons, and render real-time candidate recipient visual highlights.
- [Recipe Validation Gate & Fail-Fast Snap-Back Physics (ticket-003.md)](./tickets/ticket-003.md) — Evaluate drink drops against recipient patron's pinned recipe via `RecipeManager.validateDrink`, enforce strict vessel, rim, ingredient tolerance ($\pm 0.05\text{oz}$), agitation, and garnish rules, animate smooth visual snap-back to the live prep mat anchor on rejection or missed drop, preserve drink build state, and trigger error-aware HF rejection speech on failure.
- [Patron Reversed Walk Departure Motion & Animation Inversion (ticket-004.md)](./tickets/ticket-004.md) — Extend patron lifecycle with phase `'leaving'`, construct horizontal exit path from stool terminus `(sitPoint.x, AUTHORITATIVE_GROUND_Y)` back to `AUTHORITATIVE_SPAWN_ORIGIN` (143, 659), flip sprite horizontally (`scaleX(-1)`), sequence walk animation frames in reverse order, scale sprite to full-body height, and cleanly despawn upon reaching the entrance threshold.
- [Immediate Stool Vacating, Turnover Spawning & Continuous Service Loop (ticket-005.md)](./tickets/ticket-005.md) — Immediately vacate bar stool upon transition to `'leaving'`, bypass idle auto-fill timers to trigger immediate replacement arrival via `trySpawn()`, filter active roster to prevent duplicate character twins on stage, consume served cocktail via `trashDrink()`, finalize attached receipts, and maintain an endless bar simulation loop.
- [FS110 Physical Drag-and-Drop Cocktail Service Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol (ticket-006.md)](./tickets/ticket-006.md) — Define verification vectors, assertion oracles, payload schemas, and behavioral edge case tests for acceptance criteria AC1 through AC7.
- [FS110 Physical Drag-and-Drop Cocktail Service Integration Test Execution Protocol, Authentic Codebase Schemas, Payload Admissibility Governance, and Fail-Fast Oracles (ticket-007.md)](./tickets/ticket-007.md) — Resolve authentic codebase schemas, zero-mock payload admissibility, specification oracles, and fail-fast assertions across `src/app/page.tsx`, `src/components/PatronLayer.tsx`, and `src/app/globals.css`, synthesized in [test_matrix_110.md](./test_matrix_110.md).

## Not yet specified
*(None. All architectural, state isolation, pointer physics, recipe validation, departure motion, immediate turnover, and integration test execution decisions required for FS110 are fully specified, verified, and locked across decision tickets ticket-001.md through ticket-007.md, required_edits_110.md, and test_matrix_110.md).*

## Out of scope
- Modifying pixel art sprite assets in `public/assets/patrons/` or `scripts/patron-pipeline/skills/*`.
- Modifying restaurant catalog definitions in `src/data/restaurantCatalogs.ts` or menu mapper batch scripts.
- Altering the retro RPG dialogue box component presentation or typewriter timing calibrated in FS109.
- Modifying Game Boy outer shell chassis layout or battery housing styles.

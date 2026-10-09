# Wayfinder Map: FS100 Core UX and Stage Stability

## Destination
Establish a complete, deterministic, and verified decision set detailing every architectural, styling, layout, state machine, and code edit required across the codebase to implement universal Game Boy boot console containment, deterministic patron walk termination and seating transitions, and complete in-place stage layout stability during equipment drawer interactions without invention, ready for implementation handoff.

## Notes
- **Governing Specification:** `functional_specification_100.md` (Core UX and stage stability: console containment, patron seating, and station view stability)
- **Run ID:** `20261009T155146-282-wzgk`
- **Domain:** Retro 8-bit bartending simulation (Next.js 16, React 19, CSS Container Queries, SVG POV ViewBox, Game Boy shell styling, multi-patron animation engine)
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-BOUNDARY-01`: No implementation code written during planning; output files omit coding prohibitions and downstream execution holds.
  - `INV-MAP-01`: Monotonic ticketing in run directory (`ticket-001.md` through `ticket-006.md`); human-readable titles used throughout.
  - `INV-ATOMIC-01`: Discrete, atomic decision tickets resolving one architectural question each.
  - `INV-FAILFAST-01`: Fail fast without silent fallbacks, hack patches, or arbitrary timeouts.
  - `INV-HANDOFF-01`: Deterministic manifest overwrite at `handoff/20261009T155146-282-wzgk/wayfinder-read-and-plan.txt`.

## Decisions so far
- [Boot Console Viewport Containment & Proportional Sizing (ticket-001.md)](./tickets/ticket-001.md) — Decouple `.boot-intro .gb-shell` from cover-sized menu geometry and enforce proportional containment (`min(...)` aspect ratio scaling with `max-width: 100%`, `max-height: 100%`, and `transform: none`), ensuring 100% unclipped visibility of casing, branding header, D-pad, action buttons, and SELECT/START controls across all viewport sizes and aspect ratios.
- [Boot Video Legibility & Playfield Media Containment (ticket-002.md)](./tickets/ticket-002.md) — Set `.boot-intro__video` to `object-fit: contain` within the dark playfield glass so that all titles, logos, and intro animations play completely without border or title cropping, while preserving 5-tap screen skip and START button click targets.
- [Patron Motion Lifecycle & Deterministic Walk Termination (ticket-003.md)](./tickets/ticket-003.md) — Pre-populate motion clocks synchronously in `trySpawn` before instance admission, implement fail-safe clock healing in the rAF tick loop, and enforce definite transition to `phase: 'seated'` upon reaching stool coordinates (`t >= 1` or elapsed walk duration), eliminating endless walk cycles.
- [Patron Seated State Persistence & Asset Switching (ticket-004.md)](./tickets/ticket-004.md) — Enforce immutability of `phase === 'seated'` so seated patrons permanently display their stationary bust asset (`inst.def.sitSrc`) at counter anchor coordinates (`inst.sitPoint`) without spontaneously reverting to walking animations or being re-spawned upon.
- [In-Place Drawer & Carousel Presentation (Zero Stage Translation) (ticket-005.md)](./tickets/ticket-005.md) — Lock `stagePan` to `{ x: 0, y: 0 }`, remove `shellStagePan` displacement logic on carousel activation, and neutralize CSS transforms on `.gb-shell__playfield .pov-stage` to guarantee strictly `0px` displacement of the underlying bar stage when opening, browsing, or closing equipment drawers.
- [Fixed HUD, Status Element & Receipt Alignment (ticket-006.md)](./tickets/ticket-006.md) — Decouple `shellHudNudge` from drawer toggle events so HUD status banners, jigger controls, and receipt printer hardware remain anchored to fixed glass and stage coordinates with zero jitter or coordinate drift.

## Not yet specified
*(None. All architectural, styling, and state machine decisions required for FS100 are fully specified and locked across decision tickets ticket-001.md through ticket-006.md and required_edits_100.md).*

## Out of scope
- Implementation of new cocktail recipes, drink methods, or inventory items beyond current mode definitions.
- Visual art generation or restyling of character sprites.
- Re-enabling authoring tools (`HotspotPlacementEditor`, `PatronPlacementEditor`).

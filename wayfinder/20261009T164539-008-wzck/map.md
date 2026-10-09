# Wayfinder Map: FS102 Mode Selection Menu Landscape Containment and Orientation Parity

## Destination
Establish a complete, deterministic, and verified decision set detailing every architectural, styling, layout, and container rule edit required across the codebase to implement universal mode selection menu containment in landscape mode ($W > H$), guarantee full orientation parity with the startup sequence, and preserve 100% visibility of all console chrome and menu controls across all window aspect ratios and device orientations.

## Notes
- **Governing Specification:** `functional_specification_102.md` (FS102 — Mode selection menu landscape containment and orientation parity)
- **Run ID:** `20261009T164539-008-wzck`
- **Domain:** Retro 8-bit handheld console UI (Next.js 16, React 19, CSS Container Queries, Game Boy shell styling, Synthwave Navigator menu)
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-BOUNDARY-01`: No implementation code written during planning; output files omit coding prohibitions and downstream execution holds.
  - `INV-MAP-01`: Monotonic ticketing in run directory (`ticket-001.md` through `ticket-003.md`); human-readable titles used throughout.
  - `INV-ATOMIC-01`: Discrete, atomic decision tickets resolving one architectural question each.
  - `INV-FAILFAST-01`: Fail fast without silent fallbacks, hack patches, or arbitrary timeouts.
  - `INV-HANDOFF-01`: Deterministic manifest overwrite at `handoff/20261009T164539-008-wzck/wayfinder-read-and-plan.txt`.

## Decisions so far
- [Mode Selection Menu Console Viewport Containment & Aspect-Ratio Sizing (ticket-001.md)](./tickets/ticket-001.md) — Eliminate `max(...)` cover-expansion and `translateY(-4%)` on `.main-menu .gb-shell` in `src/app/gameboy-shell.css`, enforcing proportional containment (`min(100cqw, calc(100cqh * 422 / 697))` and `min(100cqh, calc(100cqw * 697 / 422))` with `max-width: 100%`, `max-height: 100%`, `transform: none`, and `box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45)`), with fallback viewport units in `@supports not (width: 1cqw)`.
- [Mode Selection Shell Slot Framing, Alignment & Letterbox Parity (ticket-002.md)](./tickets/ticket-002.md) — Unify `.main-menu .main-menu__slot.gb-shell-slot, .main-menu .gb-shell-slot` with `.boot-intro .gb-shell-slot` in `src/app/gameboy-shell.css` to enforce explicit dimensions (`width: 100%; height: 100%`) and dark `#111` backdrop letterboxing, ensuring centered positioning and zero visual flashing during startup-to-menu transition in landscape mode.
- [Mode Selection Playfield Centering & Dynamic Resize Pointer Synchronization (ticket-003.md)](./tickets/ticket-003.md) — Verify that interior menu components (`.synthwaveNav`, `.modeLogoRow`) remain centered and unclipped inside `.gb-shell__playfield` under proportional containment, and that dynamic resize events in `src/components/MainMenu.tsx` maintain exact pointer calibration without coordinate drift.

## Not yet specified
*(None. All architectural, styling, and layout decisions required for FS102 are fully specified and locked across decision tickets ticket-001.md through ticket-003.md, and required_edits_102.md).*

## Out of scope
- Altering in-game bartending playfield stage layout or camera angles.
- Re-styling boot video media playback or controls.
- Modifying cocktail recipes or inventory management data structures.

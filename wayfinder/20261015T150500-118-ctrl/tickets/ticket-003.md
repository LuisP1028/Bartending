---
id: ticket-003
title: Swap A and B Button Roles Globally Across Console Phases
status: completed
depends_on: []
acceptance_criteria:
  - AC-03
---

# Ticket 003: Swap A and B Button Roles Globally Across Console Phases

## Scope
Reverse the functional roles of the `A` (`button-a`) and `B` (`button-b`) buttons across `intro`, `menu`, `Comm-Link`, `Camera`, and `play` phases so that **`A` acts as Interact / Confirm / Select** and **`B` acts as Back / Cancel / Dismiss** (`INV-AB-SWAP-01`).

## Completed Edits
- `src/components/GameBoy3DShell.tsx`: Updated `aria-label` and `title` on `.gb-shell__btn-a` (`Interact / Select (A Button)`) and `.gb-shell__btn-b` (`Back / Close (B Button)`), and updated prop JSDoc comments.
- `src/components/MainMenu.tsx` & `src/components/BootIntro.tsx`: Updated button labels, JSDoc comments, and fallback 2D shell `.gb-shell__btn-a` / `.gb-shell__btn-b` click handlers so `A` triggers `interact` and `B` triggers `back`.
- `src/app/page.tsx`: Swapped `handle3DPressA` and `handle3DPressB` (and renamed `shellPressAInteract` / `shellPressBBack`) so `onPressA` executes primary Interact/Confirm/Select across all phases and `onPressB` executes Back/Cancel/Dismiss across all phases.

## Verification (`AC-03`)
- Verified across `intro`, `menu` (`Comm-Link` & `Mode Selection`), and `play` phases in Playwright:
  - `.gb-shell__btn-a` `aria-label`: `"Interact / Select (A Button)"`
  - `.gb-shell__btn-b` `aria-label`: `"Back / Close (B Button)"`
  - Pressing `B` skips `intro` to `menu`; pressing `A` opens `Comm-Link` (`commLinkOpenedWithA: true`); pressing `B` closes `Comm-Link` (`commLinkClosedWithB: true`); pressing `A` on `Mode Selection` enters `play`.

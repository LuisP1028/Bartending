# Required Edits — Functional Specification 118 (`functional_specification_118.md`)

## Edit 1: Disable Mobile Auto-Zoom on Chatbox Text Input (`AC-01`, `INV-NO-MOBILE-ZOOM-01`)
- **`src/app/layout.tsx`**:
  - Add `maximumScale: 1` and `userScalable: false` to `export const viewport: Viewport` so mobile browsers lock the viewport scale at `1.0`.
- **`src/components/PatronInspectionCarousel.module.css`**:
  - Update `.customInput` to use `font-size: 16px`, `font-family: var(--font-receipt), 'VT323', var(--font-press-start), monospace`, `line-height: 1.1`, `-webkit-text-size-adjust: 100%`, and `touch-action: manipulation` so the computed `font-size` is `>= 16px` (preventing iOS Safari / mobile browser focus auto-zoom) while preserving compact 8-bit pixel legibility inside `.customInputRow`.

## Edit 2: Eliminate Mobile Pill-Shaped Hitboxes on Start / Options (`SELECT`) Buttons (`AC-02`, `INV-START-SELECT-TRANSPARENT-01`)
- **`src/app/gameboy-shell.css`**:
  - Scope legacy 2D mobile portrait button styles (`@media (hover: none) and (pointer: coarse) and (orientation: portrait) and (max-width: 600px)`) to `:not(.gb-3d-shell-host)` and add explicit `.gb-3d-shell-host [data-gb-3d-controls="true"]` overrides forcing `background: transparent !important`, `box-shadow: none !important`, `border: none !important`, `border-radius: 0 !important`, and `::before`/`::after` `content: none !important; display: none !important`.
- **`src/components/GameBoy3DShell.tsx`**:
  - Add explicit inline `boxShadow: 'none'`, `outline: 'none'`, `borderRadius: 0`, and `WebkitTapHighlightColor: 'transparent'` to `.gb-shell__btn-select`, `.gb-shell__btn-start`, `.gb-shell__btn-a`, `.gb-shell__btn-b`, and `.gb-shell__dpad`.

## Edit 3: Swap the `A` and `B` Buttons Globally (`AC-03`, `INV-AB-SWAP-01`)
- **`src/components/GameBoy3DShell.tsx`**:
  - Update `aria-label` and `title` on `.gb-shell__btn-a` to `"Interact / Select (A Button)"` and on `.gb-shell__btn-b` to `"Back / Close (B Button)"`.
- **`src/components/MainMenu.tsx` & `src/components/BootIntro.tsx`**:
  - Update JSDoc comments and fallback 2D shell `.gb-shell__btn-a` / `.gb-shell__btn-b` handlers so `A` triggers `interact` (`activateCurrent`) and `B` triggers `back` (`goBack`).
- **`src/app/page.tsx`**:
  - Swap `handle3DPressA` and `handle3DPressB` so `onPressA` (`button-a`) invokes `bootIntroRef.current?.interactTap()`, `mainMenuRef.current?.interact()`, and `shellPressAInteract()`, while `onPressB` (`button-b`) invokes `bootIntroRef.current?.finish()`, `mainMenuRef.current?.back()`, and `shellPressBBack()`.

## Edit 4: D-Pad Patron Cycling & Thin Orange Silhouette Outline (`AC-04`, `AC-05`, `INV-DPAD-PATRON-LOOP-01`, `INV-PATRON-ORANGE-OUTLINE-01`)
- **`src/components/PatronLayer.tsx`**:
  - Add `dpadFocusedSeatId?: string | null` and `onSeatedSeatsChange?: (seatIds: string[]) => void` to `PatronLayerProps`, and `getSeatedSeatIds: () => string[]` to `PatronLayerHandle`.
  - Apply `.pov-patron-sprite--dpad-focus` when `isSeated && dpadFocusedSeatId === inst.seatId` and `.pov-patron-sprite--inspected` when `isSeated && isolatedSeatId === inst.seatId`, along with `data-dpad-focused`, `data-inspected`, and `data-orange-outline` attributes.
- **`src/app/globals.css`**:
  - Add a thin orange silhouette contour filter (`drop-shadow(1.5px 0 0 #ff8c00) drop-shadow(-1.5px 0 0 #ff8c00) drop-shadow(0 1.5px 0 #ff8c00) drop-shadow(0 -1.5px 0 #ff8c00) drop-shadow(0 3px 4px rgba(0, 0, 0, 0.45))`) on `.pov-patron-sprite--sit:hover`, `.pov-patron-sprite--dpad-focus`, and `.pov-patron-sprite--inspected`.
- **`src/app/page.tsx`**:
  - Track `seatedSeatIds` and `focusedPatronSeatId` in `Home`.
  - Update `shellDpad` to cycle through seated patrons (`Left`/`Right` cycles across occupied seats in `BAR_SEAT_ZONE_IDS` order; `Down` transitions to bar station hotspots; `Up` from upper hotspots transitions to seated patrons).
  - Update `shellPressAInteract` so pressing `A` while `focusedPatronSeatId` is set opens that patron's receipt/conversation box (`handlePatronClick(focusedPatronSeatId)`).
  - Update `shellPressBBack` (and `handlePatronClick` toggle / `Escape`) so pressing `B` while a patron's receipt/conversation box is open closes the inspection view, restores all seated patrons, and preserves `focusedPatronSeatId` on that patron so the user immediately returns to hovering over that patron with their thin orange outline active.

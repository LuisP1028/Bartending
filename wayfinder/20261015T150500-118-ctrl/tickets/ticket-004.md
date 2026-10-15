---
id: ticket-004
title: D-Pad Patron Cycling, A/B Inspection Loop, Thin Orange Silhouette Outline & Playwright Verification
status: completed
depends_on:
  - ticket-001
  - ticket-002
  - ticket-003
acceptance_criteria:
  - AC-04
  - AC-05
  - AC-06
---

# Ticket 004: D-Pad Patron Cycling, A/B Inspection Loop, Thin Orange Silhouette Outline & Playwright Verification

## Scope
1. Enable D-Pad scrolling through seated patrons at the bar (`bar_seat_1` .. `bar_seat_4` in left-to-right order):
   - Cycle through seated patrons via `D-Pad` (`focusedPatronSeatId`)
   - Press `A` (`button-a`) while hovering a patron to open their receipt/conversation box (`PatronInspectionCarousel`) and isolate that patron
   - Press `B` (`button-b`) while the patron receipt/conversation box is open to close it, restore all seated patrons, and return directly to hovering over that same patron (`focusedPatronSeatId` preserved).
2. Render a crisp thin orange silhouette outline (`~1px–2px` contour around the character sprite) whenever a seated patron is pointer-hovered, `D-Pad`-focused, or clicked/inspected (`INV-PATRON-ORANGE-OUTLINE-01`).
3. Verify all acceptance criteria (`AC-01` through `AC-06`) across desktop (`1280×800`) and mobile (`390×844`) viewports in live Playwright.

## Completed Edits
- `src/components/PatronLayer.tsx`: Added `dpadFocusedSeatId`, `onSeatedSeatsChange`, and `getSeatedSeatIds`; applied `.pov-patron-sprite--dpad-focus`, `.pov-patron-sprite--inspected`, and `.pov-patron-sprite--hovered` classes + `data-dpad-focused` / `data-inspected` / `data-orange-outline` attributes on seated patron sprites.
- `src/app/globals.css`: Added thin orange silhouette contour filter (`drop-shadow(1.5px 0 0 #ff8c00) drop-shadow(-1.5px 0 0 #ff8c00) drop-shadow(0 1.5px 0 #ff8c00) drop-shadow(0 -1.5px 0 #ff8c00) drop-shadow(0 3px 4px rgba(0, 0, 0, 0.45))`) on `.pov-patron-sprite--sit:hover`, `.pov-patron-sprite--hovered`, `.pov-patron-sprite--dpad-focus`, and `.pov-patron-sprite--inspected`.
- `src/app/page.tsx`: Tracked `seatedSeatIds` and `focusedPatronSeatId`, wired D-Pad patron cycling (`Left`/`Right` cycles seated patrons, `Down` transitions to bar station hotspots, `Up` from hotspots transitions back to seated patrons), opened patron inspection on `A`, and restored patron hover focus on `B`.

## Verification (`AC-04`, `AC-05`, `AC-06`)
- Verified in live Playwright on desktop (`1280×800`, `desktop_dpad_focus.png` & `desktop_patron_inspect.png`) and mobile (`390×844`, `mobile_portrait_shell.png` & `mobile_chat_input_focus.png`):
  - `D-Pad Right` focused `bar_seat_1` then `bar_seat_2` with `data-dpad-focused="true"`, `data-orange-outline="true"`, and computed filter `drop-shadow(rgb(255, 140, 0) 1.5px 0px 0px) drop-shadow(rgb(255, 140, 0) -1.5px 0px 0px) drop-shadow(rgb(255, 140, 0) 0px 1.5px 0px) drop-shadow(rgb(255, 140, 0) 0px -1.5px 0px) drop-shadow(rgba(0, 0, 0, 0.45) 0px 3px 4px)`.
  - Pressing `A` opened `[data-testid="patron-inspection-carousel"]` (`carouselOpen: true`, `activeSlide: "order"`), isolated `bar_seat_2` (`data-inspected="true"`), and pressing `D-Pad Right` switched to `activeSlide: "chat"`.
  - Pressing `B` closed `[data-testid="patron-inspection-carousel"]` (`carouselOpen: false`), restored all seated patrons, and preserved `data-dpad-focused="true"` and `data-orange-outline="true"` on `bar_seat_2`.
  - `npx tsc --noEmit` exited with code `0`; browser console reported `0` errors (`AC-06`).

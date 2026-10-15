# Wayfinder Run Summary — `20261014T210600-114-gbui` (FS-114)

## Overview
Implemented and live-verified all requirements in `functional_specification_114.md` across desktop (`1280×800`) and mobile (`390×844`) viewports via Playwright MCP:

1. **Ticket 001 (`AC-01`, `INV-DIALOGUE-BOTTOM-01`) — Bottom-Docked Character Dialogue Boxes**:
   - Anchored `RetroRpgDialogueBox` at the bottom of the Game Boy playfield (`height: 27.5%` of `--shell-glass-h`, always `≤ 30%`, `width: 95%`), leaving the upper `72.5%` of the bar stage and all seated patrons unobstructed.
   - Configured container-proportional typography (`container-type: size`) so 4–5 line uppercase dialogue strings render with zero vertical clipping on both `1280×800` desktop and `390×844` mobile viewports.

2. **Ticket 002 (`AC-02`, `INV-FAILFAST-01`) — Receipt Patron Attribution & Fail-Fast Guards**:
   - Added `patronName` to `ReceiptOrderEntity` and enforced fail-fast validation in `mapTicketToReceipt` and `page.tsx` when `characterId`, `seatId`, or `patronName` is missing on patron orders.
   - Rendered `PATRON: <DISPLAY NAME>` prominently on both summary and full faces of `ReceiptPaper`.

3. **Ticket 003 (`AC-03`, `INV-PRINTER-TRANSIENT-01`) — Transient Receipt Printer Lifecycle**:
   - Implemented transient printer phases (`idle` → `fading-in` → `printing` → `holding` → `fading-out` → `idle`) in `ReceiptSystem.tsx` and `receipt.css`.
   - Fixed concurrent patron sit queueing with functional state updates in `enqueueOrStartEntity` so 3 simultaneous patron orders print sequentially and return the printer housing to `0` screen footprint (`opacity: 0; visibility: hidden; pointer-events: none`).

4. **Ticket 004 (`AC-04`, `AC-05`, `INV-PATRON-ISOLATION-01`, `INV-RECEIPT-BOX-01`) — Patron-Click Ticket Inspection, Temporary Patron Isolation & Red-Box Placement**:
   - Added `onPatronClick` and `isolatedSeatId` to `PatronLayer.tsx` and `page.tsx` so clicking a seated patron `x` (without dragging a vessel) hides all other patrons, selects patron `x`'s order as active, and opens patron `x`'s full receipt without the printer bezel inside the proportional red reference box (`left: 35%`, `top: 14%`, `width: 35%`, `height: 58%` of `--shell-glass-*`).
   - Verified dismissal via receipt click (`ReceiptPaper.tsx`), background click, or Game Boy `A` button restores all other seated patrons immediately.

5. **Ticket 005 (`AC-06`, `INV-JIGGER-TEXT-01`) — Jigger Control Sizing & Unclipped Typography**:
   - Updated `.jigger-pour-trigger`, `.jigger-pour-caption`, `.jigger-pour-current`, and `.jigger-pour-panel` in `globals.css` so `"JIGGER"` and `"0.50 oz"` render on single lines with `scrollWidth === clientWidth` (`34 === 34`) and zero clipping across desktop and mobile viewports.

6. **Ticket 006 (`AC-07`, `AC-08`) — Carousel Bottle Sizing & Dialogue-Themed Item Name Popup**:
   - Un-squashed bottle shelf frames (`speedrail`, `syrups`, `juices`, `fridge`) in `hotspotGeometry.ts`, removed inline `.asset-under-label` from `overlay` carousel items, and rendered the Retro RPG Dialogue-themed item name popup (`[data-testid="carousel-dialogue-popup"]`) above the active carousel, synchronized in real time with scroll and Game Boy D-Pad navigation.
   - Confirmed zero console errors, zero uncaught page errors, and `200 OK` on all `/api/dialogue` and `/api/patrons/roster` requests.

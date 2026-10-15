---
ticket_id: "003"
title: "Patron-Click Ticket Inspection, Temporary Patron Isolation & Screen-Size-Agnostic Red-Box Containment"
type: task
status: resolved
claimed_by: "wayfinder"
blocked_by: ["ticket-001.md", "ticket-002.md"]
governing_specification: "functional_specification_114.md"
---

# Ticket 003: Patron-Click Ticket Inspection, Temporary Patron Isolation & Screen-Size-Agnostic Red-Box Containment

## Question
How does clicking a seated patron `x` isolate patron `x` by hiding all other bar patrons, bind patron `x`'s order to the active bar mat, and display patron `x`'s opened full receipt—without the receipt printer—inside the exact proportional stage region defined by `/Users/diesel/Desktop/receipt_render_box.png` (`left: ~35%`, `top: ~14%`, `width: ~35%`, `height: ~58%`) across all screen sizes?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_114.md`
  - §3.1 (`receipt_render_box.png`): Red outline rectangular region situated immediately to the right of the left-seated patron, spanning horizontally from `~35%` to `~70%` of the Game Boy screen width (`width: ~35%`) and vertically from `~14%` to `~72%` from the top of the screen (`height: ~58%`), above the lower bottle shelf rail and clear of the bottom-right jigger control.
  - §4.3 (Clicking a Seated Patron to Inspect Their Ticket):
    1. **No Printer Hardware**: Patron `x`'s receipt appears directly on screen **without** the receipt printer hardware bezel.
    2. **Temporary Isolation of Clicked Patron**: All **other** patrons at the bar (seated or walking in other seats) are temporarily blocked out / hidden from view while patron `x`'s receipt is open, isolating visual focus on patron `x` and their order. Patron `x` remains visible in their seat.
    3. **Full Opened Ticket in the Red Reference Box**: Renders in its opened, full recipe state inside `left: ~35%`, `top: ~14%`, `width: ~35%`, `height: ~58%` of the Game Boy screen, scaled proportionally across all viewports.
    4. **Active Order Binding**: Selects and binds patron `x`'s receipt as the active order on the bar mat (parking any previous build and loading patron `x`'s in-progress drink build).
  - §4.3 (Dismissing the Patron's Ticket & Coexistence with Drink Delivery): Clicking/tapping the open receipt, clicking outside on the bar background, or pressing Game Boy `A` (Back) closes the receipt and immediately restores visibility of all other patrons. Dragging a prepared vessel onto seated patron `x` continues to execute recipe validation and drink service.
  - §5 `INV-PATRON-ISOLATION-01`, `INV-RECEIPT-BOX-01`.
  - §6 `AC-04`, `AC-05`.

## Codebase Audit & Root Cause Analysis

1. **Seated Patron `onClick` Miswired to `onServeDrinkToSeat` in `src/components/PatronLayer.tsx`**:
   - In `PatronLayer.tsx` (L732–L738), clicking a seated patron called `onServeDrinkToSeat?.(inst.seatId)`, which immediately snapped back and did nothing when no drink was being dragged, or prematurely attempted drink validation instead of inspecting the patron's order ticket.
2. **No Imperative Receipt Inspection API or Patron Isolation State**:
   - `ReceiptSystem.tsx` had no imperative bridge for `page.tsx` to open/close a specific receipt `instanceId` on patron click or report `inspectedReceiptId` / `inspectedSeatId` back to `page.tsx`.
   - `PatronLayer.tsx` had no `isolatedSeatId` prop to temporarily hide non-inspected patrons while preserving their motion clocks and seat states.
3. **Inspected Receipt Positioning & Sizing Not Bound to Red Reference Box**:
   - `positionForInspect` in `ReceiptSystem.tsx` placed expanded receipts near the top-right corner using fixed pixel clamps (`PAPER_W = 280`, `PAPER_H = 320`) rather than the proportional red-box region (`left: 35%`, `top: 14%`, `width: 35%`, `height: 58%` of the visible Game Boy screen).

## Architectural Decisions Locked

1. **Separate Patron Click (`onPatronClick`) from Vessel Drop (`onServeDrinkToSeat`) in `src/components/PatronLayer.tsx` & `src/app/page.tsx`**:
   - Add `onPatronClick?: (seatId: string) => void` and `isolatedSeatId?: string | null` props to `PatronLayer`.
   - On seated patron `<img>`, wire `onClick` to call `onPatronClick?.(inst.seatId)` (when not dragging a vessel), while `onDrop` and vessel pointer-drag release in `page.tsx` continue to call `onServeDrinkToSeat(seatId)`.
   - When `isolatedSeatId` is non-null in `PatronLayer.tsx`, any patron instance with `inst.seatId !== isolatedSeatId` renders with `visibility: 'hidden'`, `opacity: 0`, `pointerEvents: 'none'`, and `data-patron-hidden="true"`, while keeping its `PatronInstance` state and `motionClockRef` intact (`INV-PATRON-ISOLATION-01`).
2. **Bidirectional Patron-Receipt Inspection Bridge (`src/components/receipt/ReceiptSystem.tsx`, `src/app/page.tsx`)**:
   - Add `inspectReceiptRef?: React.MutableRefObject<((instanceId: string | null) => void) | null>` and `onInspectChange?: (instanceId: string | null, seatId: string | null) => void` to `ReceiptProviderProps`.
   - When `handlePatronClick(seatId)` fires in `page.tsx`:
     - Verify `seatOrders[seatId]` and its `receiptInstanceId` exist (fail-fast error if missing).
     - Toggle inspection via `inspectReceiptRef.current(order.receiptInstanceId)`:
       - Selects and binds the receipt as the active order on the bar mat (`handleSelectReceipt`), parking any prior build and loading patron `x`'s build.
       - Sets `inspected: true` exclusively on `order.receiptInstanceId` (even if that receipt was still in its transient print phase, immediately promoting it to `phase: 'free', inMask: false, inspected: true` and cancelling the transient printer overlay so no printer bezel is shown!).
       - Sets `inspectedSeatId = seatId` so all other patrons are hidden.
   - Dismissing the inspected receipt:
     - Clicking/tapping the open receipt (`toggleExpand`), clicking outside the receipt on the bar stage background, or pressing the Game Boy `A` button (`shellPressABack`) calls `inspectReceiptRef.current(null)`, closing the receipt and setting `inspectedSeatId = null` to immediately restore all other patrons at the bar while keeping `activeReceiptId` / `activeTicket` bound on the bar mat.
3. **Screen-Size-Agnostic Red-Box Containment (`src/app/receipt.css`, `src/components/receipt/ReceiptPaper.tsx`)**:
   - Style `.receipt-wrapper.state-inspected` to anchor strictly to the visible Game Boy screen's red reference box (`INV-RECEIPT-BOX-01`):
     - `left: calc(var(--shell-glass-inset-x, 0px) + var(--shell-glass-w, 100cqi) * 0.35) !important;`
     - `top: calc(var(--shell-glass-inset-y, 0px) + var(--shell-glass-h, 100cqb) * 0.14) !important;`
     - `width: calc(var(--shell-glass-w, 100cqi) * 0.35) !important;`
     - `height: calc(var(--shell-glass-h, 100cqb) * 0.58) !important;`
     - `max-height: calc(var(--shell-glass-h, 100cqb) * 0.58) !important;`
     - `container-type: size; container-name: inspected-receipt;`
   - Scale all internal full-receipt typography, padding, logo, dividers, and barcode proportionally to the inspected receipt container (`cqi` units inside `inspected-receipt`) so 100% of horizontal text is unclipped and long recipes scroll smoothly vertically.

## Acceptance & Verification Oracles
- Clicking a seated patron `x` opens their full receipt without any receipt printer bezel, binds their order to the mat, and hides all other bar patrons (`AC-04`).
- The opened receipt's bounding box relative to `.gb-shell__playfield` measures `left ≈ 35%`, `width ≈ 35%` (`right ≈ 70%`), `top ≈ 14%`, `height ≈ 58%` (`bottom ≈ 72%`) across both desktop and mobile viewports (`AC-05`).
- Closing the receipt (via click on receipt, click on bar background, or Game Boy `A` button) immediately restores visibility of all other bar patrons (`INV-PATRON-ISOLATION-01`).

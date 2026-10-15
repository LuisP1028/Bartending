---
ticket_id: "002"
title: "Transient Receipt Printer Lifecycle, Patron Attribution & Sequential Queue Integrity"
type: task
status: resolved
claimed_by: "wayfinder"
blocked_by: []
governing_specification: "functional_specification_114.md"
---

# Ticket 002: Transient Receipt Printer Lifecycle, Patron Attribution & Sequential Queue Integrity

## Question
How does the receipt system eliminate permanent printer hardware and floating ticket clutter, attribute every patron receipt with the ordering patron's display name (`PATRON: <DISPLAY NAME>`), and execute a deterministic **fade-in → print → pause → fade-out** lifecycle with sequential queue integrity?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_114.md`
  - §4.2 (Hidden When Idle): "The receipt printer hardware bezel and paper slot must **not** remain permanently visible on the screen when no ticket is actively printing."
  - §4.2 (Automated Print Sequence):
    1. **Fade In**: The receipt printer hardware fades smoothly into the top-right area of the screen.
    2. **Print Ticket**: The receipt paper unrolls/prints downward from the printer slot, displaying the summary ticket marked with the ordering patron's name.
    3. **Pause & Fade Out**: After the ticket finishes unrolling and remains briefly readable, **both the printed ticket and the receipt printer fade out and disappear completely** from the screen, returning the upper-right bar scene to an unobstructed state.
  - §4.2 (Sequential Queue Integrity): "If multiple patrons sit down in close succession, their print jobs queue cleanly so each ticket prints visibly and then disappears without leaving orphan paper slips or stuck printer hardware on screen."
  - §4.3 (Explicit Patron Attribution on Every Receipt): "Every receipt generated for a patron must store and visibly display the **patron's display name** (e.g., `PATRON: <DISPLAY NAME>`) on both the summary face (during the transient print animation) and the full expanded receipt face."
  - §5 `INV-PRINTER-TRANSIENT-01`, `INV-FAILFAST-01`.
  - §6 `AC-02`, `AC-03`.

## Codebase Audit & Root Cause Analysis

1. **Permanent Printer & Floating Free Slips in `ReceiptSystem.tsx` / `receipt.css`**:
   - `.receipt-hardware-cluster` was unconditionally rendered and visible at all times.
   - When `releaseToFree` ran, printed tickets transitioned to `phase: 'free', inMask: false` and remained permanently rendered in `.receipt-free-layer` at the top-right of the stage, stacking on top of each other and blocking the bar view.
2. **Missing Synchronous `instanceId` When Queued**:
   - In `ReceiptSystem.tsx`, `printAttachedTicket` pushed onto `printQueueRef` and returned `null` if `printingRef.current` was true, causing `seatOrders[seatId].receiptInstanceId` in `page.tsx` to be `null` whenever two patrons sat down in close succession.
3. **Missing `patronName` Field on `ReceiptEntity` and `ReceiptPaper.tsx`**:
   - `ReceiptEntity` stored `characterId` and `seatId` but did not store or render `patronName` (`PATRON: <DISPLAY NAME>`) on either the summary face or full face.

## Architectural Decisions Locked

1. **Enforce Patron Attribution on `ReceiptEntity` & `ReceiptPaper` (`src/lib/receipt/types.ts`, `src/lib/receipt/mapTicketToReceipt.ts`, `src/components/receipt/ReceiptPaper.tsx`)**:
   - Add `patronName?: string` to `ReceiptEntity`, `CreateReceiptOptions`, and `PatronReceiptMeta`.
   - In `createReceiptEntity`, when `characterId` or `seatId` is provided, resolve `patronName` from `options.patronName` or `getCharacter(options.characterId)?.displayName`. Enforce `INV-FAILFAST-01`: throw a fatal error if a patron-attached ticket is missing `characterId`, `seatId`, or a valid `patronName`.
   - Render `PATRON: <DISPLAY NAME>` on both the summary face (`.receipt-paper--summary`) and the full face (`.receipt-paper--full`) of `ReceiptPaper.tsx`.
2. **Synchronous Entity Creation & Transient Print Lifecycle (`src/components/receipt/ReceiptSystem.tsx`, `src/app/receipt.css`)**:
   - Create the `ReceiptEntity` synchronously in `printAttachedTicket` and `enqueueOrPrint` so `entity.instanceId` is always returned immediately to bind `seatOrders[seatId].receiptInstanceId`.
   - Manage transient print state (`printerPhase: 'idle' | 'fading-in' | 'printing' | 'holding' | 'fading-out'`) for the active printing `instanceId`:
     1. `fading-in` (`180ms`): `.receipt-hardware-cluster` mounts and fades in (`opacity: 0 → 1`) at the top-right of the visible Game Boy screen.
     2. `printing` (`1100ms`): `.receipt-wrapper.anim-printing` unrolls downward from the printer slot inside `.receipt-printer-mask`, displaying the summary face with `PATRON: <DISPLAY NAME>`.
     3. `holding` (`650ms`): unrolled summary ticket remains readable beneath the slot.
     4. `fading-out` (`320ms`): both `.receipt-hardware-cluster` and `.receipt-printer-mask` fade out (`opacity: 1 → 0`).
     5. Completion: `entity` transitions to `phase: 'free', inMask: false, inspected: false` (stored off-screen in `receipts` state for patron-click inspection), `printerPhase` resets to `'idle'` (unmounting/hiding the printer hardware with `0` screen footprint), and the next queued `instanceId` in `printQueueRef` immediately starts its `fading-in` sequence.
3. **Zero Uninspected Free Ticket Clutter**:
   - `.receipt-free-layer` renders only receipts where `entity.inspected === true` or `entity.handoffExit === true`. Uninspected `free` receipts have `0` screen footprint while remaining preserved in state for patron-click inspection.

## Acceptance & Verification Oracles
- When idle (no active print job), `.receipt-hardware-cluster` and uninspected free tickets are absent/hidden with `0` screen footprint (`INV-PRINTER-TRANSIENT-01`).
- When a patron sits or a ticket is generated, the printer fades in, unrolls the ticket showing `PATRON: <DISPLAY NAME>`, pauses briefly, and both ticket and printer fade out completely (`AC-02`, `AC-03`).
- Multiple sequential sit-completions return valid non-null `receiptInstanceId` values synchronously and print one after another without orphan slips.

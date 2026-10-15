---
ticket_id: "002"
title: "State 2 (2disappear) Synchronized Transient Dismissal & Queue Integrity"
type: task
status: resolved
claimed_by: "wayfinder"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_116.md"
---

# Ticket 002: State 2 (`2disappear`) Synchronized Transient Dismissal & Queue Integrity

## Question
How do we ensure that after the summary receipt finishes unrolling and holds briefly for reading, both the summary slip and the printer hardware smoothly fade out together and leave zero residual hardware or paper clutter on the Game Boy screen (`2disappear`)?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_116.md` (§4.2 State 2 `2disappear`, §5 `INV-DISAPPEAR-CLEAN-01`, §6 `AC-03`).
- **Affected Files:**
  - `src/components/receipt/ReceiptSystem.tsx`
  - `src/app/receipt.css`

## Architectural Decisions to Lock
1. **Synchronized Hold & Fade-Out Lifecycle (`AC-03`, `INV-DISAPPEAR-CLEAN-01`)**:
   - `ReceiptProvider` executes `fading-in` (`180ms`) → `printing` (`650ms`) → `holding` (`900ms`) → `fading-out` (`280ms`) → `idle`.
   - During `fading-out`, both `.receipt-hardware-cluster` and `.receipt-printer-mask` transition to `opacity: 0`.
   - Upon transitioning to `idle`, both elements enforce `opacity: 0 !important; visibility: hidden !important; pointer-events: none !important;`, and uninspected `free` receipts are excluded from stage rendering unless `inspected === true` or `handoffExit === true`.
2. **Sequential Queue Integrity**:
   - Concurrent or rapid-succession patron sit-completions enqueue onto `printQueueRef` and execute full `1appear` → `2disappear` cycles sequentially without overlapping slips or stuck printer hardware.

---

## Resolution

### 1. Locked Implementation Edits
- Verified and preserved transient lifecycle phase transitions and CSS visibility locks in `src/components/receipt/ReceiptSystem.tsx` and `src/app/receipt.css`.

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** `ticket-004.md`

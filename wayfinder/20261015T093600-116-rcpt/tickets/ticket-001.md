---
ticket_id: "001"
title: "State 1 (1appear) Printer Slot Alignment, Unclipped Summary Paper & Single-Line Summary Typography"
type: task
status: resolved
claimed_by: "wayfinder"
blocked_by: []
governing_specification: "functional_specification_116.md"
---

# Ticket 001: State 1 (`1appear`) Printer Slot Alignment, Unclipped Summary Paper & Single-Line Summary Typography

## Question
How do we eliminate the printer housing slicing off the top header (`OBELISCO`), prevent `PATRON: <DISPLAY NAME>` truncation and `CHK: ORD-XXXX` / `HH:MM AM` multi-line shattering, and ensure the entire summary ticket (drink name, vessel, method, ingredient summary, `TOTAL`, and jagged bottom tear edge) unrolls visibly without vertical clipping during `1appear`?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_116.md` (§3.1 Defect Reference 1, §4.1 State 1 `1appear`, §5 `INV-APPEAR-UNCLIPPED-01`, `INV-TEXT-INTEGRITY-01`, §6 `AC-01`, `AC-02`).
- **Affected Files:**
  - `src/app/receipt.css`
  - `src/components/receipt/ReceiptPaper.tsx`

## Architectural Decisions to Lock
1. **Strict Zero-Overlap Printer Slot Geometry (`AC-01`, `INV-APPEAR-UNCLIPPED-01`)**:
   - Define `--printer-top: calc(var(--shell-glass-inset-y, 0px) + clamp(3px, calc(var(--shell-glass-h, 240px) * 0.015), 7px))` and `--printer-h: clamp(20px, calc(var(--shell-glass-h, 240px) * 0.085), 28px)` on `.receipt-system--pov`.
   - Set `.receipt-hardware-cluster` to `top: var(--printer-top); height: var(--printer-h); min-height: 0;` and constrain `.receipt-printer-bezel` to `top: 2px; bottom: 0; height: auto;` so the bezel never overflows below `.receipt-hardware-cluster`.
   - Set `.receipt-printer-mask` to `top: calc(var(--printer-top) + var(--printer-h));` so the unrolled summary paper starts strictly at the bottom edge of the printer bezel (`0px` overlap).
2. **Proportional Summary Paper Width, Container Queries & Single-Line Metadata (`AC-02`, `INV-TEXT-INTEGRITY-01`)**:
   - Widen `--receipt-paper-w` to `clamp(122px, calc(var(--shell-glass-w, 320px) * 0.44), 190px)` and set `container-type: inline-size` on `.receipt-printer-mask`.
   - Scale `.receipt-printer-mask .receipt-paper--summary` typography with `cqw` units (`--r-fs-xs: clamp(5.5px, 4.3cqw, 8.5px)`, `--r-fs-sm: clamp(6px, 4.6cqw, 9px)`, `--r-fs-md: clamp(6.5px, 5cqw, 10px)`, `--r-fs-lg: clamp(7px, 5.5cqw, 11px)`, `--r-fs-xl: clamp(7.5px, 6cqw, 12px)`).
   - Enforce `white-space: nowrap !important; word-break: keep-all !important; overflow-wrap: normal !important; max-width: none !important;` on `.r-line.r-meta .r-line-label` and `.r-line.r-meta .r-line-value`.
3. **Unclipped Summary Ticket Body & Jagged Tear Edge (`AC-02`, `INV-APPEAR-UNCLIPPED-01`)**:
   - Set `.receipt-printer-mask` height to `calc(var(--shell-glass-h, 240px) * 0.64)` with `padding-bottom: 8px` and set `.receipt-wrapper.anim-printing` to `overflow: visible` so the entire summary slip (header, patron name, check/time row, drink name, vessel, method, ingredient summary, `TOTAL`, and `::after` jagged tear edge) fits with zero vertical cutoff.

---

## Resolution

### 1. Locked Implementation Edits
- Updated `.receipt-system--pov`, `.receipt-hardware-cluster`, `.receipt-printer-bezel`, `.receipt-printer-mask`, `.receipt-wrapper.anim-printing`, `.r-line.r-meta`, and `.receipt-printer-mask .receipt-paper--summary` in `src/app/receipt.css`.
- Standardized `en-US` date (`MM/DD/YYYY`) and time (`HH:MM AM/PM`) formatting in `src/components/receipt/ReceiptPaper.tsx`.

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** `ticket-002.md`, `ticket-003.md`, `ticket-004.md`

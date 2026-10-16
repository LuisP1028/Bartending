---
ticket_id: 001
title: "Remove Header Obelisco/Classics Mode Buttons & External ReceiptToolbar"
type: task
status: resolved
claimed_by: "wayfinder-executor"
blocked_by: []
governing_specification: "functional_specification_120.md"
---

# Ticket 001: Remove Header Obelisco/Classics Mode Buttons & External ReceiptToolbar

## Context & Specification Grounding
- Governing specification: [functional_specification_120.md](../../functional_specification_120.md) (§ 4.1, § 4.2, `AC-01`, `AC-02`, `INV-NO-EXTERNAL-CHROME-01`).
- In `src/app/page.tsx`:
  - Lines 2344–2414 render `<div className="sys-header">` containing the `OBELISCO` and `CLASSICS` mode-switching buttons above `<GameBoy3DShell>`.
  - Lines 2833–2874 render `<ReceiptToolbar>` containing the `"Generate Ticket"` and `"Validate Drink"` (Validate Ticket) buttons below `<GameBoy3DShell>`.

## Resolution
1. Remove the `<div className="sys-header">` mode-switcher block (`lines 2344–2414`) from `src/app/page.tsx`.
2. Remove the `<ReceiptToolbar>` block (`lines 2833–2874`) and unused `ReceiptToolbar` / `OBELISCO_MODE_LOGO_SRC` / `CLASSICS_MODE_LOGO_SRC` / `AVAILABLE_MODES` imports/constants from `src/app/page.tsx`.
3. Ensure `.terminal-frame` and `<GameBoy3DShell>` occupy the full viewport cleanly with zero external header or footer bars.

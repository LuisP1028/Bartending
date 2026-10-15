---
ticket_id: "003"
title: "State 3 (3be shown when a character is clicked) Larger Square Receipt Geometry, Crisp Brand Logo & Recipe Typography"
type: task
status: resolved
claimed_by: "wayfinder"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_116.md"
---

# Ticket 003: State 3 (`3be shown when a character is clicked`) Larger Square Receipt Geometry, Crisp Brand Logo & Recipe Typography

## Question
How do we transform the clicked-patron receipt (`3be shown when a character is clicked`) from a cramped narrow strip into a substantially larger square container (`width >= 48%` of Game Boy playfield width, aspect ratio `width / height` between `0.85` and `1.15`) inside the Game Boy screen while rendering a crisp, legible top brand logo (`height >= 28px` on desktop), unbroken single-line metadata (`CHK: ORD-XXXX`, `MM/DD/YYYY`, `SRV: V_BARTENDER`, `HH:MM AM/PM`), and immediately visible cocktail recipe lines?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_116.md` (§3.2 Defect Reference 2, §4.3 State 3 `3be shown when a character is clicked`, §5 `INV-INSPECT-SQUARE-01`, `INV-TEXT-INTEGRITY-01`, `INV-ASSET-INTEGRITY-01`, `INV-PATRON-ISOLATION-01`, §6 `AC-04`, `AC-05`, `AC-06`, `AC-07`).
- **Affected Files:**
  - `src/app/receipt.css`
  - `src/components/receipt/ReceiptPaper.tsx`
  - `src/lib/receipt/mapTicketToReceipt.ts`

## Architectural Decisions to Lock
1. **Larger Square Bounding Box Geometry (`AC-04`, `INV-INSPECT-SQUARE-01`)**:
   - Anchor `.receipt-wrapper.state-inspected` inside the visible Game Boy playfield (`--shell-glass-*`):
     - `left: calc(var(--shell-glass-inset-x, 0px) + (var(--shell-glass-w, 100%) * 0.36)) !important;`
     - `top: calc(var(--shell-glass-inset-y, 0px) + (var(--shell-glass-h, 100%) * 0.14)) !important;`
     - `width: calc(var(--shell-glass-w, 100%) * 0.54) !important;`
     - `height: min(calc(var(--shell-glass-w, 100%) * 0.54), calc(var(--shell-glass-h, 100%) * 0.62)) !important;`
     - `max-height: min(calc(var(--shell-glass-w, 100%) * 0.54), calc(var(--shell-glass-h, 100%) * 0.62)) !important;`
   - This yields `width = 54%` (`>= 48%`) of the Game Boy playfield width and `width / height ≈ 1.00` (strictly within `[0.85, 1.15]`), positioned cleanly to the right of the left-seated patron (`36%` to `90%` horizontally, `14%` to `~74%` vertically) and 100% contained within the Game Boy playfield across both desktop (`1280×800`) and mobile (`390×844`) viewports.
2. **Crisp, Legible Top Brand Logo (`AC-06`, `INV-ASSET-INTEGRITY-01`)**:
   - Override `image-rendering: pixelated` with `image-rendering: auto` on `.r-logo` so high-resolution mode logos (`1264×816` `obelisco-logo-02.png` and `711×404` `classics-receipt-logo.png`) downsample smoothly without Moiré aliasing.
   - Set `.receipt-wrapper.state-inspected .r-logo` to `height: clamp(29px, 20cqh, 44px); max-height: none; width: auto; max-width: 90%; margin: 0 auto 2px;`, guaranteeing `height >= 28px` on desktop while preserving aspect ratio.
3. **Single-Line Metadata & Unclipped Recipe Specification (`AC-05`, `AC-06`, `INV-TEXT-INTEGRITY-01`)**:
   - In `.receipt-wrapper.state-inspected .receipt-paper--full`, scale typography proportionally to the wider square container (`--r-fs-xs: clamp(5.5px, 3.6cqw, 8.5px)`, `--r-fs-sm: clamp(6px, 3.9cqw, 9px)`, `--r-fs-md: clamp(6.5px, 4.3cqw, 10px)`, `--r-fs-lg: clamp(7px, 4.7cqw, 11px)`, `--r-fs-xl: clamp(7.5px, 5.2cqw, 12px)`).
   - Lock `.r-line.r-meta` and its `.r-line-label` / `.r-line-value` children to `white-space: nowrap !important` so `CHK: ORD-XXXX` + `MM/DD/YYYY` and `SRV: V_BARTENDER` + `HH:MM AM/PM` always render on one single horizontal line each.
   - In `buildBodyLines` (`src/lib/receipt/mapTicketToReceipt.ts`), format the `METHOD` value via `drinkMethodLabel(ticket.agitation).toUpperCase()` and omit redundant `[Standard]` variant header lines so the drink title, `VESSEL`, `METHOD`, and ingredient ounce lines all appear immediately inside the square receipt without vertical cutoff or mid-word wrapping.

---

## Resolution

### 1. Locked Implementation Edits
- Updated `.receipt-wrapper.state-inspected` and child rules in `src/app/receipt.css`.
- Updated `buildBodyLines` in `src/lib/receipt/mapTicketToReceipt.ts` to use `drinkMethodLabel(ticket.agitation).toUpperCase()` and skip redundant `[Standard]` variant headers.
- Updated `ReceiptPaper.tsx` to format `dateStr` and `timeStr` deterministically in `en-US` format (`MM/DD/YYYY` and `HH:MM AM/PM`).

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** `ticket-004.md`

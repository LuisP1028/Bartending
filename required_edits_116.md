# Required Edits Specification (`required_edits_116.md`)

**Run ID**: `20261015T093600-116-rcpt`
**Source Specification**: `/Users/diesel/desktop/bartending/Bartending/functional_specification_116.md`
**Reference Defect Artifacts**:
- `/Users/diesel/Desktop/Screenshot 2026-10-15 at 9.25.44 AM.png`
- `/Users/diesel/Desktop/Screenshot 2026-10-15 at 9.27.02 AM.png`

---

## Edit Group 1: `src/lib/receipt/mapTicketToReceipt.ts` (`ticket-003`)

### 1.1 Human-Readable Method Label & Clean Recipe Body Lines (`buildBodyLines`)
- Import `drinkMethodLabel` from `@/data/methods`.
- In `buildBodyLines`:
  - Format the `METHOD` line value using `drinkMethodLabel(ticket.agitation).toUpperCase()` so raw enum identifiers like `BOSTON_SHAKER_TIN` render cleanly as `SHAKEN` (and `BUILT` / `STIRRED` remain uppercase).
  - Omit the redundant `[Standard]` / `[Default]` variant header row when `selectedVariant.variantName` is `'Standard'` or `'Default'` so ingredient ounce rows appear immediately below `METHOD` inside the square receipt view without wasting vertical space.

---

## Edit Group 2: `src/components/receipt/ReceiptPaper.tsx` (`ticket-001` & `ticket-003`)

### 2.1 Deterministic Single-Line Date/Time Formatting & Test Hooks
- Format `dateStr` using `entity.issuedAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })` (`MM/DD/YYYY`).
- Format `timeStr` using `entity.issuedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })` (`HH:MM AM/PM`).
- Add `data-testid="receipt-meta-chk"` and `data-testid="receipt-meta-srv"` on the metadata `.r-line.r-meta` rows for deterministic Playwright single-line verification.

---

## Edit Group 3: `src/app/receipt.css` (`ticket-001`, `ticket-002`, `ticket-003`)

### 3.1 `1appear` Zero-Bezel-Overlap Printer Geometry & Unclipped Summary Paper (`AC-01`, `AC-02`)
- On `.receipt-system--pov`:
  - Define `--printer-top: calc(var(--shell-glass-inset-y, 0px) + clamp(3px, calc(var(--shell-glass-h, 240px) * 0.015), 7px));`
  - Define `--printer-h: clamp(20px, calc(var(--shell-glass-h, 240px) * 0.085), 28px);`
  - Define `--receipt-paper-w: clamp(122px, calc(var(--shell-glass-w, 320px) * 0.44), 190px);`
  - Define `--receipt-paper-h: calc(var(--shell-glass-h, 240px) * 0.64);`
- On `.receipt-hardware-cluster`:
  - Anchor `top: var(--printer-top); height: var(--printer-h); min-height: 0;` and `width: calc(var(--receipt-paper-w) + 14px);`.
- On `.receipt-printer-bezel`:
  - Set `top: 2px; bottom: 0; height: auto; padding-bottom: 3px;` so the bezel bottom edge is strictly flush with `.receipt-hardware-cluster` and never extends below `calc(var(--printer-top) + var(--printer-h))`.
- On `.receipt-printer-mask`:
  - Anchor `top: calc(var(--printer-top) + var(--printer-h));` (`0px` overlap with `.receipt-hardware-cluster` / `.receipt-printer-bezel`).
  - Set `width: var(--receipt-paper-w); height: var(--receipt-paper-h); padding-bottom: 8px; container-type: inline-size;`.
- On `.receipt-wrapper.anim-printing` and `.receipt-printer-mask .receipt-paper--summary`:
  - Set `max-height: none; overflow: visible;` on `.receipt-wrapper.anim-printing` so the jagged bottom tear edge (`::after`) and full summary content (`OBELISCO`, `PATRON: <DISPLAY NAME>`, `CHK: ORD-XXXX` + time, drink name, vessel + method, ingredient summary, and `TOTAL`) render completely without vertical clipping.
  - Scale summary typography using `cqw` units relative to `.receipt-printer-mask` (`--r-fs-xs: clamp(5.5px, 4.3cqw, 8.5px)` through `--r-fs-xl: clamp(7.5px, 6cqw, 12px)`) and compact vertical spacing so the entire summary slip fits comfortably inside `--receipt-paper-h`.

### 3.2 `3be shown when a character is clicked` Larger Square Geometry, Crisp Logo & Single-Line Metadata (`AC-04`, `AC-05`, `AC-06`)
- On `.receipt-wrapper.state-inspected`:
  - Set `left: calc(var(--shell-glass-inset-x, 0px) + (var(--shell-glass-w, 100%) * 0.36)) !important;`
  - Set `top: calc(var(--shell-glass-inset-y, 0px) + (var(--shell-glass-h, 100%) * 0.14)) !important;`
  - Set `width: calc(var(--shell-glass-w, 100%) * 0.54) !important;`
  - Set `height: min(calc(var(--shell-glass-w, 100%) * 0.54), calc(var(--shell-glass-h, 100%) * 0.62)) !important;`
  - Set `max-height: min(calc(var(--shell-glass-w, 100%) * 0.54), calc(var(--shell-glass-h, 100%) * 0.62)) !important;`
- On `.r-logo` and `.receipt-wrapper.state-inspected .r-logo`:
  - Set `image-rendering: auto;` so high-resolution mode logos downsample smoothly without nearest-neighbor pixel destruction.
  - Set `height: clamp(29px, 20cqh, 44px); max-height: none; width: auto; max-width: 90%; margin: 0 auto 2px;` so the brand logo renders at `>= 29px` height on desktop and mobile.
- On `.r-line.r-meta`, `.r-line.r-meta .r-line-label`, and `.r-line.r-meta .r-line-value`:
  - Enforce `flex-wrap: nowrap; white-space: nowrap !important; word-break: keep-all !important; overflow-wrap: normal !important; max-width: none !important;` so `CHK: ORD-XXXX`, `MM/DD/YYYY`, `SRV: V_BARTENDER`, and `HH:MM AM/PM` never split across lines on either the summary face or the full square face.
- On `.receipt-wrapper.state-inspected .receipt-paper--full`:
  - Tune `cqw`/`cqh` font sizes (`--r-fs-xs: clamp(5.5px, 3.6cqw, 8.5px)`, `--r-fs-sm: clamp(6px, 3.9cqw, 9px)`, `--r-fs-md: clamp(6.5px, 4.3cqw, 10px)`, `--r-fs-lg: clamp(7px, 4.7cqw, 11px)`, `--r-fs-xl: clamp(7.5px, 5.2cqw, 12px)`) and compact line spacing (`line-height: 1.1; margin-bottom: 1px`) so the brand logo, patron banner, metadata rows, drink title, `VESSEL`, `METHOD`, and ingredient ounce rows are all immediately visible inside the square container without mid-word breaks.

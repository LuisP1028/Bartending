# Wayfinder Map: FS116 Receipt Lifecycle Integrity (`1appear`, `2disappear`, `3be shown when a character is clicked`), Unclipped Summary Printing & Larger Square Patron Order Inspection

## Destination
Establish a complete, deterministic architectural decision roadmap and execute the governed code edits across `src/app/receipt.css`, `src/components/receipt/ReceiptPaper.tsx`, `src/lib/receipt/mapTicketToReceipt.ts`, and `src/components/receipt/ReceiptSystem.tsx` to implement `functional_specification_116.md`—eliminating printer bezel overlap and summary clipping during `1appear`, ensuring complete transient dismissal during `2disappear`, and rendering clicked-patron receipts (`3be shown when a character is clicked`) inside a larger square (`width >= 48%` of Game Boy playfield width, aspect ratio `~1:1`) with a crisp brand logo, single-line metadata, and visible recipe ingredients across desktop (`1280×800`) and mobile (`390×844`) viewports.

## Notes
- **Governing Specification:** `functional_specification_116.md`
- **Run ID:** `20261015T093600-116-rcpt`
- **Reference Defect Artifacts:**
  - `/Users/diesel/Desktop/Screenshot 2026-10-15 at 9.25.44 AM.png` (`1appear` bezel overlap, truncated patron name, shattered check/time row, clipped summary body)
  - `/Users/diesel/Desktop/Screenshot 2026-10-15 at 9.27.02 AM.png` (`3be shown` narrow strip, crushed logo, wrapped metadata tokens, cut-off recipe ingredients)
- **Primary Skills Consulted:** `/wayfinder`, `/wayfinder-read-and-plan`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-APPEAR-UNCLIPPED-01`: Zero printer bezel overlap on unrolled summary header (`0px` overlap) and zero vertical cutoff of drink title, vessel, method, ingredient summary, `TOTAL`, or bottom tear edge.
  - `INV-DISAPPEAR-CLEAN-01`: Zero residual printer hardware or floating paper clutter (`opacity: 0; visibility: hidden; pointer-events: none`) once `2disappear` completes.
  - `INV-INSPECT-SQUARE-01`: Clicked-character full receipt renders inside a larger square / near-square container (`width >= 48%` of Game Boy playfield width, `width / height` in `[0.85, 1.15]`) fully contained within the Game Boy playfield.
  - `INV-TEXT-INTEGRITY-01`: Zero ellipsis truncation on `PATRON: <DISPLAY NAME>` and zero mid-token wrapping on `CHK: ORD-XXXX`, `MM/DD/YYYY`, `SRV: V_BARTENDER`, or `HH:MM AM/PM`.
  - `INV-ASSET-INTEGRITY-01`: Top brand logo renders cleanly (`height >= 28px` on desktop) with smooth aspect-ratio preservation (`image-rendering: auto`); barcode canvas renders with non-zero dimensions.
  - `INV-PATRON-ISOLATION-01`: Clicking a seated patron isolates that patron (hiding all others) and restores all patrons upon dismissal.
  - `INV-FAILFAST-01`: Fail fast on missing patron attribution, recipe data, or receipt instance bindings.

## Decisions so far
- [State 1 (`1appear`) Printer Slot Alignment, Unclipped Summary Paper & Single-Line Summary Typography (ticket-001.md)](./tickets/ticket-001.md) — Align `.receipt-printer-mask` strictly at `calc(var(--printer-top) + var(--printer-h))` below `.receipt-hardware-cluster` (`0px` bezel overlap), widen summary paper to `44%` of `--shell-glass-w` with `container-type: inline-size`, enforce single-line `PATRON: <DISPLAY NAME>` and `CHK: ORD-XXXX` + `HH:MM AM/PM`, and size `.receipt-printer-mask` to display the full summary slip through `TOTAL` and the jagged tear edge.
- [State 2 (`2disappear`) Synchronized Transient Dismissal & Queue Integrity (ticket-002.md)](./tickets/ticket-002.md) — Maintain deterministic `fading-in` (`180ms`) → `printing` (`650ms`) → `holding` (`900ms`) → `fading-out` (`280ms`) → `idle` lifecycle with synchronized fade-out of both `.receipt-hardware-cluster` and `.receipt-printer-mask` to `0` screen footprint.
- [State 3 (`3be shown when a character is clicked`) Larger Square Receipt Geometry, Crisp Brand Logo & Recipe Typography (ticket-003.md)](./tickets/ticket-003.md) — Expand `.receipt-wrapper.state-inspected` to a larger square (`left: 36%`, `top: 14%`, `width: 54%` of `--shell-glass-w`, `height: min(54% of --shell-glass-w, 62% of --shell-glass-h)`), render `.r-logo` with `image-rendering: auto` at `height: clamp(29px, 21cqh, 44px)`, lock single-line metadata rows (`white-space: nowrap`), normalize `METHOD` labels and omit redundant `[Standard]` headers in `buildBodyLines`, and proportion vertical rhythm so all core recipe ingredients are immediately visible.
- [Live Playwright Verification Matrix Across Desktop & Mobile Viewports (ticket-004.md)](./tickets/ticket-004.md) — Verify `AC-01` through `AC-08` via live Playwright DOM bounding-box/typography assertions and visual screenshots across desktop (`1280×800`) and mobile (`390×844`) viewports with zero `{errors}`.

## Not yet specified
*(None. All architectural, geometric, typographical, and lifecycle decisions for FS116 are fully specified and locked across `ticket-001.md` through `ticket-004.md`, `required_edits_116.md`, and `test_matrix_116.md`.)*

## Out of scope
- Modifying 3D Game Boy shell meshes, camera framing, or non-receipt HUD controls (`RetroRpgDialogueBox`, `JiggerPourControl`, `CategoryOverlay`).

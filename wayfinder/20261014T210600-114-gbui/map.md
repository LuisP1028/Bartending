# Wayfinder Implementation Map: Run `20261014T210600-114-gbui`

**Specification**: `/Users/diesel/desktop/bartending/Bartending/functional_specification_114.md`
**Visual Reference**: `/Users/diesel/Desktop/receipt_render_box.png`

---

## 1. Execution Dependency DAG

```
[Ticket 001: Shell Glass Geometry & Bottom-Docked Dialogue]
       │
       ├──► [Ticket 002: Transient Printer Lifecycle & Patron Attribution]
       │           │
       │           └──► [Ticket 003: Patron-Click Inspection, Isolation & Red-Box Geometry]
       │
       ├──► [Ticket 004: Jigger Trigger & Panel Unclipped Sizing]
       │
       └──► [Ticket 005: Bottle Carousel Frame Proportions & Inline Label Removal]
                   │
                   └──► [Ticket 006: Carousel Item Name Dialogue Popup & D-Pad Sync]
```

---

## 2. Ticket Index & File Mapping

| Ticket ID | Title | Target Files | Acceptance Criteria |
|---|---|---|---|
| `ticket-001` | Bottom-Docked Character Dialogue Box & Visible Game Boy Glass Geometry | `src/app/page.tsx`, `src/components/RetroRpgDialogueBox.tsx`, `src/components/RetroRpgDialogueBox.module.css` | `AC-01`, `INV-DIALOGUE-BOTTOM-01` |
| `ticket-002` | Transient Receipt Printer Lifecycle, Queue Integrity & Patron Attribution | `src/lib/receipt/types.ts`, `src/lib/receipt/mapTicketToReceipt.ts`, `src/components/receipt/ReceiptPaper.tsx`, `src/components/receipt/ReceiptSystem.tsx`, `src/app/receipt.css` | `AC-02`, `AC-03`, `INV-PRINTER-TRANSIENT-01`, `INV-FAILFAST-01` |
| `ticket-003` | Patron-Click Ticket Inspection, Temporary Patron Isolation & Red-Box Placement | `src/components/PatronLayer.tsx`, `src/components/receipt/ReceiptSystem.tsx`, `src/app/page.tsx`, `src/app/receipt.css` | `AC-04`, `AC-05`, `INV-PATRON-ISOLATION-01`, `INV-RECEIPT-BOX-01` |
| `ticket-004` | Jigger Control (`"jiggertext"`) Proportional Sizing & Zero-Clip Typography | `src/app/globals.css` | `AC-06`, `INV-JIGGER-TEXT-01` |
| `ticket-005` | Bottle Carousel Frame Proportions & Inline Label Removal | `src/data/hotspotGeometry.ts`, `src/components/BottleAsset.tsx`, `src/components/GlassAsset.tsx`, `src/components/GarnishAsset.tsx`, `src/components/RimmingAsset.tsx`, `src/components/HardwareAsset.tsx`, `src/components/MagnificationCarousel.tsx` | `AC-07` |
| `ticket-006` | Carousel Item Name Dialogue-Themed Popup & Live Scroll/D-Pad Synchronization | `src/components/MagnificationCarousel.tsx`, `src/components/CategoryOverlay.tsx`, `src/app/globals.css` | `AC-07` |

---

## 3. Architectural Invariants Enforced

1. **`INV-DIALOGUE-BOTTOM-01`**: `RetroRpgDialogueBox` anchors via `--shell-glass-inset-x`, `--shell-glass-inset-y`, `--shell-glass-w`, and `--shell-glass-h` to occupy `25%` (`≤ 30%`) of the visible Game Boy screen height at the bottom edge (`bottom <= 6%` margin), leaving the top `70%+` of the bar stage and seated patrons unobstructed.
2. **`INV-PRINTER-TRANSIENT-01`**: When `printerPhase === 'idle'`, `.printer-slot-bezel` is completely hidden (`opacity: 0; visibility: hidden; pointer-events: none`), and uninspected free receipts are not rendered on stage. During print, the printer executes `fading-in (180ms) → printing (650ms) → holding (950ms) → fading-out (280ms) → idle`.
3. **`INV-PATRON-ISOLATION-01`**: Clicking a seated patron `x` without dragging a drink sets `isolatedSeatId = x`, hiding all other patrons (`inst.seatId !== isolatedSeatId`) and opening patron `x`'s full receipt (`ReceiptInspectController.inspectReceipt(receiptInstanceId)`). Dismissing the receipt via click, outside click, or Game Boy `A` button resets `isolatedSeatId = null` and restores all patrons.
4. **`INV-RECEIPT-BOX-01`**: `.receipt-wrapper.state-inspected` positions inside the visible Game Boy screen using `--shell-glass-*` at `left: 35%`, `top: 14%`, `width: 35%`, `height: 58%` (matching `/Users/diesel/Desktop/receipt_render_box.png`) without the printer bezel.
5. **`INV-JIGGER-TEXT-01`**: `.jigger-pour-trigger` uses responsive sizing with `white-space: nowrap` and `overflow: visible` so both `"JIGGER"` and `"0.50 oz"` render on single lines with zero clipping across desktop and mobile viewports.
6. **`INV-FAILFAST-01`**: `mapTicketToReceipt` throws a descriptive fatal error if `patronName` is missing or empty, and `handlePatronClick` throws if a seated patron lacks an active order or receipt instance ID.

# Required Edits Specification (`required_edits_114.md`)

**Run ID**: `20261014T210600-114-gbui`
**Source Specification**: `/Users/diesel/desktop/bartending/Bartending/functional_specification_114.md`
**Visual Reference**: `/Users/diesel/Desktop/receipt_render_box.png`

---

## Edit Group 1: Visible Game Boy Glass Geometry & Bottom-Docked Character Dialogue (`ticket-001`)

### 1.1 `src/app/page.tsx`
- Inside the `ResizeObserver` / viewport measurement `useEffect` that measures `sectionRef.current` (`.pov-shell-section`) and `stageRef.current` (`.pov-stage`):
  - Compute the exact intersection of `.pov-shell-section` (`S`) within `.pov-stage` (`T`):
    - `--shell-glass-inset-x`: `${Math.max(0, S.left - T.left)}px`
    - `--shell-glass-inset-y`: `${Math.max(0, S.top - T.top)}px`
    - `--shell-glass-w`: `${S.width}px`
    - `--shell-glass-h`: `${S.height}px`
  - Set these 4 CSS custom properties on `stage` (`stageRef.current`).

### 1.2 `src/components/RetroRpgDialogueBox.tsx`
- Add `data-testid="retro-rpg-dialogue-box"` to the root `.overlayContainer` div for deterministic telemetry and Playwright verification.

### 1.3 `src/components/RetroRpgDialogueBox.module.css`
- Update `.overlayContainer`:
  - Anchor to the bottom strip of the visible Game Boy screen using `--shell-glass-*`:
    - `left: calc(var(--shell-glass-inset-x, 0px) + (var(--shell-glass-w, 100%) * 0.025))`
    - `width: calc(var(--shell-glass-w, 100%) * 0.95)`
    - `bottom: calc(var(--shell-glass-inset-y, 0px) + (var(--shell-glass-h, 100%) * 0.025))`
    - `height: calc(var(--shell-glass-h, 100%) * 0.25)`
    - `max-height: calc(var(--shell-glass-h, 100%) * 0.28)`
    - `container-type: size`
- Scale `.dialogueBox`, `.outerLoop`, `.portraitContainer`, `.speakerName`, `.dialogueText`, and `.continueIndicator` proportionally using `cqh`/`cqw` units so that borders, corners, portrait, speaker header, and body text fit cleanly inside the 25% bottom strip across both desktop and mobile viewports without clipping or overflow.

---

## Edit Group 2: Transient Receipt Printer Lifecycle, Queue Integrity & Patron Attribution (`ticket-002`)

### 2.1 `src/lib/receipt/types.ts`
- Add `patronName: string;` to `TicketData` and `ReceiptEntity`.

### 2.2 `src/lib/receipt/mapTicketToReceipt.ts`
- Validate `ticket.patronName` at the entry of `mapTicketToReceipt`:
  - If `!ticket.patronName || typeof ticket.patronName !== 'string' || ticket.patronName.trim().length === 0`, throw a fatal `Error('[mapTicketToReceipt] Fatal: ticket.patronName is required for patron attribution.')`.
- Populate `patronName: ticket.patronName.trim()` on the returned `ReceiptEntity`.

### 2.3 `src/components/receipt/ReceiptPaper.tsx`
- Render `<div className="receipt-patron-attribution" data-testid="receipt-patron-name">PATRON: {receipt.patronName.toUpperCase()}</div>` prominently on both `.receipt-summary-face` (above the ticket header/items) and `.receipt-full-face` (directly below the venue header and above `.receipt-meta-row`).

### 2.4 `src/components/receipt/ReceiptSystem.tsx`
- Define `type PrinterLifecyclePhase = 'idle' | 'fading-in' | 'printing' | 'holding' | 'fading-out';`.
- Export `ReceiptInspectController` interface (`inspectReceipt: (instanceId: string | null) => void; getInspectedId: () => string | null;`) and accept `inspectControllerRef?: React.MutableRefObject<ReceiptInspectController | null>` and `onInspectChange?: (instanceId: string | null) => void` on `ReceiptSystemProps`.
- Ensure `printAttachedTicket(ticketData)` synchronously constructs the `ReceiptEntity` via `mapTicketToReceipt(ticketData)` and inserts it into `receiptsRef.current` / `setReceipts` immediately, returning `newReceipt.instanceId` even when another print job is currently active (`printingRef.current === true`), queueing the print animation deterministically.
- Implement the transient printer lifecycle per queued receipt:
  - `fading-in` (`180ms`) → `printing` (`650ms`) → `holding` (`950ms`) → `fading-out` (`280ms`) → `idle` (or next queued ticket).
- Only render the currently printing receipt (`state-attached`) and the currently inspected receipt (`state-inspected`). Do not leave uninspected `state-free` receipts resting on the stage.
- When a receipt is inspected (`state-inspected`), clicking the receipt paper toggles/dismisses inspection (`inspectReceipt(null)`) instead of dragging it.

### 2.5 `src/app/receipt.css`
- Update `.printer-slot-bezel` to be hidden when `phase-idle` (`opacity: 0; visibility: hidden; pointer-events: none;`) and smoothly transition opacity during `phase-fading-in`, `phase-printing`, `phase-holding`, and `phase-fading-out`.
- Style `.receipt-patron-attribution` on both summary and full faces.

---

## Edit Group 3: Patron-Click Inspection, Temporary Patron Isolation & Red-Box Geometry (`ticket-003`)

### 3.1 `src/components/PatronLayer.tsx`
- Add `isolatedSeatId?: number | null;` and `onPatronClick?: (seatId: number) => void;` to `PatronLayerProps`.
- Filter `instances` when `isolatedSeatId !== null && isolatedSeatId !== undefined` so only `inst.seatId === isolatedSeatId` is rendered (`INV-PATRON-ISOLATION-01`).
- Change the seated patron `<button>` `onClick` handler to invoke `onPatronClick?.(inst.seatId)` instead of `onServeDrinkToSeat(inst.seatId)`, while preserving vessel drag-and-drop serving via `[data-seat-id]`.
- Add `data-testid={`patron-seat-${inst.seatId}`}` on the patron button.

### 3.2 `src/app/page.tsx`
- Add `isolatedSeatId` state (`useState<number | null>(null)`) and `receiptInspectRef` (`useRef<ReceiptInspectController | null>(null)`).
- Pass `patronName: CHARACTER_PROFILES[enteringPatron.charId].displayName` into `createOrderTicketForSeat` inside `onWalkComplete`.
- Implement `handlePatronClick(seatId: number)`:
  - Fail fast if no `seatOrders[seatId]` or `receiptInstanceId` exists.
  - Toggle off if already inspecting `seatId`.
  - Otherwise select the patron's order on the bar mat (`setSelectedOrderTicketId(seatOrder.order.id)`), set `isolatedSeatId(seatId)`, and call `receiptInspectRef.current?.inspectReceipt(seatOrder.receiptInstanceId)`.
- Synchronize `handleReceiptInspectChange(instanceId: string | null)` so dismissing the receipt clears `isolatedSeatId` and restores all patrons.
- Update `handleConsoleActionPress` (`A` button) to dismiss an inspected receipt first (`if (isolatedSeatId !== null) { receiptInspectRef.current?.inspectReceipt(null); return; }`).
- Clear `isolatedSeatId` and close any inspected receipt when serving a drink (`serveDrinkToSeat`) or when an isolated patron departs.

### 3.3 `src/app/receipt.css`
- Anchor `.receipt-wrapper.state-inspected` to the proportional red reference box from `/Users/diesel/Desktop/receipt_render_box.png` inside the visible Game Boy screen:
  - `left: calc(var(--shell-glass-inset-x, 0px) + (var(--shell-glass-w, 100%) * 0.35)) !important;`
  - `top: calc(var(--shell-glass-inset-y, 0px) + (var(--shell-glass-h, 100%) * 0.14)) !important;`
  - `width: calc(var(--shell-glass-w, 100%) * 0.35) !important;`
  - `height: calc(var(--shell-glass-h, 100%) * 0.58) !important;`
  - `max-height: calc(var(--shell-glass-h, 100%) * 0.58) !important;`
  - `transform: none !important;`
  - `container-type: size;`
- Scale `.receipt-wrapper.state-inspected .receipt-paper` typography and spacing with `cqw`/`cqh` units so the entire ticket fits inside the red box across desktop and mobile viewports.

---

## Edit Group 4: Jigger Control (`"jiggertext"`) Sizing & Unclipped Typography (`ticket-004`)

### 4.1 `src/app/globals.css`
- Update `.jigger-pour-control`, `.jigger-pour-trigger`, `.jigger-pour-icon`, `.jigger-pour-caption`, `.jigger-pour-current`, and `.jigger-pour-panel`:
  - Anchor `.jigger-pour-control` relative to the visible Game Boy glass (`left: calc(var(--shell-glass-inset-x, 0px) + (var(--shell-glass-w, 100%) * 0.018))`, `top: calc(var(--shell-glass-inset-y, 0px) + (var(--shell-glass-h, 100%) * 0.43))`).
  - Use `width: max-content`, `min-width: clamp(54px, calc(var(--shell-glass-w, 320px) * 0.16), 92px)`, `white-space: nowrap`, and `overflow: visible` on `.jigger-pour-trigger`, `.jigger-pour-caption`, and `.jigger-pour-current` so `"JIGGER"` and `"0.50 oz"` never wrap or clip on any viewport (`INV-JIGGER-TEXT-01`).
  - Scale `.jigger-pour-panel` proportionally (`width: clamp(190px, calc(var(--shell-glass-w, 320px) * 0.56), 270px)`).

---

## Edit Group 5: Bottle Carousel Sizing & Dialogue-Themed Item Name Popup (`ticket-005` & `ticket-006`)

### 5.1 `src/data/hotspotGeometry.ts`
- Restrict `isWideShort` to `zoneId === 'rims'`.
- Add `isBottleShelf = zoneId === 'speedrail' || zoneId === 'syrups' || zoneId === 'juices' || zoneId === 'fridge'` with `heightPct = clamp(raw.height * 2.1, 30, 38)` and `widthPct = clamp(raw.width * 1.15, 28, 62)` so bottle carousels have tall, un-squashed frames.

### 5.2 `src/components/BottleAsset.tsx`, `GlassAsset.tsx`, `GarnishAsset.tsx`, `RimmingAsset.tsx`, `HardwareAsset.tsx`
- When `presentation === 'overlay'`, suppress `.asset-under-label` and adjust `--asset-figure-height: 94%` (`--asset-figure-pad-bottom: 2%`) so bottle/asset silhouettes fill the carousel frame cleanly.

### 5.3 `src/components/MagnificationCarousel.tsx`
- Add `onFocusedItemChange?: (item: T | null, index: number) => void;` to `MagnificationCarouselProps<T>`.
- Notify `onFocusedItemChange` whenever the centered item index changes during scroll, resize, initialization, or external `focusedIndex` updates.

### 5.4 `src/components/CategoryOverlay.tsx` & `src/app/globals.css`
- Track the focused item's display label in `CategoryOverlay` via `getOverlayItemLabel(item)` and `onFocusedItemChange`.
- Render `<div className="carousel-dialogue-popup" data-testid="carousel-dialogue-popup">` positioned immediately above `.category-overlay-frame` (automatically flipping below if `box.top < 12%`) styled with the Retro RPG Dialogue theme (`#09133b` background, white/black pixel border, corner loops, pixel typography).

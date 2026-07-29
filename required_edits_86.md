# RE86 — Required edits: Safari-proof summary receipt drag ownership

**Spec:** [functional_specification_86.md](./functional_specification_86.md)  
**Map:** [wayfinder/map-069.md](./wayfinder/map-069.md)  
**Research:** [wayfinder/research/safari-receipt-drag-gesture-ownership.md](./wayfinder/research/safari-receipt-drag-gesture-ownership.md), [wayfinder/research/receipt-drag-code-inventory.md](./wayfinder/research/receipt-drag-code-inventory.md)  
**Context folder:** `aaa85/`  
**DO NOT CODE until operator authorizes after documentation sufficiency.**

---

## Goal of these edits

Make **summary free-receipt paper-drag** own the finger sequence on **iOS Safari** (and other mobile browsers) so browser pan/overscroll/chrome-slide cannot interrupt drag, while **preserving FS62** expanded pan-y scroll and desktop mouse behavior.

---

## Files to modify

| File | Role |
|------|------|
| `src/components/receipt/ReceiptSystem.tsx` | Gesture ownership logic; replace mid-gesture-only lock as sole mechanism |
| `src/components/receipt/ReceiptPaper.tsx` | Wire any additional surface handlers if ownership moves to DOM |
| `src/app/receipt.css` | Pre-contact `touch-action` / drag surface rules; keep FS62 pan-y |
| `src/app/globals.css` | Only if root/stage cascade needs permanent or scoped overscroll/touch rules |

**Do not modify** (unless a later discovery forces a one-line cascade fix, document first): recipe, patrons, jigger, carousel logic.

---

## Design constraints (from ticket-341 — implementers must obey)

1. **Pre-contact `touch-action`:** Summary drag surface must already have effective `touch-action: none` **before** the finger lands for a summary drag. Do **not** rely on adding `html/body.receipt-dragging { touch-action: none }` in the same `pointerdown` as the **only** ownership mechanism (PE3 freezes `touch-action` for the active pointer at gesture start).
2. **Touch Events path:** Provide a **non-passive** `touchmove` (and if needed `touchstart`) cancel path that is registered **early enough** that Safari still delivers cancelable events for that sequence. Prefer listeners that exist **before** the first `touchmove` of the drag (element-level permanent listeners with gates, or stage-level permanent listeners that only `preventDefault` when a summary drag is active — but registration itself must not wait until after the critical first moves).
3. **FS62:** Expanded full face must keep `touch-action: pan-y` on the inspected wrapper/paper path; summary-only ownership must not leave inspect unable to scroll.
4. **`pointercancel`:** Keep clean end (no false expand). Success is preventing pan-driven cancel, not only handling it.
5. **Desktop:** Mouse path must still expand on click and drag-move without requiring touch-only APIs to break mouse.

---

## Edit 1 — CSS: pre-contact ownership for summary (and cascade)

**File:** `src/app/receipt.css`

### 1A — Keep and harden summary surface

- Ensure **summary** free wrappers and summary paper declare `touch-action: none` at rest (already partially present on `.receipt-wrapper` and `.receipt-paper--summary`).
- Confirm **no** descendant of summary paper reintroduces a competing pan (e.g. accidental `pan-y` on children). Summary descendants should not create a scrollport that Safari can own.
- Keep summary `overflow-y: hidden` (already set); do not revert to `overflow-y: auto` on summary.

### 1B — Expanded FS62 must still win when inspected

- Keep `.receipt-wrapper.state-inspected` and `.receipt-paper--full` at `touch-action: pan-y` (and existing overscroll-contain).
- When inspected, wrapper must **not** remain forced to `none` in a way that blocks paper scroll (current inspect override pattern is correct; do not remove it).

### 1C — Optional but recommended cascade

- If inventory shows intermediate layers between stage and wrapper defaulting to `auto` and Safari still steals, add **scoped** `touch-action: none` only on layers that never need native pan while free receipts are draggable (e.g. free-paper layer), **without** applying permanent `pan-y` kill to the full-face scrollport.
- Do **not** set the entire game shell to `touch-action: none` forever if that breaks expanded paper scroll or other intentional pans — scope carefully.

### 1D — `.receipt-dragging` class

- May keep `html.receipt-dragging` / `body.receipt-dragging` for overscroll reinforcement **as secondary**.
- Document in comments: class applied mid-gesture **does not** change frozen `touch-action` for the active pointer; it is not the primary Safari fix.

### 1E — globals.css

- Keep root `overscroll-behavior: none` if already present.
- Only add further root locks if Edit 2 still insufficient on Safari **and** FS documents residual chrome cases; prefer surface-level ownership first.

---

## Edit 2 — JS: durable gesture ownership for summary drag

**File:** `src/components/receipt/ReceiptSystem.tsx` (primary), `ReceiptPaper.tsx` (if DOM attachment needed)

### 2A — Refactor scroll-lock strategy

**Remove reliance on** “attach document non-passive `touchmove` only inside `acquireDragScrollLock` on summary pointerdown” as the **sole** anti-steal mechanism.

**Implement one of the following ownership models (prefer A, then B):**

#### Model A (preferred): Element-level native touch listeners on the drag surface

On the summary-capable wrapper (or paper), register **native** (not React synthetic-only) listeners:

- `touchstart` and/or `touchmove` with `{ passive: false }`  
- Registration timing: **on mount** of free paper / provider effect, **or** whenever a free summary receipt mounts — **not first installed in the middle of the active finger’s first moves**.

Gate inside the handler:

- If no active summary capture drag for this instance / pointer → **do not** preventDefault (so expanded pan-y and other UI still work).
- If active summary drag (`dragRef` with `captured && !wasInspected`) → `preventDefault()` on cancelable touch events to block browser pan.

Keep Pointer Events for position updates **or** drive position from the same touch coordinates; do not drop PE if desktop mouse depends on them. Dual path is fine: mouse → PE; touch → PE + TE preventDefault.

#### Model B: Permanent document/stage non-passive listeners

Register once (provider mount) on `document` or stage root:

- `touchmove` (and optionally `touchstart`) `{ passive: false, capture: true }`
- Handler only `preventDefault`s when `dragRef` indicates summary capture drag active.

Advantage: always present before gesture.  
Risk: must never blanket-preventDefault when expanded paper is scrolling or when no drag is active.

### 2B — Summary pointerdown

Retain:

- `setPointerCapture` for PE continuity where supported.
- Position init, z-bump, select free receipt.
- Existing 4px threshold before move.

Adjust:

- Do not treat body class + late document listener as complete.
- If using Model A, ensure the element listeners are already attached **before** this pointerdown.
- `preventDefault` on pointer events may remain but **must not** be documented as the Safari pan killer (PE3).

### 2C — pointermove position

Keep clamp + `setReceipts` position update after 4px threshold.

### 2D — pointerup / pointercancel

- up: existing expand-if-no-drag logic.
- cancel: existing `cancelled: true` clean end (no expand).
- Always release capture and any secondary body class lock.

### 2E — Expanded path (FS62)

- **Do not** enable summary scroll-lock / TE preventDefault while `wasInspected` / expanded gesture is active.
- Keep window-level expanded tracking as today.
- Ensure permanent TE handlers (Model A/B) **skip** preventDefault for expanded gestures so pan-y scroll works.

### 2F — Cleanup

- On provider unmount: remove any permanent native listeners; clear body classes; null drag state.
- Avoid leaking document listeners across navigations.

### 2G — ReceiptPaper.tsx

If Model A attaches via ref on the wrapper:

- Expose a stable ref or callback ref from paper → provider, **or**
- Attach listeners in paper via props (`onNativeTouchClaim`) — prefer single ownership in provider with ref from paper.

Wire `onPointerCancel` remains required (already present).

---

## Edit 3 — Do not break dual-mode CSS

When a receipt toggles `state-inspected`:

| Face | touch-action | TE preventDefault for pan block |
|------|--------------|----------------------------------|
| Summary | `none` | Yes, when summary drag active |
| Inspected | `pan-y` on paper/wrapper | No (allow paper scroll) |

Verify class toggles still drive CSS correctly after edits.

---

## Edit 4 — Verification (manual; not automated tests required in RE)

On **iOS Safari**:

1. Print/generate free summary receipt.
2. Vertical drag across stage — continuous track (FS86 A1).
3. Release after drag — no expand (A3).
4. Tap — expand (A4).
5. Scroll full face — content moves (A5); tap collapse (A6).

On desktop: A7–A8.

If Safari still steals after Edit 1–2, **do not** silently ship: re-open map-069 with residual evidence (whether `pointercancel` fires; whether first `touchmove` was cancelable).

---

## Explicit non-edits

- No change to print animation, pricing, handoff exit, money flyby.
- No change to multi-patron motion (FS85).
- No parent-iframe scroll hacks unless product expands scope.

---

## Implementation order

1. CSS Edit 1 (pre-contact summary ownership + FS62 pan-y intact).  
2. JS Edit 2 Model A or B (durable TE path + gates).  
3. Manual Safari verification Edit 4.  
4. Only if residual: optional globals/cascade 1C/1E with new ticket note.

---

## `{correct required outputs}` after edits

Match FS86 table A1–A9. RE is complete only when those hold on Safari primary gate.

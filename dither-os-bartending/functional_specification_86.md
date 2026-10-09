# FS86 — Summary receipt paper-drag not stolen by browser (Safari-first)

## Purpose

When a player **drags a free summary receipt** on mobile (especially **iOS Safari**), the **receipt paper must continue to follow the finger** for the full gesture. The browser must **not** take over that vertical (or diagonal) motion as page pan, overscroll, or chrome-slide in a way that **interrupts** the drag.

**Maps / research:** [wayfinder/map-069.md](./wayfinder/map-069.md), [wayfinder/research/safari-receipt-drag-gesture-ownership.md](./wayfinder/research/safari-receipt-drag-gesture-ownership.md), [wayfinder/research/receipt-drag-code-inventory.md](./wayfinder/research/receipt-drag-code-inventory.md)  
**Prior:** FS62 expanded full-face pan-y scroll (must remain); partial scroll-lock attempt already in tree (proven **insufficient** on Safari).

**DO NOT CODE from this document alone.** Implementation waits for RE86 + documentation sufficiency + operator authorize.

---

## Glossary

`LANGUAGE.md` terms apply: `{functionality}`, `{correct required outputs}`, `{sufficient}` / `{insufficient}`, `{errors}`, `{correctness}`.

---

## Current failure

### Observed

- On **Safari (mobile)**, while dragging a **summary** free receipt, sliding the finger (especially vertically) causes the **browser** to own the gesture.
- Drag **stops or is interrupted** (“stolen”).
- A prior attempt (document `touchmove` preventDefault acquired on pointerdown, `html/body.receipt-dragging`, summary `overflow-y: hidden`, `pointercancel` cleanup) **did not fix** Safari steal (operator confirmation).

### Product impact

- Players cannot reliably reposition tickets on stage.
- Intermittent expand/collapse and broken session feel on the primary mobile browser for many users.

### What already works (must not regress)

- Summary **click/tap** expands to full face.
- Summary **drag past threshold** repositions paper (when browser does not steal).
- Expanded full face **scrolls** long content (FS62); pure short tap collapses.
- Desktop mouse drag/click behavior for receipts.

---

## Desired `{functionality}`

### Summary free receipt — gesture ownership

1. When the player places a finger (or primary pointer) on a **free, non-printing, non-handoff, summary-face** receipt and moves it, the system **owns** that gesture for **paper reposition** until the finger lifts (or a true OS-level cancel outside page pan control).
2. **Browser page pan / rubber-band / chrome-driven pan** must not seize that gesture mid-drag in a way that ends paper tracking.
3. Ownership must be established in a way that is valid for **Safari/WebKit** rules for pan/zoom assignment (i.e. effective before or at the start of the contact sequence for that finger), not only as a late reaction after the browser has already claimed pan.
4. After a real drag (movement past the existing drag threshold), releasing the finger leaves the paper at the final clamped stage position and **does not** expand the receipt.
5. A pure tap (no drag past threshold) still **expands** the summary receipt to full face.
6. Selecting/focusing the free receipt for mat ownership continues as today when the gesture begins on that receipt.

### Expanded full face (FS62 — preserve)

7. When the receipt is **expanded (inspected full face)**:
   - Vertical finger motion **scrolls the paper content** when content overflows.
   - The paper **does not** reposition as free drag under that expanded gesture model.
   - A pure short tap (no meaningful scroll/pan) **collapses** to summary.
8. The summary-drag ownership rules must **not permanently destroy** expanded pan-y scroll.

### Desktop / non-touch

9. Mouse (and equivalent) summary click-to-expand and drag-to-move remain correct.
10. No requirement to change desktop visual styling.

### Multi-receipt

11. Only the receipt under the active primary gesture is dragged; other free receipts stay put unless separately interacted with.
12. Z-order bump on interaction remains as today.

### Residual cancel

13. If the OS or browser **still** cancels the pointer for reasons outside page-pan control (e.g. app switcher), the system ends the gesture **cleanly**: paper keeps last position; no false expand/collapse from that cancel.
14. Clean cancel is a **fallback**, not the success path. Success is continuous tracking without browser steal for ordinary in-page vertical slides on Safari.

---

## Explicit non-goals

- Redesigning receipt content, thermal layout, pricing, print animation, handoff money flyby.
- Changing FS60/61 paper scale contracts.
- Fixing carousel, jigger, or patron motion.
- Guaranteeing behavior when the game is embedded in a **parent page/iframe that scrolls** (out of scope for FS86 unless later expanded).
- Blocking all OS system gestures (home indicator, edge back, control center).
- Making expanded full face **draggable** as free paper (FS62 remains scroll, not reposition).

---

## `{correct required outputs}` (acceptance)

Measurable outcomes after implementation. Primary gate: **iOS Safari** on a real device or equivalent remote debug.

| ID | Scenario | Required result |
|----|----------|-----------------|
| A1 | Summary free receipt; vertical drag ≥ ~half stage height | Paper position tracks finger for the full contact; drag does not die mid-slide because Safari took pan |
| A2 | Same as A1, horizontal and diagonal | Same continuous tracking |
| A3 | Summary; drag then lift | Paper stays at final clamped position; face remains summary (no expand) |
| A4 | Summary; short tap, no drag threshold | Expands to full face |
| A5 | Expanded full face; vertical pan with overflow | Paper **content scrolls**; ticket does not free-drag away |
| A6 | Expanded; pure short tap | Collapses to summary |
| A7 | Desktop mouse: click summary | Expands |
| A8 | Desktop mouse: drag summary | Repositions; no unexpected expand on release after drag |
| A9 | During successful summary drag on Safari | No operator-perceived “browser stole the slide” interruption |

Secondary: Android Chrome should not regress relative to A1–A6.

---

## Interaction with prior specs

| Spec | Relationship |
|------|----------------|
| FS62 | Expanded pan-y scroll + no paper-drag while inspected — **preserved** |
| Partial in-tree scroll-lock | Treated as **insufficient**; FS86 supersedes it as the ownership requirement |
| map-046 / receipt mobile scroll | Inspect scroll remains; summary drag ownership is FS86 |

---

## Context for implementers (pointers only — not “how”)

Relevant surfaces (see RE86 for edit detail):

- Receipt provider gesture logic and any scroll-lock helpers
- Receipt wrapper / paper DOM event surface
- Receipt and global CSS for `touch-action`, overflow, overscroll
- Stage/shell only if required for pre-contact ownership cascade

Research constraints that define **what must be true**, not implementation:

- Pan/zoom ownership for Pointer Events is declared by **pre-contact** effective `touch-action` (frozen for that pointer).
- Canceling pointer events does not stop viewport pan.
- Durable Touch Event cancelability requires non-passive listeners available early enough for the active sequence.
- Safari body `overflow: hidden` alone does not historically own chrome/vertical motion.

---

## Success definition

`{functionality}` is achieved when A1–A9 hold, FS62 expanded scroll remains correct, and desktop A7–A8 hold — i.e. summary receipt drag is **no longer stolen** by Safari browser pan under normal play.

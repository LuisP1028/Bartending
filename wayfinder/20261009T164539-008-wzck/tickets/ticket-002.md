---
ticket_id: 002
title: "Mode Selection Shell Slot Framing, Alignment & Letterbox Parity"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: [001]
governing_specification: "functional_specification_102.md"
---

# Ticket 002: Mode Selection Shell Slot Framing, Alignment & Letterbox Parity

## Question
How must `.main-menu .main-menu__slot.gb-shell-slot, .main-menu .gb-shell-slot` in `src/app/gameboy-shell.css` be configured to guarantee explicit container query dimensions (`width: 100%; height: 100%`) and dark `#111` backdrop letterboxing parity with `.boot-intro .gb-shell-slot`?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_102.md`
  - §Purpose: "ensure the mode selection menu interface achieves full orientation parity with the startup sequence across all window dimensions, aspect ratios, and device orientations."
  - §Edge cases & behavioral boundaries:
    - Edge Case 1: "On 21:9 or 32:9 desktop monitors, the console must strictly constrain its height to the viewport height and center horizontally with clean letterboxing, preventing extreme horizontal stretching."
    - Edge Case 2: "When the boot intro sequence finishes while in landscape mode, the transition into the mode selection menu must maintain identical scale and screen alignment without sudden jumps, shifts, or cropping."
  - §Acceptance Criteria:
    - AC1: In landscape viewports ($W > H$), the entire console housing and screen fit 100% within the visible window with zero clipping.
    - AC4: Dynamic resize between portrait and landscape dynamically scales the menu console, maintaining containment parity with the startup sequence.
- **Source Inspection:**
  - In `src/app/gameboy-shell.css` (lines 859–872):
    ```css
    .main-menu .main-menu__slot.gb-shell-slot,
    .main-menu .gb-shell-slot {
      position: absolute;
      inset: 0;
      flex: none;
      min-height: 0;
      min-width: 0;
      width: auto;
      height: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      container-type: size;
      container-name: gb-shell-slot;
      overflow: hidden;
      background: #eee;
      z-index: 1;
    }
    ```
  - This configuration exhibits two defects:
    1. Size Container Indefiniteness: It applies `container-type: size` with `width: auto; height: auto;`. Under CSS Container Queries specifications, size containers require definite layout dimensions (`width: 100%; height: 100%`) to reliably calculate `100cqw` and `100cqh`.
    2. Backdrop & Letterbox Divergence: It uses `background: #eee`, whereas `.boot-intro .gb-shell-slot` uses `background: #111`. When transitioning from the boot sequence to the mode selection menu on desktop or landscape monitors, the surrounding letterboxed margin flashes from `#111` to `#eee`, violating orientation parity and creating a jarring visual jump.

## Architectural Decisions to Lock
1. **Explicit 100% Slot Dimensions:**
   Change `width: auto; height: auto;` to `width: 100%; height: 100%;` on `.main-menu .gb-shell-slot`, establishing a deterministic bounding box for container query calculations (`gb-shell-slot`).
2. **Backdrop Parity with Startup Sequence:**
   Change `background: #eee;` to `background: #111;` on `.main-menu .gb-shell-slot`, providing identical dark letterbox/pillarbox presentation as the boot sequence.
3. **Centered Alignment & Inset Placement:**
   Enforce `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; overflow: hidden;` to ensure the contained console is centered on both axes across all aspect ratios.
4. **Unification of Slot Definition:**
   Unify `.boot-intro .gb-shell-slot` and `.main-menu .gb-shell-slot` into a shared CSS rule, guaranteeing 100% structural parity.

## Scope & Invariant Guardrails
- **In Scope:** `src/app/gameboy-shell.css` rules for `.main-menu .main-menu__slot.gb-shell-slot, .main-menu .gb-shell-slot`.
- **Out of Scope:** Console housing proportional scaling (handled in `ticket-001.md`). Pointer calculations and option focus (handled in `ticket-003.md`).

---

## Resolution

### Concrete CSS Transformation
In `src/app/gameboy-shell.css`:
Unify `.boot-intro` and `.main-menu` shell slot rules (replacing lines 841–872) into a single definition:

```css
.boot-intro .boot-intro__slot.gb-shell-slot,
.boot-intro .gb-shell-slot,
.main-menu .main-menu__slot.gb-shell-slot,
.main-menu .gb-shell-slot {
  position: absolute;
  inset: 0;
  flex: none;
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;
  container-name: gb-shell-slot;
  overflow: hidden;
  background: #111;
  z-index: 1;
}
```

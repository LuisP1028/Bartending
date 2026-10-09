---
ticket_id: 001
title: "Boot Console Viewport Containment & Proportional Sizing"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_100.md"
---

# Ticket 001: Boot Console Viewport Containment & Proportional Sizing

## Question
How must the Boot Console housing, outer slot container, and viewport layout rules be restructured in `src/app/gameboy-shell.css` to guarantee universal containment (`contain` behavior) and 100% unclipped visibility of all controls across mobile portrait, mobile landscape, tablet, and desktop viewports without vertical clipping or horizontal overflow?

## Context & Specification Grounding
- **Specification:** `functional_specification_100.md` §1 ("Boot Console Presentation & Viewport Containment"), Acceptance Criteria AC1 ("On mobile portrait, mobile landscape, tablet, and desktop viewports, the entire boot console housing and controls are 100% visible with zero clipping"), Edge Case 1 ("Extreme Viewport Aspect Ratios").
- **Current Defect:** In `src/app/gameboy-shell.css` (lines 874–893), `.boot-intro .gb-shell` shares geometry with `.main-menu .gb-shell` configured for `cover` sizing using `width: max(100cqw, calc(100cqh * 422 / 697))` and `height: max(100cqh, calc(100cqw * 697 / 422))` with `transform: translateY(-4%)`. This forces the outer casing, branding header, D-pad, action buttons, and SELECT/START controls outside the viewable viewport on mismatched aspect ratios.
- **Component File:** `src/components/BootIntro.tsx` (lines 125–213).
- **Style File:** `src/app/gameboy-shell.css` (lines 823–894).

## Architectural Decisions to Lock
1. **Decouple Boot Intro Shell from Cover-Sized Menu Shell:**
   - Disentangle `.boot-intro .gb-shell` from `.main-menu .gb-shell`.
   - `.boot-intro .gb-shell` must enforce strict proportional containment (`contain` fit) based on its canonical `422 / 697` aspect ratio.
2. **Deterministic Proportional Containment Formula:**
   - Width: `min(100cqw, calc(100cqh * 422 / 697))` (with fallback `min(100vw, calc(100dvh * 422 / 697))`).
   - Height: `min(100cqh, calc(100cqw * 697 / 422))` (with fallback `min(100dvh, calc(100vw * 697 / 422))`).
   - Sizing bounds: `max-width: 100%` and `max-height: 100%`.
3. **Elimination of Displacement Transform:**
   - Eliminate `transform: translateY(-4%)` on `.boot-intro .gb-shell`; set `transform: none`.
   - Center `.gb-shell` inside `.boot-intro .gb-shell-slot` using `align-items: center` and `justify-content: center`.
4. **Shell Slot Bounds & Padding:**
   - Enforce `position: absolute; inset: 0; width: 100%; height: 100%;` on `.boot-intro .gb-shell-slot`.
   - Prevent any parent container from clipping or scroll-overflowing.

## Scope & Invariant Guardrails
- **In Scope:** CSS layout, aspect ratio, width/height calculation, flex alignment, and positioning rules for `.boot-intro` and `.boot-intro .gb-shell` in `src/app/gameboy-shell.css`.
- **Out of Scope:** Video element internal scaling (`object-fit: contain`, handled in `ticket-002.md`). Patron motion and stage stability (handled in `ticket-003.md` through `ticket-006.md`).

---

## Resolution

### 1. Concrete CSS Geometry Transformation
In `src/app/gameboy-shell.css`:
1. Decouple `.boot-intro .gb-shell` from `.main-menu .gb-shell` at lines 874–893.
2. Provide dedicated rules for `.boot-intro .gb-shell`:
   ```css
   .boot-intro .gb-shell {
     position: relative;
     flex: 0 0 auto;
     display: block;
     margin: 0;
     box-sizing: border-box;
     aspect-ratio: 422 / 697;
     width: min(100cqw, calc(100cqh * 422 / 697));
     height: min(100cqh, calc(100cqw * 697 / 422));
     max-width: 100%;
     max-height: 100%;
     background: #eee;
     border-radius: 2.37% 2.37% 8.61% 2.37%;
     box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
     container-type: size;
     container-name: gb-shell;
     overflow: hidden;
     transform: none;
   }

   @supports not (width: 1cqw) {
     .boot-intro .gb-shell {
       width: min(100vw, calc(100dvh * 422 / 697));
       height: min(100dvh, calc(100vw * 697 / 422));
       max-width: 100%;
       max-height: 100%;
       aspect-ratio: 422 / 697;
     }
   }
   ```
3. Keep `.boot-intro .boot-intro__slot.gb-shell-slot, .boot-intro .gb-shell-slot` at:
   ```css
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
   ```
   (Using `#111` backdrop allows the `#eee` Game Boy console body to be clearly distinguished as a contained handheld console on letterboxed/pillarboxed displays).

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks Ticket 002.

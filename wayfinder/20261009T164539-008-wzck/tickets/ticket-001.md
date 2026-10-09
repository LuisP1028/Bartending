---
ticket_id: 001
title: "Mode Selection Menu Console Viewport Containment & Aspect-Ratio Sizing"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_102.md"
---

# Ticket 001: Mode Selection Menu Console Viewport Containment & Aspect-Ratio Sizing

## Question
How must `.main-menu .gb-shell` sizing and layout rules in `src/app/gameboy-shell.css` be modified to eliminate horizontal over-expansion and vertical clipping in landscape viewports ($W > H$) and ultra-wide displays, guaranteeing strict proportional containment and orientation parity with the startup sequence?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_102.md`
  - §Purpose: "eliminate the visual breakdown occurring when the mode selection menu is viewed in landscape mode (window width > window height), ensuring that the console frame scales proportionally to fit within viewport boundaries on both axes, guaranteeing 100% visibility of the mode selection header, logos, menu options, and console controls."
  - §Observed Errors: In landscape viewports, `.main-menu .gb-shell` over-expands horizontally to fill window width, causing the proportional height to blow up to 3000px+, pushing the top casing, screen bezel, battery indicator, "MODE SELECTION" header, Obelisco and Classics logos, "JOIN THE BAR!", and "WARP DIAGNOSTICS" completely off the top edge of the browser window. Only "TERMINATE UPLINK" remains visible.
  - §Acceptance Criteria:
    - AC1: In landscape viewports ($W > H$), the entire console housing and screen fit 100% within the visible window with zero clipping.
    - AC3: The top casing, battery light, screen borders, D-pad, action buttons, and SELECT/START controls remain fully visible and proportional in landscape mode.
    - AC4: Dynamic resize between portrait and landscape dynamically scales the menu console, maintaining containment parity with the startup sequence.
- **Source Inspection:**
  - In `src/app/gameboy-shell.css` (lines 919–940):
    ```css
    .main-menu .gb-shell {
      position: relative;
      flex: 0 0 auto;
      display: block;
      margin: 0;
      box-sizing: border-box;
      aspect-ratio: 422 / 697;
      width: max(100cqw, calc(100cqh * 422 / 697));
      height: max(100cqh, calc(100cqw * 697 / 422));
      max-width: none;
      max-height: none;
      background: #eee;
      border-radius: 2.37% 2.37% 8.61% 2.37%;
      box-shadow: none;
      container-type: size;
      container-name: gb-shell;
      overflow: hidden;
      transform: translateY(-4%);
    }
    ```
  - When $W > H$, `100cqw` exceeds `calc(100cqh * 422 / 697)`. Evaluating `max(...)` forces width to the full viewport width (e.g. 1920px), blowing proportional height to `1920 * 697 / 422 = 3170px`. With `transform: translateY(-4%)`, the upper two-thirds of the console and menu interface are pushed entirely off-screen.
  - In contrast, `.boot-intro .gb-shell` (lines 880–908) uses `width: min(100cqw, calc(100cqh * 422 / 697))` and `height: min(100cqh, calc(100cqw * 697 / 422))` with `max-width: 100%`, `max-height: 100%`, `transform: none`, and `box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45)`.

## Architectural Decisions to Lock
1. **Enforce Container-Bounded Containment Sizing:**
   Replace the `max(...)` cover-sizing formula on `.main-menu .gb-shell` with container-query proportional containment:
   - `width: min(100cqw, calc(100cqh * 422 / 697));`
   - `height: min(100cqh, calc(100cqw * 697 / 422));`
   - `max-width: 100%;`
   - `max-height: 100%;`
2. **Neutralize Vertical Translation:**
   Replace `transform: translateY(-4%)` with `transform: none;` on `.main-menu .gb-shell`, ensuring the console remains strictly centered within its slot without upward coordinate displacement.
3. **Elevate Housing Depth with Standard Shadow:**
   Apply `box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);` to `.main-menu .gb-shell`, matching the visual depth and elevation established for `.boot-intro .gb-shell`.
4. **Provide Fallback for Non-Container Query Browsers:**
   Include `.main-menu .gb-shell` in the `@supports not (width: 1cqw)` block with:
   - `width: min(100vw, calc(100dvh * 422 / 697));`
   - `height: min(100dvh, calc(100vw * 697 / 422));`
   - `max-width: 100%;`
   - `max-height: 100%;`
   - `aspect-ratio: 422 / 697;`
5. **Unification of Shell Geometry:**
   Unify `.boot-intro .gb-shell` and `.main-menu .gb-shell` into a combined CSS selector rule to guarantee absolute geometric parity and prevent future styling drift between startup and menu phases.

## Scope & Invariant Guardrails
- **In Scope:** `src/app/gameboy-shell.css` styling rules for `.main-menu .gb-shell` and its container query fallback.
- **Out of Scope:** Outer slot background color and containment (handled in `ticket-002.md`). Pointer tracking and interior menu button styles (handled in `ticket-003.md`).

---

## Resolution

### Concrete CSS Transformation
In `src/app/gameboy-shell.css`:
Combine `.boot-intro .gb-shell` and `.main-menu .gb-shell` into a single, unified containment definition (replacing lines 880–940):

```css
.boot-intro .gb-shell,
.main-menu .gb-shell {
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
  .boot-intro .gb-shell,
  .main-menu .gb-shell {
    width: min(100vw, calc(100dvh * 422 / 697));
    height: min(100dvh, calc(100vw * 697 / 422));
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: 422 / 697;
  }
}
```

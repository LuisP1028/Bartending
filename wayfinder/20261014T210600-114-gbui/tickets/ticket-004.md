---
ticket_id: "004"
title: "Jigger Control (jiggertext) Sizing, Unclipped Glyph Integrity & Proportional Volume Panel"
type: task
status: resolved
claimed_by: "wayfinder"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_114.md"
---

# Ticket 004: Jigger Control (`"jiggertext"`) Sizing, Unclipped Glyph Integrity & Proportional Volume Panel

## Question
How does the bottom-right jigger pour-volume trigger button (`JiggerPourControl`) size its container, SVG icon, `"JIGGER"` caption, and `"0.50 oz"` readout proportionally to the Game Boy screen so that 100% of glyphs render on single horizontal lines with zero horizontal or vertical clipping?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_114.md`
  - §3.1 (`receipt_render_box.png`): "Shows the bottom-right jigger box clipping `"JIGGER"` into `"IGGER"` and cutting off `"oz"` vertically below `"0.50"`."
  - §4.4 (Complete Glyph Visibility):
    - The jigger SVG icon renders cleanly at the top of the button.
    - The word **`JIGGER`** renders on a single horizontal line with 100% of its letters (`J-I-G-G-E-R`) fully visible and centered, never clipped to `"IGGER"`.
    - The volume readout (e.g., **`0.50 oz`**, **`0.75 oz`**, **`1.00 oz`**, etc.) renders with 100% of its digits and the `"oz"` unit intact and unclipped inside the button's bottom border.
  - §4.4 (Proportional Popup Panel): When clicked/activated, the stepped pour-volume selection panel opens above the jigger trigger, scaled proportionally to the Game Boy screen so all volume options are legible, clickable, and fully contained within the screen bounds.
  - §5 `INV-JIGGER-TEXT-01` (Zero Text Clipping on Jigger Control).
  - §6 `AC-06`.

## Codebase Audit & Root Cause Analysis

In `src/app/globals.css` (L1346–L1425):
- `.jigger-pour-trigger` enforced `max-width: 12cqi; max-height: 18cqb; overflow: hidden;` while `.jigger-pour-caption` (`"JIGGER"`) used `font-size: clamp(8px, 2.2cqi, 11px); letter-spacing: 0.06em;` and `.jigger-pour-current` (`"0.50 oz"`) used `font-size: clamp(9px, 2.4cqi, 12px);` without `white-space: nowrap`.
- Inside the Game Boy screen (`~260px–340px`), `12cqi` yielded ~`32px` of inner width, which was narrower than `"JIGGER"` (`~38px`), clipping `"J"` and `"R"` into `"IGGER"`, and forced `"0.50 oz"` to wrap onto two lines, pushing `"oz"` past `18cqb` height so it was vertically cut off.

## Architectural Decisions Locked

1. **Proportional Screen-Relative Jigger Trigger Sizing & Single-Line Typography (`src/app/globals.css`)**:
   - Size `.jigger-pour-trigger` relative to the visible Game Boy screen dimensions (`--shell-glass-w`, `--shell-glass-h`):
     - `width: clamp(46px, calc(var(--shell-glass-w, 100cqi) * 0.155), 76px);`
     - `min-width: clamp(46px, calc(var(--shell-glass-w, 100cqi) * 0.155), 76px);`
     - `max-width: calc(var(--shell-glass-w, 100cqi) * 0.18);`
     - `min-height: clamp(42px, calc(var(--shell-glass-h, 100cqb) * 0.175), 70px);`
     - `max-height: calc(var(--shell-glass-h, 100cqb) * 0.22);`
     - `padding: clamp(2px, calc(var(--shell-glass-h, 100cqb) * 0.012), 6px) clamp(3px, calc(var(--shell-glass-w, 100cqi) * 0.01), 6px);`
     - `gap: clamp(1px, calc(var(--shell-glass-h, 100cqb) * 0.006), 3px);`
     - `justify-content: center;`
   - Size `.jigger-pour-icon`:
     - `width: clamp(13px, calc(var(--shell-glass-w, 100cqi) * 0.05), 24px);`
     - `height: clamp(15px, calc(var(--shell-glass-h, 100cqb) * 0.065), 28px);`
   - Lock `.jigger-pour-caption` (`"JIGGER"`) and `.jigger-pour-current` (`"0.50 oz"`) to unclipped single lines:
     - `font-size: clamp(5.5px, calc(var(--shell-glass-w, 100cqi) * 0.021), 9.5px);`
     - `line-height: 1.08;`
     - `letter-spacing: 0.02em;`
     - `white-space: nowrap;`
     - `max-width: 100%;`
2. **Proportional Stepped Volume Selection Panel (`src/app/globals.css`)**:
   - Scale `.jigger-pour-panel`, `.jigger-pour-panel-title`, and `.jigger-pour-option` relative to `--shell-glass-w` and `--shell-glass-h` so the opened popup fits completely inside the Game Boy screen bounds without clipping.

## Acceptance & Verification Oracles
- `.jigger-pour-trigger` displays the SVG icon, the complete word `"JIGGER"` on a single line (`scrollWidth <= clientWidth`), and the complete volume `"0.50 oz"` on a single line (`scrollWidth <= clientWidth`), with zero vertical overflow (`scrollHeight <= clientHeight`) and all child rects 100% contained inside the button rect (`AC-06`, `INV-JIGGER-TEXT-01`).
- Clicking `.jigger-pour-trigger` opens `.jigger-pour-panel` fully inside `.gb-shell__playfield`, and selecting a volume updates `.jigger-pour-current` cleanly.

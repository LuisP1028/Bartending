---
ticket_id: "001"
title: "Bottom-Docked Character Dialogue Box in the Game Boy Shell & Proportional Container Scaling"
type: task
status: resolved
claimed_by: "wayfinder"
blocked_by: []
governing_specification: "functional_specification_114.md"
---

# Ticket 001: Bottom-Docked Character Dialogue Box in the Game Boy Shell & Proportional Container Scaling

## Question
How does the character dialogue box (`RetroRpgDialogueBox`) anchor strictly along the bottom strip of the Nintendo Game Boy screen (`22%–28%` height, always `≤ 30%` height) across all desktop and mobile viewports without overflowing the visible screen glass or clipping speaker names and dialogue text?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_114.md`
  - §4.1 (Strict Bottom-Strip Placement): "When a character dialogue box is open inside the Nintendo Game Boy screen, it must render **exclusively at the bottom of the screen** as a compact horizontal strip. The dialogue box must occupy no more than the lower portion of the screen (approximately `22%–28%` of the Game Boy screen height, anchored near the bottom edge with a small margin), leaving the upper `70%+` of the bar stage and the seated patrons clearly visible above it."
  - §4.1 (Screen-Size-Agnostic Proportional Scaling): "Every visual element of the dialogue box—including the outer dual-white-and-black border, deep navy interior (`#09133b`), four pixelated corner scrollwork loops, silver beveled portrait frame, character portrait image, gold speaker name header (`#f7ca18`), uppercase typewriter body text, and bouncing advancement arrow—must scale proportionally to the Game Boy screen container dimensions rather than using large fixed desktop pixel sizes."
  - §5 `INV-DIALOGUE-BOTTOM-01` (No Full-Screen Dialogue Takeover): "Under no viewport aspect ratio or window size may the character dialogue box expand to cover more than the bottom strip (`≤ 30%` height) of the Game Boy screen."
  - §6 `AC-01`: `RetroRpgDialogueBox` renders strictly at the bottom of the Game Boy screen (`≤ 30%` of screen height), with portrait, speaker name, and text scaled proportionally and the upper bar scene clearly visible.

## Codebase Audit & Root Cause Analysis

1. **Cover-Fit Overhang Between `.pov-stage` and `.gb-shell__playfield`**:
   - In `src/app/gameboy-shell.css`, `.pov-stage` inside `.gb-shell__playfield > .pov-shell-section` uses cover math (`width: max(100cqw, calc(100cqh * 1184 / 880))`), which overhangs the narrower Game Boy screen (`~1.12:1`) horizontally on the left and right.
   - `page.tsx` computes `shellHudNudge` (`tx`, `tyTop`, `tyBot`) from `section.getBoundingClientRect()` vs `stage.getBoundingClientRect()`, but did not expose the visible glass inset (`--shell-glass-inset-x`, `--shell-glass-inset-y`) or visible glass dimensions (`--shell-glass-w`, `--shell-glass-h`) on `.pov-stage`.
2. **Oversized Fixed Pixel Rules in `src/components/RetroRpgDialogueBox.module.css`**:
   - `.wrapper` used `bottom: 16px; left: 16px; right: 16px;`, which extended into the cropped horizontal overhang of `.pov-stage`.
   - `.window` enforced `min-height: 140px; padding: 18px 22px; gap: 20px;`, `.portraitFrame` enforced `92px × 92px`, and `.speakerName` / `.text` used fixed `13px` / `12px` fonts with `line-height: 1.8`, causing the dialogue box to consume `65%–95%` of the Game Boy screen height.

## Architectural Decisions Locked

1. **Expose Visible Screen Glass Geometry Custom Properties on `.pov-stage` (`src/app/page.tsx`)**:
   - Extend `shellHudNudge` measurement in `src/app/page.tsx` and `PovStageShell` to set:
     - `--shell-glass-inset-x`: `Math.max(0, S.left - T.left)` (px)
     - `--shell-glass-inset-y`: `Math.max(0, S.top - T.top)` (px)
     - `--shell-glass-w`: `S.width` (px, fallback `100cqi`)
     - `--shell-glass-h`: `S.height` (px, fallback `100cqb`)
2. **Anchor & Bound `RetroRpgDialogueBox` to the Bottom Strip (`src/components/RetroRpgDialogueBox.module.css`, `src/components/RetroRpgDialogueBox.tsx`)**:
   - Position `.wrapper` strictly within the visible Game Boy screen glass:
     - `left: calc(var(--shell-glass-inset-x, 0px) + var(--shell-glass-w, 100cqi) * 0.025);`
     - `right: calc(var(--shell-glass-inset-x, 0px) + var(--shell-glass-w, 100cqi) * 0.025);`
     - `bottom: calc(var(--shell-glass-inset-y, 0px) + var(--shell-glass-h, 100cqb) * 0.02);`
     - `height: calc(var(--shell-glass-h, 100cqb) * 0.25);`
     - `min-height: calc(var(--shell-glass-h, 100cqb) * 0.22);`
     - `max-height: calc(var(--shell-glass-h, 100cqb) * 0.27);`
     - `container-type: size; container-name: dialogue-box;`
   - Scale `.window`, `.portraitFrame`, `.cornerLoop`, `.speakerName`, `.text`, and `.promptArrow` via container query units (`cqw`, `cqh`) of `.wrapper` so 100% of the portrait, gold speaker header, and up to 120-character uppercase dialogue text render unclipped inside the `25%`-height bottom strip.

## Acceptance & Verification Oracles
- `RetroRpgDialogueBox` bounding box height is strictly `22%–28%` (`≤ 30%`) of `.gb-shell__playfield` height across desktop (`1280×800`) and mobile (`390×844`) viewports.
- `RetroRpgDialogueBox` bottom edge sits near the bottom of `.gb-shell__playfield` (`≥ 95%` of screen height), leaving the upper `70%+` of the bar stage and seated patrons unobstructed.
- Speaker name and dialogue text have zero horizontal or vertical clipping (`scrollHeight <= clientHeight`, `scrollWidth <= clientWidth`).

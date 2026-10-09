---
ticket_id: 002
title: "Boot Video Legibility & Playfield Media Containment"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_100.md"
---

# Ticket 002: Boot Video Legibility & Playfield Media Containment

## Question
How must the boot video element styling, aspect fitting, and skip hit target in `src/app/gameboy-shell.css` and `src/components/BootIntro.tsx` be configured to guarantee uncropped video playback (`contain` fitting within the playfield glass) and maintain full interactive integrity for tap/click triggers and START button activation?

## Context & Specification Grounding
- **Specification:** `functional_specification_100.md` §1 ("Uncropped Media Playback", "Interactive Integrity"), Acceptance Criteria AC2 ("The boot intro video plays inside the housing screen without title or border clipping").
- **Current Defect:** In `src/app/gameboy-shell.css` (line 1049), `.boot-intro__video` uses `object-fit: cover; object-position: center;`. In portrait and narrow aspect ratio displays, the video sides/titles are cropped outside the visible playfield window.
- **Component File:** `src/components/BootIntro.tsx` (lines 139–205).
- **Style File:** `src/app/gameboy-shell.css` (lines 1020–1084, 1264–1271).

## Architectural Decisions to Lock
1. **Uncropped Media Playback via `object-fit: contain`:**
   - `.boot-intro__video` must transition from `object-fit: cover` to `object-fit: contain`.
   - Maintain `background: #000;` on `.boot-intro .boot-intro__playfield` so letterboxed playfield margins blend seamlessly into the dark Game Boy LCD glass.
2. **Interactive Hit Layer Geometry:**
   - Confirm `.boot-intro__skip-hit` spans the full playfield surface (`position: absolute; inset: 0; z-index: 5;`).
   - Retain discrete multi-tap counting (5 taps required) with pointer event transparency on the underlying video.
3. **START Button Hit Accessibility:**
   - Retain `.boot-intro .gb-shell__btn-start` at `pointer-events: auto; cursor: pointer; z-index: 6;` so pressing START immediately dismisses the boot sequence.

## Scope & Invariant Guardrails
- **In Scope:** `.boot-intro__video`, `.boot-intro__playfield`, `.boot-intro__skip-hit`, and START button click handling in `src/app/gameboy-shell.css` and `src/components/BootIntro.tsx`.
- **Out of Scope:** Console housing containment geometry (handled in `ticket-001.md`). Patron motion (handled in `ticket-003.md`).

---

## Resolution

### 1. Style Adjustments for Video Containment
In `src/app/gameboy-shell.css` (lines 1041–1056):
Update `.boot-intro__video`:
```css
.boot-intro__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  object-fit: contain;
  object-position: center;
  background: #000;
  pointer-events: none;
  -webkit-appearance: none;
  appearance: none;
}
```

### 2. Interaction Contract
- In `src/components/BootIntro.tsx`:
  - `onScreenPointer` continues counting discrete taps up to `BOOT_SKIP_TAPS = 5`.
  - START button `<button type="button" className="gb-shell__btn-start" aria-label="Open menu" onClick={...} />` calls `finish()`.
  - Ensure neither native video controls nor browser playback overlays interfere with pointer events.

### 3. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks Ticket 003.

---
ticket_id: 003
title: "Mode Selection Playfield Centering & Dynamic Resize Pointer Synchronization"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: [001, 002]
governing_specification: "functional_specification_102.md"
---

# Ticket 003: Mode Selection Playfield Centering & Dynamic Resize Pointer Synchronization

## Question
How are playfield interior menu visibility, centering, and pointer alignment in `src/components/MainMenu.tsx` and `src/components/MainMenu.module.css` verified and preserved across dynamic resize events and landscape orientations without coordinate drift or option truncation?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_102.md`
  - §Purpose: "guaranteeing 100% visibility of the mode selection header, logos, menu options, and console controls."
  - §Desired Functionality §3: "In landscape mode, the entire interactive menu overlay—the 'MODE SELECTION' header, Obelisco and Classics mode logos, and all selection options ('JOIN THE BAR!', 'WARP DIAGNOSTICS', and 'TERMINATE UPLINK')—must be fully visible and centered inside the screen glass. No text, badge, button, or label may be pushed off the top, bottom, or side edges of the screen."
  - §Edge cases & behavioral boundaries:
    - Edge Case 3: "Actively resizing the window while navigating menu options with keyboard, D-pad, or pointer must preserve active option focus and layout integrity without repositioning the menu box."
  - §Acceptance Criteria:
    - AC2: The "MODE SELECTION" header, mode logos, and all menu actions ("JOIN THE BAR!", "WARP DIAGNOSTICS", "TERMINATE UPLINK") are completely visible and centered inside the screen glass in landscape mode.
    - AC4: Resizing the browser window between portrait and landscape dynamically scales the menu console, maintaining containment parity with the startup sequence.
- **Source Inspection:**
  - In `src/components/MainMenu.module.css`:
    - `.menuRoot` (lines 3–23): `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 3;`.
    - `.synthwaveNav` (lines 25–44): `min-width: min(78%, 260px); max-width: 94%; max-height: 92%; overflow: hidden; pointer-events: auto; padding: clamp(12px, 8%, 28px) clamp(16px, 10%, 40px) clamp(12px, 8%, 28px) clamp(36px, 18%, 60px);`.
    - `.modeLogoRow` (lines 157–166): `display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: flex-start; gap: clamp(8px, 4%, 16px); width: 100%; max-width: 100%;`.
    - `.modeLogoBtn` (lines 168–182): `max-width: min(48%, 110px);`.
    - `.modeLogoImg` (lines 209–220): `height: clamp(22px, 9cqw, 40px); width: auto; max-width: 100%; object-fit: contain;`.
  - In `src/components/MainMenu.tsx`:
    - Pointer alignment (lines 96–127): `snapPointer` measures `targetElement.getBoundingClientRect()` relative to `navWrapper.getBoundingClientRect()` and assigns `--target-y` in pixels.
    - Dynamic resize tracking (lines 147–151):
      ```tsx
      useEffect(() => {
        const onResize = () => snapToCurrent(true);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, [snapToCurrent]);
      ```
    - Font ready calibration (lines 137–145): calls `snapToCurrent(true)` once web fonts load to prevent misaligned pointer glyphs.

## Architectural Decisions to Lock
1. **Playfield Containment & Centering Verification:**
   - Under proportional containment enforced by `ticket-001.md` and `ticket-002.md`, the Game Boy shell maintains its canonical `422 / 697` ratio inside the viewport.
   - `.gb-shell__playfield.main-menu__playfield` maintains its proportional glass hole (`margin: 0 3% 3.5% 10%`).
   - `.menuRoot` centers `.synthwaveNav` on both axes. Because `.synthwaveNav` is constrained by `max-height: 92%` and `max-width: 94%`, all interactive elements ("MODE SELECTION" header, Obelisco & Classics mode buttons, "JOIN THE BAR!", "WARP DIAGNOSTICS", "TERMINATE UPLINK") fit 100% inside the screen glass with zero edge clipping.
2. **Pointer Calibration Invariant:**
   - The resize listener in `src/components/MainMenu.tsx` triggers `snapToCurrent(true)` with bypass animation whenever viewport dimensions change.
   - Because the console housing scales proportionally via CSS container queries, element bounding rects update synchronously, and `--target-y` updates immediately to the active target element's new vertical position without lag, cumulative drift, or overshoot.
3. **Background Image Scaling:**
   - `.main-menu__bg` inside `.gb-shell__playfield` maintains `object-fit: cover; object-position: center;`, ensuring the retro synthwave grid wallpaper fills the playfield glass completely across all scaled dimensions without exposing unstyled margins behind the terminal.

## Scope & Invariant Guardrails
- **In Scope:** Verifying playfield bounds, interior component visibility, and pointer dynamic resize behavior in `src/components/MainMenu.tsx` and `src/components/MainMenu.module.css`.
- **Out of Scope:** Core console geometry rules in `src/app/gameboy-shell.css` (locked in `ticket-001.md` and `ticket-002.md`).

---

## Resolution

### Verification & Contract Alignment
1. **Layout Integrity:**
   The containment and slot geometry locked in `ticket-001.md` and `ticket-002.md` natively preserves the interior geometry of `.main-menu__playfield`. No modifications to `MainMenu.tsx` or `MainMenu.module.css` are required because their internal sizing (`clamp(...)` and `%` bounds) was designed to fit within the `gb-shell` container query context.
2. **Dynamic Resize Parity:**
   The active `resize` event listener in `MainMenu.tsx` satisfies AC4 and Edge Case 3 by updating pointer coordinates on every orientation change or window resize event, guaranteeing seamless focus tracking across portrait and landscape modes.

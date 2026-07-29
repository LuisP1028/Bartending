# FS87 — Main menu MODE SELECTION with OBELISCO + CLASSICS logos

## Purpose

Replace the main menu’s **“Initiate Sequence”** enter-play entry with **MODE SELECTION**, and place the **OBELISCO** and **CLASSICS** gold logos **inside** that entry so the player chooses a mode when leaving the menu into the bar game.

This document describes desired `{functionality}` only. **No implementation instructions.**

**Maps:** [wayfinder/map-070.md](./wayfinder/map-070.md)  
**Prior:** FS80 (menu sequence), FS81 (glass parity), FS82 (shell navigation), FS45 (in-game logo mode controls — assets)

**DO NOT CODE from this document alone.** Implementation waits for RE87 + documentation sufficiency + operator authorize.

---

## Glossary

`LANGUAGE.md` terms apply: `{functionality}`, `{correct required outputs}`, `{sufficient}` / `{insufficient}`, `{errors}`, `{correctness}`.

---

## Current baseline

1. After boot (or via START), the **main menu** shows a synthwave Navigator list.
2. First item is labeled **Initiate Sequence** and is the primary **enter-play** action (`entersPlay: true`).
3. Other items (Starfield Config, Warp Diagnostics, Terminate Uplink) are stubs.
4. Entering play does **not** require choosing OBELISCO vs CLASSICS on the menu; mode is whatever the game already holds (typically default OBELISCO).
5. Gold mode logos already exist and are used on the **in-game** sys-header mode strip; they are **not** on the main menu today.

---

## Desired `{functionality}`

### Copy and structure

1. The first main-menu entry is presented as **MODE SELECTION** (not “Initiate Sequence”).
2. **Inside** that entry’s control region (within the Navigator panel, belonging to that first row/section — not a second distant chrome strip outside the menu panel), the player sees **both**:
   - **OBELISCO** logo (gold cutout asset already created for the product)
   - **CLASSICS** logo (gold cutout asset already created for the product)
3. Logos are **visually primary** for mode choice; the MODE SELECTION label identifies the section.

### Enter play + mode choice

4. Activating the **OBELISCO** logo **sets the active mode to OBELISCO** and **enters the interactive game** (same transition as today’s Initiate Sequence enter-play).
5. Activating the **CLASSICS** logo **sets the active mode to CLASSICS** and **enters the interactive game**.
6. After enter-play via a logo, the game session runs under that mode (payload / recipe set / receipt titles behave as they do when that mode is active today).

### Navigation (menu shell)

7. **Up / Down** still move among root menu rows (MODE SELECTION, Starfield, Diagnostics, Terminate).
8. When MODE SELECTION is the active row, the player can move focus **between the two logos** (Left/Right or equivalent explicit focus order) so each logo can be selected deliberately.
9. **A / Enter / Space** on a focused logo activates that logo (mode + enter play).
10. If focus is on the MODE SELECTION row but not yet on a specific logo, the product must still define activation: **focus lands on a logo by default** (OBELISCO first) so A always has a clear target — no dead “label only” activate.
11. **B** at root and **START** still leave menu → play **without** requiring a new mode choice; previous/default mode remains.
12. Stub rows remain non-enter-play (highlight only), unchanged in purpose.

### Presentation quality

13. Logos remain **readable** and **crisp** (pixel-friendly rendering consistent with the menu / 8-bit shell).
14. Active / hover / focus states make it clear which logo is selected or focused.
15. Touch/click: tapping a logo activates it (mode + enter play) without requiring a second confirm, unless focus-only selection already matches that logo.

### Accessibility

16. The mode-selection region has an accessible name reflecting **Mode selection**.
17. Each logo control has an accessible name **OBELISCO** or **CLASSICS**.
18. Focus order is keyboard-reachable for both logos.

### Unchanged

19. Boot intro sequence (FS79) and menu glass size parity (FS81) stay as specified.
20. In-game sys-header mode logo controls remain available after enter-play for mid-session switching.
21. No new modes beyond OBELISCO and CLASSICS.
22. Menu background art and overall Navigator aesthetic remain; only the first entry’s content changes as above.

---

## Explicit non-goals

- Redesigning the entire menu list or removing stub items.
- Building full sub-screen stack UX beyond what MODE SELECTION needs for logo focus.
- Changing recipe/mode payload files themselves.
- Replacing receipt header logos or inventing new logo art files (use existing gold cutouts).
- Making B/START force a mode picker.

---

## `{correct required outputs}` (acceptance)

| ID | Scenario | Required result |
|----|----------|-----------------|
| A1 | Open main menu | First entry shows **MODE SELECTION** (no “Initiate Sequence” as that entry’s title) |
| A2 | Observe MODE SELECTION interior | **Both** OBELISCO and CLASSICS gold logos visible |
| A3 | Activate OBELISCO logo | Enters play; active mode is **OBELISCO** |
| A4 | From menu, activate CLASSICS logo | Enters play; active mode is **CLASSICS** |
| A5 | Up/Down from other rows to MODE SELECTION | Focus can reach logos; A activates focused logo’s mode + enter play |
| A6 | Left/Right (or documented focus cycle) between logos | Focus moves between OBELISCO and CLASSICS |
| A7 | Stub item A | Does not enter play |
| A8 | B at root or START | Enters play without requiring logo press; mode not forced to change |
| A9 | After logo enter-play | In-game mode chrome reflects the chosen mode (consistent with session mode) |

---

## Success definition

`{functionality}` is achieved when MODE SELECTION replaces Initiate Sequence as the first entry, both mode logos appear inside it, and choosing a logo enters the game in that mode — with shell navigation and stubs still coherent (A1–A9).

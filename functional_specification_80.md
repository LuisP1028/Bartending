# FS80 — Post-boot main menu sequence (bg + Synthwave Navigator + START)

## Purpose

Insert a **main menu sequence** between the existing boot intro video and the interactive bartending game, and make that same menu reachable from the Game Boy **START** control. This document describes **what** the product must do (desired `{functionality}`). It does **not** prescribe implementation structure, file layout, or code.

**Maps:** [wayfinder/map-063.md](./wayfinder/map-063.md), [mobile-render-debug/map-071.md](./mobile-render-debug/map-071.md)  
**Prior:** [functional_specification_79.md](./functional_specification_79.md) (boot intro video + 5-tap skip)

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, `{errors}` follow `LANGUAGE.md`.

---

## Current behavior (baseline)

1. On load, the app shows full-viewport Game Boy chrome and plays `public/assets/boot/doom_gamestudio.mp4` full-bleed inside the housing **playfield / glass** only (no native video controls).
2. When the video **ends**, **errors**, hits the **failsafe**, or the player performs **five discrete taps** on the housing playfield, the intro finishes and the app shows the **normal interactive game**.
3. Game Boy **START** (and SELECT) are **decorative** — they do not open a menu.

---

## Desired end-to-end flow

```
Page load
  → Boot intro video (FS79, unchanged media + 5-tap skip policy)
  → Menu sequence  ← NEW (also reachable via START)
  → Interactive bar game (existing product)
```

The player must **never** jump from intro-complete **directly** into interactive play without the menu sequence having been shown at least once after that intro exit—except as defined by re-entry via START after play has already begun (see START).

---

## Triggers that open the menu sequence

All of the following must result in the **same** menu sequence being visible:

| # | Trigger | Notes |
|---|---------|--------|
| T1 | Boot video **ended** | Natural completion of the MP4 |
| T2 | Boot video **error** or existing **failsafe** | Same fail-open spirit as FS79 |
| T3 | **Five** discrete taps/clicks on the housing **playfield** during intro | Outside-glass taps do **not** count (FS79) |
| T4 | Click/tap on Game Boy **START** during the boot intro | Opens menu without requiring five playfield taps |
| T5 | Click/tap on Game Boy **START** during the interactive game | Opens the same menu again (return-to-menu) |

When the menu is **already** visible, START must not open a second stacked menu.

---

## Menu sequence — visual composition

### Background

- The full visual backdrop of the menu sequence is **Image #1**: the provided synthwave pixel-art scene (hot pink/magenta sun, purple nebula/swirl, city silhouette, reflective water, starfield).
- The background fills the **housing playfield / glass** (full-bleed cover of that rectangle).
- Pixel-art integrity: the background must remain **crisp** (nearest-neighbor / pixelated sampling); no soft blur of the asset for “polish.”

### Menu UI

- The interactive menu matches the look and interaction model of the prototype at `/Users/diesel/Desktop/test.html` (“Synthwave Navigator”), including:
  - CRT-style panel presentation with scanline overlay
  - Pixel / Press-Start-style typography and uppercase treatment
  - Vertical list of menu items
  - Distinct **unselected**, **active (selected)**, **hover**, and **keyboard-focus** states
  - A **key-shaped pointer** graphic that tracks the active item with discrete stepped motion and a short bounce after moves
- The menu sits **on top of** the background, inside the same glass/playfield region (not outside the Game Boy housing as a free page).

### Shell chrome

- Plastic shell (D-pad, A/B, START/SELECT labels, speakers, headers) remains the Game Boy frame around the glass content.
- Menu content does not paint over the plastic controls region as its primary layout.

---

## Menu items (v1 product defaults)

Prototype labels are acceptable for v1 until product renames them.

| Label (prototype) | Required behavior |
|-------------------|-------------------|
| **Initiate Sequence** | **Enters interactive play** — dismisses the menu sequence and reveals the normal bartending game (existing mode-load / post-boot game surface). This item is the **default active** item when the menu opens. |
| **Starfield Config** | May be selected/highlighted; **no** full settings screen required for v1. |
| **Warp Diagnostics** | May be selected/highlighted; **no** diagnostics screen required for v1. |
| **Terminate Uplink** | May be selected/highlighted; **no** requirement to close the browser tab for v1. |

Selecting a non-play item must not break the menu or crash the app. Only **Initiate Sequence** is required to advance the global boot→menu→game pipeline.

---

## Interaction expectations (menu visible)

- **Pointer/click:** Selecting a menu item makes it active and moves the pointer (as in the prototype). Activating **Initiate Sequence** enters play.
- **Keyboard:** Up/down (or equivalent) move focus among items; Enter/Space activate the focused item (prototype pattern).
- **Accessibility:** Menu remains operable as a navigation control set (roles/labels consistent with a main menu).
- **Shell START** while menu is open: no second menu stack.

---

## Relationship to interactive game

- Until the player successfully **enters play** from the menu (Initiate Sequence), the interactive bar simulation, hotspots, patrons, receipts, and mode chrome of the main game are **not** the active player-facing sequence.
- After enter-play, the game behaves as today’s post-FS79 product, **except** START re-opens the menu (T5).
- When START re-opens the menu mid-session, the player can choose **Initiate Sequence** again to return to play. Exact preservation of in-progress drink state vs soft pause is **not** redefined here beyond: opening the menu must not corrupt save-less session state in a way that forces a hard reload; prefer keeping session state so return-to-play continues the same session.

---

## What stays unchanged

- Boot video asset path and skip count (**5** playfield taps).
- Muted + playsInline autoplay intent of the boot video.
- Game Boy shell visual identity and scale approach used for the intro.
- Cocktail rules, validation, patrons, receipts, modes, carousels — except as needed so START and menu phases do not fight existing shell handlers incorrectly.

---

## Presentation / pixel integrity (from map-071)

- Menu + background are framed in the **glass playfield**.
- Background uses pixelated/crisp sampling; cover the playfield.
- **No separate mobile-only menu layout** — same shell path on phone and desktop.
- Desktop shell behavior for the interactive game remains intact once play is entered.

---

## Correct required outputs (objectively observable)

After implementation, a human or automated check must be able to observe:

1. **O1 — Video end → menu:** Letting the boot MP4 finish shows the menu sequence (Image #1 bg + Synthwave-style menu), **not** the bar game first.
2. **O2 — Five-tap skip → menu:** Five playfield taps during intro show the same menu (not the bar game first).
3. **O3 — START during intro → menu:** START on the boot shell shows the same menu without requiring five playfield taps.
4. **O4 — Initiate Sequence → game:** Activating **Initiate Sequence** reveals the interactive bar game.
5. **O5 — START during game → menu:** After play has started, START shows the menu again.
6. **O6 — Framing:** Menu background and menu UI appear inside the housing glass/playfield, not as an unframed full-browser page replacing the shell.
7. **O7 — Crisp bg:** Background remains visibly pixelated/crisp (not soft-blurred) at the playfield size.
8. **O8 — Single menu:** Opening START while the menu is already visible does not stack a second menu.

---

## Explicit non-goals (this FS)

- Implementing code in this document.
- Redesigning A/B/D-pad carousel modes (FS77 / map-062).
- Real settings or diagnostics screens for the non-play items.
- Changing the boot MP4 content.
- Audio redesign or unmuting the boot video.

---

## Handoff

| Artifact | Path |
|----------|------|
| This FS | `functional_specification_80.md` |
| Required edits | `required_edits_80.md` (RE80) |
| Context pack | `aaa81/` |
| Product map | `wayfinder/map-063.md` |
| Presentation map | `mobile-render-debug/map-071.md` |
| Menu prototype | `/Users/diesel/Desktop/test.html` |
| Background reference | Session Image #1 (synthwave landscape) |

**DO NOT CODE** until the operator authorizes after RE80 and documentation sufficiency pass.

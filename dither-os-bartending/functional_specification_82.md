# FS82 — Main menu shell navigation (D-pad, A, B, START)

## Purpose

While the **main menu** is visible, the Game Boy **shell controls** must drive menu navigation and exit:

- **D-pad up / down** move the menu highlight  
- **A** selects / activates the highlighted item  
- **B** goes back (previous menu screen when nested; on root menu → **game**)  
- **START** (and **B** on root) returns to the **game**

This document describes desired `{functionality}` only (no implementation).

**Maps:** [wayfinder/map-065.md](./wayfinder/map-065.md), [mobile-render-debug/map-073.md](./mobile-render-debug/map-073.md)  
**Prior:** FS80 (menu sequence), FS81 (glass size parity), FS71/77 (play shell input)

---

## Glossary

Per `LANGUAGE.md`: `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, `{errors}`.

---

## Current baseline

1. Menu shows after boot exit or START from play (FS80); glass size matches boot (FS81).  
2. Menu items respond to **pointer/click** and keyboard arrows on the list.  
3. Menu shell **D-pad / A / B** are not interactive.  
4. **START** on the menu does **not** return to the game (no-op / anti-stack only).  
5. Play shell has working D-pad / A / B for hotspots and carousels — not available while menu is mounted alone.

---

## Desired `{functionality}`

### Scope

Applies only while the **menu sequence is the active phase** (player sees menu glass + Synthwave list or a future menu sub-screen). Does not change play-phase shell semantics except that START still opens the menu from play (FS80).

### Control contract (menu phase)

| Control | Behavior |
|---------|----------|
| **↑** | Highlight previous menu item (cyclic wrap preferred). Pointer graphic follows active item. |
| **↓** | Highlight next menu item (cyclic wrap preferred). |
| **← / →** | No-op on the root vertical list (must not change selection or exit). |
| **A** | Activate highlighted item. **Initiate Sequence** → enter/return to interactive game. Other items: v1 may still only highlight/activate stub; when sub-screens exist, A opens that screen. |
| **B** | **Back.** If a **previous menu screen** exists (stack depth &gt; 1), show that previous screen. If already on the **root** menu, **leave menu and enter/return to the game**. |
| **START** | **Always leave menu → game**, regardless of menu stack depth. Must not open a second menu. |
| **SELECT** | Unchanged (decorative). |
| **Pointer / touch** on list items | Remains valid alongside shell controls. |

### Menu stack (for future screens)

- Root Navigator list is the base screen.  
- Future selections may push additional screens.  
- **B** pops one level; at root, **B** exits to game.  
- **START** hard-exits to game from any depth.  
- v1 may only implement root → game for B/START; the stack rule is the product contract.

### First menu after boot

Player may not have entered play yet. Root **B** and **START** still transition to the **interactive game** (enter play), same destination as “return to game.”

### Play phase (unchanged except START path already defined)

- START → open menu.  
- D-pad / A / B → existing hotspot/carousel behavior (FS71/77).  
- Opening menu must not leave play shell handlers active under the menu.

### Glass / layout

- FS81 size parity remains; enabling controls must **not** resize the glass.

---

## Correct required outputs (observable)

1. **O1 — ↑ / ↓:** On menu, pressing shell up/down moves the active item and pointer.  
2. **O2 — A:** Pressing A on **Initiate Sequence** enters the game.  
3. **O3 — B root:** On root menu, B enters/returns to the game.  
4. **O4 — START menu:** On menu, START enters/returns to the game (not a no-op).  
5. **O5 — ← →:** Left/right on root menu do not change selection or exit.  
6. **O6 — Play isolation:** While menu is up, D-pad/A/B do not open carousels or move hotspot focus underneath.  
7. **O7 — START play:** From game, START still opens menu (FS80).  
8. **O8 — Future back (contract):** When a sub-screen exists, B returns to the previous menu screen instead of game until root.

---

## Explicit non-goals

- Implementing code in this document.  
- Building full Starfield Config / Diagnostics screens (only navigation hooks).  
- SELECT behavior.  
- Changing boot video skip rules.  
- Redesigning menu art.

---

## Supersessions

- FS80 “START while menu open is no-op” → replaced by **START → game** (still no double-menu stack).  
- FS80 item activation by click remains; shell **A** is an additional activation path.

---

## Handoff

| Artifact | Path |
|----------|------|
| FS82 | `functional_specification_82.md` |
| RE82 | `required_edits_82.md` |
| Context | `aaa83/` |

**DO NOT CODE** until operator authorizes after RE82 sufficiency.

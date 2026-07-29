# FS81 — Main menu glass size parity with boot intro and gameplay

## Purpose

The FS80 main menu sequence must **not** change the Game Boy **screen (glass / playfield) size** relative to the boot intro video or gameplay. The menu presentation area must be **the same size** as the screen during bootup and during play, and must **stay that size** for the entire menu phase.

This document describes desired `{functionality}` only. No implementation instructions.

**Maps:** [wayfinder/map-064.md](./wayfinder/map-064.md), [mobile-render-debug/map-072.md](./mobile-render-debug/map-072.md)  
**Prior:** [functional_specification_80.md](./functional_specification_80.md) (menu content + triggers), [functional_specification_79.md](./functional_specification_79.md) (boot video glass)

---

## Glossary

`LANGUAGE.md` definitions of `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, `{errors}` apply.

---

## Current failure (baseline)

1. Boot intro shows the studio video full-bleed in the housing glass at the FS79 shell scale.  
2. When the menu appears (video end, 5-tap skip, or START), the **housing screen appears smaller or differently scaled** than the boot video glass.  
3. When the player enters play (or compares to play), the **menu glass does not match** the gameplay playfield size.  
4. Phase transitions therefore feel like the **screen resizes**.

Menu **content** (synthwave bg + Navigator items + START behavior from FS80) remains in scope as already specified; this FS only corrects **size/framing parity**.

---

## Desired `{functionality}`

### Size parity

Across these phases, the **outer Game Boy shell** and the **inner glass (playfield) rectangle** must occupy the **same on-screen size and position family**:

| Phase | Glass content | Glass size vs boot |
|-------|---------------|--------------------|
| **Intro** | Boot MP4 | Reference |
| **Menu** | Menu background + menu UI | **Equal to intro glass** |
| **Play** | Bar stage / POV | **Equal glass hole** (same housing playfield the stage already fills) |

“Equal” means: no user-visible jump in glass width, height, or placement when moving intro → menu → play or play → menu via START.

### Stretch / fill

- Menu background must **cover** the full glass (same cover intent as the boot video filling the glass).  
- Menu UI sits **inside** that full glass; it must not redefine a smaller “virtual screen” inside the shell.  
- The menu must **remain** full-glass for the whole menu phase (resize of browser window may reflow the shared shell, but menu must not use a separate smaller layout than boot).

### What stays unchanged (FS80 product)

- Triggers: video end, failsafe, 5-tap skip, START → menu.  
- Initiate Sequence → play.  
- Menu items and synthwave visual identity.  
- Pixelated background sampling.  
- Boot video asset and skip count.

### What must not regress

- Boot intro glass and video presentation.  
- Gameplay shell playfield and stage cover behavior.  
- Desktop and mobile both use the **same** menu/boot shell size contract (no special shrunken mobile menu glass).

---

## Correct required outputs (observable)

1. **O1 — Intro → menu:** After menu appears, glass size matches the boot video glass (no shrink jump).  
2. **O2 — Menu → play:** Entering play does not require a different glass size than the menu just showed.  
3. **O3 — Play → menu (START):** Re-opening menu restores the **same** glass size as boot/play, not the broken smaller FS80 menu glass.  
4. **O4 — Full-bleed menu bg:** Background fills the entire glass (no large unused letterbox *inside* the glass caused by a smaller content frame).  
5. **O5 — Stability:** During the menu phase, glass size stays consistent (aside from normal viewport resize of the shared shell).

---

## Explicit non-goals

- Coding in this document.  
- Changing menu item copy or START semantics.  
- Redesigning shell art proportions for the whole product beyond restoring parity.  
- Canvas DPR pipelines (stack is DOM/CSS).

---

## Handoff

| Artifact | Path |
|----------|------|
| This FS | `functional_specification_81.md` |
| Required edits | `required_edits_81.md` |
| Context | `aaa82/` |
| Maps | `wayfinder/map-064.md`, `mobile-render-debug/map-072.md` |

**DO NOT CODE** until operator authorizes after RE81 sufficiency.

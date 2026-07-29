# RE87 — Required edits: Main menu MODE SELECTION + mode logos

**Spec:** [functional_specification_87.md](./functional_specification_87.md)  
**Map:** [wayfinder/map-070.md](./wayfinder/map-070.md)  
**Context:** `aaa86/`  
**DO NOT CODE until operator authorizes after documentation sufficiency.**

---

## Goal

Replace **Initiate Sequence** with **MODE SELECTION** containing **OBELISCO** and **CLASSICS** gold logos; logo activation sets mode and enters play.

---

## Files to modify

| File | Role |
|------|------|
| `src/components/MainMenu.tsx` | Menu data, MODE SELECTION UI, logo controls, mode callback, focus/activation |
| `src/components/MainMenu.module.css` | Layout/styles for label + dual logos, focus/active states |
| `src/app/page.tsx` | Wire menu enter-play with chosen mode (`setModeName` / `switchMode` / existing mode loader path) |

**Likely read-only reference (do not regress):**

| File | Role |
|------|------|
| `src/app/globals.css` | In-game `.mode-btn--*` logo sizing/glow patterns to mirror lightly |
| `public/assets/logos/obelisco/obelisco-logo-gold.png` | Asset |
| `public/assets/logos/classics/classics-logo-gold.png` | Asset |

**Do not modify** unless required for a one-line prop type: boot intro, gameboy shell layout (FS81), receipt system.

---

## Edit 1 — Extend MainMenu props for mode-aware enter-play

**File:** `src/components/MainMenu.tsx`

1. Keep `onEnterPlay: () => void` **or** replace/extend with a mode-aware callback, e.g.  
   `onEnterPlay: (mode?: 'OBELISCO' | 'CLASSICS') => void`  
   Preferred: **`onSelectModeAndPlay: (mode: 'OBELISCO' | 'CLASSICS') => void`** plus existing `onEnterPlay` for B/START without mode change — **or** single callback with optional mode.

**Recommended contract (pick one in code; RE pins this):**

```ts
type MainMenuProps = {
  /** Enter play without changing mode (B root, START). */
  onEnterPlay: () => void;
  /** Enter play after selecting a mode from MODE SELECTION logos. */
  onSelectModeAndPlay: (mode: 'OBELISCO' | 'CLASSICS') => void;
};
```

2. Update all former `entersPlay` logo paths to call `onSelectModeAndPlay('OBELISCO' | 'CLASSICS')`.
3. Keep `onEnterPlay()` for `goBack` (root B) and `returnToGame` (START).

---

## Edit 2 — Menu model: MODE SELECTION instead of Initiate Sequence

**File:** `src/components/MainMenu.tsx`

1. Change `MENU_ITEMS` first entry:
   - `id`: e.g. `'mode-selection'` (not `'initiate'`)
   - `label`: `'Mode Selection'` (CSS uppercase → **MODE SELECTION**)
   - Remove reliance on simple `entersPlay: true` text-only activate **or** set `entersPlay: false` and handle mode logos separately.

2. Structure for the first row (conceptual):

   - Visible section title: MODE SELECTION  
   - Two controls:
     - OBELISCO → `<img src="/assets/logos/obelisco/obelisco-logo-gold.png" … />`
     - CLASSICS → `<img src="/assets/logos/classics/classics-logo-gold.png" … />`
   - Each control is a **button** (or menuitem) with `aria-label` / accessible name matching the mode.

3. **Do not** use receipt logos (`*-receipt-logo.png`); use **gold** cutouts only.

4. Stub items unchanged.

---

## Edit 3 — Focus and activation behavior

**File:** `src/components/MainMenu.tsx`

1. Maintain root `activeIndex` over the four rows.
2. When `activeIndex` is MODE SELECTION, track **`logoIndex`** `0 | 1` (OBELISCO | CLASSICS).
3. **Left / Right** d-pad and ArrowLeft / ArrowRight: if on MODE SELECTION row, toggle `logoIndex`; else no-op (current root list).
4. **A / Enter / Space** on MODE SELECTION: call `onSelectModeAndPlay(logoIndex === 0 ? 'OBELISCO' : 'CLASSICS')`.
5. When moving Up/Down **onto** MODE SELECTION, default `logoIndex` to `0` (OBELISCO) if unset.
6. Pointer graphic: snap to focused logo button when on MODE SELECTION row (extend `buttonRefs` or separate logo refs so `snapPointer` targets the focused logo, not only a text row).
7. Click/tap on a logo: select that logo focus + `onSelectModeAndPlay` for that mode (single action enter).
8. Click on MODE SELECTION title only (if separate): focus the row / default logo; do not enter play without a logo activation unless title is not a separate hit target.

---

## Edit 4 — CSS layout for dual logos inside MODE SELECTION

**File:** `src/components/MainMenu.module.css`

1. Add classes for:
   - Mode selection row container (column: title + logo row)
   - Logo row (horizontal flex, gap, wrap-safe for small glass)
   - Logo button (transparent bg, no default border, cursor pointer)
   - Logo image (`height` clamp similar to in-game band ~28–56px; `width: auto`; `object-fit: contain`; `image-rendering: pixelated` / crisp-edges)
2. Active / focused logo: magenta glow or cyan outline consistent with menu active/hover language (can echo globals mode-btn amber drop-shadow lightly — either is fine if readable on synthwave).
3. Ensure `min-width` / `max-width` of `.synthwaveNav` still fits both logos without clipping in the Game Boy glass (FS81 size unchanged).
4. Keep scanlines and pointer graphic above/beside without blocking logo clicks (`pointer-events` on buttons).

---

## Edit 5 — page.tsx host wiring

**File:** `src/app/page.tsx`

1. Where `<MainMenu onEnterPlay={…} />` is rendered, pass mode-aware handler:

   - `onSelectModeAndPlay={(mode) => { /* set mode to mode; then enter play */ }}`
   - Reuse existing mode switch path used by sys-header (`setModeName`, payload reload / `switchMode` equivalent already in page).

2. Order of operations on logo enter:

   1. Set active mode to the chosen mode (same as clicking that mode in sys-header).  
   2. Transition UI phase from menu → interactive game (same as current `onEnterPlay`).

3. `onEnterPlay` alone (B/START): enter game **without** forcing mode change.

4. Ensure CLASSICS/OBELISCO payload load errors still surface as they do for in-game switch (do not invent new error UI).

---

## Edit 6 — Constants

Prefer shared path constants (optional but clean):

- Either import/copy the same strings as `OBELISCO_MODE_LOGO_SRC` / `CLASSICS_MODE_LOGO_SRC` from page, or define once in a small shared module. **Do not** duplicate divergent paths.

---

## Edit 7 — Verification (manual)

| Check | Expected |
|-------|----------|
| Menu first row | **MODE SELECTION** text + two logos |
| No “Initiate Sequence” | Absent as that entry title |
| Tap OBELISCO | Play + OBELISCO mode |
| Tap CLASSICS | Play + CLASSICS mode |
| D-pad L/R on row | Focus between logos; A enters with focused mode |
| D-pad U/D | Moves to stubs |
| START / B root | Enter play, mode unchanged |
| Glass size | Unchanged vs FS81 |

---

## Implementation order

1. Edit 1 + 5 (callback contract + page wiring).  
2. Edit 2–3 (structure + focus).  
3. Edit 4 (CSS).  
4. Edit 7 verify.

---

## Explicit non-edits

- Boot video, shell geometry, receipt logos, new modes, stub item implementations.

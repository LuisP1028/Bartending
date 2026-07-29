# RE82 — Required edits: menu D-pad / A / B / START navigation

**DO NOT CODE until operator authorizes.**  
**Spec:** [functional_specification_82.md](./functional_specification_82.md)  
**Maps:** [wayfinder/map-065.md](./wayfinder/map-065.md), [mobile-render-debug/map-073.md](./mobile-render-debug/map-073.md)  
**Context:** [aaa83/](./aaa83/)

---

## 0. Goals

| ID | Check |
|----|--------|
| O1 | Shell ↑↓ move menu selection |
| O2 | Shell A activates (Initiate Sequence → play) |
| O3 | Shell B on root → play |
| O4 | Shell START on menu → play |
| O5 | ←→ no-op on root list |
| O6 | No play hotspot/carousel side effects under menu |
| O7 | START from play still opens menu |
| O8 | Structure ready for B = pop when depth > 1 |

---

## 1. API surface on MainMenu

**File:** `src/components/MainMenu.tsx`

### 1.1 Props

Extend beyond `onEnterPlay`:

```ts
type MainMenuProps = {
  onEnterPlay: () => void;  // leave menu → play (Initiate Sequence, B root, START)
};
```

`onEnterPlay` is the single exit-to-game callback (parent sets `phase` to `'play'`). Use it for:

- Initiate Sequence activation  
- Root **B**  
- **START**  

### 1.2 Internal navigation API

Expose (internal functions is fine):

| Function | Behavior |
|----------|----------|
| `moveSelection(delta: -1 \| 1)` | Change `activeIndex` with wrap; snap pointer |
| `activateCurrent()` | If current item `entersPlay` → `onEnterPlay()`; else stub / future push |
| `goBack()` | If `screenStack.length > 1` pop; else `onEnterPlay()` |
| `returnToGame()` | Always `onEnterPlay()` (START) |

v1: `screenStack` may be a single root only; `goBack()` === `returnToGame()`.

### 1.3 Wire shell controls in JSX

Replace decorative D-pad / A / B with interactive controls (mirror play shell structure in `page.tsx`):

**D-pad** (inside `.gb-shell__btn-direction`):

```tsx
<button type="button" className="gb-shell__dpad gb-shell__dpad--up" aria-label="Menu up" onClick={() => moveSelection(-1)} />
<button type="button" className="gb-shell__dpad gb-shell__dpad--down" aria-label="Menu down" onClick={() => moveSelection(1)} />
<button type="button" className="gb-shell__dpad gb-shell__dpad--left" aria-label="Menu left" onClick={() => { /* no-op root */ }} />
<button type="button" className="gb-shell__dpad gb-shell__dpad--right" aria-label="Menu right" onClick={() => { /* no-op root */ }} />
```

**A / B** (real buttons, not spans):

```tsx
<button type="button" className="gb-shell__btn-b" aria-label="Back" onClick={goBack} />
<button type="button" className="gb-shell__btn-a" aria-label="Select" onClick={activateCurrent} />
```

**START:**

```tsx
<button type="button" className="gb-shell__btn-start" aria-label="Return to game" onClick={returnToGame} />
```

Remove the empty START no-op handler.

### 1.4 Keep click/keyboard on list

Existing list click + ArrowUp/Down/Enter must stay consistent with `activeIndex` / activate rules.

---

## 2. CSS — enable hits on menu shell

**File:** `src/app/gameboy-shell.css`

Shared boot/menu controls currently set A/B and dpad area to `pointer-events: none`.

### 2.1 Required for menu (and safe if shared carefully)

Under **menu host** (prefer `.main-menu` scoped so boot intro is unchanged):

1. `.main-menu .gb-shell__dpad` — `pointer-events: auto; cursor: pointer;` (reuse play dpad positioning rules from media-query block if needed; **copy** play dpad position rules under `.main-menu` if they only exist inside `@media` play shell).  
2. `.main-menu .gb-shell__btn-a`, `.main-menu .gb-shell__btn-b` — `pointer-events: auto; cursor: pointer;` (override shared `none`).  
3. START already `pointer-events: auto` — keep.  
4. **Do not** change FS81 glass/screen-cont/playfield sizes.

### 2.2 Boot intro

Leave boot D-pad/A/B non-interactive (only START finishes intro). Do not enable full menu navigation on boot video.

### 2.3 D-pad layout on menu

Play shell defines `.gb-shell__dpad--up/down/left/right` percentages inside a media query. Ensure those **positioning** rules apply when menu is shown on all viewports (menu is full-viewport like boot). Options:

- Duplicate dpad position rules under `.main-menu .gb-shell__dpad--*` (recommended, no media gate), or  
- Lift dpad geometry to shared non-media rules used by menu + play.

---

## 3. Parent page phase

**File:** `src/app/page.tsx`

### 3.1 Menu mount

```tsx
if (phase === 'menu') {
  return <MainMenu onEnterPlay={onEnterPlay} />;
}
```

`onEnterPlay` already `setPhase('play')` — sufficient for B/START/Initiate Sequence.

### 3.2 Play START

Keep `onOpenMenu` → `setPhase('menu')` on in-game START (O7).

### 3.3 No dual handlers

While menu is mounted, play shell is unmounted — no conflict. Do not leave invisible play shell under menu.

---

## 4. Optional: keyboard parity on shell focus

Not required if list already has ArrowUp/Down. Optional: document-level keydown while menu open for ArrowUp/Down/Enter/Escape:

- Escape → same as B (goBack)  
Only if easy; not required for O1–O7.

---

## 5. Files to touch

| File | Action |
|------|--------|
| `src/components/MainMenu.tsx` | Shell control wiring + move/activate/back/return |
| `src/app/gameboy-shell.css` | Menu dpad/A/B pointer-events + dpad positions if missing |
| `src/app/page.tsx` | Only if prop rename needed (likely no change) |

---

## 6. Implementation order

1. CSS: menu dpad geometry + pointer-events for A/B/dpad.  
2. MainMenu: replace decorative controls with buttons.  
3. Implement `moveSelection` / `activateCurrent` / `goBack` / `returnToGame`.  
4. START → `returnToGame`.  
5. Manual test matrix.  
6. Build.

---

## 7. Manual tests

| Step | Action | Expect |
|------|--------|--------|
| 1 | On menu, press shell ↓ several times | Highlight moves down with wrap |
| 2 | Press shell ↑ | Highlight moves up |
| 3 | Highlight Initiate Sequence, press A | Enter game |
| 4 | From game, START | Menu opens |
| 5 | On menu, START | Back to game |
| 6 | On menu, B | Back to game (root) |
| 7 | On menu, ← → | No selection change |
| 8 | On menu, A on stub item | No crash; no forced play unless item is enter-play |
| 9 | Glass size | Unchanged vs FS81 |

---

## 8. Out of scope

- Building real sub-screens  
- SELECT  
- Coding before authorize  
- Deploy (after implement, if operator asks)

---

## 9. Handoff

When authorized: implement only RE82 against FS82. Verify O1–O7 (O8 structural only for v1).

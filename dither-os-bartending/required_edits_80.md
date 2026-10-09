# RE80 — Required edits: post-boot main menu sequence

**DO NOT CODE until operator authorizes.**  
**Spec:** [functional_specification_80.md](./functional_specification_80.md)  
**Maps:** [wayfinder/map-063.md](./wayfinder/map-063.md), [mobile-render-debug/map-071.md](./mobile-render-debug/map-071.md)  
**Context pack:** [aaa81/](./aaa81/)

This document tells the coding assistant **exactly what to change**. It is implementation guidance for RE handoff (unlike FS80, which is what-only).

---

## 0. Goals checklist (must all pass)

| ID | Observable |
|----|------------|
| O1 | Video end → menu (not game) |
| O2 | 5 playfield taps → menu |
| O3 | START during intro → menu |
| O4 | “Initiate Sequence” → interactive game |
| O5 | START during game → menu again |
| O6 | Menu+bg inside glass playfield |
| O7 | Crisp/pixelated background |
| O8 | No double-stacked menu |

---

## 1. Static assets

### 1.1 Background image

1. Copy the reference background (session Image #1 / `aaa81/menu-background-ref.jpg`) into the app static tree, e.g.:

   **`public/assets/boot/menu_background.jpg`**  
   (or `.png` if the source is kept as PNG; match actual file type).

2. Do **not** leave the only copy on the desktop outside the repo.

3. Public URL for the app: **`/assets/boot/menu_background.jpg`** (adjust extension to match).

### 1.2 Menu prototype

Source of truth for structure/CSS/JS behavior: **`/Users/diesel/Desktop/test.html`** (also copied as `aaa81/synthwave-navigator-test.html`). Port into the React app; do not iframe the desktop file in production.

---

## 2. Phase model (page-level)

### 2.1 Replace binary `bootComplete` with an explicit phase

**File:** `src/app/page.tsx` (and any small extracted module if preferred)

**Current:**

```ts
const [bootComplete, setBootComplete] = useState(false);
const onBootComplete = useCallback(() => setBootComplete(true), []);
if (!bootComplete) {
  return <BootIntro onComplete={onBootComplete} />;
}
// → interactive game
```

**Required behavior:**

Introduce a phase enum or equivalent string union, e.g.:

- `'intro'` — boot video showing  
- `'menu'` — main menu sequence showing  
- `'play'` — interactive game

Initial state: **`'intro'`**.

| Event | New phase |
|-------|-----------|
| BootIntro completes (video end / error / failsafe / 5-tap skip / START on intro) | `'menu'` |
| User activates **Initiate Sequence** | `'play'` |
| User presses shell **START** while phase is `'play'` | `'menu'` |
| User presses START while phase is already `'menu'` | stay `'menu'` (O8) |

**Render gate:**

- `phase === 'intro'` → render boot intro only (as today, full-viewport shell + video).  
- `phase === 'menu'` → render menu sequence (shell + bg + menu UI in glass).  
- `phase === 'play'` → existing interactive game tree (current post-boot return).

**Important:** Do **not** map “intro finished” directly to the game tree.

### 2.2 Session state on menu re-open (O5)

When returning `'play' → 'menu' → 'play'`:

- Prefer **keeping** React state for the session (mode, receipts, simulation) mounted or preserved so return-to-play does not force a full remount wipe, **if** practical.
- Acceptable v1 alternative: unmount game while menu is open **only if** state is lifted/preserved above the unmount boundary. Hard full reload of the page is **not** acceptable for START menu.

Recommended approach for RE implementer:

- Keep the game tree mounted but **inert/hidden** under the menu overlay when re-opening from play, **or**
- Lift phase above game and only hide pointer-events / visibility of the stage while menu is up.

Pick one approach; document the choice in a one-line comment near the phase state.

---

## 3. BootIntro changes

**File:** `src/components/BootIntro.tsx`

### 3.1 Completion still means “leave intro,” not “enter game”

Keep `onComplete()` as the single exit callback. Parent maps it to `phase = 'menu'`.

### 3.2 Wire START on the boot shell

**Current:** START is a non-interactive `<span className="gb-shell__btn-start">` under `aria-hidden` controls with `pointer-events: none` on `.boot-intro .gb-shell__controls`.

**Required:**

1. Make **START** a real control (`<button type="button">` preferred) with accessible name **"Start"** / **"Open menu"**.
2. On activate (click/pointer), call the same `finish()` path used by video end / 5-tap skip (so parent enters menu).
3. Enable pointer events **only** on START (and keep SELECT decorative unless product expands later).
4. CSS: allow hits on START without enabling the whole controls layer for accidental D-pad hits during intro:
   - e.g. keep `.boot-intro .gb-shell__controls { pointer-events: none; }` and set `.boot-intro .gb-shell__btn-start { pointer-events: auto; cursor: pointer; }`.
5. START must **not** increment the 5-tap skip counter as a side effect of being a separate control (optional: either independent of skip taps, or also allowed to finish immediately — **required product behavior is immediate menu**, so call `finish()` directly).

### 3.3 Unchanged

- `BOOT_SKIP_TAPS = 5`
- `BOOT_VIDEO_SRC`
- Failsafe timeout
- Playfield-only skip hit layer
- Muted / playsInline / no controls

---

## 4. New main menu component

### 4.1 Create component

**Suggested path:** `src/components/MainMenu.tsx` (name may vary; keep “main menu” clear).

**Props (minimum):**

- `onEnterPlay: () => void` — fired when **Initiate Sequence** is activated  
- Optional: `onRequestClose` not required for v1 if only Initiate Sequence leaves the menu  

### 4.2 Structure (port from test.html)

Inside the component (or children):

1. Full-bleed **background** `<img>` (or CSS `background-image`) using `/assets/boot/menu_background.jpg` (path from §1.1).
2. Nav panel matching prototype:
   - Scanline overlay (`pointer-events: none`)
   - Pointer graphic (SVG from test.html)
   - List of four buttons:
     1. Initiate Sequence (default `is-active` / `aria-selected="true"`)
     2. Starfield Config
     3. Warp Diagnostics
     4. Terminate Uplink
3. Port prototype JS behavior:
   - Click non-active item → set active, move pointer
   - Click already-active **Initiate Sequence** → still allowed to enter play (or require explicit activation: first click selects, second activates — **prefer single activation: if Initiate Sequence is active and clicked, enter play; if another item is active and user clicks Initiate Sequence, select it; if user presses Enter on active Initiate Sequence, enter play**).
   - **Clear rule for O4:** Activating Initiate Sequence (click when it becomes the chosen action, or Enter/Space on it) calls `onEnterPlay()`.
   - Keyboard ArrowUp/ArrowDown cycle focus; Enter/Space activate.
   - Pointer snap after fonts ready; resize re-snap.

### 4.3 Styling

**Options (pick one, prefer co-located module or dedicated CSS file):**

- `src/components/MainMenu.module.css`, or  
- Section in `src/app/gameboy-shell.css` under a `.main-menu` / `.boot-menu` namespace  

**Must include from prototype:**

- Design tokens (void, sun magenta, cyan, mountain purple, scanline)
- Press Start 2P (or project-equivalent pixel font already loaded — if not loaded globally, add the same Google font link used in test.html via `layout.tsx` or CSS `@import`, once)
- Unselected / active / hover / focus-visible styles
- Pointer transform + bounce keyframes
- `image-rendering: pixelated` on the background image
- `image-rendering: pixelated` (and font smoothing off) for the menu panel where prototype specifies it

### 4.4 Non-play items

Starfield Config / Warp Diagnostics / Terminate Uplink:

- Selectable (pointer moves, active styles)
- **Do not** call `onEnterPlay`
- No navigation away required for v1

---

## 5. Menu host chrome (intro-like shell)

### 5.1 Where menu mounts

When `phase === 'menu'`, render a host that reuses the **same full-viewport Game Boy shell pattern as BootIntro** (slot + scale + shell), with the **playfield** containing:

1. Background image (absolute, inset 0, object-fit cover, pixelated)
2. Menu UI centered (or prototype-aligned) **within the playfield**
3. Wired **START** button that no-ops if menu already open (O8)

**Do not** put the menu as the sole content of `document.body` without the GB shell.

### 5.2 Implementation options (allowed)

**A (preferred):** Extend host so BootIntro and MainMenu share a thin `GameBoyShellFrame` wrapper, **or**  
**B:** Duplicate the shell markup from `BootIntro` into a `MainMenuShell` host for v1 (acceptable if time-boxed; avoid drift by copying current boot shell structure).

Playfield classes can mirror:

- `.boot-intro__playfield` geometry rules in `gameboy-shell.css`, namespaced as `.main-menu__playfield` if separate.

### 5.3 Z-order inside playfield

1. Background (bottom)  
2. Menu panel + pointer  
3. Scanlines (pointer-events none)  
4. Optional transparent layers must not block menu clicks  

---

## 6. In-game START (page.tsx shell)

**File:** `src/app/page.tsx`  
**CSS:** `src/app/gameboy-shell.css`

### 6.1 Replace decorative START

**Current (~1559–1562):**

```tsx
<div className="gb-shell__btn-start-select" aria-hidden="true">
  <span className="gb-shell__btn-select">SELECT</span>
  <span className="gb-shell__btn-start">START</span>
</div>
```

**Required:**

1. Remove `aria-hidden="true"` from the start/select group **or** only keep SELECT decorative.
2. Change START to `<button type="button" className="gb-shell__btn-start" aria-label="Open menu" onClick={...}>`.
3. Handler sets phase to `'menu'` (if not already menu).
4. SELECT may remain a non-button span.

### 6.2 Pointer events

Ensure in-game START is clickable:

- Parent `.gb-shell__controls` / start-select row must allow pointer events on the START button.
- Confirm outside-click handlers (e.g. `closest('.gb-shell__controls')` already used for overlay close) do not swallow START incorrectly; START should open menu, not only block close.

### 6.3 shellPress START vs A/B

- Do **not** overload A/B for menu open.
- D-pad remains hotspot/carousel behavior during `'play'`.
- While `'menu'`, shell A/B/D-pad may be inactive or unused; menu keyboard/pointer owns navigation.

---

## 7. CSS pixel integrity (map-071)

**File:** `src/app/gameboy-shell.css` and/or menu CSS module

1. Background:

   ```css
   image-rendering: pixelated;
   image-rendering: crisp-edges; /* fallback chain as project already uses */
   object-fit: cover;
   object-position: center;
   ```

2. Playfield `overflow: hidden` so bg/menu do not spill onto plastic chrome.

3. Reuse boot intro shell scale rules so mobile/desktop parity matches FS79 framing.

4. Do **not** introduce `filter: blur()` on the background.

---

## 8. Font loading

If Press Start 2P is not already global:

**File:** `src/app/layout.tsx` (or existing font strategy)

- Load `Press Start 2P` once (next/font or link), apply to menu root class only (do not restyle entire game UI to that font).

---

## 9. Files to touch (expected set)

| File | Action |
|------|--------|
| `public/assets/boot/menu_background.jpg` (or png) | **Add** asset |
| `src/components/MainMenu.tsx` | **Create** menu UI + logic |
| `src/components/MainMenu.module.css` (or shell CSS section) | **Create** / extend styles |
| `src/components/BootIntro.tsx` | **Edit** — wire START → finish |
| `src/app/page.tsx` | **Edit** — phase machine; menu host; in-game START |
| `src/app/gameboy-shell.css` | **Edit** — menu playfield, START hit targets, boot START pe |
| `src/app/layout.tsx` | **Edit only if** font must be added |

Optional cleanup: extract shared `GameBoyShellFrame` — nice-to-have, not required for O1–O8.

---

## 10. Step-by-step implementation order

1. Install background asset under `public/assets/boot/`.  
2. Implement `MainMenu` in isolation (bg + prototype behavior + `onEnterPlay`).  
3. Add phase state in `page.tsx`; route intro complete → `'menu'`; Initiate Sequence → `'play'`.  
4. Host menu inside GB shell playfield for `'menu'`.  
5. Wire BootIntro START → `finish()`.  
6. Wire in-game START → `'menu'`.  
7. Verify O1–O8 manually (desktop + one mobile width).  
8. Ensure 5-tap skip still works and still lands on menu (not game).

---

## 11. Test plan (manual)

| Step | Action | Expect |
|------|--------|--------|
| 1 | Load app, wait for video end | Menu + synthwave bg in glass |
| 2 | Reload, tap playfield 5× | Menu (not game) |
| 3 | Reload, click START on intro | Menu immediately |
| 4 | Click Initiate Sequence | Bar game |
| 5 | In game, click START | Menu again |
| 6 | Click Initiate Sequence | Back to same game session (no hard reload) |
| 7 | On menu, click START again | Still one menu |
| 8 | Arrow keys + Enter on Initiate Sequence | Enter play |
| 9 | Resize / phone width | Menu stays in glass; bg crisp |

---

## 12. Out of scope for this RE

- Real settings/diagnostics screens  
- SELECT behavior  
- Changing skip count or boot video file  
- Receipt/jigger mobile work  
- Coding before authorize  

---

## 13. Handoff

When authorized: implement **only** this RE against FS80. Do not expand scope into FS77 carousel work unless START wiring collides (fix collisions minimally).

# RE81 — Required edits: menu glass size parity with boot + play

**DO NOT CODE until operator authorizes.**  
**Spec:** [functional_specification_81.md](./functional_specification_81.md)  
**Maps:** [wayfinder/map-064.md](./wayfinder/map-064.md), [mobile-render-debug/map-072.md](./mobile-render-debug/map-072.md)  
**Context:** [aaa82/](./aaa82/)  
**Prior implementation:** FS80 menu in `MainMenu.tsx` + `.main-menu` block in `gameboy-shell.css`

---

## 0. Goals (must pass)

| ID | Check |
|----|--------|
| O1 | Intro → menu: glass does not shrink |
| O2 | Menu → play: glass matches |
| O3 | Play → menu: glass matches boot/play |
| O4 | Menu bg full-bleed in glass |
| O5 | Menu phase stable size |

---

## 1. Root cause (do not re-diagnose)

FS80 added **forked** `.main-menu …` shell geometry that **differs** from FS79 `.boot-intro …`:

| | Boot | Menu (broken) |
|--|------|----------------|
| Outer scale | cover via `max(100cqw, calc(100cqh * 422/697))` | contain via `min(100%, calc(100dvh * 422/697))` |
| screen-cont | ~90% × **56%** | ~81% × **39%** |
| playfield | flex fill of screen-cont remainder | absolute smaller inset |

**Fix direction:** make menu shell/playfield geometry **identical** to boot; keep menu-only rules for **content inside** the playfield.

---

## 2. File: `src/app/gameboy-shell.css`

### 2.1 Unify shell geometry (required)

**Do one of the following (A preferred):**

#### Option A (recommended) — shared selectors

1. For every shell geometry rule currently under `.boot-intro …` that defines:
   - root fixed host (optional: keep separate z-index hosts)
   - `.gb-shell-slot` / slot
   - `.gb-shell-scale`
   - `.gb-shell` (aspect, cover size, translateY, radius, ::before/::after)
   - `.gb-shell__screen-cont`
   - `.gb-shell__header`, `__power`, and related chrome that affects glass layout
   - `.gb-shell__playfield` / playfield margins and flex fill
   - controls placement that is tied to the same shell proportions  

   **Rewrite selectors** to apply to **both** hosts, e.g.:

   ```css
   .boot-intro .gb-shell,
   .main-menu .gb-shell { /* same declarations */ }
   ```

2. **Delete** the divergent geometry block under FS80 that sets:
   - `.main-menu .gb-shell-scale { width: min(...); height: min(...); aspect-ratio... }`
   - `.main-menu .gb-shell__screen-cont { top: 8.6%; height: 39%; ... }`
   - `.main-menu .main-menu__playfield { top: 18%; left: 8%; ... }`
   - any other menu-only shell proportions that differ from boot

3. **Retain** menu-only rules that do **not** change glass size:
   - `.main-menu` fixed host (same as `.boot-intro` host pattern is fine if duplicated *identically*)
   - `.main-menu__bg` (object-fit cover, pixelated, absolute inset 0)
   - START no-op pointer-events on menu if needed

#### Option B — exact copy

If not sharing selectors: **replace** all `.main-menu` shell/slot/scale/screen/playfield/control geometry values with the **byte-for-byte equivalent** of the corresponding `.boot-intro` rules (only swapping the `.boot-intro` prefix for `.main-menu`). Do not invent new percentages.

### 2.2 Playfield content (menu)

After geometry parity:

1. `.main-menu__bg` must remain `position: absolute; inset: 0; width/height 100%; object-fit: cover; image-rendering: pixelated` (or crisp-edges fallback).  
2. Menu nav UI (module CSS) stays **inside** the playfield and must not create a second smaller “screen” that becomes the effective glass.  
3. Ensure playfield has `position: relative` (or equivalent stacking context) so absolute bg + menu fill the **boot-sized** playfield.

### 2.3 Do not shrink play to match broken menu

Never change gameplay `.gb-shell__playfield` / stage cover rules to match the old 39% menu hole. **Only enlarge menu to boot/play.**

---

## 3. File: `src/components/MainMenu.tsx`

### 3.1 DOM structure parity with BootIntro

Markup already mirrors BootIntro (slot → scale → shell → screen-cont → playfield). **Keep that hierarchy.**

Verify class names used for geometry match what shared CSS expects:

- `main-menu` root  
- `main-menu__slot gb-shell-slot`  
- `gb-shell-scale`  
- `gb-shell`  
- `gb-shell__screen-cont`  
- `gb-shell__playfield main-menu__playfield`  

If boot uses extra structural classes on playfield (`boot-intro__playfield`), either:

- add a shared playfield class used by both, or  
- ensure `.main-menu .gb-shell__playfield` is included in the **same** rule as `.boot-intro .gb-shell__playfield`.

### 3.2 No layout hacks in React

Do not set inline width/height on the shell to “fix” size. Fix is CSS geometry parity only (unless a single shared wrapper component is introduced — optional).

### 3.3 Optional refactor (not required for O1–O5)

Extract shared `GameBoyShellFrame` used by BootIntro + MainMenu — only if it reduces drift; not mandatory if CSS selector sharing is enough.

---

## 4. Files that should **not** need product changes

| File | Note |
|------|------|
| `page.tsx` phase machine | Keep intro/menu/play; no size logic |
| `BootIntro.tsx` | Do not regress video glass |
| `layout.tsx` font | Unrelated |
| Menu item logic | Unrelated |

Touch BootIntro only if extracting a shared shell component.

---

## 5. Implementation order

1. Open `gameboy-shell.css` boot block and menu block side by side.  
2. Apply Option A (shared selectors) or B (exact copy).  
3. Remove conflicting menu geometry.  
4. Confirm `.main-menu__bg` still full-bleed in playfield.  
5. Manual matrix below.  
6. Build.

---

## 6. Manual test matrix

| Step | Action | Expect |
|------|--------|--------|
| 1 | Load app; note boot glass size | Reference |
| 2 | Wait for menu (or 5-tap / START) | **Same** glass size as boot video |
| 3 | Initiate Sequence | Play glass matches; no resize jump |
| 4 | START → menu | Glass still same size |
| 5 | Resize window / narrow phone width | Menu and boot still share the same shell path |
| 6 | Menu bg | Fills entire glass |

---

## 7. Correct required outputs (implementation)

- Menu shell scale math **equals** boot shell scale math.  
- Menu `screen-cont` percentages **equal** boot `screen-cont`.  
- Menu playfield fill model **equals** boot playfield.  
- No remaining menu-only rule that sets a smaller LCD hole.

---

## 8. Out of scope

- FS80 feature redesign  
- Coding before authorize  
- LFS/deploy (separate step after implement)

---

## 9. Handoff

When authorized: implement **only** RE81 against FS81. Verify O1–O5. Then push GitHub/HF if operator requests deploy.

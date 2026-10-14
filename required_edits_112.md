# RE112 — Master Component-to-Edit Matrix: Mode Selection Screen Broken Background Asset Removal, Stub Option Elimination, and Maximum Shell-Bounded Asset Scaling

**Spec:** [functional_specification_112.md](./functional_specification_112.md)  
**Map:** [wayfinder/20261014T232800-112-menu/map.md](./wayfinder/20261014T232800-112-menu/map.md)  
**Tickets:**
- [Ticket 001: Mode Selection Screen Broken Background Asset Removal & Uniform Dark Playfield Backing](./wayfinder/20261014T232800-112-menu/tickets/ticket-001.md)
- [Ticket 002: Complete Removal of Legacy Stub Options & Exclusive Two-Row Navigation Cycle](./wayfinder/20261014T232800-112-menu/tickets/ticket-002.md)
- [Ticket 003: Maximum Shell-Bounded Scaling of Synthwave Navigator, Mode Logos, Join the Bar Control & Pointer Graphic](./wayfinder/20261014T232800-112-menu/tickets/ticket-003.md)
- [Ticket 004: FS112 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./wayfinder/20261014T232800-112-menu/tickets/ticket-004.md)

---

## 1. System Layer Component Ownership Register

| Lifecycle / Architectural Responsibility | Primary Component & File Path | Supporting Modules & Data Definitions | Key Functions, Hooks & Data Structures |
| :--- | :--- | :--- | :--- |
| **Mode Selection Menu Component & Navigation State** | `src/components/MainMenu.tsx` | `src/components/MainMenu.module.css` | `MENU_ITEMS` (2-row structure), `selectIndex`, `moveSelection`, `moveLogo`, `snapPointer`, `snapToCurrent` |
| **Synthwave Navigator & Asset Scaling Styles** | `src/components/MainMenu.module.css` | `src/app/gameboy-shell.css` | `.menuRoot` (`container-type: size`), `.synthwaveNav`, `.navList`, `.modeSelectionBlock`, `.modeSelectionTitle`, `.modeLogoRow`, `.modeLogoBtn`, `.modeLogoImg`, `.pointerGraphic` |
| **Console Playfield Glass Backing** | `src/app/gameboy-shell.css` | `src/components/MainMenu.tsx` | `.main-menu .gb-shell__playfield`, `.main-menu .main-menu__playfield` (`background: #000`), removal of `.main-menu__bg` |

---

## 2. Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/MainMenu.tsx` | L6, L324–L330 (`MENU_BG_SRC`, `<img className="main-menu__bg" />`) | `ticket-001.md` | Delete `MENU_BG_SRC` constant and remove `<img className="main-menu__bg" ... />` from `.main-menu__playfield` | Eliminates broken-image placeholder at `(0, 0)` and HTTP 404 requests for `/assets/boot/menu_background.jpg` (AC1). |
| `src/components/MainMenu.tsx` | L19–L24 (`MENU_ITEMS`) | `ticket-002.md` | Remove `diagnostics` (`"Warp Diagnostics"`) and `terminate` (`"Terminate Uplink"`) from `MENU_ITEMS`, leaving exclusively `mode-selection` and `join-bar` | Eliminates stub DOM nodes and locks `Up`/`Down` navigation to a strict 2-row cycle `0 ↔ 1` (AC2, AC3). |
| `src/components/MainMenu.tsx` | L424–L429 (`<img className={styles.modeLogoImg} />`) | `ticket-003.md` | Add `onLoad={() => snapToCurrent(true)}` to mode logo `<img>` elements | Ensures pointer graphic vertical center re-snaps accurately after enlarged logo images decode (AC5). |
| `src/components/MainMenu.module.css` | L3–L266 (`.menuRoot`, `.synthwaveNav`, `.navList`, `.modeSelectionBlock`, `.modeSelectionTitle`, `.modeLogoRow`, `.modeLogoBtn`, `.modeLogoImg`, `.pointerGraphic`) | `ticket-003.md` | Add `container-type: size` on `.menuRoot`; expand `.synthwaveNav` to `96% × 96%` of playfield glass; maximize mode logos side-by-side (`flex: 1 1 0`, `width: 100%`, `max-height: clamp(48px, 28cqh, 140px)`), `"Mode Selection"` header, `"Join the bar!"` button, and pointer graphic | Maximizes all remaining menu assets inside the Console Playfield Glass with zero wrapping, zero overlap, and zero clipping across all orientations (AC4, AC5). |
| `src/app/gameboy-shell.css` | L1095–L1111 (`.main-menu__bg`) | `ticket-001.md` | Remove obsolete `.main-menu__bg` CSS block | Removes dead background image rule while preserving `background: #000` on `.main-menu__playfield`. |

---

## 3. Detailed Component-by-Component Specifications

### 3.1 `src/components/MainMenu.tsx`
- **Governing Tickets:** `ticket-001.md`, `ticket-002.md`, `ticket-003.md`
- **Exact Transformations:**
  1. Remove `const MENU_BG_SRC = '/assets/boot/menu_background.jpg';`.
  2. Define `MENU_ITEMS` with exclusively two rows:
     ```typescript
     const MENU_ITEMS = [
       { id: 'mode-selection', label: 'Mode Selection', isModeSelection: true, opensJoinBar: false },
       { id: 'join-bar', label: 'Join the bar!', isModeSelection: false, opensJoinBar: true },
     ] as const;
     ```
  3. Remove `<img className="main-menu__bg" src={MENU_BG_SRC} alt="" draggable={false} aria-hidden />` from `.gb-shell__playfield.main-menu__playfield`.
  4. Add `onLoad={() => snapToCurrent(true)}` on `<img src={logo.src} ... className={styles.modeLogoImg} />`.

### 3.2 `src/components/MainMenu.module.css`
- **Governing Tickets:** `ticket-003.md`
- **Exact Transformations:**
  - `.menuRoot`: add `width: 100%; height: 100%; container-type: size; container-name: menu-playfield;`.
  - `.synthwaveNav`: expand to `width: 96%; height: 96%; max-width: 96%; max-height: 96%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; padding: clamp(12px, 6cqh, 28px) clamp(12px, 4cqw, 26px) clamp(12px, 6cqh, 28px) clamp(38px, 15.5cqw, 68px);`.
  - `.navList`: `flex: 1 1 auto; width: 100%; height: 100%; justify-content: space-evenly; gap: clamp(14px, 7cqh, 36px); padding: 6px 8px; box-sizing: border-box;`.
  - `.navList button`: `font-size: clamp(11px, min(4.9cqw, 5.4cqh), 26px); line-height: 1.4; padding: clamp(6px, 1.8cqh, 14px) 0; white-space: nowrap;`.
  - `.modeSelectionBlock`: `gap: clamp(10px, 5cqh, 24px);`.
  - `.modeSelectionTitle`: `font-size: clamp(10px, min(4.6cqw, 5cqh), 24px); line-height: 1.35; white-space: nowrap;`.
  - `.modeLogoRow`: `flex-wrap: nowrap; justify-content: space-between; gap: clamp(10px, 3.5cqw, 22px); padding: 6px 0;`.
  - `.modeLogoBtn`: `flex: 1 1 0; min-width: 0; max-width: calc(50% - clamp(5px, 1.75cqw, 11px)); display: flex; align-items: center; justify-content: center; padding: clamp(4px, 1cqw, 8px); box-sizing: border-box;`.
  - `.modeLogoImg`: `width: 100%; height: auto; max-width: 100%; max-height: clamp(48px, 28cqh, 140px);`.
  - `.pointerGraphic`: `left: clamp(6px, 2.5cqw, 16px);` and `.pointerGraphic svg`: `width: clamp(26px, 11.5cqw, 48px); height: clamp(26px, 11.5cqw, 48px);`.

### 3.3 `src/app/gameboy-shell.css`
- **Governing Tickets:** `ticket-001.md`
- **Exact Transformations:**
  - Remove `.main-menu__bg` rule block (L1095–L1111).

---
ticket_id: 004
title: "FS102 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol"
type: task
status: resolved
claimed_by: "wayfinder-test-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md"]
governing_specification: "functional_specification_102.md"
---

# Ticket 004: FS102 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol

## Question
What deterministic integration test decisions, authentic codebase schemas, admissible observed payloads, and specification oracles govern the verification of the modified component (`src/app/gameboy-shell.css`) and its integrating UI components (`src/components/MainMenu.tsx`, `src/components/MainMenu.module.css`, and `src/components/BootIntro.tsx`) to guarantee universal mode selection menu landscape containment ($W > H$), orientation and scale parity with the startup sequence, complete unclipped visibility of all menu content and console controls, and jitter-free dynamic resizing under `INV-PAYLOAD-01` and `INV-ASSERTION-01` without synthesizing test fixtures or writing executable test code?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_102.md`
  - §Purpose: "eliminate the visual breakdown occurring when the mode selection menu is viewed in landscape mode (window width > window height), ensuring that the console frame scales proportionally to fit within viewport boundaries on both axes, guaranteeing 100% visibility of the mode selection header, logos, menu options, and console controls."
  - §Observed Errors: In landscape viewports, the console over-expands horizontally to fill window width, blowing proportional height far past screen height, pushing top casing, screen bezel, battery indicator, "MODE SELECTION" header, Obelisco and Classics logos, "JOIN THE BAR!", and "WARP DIAGNOSTICS" off-screen.
  - §Desired Functionality:
    1. Parity with Startup Sequence: Mirror dynamic scaling and containment behavior of the startup sequence across all orientations and dimensions.
    2. Strict Landscape Containment: In landscape ($W > H$), constrain scale to height; entire console housing fits 100% inside window without clipping.
    3. Complete Menu Visibility in Landscape: Entire menu overlay (header, logos, options) fully visible and centered inside screen glass.
    4. Smooth Resizing Responsiveness: Dynamic resizing between portrait and landscape smoothly scales console, preserving universal containment and alignment.
  - §Edge Cases:
    1. Ultra-Wide Landscape Displays (21:9 or 32:9): Strict height constraint to viewport, centered horizontally with clean letterboxing.
    2. Transition from Startup to Menu in Landscape: Seamless transition without sudden scale jumps, shifts, or background flashes.
    3. Window Resizing During Navigation: Preserves active option focus and layout integrity without repositioning menu box.
  - §Acceptance Criteria:
    - AC1: Landscape Viewport Containment.
    - AC2: Full Menu Visibility in Landscape.
    - AC3: Console Housing Integrity.
    - AC4: Dynamic Resize Parity.
- **Upstream Manifest Context:**
  - `handoff/20261009T164539-008-wzck/wayfinder-read-and-plan.txt`
  - `handoff/20261009T164539-008-wzck/implementer.txt` (`src/app/gameboy-shell.css`)
  - `handoff/20261009T164539-008-wzck/reviewer.txt` (`src/app/gameboy-shell.css`)
- **Predecessor Decision Tickets:**
  - [Ticket 001: Mode Selection Menu Console Viewport Containment & Aspect-Ratio Sizing](./ticket-001.md)
  - [Ticket 002: Mode Selection Shell Slot Framing, Alignment & Letterbox Parity](./ticket-002.md)
  - [Ticket 003: Mode Selection Playfield Centering & Dynamic Resize Pointer Synchronization](./ticket-003.md)
- **Implemented Baseline (`src/app/gameboy-shell.css`):**
  - Lines 840–859: `.boot-intro .gb-shell-slot` and `.main-menu .gb-shell-slot` unified with `width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; container-type: size; container-name: gb-shell-slot; overflow: hidden; background: #111; z-index: 1;`.
  - Lines 873–892: `.boot-intro .gb-shell` and `.main-menu .gb-shell` unified with `aspect-ratio: 422 / 697; width: min(100cqw, calc(100cqh * 422 / 697)); height: min(100cqh, calc(100cqw * 697 / 422)); max-width: 100%; max-height: 100%; background: #eee; border-radius: 2.37% 2.37% 8.61% 2.37%; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45); container-type: size; container-name: gb-shell; overflow: hidden; transform: none;`.
  - Lines 894–903: `@supports not (width: 1cqw)` unified fallback with `width: min(100vw, calc(100dvh * 422 / 697)); height: min(100dvh, calc(100vw * 697 / 422)); max-width: 100%; max-height: 100%; aspect-ratio: 422 / 697;`.

## Architectural Decisions to Lock

### 1. Ground-Truth Codebase Interface & Schema Definition (Zero Mocks)
The integration test interfaces for verifying the modified CSS layout and integrating React components are grounded strictly in authentic TypeScript types, DOM APIs, and CSS Container Query specifications without synthetic wrappers:

#### A. Console Geometry & Viewport Context (`src/app/gameboy-shell.css`)
- **Input Interfaces:**
  - Viewport Dimensions: `{ width: number; height: number; dpr?: number }` (standard Playwright viewport configuration and `window.innerWidth` / `window.innerHeight`).
- **Output Interfaces:**
  - `HTMLDivElement` (`.main-menu .gb-shell` and `.boot-intro .gb-shell`):
    - `getBoundingClientRect()`: `{ left: number; top: number; right: number; bottom: number; width: number; height: number; }`.
    - Computed CSS properties (`getComputedStyle`):
      - `aspectRatio`: `'422 / 697'`.
      - `maxWidth`: `'100%'`.
      - `maxHeight`: `'100%'`.
      - `transform`: `'none'`.
      - `overflow`: `'hidden'`.
      - `boxShadow`: `'rgba(0, 0, 0, 0.45) 0px 4px 24px 0px'`.
  - `HTMLDivElement` (`.main-menu .gb-shell-slot`):
    - Computed CSS properties:
      - `position`: `'absolute'`.
      - `width`: `'100%'` (resolving to slot parent width).
      - `height`: `'100%'` (resolving to slot parent height).
      - `backgroundColor`: `'rgb(17, 17, 17)'` (`#111`).
      - `display`: `'flex'`.
      - `alignItems`: `'center'`.
      - `justifyContent`: `'center'`.

#### B. Menu Overlay & Screen Glass Playfield (`src/components/MainMenu.tsx`, `src/components/MainMenu.module.css`)
- **Input Interfaces:**
  - `MainMenuProps`:
    ```typescript
    export type MenuPlayMode = 'OBELISCO' | 'CLASSICS';

    type MainMenuProps = {
      onEnterPlay: () => void;
      onSelectModeAndPlay: (mode: MenuPlayMode) => void;
      onOpenJoinBar: () => void;
      joinOverlay?: React.ReactNode;
      onShellBack?: () => boolean;
      onShellDpad?: (dir: 'up' | 'down' | 'left' | 'right') => boolean;
      onShellA?: () => boolean;
    };
    ```
  - Keyboard Navigation Events: `KeyboardEvent` (`ArrowDown`, `ArrowUp`, `ArrowLeft`, `ArrowRight`, `Enter`, ` `).
  - Shell Hardware Controls: Pointer clicks on `.gb-shell__dpad--up`, `.gb-shell__dpad--down`, `.gb-shell__dpad--left`, `.gb-shell__dpad--right`, `.gb-shell__btn-a`, `.gb-shell__btn-b`, `.gb-shell__btn-start`.
- **Output Interfaces:**
  - Playfield Screen Glass (`.gb-shell__playfield.main-menu__playfield`):
    - `getBoundingClientRect()`: `{ left, top, right, bottom, width, height }`.
  - Menu Container (`nav.synthwaveNav`):
    - `getBoundingClientRect()`: strictly bounded within playfield rect.
  - Interactive Target Nodes:
    - Title: `.modeSelectionTitle` ("Mode Selection").
    - Mode Logo Buttons: `button.modeLogoBtn[aria-label="OBELISCO"]`, `button.modeLogoBtn[aria-label="CLASSICS"]`.
    - Menu Row Buttons: `button[role="menuitem"]` ("Mode Selection", "Join the bar!", "Warp Diagnostics", "Terminate Uplink").
    - Pointer Indicator: `.pointerGraphic` with CSS custom property `--target-y` (measured in `px`).

---

### 2. Admissible Observed Payloads (Payload Law `INV-PAYLOAD-01`)
Under `INV-PAYLOAD-01`, no dummy objects, synthetic JSON mocks, or invented viewport values are permitted. All payloads are observed real-world device viewports and authentic user navigation event streams:

| Payload ID | Target Component | Observed Input Context | Admissible Source / Grounding |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-VP-01` | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | Viewport `{ width: 844, height: 390 }` (Landscape Mobile: iPhone 12/13/14 landscape) | Standard mobile landscape viewport ($W > H$) |
| `PAYLOAD-VP-02` | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | Viewport `{ width: 926, height: 428 }` (Landscape Mobile: iPhone Pro Max landscape) | Large mobile landscape viewport ($W > H$) |
| `PAYLOAD-VP-03` | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | Viewport `{ width: 1440, height: 900 }` (Landscape Desktop: 16:10 standard laptop) | Standard laptop widescreen viewport |
| `PAYLOAD-VP-04` | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | Viewport `{ width: 1920, height: 1080 }` (Landscape Desktop: 16:9 1080p monitor) | Canonical desktop monitor viewport |
| `PAYLOAD-VP-05` | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | Viewport `{ width: 2560, height: 1080 }` (Landscape Desktop: 21:9 ultra-wide, Edge Case 1) | Ultra-wide desktop viewport |
| `PAYLOAD-VP-06` | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | Viewport `{ width: 3440, height: 1440 }` (Landscape Desktop: 21:9 WQHD monitor) | Ultra-wide high-res viewport |
| `PAYLOAD-VP-07` | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | Viewport `{ width: 390, height: 844 }` (Portrait Mobile: iPhone portrait baseline) | Mobile portrait orientation parity |
| `PAYLOAD-VP-08` | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | Viewport `{ width: 768, height: 1024 }` (Portrait Tablet: iPad portrait baseline) | Tablet portrait orientation parity |
| `PAYLOAD-NAV-01` | `src/components/MainMenu.tsx` | Navigation sequence: `ArrowDown -> ArrowDown -> ArrowUp` | Menu navigation across rows |
| `PAYLOAD-NAV-02` | `src/components/MainMenu.tsx` | Mode logo toggle: `ArrowRight -> ArrowLeft` on row 0 | Mode toggle between OBELISCO and CLASSICS |
| `PAYLOAD-RESIZE-01` | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | Viewport resizing: `390x844 -> 844x390 -> 1920x1080 -> 390x844` | Dynamic orientation rotation / window resize |
| `PAYLOAD-RESIZE-02` | `src/components/MainMenu.tsx` | Dynamic resize while focused on `item 2` ("Warp Diagnostics") | Edge Case 3 navigation resize |
| `PAYLOAD-TRANS-01` | `src/app/page.tsx`<br>`src/app/gameboy-shell.css` | Sequence transition: `phase: 'intro' -> 'menu'` at `1920x1080` | Edge Case 2 boot-to-menu transition parity |

---

### 3. Specification Oracles (`INV-ASSERTION-01`)
Assertions test strictly against `{correct required outputs}` mandated by `functional_specification_102.md` and locked ticket resolutions:

- **Oracle 1 (Landscape Viewport Containment - AC1):**
  For each landscape viewport (`PAYLOAD-VP-01` through `PAYLOAD-VP-06`):
  - `shellRect.left >= slotRect.left - 0.5`
  - `shellRect.right <= slotRect.right + 0.5`
  - `shellRect.top >= slotRect.top - 0.5`
  - `shellRect.bottom <= slotRect.bottom + 0.5`
  - `shellRect.height <= slotRect.height + 0.5`
  - Computed style: `getComputedStyle(shell).transform === 'none'`.
  - Geometric aspect ratio: `Math.abs(shellRect.height / shellRect.width - 697 / 422) < 0.02`.
- **Oracle 2 (Full Menu Content Visibility in Landscape - AC2):**
  In landscape viewports (`PAYLOAD-VP-01` through `PAYLOAD-VP-06`):
  - Playfield rect completely contains menu header and all interactive items:
    - `menuTitleRect.top >= playfieldRect.top`
    - `menuTitleRect.bottom <= playfieldRect.bottom`
    - `obeliscoBtnRect.top >= playfieldRect.top && obeliscoBtnRect.bottom <= playfieldRect.bottom`
    - `classicsBtnRect.top >= playfieldRect.top && classicsBtnRect.bottom <= playfieldRect.bottom`
    - `joinBarBtnRect.top >= playfieldRect.top && joinBarBtnRect.bottom <= playfieldRect.bottom`
    - `diagnosticsBtnRect.top >= playfieldRect.top && diagnosticsBtnRect.bottom <= playfieldRect.bottom`
    - `terminateBtnRect.top >= playfieldRect.top && terminateBtnRect.bottom <= playfieldRect.bottom`
  - Zero text clipping, zero negative margin offsets, and zero horizontal overflow.
- **Oracle 3 (Console Housing Chrome Integrity - AC3):**
  In landscape viewports:
  - Battery LED indicator (`.gb-shell__power`) is fully visible: `powerRect.top >= slotRect.top`.
  - Top casing groove (`.gb-shell::before`) is fully visible within viewport.
  - D-pad controls (`.gb-shell__btn-direction`), action buttons (`.gb-shell__btn-ab`), and START/SELECT buttons (`.gb-shell__btn-start-select`) are completely within viewport boundaries:
    - `controlsRect.bottom <= slotRect.bottom + 0.5`.
  - Depth elevation box shadow is active: `boxShadow.includes('rgba(0, 0, 0, 0.45)')`.
- **Oracle 4 (Dynamic Resize & Orientation Parity - AC4):**
  - Under `PAYLOAD-RESIZE-01`, transitioning from portrait to landscape to desktop continuously maintains:
    - Zero boundary overflow (`shellRect.top >= 0 && shellRect.bottom <= window.innerHeight`).
    - Shell remains centered: `Math.abs((slotRect.width - shellRect.width) / 2 - (shellRect.left - slotRect.left)) <= 1.0`.
  - Pointer dynamic recalibration:
    - Upon resize, `snapToCurrent(true)` executes synchronously.
    - `--target-y` matches `targetRect.top - containerRect.top + targetRect.height / 2 - pointerHeight / 2` within `0.5px`.
- **Oracle 5 (Ultra-Wide Letterboxing - Edge Case 1):**
  For `PAYLOAD-VP-05` (`2560x1080`):
  - Console height is constrained to `1080px` (`height <= 1080px`).
  - Console width is constrained to `1080 * 422 / 697 ≈ 653.6px`.
  - Left letterbox margin is `(2560 - 653.6) / 2 ≈ 953px`.
  - `.main-menu .gb-shell-slot` background color is `#111` (`rgb(17, 17, 17)`).
- **Oracle 6 (Startup to Menu Seamless Transition - Edge Case 2):**
  Under `PAYLOAD-TRANS-01` in landscape:
  - Bounding rect of `.boot-intro .gb-shell` immediately prior to completion equals bounding rect of `.main-menu .gb-shell` immediately following completion:
    - `|introRect.width - menuRect.width| < 1.0px`
    - `|introRect.height - menuRect.height| < 1.0px`
    - `|introRect.left - menuRect.left| < 1.0px`
    - `|introRect.top - menuRect.top| < 1.0px`
  - Background color of slot remains constant `#111` (`rgb(17, 17, 17)`), with 0 visual flash.
- **Oracle 7 (Navigation Resize Stability - Edge Case 3):**
  Under `PAYLOAD-RESIZE-02`:
  - Active focused index (`activeIndex === 2`, "Warp Diagnostics") remains focused.
  - Active button remains focused in DOM (`document.activeElement`).
  - `--target-y` updates cleanly to the active button's new geometry.

---

### 4. Explicit Error States (`{errors}` per `LANGUAGE.md`)
The integration test suite must immediately surface fatal errors if any of the following states occur:
- Any bounding edge of `.main-menu .gb-shell` falls outside the visible viewport (`left < 0`, `top < 0`, `right > slot.width`, `bottom > slot.height`).
- Height blowing up to 3000px+ in landscape mode due to `max(...)` cover sizing.
- Non-zero transform on `.main-menu .gb-shell` (e.g. `transform: translateY(-4%)`).
- "MODE SELECTION" header, Obelisco/Classics logos, "JOIN THE BAR!", or "WARP DIAGNOSTICS" pushed outside playfield glass or clipped.
- D-pad, A/B buttons, or START/SELECT controls pushed below bottom edge of screen.
- Shell slot background diverging from `#111` (e.g. flashing `#eee`), creating backdrop flashing during boot-to-menu transition.
- Pointer `--target-y` drifting or pointing to wrong row after window resize.
- Layout distorting away from canonical $422 / 697$ aspect ratio.

## Scope & Invariant Guardrails
- **In Scope:** Test decision mapping, authentic schema definitions, payload admissibility audit, specification oracles, and explicit error states for `src/app/gameboy-shell.css` and integrating menu components.
- **Out of Scope:** Writing executable test code, creating test runners, synthesizing dummy payloads, or modifying application logic (`INV-BOUNDARY-01`).

---

## Resolution

### 1. Locked Integration Test Decision Contract
1. Integration verification of `src/app/gameboy-shell.css`, `src/components/MainMenu.tsx`, and `src/components/BootIntro.tsx` operates in authentic browser environments (Playwright) evaluating real DOM bounding client rects, computed CSS styles, and keyboard/pointer interactions with zero synthetic mock data.
2. The 13 discrete payloads defined in `PAYLOAD-VP-01` through `PAYLOAD-TRANS-01` establish the complete input domain for FS102 verification.
3. Proportional containment, playfield menu visibility, housing chrome integrity, orientation parity, ultra-wide letterboxing, and boot-to-menu transition parity are rigorously bound to specification oracles AC1 through AC4 and Edge Cases 1 through 3.

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-test-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks Master Integration Test Matrix (`test_matrix_102.md`) and downstream test authoring upon operator authorization.

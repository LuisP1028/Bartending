# Master Integration Test Matrix: FS102 Mode Selection Menu Landscape Containment & Orientation Parity

**Governing Specification:** `functional_specification_102.md`  
**Wayfinder Map:** `wayfinder/20261009T164539-008-wzck/map.md`  
**Governing Tickets:**
- [Ticket 001: Mode Selection Menu Console Viewport Containment & Aspect-Ratio Sizing](./tickets/ticket-001.md)
- [Ticket 002: Mode Selection Shell Slot Framing, Alignment & Letterbox Parity](./tickets/ticket-002.md)
- [Ticket 003: Mode Selection Playfield Centering & Dynamic Resize Pointer Synchronization](./tickets/ticket-003.md)
- [Ticket 004: FS102 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./tickets/ticket-004.md)

---

## 1. Upstream Manifest Binding & Audit Summary

- **Modified Source Components:**
  - `src/app/gameboy-shell.css` (certified modified under `ticket-001.md`, `ticket-002.md`, and `ticket-003.md`).
- **Integrating Source Components:**
  - `src/components/MainMenu.tsx` (verified integrated under `ticket-003.md` and `ticket-004.md`).
  - `src/components/MainMenu.module.css` (verified integrated under `ticket-003.md` and `ticket-004.md`).
  - `src/components/BootIntro.tsx` (orientation parity baseline under `ticket-002.md` and `ticket-004.md`).
  - `src/app/page.tsx` (sequence state transition `phase === 'intro'` to `phase === 'menu'`).
- **Upstream Manifest Validation:**
  - Upstream manifests `handoff/20261009T164539-008-wzck/wayfinder-read-and-plan.txt`, `handoff/20261009T164539-008-wzck/implementer.txt`, and `handoff/20261009T164539-008-wzck/reviewer.txt` ingested with 100% path and content parity.
- **Zero-Mock Verification Certification:**
  - In strict compliance with `INV-PAYLOAD-01` and `INV-ASSERTION-01`, zero synthetic fixtures, mock APIs, simulated layout data, or placeholder objects are permitted.
  - All test definitions are grounded directly in authentic codebase types, DOM interfaces, CSS container query properties, and observed real-world device viewports.

---

## 2. Master Integration Test Matrix

| Test Case ID | Target Component | Acceptance Criterion | Authentic Codebase Schema / Interface | Admissible Observed Input Payload (`INV-PAYLOAD-01`) | `{correct required outputs}` (`INV-ASSERTION-01`) | Explicit `{errors}` (`LANGUAGE.md`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-MENU-01** | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | **AC1** (Landscape Containment - Mobile) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `844 x 390` (aspect ~2.16:1, $W > H$) | `shellRect` height fits within `390px` (`height <= 390.5px`); width scaled proportionally to `390 * 422 / 697 ≈ 236px`; centered horizontally (`left ≈ (844 - 236) / 2`); `transform === 'none'`; zero clipping on any edge | Shell height exceeds `390px`; vertical clipping (`top < 0` or `bottom > 390`); `transform: translateY(-4%)`; aspect ratio distortion |
| **IT-MENU-02** | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | **AC1** (Landscape Containment - Desktop 16:9) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `1920 x 1080` (standard 1080p, $W > H$) | `shellRect` height fits within `1080px` (`height <= 1080.5px`); width scaled proportionally to `1080 * 422 / 697 ≈ 653.6px`; centered in viewport (`left ≈ 633px`); backdrop `#111` fills margins; zero clipping | Shell height blows up to `1920 * 697 / 422 = 3170px`; console overflow; header or controls pushed offscreen |
| **IT-MENU-03** | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | **AC1** (Landscape Containment - Desktop 16:10) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `1440 x 900` (MacBook widescreen, $W > H$) | `shellRect` height fits within `900px` (`height <= 900.5px`); width is `900 * 422 / 697 ≈ 544.9px`; centered horizontally; all casing borders fully inside viewport | Shell height exceeds `900px`; top casing clipped off top of window |
| **IT-MENU-04** | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | **AC1**, **Edge Case 1** (Ultra-Wide Desktop) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `2560 x 1080` (aspect 21:9 ultra-wide) | Console strictly constrains height to `1080px`; width is `653.6px`; centered with horizontal letterbox/pillarbox margins (`left ≈ 953px`); `.gb-shell-slot` background is `#111` | Extreme horizontal stretching; shell scales past viewport height; background flashes `#eee` |
| **IT-MENU-05** | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | **AC1**, **AC4** (Orientation Parity - Mobile Portrait) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `390 x 844` (portrait, $H > W$) | Shell width constrained to `390px`; height is `390 * 697 / 422 ≈ 644px`; centered vertically; all casing controls visible; containment parity maintained | Shell width exceeds `390px`; horizontal scrollbar generated; controls clipped |
| **IT-MENU-06** | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | **AC1**, **AC4** (Orientation Parity - Tablet Portrait) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `768 x 1024` (tablet 3:4 portrait) | Shell width constrained to `768px`; height is `768 * 697 / 422 ≈ 1268px` bounded by slot height `1024px` -> width scales to `1024 * 422 / 697 ≈ 619.9px`; centered on both axes | Console overflows vertical or horizontal bounds of tablet viewport |
| **IT-MENU-07** | `src/components/MainMenu.tsx`<br>`src/app/gameboy-shell.css` | **AC2** (Full Menu Content Visibility in Landscape) | `DOMRect`<br>`HTMLHeadingElement`<br>`HTMLButtonElement` | Landscape viewports (`844x390`, `1920x1080`) | Bounding client rects of `.modeSelectionTitle` ("Mode Selection"), `.modeLogoRow`, and all menu options ("Join the bar!", "Warp Diagnostics", "Terminate Uplink") fit 100% inside `.gb-shell__playfield`; zero edge clipping | Any menu text, button, or label pushed outside playfield glass; menu truncated to only "Terminate Uplink" |
| **IT-MENU-08** | `src/components/MainMenu.tsx`<br>`src/components/MainMenu.module.css` | **AC2** (Dual Mode Logo Containment & Centering) | `DOMRect`<br>`HTMLImageElement` | Landscape viewports (`844x390`, `1920x1080`) | Obelisco and Classics mode logo buttons and images (`.modeLogoImg`) are fully visible, unclipped, and centered within `.modeLogoRow` inside playfield glass | Mode logo images clipped, wrapped offscreen, or overlapping menu options |
| **IT-MENU-09** | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | **AC3** (Console Housing Chrome Integrity) | `DOMRect`<br>`CSSStyleDeclaration` | Landscape viewports (`844x390`, `1920x1080`, `2560x1080`) | Top housing groove (`.gb-shell::before`), battery LED (`.gb-shell__power`), screen bezel (`.gb-shell__header`), D-pad (`.gb-shell__btn-direction`), action buttons (`.gb-shell__btn-ab`), and SELECT/START controls are 100% visible inside viewport; `box-shadow` active | Top bezel or battery LED pushed off top edge; controls pushed off bottom edge; missing depth shadow |
| **IT-MENU-10** | `src/app/gameboy-shell.css`<br>`src/components/MainMenu.tsx` | **AC4** (Dynamic Resize Responsiveness) | `window.onresize`<br>`CSSStyleDeclaration` | Resizing from `390x844` to `844x390` and vice-versa in continuous increments | Console scales dynamically without layout breaking; `snapToCurrent(true)` executes synchronously; `--target-y` updates to match active row without coordinate drift | Jitter, coordinate lag, pointer misalignment, or transient layout blowup during resize |
| **IT-MENU-11** | `src/app/page.tsx`<br>`src/app/gameboy-shell.css` | **AC1**, **AC4**, **Edge Case 2** (Boot-to-Menu Transition Parity) | `DOMRect`<br>`CSSStyleDeclaration` | Boot sequence finishes in landscape mode (`1920x1080` and `844x390`), transitioning `phase: 'intro' -> 'menu'` | Bounding rect of `.boot-intro .gb-shell` matches `.main-menu .gb-shell` (`Δx = 0`, `Δy = 0`, `Δwidth = 0`, `Δheight = 0`); `.gb-shell-slot` background stays `#111` without color flash | Scale jump, coordinate shift, or background flashing from `#111` to `#eee` |
| **IT-MENU-12** | `src/components/MainMenu.tsx` | **AC4**, **Edge Case 3** (Resize During Navigation) | `KeyboardEvent`<br>`DOMRect` | Navigate to row 2 ("Warp Diagnostics") via `ArrowDown`, then resize viewport from `1920x1080` to `844x390` | Active option focus (`activeIndex === 2`) is preserved; `--target-y` instantly recalibrates to row 2 button center in new scaled geometry | Focus lost, active index reset to 0, or pointer indicator points to wrong element |
| **IT-MENU-13** | `src/app/gameboy-shell.css` | **AC1** (Non-Container Query Browser Fallback Parity) | `@supports not (width: 1cqw)`<br>`CSSStyleDeclaration` | User agent without CSS container queries in landscape viewport | `@supports not (width: 1cqw)` rule applies `width: min(100vw, calc(100dvh * 422 / 697)); height: min(100dvh, calc(100vw * 697 / 422)); max-width: 100%; max-height: 100%; aspect-ratio: 422 / 697;`; console contained | Console falls back to unconstrained size or overflows viewport |

---

## 3. Ground-Truth Schema & Interface Definitions

### 3.1 Game Boy Shell & Slot Computed Layout Schema
```typescript
interface GameBoyShellComputedGeometry {
  /** Aspect ratio must be locked to 422 / 697 */
  aspectRatio: '422 / 697';
  /** Width strictly evaluated against min(100cqw, calc(100cqh * 422 / 697)) */
  width: string;
  /** Height strictly evaluated against min(100cqh, calc(100cqw * 697 / 422)) */
  height: string;
  maxWidth: '100%';
  maxHeight: '100%';
  /** Transform must be none (zero translateY offsets) */
  transform: 'none';
  overflow: 'hidden';
  boxShadow: string; // contains 'rgba(0, 0, 0, 0.45) 0px 4px 24px 0px'
}

interface GameBoyShellSlotComputedGeometry {
  position: 'absolute';
  inset: '0px';
  width: string; // 100% of parent viewport
  height: string; // 100% of parent viewport
  display: 'flex';
  alignItems: 'center';
  justifyContent: 'center';
  overflow: 'hidden';
  backgroundColor: 'rgb(17, 17, 17)'; // #111 dark backdrop letterboxing
}
```

### 3.2 Main Menu Component Props & Event Schema
```typescript
export type MenuPlayMode = 'OBELISCO' | 'CLASSICS';

export interface MainMenuProps {
  onEnterPlay: () => void;
  onSelectModeAndPlay: (mode: MenuPlayMode) => void;
  onOpenJoinBar: () => void;
  joinOverlay?: React.ReactNode;
  onShellBack?: () => boolean;
  onShellDpad?: (dir: 'up' | 'down' | 'left' | 'right') => boolean;
  onShellA?: () => boolean;
}

export interface MenuItemDefinition {
  id: string;
  label: string;
  isModeSelection: boolean;
  opensJoinBar: boolean;
}

export interface PointerCalibrationMetrics {
  targetTop: number;
  containerTop: number;
  targetHeight: number;
  pointerHeight: number;
  expectedTargetY: number; // targetTop - containerTop + targetHeight / 2 - pointerHeight / 2
}
```

---

## 4. Verification Protocol & Execution Laws

### 4.1 Strict Adherence to Payload Law (`INV-PAYLOAD-01`)
- Every integration test input must be an authentic browser viewport specification or authentic user input event (`KeyboardEvent`, `PointerEvent`, window `resize`).
- Synthetic JSON fixtures, mock dimensions, and invented fields are strictly forbidden and classified as `{insufficient}`.

### 4.2 Strict Adherence to Assertion Law (`INV-ASSERTION-01`)
- All assertions test `{correct required outputs}` mandated directly by `functional_specification_102.md` and locked tickets `ticket-001.md` through `ticket-004.md`.
- No assertions may test against arbitrary handwritten expected values not grounded in the specification.

### 4.3 Documentation Sufficiency Certification
- Every asserted property is an authentic CSS or DOM property present in `src/app/gameboy-shell.css` or `src/components/MainMenu.tsx`.
- The documentation leaves zero ambiguity for the downstream test-authoring node.
- Status is formally certified as `{sufficient}`.

# Master Integration Test Matrix: FS100 Core UX and Stage Stability

**Governing Specification:** `functional_specification_100.md`  
**Wayfinder Map:** `wayfinder/20261009T161951-920-ko9n/map.md`  
**Governing Tickets:**
- [Ticket 001: Boot Console Viewport Containment & Proportional Sizing](./tickets/ticket-001.md)
- [Ticket 002: Boot Video Legibility & Playfield Media Containment](./tickets/ticket-002.md)
- [Ticket 003: Patron Motion Lifecycle & Deterministic Walk Termination](./tickets/ticket-003.md)
- [Ticket 004: Patron Seated State Persistence & Asset Switching](./tickets/ticket-004.md)
- [Ticket 005: In-Place Drawer & Carousel Presentation (Zero Stage Translation)](./tickets/ticket-005.md)
- [Ticket 006: Fixed HUD, Status Element & Receipt Alignment](./tickets/ticket-006.md)
- [Ticket 007: FS100 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./tickets/ticket-007.md)

---

## 1. Upstream Manifest Binding & Audit Summary

- **Modified Source Components:**
  1. `src/app/gameboy-shell.css` (certified modified under `ticket-001.md`, `ticket-002.md`, and `ticket-005.md`).
  2. `src/components/PatronLayer.tsx` (certified modified under `ticket-003.md` and `ticket-004.md`).
  3. `src/app/page.tsx` (certified modified under `ticket-005.md` and `ticket-006.md`).
- **Upstream Manifest Validation:**
  - Upstream manifests `handoff/20261009T161951-920-ko9n/wayfinder-read-and-plan.txt`, `handoff/20261009T161951-920-ko9n/implementer.txt`, and `handoff/20261009T161951-920-ko9n/reviewer.txt` ingested with 100% path and content parity.
- **Zero-Mock Verification Certification:**
  In strict accordance with `INV-PAYLOAD-01` and `INV-ASSERTION-01`, zero synthetic fixtures, mock APIs, simulated data stubs, or placeholder objects are used. All test definitions are grounded directly in authentic codebase types, DOM interfaces, CSS container properties, and observed real-world device viewports.

---

## 2. Master Integration Test Matrix

| Test Case ID | Target Component | Acceptance Criterion | Authentic Codebase Schema / Interface | Admissible Observed Input Payload (`INV-PAYLOAD-01`) | `{correct required outputs}` (`INV-ASSERTION-01`) | Explicit `{errors}` (`LANGUAGE.md`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-BOOT-01** | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | **AC1** (Containment - Mobile Portrait) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `375 x 667` (aspect 9:16) | `shellRect` fully contained in `slotRect` (`left >= 0`, `right <= 375`, `top >= 0`, `bottom <= 667`); `transform: none`; aspect ratio `422 / 697` maintained within 1% | Bounding edge clipped (`top < 0` or `bottom > 667`); horizontal overflow; `transform !== 'none'` |
| **IT-BOOT-02** | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | **AC1** (Containment - Mobile Tall/Narrow) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `390 x 844` (aspect 9:19.5, Edge Case 1) | `shellRect` fully contained in `slotRect`; all casing controls (D-pad, action buttons, START/SELECT) visible and within viewport bounds | Controls cut off at top or bottom; housing clipped |
| **IT-BOOT-03** | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | **AC1** (Containment - Mobile Landscape) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `844 x 390` (landscape) | Console height fits within `390px` with proportional width scaling; centered horizontally; zero vertical cropping | Vertical height exceeds `390px`; branding header or D-pad pushed offscreen |
| **IT-BOOT-04** | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | **AC1** (Containment - Tablet Portrait) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `768 x 1024` (aspect 3:4) | Complete housing visible; zero clipping; proportional scaling bounded by slot | Clipping or incorrect aspect ratio scaling |
| **IT-BOOT-05** | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | **AC1** (Containment - Desktop Widescreen) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `1440 x 900` (aspect 16:10) | Shell contained within viewport height (`<= 900px`); centered horizontally; backdrop `#111` fills margins | Shell overflows vertically or `transform: translateY(-4%)` crops casing |
| **IT-BOOT-06** | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | **AC1** (Containment - Desktop Ultra-Wide) | `DOMRect`<br>`CSSStyleDeclaration` | Viewport: `2560 x 1080` (aspect 21:9, Edge Case 1) | Shell centered; zero horizontal or vertical clipping; aspect ratio strictly preserved | Shell distorts or scales past viewport bounds |
| **IT-BOOT-07** | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | **AC2** (Boot Video Containment) | `HTMLVideoElement`<br>`CSSStyleDeclaration` | Video playing in playfield (`src="/assets/boot/doom_gamestudio.mp4"`) | `getComputedStyle(video).objectFit === 'contain'`; video title and borders 100% visible inside playfield glass | `objectFit === 'cover'`; video cropped at edges |
| **IT-BOOT-08** | `src/components/BootIntro.tsx` | **AC1**, **AC2** (Skip & Start Controls) | `PointerEvent`<br>`MouseEvent` | 1. 5 pointerdown events on `.boot-intro__skip-hit`<br>2. Click on `.gb-shell__btn-start` | `onComplete()` callback triggered exactly once after 5 taps; clicking START triggers `onComplete()` immediately | Skip fails to trigger; START button pointer events blocked; video fails to dismiss |
| **IT-PATRON-01** | `src/components/PatronLayer.tsx` | **AC3** (Deterministic Walk Termination) | `PatronLayerProps`<br>`HTMLImageElement` | Real seats: `BAR_SEATS_POLYGONS`; advance animation loop by `layout.walkMs` (2400ms) | Patron transitions definitively to `phase: 'seated'`; `t === 1`; element acquires class `pov-patron-sprite--sit` and attribute `data-phase="seated"` | Patron remains in `data-phase="walking"`; walk frame cycle loops indefinitely at stool |
| **IT-PATRON-02** | `src/components/PatronLayer.tsx` | **AC3** (Self-Healing Clock Recovery) | `Map<string, MotionClock>`<br>`PatronInstance` | Spawn patron, clear `motionClockRef.current.get(instanceKey)` to simulate race/un-mount | Next rAF tick synthesizes healing clock; patron completes trajectory to `phase: 'seated'` at `walkMs` | Unhandled error; patron stuck forever with `stillWalking = true` |
| **IT-PATRON-03** | `src/components/PatronLayer.tsx` | **AC4** (Seated Posture & Asset Integrity) | `PatronDef`<br>`HTMLImageElement` | Patron reaches stool; observe subsequent 120 animation ticks | Sprite `src` equals `inst.def.sitSrc`; width matches `inst.layout.sitDisplayWidthPct`; `data-phase` remains `'seated'` permanently | Sprite reverts to walk frame; patron phase mutates back to `'walking'` |
| **IT-PATRON-04** | `src/components/PatronLayer.tsx` | **AC3**, **AC4** (Seat Exclusivity) | `trySpawn`<br>`instancesRef` | Attempt `trySpawn` when assigned seat is occupied by seated patron | `trySpawn` rejects admission; seat remains occupied by existing patron; total instances unchanged | Duplicate patron spawned on occupied seat; existing seated patron displaced |
| **IT-PATRON-05** | `src/components/PatronLayer.tsx` | Edge Case 2 (Concurrent Patron Arrivals) | `trySpawn`<br>Multi-patron state | Concurrently spawn patrons targeting distinct seats (`seat_1`, `seat_2`, `seat_3`) | Each patron independent clock advances; all patrons transition to `phase: 'seated'` without clobbering each other | Clock collision; one patron stalls while another sits; race in rAF state update |
| **IT-STAGE-01** | `src/app/page.tsx`<br>`src/app/gameboy-shell.css` | **AC5** (Zero Stage Translation) | `DOMRect`<br>`CSSStyleDeclaration` | Toggle glassware drawer: `openCategory: null -> 'glassware'` | `.pov-stage` bounding rect exhibits `Δx === 0px`, `Δy === 0px`; `transform: none` | Stage shifts, jolts, or animates (`Δx !== 0` or `Δy !== 0`); CSS transition present |
| **IT-STAGE-02** | `src/app/page.tsx`<br>`src/app/gameboy-shell.css` | **AC5** (Drawer Switching Stability) | `DOMRect`<br>`CategoryKey` | Switch drawers: `openCategory: 'glassware' -> 'bottles' -> 'tools'` | Underlying bar stage canvas remains strictly at `0px` offset throughout drawer switching | Cumulative coordinate drift during drawer switching |
| **IT-STAGE-03** | `src/app/page.tsx`<br>`src/app/gameboy-shell.css` | Edge Case 3 (Rapid Drawer Toggling) | `CategoryKey`<br>State transitions | Rapidly toggle drawers 50 times in succession | Stage remains anchored at baseline origin; `Δx === 0px`, `Δy === 0px` after all toggles | Residual coordinate drift or offset accumulation |
| **IT-HUD-01** | `src/app/page.tsx`<br>`src/app/gameboy-shell.css` | **AC6** (Fixed HUD & Receipt Alignment) | CSS Variables<br>`DOMRect` | Toggle drawers while observing HUD status indicators and `.receipt-printer-mask` | `--shell-hud-tx`, `--shell-hud-ty-top`, and printer cluster bounding rect remain invariant across drawer toggle | HUD elements jump, shake, or re-layout when drawers open/close |

---

## 3. Ground-Truth Schema & Interface Definitions

### 3.1 Boot Console & Playfield CSS Properties
```typescript
interface BootConsoleComputedStyles {
  aspectRatio: '422 / 697';
  width: string; // evaluated against min(100cqw, calc(100cqh * 422 / 697))
  height: string; // evaluated against min(100cqh, calc(100cqw * 697 / 422))
  maxWidth: '100%';
  maxHeight: '100%';
  transform: 'none';
  overflow: 'hidden';
}

interface BootVideoComputedStyles {
  position: 'absolute';
  inset: '0px';
  width: '100%';
  height: '100%';
  objectFit: 'contain';
  objectPosition: '50% 50%';
  backgroundColor: 'rgb(0, 0, 0)';
}
```

### 3.2 Patron State Machine & Lifecycle Interfaces
```typescript
type Phase = 'walking' | 'seated';

interface MotionClock {
  startMs: number;
  walkMs: number;
  frameMs: number;
}

interface PatronInstance {
  instanceKey: string;
  characterId: string;
  def: PatronDef;
  layout: PatronLayout;
  phase: Phase;
  seatId: string;
  t: number;
  walkPath: StagePoint[];
  sitPoint: StagePoint;
  flipX: boolean;
  walkFrameIndex: number;
}

interface PatronDOMAttributes {
  'data-character-id': string;
  'data-seat-id': string;
  'data-phase': 'walking' | 'seated';
  className: string;
  src: string;
}
```

### 3.3 Stage Geometry & HUD Invariant Interfaces
```typescript
interface StageGeometryState {
  stagePan: { x: 0; y: 0 };
  computedTransform: 'none';
  cssTransition: 'none';
  deltaX: 0;
  deltaY: 0;
}

interface ShellHudNudgeState {
  tx: number;
  tyTop: number;
  tyBot: number;
}
```

---

## 4. Documentation Sufficiency & Assertion Law Certification

- **`{sufficient}` State:** Every asserted property, interface, CSS rule, animation state machine phase, and failure criterion is explicitly defined against authentic codebase contracts. Zero ambiguous or synthetic parameters remain.
- **Assertion Law Guarantee:** No assertions test against synthetic blobs, unmandated styles, or hand-invented mocks. All assertions test strictly against `{correct required outputs}` mandated by `functional_specification_100.md` and locked tickets `ticket-001.md` through `ticket-007.md`.
- **Zero Mock Law:** Zero mocks, synthetic JSON fixtures, dummy objects, or placeholder stubs are used. All test matrices evaluate authentic components against real browser/React runtime environments.

---

## 5. Coding Gate Affirmation (`INV-BOUNDARY-01`)

> **DO NOT CODE YET:** Implementation coding gate remains locked. Zero test code, test fixtures, parsers, or expected-output files have been generated. Coding waits on an empty frontier and explicit operator authorization.

---
ticket_id: "007"
title: "FS100 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol"
type: task
status: resolved
claimed_by: "wayfinder-test-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md", "ticket-004.md", "ticket-005.md", "ticket-006.md"]
governing_specification: "functional_specification_100.md"
---

# Ticket 007: FS100 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol

## Question
What deterministic integration test decisions, authentic codebase schemas, admissible observed payloads, and specification oracles govern the verification of the modified components (`src/app/gameboy-shell.css`, `src/components/PatronLayer.tsx`, and `src/app/page.tsx`) to guarantee universal boot console containment, uncropped media playback, deterministic patron walk termination and seating transitions, complete zero-translation stage stability during drawer interactions, and fixed HUD alignment under `INV-PAYLOAD-01` and `INV-ASSERTION-01` without synthesizing test fixtures or writing test code?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_100.md` §1 ("Boot Console Presentation & Viewport Containment"), §2 ("Patron Motion Lifecycle & Seating Transition"), §3 ("Stage Layout Stability During Equipment & Drawer Interactions"), Acceptance Criteria AC1–AC6, Edge Cases 1–3.
- **Upstream Manifest Context:**
  - `handoff/20261009T155146-282-wzgk/implementer.txt` and `handoff/20261009T155146-282-wzgk/reviewer.txt` establish the authoritative list of modified components:
    1. `src/app/gameboy-shell.css`
    2. `src/components/PatronLayer.tsx`
    3. `src/app/page.tsx`
- **Predecessor Decision Tickets:**
  - [Ticket 001: Boot Console Viewport Containment & Proportional Sizing](./ticket-001.md)
  - [Ticket 002: Boot Video Legibility & Playfield Media Containment](./ticket-002.md)
  - [Ticket 003: Patron Motion Lifecycle & Deterministic Walk Termination](./ticket-003.md)
  - [Ticket 004: Patron Seated State Persistence & Asset Switching](./ticket-004.md)
  - [Ticket 005: In-Place Drawer & Carousel Presentation (Zero Stage Translation)](./ticket-005.md)
  - [Ticket 006: Fixed HUD, Status Element & Receipt Alignment](./ticket-006.md)
- **Implemented Baseline (`git diff 6491ae3 HEAD`):**
  - In `src/app/gameboy-shell.css`: `.boot-intro .gb-shell` enforces `min(100cqw, calc(100cqh * 422 / 697))` and `transform: none`; `.boot-intro__video` specifies `object-fit: contain; background: #000;`; `.gb-shell__playfield .pov-stage` locks `transform: none !important; transition: none;`.
  - In `src/components/PatronLayer.tsx`: `trySpawn` pre-registers clocks in `motionClockRef` prior to `flushSync`; `tick()` features self-healing clock synthesis on `!clock` and definitive walk completion to `phase: 'seated'` at `t >= 1`; seated patrons render with `pov-patron-sprite--sit`, `data-phase="seated"`, and stationary bust assets.
  - In `src/app/page.tsx`: `PovStageShell` forces `transform: 'none'`; `shellStagePan` effect always sets `{ x: 0, y: 0 }`; `shellHudNudge` effect is decoupled from drawer toggle dependencies (`[]`).

## Architectural Decisions to Lock

### 1. Ground-Truth Codebase Interface & Schema Definition (Zero Mocks)
The integration test interfaces for all verified components are strictly grounded in authentic TypeScript types, React component props, and browser DOM/CSS APIs:

#### A. Boot Console & Playfield Media (`src/app/gameboy-shell.css`, `src/components/BootIntro.tsx`)
- **Input Interfaces:**
  - Viewport Dimensions: `{ width: number; height: number; dpr?: number }` (tested via Playwright viewport emulations or DOM resize events).
  - `BootIntroProps`:
    ```typescript
    type BootIntroProps = {
      onComplete: () => void;
    };
    ```
- **Output Interfaces:**
  - `HTMLDivElement` (`.boot-intro .gb-shell`):
    - `getBoundingClientRect()`: `{ left, top, right, bottom, width, height }`.
    - Computed CSS: `transform: 'none'`, `aspectRatio: '422 / 697'`.
  - `HTMLVideoElement` (`.boot-intro__video`):
    - `src: '/assets/boot/doom_gamestudio.mp4'`.
    - Computed CSS: `objectFit: 'contain'`, `backgroundColor: 'rgb(0, 0, 0)'`.
  - Hit Elements:
    - `.boot-intro__skip-hit`: `role="button"`, discrete pointerdown tracking up to 5 taps.
    - `.gb-shell__btn-start`: `type="button"`, click triggers `finish()`.

#### B. Patron Animation & Seated Lifecycle (`src/components/PatronLayer.tsx`)
- **Input Interfaces:**
  - `PatronLayerProps`:
    ```typescript
    type PatronSeatInput = {
      zoneId: string;
      d: string;
    };

    type PatronLayerProps = {
      seats: PatronSeatInput[];
      layoutOverrides?: Record<string, PatronLayout>;
      barCutoffD?: string;
      editMode?: boolean;
      onSitComplete?: (info: {
        instanceKey: string;
        characterId: string;
        seatId: string;
      }) => void;
    };
    ```
  - Authentic Seat Definitions: `BAR_SEATS_POLYGONS` from `src/data/patrons.ts` (`zoneId: 'seat_1' | 'seat_2' | 'seat_3' | 'seat_4'`).
  - Authentic Character Catalog: `listCharacters()` and `requireCharacter()` from `src/data/characters.ts`.
- **Output Interfaces:**
  - `HTMLImageElement` (`.pov-patron-sprite`):
    - `data-character-id: string`.
    - `data-seat-id: string`.
    - `data-phase: 'walking' | 'seated'`.
    - `className: string` (`'pov-patron-sprite pov-patron-sprite--sit'` or `'pov-patron-sprite pov-patron-sprite--walk'`).
    - `src: string` (when seated: `inst.def.sitSrc`).
    - `style.left: string` (`${pct.leftPct}%`), `style.top: string` (`${pct.topPct}%`).
  - Event Dispatch: `onSitComplete({ instanceKey, characterId, seatId })`.

#### C. In-Place Stage & HUD Stability (`src/app/page.tsx`, `src/app/gameboy-shell.css`)
- **Input Interfaces:**
  - `CategoryKey: 'glassware' | 'bottles' | 'tools' | 'garnishes' | 'ice' | 'books' | 'money'`.
  - Drawer Toggle Trigger: Clicking zone hotspots (`POV_CATEGORY_HOTSPOTS`) or setting `openCategory`.
- **Output Interfaces:**
  - `HTMLDivElement` (`.pov-stage`):
    - Inline style `transform: 'none'`.
    - Computed CSS `transform: 'none'` (or matrix identity `matrix(1, 0, 0, 1, 0, 0)`).
    - Geometric Delta: `Δx = 0px`, `Δy = 0px` across drawer transitions.
  - HUD CSS Properties on `.pov-stage`:
    - `--shell-hud-tx`, `--shell-hud-ty-top`, `--shell-hud-ty-bot`.
    - Invariant: Values remain constant when `openCategory` changes.
  - Chrome Elements:
    - `.receipt-hardware-cluster`, `.receipt-printer-mask`: `getBoundingClientRect()` remains fixed.

---

### 2. Admissible Observed Payloads (Payload Law `INV-PAYLOAD-01`)
In strict adherence to `INV-PAYLOAD-01`, no dummy objects, synthetic JSON approximations, or invented structures are permitted. All payloads are observed real-world viewport environments, real seat layouts, and real stock character entries:

| Payload ID | Target Component | Observed Input Context | Admissible Source / Grounding |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-VP-01` | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | Viewport `{ width: 375, height: 667 }` (Mobile Portrait 9:16) | Standard mobile device viewport |
| `PAYLOAD-VP-02` | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | Viewport `{ width: 390, height: 844 }` (Mobile Tall/Narrow 9:19.5) | Standard modern phone aspect ratio |
| `PAYLOAD-VP-03` | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | Viewport `{ width: 844, height: 390 }` (Mobile Landscape) | Standard mobile landscape viewport |
| `PAYLOAD-VP-04` | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | Viewport `{ width: 768, height: 1024 }` (Tablet Portrait 3:4) | Standard tablet viewport |
| `PAYLOAD-VP-05` | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | Viewport `{ width: 1440, height: 900 }` (Desktop 16:10) | Standard desktop viewport |
| `PAYLOAD-VP-06` | `src/app/gameboy-shell.css`<br>`src/components/BootIntro.tsx` | Viewport `{ width: 2560, height: 1080 }` (Ultra-Wide 21:9) | Ultra-wide desktop viewport |
| `PAYLOAD-PATRON-01` | `src/components/PatronLayer.tsx` | `seats = BAR_SEATS_POLYGONS`<br>`editMode = false` | Real seat polygons from `src/data/patrons.ts` |
| `PAYLOAD-PATRON-02` | `src/components/PatronLayer.tsx` | Real stock characters: `patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816` | Authentic definitions from `src/data/characters.ts` |
| `PAYLOAD-PATRON-03` | `src/components/PatronLayer.tsx` | Clock time progression: `t >= walkMs` (`now = startMs + 2500ms`) | Real animation frame wall-clock |
| `PAYLOAD-PATRON-04` | `src/components/PatronLayer.tsx` | Clock-missing state: `motionClockRef.current.clear()` during walking phase | Observed StrictMode / race condition state |
| `PAYLOAD-STAGE-01` | `src/app/page.tsx` | Sequential drawer transitions: `openCategory: null -> 'glassware' -> 'bottles' -> 'tools' -> null` | Real bar station interaction flow |
| `PAYLOAD-STAGE-02` | `src/app/page.tsx` | Rapid drawer toggle: 50 successive open/close toggles | Stress test for coordinate drift |

---

### 3. Specification Oracles (`INV-ASSERTION-01`)
Integration assertions must test strictly against `{correct required outputs}` mandated by `functional_specification_100.md` and locked ticket resolutions:

- **Oracle 1 (Console Viewport Containment - AC1):**
  For each observed viewport `PAYLOAD-VP-01` through `PAYLOAD-VP-06`:
  - `shellRect.left >= slotRect.left - 0.5`
  - `shellRect.right <= slotRect.right + 0.5`
  - `shellRect.top >= slotRect.top - 0.5`
  - `shellRect.bottom <= slotRect.bottom + 0.5`
  - Zero overflow or cropping of casing, branding header, D-pad, action buttons, or SELECT/START controls.
  - Computed style of `.boot-intro .gb-shell` has `transform: 'none'`.
- **Oracle 2 (Boot Video Containment - AC2):**
  - Computed style `getComputedStyle(videoEl).objectFit === 'contain'`.
  - Video element bounding rect is fully contained within `.boot-intro__playfield`.
  - Background color is black (`rgb(0, 0, 0)`).
- **Oracle 3 (Interactive Boot Skip & Start - AC1/AC2):**
  - Triggering 5 pointerdown events on `.boot-intro__skip-hit` calls `onComplete()` exactly once.
  - Triggering 1 click on `.gb-shell__btn-start` calls `onComplete()` immediately.
- **Oracle 4 (Deterministic Walk Termination - AC3):**
  - For any walking patron, advancing time by `layout.walkMs` guarantees `instance.phase === 'seated'` and `instance.t === 1`.
  - Corresponding DOM element possesses `data-phase="seated"` and class `pov-patron-sprite--sit`.
  - Zero patrons remain in `data-phase="walking"` after walk duration expires.
  - `onSitComplete` callback is invoked with `{ instanceKey, characterId, seatId }`.
- **Oracle 5 (Patron Self-Healing Clock Recovery - AC3):**
  - If a patron is walking and its clock is dropped from `motionClockRef`, the animation driver dynamically creates a healing clock and completes walk to `phase: 'seated'` within `walkMs`.
- **Oracle 6 (Seated Posture & Asset Stability - AC4):**
  - Seated patrons permanently render `inst.def.sitSrc` with stationary bust dimensions (`inst.layout.sitDisplayWidthPct`).
  - Subsequent rAF ticks produce 0 state churn on seated instances (`data-phase` remains `'seated'`).
  - No new patron may spawn on an already occupied seat.
- **Oracle 7 (Zero Stage Translation on Drawer Interaction - AC5):**
  - For `PAYLOAD-STAGE-01` and `PAYLOAD-STAGE-02`, the bounding rect of `.pov-stage` before vs during vs after drawer opening exhibits:
    `Math.abs(stageRectBefore.left - stageRectAfter.left) === 0`
    `Math.abs(stageRectBefore.top - stageRectAfter.top) === 0`
  - Computed style `getComputedStyle(povStageEl).transform === 'none'`.
- **Oracle 8 (Fixed HUD & Receipt Alignment - AC6):**
  - Values of CSS variables `--shell-hud-tx`, `--shell-hud-ty-top`, `--shell-hud-ty-bot` remain unchanged across drawer opening and closing.
  - Bounding client rects of `.receipt-printer-mask` and `.receipt-hardware-cluster` exhibit `Δx === 0`, `Δy === 0` during drawer interactions.

---

### 4. Explicit Error States (`{errors}` per `LANGUAGE.md`)
The integration test suite must immediately surface fatal errors if any of the following states occur:
- Any bounding edge of `.boot-intro .gb-shell` falls outside the viewable viewport slot (`left < 0`, `top < 0`, `right > slot.width`, `bottom > slot.height`).
- Video element using `object-fit: cover` or cropping video titles.
- Any patron remaining trapped with `data-phase="walking"` or `t < 1` after elapsed time exceeds `walkMs`.
- Crash or infinite walk loop when a patron's motion clock is missing or un-synchronized.
- Seated patron mutating back to `walking` or swapping sprite to a walk frame.
- Multiple patrons occupying the same seat ID.
- Any non-zero translation (`transform: translate(...)` or coordinate shift > `0px`) on `.pov-stage` when opening or closing drawers.
- Jitter, coordinate drift, or displacement of HUD status indicators, jigger controls, or receipt printer hardware when toggling drawers.

## Scope & Invariant Guardrails
- **In Scope:** Test decision mapping, schema grounding, payload admissibility register, specification oracles, and explicit error definitions for the modified components.
- **Out of Scope:** Writing executable test code, creating dummy mock libraries, writing mock servers, or modifying application source files (`INV-BOUNDARY-01`).

---

## Resolution

### 1. Locked Integration Test Decision Contract
1. Integration testing of `src/app/gameboy-shell.css`, `src/components/PatronLayer.tsx`, and `src/app/page.tsx` evaluates components in authentic Playwright browser and React component testing contexts against real DOM, CSS, and component interfaces without synthetic mock layers.
2. The 12 discrete payloads defined in `PAYLOAD-VP-01` through `PAYLOAD-STAGE-02` establish the complete input domain for FS100 verification.
3. Universal containment, media contain fit, deterministic walk-to-sit transitions, seated asset stability, zero stage translation, and fixed HUD alignment are rigorously bound to specification oracles AC1 through AC6.

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-test-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks Master Integration Test Matrix (`test_matrix_100.md`) and downstream test authoring upon operator authorization.

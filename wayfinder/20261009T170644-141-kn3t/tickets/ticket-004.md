---
ticket_id: 004
title: "FS103 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol"
type: task
status: resolved
claimed_by: "wayfinder-test-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md"]
governing_specification: "functional_specification_103.md"
---

# Ticket 004: FS103 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol

## Question
What deterministic integration test decisions, authentic codebase schemas, admissible observed payloads, and specification oracles govern the verification of the modified component (`src/components/PatronLayer.tsx`) and its integration into the barroom scene (`src/app/page.tsx`, `src/app/globals.css`, and `src/data/povHotspots.ts`) to guarantee that arriving patron characters transition definitively to and persist in their seated state at designated bar stools, maintain continuous seat occupancy, eliminate runaway re-spawning loops, and enforce auto-fill capacity quiescence under `INV-PAYLOAD-01` and `INV-ASSERTION-01` without synthesizing test fixtures or writing executable test code?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_103.md`
  - §Purpose: "guarantee that once a patron reaches their assigned bar stool, they immediately transition to and persist in their seated state, displaying their seated visual asset at the counter, maintaining seat occupancy, and preventing runaway re-spawning cycles."
  - §Observed Errors:
    - "Patrons continuously spawn at the entry point and walk along their path toward their designated bar stool."
    - "Upon reaching their destination at the stool, patrons do not settle into a permanent seated posture; instead, they vanish or reset."
    - "A new patron instance is repeatedly spawned in rapid succession, resulting in an infinite loop of patrons walking in, reaching the seat, and vanishing/re-spawning."
    - "The bar counter never populates with stationary seated customers, leaving the bar stools visually unoccupied over extended durations despite continuous character spawning activity."
  - §Desired Functionality:
    1. Definitive Seated Transition: "When an arriving patron reaches the end of their walking path at their assigned bar stool, they must cleanly and definitively transition from the walking phase into the seated state. Walking motion and walk-cycle animations must cease upon arrival. The character's seated visual asset must immediately display at the designated stool position and scale."
    2. Seated State Persistence: "Once seated, the patron must remain seated in place continuously at their bar stool for the entire duration of their stay. The seated character must not disappear, reset to the entry point, or revert to walking animations while occupying the seat."
    3. Elimination of Re-spawning Loops: "Reaching a seat must never trigger a despawn, reset, or replacement spawn. Arriving at and occupying a seat must conclusively satisfy that seat's fill requirement."
    4. Continuous Seat Occupancy & Spawn Gating: "An assigned seat must remain strictly occupied while the patron is walking toward it and while the patron is seated on it. Auto-fill spawning mechanisms must recognize occupied seats and never spawn duplicate patrons for a seat that is already claimed or filled. When all physical bar seats are occupied by walking or seated patrons, all auto-fill character spawning must halt entirely until a seat is legitimately vacated."
  - §Edge Cases:
    1. Multiple Concurrent Patrons: "When multiple patrons walk toward different bar stools simultaneously, each patron must complete their arrival and transition to the seated state independently without resetting other active patrons or causing state collisions."
    2. Sequential Seat Filling: "As successive patrons arrive and sit, previously seated patrons must remain unaffected and stable in their seated state."
    3. Viewport Resizing & Reorientation: "Resizing the window or changing device orientation while patrons are walking or seated must preserve all active patron states, seat occupancies, and seated visual poses without triggering resets or re-spawns."
    4. Full Bar Capacity: "When all bar stools are occupied by seated patrons, the scene must remain in a stable, quiescent state with no background spawn attempts or visual glitches."
  - §Acceptance Criteria:
    - AC1: Arrival Seating Completion.
    - AC2: Seated Pose Persistence.
    - AC3: Zero Re-spawning Cycle.
    - AC4: Occupancy Integrity.
    - AC5: Capacity Quiescence.
- **Upstream Manifest Context:**
  - `handoff/20261009T170644-141-kn3t/wayfinder-read-and-plan.txt`
  - `handoff/20261009T170644-141-kn3t/implementer.txt` (`src/components/PatronLayer.tsx`)
  - `handoff/20261009T170644-141-kn3t/reviewer.txt` (`src/components/PatronLayer.tsx`)
- **Predecessor Decision Tickets:**
  - [Ticket 001: Patron Arrival Seating Transition & Motion Driver Quiescence](./ticket-001.md)
  - [Ticket 002: Patron Seated State Persistence, Asset Rendering & Despawn Prevention](./ticket-002.md)
  - [Ticket 003: Seat Occupancy Invariance & Auto-Fill Capacity Quiescence](./ticket-003.md)
- **Implemented Baseline (`src/components/PatronLayer.tsx`):**
  - Lines 68–83: `freeSeats(seats, instances)` checks all instances for claimed seat IDs (`taken.has(s.zoneId)`), locking reservation continuously across both walking and seated phases.
  - Lines 309–343: Motion driver `tick(now)` evaluates `t < 1 && elapsed < walkMs`. When reached (`t >= 1 || elapsed >= walkMs`), triggers definitive transition to `phase: 'seated'`, `t: 1`, `flipX: false`, `walkFrameIndex: 0`, and removes clock from `motionClockRef`.
  - Lines 351–376: rAF driver checks `motionClockRef.current.size > 0`; if zero walkers remain, `driverRunningRef.current = false; driverRafRef.current = 0`, gracefully quiescing animation frames.
  - Lines 382–457: `trySpawn()` enforces strict capacity guard `snapshot.length >= seatList.length`, checks `freeSeats()`, selects free character, and executes atomic synchronous reservation inside `flushSync` `setInstances`.
  - Lines 506–545: Instance rendering maps `inst.phase === 'seated'` to `inst.sitPoint`, `inst.def.sitSrc`, `inst.layout.sitDisplayWidthPct`, and CSS class `.pov-patron-sprite--sit`.

---

## Architectural Decisions to Lock

### 1. Ground-Truth Codebase Interface & Schema Definition (Zero Mocks)
The integration test interfaces for verifying `src/components/PatronLayer.tsx` are grounded strictly in authentic TypeScript types, React component interfaces, DOM attributes, and CSS definitions without synthetic wrappers or mock layers:

#### A. Component Input Schema (`PatronLayerProps`)
From `src/components/PatronLayer.tsx`:
```typescript
export type PatronSeatInput = {
  zoneId: string;
  d: string;
};

export type PatronLayerProps = {
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

#### B. Internal State & Motion Clock Schema
From `src/components/PatronLayer.tsx`:
```typescript
type Phase = 'walking' | 'seated';

type PatronInstance = {
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
};

type MotionClock = {
  startMs: number;
  walkMs: number;
  frameMs: number;
};
```

#### C. Stage Geometry & Character Schemas
From `src/data/patronLayout.ts` and `src/data/characters.ts`:
```typescript
export type StagePoint = {
  x: number;
  y: number;
};

export type PatronLayout = {
  patronId: string;
  walkDisplayWidthPct: number;
  sitDisplayWidthPct: number;
  spawn: StagePoint;
  waypoints: StagePoint[];
  preferredSeatId: string | null;
  sitOffset: StagePoint;
  lockHorizontalWalk: boolean;
  walkMs: number;
};

export type PatronDef = {
  id: string;
  walkFrames: string[];
  sitSrc: string;
  displayWidthPct: number;
  walkFrameMs: number;
};
```

#### D. Rendered DOM Node Schema (`HTMLDivElement` & `HTMLImageElement`)
From `src/components/PatronLayer.tsx` and `src/app/globals.css`:
- Container element: `<div className="pov-patron-layer" aria-hidden="true" style={{ clipPath, WebkitClipPath }}>`
  - Position: `absolute; inset: 0; z-index: 8; pointer-events: none; overflow: hidden;`
  - Clip Path: `roomMinusBarClipPathCss(...)`
- Sprite element: `<img className="pov-patron-sprite pov-patron-sprite--sit" ... />`
  - Data attributes:
    - `data-character-id: string`
    - `data-seat-id: string`
    - `data-phase: "walking" | "seated"`
  - Inline style:
    - `left: string` (e.g. `${pct.leftPct}%`)
    - `top: string` (e.g. `${pct.topPct}%`)
    - `width: string` (e.g. `${widthPct}%`)
    - `transform: string` (e.g. `translate(-50%, -100%)` or `translate(-50%, -100%) scaleX(-1)`)
  - CSS class rules:
    - `.pov-patron-sprite`: `position: absolute; height: auto; object-fit: contain; object-position: bottom center; image-rendering: pixelated; pointer-events: none;`
    - `.pov-patron-sprite--walk`: `max-height: 85%;`
    - `.pov-patron-sprite--sit`: `max-height: 55%;`

---

### 2. Admissible Observed Payloads (Payload Law `INV-PAYLOAD-01`)
Under `INV-PAYLOAD-01`, no dummy objects, synthetic JSON mocks, or invented fields are permitted. All payloads are observed real-world system inputs, authentic SVG bar seat geometries from `POV_BAR_SEAT_HOTSPOTS`, stock characters from `CHARACTERS`, and real wall-clock timing sequences:

| Payload ID | Target Component | Observed Input Context | Admissible Source / Grounding |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-SEATS-01` | `src/components/PatronLayer.tsx` | All 4 canonical bar seat hotspots: `bar_seat_1`, `bar_seat_2`, `bar_seat_3`, `bar_seat_4` with authentic SVG path definitions `d` | `POV_BAR_SEAT_HOTSPOTS` from `src/data/povHotspots.ts` |
| `PAYLOAD-SEATS-02` | `src/components/PatronLayer.tsx` | Single bar seat input: `bar_seat_1` (`zoneId: "bar_seat_1"`, authentic path `d`) | Subset of `POV_BAR_SEAT_HOTSPOTS` (isolated single patron arrival) |
| `PAYLOAD-SEATS-03` | `src/components/PatronLayer.tsx` | Empty seat list: `seats: []` | Boundary case: no seats configured |
| `PAYLOAD-CHAR-01` | `src/components/PatronLayer.tsx` | Authentic stock character `patron_elder` (`displayName: "Elder"`, `walkFrameCount: 4`, `walkFrameMs: 120`) | `CHARACTER_ELDER` from `src/data/characters.ts` |
| `PAYLOAD-CHAR-02` | `src/components/PatronLayer.tsx` | Authentic stock character `caesar_9aea2cd1a4bf32d6` (`displayName: "Caesar"`, `walkFrameCount: 2`, `walkFrameMs: 120`) | `CHARACTER_CAESAR_9AEA2CD1A4BF32D6` from `src/data/characters.ts` |
| `PAYLOAD-CHAR-03` | `src/components/PatronLayer.tsx` | Authentic stock character `trump_ca36306f5c662816` (`displayName: "Trump"`, `walkFrameCount: 2`, `walkFrameMs: 120`) | `CHARACTER_TRUMP_CA36306F5C662816` from `src/data/characters.ts` |
| `PAYLOAD-TIME-01` | `src/components/PatronLayer.tsx` | Time progression: `now = clock.startMs + 0ms` ($t = 0$, spawn inception) | Authentic `performance.now()` wall-clock progression |
| `PAYLOAD-TIME-02` | `src/components/PatronLayer.tsx` | Time progression: `now = clock.startMs + (walkMs / 2)ms` ($t \approx 0.5$, mid-walk traversal) | Authentic `performance.now()` wall-clock progression |
| `PAYLOAD-TIME-03` | `src/components/PatronLayer.tsx` | Time progression: `now = clock.startMs + walkMs ms` ($t = 1.0$, stool arrival threshold) | Authentic `performance.now()` arrival threshold |
| `PAYLOAD-TIME-04` | `src/components/PatronLayer.tsx` | Time progression: `now = clock.startMs + walkMs + 10000ms` (10 seconds post-arrival seated stay) | Authentic `performance.now()` post-arrival seated duration |
| `PAYLOAD-AUTOFILL-01`| `src/components/PatronLayer.tsx` | Auto-fill timer sequence: Initial spawn at `800ms`, recurring intervals at `2500ms`, `5000ms`, `7500ms`, `10000ms` | `AUTO_FILL_INITIAL_DELAY_MS` and `AUTO_FILL_INTERVAL_MS` from `src/data/patronServiceConstants.ts` |
| `PAYLOAD-RESIZE-01` | `src/components/PatronLayer.tsx` | ResizeObserver entries: `w: 1184 -> 844 -> 1920`, `h: 880 -> 390 -> 1080` | Real window resize / orientation change events |
| `PAYLOAD-BARCUT-01` | `src/components/PatronLayer.tsx` | Authentic bar counter cutoff SVG path: `POV_BAR_CUTOFF.d` (`zoneId: "bar_counter_edge"`) | `POV_BAR_CUTOFF` from `src/data/povHotspots.ts` |

---

### 3. Specification Oracles (`INV-ASSERTION-01`)
Assertions test strictly against `{correct required outputs}` mandated by `functional_specification_103.md` and locked ticket resolutions:

- **Oracle 1 (Arrival Seating Completion - AC1):**
  Under `PAYLOAD-SEATS-01` and `PAYLOAD-TIME-03` ($now \ge clock.startMs + walkMs$):
  - In `instances` state array, instance transitioning to `phase: 'seated'`.
  - Progress parameter `t === 1`.
  - Facing direction `flipX === false`.
  - Walk animation index `walkFrameIndex === 0`.
  - Motion clock removed from `motionClockRef` (`motionClockRef.current.has(instanceKey) === false`).
  - Rendered `<img>` element attributes:
    - `data-phase === "seated"`
    - `src === inst.def.sitSrc` (e.g. `/characters/patron_elder/sit.png`)
    - CSS class contains `pov-patron-sprite--sit`
    - CSS class does NOT contain `pov-patron-sprite--walk`
    - `width` style matches `inst.layout.sitDisplayWidthPct` (35% default)
    - `left` style matches `stagePointToPct(inst.sitPoint).leftPct`
    - `top` style matches `stagePointToPct(inst.sitPoint).topPct`
- **Oracle 2 (Seated Pose Persistence - AC2):**
  Under `PAYLOAD-TIME-04` ($now \ge clock.startMs + walkMs + 10000ms$):
  - Instance remains in `instances` array continuously without eviction or count reduction.
  - State attributes `phase === 'seated'`, `t === 1`, `walkFrameIndex === 0` remain strictly invariant across all intervening frames.
  - Rendered sprite position (`left`, `top`), image source (`def.sitSrc`), and visual scale remain completely stationary at `inst.sitPoint`.
  - Zero reset to spawn point `inst.layout.spawn`.
- **Oracle 3 (Zero Re-spawning Cycle - AC3):**
  Under `PAYLOAD-SEATS-02` (single seat `bar_seat_1`):
  - After the patron reaches the seat and transitions to `phase: 'seated'`, subsequent timer ticks from `AUTO_FILL_INTERVAL_MS` do NOT spawn another patron for `bar_seat_1`.
  - `instances.length` remains exactly 1.
  - The seated patron does NOT disappear, vanish, or get replaced by a new walking patron.
  - Auto-fill loop does not produce runaway character instances.
- **Oracle 4 (Occupancy Integrity - AC4):**
  Under `PAYLOAD-SEATS-01` with 1 walking patron and 1 seated patron:
  - `freeSeats(seats, instances)` returns strictly the remaining unassigned seats (`seats.length - instances.length`).
  - Neither the approaching patron's seat nor the seated patron's seat appears in `freeSeats`.
  - Attempting to call `trySpawn()` when an instance already holds a seat ID guarantees that the seat is never double-allocated.
- **Oracle 5 (Auto-Fill Capacity Quiescence - AC5):**
  Under `PAYLOAD-SEATS-01` (4 bar seats) and `PAYLOAD-AUTOFILL-01`:
  - When all 4 seats are occupied (`instances.length === 4`), `freeSeats()` returns `[]`.
  - `trySpawn()` exits immediately on `snapshot.length >= seatList.length`.
  - Zero additional patrons are appended to `instances`.
  - When all 4 patrons complete arrival and transition to `phase: 'seated'`:
    - `motionClockRef.current.size === 0`
    - `driverRunningRef.current === false`
    - `driverRafRef.current === 0`
    - rAF driver completely halts, achieving full quiescent idle state without background CPU consumption.
- **Oracle 6 (Multiple Concurrent Patrons - Edge Case 1):**
  When two patrons are spawned concurrently toward different seats (`bar_seat_1` and `bar_seat_3`):
  - Each patron advances along their respective path independently each frame in a single synchronous `setInstances` update.
  - The arrival of the first patron does not disrupt, reset, or alter the walking progression of the second patron.
  - Both patrons cleanly achieve `phase: 'seated'` at their respective coordinates.
- **Oracle 7 (Sequential Seat Filling - Edge Case 2):**
  When patron A is already in `phase: 'seated'` at `bar_seat_1`, and patron B spawns and walks toward `bar_seat_2`:
  - Patron A's state object in `instances` is passed through unmutated (`if (p.phase !== 'walking') return p`).
  - Patron A's DOM node remains stationary, seated, and unmounted.
- **Oracle 8 (Viewport Resizing & Reorientation Isolation - Edge Case 3):**
  Under `PAYLOAD-RESIZE-01` during active walking or seated phases:
  - `ResizeObserver` callback updates `layerSize` state only.
  - `instances` array, instance keys, motion clocks, and seat assignments are completely untouched.
  - Seated patrons retain exact percentage-based stage positioning (`pct.leftPct%`, `pct.topPct%`).
- **Oracle 9 (Bar Occlusion & Clipping Fidelity):**
  Under `PAYLOAD-BARCUT-01`:
  - `.pov-patron-layer` container maintains `clip-path: path(evenodd, ...)` computed by `roomMinusBarClipPathCss()`.
  - Seated patron bust is rendered with lower body clipped behind bar counter line and upper body fully visible.

---

### 4. Explicit Error States (`{errors}` per `LANGUAGE.md`)
The integration test suite must immediately surface fatal errors if any of the following defect conditions occur:
- An arriving patron reaches $t \ge 1$ and vanishes or gets deleted from `instances`.
- An arriving patron resets to spawn coordinates `(143, 659)` and walks again.
- An arriving patron resets `phase` back to `'walking'`.
- A seated patron cycles walk animation frames (`walkFrameIndex > 0`).
- A seated patron renders `walkFrames` instead of `def.sitSrc`.
- Continuous re-spawning loop spawns duplicate instances for an occupied seat.
- Auto-fill interval continues spawning patrons when `instances.length >= seats.length`.
- `freeSeats` considers an occupied seat as free because the patron transitioned to `phase: 'seated'`.
- Two patrons share the same `seatId` or `characterId`.
- The rAF driver continues running (`driverRunningRef.current === true`) after all patrons have reached `phase: 'seated'`.
- Window resizing or parent re-rendering clears or resets active patron instances.

## Scope & Invariant Guardrails
- **In Scope:** Test decision mapping, authentic codebase schema definitions, payload admissibility audit, specification oracles, and explicit error states for `src/components/PatronLayer.tsx` and its integration.
- **Out of Scope:** Writing executable test code, creating test runners, synthesizing dummy payloads, or modifying application logic (`INV-BOUNDARY-01`).

---

## Resolution

### 1. Locked Integration Test Decision Contract
1. Integration verification of `src/components/PatronLayer.tsx` operates against authentic codebase schemas (`PatronLayerProps`, `PatronSeatInput`, `PatronInstance`, `PatronDef`, `PatronLayout`) and real DOM/CSS representations with zero mock fixtures.
2. The 13 discrete payloads defined in `PAYLOAD-SEATS-01` through `PAYLOAD-BARCUT-01` establish the complete, admissible input domain for FS103 verification under Payload Law (`INV-PAYLOAD-01`).
3. Definitive seated transition, pose persistence, re-spawn loop elimination, seat occupancy invariance, and auto-fill capacity quiescence are rigorously bound to specification oracles AC1 through AC5 and Edge Cases 1 through 4 under Assertion Law (`INV-ASSERTION-01`).

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-test-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks Master Integration Test Matrix (`test_matrix_103.md`) and downstream test authoring upon operator authorization.

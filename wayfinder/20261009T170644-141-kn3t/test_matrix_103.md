# Master Integration Test Matrix: FS103 Patron Arrival Seating Persistence and Re-spawning Cycle Elimination

**Governing Specification:** `functional_specification_103.md`  
**Wayfinder Map:** `wayfinder/20261009T170644-141-kn3t/map.md`  
**Governing Tickets:**
- [Ticket 001: Patron Arrival Seating Transition & Motion Driver Quiescence](./tickets/ticket-001.md)
- [Ticket 002: Patron Seated State Persistence, Asset Rendering & Despawn Prevention](./tickets/ticket-002.md)
- [Ticket 003: Seat Occupancy Invariance & Auto-Fill Capacity Quiescence](./tickets/ticket-003.md)
- [Ticket 004: FS103 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./tickets/ticket-004.md)

---

## 1. Upstream Manifest Binding & Audit Summary

- **Modified Source Components:**
  - `src/components/PatronLayer.tsx` (certified modified under `ticket-001.md`, `ticket-002.md`, and `ticket-003.md`).
- **Integrating Source Components:**
  - `src/app/page.tsx` (parent container `<PovStageShell>` mounting `<PatronLayer>` with memoized `barSeatInputs`).
  - `src/app/globals.css` (sprite styling `.pov-patron-sprite`, `.pov-patron-sprite--walk`, `.pov-patron-sprite--sit`, and container `.pov-patron-layer`).
  - `src/data/povHotspots.ts` (`POV_BAR_SEAT_HOTSPOTS` and `POV_BAR_CUTOFF`).
  - `src/data/characters.ts` (authentic stock character cast `CHARACTER_ELDER`, `CHARACTER_CAESAR_9AEA2CD1A4BF32D6`, `CHARACTER_TRUMP_CA36306F5C662816`).
  - `src/data/patronLayout.ts` (stage layout math, viewBox coordinates, and walk paths).
- **Upstream Manifest Validation:**
  - Upstream manifests `handoff/20261009T170644-141-kn3t/wayfinder-read-and-plan.txt`, `handoff/20261009T170644-141-kn3t/implementer.txt`, and `handoff/20261009T170644-141-kn3t/reviewer.txt` ingested with 100% path and content parity.
- **Zero-Mock Verification Certification:**
  - In strict compliance with `INV-PAYLOAD-01` and `INV-ASSERTION-01`, zero synthetic fixtures, mock APIs, simulated timer objects, or placeholder payloads are permitted.
  - All test definitions are grounded directly in authentic codebase types, DOM interfaces, SVG geometry paths, and observed real-world system timing parameters.

---

## 2. Master Integration Test Matrix

| Test Case ID | Target Component | Acceptance Criterion | Authentic Codebase Schema / Interface | Admissible Observed Input Payload (`INV-PAYLOAD-01`) | `{correct required outputs}` (`INV-ASSERTION-01`) | Explicit `{errors}` (`LANGUAGE.md`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-PATRON-01** | `src/components/PatronLayer.tsx` | **AC1** (Arrival Seating Transition) | `PatronSeatInput[]`<br>`PatronInstance`<br>`MotionClock` | Single seat `bar_seat_1` (`PAYLOAD-SEATS-02`), stock character `patron_elder` (`PAYLOAD-CHAR-01`), wall clock `now >= clock.startMs + walkMs` (`PAYLOAD-TIME-03`) | Instance transitions to `phase: 'seated'`; progress `t === 1`; `flipX === false`; `walkFrameIndex === 0`; clock removed from `motionClockRef`; DOM `<img>` rendered with `data-phase="seated"` and `src === inst.def.sitSrc` | Instance vanishes or resets to spawn; `phase` remains `'walking'`; walk frame animation continues; clock remains active in `motionClockRef` |
| **IT-PATRON-02** | `src/components/PatronLayer.tsx` | **AC2** (Seated Pose Persistence) | `PatronInstance[]`<br>`HTMLImageElement` | Patron seated at `bar_seat_1`, elapsed time extended by `+10000ms` across subsequent animation frames (`PAYLOAD-TIME-04`) | Seated instance remains permanently in `instances` array; position remains strictly stationary at `inst.sitPoint`; `src` remains `inst.def.sitSrc`; zero displacement; zero deletion | Seated patron disappears after brief display; patron resets to entry point; patron reverts to walking pose or walk-cycle sprites |
| **IT-PATRON-03** | `src/components/PatronLayer.tsx` | **AC3** (Zero Re-spawning Cycle) | `PatronInstance[]`<br>`AUTO_FILL_INTERVAL_MS` | Single seat `bar_seat_1` occupied by seated patron; auto-fill interval fires periodically every `2500ms` (`PAYLOAD-AUTOFILL-01`) | Auto-fill timer does not spawn duplicate patron; `instances.length` remains strictly 1; seat `bar_seat_1` remains filled; zero loop of walking in, vanishing, and re-spawning | Endless re-spawn cycle where reaching stool causes patron to vanish and a new character walks in; `instances.length` continuously churns |
| **IT-PATRON-04** | `src/components/PatronLayer.tsx` | **AC4** (Seat Occupancy Integrity) | `freeSeats()`<br>`PatronSeatInput[]`<br>`PatronInstance[]` | 4 canonical seats (`PAYLOAD-SEATS-01`); 1 walking patron approaching `bar_seat_2` and 1 seated patron at `bar_seat_4` | `freeSeats(seats, instances)` returns strictly `[bar_seat_1, bar_seat_3]`; approaching and seated stools are both marked `taken`; `trySpawn` never double-books an active stool | Seat assigned to approaching patron considered free; duplicate patron spawned for already-claimed stool; seat occupancy lost upon seating |
| **IT-PATRON-05** | `src/components/PatronLayer.tsx` | **AC5** (Auto-Fill Capacity Quiescence) | `trySpawn()`<br>`driverRunningRef`<br>`motionClockRef` | 4 canonical seats (`PAYLOAD-SEATS-01`) populated by 4 seated patrons; background auto-fill ticks continue (`PAYLOAD-AUTOFILL-01`) | `trySpawn()` returns immediately (`snapshot.length >= seatList.length`); `instances.length === 4`; `motionClockRef.current.size === 0`; `driverRunningRef.current === false`; rAF loop fully halts | Background spawning continues past bar capacity; duplicate instances added; rAF loop keeps running indefinitely when all patrons are seated |
| **IT-PATRON-06** | `src/components/PatronLayer.tsx` | **AC1**, **Edge Case 1** (Multiple Concurrent Patrons) | `PatronInstance[]`<br>`setInstances` flushSync | Two concurrent patrons walking simultaneously to `bar_seat_1` and `bar_seat_3` | Both patrons advance along their distinct paths in a single rAF frame update; each reaches their seat independently and transitions to `phase: 'seated'` without state collision | Last-write-wins race condition; one patron stalls or teleports; arrival of one patron resets or cancels the other patron |
| **IT-PATRON-07** | `src/components/PatronLayer.tsx` | **AC2**, **Edge Case 2** (Sequential Seat Filling) | `PatronInstance[]`<br>`tick()` map | Patron 1 seated at `bar_seat_1`; Patron 2 spawns and walks toward `bar_seat_2` | In `tick(now)`, Patron 1 is preserved untouched (`p.phase !== 'walking' -> return p`); Patron 1 remains stationary and seated while Patron 2 walks and settles | Newly spawned walker causes existing seated patron to reset, stand up, re-animate walk cycle, or disappear |
| **IT-PATRON-08** | `src/components/PatronLayer.tsx` | **AC2**, **Edge Case 3** (Viewport Resize & Orientation Isolation) | `ResizeObserver`<br>`HTMLDivElement` | Viewport dimensions resized dynamically across orientations (`1184x880 -> 844x390 -> 1920x1080`, `PAYLOAD-RESIZE-01`) | `ResizeObserver` updates `layerSize` only; `instances` array, clocks, and seat occupancies remain 100% decoupled and preserved; sprites retain proportional stage percentages | Window resize triggers re-mount or resets `instances` to `[]`; patrons vanish or restart walking trajectory on device rotation |
| **IT-PATRON-09** | `src/components/PatronLayer.tsx` | **AC5**, **Edge Case 4** (Full Bar Capacity Quiescent State) | `PatronLayerProps`<br>`driverRafRef` | All 4 bar seats filled by seated patrons over 30 seconds of scene idle | Scene maintains absolute visual and architectural stability; zero timer churn; zero state updates; zero visual flicker or glitch | Memory leak from uncollected clocks; continuous re-render churn while idle at full capacity |
| **IT-PATRON-10** | `src/components/PatronLayer.tsx`<br>`src/app/globals.css` | **AC1**, **AC2** (Seated Visual Asset & Sprite Geometry) | `HTMLImageElement`<br>`CSSStyleDeclaration` | Seated patron instance at `bar_seat_1` with stock character `caesar_9aea2cd1a4bf32d6` (`PAYLOAD-CHAR-02`) | Rendered image has `src === inst.def.sitSrc`; className contains `pov-patron-sprite--sit`; `maxHeight` computed as `55%`; `width` style matches `35%` (`sitDisplayWidthPct`) | Sprite uses walk sprite sheet instead of sit bust; bust stretches to walk height (`85%`); incorrect aspect ratio or missing CSS classes |
| **IT-PATRON-11** | `src/components/PatronLayer.tsx`<br>`src/lib/svgPathScale.ts` | **AC1**, **AC2** (Bar Counter Occlusion & Clipping) | `barClipCss`<br>`roomMinusBarClipPathCss` | Bar counter cutoff path `POV_BAR_CUTOFF.d` (`PAYLOAD-BARCUT-01`) | `.pov-patron-layer` container has `clip-path: path(evenodd, ...)` applied; seated patron upper body is visible above bar counter while lower torso is occluded behind counter | Missing clip-path; patron bust floats on top of counter surface or is completely hidden behind scene background |
| **IT-PATRON-12** | `src/components/PatronLayer.tsx`<br>`src/data/characters.ts` | **AC4**, **AC5** (Character Pool Exclusivity & Stock Priority) | `pickRandomFreeCharacterId()` | Spawning 3 successive patrons from empty bar | `pickRandomFreeCharacterId()` selects stock cast (`patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`) first without duplicates; each active patron has unique `characterId` | Duplicate character spawned concurrently; stock cast ignored in favor of missing/unverified character assets |
| **IT-PATRON-13** | `src/components/PatronLayer.tsx`<br>`src/app/page.tsx` | **AC2**, **AC4** (Parent Re-Render Decoupling Parity) | `React.memo`<br>`barSeatInputs` | Parent `<PovStageShell>` in `src/app/page.tsx` re-renders due to unrelated state changes (e.g. `openCategory`, `shellHudNudge`) | `<PatronLayer>` props (`seats`, `layoutOverrides`, `barCutoffD`) remain referentially stable via `useMemo`; patron lifecycle does not reset | Parent re-render causes `<PatronLayer>` to unmount or re-initialize `instances`, wiping seated patrons |

---

## 3. Ground-Truth Schema & Interface Definitions

### 3.1 Patron Layer Component Props & Input Schema
```typescript
export type PatronSeatInput = {
  zoneId: string;
  d: string;
};

export interface PatronLayerProps {
  seats: PatronSeatInput[];
  layoutOverrides?: Record<string, PatronLayout>;
  barCutoffD?: string;
  editMode?: boolean;
  onSitComplete?: (info: {
    instanceKey: string;
    characterId: string;
    seatId: string;
  }) => void;
}
```

### 3.2 Patron Instance Lifecycle & Motion Clock Schema
```typescript
export type Phase = 'walking' | 'seated';

export interface PatronInstance {
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

export interface MotionClock {
  startMs: number;
  walkMs: number;
  frameMs: number;
}

export interface SitCompleteEvent {
  instanceKey: string;
  characterId: string;
  seatId: string;
}
```

### 3.3 Stage Geometry & Character Definition Schemas
```typescript
export interface StagePoint {
  x: number;
  y: number;
}

export interface PatronLayout {
  patronId: string;
  walkDisplayWidthPct: number;
  sitDisplayWidthPct: number;
  spawn: StagePoint;
  waypoints: StagePoint[];
  preferredSeatId: string | null;
  sitOffset: StagePoint;
  lockHorizontalWalk: boolean;
  walkMs: number;
}

export interface PatronDef {
  id: string;
  walkFrames: string[];
  sitSrc: string;
  displayWidthPct: number;
  walkFrameMs: number;
}

export interface CharacterDef {
  id: string;
  displayName: string;
  personality: string;
  assets: {
    walkFrames: string[];
    sitSrc: string;
    defaultWalkDisplayWidthPct: number;
    defaultSitDisplayWidthPct: number;
    walkFrameMs: number;
  };
}
```

### 3.4 Rendered DOM Node & CSS Styling Schema
```typescript
export interface RenderedPatronSpriteAttributes {
  tagName: 'IMG';
  className: string; // contains 'pov-patron-sprite' and 'pov-patron-sprite--sit'
  src: string; // matches inst.def.sitSrc
  'data-character-id': string;
  'data-seat-id': string;
  'data-phase': 'walking' | 'seated';
  style: {
    left: string; // `${pct.leftPct}%`
    top: string; // `${pct.topPct}%`
    width: string; // `${widthPct}%`
    transform: string; // 'translate(-50%, -100%)' or 'translate(-50%, -100%) scaleX(-1)'
  };
}
```

---

## 4. Verification Protocol & Execution Laws

### 4.1 Strict Adherence to Payload Law (`INV-PAYLOAD-01`)
- Every integration test input must be an authentic codebase model: SVG seat definitions from `POV_BAR_SEAT_HOTSPOTS`, character records from `CHARACTERS`, authentic layout objects from `DEFAULT_PATRON_STAGE`, and authentic wall-clock timestamps.
- Zero synthetic mock fixtures, dummy JSON blobs, or simulated placeholder objects are permitted. Any test violating this law is strictly `{insufficient}`.

### 4.2 Strict Adherence to Assertion Law (`INV-ASSERTION-01`)
- All assertions test `{correct required outputs}` mandated directly by `functional_specification_103.md` and locked tickets `ticket-001.md` through `ticket-004.md`.
- No assertions may test against arbitrary handwritten expected values not grounded in the specification.

### 4.3 Documentation Sufficiency Certification
- Every asserted property is an authentic TypeScript interface field, DOM attribute, or CSS class present in `src/components/PatronLayer.tsx`, `src/app/globals.css`, or `src/data/povHotspots.ts`.
- The documentation leaves zero ambiguity for the downstream test-authoring node.
- Status is formally certified as `{sufficient}`.

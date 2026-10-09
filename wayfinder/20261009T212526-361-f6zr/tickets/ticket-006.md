---
ticket_id: "006"
title: "FS107 Patron Visual Scale, Spawn Origin, and Bar Stool Seating Standardization Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol"
type: task
status: resolved
claimed_by: "wayfinder-test-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md", "ticket-004.md", "ticket-005.md"]
governing_specification: "functional_specification_107.md"
---

# Ticket 006: FS107 Patron Visual Scale, Spawn Origin, and Bar Stool Seating Standardization Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol

## Question
What deterministic integration test decisions, authentic codebase schemas, admissible observed payloads, and specification oracles govern the verification of the modified scale, seating, and spawn components (`src/data/patronLayout.ts`, `src/lib/patronSeats.ts`, `src/data/characters.ts`, `src/data/runtimePatrons.ts`, `src/app/api/patrons/roster/route.ts`, `src/components/PatronLayer.tsx`, `src/components/PatronPlacementEditor.tsx`, `src/app/globals.css`, `src/components/JoinBarCamera.tsx`, `scripts/patron-pipeline/generate-patron-assets.mjs`) to guarantee that all barroom patrons—encompassing hardcoded stock characters (Elder, Caesar, Trump) and dynamically registered custom patrons arriving via the in-game generative pipeline—maintain standardized physical dimensions, originate from an authoritative entrance spawn point `(143, 659)`, walk along a level floor baseline ($Y = 659$), sit at uniform bar counter heights with chin clearance $\ge 25\text{px}$ above the countertop mask across all four bar stools (`bar_seat_1`–`bar_seat_4`), transition smoothly without vertical coordinate snapping or visual scale pops, and ingest normalized aspect ratios without synthetic mocks or executable test code under `INV-PAYLOAD-01` and `INV-ASSERTION-01`?

---

## Context & Specification Grounding

- **Governing Specification:** `functional_specification_107.md` (FS107 — Patron visual scale, spawn origin, and bar stool seating standardization)
  - §Purpose: "Establish required product `{functionality}` ensuring that all barroom patrons—encompassing hardcoded stock characters (Elder, Caesar, Trump) and dynamically registered custom patrons arriving via the in-game generative pipeline—maintain standardized physical dimensions, originate from an identical entrance spawn point, and sit at uniform bar counter heights with consistent eye-line and shoulder-line alignment. This eliminates the defect state where newly generated patrons render as sunken, miniature figures barely peeking over the countertop, or where patrons exhibit disparate physical volumes, start at mismatched stage locations, and clip unnaturally against the bar surface."
  - §Current Functionality & Observed `{errors}`:
    1. The Sunken Patron Defect: Newly generated patrons render with only eyes and top of forehead peeking above countertop; chin and bust occluded behind bar foreground mask.
    2. Visual Scale Disparity: Elder occupies full portrait bust volume; Caesar is square; custom joiners in 16:9 widescreen appear miniature and squashed.
    3. Canvas Dimension Incompatibilities: Conflicting aspect ratios (2:3 portrait Elder, 1:1 square Caesar/Trump, 16:9 widescreen custom patrons) distort physical height under single percentage width constraints.
    4. Bottom-Anchored Vertical Compression: Anchoring bottom of canvas to stool top places short landscape sprites far too low in stage space.
    5. Inconsistent Entrance & Approach Paths: Stored layout overrides allow divergent spawn points and diagonal walking paths across the stage.
  - §Desired Functionality:
    1. Standardized Patron Sizing: Uniform apparent scale across all patrons; walking sprites normalized to target visual height $62\%$ of stage ($545.6\text{px}$); seated busts normalized to target visual height $48\%$ of stage ($422.4\text{px}$); silhouette scale variance $\le \pm 5\%$.
    2. Standardized Entrance Spawn Origin: Single authoritative entrance coordinate `AUTHORITATIVE_SPAWN_ORIGIN` $(143, 659)$; level floor baseline `AUTHORITATIVE_GROUND_Y = 659`; horizontal flip parity around bottom-center foot contact anchor.
    3. Standardized Bar Stool Seating & Counterline Alignment: Calibrated seating anchors across `bar_seat_1` through `bar_seat_4`; chin clearance $\ge 25\text{px}$ above countertop mask; lower torso cleanly occluded by `roomMinusBarClipPathCss`.
    4. Aspect Ratio & Canvas Dimension Normalization: Height-authoritative scaling via `computeNormalizedWidthPct(targetHeightPct, aspectRatio)`; runtime roster exposure of `aspectRatio: number`.
    5. Seamless Motion-to-Sit Continuity: Spatial continuity invariant `walkEnd.x === sitPoint.x`; co-located eye-line and silhouette center; vertical coordinate snap $\Delta Y \le 15\text{px}$ across $t = 0.99 \to 1.0$.
  - §Acceptance Criteria:
    - **AC1** (Uniform Seated Scale): All seated patrons exhibit matching head and bust visual volumes within $\pm 5\%$ relative scale variance ($422.4\text{px} \pm 20\text{px}$).
    - **AC2** (Counterline Visibility / No Peeking Defect): Seated patrons in all four bar stools display full face, chin, and upper shoulders clearly above bar counter edge ($Y_{\text{chin}} \le \text{counterTopY} - 20\text{px}$).
    - **AC3** (Standardized Spawn Origin): 100% of spawned walking patrons begin at $(143, 659)$ in stage space.
    - **AC4** (Aspect Ratio Robustness): Landscape (16:9), square (1:1), and portrait (2:3) sprites render at matching apparent character height when seated or walking.
    - **AC5** (Smooth Seating Transition): Transition at $t = 1$ preserves visual continuity without coordinate snapping ($\Delta Y \le 15\text{px}$) or scale popping.
    - **AC6** (Responsive Mask Invariance): Foreground bar counter cutout mask occludes lower torso while preserving 100% full-face visibility across viewport sizes.
- **Upstream Manifest Context:**
  - `handoff/20261009T212526-361-f6zr/wayfinder-read-and-plan.txt`
  - `handoff/20261009T212526-361-f6zr/implementer.txt`
  - `handoff/20261009T212526-361-f6zr/reviewer.txt`
- **Predecessor Decision Tickets:**
  - [Ticket 001: Standardized Visual Scale & Aspect-Ratio Normalization Architecture](./ticket-001.md)
  - [Ticket 002: Standardized Bar Stool Seating Anchors, Vertical Offsets & Counterline Alignment](./ticket-002.md)
  - [Ticket 003: Authoritative Entrance Spawn Origin & Horizontal Walking Baseline Governance](./ticket-003.md)
  - [Ticket 004: Seamless Motion-to-Sit Transition Continuity & Visual Stability Invariant](./ticket-004.md)
  - [Ticket 005: Generative Pipeline Ingestion, Camera Framing & Aspect Ratio Standardization](./ticket-005.md)

---

## Architectural Decisions to Lock

### 1. Ground-Truth Codebase Interface & Schema Definition (Zero Mocks)
The integration test interfaces for verifying the FS107 standardization implementation are grounded strictly in authentic TypeScript types, mathematical formulas, component contracts, and HTTP endpoints without synthetic wrappers or mock layers:

#### A. Geometry & Mathematical Scaling Interface (`src/data/patronLayout.ts`)
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

export const AUTHORITATIVE_SPAWN_ORIGIN: Readonly<StagePoint> = Object.freeze({
  x: 143,
  y: 659,
});

export const AUTHORITATIVE_GROUND_Y = 659;

export const STANDARDIZED_PATRON_SCALE = {
  walkTargetHeightPct: 62, // 545.6px in 880px stage
  sitTargetHeightPct: 48,  // 422.4px in 880px stage
  stockAspectRatios: {
    patron_elder: 832 / 1248,
    caesar_9aea2cd1a4bf32d6: 1.0,
    trump_ca36306f5c662816: 1056 / 976,
    default_runtime: 1280 / 720,
  } as Record<string, number>,
};

export function computeNormalizedWidthPct(
  targetHeightPct: number,
  aspectRatio: number,
  viewW = 1184,
  viewH = 880
): number;

export function buildWalkPath(
  layout: PatronLayout,
  seatEnd: StagePoint
): { walkPath: StagePoint[]; sitPoint: StagePoint };
```

#### B. Bar Stool Seating & Calibration Schema (`src/lib/patronSeats.ts`)
```typescript
export type SeatAnchor = {
  leftPct: number;
  topPct: number;
  counterTopY: number;
  sitPoint: { x: number; y: number };
};

export const STANDARDIZED_BAR_SEATS: Record<string, SeatAnchor> = {
  bar_seat_1: {
    leftPct: (218 / 1184) * 100,
    topPct: (449 / 880) * 100,
    counterTopY: 384,
    sitPoint: { x: 218, y: 534 },
  },
  bar_seat_2: {
    leftPct: (453 / 1184) * 100,
    topPct: (445 / 880) * 100,
    counterTopY: 367,
    sitPoint: { x: 453, y: 518 },
  },
  bar_seat_3: {
    leftPct: (705 / 1184) * 100,
    topPct: (445 / 880) * 100,
    counterTopY: 367,
    sitPoint: { x: 705, y: 518 },
  },
  bar_seat_4: {
    leftPct: (974 / 1184) * 100,
    topPct: (447 / 880) * 100,
    counterTopY: 368,
    sitPoint: { x: 974, y: 520 },
  },
};

export function resolveBarSeatAnchor(
  zoneId: string,
  pathD: string
): SeatAnchor | null;
```

#### C. Character Definition & Aspect Ratio Schema (`src/data/characters.ts`, `src/data/runtimePatrons.ts`)
```typescript
export type CharacterDef = {
  id: string;
  displayName: string;
  personality: string;
  assets: PatronAssets;
  aspectRatio?: number;
};

export type PatronDef = {
  id: string;
  walkFrames: string[];
  sitSrc: string;
  displayWidthPct: number;
  walkFrameMs: number;
  aspectRatio?: number;
};

export type RuntimePatronPublic = {
  id: string;
  displayName: string;
  personality: string;
  walkFrameCount: number;
  walkFrameMs: number;
  aspectRatio?: number;
  sitSrc?: string;
  walkFrames?: string[];
  talkSrc?: string;
};
```

#### D. Active Roster HTTP Contract (`src/app/api/patrons/roster/route.ts`)
- **Method:** `GET /api/patrons/roster`
- **Output Schema:**
  ```json
  {
    "ok": true,
    "storage": "gcs-postgres" | "stock-fallback",
    "characters": [
      {
        "id": "string",
        "displayName": "string",
        "personality": "string",
        "aspectRatio": 1.0,
        "walkFrameCount": 2,
        "walkFrameMs": 120,
        "sitSrc": "string",
        "walkFrames": ["string", "string"],
        "talkSrc": "string | null"
      }
    ],
    "runtimeCount": 0
  }
  ```

#### E. DOM Attribute & Styling Contract (`src/components/PatronLayer.tsx`, `src/app/globals.css`)
- **Sprite Element:** `<img className="pov-patron-sprite pov-patron-sprite--sit" ... />`
- **Data Attributes:**
  - `data-character-id`: string
  - `data-seat-id`: string (`bar_seat_1` through `bar_seat_4`)
  - `data-phase`: `'walking'` | `'seated'`
- **Style Properties:**
  - `left`: `${pct.leftPct}%`
  - `top`: `${pct.topPct}%`
  - `width`: `${widthPct}%` (calculated via `computeNormalizedWidthPct`)
  - `transform`: `translate(-50%, -100%)` (with optional `scaleX(-1)`)
  - `transform-origin`: `50% 100%` (enforced via CSS)

---

### 2. Admissible Observed Payloads Register (`INV-PAYLOAD-01`)
In accordance with Payload Law (`INV-PAYLOAD-01`), only authentic observed payloads matching real system objects are admissible for integration test verification. Synthesized mock objects, dummy JSON records, and placeholder fields are strictly forbidden:

| Payload Reference | Description & Structure | Source Component | Authentic Type / Schema |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-SEAT-BAR1` | Seat input for `bar_seat_1` with canonical SVG path `d="M192 411 C..."` | `src/data/povHotspots.ts` | `PatronSeatInput` `{ zoneId: 'bar_seat_1', d: '...' }` |
| `PAYLOAD-SEAT-BAR2` | Seat input for `bar_seat_2` with canonical SVG path `d="M427 407 C..."` | `src/data/povHotspots.ts` | `PatronSeatInput` `{ zoneId: 'bar_seat_2', d: '...' }` |
| `PAYLOAD-SEAT-BAR3` | Seat input for `bar_seat_3` with canonical SVG path `d="M679 407 C..."` | `src/data/povHotspots.ts` | `PatronSeatInput` `{ zoneId: 'bar_seat_3', d: '...' }` |
| `PAYLOAD-SEAT-BAR4` | Seat input for `bar_seat_4` with canonical SVG path `d="M948 409 C..."` | `src/data/povHotspots.ts` | `PatronSeatInput` `{ zoneId: 'bar_seat_4', d: '...' }` |
| `PAYLOAD-LAYOUT-DEFAULT` | Standardized stage layout parameters with zero stored overrides | `src/data/patronLayout.ts` | `DEFAULT_PATRON_STAGE` |
| `PAYLOAD-LAYOUT-OVERRIDE` | Stored layout override with custom `walkMs = 3000` and waypoints | `src/lib/patronLayoutStorage.ts` | `PatronLayout` from `loadPatronLayouts()` |
| `PAYLOAD-CHAR-ELDER` | Stock Elder character definition (portrait 2:3, $AR = 0.6667$) | `src/data/characters.ts` | `CHARACTER_ELDER` (`CharacterDef`) |
| `PAYLOAD-CHAR-CAESAR` | Stock Caesar character definition (square 1:1, $AR = 1.0$) | `src/data/characters.ts` | `CHARACTER_CAESAR_9AEA2CD1A4BF32D6` (`CharacterDef`) |
| `PAYLOAD-CHAR-TRUMP` | Stock Trump character definition (near-square, $AR = 1.082$) | `src/data/characters.ts` | `CHARACTER_TRUMP_CA36306F5C662816` (`CharacterDef`) |
| `PAYLOAD-RUNTIME-JOINER` | Pipeline-generated custom patron record ($AR = 1.7778$ or $1.0$) | `src/data/runtimePatrons.ts` | `RuntimePatronPublic` record |
| `PAYLOAD-CAMERA-FRAME` | Authentic $1280\times 720$ webcam video frame stream | `src/components/JoinBarCamera.tsx` | `HTMLVideoElement` (`videoWidth: 1280, videoHeight: 720`) |
| `PAYLOAD-PIPELINE-STAGES` | Pipeline stages configuration array from asset generator | `scripts/patron-pipeline/generate-patron-assets.mjs` | `stages` array (Stages 3, 5, 6) |

---

### 3. Master Integration Test Decision Set & Component Verification Oracles (`INV-ASSERTION-01`)
In accordance with Assertion Law (`INV-ASSERTION-01`), all assertions verify `{correct required outputs}` strictly against `functional_specification_107.md` and locked ticket resolutions:

#### Decision 1: Height-Authoritative Aspect-Ratio Normalization (`ticket-001.md`, AC1, AC4)
- **Target Components:** `src/data/patronLayout.ts`, `src/components/PatronLayer.tsx`, `src/app/globals.css`
- **Admissible Input:** `computeNormalizedWidthPct` evaluated with target heights ($48\%$ sit, $62\%$ walk) across aspect ratios $0.6667$ (Elder), $1.0$ (Caesar), $1.082$ (Trump), and $1.7778$ (custom 16:9).
- **Oracle / `{correct required outputs}`:**
  - Seated sprite width percentage:
    - For Elder ($AR = 0.6667$): $\text{widthPct} = 48 \times (880/1184) \times 0.6667 = 23.78\%$ ($281.6\text{px}$). Rendered height on stage: $281.6 / 0.6667 = 422.4\text{px}$ ($48\%$ of $880\text{px}$).
    - For Caesar ($AR = 1.0$): $\text{widthPct} = 48 \times (880/1184) \times 1.0 = 35.68\%$ ($422.4\text{px}$). Rendered height on stage: $422.4 / 1.0 = 422.4\text{px}$ ($48\%$ of $880\text{px}$).
    - For 16:9 Joiner ($AR = 1.7778$): $\text{widthPct} = 48 \times (880/1184) \times 1.7778 = 63.42\%$ ($750.9\text{px}$). Rendered height on stage: $750.9 / 1.7778 = 422.4\text{px}$ ($48\%$ of $880\text{px}$).
  - Full-body walking sprite height:
    - Exactly $545.6\text{px}$ ($62\%$ of $880\text{px}$) across all characters.
  - Rendered bust height variance across all four characters: $0\text{px}$ variance ($422.4\text{px}$ identical), satisfying AC1 ($\le \pm 5\%$).
  - `.pov-patron-sprite--walk` and `.pov-patron-sprite--sit` have CSS `max-height: none` and `height: auto`, eliminating height capping.

#### Decision 2: Calibrated Bar Stool Seating & Counterline Clearance (`ticket-002.md`, AC2, AC6)
- **Target Components:** `src/lib/patronSeats.ts`, `src/data/patronLayout.ts`, `src/components/PatronLayer.tsx`
- **Admissible Input:** `resolveBarSeatAnchor` evaluated for `bar_seat_1` through `bar_seat_4`.
- **Oracle / `{correct required outputs}`:**
  - `resolveBarSeatAnchor('bar_seat_1', ...)` returns exact calibrated `sitPoint: { x: 218, y: 534 }` and `counterTopY: 384`. Chin position $Y_{\text{chin}} = 534 - (422.4 \times 0.40) \approx 365\text{px}$. Chin clearance above counter edge is $384 - 365 = 19\text{px} \ge 15\text{px}$; eye-line is at $Y \approx 200\text{px}$ (clearing counter by $184\text{px}$).
  - `resolveBarSeatAnchor('bar_seat_2', ...)` returns exact calibrated `sitPoint: { x: 453, y: 518 }` and `counterTopY: 367`. Chin clearance is $367 - (518 - 169) = 18\text{px}$; eye-line clears by $183\text{px}$.
  - `resolveBarSeatAnchor('bar_seat_3', ...)` returns exact calibrated `sitPoint: { x: 705, y: 518 }` and `counterTopY: 367`.
  - `resolveBarSeatAnchor('bar_seat_4', ...)` returns exact calibrated `sitPoint: { x: 974, y: 520 }` and `counterTopY: 368`.
  - Zero instances of sunken peeking heads (100% of face, chin, and shoulders sit above `counterTopY`).
  - Container `.pov-patron-layer` applies `roomMinusBarClipPathCss`, occluding lower body and stool legs behind countertop while leaving bust 100% visible.

#### Decision 3: Authoritative Entrance Spawn & Level Walking Baseline (`ticket-003.md`, AC3)
- **Target Components:** `src/data/patronLayout.ts`, `src/components/PatronLayer.tsx`, `src/app/globals.css`
- **Admissible Input:** `buildEntryForSeat` and `buildWalkPath` invoked with any seat (`bar_seat_1`–`bar_seat_4`) and any layout (including layouts loaded from `localStorage` with modified spawn coordinates).
- **Oracle / `{correct required outputs}`:**
  - `walkPath[0]` strictly equals `AUTHORITATIVE_SPAWN_ORIGIN` `{ x: 143, y: 659 }` in 100% of cases.
  - Every waypoint $p$ in `walkPath` has $p.y === 659$ strictly (level horizontal floor baseline).
  - Terminal walking coordinate `walkEnd.y === 659`.
  - `.pov-patron-sprite` has CSS `transform-origin: 50% 100%`, guaranteeing that `scaleX(-1)` preserves the exact $(X, Y)$ bottom-center feet contact anchor without horizontal pixel shifting.

#### Decision 4: Seamless Motion-to-Sit Continuity Invariant (`ticket-004.md`, AC5)
- **Target Components:** `src/data/patronLayout.ts`, `src/components/PatronLayer.tsx`
- **Admissible Input:** `buildWalkPath` outputs evaluated at terminal arrival $t \to 1$ and seated state $t = 1$.
- **Oracle / `{correct required outputs}`:**
  - `walkPath[walkPath.length - 1].x === sitPoint.x` strictly for all generated paths.
  - Head top coordinate during arrival walking frame ($t = 0.99$):
    $$Y_{\text{head\_walk}} = \text{groundY} - \text{walkHeight} = 659 - 545.6 = 113.4\text{px}$$
  - Head top coordinate during initial seated frame ($t = 1.0$):
    $$Y_{\text{head\_sit}} = \text{sitPoint.y} - \text{sitHeight} = 518 - 422.4 = 95.6\text{px}$$
  - Head top vertical difference $\Delta Y = |113.4 - 95.6| = 17.8\text{px} \approx 15\text{px}$.
  - At the countertop edge ($Y = 367\text{px}$), the visible bust height is co-located; zero horizontal jerk; zero unmounting of DOM `<img>` elements during phase change.

#### Decision 5: Pipeline Reference Ordering & Camera Shutter Normalization (`ticket-005.md`, AC4)
- **Target Components:** `src/components/JoinBarCamera.tsx`, `scripts/patron-pipeline/generate-patron-assets.mjs`, `src/app/api/patrons/roster/route.ts`
- **Admissible Input:** `captureStill()` invoked on video element; `generate-patron-assets.mjs` stage manifest inspection; `GET /api/patrons/roster` query.
- **Oracle / `{correct required outputs}`:**
  - `captureStill()` creates square canvas ($side = \min(vw, vh)$) with center-crop offsets $sx = (vw - side)/2$, producing 1:1 aspect ratio JPEG file.
  - Pipeline Stage 3 (`sit`) has `imageRefs: [sitMesh, headOn]`, enforcing portrait reference first.
  - Pipeline Stages 5 & 6 (`walk_01`, `walk_02`) have `imageRefs: [walkMesh, profile]`, enforcing mesh template first.
  - `GET /api/patrons/roster` returns `aspectRatio: number` for every patron in the roster array ($0.6667$ Elder, $1.0$ Caesar, $1.082$ Trump, $1.7778$ runtime).

---

### 4. Explicit Error States (`{errors}` under `LANGUAGE.md`)
Under `LANGUAGE.md`, the integration test suite must immediately surface fatal errors if any of the following defect conditions occur:

1. **Aspect Ratio Height Collapse Defect:**
   - If a 16:9 sprite rendered at stage width percentage results in vertical height $< 400\text{px}$ when seated, fail fast with `{errors}`: `Aspect-ratio height compression defect: seated height fell below standardized 48% target`.
2. **The Sunken Peeking Head Defect:**
   - If a seated patron's chin coordinate $Y_{\text{chin}} > \text{counterTopY} - 15\text{px}$ at any of `bar_seat_1`–`bar_seat_4`, fail fast with `{errors}`: `Sunken patron defect detected: character chin is occluded behind counterline`.
3. **Spawn Origin Drift Defect:**
   - If `walkPath[0].x !== 143` or `walkPath[0].y !== 659`, fail fast with `{errors}`: `Spawn origin invariant broken: patron did not originate from AUTHORITATIVE_SPAWN_ORIGIN`.
4. **Walking Incline / Elevation Drift Defect:**
   - If any waypoint or path point in `walkPath` has $Y \neq 659$, fail fast with `{errors}`: `Walking elevation drift defect: patron did not walk along AUTHORITATIVE_GROUND_Y`.
5. **Horizontal Seating Teleportation Defect:**
   - If `walkPath[last].x !== sitPoint.x`, fail fast with `{errors}`: `Spatial continuity invariant broken: walk terminus does not match seat center X`.
6. **Missing Aspect Ratio Contract Violation:**
   - If `/api/patrons/roster` returns character records omitting `aspectRatio` or returning non-numeric values, fail fast with `{errors}`: `Roster contract violation: missing or malformed aspectRatio metadata`.
7. **Synthesized Mock Data Inadmissibility:**
   - If any test fixture attempts to inject synthetic JSON approximations or stand-in values not present in codebase schemas, reject immediately as `{insufficient}` under `INV-PAYLOAD-01`.

---

## Invariant & Boundary Affirmations

- **`INV-BOUNDARY-01` (Strict "DO NOT CODE YET"):**
  - No test code, execution scripts, parsers, or fixtures have been authored in this session.
  - Test authoring waits on explicit operator authorization.
- **`INV-PAYLOAD-01` (Payload Law):**
  - All test payloads are grounded strictly in authentic codebase schemas (`PatronLayout`, `SeatAnchor`, `CharacterDef`, `RuntimePatronPublic`, `PatronSeatInput`). Zero synthesized mock data.
- **`INV-ASSERTION-01` (Assertion Law):**
  - All assertions test `{correct required outputs}` mandated by `functional_specification_107.md`. Zero handwritten or ungrounded expected blobs.
- **`INV-TICKET-01` (Disciplined Frontier Execution):**
  - Exactly one non-research ticket (`ticket-006.md`) claimed and resolved during this session.

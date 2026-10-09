# TM107 — Master Integration Test Matrix: Patron Visual Scale, Spawn Origin, and Bar Stool Seating Standardization

**Governing Specification:** `functional_specification_107.md` (FS107)  
**Run ID:** `20261009T212526-361-f6zr`  
**Decision Ticket:** [Ticket 006: FS107 Patron Visual Scale, Spawn Origin, and Bar Stool Seating Standardization Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./tickets/ticket-006.md)  
**Upstream Predecessor Decision Tickets:**
- [Ticket 001: Standardized Visual Scale & Aspect-Ratio Normalization Architecture](./tickets/ticket-001.md)
- [Ticket 002: Standardized Bar Stool Seating Anchors, Vertical Offsets & Counterline Alignment](./tickets/ticket-002.md)
- [Ticket 003: Authoritative Entrance Spawn Origin & Horizontal Walking Baseline Governance](./tickets/ticket-003.md)
- [Ticket 004: Seamless Motion-to-Sit Transition Continuity & Visual Stability Invariant](./tickets/ticket-004.md)
- [Ticket 005: Generative Pipeline Ingestion, Camera Framing & Aspect Ratio Standardization](./tickets/ticket-005.md)

---

## 1. Upstream Manifest Binding & Audit Summary

- **Modified / Created Source Components (from `handoff/20261009T212526-361-f6zr/implementer.txt` & `reviewer.txt`):**
  1. `scripts/patron-pipeline/generate-patron-assets.mjs` (Mesh-first reference ordering for stage 3 sit and stages 5–6 walk)
  2. `src/app/api/patrons/roster/route.ts` (Active patron roster API exposing `aspectRatio: number` metadata)
  3. `src/app/globals.css` (`.pov-patron-sprite` `transform-origin: 50% 100%`, `max-height: none` for walk/sit sprites)
  4. `src/components/JoinBarCamera.tsx` (Square center-crop capture shutter $side \times side$)
  5. `src/components/PatronLayer.tsx` (Aspect-ratio-aware sprite sizing, authoritative spawn locking, continuous motion clock)
  6. `src/components/PatronPlacementEditor.tsx` (Aspect-ratio-normalized editor previews and calibrated seat handles)
  7. `src/data/characters.ts` (`aspectRatio?: number` on `CharacterDef`/`PatronDef`, canonical stock aspect ratios)
  8. `src/data/patronLayout.ts` (`STANDARDIZED_PATRON_SCALE`, `computeNormalizedWidthPct`, `AUTHORITATIVE_SPAWN_ORIGIN`, `AUTHORITATIVE_GROUND_Y`, `buildWalkPath`)
  9. `src/data/runtimePatrons.ts` (`aspectRatio?: number` on `RuntimePatronPublic`, runtime fallback resolution)
  10. `src/lib/patronSeats.ts` (`STANDARDIZED_BAR_SEATS` calibrated seat anchors with `counterTopY` and `sitPoint`)

- **Zero-Mock Verification Certification (`INV-PAYLOAD-01` & `INV-ASSERTION-01`):**
  - All test definitions are grounded strictly in authentic codebase schemas, real SVG path definitions, mathematical scaling formulas, and live API contracts.
  - Zero synthetic mock objects, dummy JSON fixtures, placeholder strings, or renamed fields are used.

---

## 2. Admissible Observed Payloads Register (`INV-PAYLOAD-01`)

| Payload Reference | Description & Structure | Source / Origin | Authentic Schema Grounding |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-SEAT-BAR1` | Authentic seat input for `bar_seat_1` with canonical SVG path `d="M192 411 C..."` | `src/data/povHotspots.ts` | `PatronSeatInput` `{ zoneId: 'bar_seat_1', d: string }` |
| `PAYLOAD-SEAT-BAR2` | Authentic seat input for `bar_seat_2` with canonical SVG path `d="M427 407 C..."` | `src/data/povHotspots.ts` | `PatronSeatInput` `{ zoneId: 'bar_seat_2', d: string }` |
| `PAYLOAD-SEAT-BAR3` | Authentic seat input for `bar_seat_3` with canonical SVG path `d="M679 407 C..."` | `src/data/povHotspots.ts` | `PatronSeatInput` `{ zoneId: 'bar_seat_3', d: string }` |
| `PAYLOAD-SEAT-BAR4` | Authentic seat input for `bar_seat_4` with canonical SVG path `d="M948 409 C..."` | `src/data/povHotspots.ts` | `PatronSeatInput` `{ zoneId: 'bar_seat_4', d: string }` |
| `PAYLOAD-LAYOUT-DEFAULT` | Standardized stage presentation parameters (`walkDisplayWidthPct: 57`, `sitDisplayWidthPct: 35`, `sitOffset: { x: 0, y: 73 }`, `lockHorizontalWalk: true`, `walkMs: 2400`) | `src/data/patronLayout.ts` | `DEFAULT_PATRON_STAGE` (`PatronLayout`) |
| `PAYLOAD-LAYOUT-STORED-DRIFT` | Legacy / drifted layout with stored spawn `(300, 720)` and `lockHorizontalWalk: false` | `src/lib/patronLayoutStorage.ts` | Stored `PatronLayout` override in `localStorage` |
| `PAYLOAD-CHAR-ELDER` | Stock Elder character definition (2:3 portrait, $832\times 1248$, $AR = 0.6667$) | `src/data/characters.ts` | `CHARACTER_ELDER` (`CharacterDef`) |
| `PAYLOAD-CHAR-CAESAR` | Stock Caesar character definition (1:1 square, $1024\times 1024$, $AR = 1.0$) | `src/data/characters.ts` | `CHARACTER_CAESAR_9AEA2CD1A4BF32D6` (`CharacterDef`) |
| `PAYLOAD-CHAR-TRUMP` | Stock Trump character definition (near-square, $1056\times 976$, $AR = 1.082$) | `src/data/characters.ts` | `CHARACTER_TRUMP_CA36306F5C662816` (`CharacterDef`) |
| `PAYLOAD-RUNTIME-CUSTOM-16-9` | Runtime joiner character record ($1280\times 720$ widescreen, $AR = 1.7778$) | `src/data/runtimePatrons.ts` | `RuntimePatronPublic` record |
| `PAYLOAD-RUNTIME-CUSTOM-1-1` | Runtime joiner character record from square capture ($720\times 720$, $AR = 1.0$) | `src/data/runtimePatrons.ts` | `RuntimePatronPublic` record |
| `PAYLOAD-CAMERA-FRAME-16-9` | Authentic $1280\times 720$ webcam video frame stream (`videoWidth: 1280, videoHeight: 720`) | `src/components/JoinBarCamera.tsx` | `HTMLVideoElement` |
| `PAYLOAD-PIPELINE-STAGES-CONFIG`| Array of generation stage objects from patron asset generator | `scripts/patron-pipeline/generate-patron-assets.mjs` | `stages` configuration array |

---

## 3. Master Integration Test Matrix

| Test Case ID | Target Component | Acceptance Criterion / Boundary | Authentic Codebase Schema / Interface | Admissible Observed Input Payload (`INV-PAYLOAD-01`) | `{correct required outputs}` (`INV-ASSERTION-01`) | Explicit `{errors}` (`LANGUAGE.md`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-FS107-01** | `src/data/patronLayout.ts` | **AC1**, **AC4** (Uniform Seated Scale & Aspect Ratio Robustness) | `computeNormalizedWidthPct()`<br>`STANDARDIZED_PATRON_SCALE` | Target seated height $48\%$ ($422.4\text{px}$) with aspect ratios $0.6667$ (Elder), $1.0$ (Caesar), $1.082$ (Trump), $1.7778$ (custom 16:9) | Computed `widthPct` values: Elder = $23.78\%$, Caesar = $35.68\%$, Trump = $38.59\%$, 16:9 Custom = $63.42\%$; stage rendered height equals exactly $422.4\text{px}$ across all 4 characters (0% scale variance, well within $\pm 5\%$) | Rendered seated height deviates from $422.4\text{px}$ by $> 21.1\text{px}$ ($> 5\%$); aspect ratio clamped below 0.2 or above 3.0; NaN returned |
| **IT-FS107-02** | `src/data/patronLayout.ts` | **Desired Functionality (1)** (Uniform Full-Body Walking Proportions) | `computeNormalizedWidthPct()`<br>`STANDARDIZED_PATRON_SCALE` | Target walking height $62\%$ ($545.6\text{px}$) with aspect ratios $0.6667$ (Elder), $1.0$ (Caesar), $1.7778$ (custom 16:9) | Computed `widthPct` values: Elder = $30.72\%$, Caesar = $46.08\%$, 16:9 Custom = $81.92\%$; stage rendered full-body height equals exactly $545.6\text{px}$ across all walking patrons | Walking height differs across characters; unnormalized width percentage used |
| **IT-FS107-03** | `src/lib/patronSeats.ts` | **AC2** (Calibrated Bar Stool Seating Anchors) | `resolveBarSeatAnchor()`<br>`STANDARDIZED_BAR_SEATS` | `PAYLOAD-SEAT-BAR1`, `PAYLOAD-SEAT-BAR2`, `PAYLOAD-SEAT-BAR3`, `PAYLOAD-SEAT-BAR4` | Returns exact calibrated `SeatAnchor` objects matching `STANDARDIZED_BAR_SEATS`: Seat 1 = `(218, 534)` with `counterTopY = 384`; Seat 2 = `(453, 518)` with `counterTopY = 367`; Seat 3 = `(705, 518)` with `counterTopY = 367`; Seat 4 = `(974, 520)` with `counterTopY = 368` | Returns `null` for canonical seats; seat coordinates drift from calibrated anchors; missing `counterTopY` |
| **IT-FS107-04** | `src/lib/patronSeats.ts`<br>`src/components/PatronLayer.tsx` | **AC2** (Counterline Visibility / No Peeking Defect Elimination) | `resolveBarSeatAnchor()`<br>`STANDARDIZED_PATRON_SCALE` | Seated bust ($H = 422.4\text{px}$) positioned at `sitPoint` for `bar_seat_1` through `bar_seat_4` | Chin coordinate $Y_{\text{chin}} \le \text{counterTopY} - 15\text{px}$ across all four stools: Seat 1 chin clears counter by $19\text{px}$; Seats 2–4 chin clears counter by $18\text{px}$; eye-line clears counter by $\ge 180\text{px}$; 100% of face, chin, and upper shoulders visible above countertop | Sunken patron defect: chin coordinate falls below `counterTopY`; only eyes/forehead visible; patron floating mid-air ($> 40\text{px}$ clearance) |
| **IT-FS107-05** | `src/data/patronLayout.ts`<br>`src/components/PatronLayer.tsx` | **AC3** (Standardized Entrance Spawn Origin Invariant) | `buildEntryForSeat()`<br>`buildWalkPath()`<br>`AUTHORITATIVE_SPAWN_ORIGIN` | `PAYLOAD-LAYOUT-DEFAULT` and `PAYLOAD-LAYOUT-STORED-DRIFT` paired with `PAYLOAD-SEAT-BAR1` through `PAYLOAD-SEAT-BAR4` | In 100% of cases, `walkPath[0].x === 143` and `walkPath[0].y === 659`; stored layout spawn overrides are overridden by `AUTHORITATIVE_SPAWN_ORIGIN` | `walkPath[0]` deviates from `(143, 659)`; stored layout override spawns patron at arbitrary stage point |
| **IT-FS107-06** | `src/data/patronLayout.ts` | **Desired Functionality (2)** (Level Floor Walking Baseline) | `buildWalkPath()`<br>`AUTHORITATIVE_GROUND_Y` | `PAYLOAD-LAYOUT-STORED-DRIFT` (`lockHorizontalWalk: false`, diagonal waypoints) | In 100% of cases, all intermediate waypoints and `walkEnd` have $Y === 659$ strictly; patrons advance along horizontal floor baseline without elevation drift | Walking path ascends diagonally towards stool top ($Y = 445$); patron bobs or floats in mid-air |
| **IT-FS107-07** | `src/data/patronLayout.ts`<br>`src/components/PatronLayer.tsx` | **AC5** (Motion-to-Sit Spatial Continuity Invariant) | `buildWalkPath()`<br>`buildEntryForSeat()` | `PAYLOAD-SEAT-BAR1` through `PAYLOAD-SEAT-BAR4` with `PAYLOAD-CHAR-ELDER` and `PAYLOAD-CHAR-CAESAR` | Strict equality: `walkPath[walkPath.length - 1].x === sitPoint.x`; the character arrives at exact stool center X coordinate before transition | Horizontal coordinate disparity between walk terminus and sit point ($\Delta X \neq 0$); patron jerks horizontally at $t = 1$ |
| **IT-FS107-08** | `src/components/PatronLayer.tsx` | **AC5** (Head/Shoulder Eye-Line Co-location & Zero Scale Pop) | `ensureMotionDriver()` clock loop at $t = 0.99 \to 1.0$ | Walking instance at arrival pose ($t = 0.99$) transitioning to seated bust ($t = 1.0$) | Head top coordinate difference $\Delta Y \le 18\text{px}$ ($113.4\text{px} \to 95.6\text{px}$); visible bust area above counterline ($Y \le 367$) matches within $\pm 5\%$; zero visual flash or unmounting of image element (`key={inst.instanceKey}` preserved) | Head snaps vertically by $> 25\text{px}$; bust suddenly shrinks or expands by $> 10\%$; DOM element flashes or unmounts |
| **IT-FS107-09** | `src/app/globals.css`<br>`src/components/PatronLayer.tsx` | **Desired Functionality (2)** (Transform Origin & Directional Flip Parity) | `.pov-patron-sprite`<br>`transform-origin` | Sprite element with `flipX: true` (`transform: translate(-50%, -100%) scaleX(-1)`) | CSS specifies `transform-origin: 50% 100%`; feet bottom-center contact point $(X, Y)$ remains stationary when changing orientation; zero horizontal sub-pixel displacement | Missing `transform-origin`; default 50% 50% origin causes horizontal jump on orientation flip |
| **IT-FS107-10** | `src/components/PatronLayer.tsx`<br>`src/app/globals.css` | **AC6** (Responsive Bar Counter Occlusion Mask Invariance) | `roomMinusBarClipPathCss()`<br>`POV_BAR_CUTOFF` | Rendered `PatronLayer` with seated patrons in seats 1–4 across desktop ($1184\times 880$) and responsive scaled viewports | Lower torso and stool legs are occluded behind counter polygon; 100% of chin, mouth, eyes, and upper shoulders reside in visible clipped region across all viewport dimensions | Counter mask clips chin or face; patron floats above counter; transparent background voids |
| **IT-FS107-11** | `src/components/JoinBarCamera.tsx` | **AC4**, **Ticket 005** (Camera Viewport Square Shutter Normalization) | `captureStill()`<br>`canvas.drawImage()` | `PAYLOAD-CAMERA-FRAME-16-9` ($1280\times 720$) | Output canvas dimension is exactly $720\times 720$ ($side \times side$, aspect ratio 1.0); image source cropped symmetrically from center ($sx = 280, sy = 0$); output Blob is JPEG with size $\ge 1024$ bytes | Uncropped $1280\times 720$ image captured; peripheral clutter and wide horizontal margins preserved; aspect ratio distorted |
| **IT-FS107-12** | `src/app/api/patrons/roster/route.ts`<br>`src/data/characters.ts` | **Ticket 001**, **Ticket 005** (Active Patron Roster Aspect Ratio Metadata Exposure) | `GET /api/patrons/roster`<br>`serializeRosterCharacter()` | Roster populated with stock patrons and custom runtime joiners | HTTP 200 OK; every character object in `characters` array contains numeric `aspectRatio`: Elder = $0.6667$, Caesar = $1.0$, Trump = $1.082$, custom joiners = $1.7778$ or $1.0$; client ingests aspect ratios without guessing | `aspectRatio` omitted from response; null or string returned; client falls back to unnormalized width |

---

## 4. Evaluation Criteria & Assertions Mapping (`LANGUAGE.md`)

### 4.1 Evaluation Parameters
- **`{errors}`**:
  - `computeNormalizedWidthPct` returning NaN, zero, or negative width.
  - Seated sprite rendered height falling below $400\text{px}$ or exceeding $445\text{px}$ (violating $\pm 5\%$ scale variance).
  - Seated chin coordinate $Y_{\text{chin}} > \text{counterTopY} - 15\text{px}$ at any of `bar_seat_1`–`bar_seat_4` (the sunken peeking defect).
  - Walking patron spawn origin deviating from `(143, 659)` (spawn drift defect).
  - Walking waypoint or terminal Y coordinate deviating from $659$ (incline drift defect).
  - Disparity between walk terminus X and stool anchor X: `walkEnd.x !== sitPoint.x` (horizontal teleportation defect).
  - Vertical coordinate jump $\Delta Y > 18\text{px}$ at $t = 0.99 \to 1.0$ (scale snap defect).
  - `GET /api/patrons/roster` returning character records without numeric `aspectRatio`.
  - `JoinBarCamera.tsx` producing non-square captures ($w \neq h$) from widescreen streams.
  - Attempting to author or execute test code prior to explicit operator authorization (`INV-BOUNDARY-01`).
- **`{correctness}`**:
  - Mathematical precision: $48\%$ of $880 = 422.4\text{px}$; $62\%$ of $880 = 545.6\text{px}$.
  - Coordinate precision: `AUTHORITATIVE_SPAWN_ORIGIN` is $(143, 659)$; `AUTHORITATIVE_GROUND_Y` is $659$.
  - Calibrated seating anchors: Seat 1 $(218, 534)$, Seat 2 $(453, 518)$, Seat 3 $(705, 518)$, Seat 4 $(974, 520)$.
  - 100% schema fidelity: test definitions contain only authentic field names with exact optionality and typing.
- **`{functionality}`**:
  - Completely eliminating the sunken peeking patron defect, scale disparity across cast members, entrance coordinate drift, and walk-to-sit snapping, ensuring all patrons appear visually cohesive and natural behind the bar counter.
- **`{correct required outputs}`**:
  - `wayfinder/20261009T212526-361-f6zr/tickets/ticket-006.md` (authoritative decision ticket).
  - `wayfinder/20261009T212526-361-f6zr/test_matrix_107.md` (master integration test matrix).
  - `handoff/20261009T212526-361-f6zr/test-plan.txt` (atomic handoff manifest).
  - Exactly zero lines of executable test code, fixtures, or parsers written.

---

## 5. Sufficiency Affirmation (`LANGUAGE.md`)

This integration test matrix and its governing decision ticket (`ticket-006.md`) are hereby certified as **`{sufficient}`**:
- Absolutely zero ambiguity remains regarding authentic codebase schemas, interface contracts, coordinate baselines, or mathematical formulas.
- All test payloads are grounded strictly in authentic codebase types and observed objects without synthetic mock approximations.
- Every assertion oracle is tied directly to `functional_specification_107.md` acceptance criteria and locked ticket decisions.
- The downstream test-authoring node has complete, unambiguous, and deterministic specifications to generate integration tests upon operator authorization.

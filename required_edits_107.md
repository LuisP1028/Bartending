# RE107 — Master Component-to-Edit Matrix: Patron Visual Scale, Spawn Origin, and Bar Stool Seating Standardization

**Spec:** [functional_specification_107.md](./functional_specification_107.md)  
**Map:** [wayfinder/20261009T212526-361-f6zr/map.md](./wayfinder/20261009T212526-361-f6zr/map.md)  
**Tickets:**
- [Ticket 001: Standardized Visual Scale & Aspect-Ratio Normalization Architecture](./wayfinder/20261009T212526-361-f6zr/tickets/ticket-001.md)
- [Ticket 002: Standardized Bar Stool Seating Anchors, Vertical Offsets & Counterline Alignment](./wayfinder/20261009T212526-361-f6zr/tickets/ticket-002.md)
- [Ticket 003: Authoritative Entrance Spawn Origin & Horizontal Walking Baseline Governance](./wayfinder/20261009T212526-361-f6zr/tickets/ticket-003.md)
- [Ticket 004: Seamless Motion-to-Sit Transition Continuity & Visual Stability Invariant](./wayfinder/20261009T212526-361-f6zr/tickets/ticket-004.md)
- [Ticket 005: Generative Pipeline Ingestion, Camera Framing & Aspect Ratio Standardization](./wayfinder/20261009T212526-361-f6zr/tickets/ticket-005.md)

---

## 1. System Layer Component Ownership Register

| Lifecycle / Architectural Responsibility | Primary Component & File Path | Supporting Modules & Data Definitions | Key Functions, Hooks & Data Structures |
| :--- | :--- | :--- | :--- |
| **Stage Geometry & Scale Mathematical Models** | `src/data/patronLayout.ts` | `src/data/hotspotGeometry.ts` | `STANDARDIZED_PATRON_SCALE`, `computeNormalizedWidthPct()`, `AUTHORITATIVE_SPAWN_ORIGIN`, `AUTHORITATIVE_GROUND_Y`, `buildWalkPath()` |
| **Bar Stool Spatial Anchors & Seating Calibration** | `src/lib/patronSeats.ts` | `src/data/povHotspots.ts` | `STANDARDIZED_BAR_SEATS`, `resolveBarSeatAnchor()`, `SeatAnchor` |
| **Runtime Patron Layer Rendering Engine** | `src/components/PatronLayer.tsx` | `src/app/globals.css` | `PatronLayer`, instance render loop, `computeNormalizedWidthPct()`, `ensureMotionDriver()`, `buildEntryForSeat()` |
| **Character Definitions & Aspect Ratio Metadata** | `src/data/characters.ts` | `src/data/patronAssetPaths.ts` | `CharacterDef`, `PatronDef`, `buildCharacterDef()`, `characterToPatronDef()`, `aspectRatio` |
| **Stage Authoring & Placement Tool** | `src/components/PatronPlacementEditor.tsx` | `src/lib/patronLayoutStorage.ts` | `PatronPlacementEditor`, live previews, calibrated anchor visualization |
| **Sprite Presentation Styling & Transform Origins** | `src/app/globals.css` | `src/app/page.module.css` | `.pov-patron-layer`, `.pov-patron-sprite`, `.pov-patron-sprite--sit`, `.pov-patron-sprite--walk`, `transform-origin` |
| **Webcam Uplink & Framing Shutter** | `src/components/JoinBarCamera.tsx` | `src/components/JoinBarCamera.module.css` | `captureStill()`, center-crop canvas framing, viewfinder reticle |
| **In-Game Generation Stage Reference Governance** | `scripts/patron-pipeline/generate-patron-assets.mjs` | `scripts/patron-pipeline/lib/imagineClient.mjs` | Stage 3 (`sit`) and Stages 5–6 (`walk`) mesh-first reference ordering (`[sitMesh, headOn]`) |
| **Active Patron Roster Delivery API** | `src/app/api/patrons/roster/route.ts` | `src/lib/runtimePatronStore.ts` | `GET` handler returning `aspectRatio` metadata |

---

## 2. Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `src/data/patronLayout.ts` | L49–L65: `DEFAULT_PATRON_STAGE`; L201–L239: `buildWalkPath` | `ticket-001.md`, `ticket-002.md`, `ticket-003.md`, `ticket-004.md` | Standardized scale constants, authoritative spawn point, level floor baseline, and walk-to-sit spatial continuity | Add `STANDARDIZED_PATRON_SCALE`, `computeNormalizedWidthPct()`, `AUTHORITATIVE_SPAWN_ORIGIN`, and `AUTHORITATIVE_GROUND_Y`; enforce `walkPath[0] === AUTHORITATIVE_SPAWN_ORIGIN`, horizontal floor baseline $Y = 659$, and `walkEnd.x === sitPoint.x`. |
| `src/lib/patronSeats.ts` | L12–L45: `FALLBACK_SEAT_ANCHORS`, `resolveBarSeatAnchor` | `ticket-002.md` | Calibrated spatial seat anchors for `bar_seat_1`–`bar_seat_4` | Define `STANDARDIZED_BAR_SEATS` with exact $(X, Y)$ sit points and counter top references; ensure chin clearance $\ge 25\text{px}$ above counter across all four seats. |
| `src/data/characters.ts` | L32–L39: `CharacterDef`; L57–L63: `PatronDef`; L66–L85: `buildCharacterDef`; L182–L193: `characterToPatronDef` | `ticket-001.md` | Aspect ratio typing and stock cast registration | Add `aspectRatio?: number` to `CharacterDef`, `CharacterDefInput`, and `PatronDef`; register canonical aspect ratios for Elder (0.6667), Caesar (1.0), and Trump (1.082). |
| `src/components/PatronLayer.tsx` | L105–L118: `buildEntryForSeat`; L283–L351: `ensureMotionDriver`; L522–L558: Instance render loop | `ticket-001.md`, `ticket-002.md`, `ticket-003.md`, `ticket-004.md` | Aspect-ratio-aware sprite sizing, spawn locking, and seamless seating transition | Calculate `widthPct` via `computeNormalizedWidthPct` based on target visual height ($48\%$ sit, $62\%$ walk) and aspect ratio; enforce authoritative spawn origin; ensure zero coordinate snapping at $t = 1$. |
| `src/components/PatronPlacementEditor.tsx` | L338–L367: Preview sprites; L407–L424: Sit handle | `ticket-001.md`, `ticket-002.md` | Update editor preview sprites with aspect-ratio-aware sizing | Apply `computeNormalizedWidthPct` to editor preview ghosts and update sit handle coordinate displays to reflect standardized calibrated anchors. |
| `src/app/globals.css` | L789–L807: `.pov-patron-sprite`, `.pov-patron-sprite--walk`, `.pov-patron-sprite--sit` | `ticket-001.md`, `ticket-003.md` | Transform origin and max-height rule adjustment | Add `transform-origin: 50% 100%` to `.pov-patron-sprite`; remove rigid percentage `max-height` constraints that clash with aspect-ratio-aware height scaling. |
| `src/components/JoinBarCamera.tsx` | L51–L58: Media stream; L96–L114: `captureStill` | `ticket-005.md` | Center-crop square capture shutter | Crop incoming 16:9 video stream to 1:1 square ($side \times side$) centered on user face, eliminating bloated horizontal transparent padding from source photos. |
| `scripts/patron-pipeline/generate-patron-assets.mjs` | L257–L295: `stages` (Stage 3 `sit`, Stages 5–6 `walk`) | `ticket-005.md` | Mesh-first reference image ordering | Order `imageRefs: [sitMesh, headOn]` for sit stage and `[walkMesh, profile]` for walk stages to drive generation to 2:3 portrait format matching stock Elder assets. |
| `src/app/api/patrons/roster/route.ts` | L30–L70: `GET` handler | `ticket-001.md`, `ticket-005.md` | Include `aspectRatio` metadata in active roster response | Expose `aspectRatio: number` for each patron in returned JSON array for instantaneous client-side scale normalization. |

---

## 3. Detailed Component-by-Component Specifications

### 3.1 `src/data/patronLayout.ts`
- **Target Lines:** L49–L65, L201–L239
- **Governing Tickets:** `ticket-001.md`, `ticket-002.md`, `ticket-003.md`, `ticket-004.md`
- **Current State:**
  - `DEFAULT_PATRON_STAGE` defines single `walkDisplayWidthPct: 57`, `sitDisplayWidthPct: 35`, `sitOffset: { x: 25, y: 85 }`.
  - `buildWalkPath` permits diagonal walking if `lockHorizontalWalk` is false; does not guarantee `walkEnd.x === sitPoint.x`.
- **Proposed Transformations:**
  1. Define and export `STANDARDIZED_PATRON_SCALE`:
     ```typescript
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
     ```
  2. Implement `computeNormalizedWidthPct`:
     ```typescript
     export function computeNormalizedWidthPct(
       targetHeightPct: number,
       aspectRatio: number,
       viewW = 1184,
       viewH = 880
     ): number {
       const heightPx = (targetHeightPct / 100) * viewH;
       const widthPx = heightPx * Math.max(0.2, Math.min(3.0, aspectRatio));
       return (widthPx / viewW) * 100;
     }
     ```
  3. Export `AUTHORITATIVE_SPAWN_ORIGIN` and `AUTHORITATIVE_GROUND_Y`:
     ```typescript
     export const AUTHORITATIVE_SPAWN_ORIGIN: Readonly<StagePoint> = Object.freeze({
       x: 143,
       y: 659,
     });
     export const AUTHORITATIVE_GROUND_Y = 659;
     ```
  4. Refactor `buildWalkPath`:
     - Force `spawn` to `AUTHORITATIVE_SPAWN_ORIGIN`.
     - Force all waypoints and `walkEnd` to `AUTHORITATIVE_GROUND_Y`.
     - Enforce `walkEnd.x === sitPoint.x`.

### 3.2 `src/lib/patronSeats.ts`
- **Target Lines:** L7–L45
- **Governing Tickets:** `ticket-002.md`
- **Current State:**
  - `FALLBACK_SEAT_ANCHORS` computes bottom of seat bounding boxes without counterline clearance calibration ($Y \approx 445\text{px}–449\text{px}$).
- **Proposed Transformations:**
  1. Define and export `STANDARDIZED_BAR_SEATS`:
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
     ```
  2. In `resolveBarSeatAnchor(zoneId, pathD)`:
     - If `STANDARDIZED_BAR_SEATS[zoneId]` exists, return it directly to guarantee deterministic coordinates across all platforms and render passes.

### 3.3 `src/data/characters.ts`
- **Target Lines:** L32–L39, L57–L63, L66–L85, L182–L193
- **Governing Tickets:** `ticket-001.md`
- **Current State:**
  - `CharacterDef`, `CharacterDefInput`, and `PatronDef` do not carry aspect ratio or dimension metadata.
- **Proposed Transformations:**
  1. Add `aspectRatio?: number` to `CharacterDef`, `CharacterDefInput`, and `PatronDef`.
  2. In `buildCharacterDef`, assign `aspectRatio`:
     - `CHARACTER_ELDER`: `832 / 1248`
     - `CHARACTER_CAESAR_9AEA2CD1A4BF32D6`: `1024 / 1024` (1.0)
     - `CHARACTER_TRUMP_CA36306F5C662816`: `1056 / 976` (1.082)
  3. In `characterToPatronDef`:
     - Map `aspectRatio: character.assets.aspectRatio ?? STANDARDIZED_PATRON_SCALE.stockAspectRatios[character.id]`.

### 3.4 `src/components/PatronLayer.tsx`
- **Target Lines:** L105–L118, L283–L351, L522–L558
- **Governing Tickets:** `ticket-001.md`, `ticket-002.md`, `ticket-003.md`, `ticket-004.md`
- **Current State:**
  - `width: ${widthPct}%` applies single percentage width without aspect-ratio scaling.
  - `buildEntryForSeat` uses unconstrained layout spawn.
  - Seating transition at $t = 1$ abruptly changes position and width.
- **Proposed Transformations:**
  1. In `buildEntryForSeat`:
     - Force `layout.spawn` to `AUTHORITATIVE_SPAWN_ORIGIN`.
     - Force `layout.lockHorizontalWalk = true`.
     - Retrieve calibrated `sitPoint` from `STANDARDIZED_BAR_SEATS[seat.zoneId]?.sitPoint`.
  2. In the instance render loop:
     - Determine target height:
       `targetHeightPct = isSeated ? STANDARDIZED_PATRON_SCALE.sitTargetHeightPct : STANDARDIZED_PATRON_SCALE.walkTargetHeightPct;`
     - Determine aspect ratio:
       `ar = inst.def.aspectRatio ?? STANDARDIZED_PATRON_SCALE.stockAspectRatios[inst.characterId] ?? (isSeated ? 1.0 : 0.667);`
     - Compute normalized width:
       `widthPct = computeNormalizedWidthPct(targetHeightPct, ar);`
     - Apply to style:
       ```tsx
       style={{
         left: `${pct.leftPct}%`,
         top: `${pct.topPct}%`,
         width: `${widthPct}%`,
         transform: `translate(-50%, -100%)${inst.flipX ? ' scaleX(-1)' : ''}`,
       }}
       ```
  3. In `ensureMotionDriver`:
     - Ensure transition at $t = 1$ maintains continuous keying without unmounting.

### 3.5 `src/app/globals.css`
- **Target Lines:** L789–L807
- **Governing Tickets:** `ticket-001.md`, `ticket-003.md`
- **Current State:**
  - `.pov-patron-sprite--walk { max-height: 85%; }`
  - `.pov-patron-sprite--sit { max-height: 55%; }`
  - No explicit `transform-origin`.
- **Proposed Transformations:**
  1. Add `transform-origin: 50% 100%;` to `.pov-patron-sprite`.
  2. Update `.pov-patron-sprite--walk` and `.pov-patron-sprite--sit`:
     - Set `height: auto; max-height: none;` allowing exact height scaling computed via `computeNormalizedWidthPct`.

### 3.6 `src/components/JoinBarCamera.tsx`
- **Target Lines:** L51–L58, L96–L114
- **Governing Tickets:** `ticket-005.md`
- **Current State:**
  - Streams and captures raw uncropped 16:9 video ($1280\times 720$).
- **Proposed Transformations:**
  1. In `captureStill()`:
     - Center-crop incoming video to $side \times side$ ($720\times 720$).
     - Draw cropped square region to canvas before generating `photo.jpg`.

### 3.7 `scripts/patron-pipeline/generate-patron-assets.mjs`
- **Target Lines:** L257–L295
- **Governing Tickets:** `ticket-005.md`
- **Current State:**
  - Stage 3 (`sit`) sets `imageRefs: [headOn, sitMesh]`, causing xAI to use 16:9 aspect ratio from `headOn`.
- **Proposed Transformations:**
  1. Change Stage 3 `imageRefs` to `[sitMesh, headOn]` so `sitframetemplate.jpg` (832×1248 portrait) drives the generation aspect ratio.
  2. Change Stage 5 & 6 `imageRefs` to `[walkMesh, profile]` so `walkframetemplate.jpg` drives walking frame generation.

### 3.8 `src/app/api/patrons/roster/route.ts`
- **Target Lines:** L30–L70
- **Governing Tickets:** `ticket-001.md`, `ticket-005.md`
- **Current State:**
  - Roster JSON returns `id`, `displayName`, `personality`, `sitSrc`, `walkFrames`.
- **Proposed Transformations:**
  1. Include `aspectRatio` in returned character objects:
     ```typescript
     aspectRatio: c.aspect_ratio ?? (c.sit_url?.includes('caesar') ? 1.0 : 1.7778)
     ```

---

## 4. Invariant Traceability & Acceptance Verification

| Acceptance Criteria | Governing Ticket | Enforcement Mechanism | Verification Oracle |
| :--- | :--- | :--- | :--- |
| **AC1: Uniform Seated Scale** | `ticket-001.md` | `computeNormalizedWidthPct` with `sitTargetHeightPct: 48` | Rendered bust height falls within $422\text{px} \pm 20\text{px}$ across all stock and custom patrons. |
| **AC2: Counterline Visibility (No Peeking)** | `ticket-002.md` | `STANDARDIZED_BAR_SEATS` calibrated sit points | $Y_{\text{chin}} \le \text{counterTopY} - 20\text{px}$; full face, chin, and shoulders visible above counterline. |
| **AC3: Standardized Spawn Origin** | `ticket-003.md` | `AUTHORITATIVE_SPAWN_ORIGIN` `(143, 659)` | 100% of walking instances start at $(143, 659)$ with horizontal baseline $Y = 659$. |
| **AC4: Aspect Ratio Robustness** | `ticket-001.md`, `ticket-005.md` | Height-authoritative scaling + mesh-first pipeline ordering | 16:9, 1:1, and 2:3 sprites exhibit matching apparent character height ($\pm 5\%$). |
| **AC5: Smooth Seating Transition** | `ticket-004.md` | Spatial continuity $\text{walkEnd.x} \equiv \text{sitPoint.x}$ & co-located eye-line | $\Delta Y_{\text{head}} \le 15\text{px}$ across $t = 0.99 \to 1.0$; zero horizontal teleportation. |
| **AC6: Responsive Mask Invariance** | `ticket-002.md` | Evenodd `roomMinusBarClipPathCss` with calibrated bust height | Counter mask occludes lower torso while preserving 100% face visibility across desktop and mobile. |

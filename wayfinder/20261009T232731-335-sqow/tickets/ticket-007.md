---
ticket_id: "007"
title: "FS110 Physical Drag-and-Drop Cocktail Service Integration Test Execution Protocol, Authentic Codebase Schemas, Payload Admissibility Governance, and Fail-Fast Oracles"
type: task
status: resolved
claimed_by: "wayfinder-test-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md", "ticket-004.md", "ticket-005.md", "ticket-006.md"]
governing_specification: "functional_specification_110.md"
---

# Ticket 007: FS110 Physical Drag-and-Drop Cocktail Service Integration Test Execution Protocol, Authentic Codebase Schemas, Payload Admissibility Governance, and Fail-Fast Oracles

## Question
What are the deterministic integration test execution protocols, authentic codebase payload schemas, zero-mock payload assertions, and fail-fast verification oracles required to validate the end-to-end physical cocktail service loop across multi-seat order isolation, diegetic drag-and-drop pointer physics, recipe validation, snap-back error recovery, reversed walk departure motion, and continuous turnover spawning across `src/app/page.tsx`, `src/components/PatronLayer.tsx`, and `src/app/globals.css` without synthesized mock data under `INV-PAYLOAD-01` and `INV-ASSERTION-01`?

---

## 1. Upstream Manifest Binding & Audit Summary

- **Governing Specification:** `functional_specification_110.md` (FS110 — Physical drag-and-drop cocktail service: Multi-patron order concurrency, validation snap-back, reversed departure motion, and continuous turnover)
  - §Purpose: "Establish required product `{functionality}` for the primary barroom service gameplay loop: enabling players to drag built cocktails from the preparation mat and drop them directly onto seated patrons, validating recipes with fail-fast snap-back error physics, executing reversed walk departure animations upon successful service, and instantly spawning replacement patrons to maintain an endless, lively bar simulation."
  - §Acceptance Criteria:
    - **AC1** (Multi-Seat Order Independence): All four bar seats can hold distinct, pinned cocktail recipes simultaneously without crosstalk.
    - **AC2** (Diegetic Drag-and-Drop): User can drag an assembled cocktail from the mat and drop it onto any seated patron.
    - **AC3** (Recipe Validation Gate): Dropping a drink triggers full ingredient, glass, rim, and garnish validation against that specific patron's assigned recipe.
    - **AC4** (Rejection Snap-Back): An invalid drink immediately snaps back to the prep mat intact, triggering character rejection dialogue.
    - **AC5** (Drink Consumption on Match): A correct drink clears the live mat completely and marks the order as fulfilled.
    - **AC6** (Reversed Departure Motion): Departing patrons flip horizontally (`scaleX(-1)`) and animate their walking frames in reverse order back to the entrance.
    - **AC7** (Immediate Replacement Turnover): Vacating a stool immediately triggers a new patron arrival path from the spawn point to the empty seat.
  - §Edge Cases:
    1. Dragging with Incomplete or Empty Build (`state.vessel === null`).
    2. Dragging Across Multiple Seats (Centroid distance selection $\le 95\text{px}$).
    3. Simultaneous Turnover across multiple seats without queue clobbering.
    4. Display Scaling & Aspect Ratio Invariance across responsive containers.

- **Upstream Predecessor Manifests Consumed:**
  - `handoff/20261009T232731-335-sqow/wayfinder-read-and-plan.txt`
  - `handoff/20261009T232731-335-sqow/implementer.txt`
  - `handoff/20261009T232731-335-sqow/reviewer.txt`

- **Components Under Integration Test:**
  1. `src/app/page.tsx` — Barroom orchestrator, pointer drag engine, recipe validation gate, multi-seat order store, receipt lifecycle coordinator.
  2. `src/components/PatronLayer.tsx` — Stage patron renderer, imperative `departSeat(seatId)` handle, rAF departure motion driver, reversed walk frame calculator, immediate turnover spawner.
  3. `src/app/globals.css` — Highlighting styles (`.pov-patron-sprite--candidate-target`), drag styles (`.pov-active-vessel--dragging`), and snap-back animation styles (`.pov-active-vessel--snapping`).

---

## 2. Authentic Codebase Schemas & Contracts (Zero Mocks Grounding)

All integration test definitions are grounded strictly in authentic codebase schemas, interfaces, and real data models. Zero synthetic mock structures, dummy fixtures, or renamed fields are permitted.

### 2.1 `PatronSeatOrder` Schema (`src/app/page.tsx`)
```typescript
export type PatronOrderStatus =
  | 'waiting'
  | 'ordered'
  | 'served'
  | 'rejected'
  | 'departing';

export interface PatronSeatOrder {
  seatId: string; // 'bar_seat_1' | 'bar_seat_2' | 'bar_seat_3' | 'bar_seat_4'
  characterId: string;
  instanceKey: string;
  assignedRecipe: CocktailRecipe;
  recipe: CocktailRecipe; // alias for assignedRecipe
  orderStatus: PatronOrderStatus;
  status: PatronOrderStatus; // alias for orderStatus
  activeDialogue: string | null;
  orderDialogue: string | null; // alias for activeDialogue
  rejectionDialogue: string | null;
  receiptInstanceId: string | null;
  timestamp: number;
}
```

### 2.2 `VesselDragState` Schema (`src/app/page.tsx`)
```typescript
export interface VesselDragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetSeatId: string | null;
  isSnappingBack: boolean;
}
```

### 2.3 `PatronInstance` Extended Schema (`src/components/PatronLayer.tsx`)
```typescript
export type Phase = 'walking' | 'seated' | 'leaving';
export type PatronPhase = Phase;

export type PatronInstance = {
  instanceKey: string;
  characterId: string;
  def: PatronDef;
  layout: PatronLayout;
  phase: Phase;
  seatId: string; // Immediately cleared to '' upon transition to 'leaving'
  t: number;
  walkPath: StagePoint[];
  sitPoint: StagePoint;
  flipX: boolean;
  walkFrameIndex: number;
};
```

### 2.4 `PatronLayerHandle` Interface (`src/components/PatronLayer.tsx`)
```typescript
export interface PatronLayerHandle {
  departSeat: (seatId: string) => boolean;
}
```

### 2.5 `CocktailRecipe` Schema (`src/data/RecipeManager.ts`)
```typescript
export interface CocktailRecipe {
  name: string;
  vessel: string;
  validRims: string[];
  agitation: string;
  garnishes: string[];
  variants: {
    variantName: string;
    ingredients: Record<string, number>;
  }[];
  mappingAudit?: MappingAuditRecipe;
}
```

### 2.6 `DrinkState` Schema (`src/types/game.ts` / `src/hooks/useSimulation.ts`)
```typescript
export interface DrinkState {
  vessel: string | null;
  liquid: LiquidConfig | null;
  ingredients: Record<string, number>;
  rim: string | null;
  agitation: string | null;
  garnishes: { id: string; x: number; y: number }[];
}
```

---

## 3. Payload Admissibility Register (`INV-PAYLOAD-01`)

Under `INV-PAYLOAD-01`, test payloads must use only authentic data from the codebase (e.g. from `src/data/obelisco_mapped.json`, `src/data/patrons.ts`, `src/data/characters.ts`). No synthetic placeholders or mock values are permitted.

| Payload Identifier | Description | Source / Origin | Authentic Schema Grounding |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-RECIPE-MARGARITA` | Pinned Obelisco Margarita ticket | `src/data/obelisco_mapped.json` | `CocktailRecipe` (`name: 'Margarita'`, `vessel: 'ROCKS'`, `agitation: 'BOSTON_SHAKER_TIN'`, `garnishes: ['freshlimewheel']`, `validRims: ['KOSHER_SALT_SEA_SALT', 'DEMERARA_SUGAR', 'TAJIN_CHILE_LIME']`, `variants: [{ variantName: 'CLASSIC - LIME (Tequila)', ingredients: { tequilablancosilver: 2, juicefreshlime: 1, syrupagavenectar: 1 } }]`) |
| `PAYLOAD-RECIPE-MARIETAS` | Pinned Obelisco Las Marietas ticket | `src/data/obelisco_mapped.json` | `CocktailRecipe` (`name: 'Las Marietas'`, `vessel: 'COLLINS'`, `agitation: 'BOSTON_SHAKER_TIN'`, `garnishes: ['herbfreshmintsprig', 'herbcinnamonflakes']`, `validRims: ['NONE']`, `variants: [{ variantName: 'Default', ingredients: { mixerhorchata: 3, juiceguava: 2 } }]`) |
| `PAYLOAD-RECIPE-NARANJADA` | Pinned Obelisco Naranjada ticket | `src/data/obelisco_mapped.json` | `CocktailRecipe` (`name: 'Naranjada'`, `vessel: 'COLLINS'`, `agitation: 'BUILT'`, `garnishes: ['freshorangewheel']`, `validRims: ['TAJIN_CHILE_LIME']`, `variants: [{ variantName: 'Default', ingredients: {} }]`) |
| `PAYLOAD-DRINK-PERFECT-MARGARITA` | Perfect Margarita cocktail build matching `PAYLOAD-RECIPE-MARGARITA` | `src/hooks/useSimulation.ts` | `DrinkState` (`vessel: 'ROCKS'`, `ingredients: { tequilablancosilver: 2, juicefreshlime: 1, syrupagavenectar: 1 }`, `rim: 'KOSHER_SALT_SEA_SALT'`, `agitation: 'BOSTON_SHAKER_TIN'`, `garnishes: [{ id: 'freshlimewheel', x: 0, y: 0 }]`) |
| `PAYLOAD-DRINK-INVALID-GARNISH` | Margarita missing fresh lime wheel garnish | `src/hooks/useSimulation.ts` | `DrinkState` (`vessel: 'ROCKS'`, `ingredients: { tequilablancosilver: 2, juicefreshlime: 1, syrupagavenectar: 1 }`, `rim: 'KOSHER_SALT_SEA_SALT'`, `agitation: 'BOSTON_SHAKER_TIN'`, `garnishes: []`) |
| `PAYLOAD-DRINK-INVALID-VESSEL` | Margarita in wrong vessel (`COLLINS` instead of `ROCKS`) | `src/hooks/useSimulation.ts` | `DrinkState` (`vessel: 'COLLINS'`, `ingredients: { tequilablancosilver: 2, juicefreshlime: 1, syrupagavenectar: 1 }`, `rim: 'KOSHER_SALT_SEA_SALT'`, `agitation: 'BOSTON_SHAKER_TIN'`, `garnishes: [{ id: 'freshlimewheel', x: 0, y: 0 }]`) |
| `PAYLOAD-DRINK-EMPTY-MAT` | Empty live preparation mat | `src/hooks/useSimulation.ts` | `DrinkState` (`vessel: null`, `liquid: null`, `ingredients: {}`, `rim: null`, `agitation: null`, `garnishes: []`) |
| `PAYLOAD-PATRON-ELDER` | Stock patron Elder taking a seat | `src/data/patrons.ts` | `PatronSeatInput` (`zoneId: 'bar_seat_1'`, `characterId: 'patron_elder'`) |
| `PAYLOAD-PATRON-CAESAR` | Stock patron Caesar taking a seat | `src/data/patrons.ts` | `PatronSeatInput` (`zoneId: 'bar_seat_2'`, `characterId: 'caesar_9aea2cd1a4bf32d6'`) |
| `PAYLOAD-PATRON-TRUMP` | Stock patron Trump taking a seat | `src/data/patrons.ts` | `PatronSeatInput` (`zoneId: 'bar_seat_3'`, `characterId: 'trump_ca36306f5c662816'`) |

---

## 4. Locked Integration Test Decisions

### Decision 1: Multi-Seat Order State Isolation Architecture
- The four bar seats (`bar_seat_1` through `bar_seat_4`) maintain completely isolated records in `seatOrders`.
- Order creation deterministically calls `pinRandomVariant()` so that an order SKU is bound to a single recipe variant rather than all variants.
- Receipts are attached to ticket racks on seat arrival via `printAttachedTicketRef` and linked via `receiptInstanceId`.
- Assertion Oracle: Mutating or fulfilling `bar_seat_1` must never mutate `bar_seat_2`, `bar_seat_3`, or `bar_seat_4`.

### Decision 2: Diegetic Pointer Event Drag Engine & Boundary Invariants
- Dragging uses unified Pointer Events (`onPointerDown`, `pointermove`, `pointerup`, `pointercancel`) attached to window and stage.
- Threshold gate: Minimum movement $> 6\text{px}$ is required before `isDragging` becomes true. Small movements ($\le 6\text{px}$) trigger tap-to-open drink build card.
- Empty mat gate: When `state.vessel === null`, drag interaction is completely inhibited.
- Target detection: Centroid distance calculation selects the nearest seated patron bust within a maximum radius of $95\text{px}$.
- Visual candidate glow: Hovering within range applies `.pov-patron-sprite--candidate-target` (gold drop-shadow, 1.04 scale).

### Decision 3: Fail-Fast Recipe Validation Gate & Snap-Back Physics
- Dropping a drink on a seated patron immediately calls `RecipeManager.validateDrink(drinkState, order.assignedRecipe)`.
- Rejection handling:
  - If discrepancies exist (e.g. `[GLS]`, `[RIM]`, `[ING]`, `[MTD]`, `[GRN]`):
    1. Live mat drink build is NOT cleared (`trashDrink` is not called).
    2. Smooth snap-back physics return vessel avatar to original mat anchor coordinates over 250ms with `.pov-active-vessel--snapping`.
    3. Rejection dialogue completion request is dispatched to `/api/dialogue` with discrepancy details.
    4. Patron remains seated with order intact (`orderStatus: 'waiting'`).
- Fulfillment handling:
  - If validation passes with zero discrepancies:
    1. Active cocktail build is consumed and live mat is cleared via `trashDrink()`.
    2. Attached receipt is finalized/slid away via `handoffExitRef`.
    3. Money flyby is triggered if receipt contains a total.
    4. Order status transitions to `'departing'`.
    5. `patronLayerRef.current.departSeat(seatId)` is invoked.

### Decision 4: Departure Motion, Animation Inversion, and Despawn
- Calling `departSeat(seatId)` immediately transitions the patron to `phase === 'leaving'`.
- The departure path begins at `(sitPoint.x, 659)` and ends at the entrance spawn threshold `(143, 659)`.
- The patron sprite is inverted horizontally (`scaleX(-1)`).
- The walk animation frames play in reverse sequence ($(N - 1) \rightarrow \dots \rightarrow 0$).
- Clean despawn: Upon reaching $t \ge 1$ ($x=143$), the patron instance is removed from the `instances` array and its motion clock is deleted from memory.

### Decision 5: Immediate Stool Vacating and Turnover Spawning
- Upon calling `departSeat(seatId)`, the occupying instance immediately clears its `seatId` to `''`.
- `freeSeats()` immediately reports the stool as vacant without waiting for the departure walk to complete.
- `trySpawn()` is triggered within 50ms, bypassing `AUTO_FILL_INITIAL_DELAY_MS` (800ms) and `AUTO_FILL_INTERVAL_MS` (4000ms).
- A new unseated character enters at `(143, 659)`, walks to the stool, and triggers `onSitComplete` to begin a new service cycle.

---

## 5. Verification Oracles & Fail-Fast Error Matrix

| Test Case | Target Boundary | Valid `{correct required outputs}` | Explicit `{errors}` (`LANGUAGE.md`) |
| :--- | :--- | :--- | :--- |
| **IT-FS110-01** | Multi-seat order store | 4 distinct seat keys in `seatOrders`; isolated recipes; zero cross-seat mutation | Key collision; order overwrite; shared recipe reference |
| **IT-FS110-02** | Empty mat drag guard | `isDragging: false`; cursor unchanged; zero pointer capture | Drag starts when vessel is null; pointer capture on empty mat |
| **IT-FS110-03** | Vessel drag session | `.pov-active-vessel--dragging` applied; candidate glow on target patron | Coordinate jumping; missing highlight class; lag |
| **IT-FS110-04** | Centroid collision | Selects closest seat within $\le 95\text{px}$; tie breaks deterministically | Multiple seats highlighted simultaneously; out-of-range selection |
| **IT-FS110-05** | Missed drop snap-back | Vessel returns to prep mat over 250ms; drink build intact; zero errors | Drink cleared on missed drop; vessel frozen mid-stage |
| **IT-FS110-06** | Recipe rejection gate | Discrepancies returned; snap-back executed; drink preserved; rejection dialogue requested | Drink consumed on mismatch; patron leaves on error; silent failure |
| **IT-FS110-07** | Perfect service delivery | Mat reset via `trashDrink()`; receipt finalized; order `'departing'`; `departSeat` called | Drink remains on mat; seat order remains `'waiting'`; receipt stuck |
| **IT-FS110-08** | Departure inversion | Sprite flipped (`scaleX(-1)`); frames reversed; walk scale applied | Forward frame order; un-flipped sprite; y-drift off baseline |
| **IT-FS110-09** | Threshold despawn | Instance removed at $x=143$; motion clock deleted; character returns to pool | Instance stuck at exit; clock memory leak; character permanently blocked |
| **IT-FS110-10** | Immediate turnover | Stool freed immediately; `trySpawn()` runs in 50ms; new patron starts walk | Stool locked during walk; replacement waits for interval; duplicate character |

---

## 6. Assertion Law Certification (`INV-ASSERTION-01`)

- All planned test assertions evaluate authentic schema keys and objectively measurable outputs mandated by `functional_specification_110.md` and locked tickets.
- Zero assertions test against handwritten or unmandated expected blobs.
- Documentation sufficiency is certified as `{sufficient}`.

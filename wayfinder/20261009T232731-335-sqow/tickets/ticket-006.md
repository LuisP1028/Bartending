---
ticket_id: "006"
title: "FS110 Physical Drag-and-Drop Cocktail Service Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md", "ticket-004.md", "ticket-005.md"]
governing_specification: "functional_specification_110.md"
---

# Ticket 006: FS110 Physical Drag-and-Drop Cocktail Service Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol

## Question
What are the precise integration test decisions, authentic codebase payload schemas, zero-mock payload assertions, and verification protocols required to validate the end-to-end physical cocktail service loop across multi-seat order isolation, diegetic drag-and-drop pointer physics, recipe validation, snap-back error recovery, reversed walk departure motion, and continuous turnover spawning?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_110.md`
  - All Acceptance Criteria (AC1 through AC7).
  - All Edge Cases (1 through 4).
  - Architectural grounding across Tickets 001 through 005.

## Codebase Contracts & Payload Admissibility Schemas

### 1. `PatronSeatOrder` Data Schema
```typescript
export type PatronOrderStatus = 'waiting' | 'ordered' | 'served' | 'rejected' | 'departing';

export interface PatronSeatOrder {
  seatId: string; // 'bar_seat_1' | 'bar_seat_2' | 'bar_seat_3' | 'bar_seat_4'
  characterId: string;
  instanceKey: string;
  assignedRecipe: CocktailRecipe;
  recipe: CocktailRecipe; // alias for backward compatibility
  orderStatus: PatronOrderStatus;
  status: PatronOrderStatus; // alias for backward compatibility
  activeDialogue: string | null;
  orderDialogue: string | null; // alias for backward compatibility
  rejectionDialogue: string | null;
  receiptInstanceId: string | null;
  timestamp: number;
}
```

### 2. `VesselDragState` Schema
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

### 3. `PatronInstance` Extended Schema
```typescript
export type PatronPhase = 'walking' | 'seated' | 'leaving';

export type PatronInstance = {
  instanceKey: string;
  characterId: string;
  def: PatronDef;
  layout: PatronLayout;
  phase: PatronPhase;
  seatId: string;
  t: number;
  walkPath: StagePoint[];
  sitPoint: StagePoint;
  flipX: boolean;
  walkFrameIndex: number;
};
```

### 4. `PatronLayerHandle` Interface
```typescript
export interface PatronLayerHandle {
  departSeat: (seatId: string) => boolean;
}
```

## Master Verification Matrix (AC1–AC7)

| Test ID | Governing Ticket | Target Components | Verification Vector | Expected Observable Output |
| :--- | :--- | :--- | :--- | :--- |
| **IT-FS110-01** | `ticket-001.md` | `src/app/page.tsx` | Four patrons seated at `bar_seat_1` .. `bar_seat_4` | `seatOrders` contains 4 distinct keys, each holding an independent `assignedRecipe` with unique variants and zero crosstalk. |
| **IT-FS110-02** | `ticket-002.md` | `src/app/page.tsx` | Pointer down on mat when `state.vessel === null` | Zero drag events fire; cursor remains default; drag state is not initialized. |
| **IT-FS110-03** | `ticket-002.md` | `src/app/page.tsx`<br>`src/components/PatronLayer.tsx` | Pointer drag with movement $>6\text{px}$ across stage | Vessel avatar translates continuously with pointer; hovering over seated patron applies `.pov-patron-sprite--candidate-target`. |
| **IT-FS110-04** | `ticket-002.md` | `src/app/page.tsx` | Pointer drag positioned between adjacent stools | Centroid distance calculation unambiguously highlights the closer candidate patron. |
| **IT-FS110-05** | `ticket-003.md` | `src/app/page.tsx` | Releasing drag in empty stage area (missed drop) | Vessel smoothly animates back to `vesselSlotStyle` coordinates over ~220ms; zero errors logged; zero dialogue dispatched. |
| **IT-FS110-06** | `ticket-003.md` | `src/app/page.tsx`<br>`src/data/RecipeManager.ts` | Dropping invalid cocktail (e.g., missing garnish) on seated patron | `validateDrink` returns `[GRN] Missing ...`; vessel smoothly snaps back to prep mat; drink build remains intact; HF rejection dialogue requested and displayed. |
| **IT-FS110-07** | `ticket-005.md` | `src/app/page.tsx`<br>`src/hooks/useSimulation.ts` | Dropping perfect cocktail build on seated patron | Validation returns zero discrepancies; live mat state resets via `trashDrink()`; attached receipt slides away; order transitions to `'departing'`. |
| **IT-FS110-08** | `ticket-004.md` | `src/components/PatronLayer.tsx` | Patron transitions to `'leaving'` | Sprite switches to full-body walk height; flips horizontally (`scaleX(-1)`); walk frames sequence in reverse ($N-1 \rightarrow \dots \rightarrow 0$) toward $x=143$. |
| **IT-FS110-09** | `ticket-004.md` | `src/components/PatronLayer.tsx` | Departing patron reaches $t \ge 1$ ($x=143$) | Instance is removed from `instances` array; motion clock is deleted; character returns to available roster pool. |
| **IT-FS110-10** | `ticket-005.md` | `src/components/PatronLayer.tsx` | Stool vacated on transition to `'leaving'` | `freeSeats` reports stool vacant; `trySpawn()` immediately launches incoming replacement patron from unseated pool without waiting for interval. |

## Assertion Invariants Locked
1. **`INV-ORDER-ISOLATION-01`**: A state update targeting `bar_seat_1` must never mutate the recipe, dialogue, or status of `bar_seat_2`, `bar_seat_3`, or `bar_seat_4`.
2. **`INV-DRAG-EMPTY-01`**: Drag sessions cannot be initiated when `state.vessel === null` or during handoff animations.
3. **`INV-COLLISION-01`**: Centroid collision detection must evaluate Euclidean distance and select the closest seated patron when multiple targets overlap within range.
4. **`INV-SNAPBACK-01`**: Snap-back physics must smoothly interpolate avatar coordinates to the live prep mat anchor over a bounded interval (200–300ms) without mutating cocktail build state.
5. **`INV-DEPARTURE-01`**: Departing patrons must flip horizontally (`scaleX(-1)`), use full-body walk scale, sequence frames in reverse order, and follow `AUTHORITATIVE_GROUND_Y = 659` to $x=143$.
6. **`INV-TURNOVER-01`**: Transition to `'leaving'` immediately frees the stool and initiates incoming replacement pathing without waiting for auto-fill idle intervals.

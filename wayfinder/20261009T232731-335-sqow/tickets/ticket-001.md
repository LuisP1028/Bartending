---
ticket_id: "001"
title: "Concurrent Multi-Seat Order Registry & State Lifecycle Isolation"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_110.md"
---

# Ticket 001: Concurrent Multi-Seat Order Registry & State Lifecycle Isolation

## Question
How does the application isolate and manage independent drink order state lifecycles across up to four simultaneous seated bar stools (`bar_seat_1`, `bar_seat_2`, `bar_seat_3`, `bar_seat_4`), ensuring an order at one seat never mutates, overwrites, or resets an order at another seat, while synchronizing with the receipt rack and HF dialogue generation?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_110.md`
  - §Desired Functionality (1): "The system must track up to four simultaneous seat records corresponding to `bar_seat_1`, `bar_seat_2`, `bar_seat_3`, and `bar_seat_4`. When any patron transitions to `'seated'`, a random cocktail recipe from the active restaurant mode must be deterministically selected, pinned to a single variant, and assigned to that seat record. An order at `bar_seat_1` must never alter, overwrite, or reset an order at `bar_seat_2`."
  - §Desired Functionality (1): "Order State Lifecycle: Each seat tracks: `seatId`, `instanceKey`, `characterId`, `assignedRecipe`, `orderStatus` (`'waiting'` | `'served'` | `'departing'`), and `activeDialogue`."
  - §Acceptance Criteria (AC1): "Multi-Seat Order Independence: All four bar seats can hold distinct, pinned cocktail recipes simultaneously without crosstalk."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Existing State in `src/app/page.tsx`
In `src/app/page.tsx`, seat orders are maintained in React state:
```typescript
export interface PatronSeatOrder {
  seatId: string;
  characterId: string;
  instanceKey: string;
  recipe: CocktailRecipe;
  orderDialogue: string | null;
  status: 'ordered' | 'served' | 'rejected';
  timestamp: number;
}
```
Currently:
- `status` is typed as `'ordered' | 'served' | 'rejected'`. FS110 standardizes the lifecycle statuses to `'waiting'` (or `'ordered'`), `'served'`, and `'departing'`.
- `assignedRecipe` in FS110 corresponds to `recipe: CocktailRecipe`.
- `activeDialogue` corresponds to `orderDialogue` (and rejection dialogues are tracked in a separate dictionary `rejectionDialogues` or unified inside the seat record).

### 2. Seating Event Hook (`handlePatronSitComplete`)
In `src/app/page.tsx` (L356–L435):
```typescript
const handlePatronSitComplete = useCallback(
  async (info: { instanceKey: string; characterId: string; seatId: string }) => {
    const { instanceKey, characterId, seatId } = info;
    if (!mode) return;
    const recipe = mode.getRecipeManager().getRandomTicket();
    if (!recipe) return;
...
```
`getRandomTicket()` invokes `pinRandomVariant(recipe)`, which deep-copies and pins a single variant. However:
1. `printAttachedTicketRef` is currently not called to print an attached receipt ticket on the receipt rack for the newly seated patron.
2. Orders are keyed by `seatId`, but when a patron leaves and a new patron arrives, old dialogue state in `rejectionDialogues` is not cleanly reset for the new arrival.
3. The order status lifecycle lacks the explicit `'departing'` transition state mandated by FS110.

## Architectural Decisions to Lock

### 1. Unified Seat Order Contract (`PatronSeatOrder`)
Lock the state shape in `src/app/page.tsx`:
```typescript
export type PatronOrderStatus = 'waiting' | 'ordered' | 'served' | 'rejected' | 'departing';

export interface PatronSeatOrder {
  seatId: string;
  characterId: string;
  instanceKey: string;
  assignedRecipe: CocktailRecipe;
  orderStatus: PatronOrderStatus;
  activeDialogue: string | null;
  rejectionDialogue: string | null;
  receiptInstanceId: string | null;
  timestamp: number;
}
```
To preserve backward compatibility with existing components referencing `.recipe` or `.status`, provide getter getters/aliases:
```typescript
// Backward compatibility aliases on PatronSeatOrder:
// order.recipe === order.assignedRecipe
// order.status === order.orderStatus
// order.orderDialogue === order.activeDialogue
```

### 2. State Isolation Guarantees
- The dictionary `seatOrders` is keyed strictly by `seatId` (`Record<string, PatronSeatOrder>`).
- State updates use immutable record updates:
  ```typescript
  setSeatOrders((prev) => ({
    ...prev,
    [seatId]: updatedSeatOrder,
  }));
  ```
- Because updates are indexed by unique `seatId` (`bar_seat_1` through `bar_seat_4`), mutations to `bar_seat_1` never affect `bar_seat_2`, `bar_seat_3`, or `bar_seat_4`.
- When updating asynchronous dialogue responses, stale responses from patrons who have already departed are dropped by verifying `prev[seatId]?.instanceKey === instanceKey`.

### 3. Receipt Rack Synchronization
- Connect `printAttachedTicketRef` to print an attached ticket on the receipt rack upon seating:
  ```typescript
  let receiptId: string | null = null;
  if (printAttachedTicketRef.current) {
    receiptId = printAttachedTicketRef.current(recipe, { characterId, seatId });
  }
  ```
- Store `receiptInstanceId` in `PatronSeatOrder`. When that seat is subsequently served with a valid drink, trigger receipt exit via:
  ```typescript
  if (order.receiptInstanceId && handoffExitRef.current) {
    handoffExitRef.current(order.receiptInstanceId);
  }
  ```

## Exact Code Contracts & Signatures

### 1. `PatronSeatOrder` Definition
```typescript
export interface PatronSeatOrder {
  seatId: string;
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

### 2. Order Initializer Function
```typescript
export function createSeatOrder(
  seatId: string,
  characterId: string,
  instanceKey: string,
  assignedRecipe: CocktailRecipe,
  receiptInstanceId: string | null = null
): PatronSeatOrder {
  return {
    seatId,
    characterId,
    instanceKey,
    assignedRecipe,
    recipe: assignedRecipe,
    orderStatus: 'waiting',
    status: 'waiting',
    activeDialogue: null,
    orderDialogue: null,
    rejectionDialogue: null,
    receiptInstanceId,
    timestamp: Date.now(),
  };
}
```

## Acceptance & Verification Oracles
- Up to 4 distinct seat orders can coexist in `seatOrders` under keys `bar_seat_1`, `bar_seat_2`, `bar_seat_3`, `bar_seat_4`.
- Generating an order on `bar_seat_3` does not alter or re-render `bar_seat_1` or `bar_seat_2`.
- Each seat order contains a unique pinned recipe variant with deep-copied ingredient records.

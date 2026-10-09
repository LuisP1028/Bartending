---
ticket_id: "005"
title: "Immediate Stool Vacating, Turnover Spawning & Continuous Service Loop"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md", "ticket-004.md"]
governing_specification: "functional_specification_110.md"
---

# Ticket 005: Immediate Stool Vacating, Turnover Spawning & Continuous Service Loop

## Question
How does the system immediately vacate a bar stool upon a patron transitioning to `'leaving'`, bypass idle auto-fill timers to trigger immediate replacement arrival via `trySpawn()`, filter active cast members to avoid duplicate character instances, clear prep mat cocktail state, and establish an unbroken, endless bar simulation loop?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_110.md`
  - §Glossary: "Immediate Turnover Spawn: The immediate initiation of a new patron entrance path upon a seat being vacated, bypassing normal idle auto-fill timers."
  - §Desired Functionality (5): "Successful Service Behavior: If validation passes with zero errors: 1. The active cocktail is consumed: live prep mat state (`state.vessel`, liquid, ingredients, garnishes) resets to empty. 2. Any receipt associated with that order is finalized/stamped. 3. The patron transitions immediately from `'seated'` to `'leaving'`."
  - §Desired Functionality (7): "Continuous Bar Simulation: The instant a patron transitions to `'leaving'` and vacates their stool, an immediate replacement spawn event is triggered without waiting for normal auto-fill intervals. A new character from the unseated roster enters at the spawn point, walks to the vacant seat, receives a freshly generated drink order upon sitting, and continues the cycle."
  - §Edge Cases (3): "Simultaneous Turnover: If multiple patrons finish drinks in quick succession, each seat must independently process departure and trigger replacement spawning without queue clobbering or race conditions."
  - §Acceptance Criteria (AC5 & AC7): "AC5: Drink Consumption on Match: A correct drink clears the live mat completely and marks the order as fulfilled. AC7: Immediate Replacement Turnover: Vacating a stool immediately triggers a new patron arrival path from the spawn point to the empty seat."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Existing Auto-Fill Timer in `src/components/PatronLayer.tsx`
Currently in `src/components/PatronLayer.tsx` (L495–L509):
```typescript
const initial = window.setTimeout(() => {
  if (!cancelled) trySpawnRef.current();
}, AUTO_FILL_INITIAL_DELAY_MS);

const interval = window.setInterval(() => {
  if (!cancelled) trySpawnRef.current();
}, AUTO_FILL_INTERVAL_MS);
```
Auto-fill only triggers periodically on an interval (`AUTO_FILL_INTERVAL_MS` = 12000ms). There is no event hook to immediately spawn a replacement when a seat is vacated.

### 2. Seat Vacancy Determination (`freeSeats`)
In `src/components/PatronLayer.tsx` (L75–L90):
```typescript
function freeSeats(
  seats: PatronSeatInput[],
  instances: PatronInstance[]
): PatronSeatInput[] {
  const taken = new Set(
    instances.map((i) => i.seatId).filter((id) => Boolean(id))
  );
  return seats.filter(
    (s) =>
      s.zoneId &&
      BAR_SEAT_ZONE_IDS.includes(s.zoneId as any) &&
      !taken.has(s.zoneId)
  );
}
```
If an instance in `phase === 'leaving'` continues to hold `inst.seatId`, `freeSeats` will consider that stool occupied until the patron completely despawns 2–3 seconds later.

### 3. Living Character Filter (`livingCharacterIds`)
In `src/components/PatronLayer.tsx` (L92–L94):
```typescript
function livingCharacterIds(instances: PatronInstance[]): Set<string> {
  return new Set(instances.map((i) => i.characterId));
}
```
Because `instances` includes all active instances, a character walking out will be considered "living" until they despawn. This naturally prevents duplicate clones of the same character from spawning while the original is walking out.

## Architectural Decisions to Lock

### 1. Atomic Stool Vacating on Departure
When a patron transitions to `'leaving'`:
- Set `inst.seatId = ''` (or only count `inst.phase === 'seated' || inst.phase === 'walking'` in `freeSeats`).
- By setting `inst.seatId = ''`, `freeSeats(seats, instances)` immediately reports that bar stool as vacant.

### 2. Immediate Turnover Dispatch (`trySpawn`)
- In `departSeat(seatId)`:
  1. Transition seated instance to `phase = 'leaving'` and `seatId = ''`.
  2. Immediately invoke `trySpawn()` within the same microtask / event cycle (or queue a `requestAnimationFrame` / `setTimeout(..., 0)`):
  ```typescript
  // Trigger immediate turnover without waiting for AUTO_FILL_INTERVAL_MS
  window.setTimeout(() => {
    trySpawn();
  }, 50);
  ```
- This launches an incoming patron along the walk path to the newly freed stool while the departing patron is concurrently walking backward toward the exit.

### 3. Cocktail Consumption & Receipt Finalization
In `src/app/page.tsx` on successful delivery:
1. **Consume Cocktail:**
   ```typescript
   trashDrink(); // Resets state.vessel, ingredients, volume, rim, agitation, garnishes
   setDrinkBuildCardOpen(false);
   ```
2. **Finalize Attached Receipt:**
   ```typescript
   if (order.receiptInstanceId && handoffExitRef.current) {
     handoffExitRef.current(order.receiptInstanceId);
   }
   ```
3. **Trigger Departure:**
   ```typescript
   patronLayerRef.current?.departSeat(seatId);
   ```
4. **Update Seat Order Lifecycle:**
   ```typescript
   setSeatOrders((prev) => ({
     ...prev,
     [seatId]: {
       ...prev[seatId],
       orderStatus: 'departing',
       status: 'departing',
     },
   }));
   ```

### 4. Seamless Cycle Continuation
When the new replacement patron arrives at the vacated stool:
- `onSitComplete` fires with `{ instanceKey, characterId, seatId }`.
- `handlePatronSitComplete` automatically generates a freshly pinned random recipe variant, registers the new `PatronSeatOrder`, and dispatches the in-character order dialogue request.
- The Primary Service Loop is thus self-sustaining, continuous, and infinite.

## Exact Code Contracts & Signatures

### 1. `handleSuccessfulDelivery` Flow
```typescript
async function handleSuccessfulDelivery(
  seatId: string,
  order: PatronSeatOrder
) {
  // 1. Consume drink and reset mat
  trashDrink();
  setDrinkBuildCardOpen(false);
  setErrors([]);

  // 2. Finalize attached receipt if open
  if (order.receiptInstanceId && handoffExitRef.current) {
    handoffExitRef.current(order.receiptInstanceId);
  }

  // 3. Mark order as departing
  setSeatOrders((prev) => ({
    ...prev,
    [seatId]: {
      ...prev[seatId],
      orderStatus: 'departing',
      status: 'departing',
    },
  }));

  // 4. Close any active dialogue for this seat
  if (activeDialogueSeat === seatId) {
    setActiveDialogueSeat(null);
  }

  // 5. Signal patron departure and immediate turnover spawn
  patronLayerRef.current?.departSeat(seatId);
}
```

## Acceptance & Verification Oracles
- Serving a correct cocktail build instantly clears the live prep mat (`state.vessel === null`, 0 volume, 0 ingredients).
- The patron transitions to leaving, and their bar stool is immediately targeted by an incoming replacement patron.
- The new replacement character is chosen from unseated cast members, with no character cloning or sprite flickering.
- Upon sitting, the new patron receives a fresh order ticket and initiates order dialogue.
- Multiple simultaneous departures across distinct stools execute independently without race conditions.

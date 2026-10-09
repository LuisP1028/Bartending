---
ticket_id: 003
title: "Seat Occupancy Invariance & Auto-Fill Capacity Quiescence"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md", "ticket-002.md"]
governing_specification: "functional_specification_103.md"
---

# Ticket 003: Seat Occupancy Invariance & Auto-Fill Capacity Quiescence

## Question
How must seat claiming, seat occupancy tracking, and auto-spawning mechanisms in `src/components/PatronLayer.tsx` be structured to ensure continuous seat reservation across walking and seated phases, eliminate duplicate patron or seat assignments, and enforce complete auto-fill quiescence when all bar stools are occupied?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_103.md`
  - §Purpose: "maintaining seat occupancy, and preventing runaway re-spawning cycles."
  - §Observed Errors:
    - "A new patron instance is repeatedly spawned in rapid succession, resulting in an infinite loop of patrons walking in, reaching the seat, and vanishing/re-spawning."
  - §Desired Functionality:
    - 3. Elimination of Re-spawning Loops: "Reaching a seat must never trigger a despawn, reset, or replacement spawn. Arriving at and occupying a seat must conclusively satisfy that seat's fill requirement."
    - 4. Continuous Seat Occupancy & Spawn Gating: "An assigned seat must remain strictly occupied while the patron is walking toward it and while the patron is seated on it. Auto-fill spawning mechanisms must recognize occupied seats and never spawn duplicate patrons for a seat that is already claimed or filled. When all physical bar seats are occupied by walking or seated patrons, all auto-fill character spawning must halt entirely until a seat is legitimately vacated."
  - §Edge Cases & Behavioral Boundaries:
    - 1. Multiple Concurrent Patrons: "When multiple patrons walk toward different bar stools simultaneously, each patron must complete their arrival and transition to the seated state independently without resetting other active patrons or causing state collisions."
    - 2. Sequential Seat Filling: "As successive patrons arrive and sit, previously seated patrons must remain unaffected and stable in their seated state."
    - 3. Viewport Resizing & Reorientation: "Resizing the window or changing device orientation while patrons are walking or seated must preserve all active patron states, seat occupancies, and seated visual poses without triggering resets or re-spawns."
    - 4. Full Bar Capacity: "When all bar stools are occupied by seated patrons, the scene must remain in a stable, quiescent state with no background spawn attempts or visual glitches."
  - §Acceptance Criteria:
    - AC4: "Occupancy Integrity — Seats occupied by seated or approaching patrons remain claimed, preventing duplicate assignments or premature re-spawns."
    - AC5: "Capacity Quiescence — When all available bar stools are occupied, automatic patron spawning halts completely until a stool becomes vacant."
- **Codebase Source Inspection:**
  - In `src/components/PatronLayer.tsx` (lines 68–83):
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
          BAR_SEAT_ZONE_IDS.includes(
            s.zoneId as (typeof BAR_SEAT_ZONE_IDS)[number]
          ) &&
          !taken.has(s.zoneId)
      );
    }
    ```
  - In `src/components/PatronLayer.tsx` (lines 382–457):
    - `trySpawn` checks:
      1. `snapshot.length >= seatList.length`: returns immediately if capacity is reached.
      2. `free = freeSeats(seatList, snapshot)`: returns if no seats are free.
      3. `characterId = pickRandomFreeCharacterId(snapshot)`: returns if all characters are in use.
      4. Synchronous state update checks in `setInstances`:
         ```typescript
         if (
           prev.length >= seatList.length ||
           prev.some((p) => p.seatId === built.seatId) ||
           prev.some((p) => p.characterId === characterId) ||
           prev.some((p) => p.instanceKey === instanceKey)
         ) {
           instancesRef.current = prev;
           return prev;
         }
         ```
  - In `src/components/PatronLayer.tsx` (lines 462–485):
    - `useEffect` manages auto-fill timers (`AUTO_FILL_INITIAL_DELAY_MS = 800`, `AUTO_FILL_INTERVAL_MS = 2500`).
    - Periodic invocations of `trySpawn` are safe no-ops when bar capacity or character pool limits are satisfied.
    - Viewport resize uses `ResizeObserver` on `layerRef`, updating `layerSize` without modifying `instances` or resetting patron state.

## Architectural Decisions to Lock
1. **Continuous Seat Claim Invariance:**
   - A seat's `zoneId` is assigned upon instance creation and remains populated in `inst.seatId` through both the `'walking'` and `'seated'` phases.
   - `freeSeats` considers any seat present in `instances` (regardless of `phase`) as occupied (`taken`), preventing duplicate assignments.
2. **Deterministic Auto-Fill Capacity Quiescence:**
   - When all physical bar seats have an assigned patron (`instances.length >= seatList.length`), `trySpawn` evaluates to a strict no-op.
   - Background interval triggers continue ticking safely without spawning duplicate patrons or clobbering existing instances.
3. **Character Pool Exclusivity:**
   - Each active patron must have a unique `characterId` selected from `listCharacters()`.
   - Built-in stock cast (`patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`) are prioritized, guaranteeing high-quality art fills available seats first.
4. **Resilience to Window Resizing and Orientation Changes:**
   - Viewport resizing must only update `layerSize` via `ResizeObserver`.
   - Patron instances, motion clocks, and seat occupancies must remain completely decoupled from window resize events, preventing accidental resets or re-spawns.

## Scope & Invariant Guardrails
- **In Scope:** `freeSeats`, `trySpawn`, capacity limits, exclusivity checks, and resize isolation in `src/components/PatronLayer.tsx`.
- **Out of Scope:** Clock animation tick loop (handled in `ticket-001.md`). Seated asset rendering and bar clipping (handled in `ticket-002.md`).

---

## Resolution

### Verified Auto-Fill & Occupancy Architecture in `src/components/PatronLayer.tsx`
Ensure `src/components/PatronLayer.tsx` enforces seat exclusivity and capacity quiescence across all spawning checks:

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
      BAR_SEAT_ZONE_IDS.includes(
        s.zoneId as (typeof BAR_SEAT_ZONE_IDS)[number]
      ) &&
      !taken.has(s.zoneId)
  );
}

// In trySpawn:
const snapshot = instancesRef.current;
if (snapshot.length >= seatList.length) return;

const free = freeSeats(seatList, snapshot);
if (!free.length) return;

const characterId = pickRandomFreeCharacterId(snapshot);
if (!characterId) return;

// Inside flushSync setInstances claim:
if (
  prev.length >= seatList.length ||
  prev.some((p) => p.seatId === built.seatId) ||
  prev.some((p) => p.characterId === characterId) ||
  prev.some((p) => p.instanceKey === instanceKey)
) {
  instancesRef.current = prev;
  return prev;
}
```

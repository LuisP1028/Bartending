---
ticket_id: 004
title: "Continuous Seat Occupancy Integrity & Auto-Fill Capacity Quiescence"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md"]
governing_specification: "functional_specification_104.md"
---

# Ticket 004: Continuous Seat Occupancy Integrity & Auto-Fill Capacity Quiescence

## Question
How must bar stool occupancy tracking, auto-fill spawn gating, and capacity saturation checks in `src/components/PatronLayer.tsx` be structured to guarantee continuous seat reservation from walk inception through seated duration, prevent duplicate character or seat claims, enforce complete auto-fill spawn halting when all bar stools are occupied, and ensure patron lifecycle stability during window resize and orientation events?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_104.md`
  - §Purpose: "Specifically, guarantee that when an arriving character reaches their destination stool, they cease all walking animation, immediately enter and remain in their stationary seated state displaying their seated visual asset at the counter, maintain continuous seat occupancy, and halt redundant re-spawning."
  - §Desired Functionality (4): "Continuous Seat Occupancy & Spawn Gating:
    - An assigned seat must remain strictly registered as occupied while a patron is walking toward it and while the patron is seated on it.
    - Auto-fill spawning mechanisms must recognize occupied seats and never spawn duplicate patrons for a seat that is already claimed or filled.
    - When all physical bar seats are occupied by walking or seated patrons, automatic character spawning must halt entirely until a seat is legitimately vacated."
  - §Edge Cases:
    - Edge Case 1: "Multiple Concurrent Walkers: When multiple patrons walk toward different bar stools simultaneously, each patron must complete their arrival and transition to the seated state independently without resetting other active patrons or causing state collisions."
    - Edge Case 3: "Viewport Resizing & Reorientation: Resizing the window or changing device orientation while patrons are walking or seated must preserve all active patron states, seat occupancies, and seated visual poses without triggering resets or re-spawns."
    - Edge Case 4: "Capacity Quiescence: When all available bar stools are occupied by seated patrons, the scene must remain in a stable, quiescent state with zero background spawn attempts or visual resets."
  - §Acceptance Criteria:
    - **AC4** (Occupancy Integrity): Seats occupied by seated or approaching patrons remain claimed, preventing duplicate assignments or premature re-spawns.
    - **AC5** (Capacity Quiescence): When all bar stools are occupied, automatic patron spawning halts completely until a stool becomes vacant.

## Codebase Audit & Inspection
1. **Uninterrupted Seat Reservation in `freeSeats()`:**
   - In `src/components/PatronLayer.tsx` (L68–L83):
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
   - `taken` accumulates `seatId` from ALL instances in `instances`, regardless of whether `phase` is `'walking'` or `'seated'`.
   - Therefore, a stool is reserved immediately upon instance creation during walk traversal and remains reserved continuously while seated.
2. **Pre-Spawn Capacity Saturation Gating in `trySpawn()`:**
   - In `src/components/PatronLayer.tsx` (L382–L457):
     ```typescript
     const snapshot = instancesRef.current;
     if (snapshot.length >= seatList.length) return;

     const free = freeSeats(seatList, snapshot);
     if (!free.length) return;

     const characterId = pickRandomFreeCharacterId(snapshot);
     if (!characterId) return;
     ```
   - Spawning immediately returns if:
     - The number of active instances equals or exceeds available seats (`snapshot.length >= seatList.length`).
     - There are no free seats remaining (`!free.length`).
     - There are no unspawned characters in the roster (`!characterId`).
3. **Atomic State Claim in `flushSync`:**
   - Lines 433–449 verify inside `setInstances(prev => ...)`:
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
   - This provides atomic concurrency protection against race conditions if multiple spawn attempts overlap.
4. **Viewport Resize Isolation:**
   - Lines 160–171:
     `ResizeObserver` only updates `layerSize` (`setLayerSize({ w: cr.width, h: cr.height })`).
     Patron positions are computed via percentage strings (`pct.leftPct%`, `pct.topPct%`, `widthPct%`), which scale automatically with the container without mutating state or re-initializing `instances`.
5. **Parent Container Decoupling:**
   - In `src/app/page.tsx` (L460–L467, L1400–L1409):
     `barSeatInputs` is memoized against `hotspotOffsets`.
     `patronLayouts` state is referentially stable.
     Parent re-renders of `<PovStageShell>` do not unmount `<PatronLayer>`.

## Architectural Decisions to Lock

1. **Continuous Seat Occupancy Law:**
   - A seat is occupied if and only if any instance in `instances` has `seatId === seat.zoneId`.
   - The reservation starts at the millisecond of spawn and does not lapse when `phase` transitions from `'walking'` to `'seated'`.
   - No duplicate instances may ever claim the same `seatId` or `characterId`.

2. **Full Capacity Quiescence:**
   - When `instances.length >= seats.length` (or when `freeSeats()` returns empty), auto-fill timer invocations are strictly no-ops.
   - Zero DOM manipulations, motion clock updates, or state updates occur while the bar is at capacity.

3. **Resize Decoupling Invariance:**
   - Window resize, device orientation change, or container bounding rect changes must only update `layerSize` for `barClipCss` recalculation.
   - `instances` array and `motionClockRef` must remain untouched during viewport resize events.

---

## Concrete Resolution

Lock `src/components/PatronLayer.tsx` lines 68–83 and 382–457 to enforce continuous occupancy and capacity quiescence:

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

And in `trySpawn`:
```typescript
  const trySpawn = useCallback(() => {
    if (editMode) return;
    const seatList = seatsRef.current;
    if (!seatList.length) return;

    const snapshot = instancesRef.current;
    if (snapshot.length >= seatList.length) return;

    const free = freeSeats(seatList, snapshot);
    if (!free.length) return;

    const characterId = pickRandomFreeCharacterId(snapshot);
    if (!characterId) return;

    const seat = free[Math.floor(Math.random() * free.length)];
    const layout = resolvePatronLayout(characterId, layoutOverridesRef.current);
    const built = buildEntryForSeat(seat, layout);
    if (!built) return;

    const def = characterToPatronDef(requireCharacter(characterId));
    const instanceKey = nextInstanceKey();
    const pathStart = built.walkPath[0];
    const pathEnd = built.walkPath[built.walkPath.length - 1];
    const flipX = pathEnd.x < pathStart.x;
    const walkMs = Math.max(400, layout.walkMs);
    const frameMs = Math.max(60, def.walkFrameMs ?? 120);

    const nextInst: PatronInstance = {
      instanceKey,
      characterId,
      def,
      layout,
      phase: 'walking',
      seatId: built.seatId,
      t: 0,
      walkPath: built.walkPath,
      sitPoint: built.sitPoint,
      flipX,
      walkFrameIndex: 0,
    };

    let accepted = false;

    motionClockRef.current.set(instanceKey, {
      startMs: performance.now(),
      walkMs,
      frameMs,
    });

    flushSync(() => {
      setInstances((prev) => {
        if (
          prev.length >= seatList.length ||
          prev.some((p) => p.seatId === built.seatId) ||
          prev.some((p) => p.characterId === characterId) ||
          prev.some((p) => p.instanceKey === instanceKey)
        ) {
          instancesRef.current = prev;
          return prev;
        }

        accepted = true;
        const next = [...prev, nextInst];
        instancesRef.current = next;
        return next;
      });
    });

    if (!accepted) {
      motionClockRef.current.delete(instanceKey);
      return;
    }

    ensureMotionDriver();
  }, [editMode, ensureMotionDriver]);
```

# RE103 — Master Component-to-Edit Matrix: Patron Arrival Seating Persistence & Re-spawning Cycle Elimination

**Spec:** [functional_specification_103.md](./functional_specification_103.md)  
**Map:** [wayfinder/20261009T170644-141-kn3t/map.md](./wayfinder/20261009T170644-141-kn3t/map.md)  
**Tickets:**
- [Ticket 001: Patron Arrival Seating Transition & Motion Driver Quiescence](./wayfinder/20261009T170644-141-kn3t/tickets/ticket-001.md)
- [Ticket 002: Patron Seated State Persistence, Asset Rendering & Despawn Prevention](./wayfinder/20261009T170644-141-kn3t/tickets/ticket-002.md)
- [Ticket 003: Seat Occupancy Invariance & Auto-Fill Capacity Quiescence](./wayfinder/20261009T170644-141-kn3t/tickets/ticket-003.md)

---

## Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/PatronLayer.tsx` | L309–L343: `tick()` motion loop | `ticket-001.md` | Deterministic arrival seating transition & driver shutdown | Enforce definitive transition when `t >= 1 \|\| elapsed >= walkMs`; set `phase: 'seated'`, `t: 1`, `flipX: false`, `walkFrameIndex: 0`; remove clock from `motionClockRef`; quiesce rAF loop when all living patrons are seated. |
| `src/components/PatronLayer.tsx` | L295–L296, L506–L545: instance pass-through & render | `ticket-002.md` | Seated state immutability & asset switching | Guarantee instances with `phase === 'seated'` pass through `tick()` unmutated; render `inst.def.sitSrc`, `inst.layout.sitDisplayWidthPct`, `inst.sitPoint`, and `.pov-patron-sprite--sit` without resetting to spawn point or vanishing; preserve `barClipCss` counter occluder. |
| `src/components/PatronLayer.tsx` | L68–L83, L382–L457: `freeSeats()`, `trySpawn()` | `ticket-003.md` | Continuous seat occupancy & capacity quiescence | Lock seat claim from walk start through seated duration (`taken.has(s.zoneId)`); abort spawning when `instances.length >= seats.length`; halt background re-spawns at bar capacity; ensure window resize isolates `instances` without reset. |
| `src/app/globals.css` | L789–L808: `.pov-patron-sprite` | `ticket-002.md` | Sprite layout & seated bust geometry verification | Confirm `.pov-patron-sprite--sit` maintains `max-height: 55%` with `object-fit: contain; object-position: bottom center; image-rendering: pixelated;`, ensuring seated busts align naturally at the bar counter. |
| `src/app/page.tsx` | L1400–L1409: `<PatronLayer>` mount | `ticket-003.md` | Parent container decoupling verification | Confirm `<PatronLayer>` receives stable `barSeatInputs`, `patronLayouts`, and `barCutoffD`, ensuring parent re-renders do not remount or clear active patron instances. |

---

## Detailed Step-by-Step Edit Instructions

### 1. `src/components/PatronLayer.tsx`: Deterministic Arrival Seating Transition (`ticket-001.md`)

- **Lines 309–343:**
  In `tick(now)`, replace the walk progression and arrival check:
  ```typescript
            const elapsed = Math.max(0, now - clock.startMs);
            const walkMs = clock.walkMs > 0 ? clock.walkMs : 2400;
            const t = Math.min(1, elapsed / walkMs);
            const nFrames = Math.max(p.def.walkFrames.length, 1);
            const frameMs = clock.frameMs > 0 ? clock.frameMs : 120;
            const frameIndex = Math.floor(elapsed / frameMs) % nFrames;

            if (t < 1) {
              stillWalking = true;
              if (
                Math.abs(p.t - t) < 0.0001 &&
                p.walkFrameIndex === frameIndex
              ) {
                return p;
              }
              changed = true;
              return { ...p, t, walkFrameIndex: frameIndex };
            }

            // Definitive seating transition
            changed = true;
            motionClockRef.current.delete(p.instanceKey);
            pendingSitRef.current.push({
              instanceKey: p.instanceKey,
              characterId: p.characterId,
              seatId: p.seatId,
            });
            return {
              ...p,
              phase: 'seated' as const,
              t: 1,
              flipX: false,
              walkFrameIndex: 0,
            };
  ```
  With:
  ```typescript
            const elapsed = Math.max(0, now - clock.startMs);
            const walkMs = clock.walkMs > 0 ? clock.walkMs : 2400;
            const t = Math.min(1, elapsed / walkMs);
            const nFrames = Math.max(p.def.walkFrames.length, 1);
            const frameMs = clock.frameMs > 0 ? clock.frameMs : 120;
            const frameIndex = Math.floor(elapsed / frameMs) % nFrames;

            if (t < 1 && elapsed < walkMs) {
              stillWalking = true;
              if (
                Math.abs(p.t - t) < 0.0001 &&
                p.walkFrameIndex === frameIndex
              ) {
                return p;
              }
              changed = true;
              return { ...p, t, walkFrameIndex: frameIndex };
            }

            // Definitive seating transition
            changed = true;
            motionClockRef.current.delete(p.instanceKey);
            pendingSitRef.current.push({
              instanceKey: p.instanceKey,
              characterId: p.characterId,
              seatId: p.seatId,
            });
            return {
              ...p,
              phase: 'seated' as const,
              t: 1,
              flipX: false,
              walkFrameIndex: 0,
            };
  ```

### 2. `src/components/PatronLayer.tsx`: Seated State Persistence & Asset Selection (`ticket-002.md`)

- **Lines 294–296:**
  Verify that seated instances are passed through untouched in `tick`:
  ```typescript
  if (p.phase !== 'walking') return p;
  ```
- **Lines 506–545:**
  Verify that the instance render map accurately reflects the seated asset and dimensions:
  ```tsx
  {instances.map((inst) => {
    const isSeated = inst.phase === 'seated';
    const pos = isSeated
      ? inst.sitPoint
      : pointAlongPath(inst.walkPath, inst.t);
    const pct = stagePointToPct(pos);
    const frames = inst.def.walkFrames;
    const src = isSeated
      ? inst.def.sitSrc
      : frames[inst.walkFrameIndex % Math.max(frames.length, 1)] ??
        frames[0];
    const widthPct = isSeated
      ? inst.layout.sitDisplayWidthPct
      : inst.layout.walkDisplayWidthPct;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={inst.instanceKey}
        className={`pov-patron-sprite${
          isSeated ? ' pov-patron-sprite--sit' : ' pov-patron-sprite--walk'
        }`}
        src={src}
        alt=""
        draggable={false}
        data-character-id={inst.characterId}
        data-seat-id={inst.seatId}
        data-phase={inst.phase}
        style={{
          left: `${pct.leftPct}%`,
          top: `${pct.topPct}%`,
          width: `${widthPct}%`,
          transform: `translate(-50%, -100%)${
            inst.flipX ? ' scaleX(-1)' : ''
          }`,
        }}
      />
    );
  })}
  ```

### 3. `src/components/PatronLayer.tsx`: Seat Occupancy Invariance & Capacity Quiescence (`ticket-003.md`)

- **Lines 68–83:**
  Verify `freeSeats` considers both walking and seated patrons as occupying their assigned stools:
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
- **Lines 387–395:**
  Verify `trySpawn` immediately exits when capacity is reached or no free seat/character exists:
  ```typescript
  const snapshot = instancesRef.current;
  if (snapshot.length >= seatList.length) return;

  const free = freeSeats(seatList, snapshot);
  if (!free.length) return;

  const characterId = pickRandomFreeCharacterId(snapshot);
  if (!characterId) return;
  ```
- **Lines 434–442:**
  Verify synchronous reservation in `flushSync setInstances`:
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

### 4. Verification of Styling & Host Decoupling (`ticket-002.md`, `ticket-003.md`)
- Confirm `src/app/globals.css` (lines 789–808) preserves `.pov-patron-sprite--sit { max-height: 55%; }` and `.pov-patron-layer { clip-path: ... }` for diegetic bar occlusion.
- Confirm `src/app/page.tsx` mounts `<PatronLayer>` cleanly within `<PovStageShell>` without parent re-renders unmounting or re-initializing patron state.

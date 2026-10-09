# RE104 — Master Component-to-Edit Matrix: Patron Arrival Seating Persistence, Re-spawn Cycle Elimination, and Component Ownership Identification

**Spec:** [functional_specification_104.md](./functional_specification_104.md)  
**Map:** [wayfinder/20261009T173934-056-vq3o/map.md](./wayfinder/20261009T173934-056-vq3o/map.md)  
**Tickets:**
- [Ticket 001: Component Ownership Identification & System Layer Architecture Mapping](./wayfinder/20261009T173934-056-vq3o/tickets/ticket-001.md)
- [Ticket 002: Deterministic Arrival Detection, Seated Transition & Motion Driver Quiescence](./wayfinder/20261009T173934-056-vq3o/tickets/ticket-002.md)
- [Ticket 003: Seated State Persistence, Visual Asset Switching & Counter Occlusion](./wayfinder/20261009T173934-056-vq3o/tickets/ticket-003.md)
- [Ticket 004: Continuous Seat Occupancy Integrity & Auto-Fill Capacity Quiescence](./wayfinder/20261009T173934-056-vq3o/tickets/ticket-004.md)

---

## 1. System Layer Component Ownership Register

| Lifecycle / Architectural Responsibility | Primary Component & File Path | Supporting Modules & Data Definitions | Key Functions, Hooks & Data Structures |
| :--- | :--- | :--- | :--- |
| **Spawning Cadence & Character Selection** | `src/components/PatronLayer.tsx` | `src/data/patronServiceConstants.ts`<br>`src/data/characters.ts`<br>`src/data/runtimePatrons.ts` | `trySpawn()`, `pickRandomFreeCharacterId()`, `listCharacters()`, `requireCharacter()`, `characterToPatronDef()`, `AUTO_FILL_INTERVAL_MS`, `STOCK_CHARACTER_IDS` |
| **Seat Anchors, Geometry & Walk Polylines** | `src/lib/patronSeats.ts`<br>`src/data/patronLayout.ts` | `src/data/povHotspots.ts`<br>`src/lib/patronLayoutStorage.ts`<br>`src/data/hotspotGeometry.ts` | `resolveBarSeatAnchor()`, `buildWalkPath()`, `pointAlongPath()`, `stagePointToPct()`, `DEFAULT_PATRON_STAGE`, `POV_BAR_SEAT_HOTSPOTS`, `FALLBACK_SEAT_ANCHORS` |
| **Frame Timing & Motion Progression** | `src/components/PatronLayer.tsx` | `src/data/patronLayout.ts` | `ensureMotionDriver()`, `tick(now)`, `motionClockRef`, `driverRafRef`, `driverRunningRef`, `MotionClock`, wall-clock progression `elapsed / walkMs` |
| **Arrival Detection & Seating Transition** | `src/components/PatronLayer.tsx` | `src/components/PatronLayer.tsx` | `tick()` arrival branch `(t < 1 && elapsed < walkMs)` vs seated transition, `pendingSitRef`, `onSitComplete`, `motionClockRef.delete()`, rAF quiescence |
| **Seat Occupancy & Duplicate Claim Reservation** | `src/components/PatronLayer.tsx` | `src/data/patrons.ts` | `freeSeats()`, `taken.has(s.zoneId)`, atomic `setInstances()` capacity and claim checks, `snapshot.length >= seatList.length` |
| **Sprite Asset Switching & Layer Occlusion** | `src/components/PatronLayer.tsx` | `src/lib/svgPathScale.ts`<br>`src/app/globals.css`<br>`src/data/patronAssetPaths.ts` | JSX `.pov-patron-sprite--sit` vs `--walk`, `barClipCss` (`roomMinusBarClipPathCss()`), `sitSrc`, `sitDisplayWidthPct`, `data-phase` attribute |

---

## 2. Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/PatronLayer.tsx` | L309–L343: `tick()` motion loop | `ticket-002.md` | Deterministic arrival seating transition & driver shutdown | Enforce definitive transition when `t >= 1 \|\| elapsed >= walkMs`; set `phase: 'seated'`, `t: 1`, `flipX: false`, `walkFrameIndex: 0`; remove clock from `motionClockRef`; quiesce rAF loop when all living patrons are seated. |
| `src/components/PatronLayer.tsx` | L295, L506–L545: instance pass-through & render | `ticket-003.md` | Seated state immutability & asset switching | Guarantee instances with `phase === 'seated'` pass through `tick()` unmutated; render `inst.def.sitSrc`, `inst.layout.sitDisplayWidthPct`, `inst.sitPoint`, and `.pov-patron-sprite--sit` without resetting to spawn point or vanishing; preserve `barClipCss` counter occluder. |
| `src/components/PatronLayer.tsx` | L68–L83, L382–L457: `freeSeats()`, `trySpawn()` | `ticket-004.md` | Continuous seat occupancy & capacity quiescence | Lock seat claim from walk start through seated duration (`taken.has(s.zoneId)`); abort spawning when `instances.length >= seats.length`; halt background re-spawns at bar capacity; ensure window resize isolates `instances` without reset. |
| `src/app/globals.css` | L789–L808: `.pov-patron-sprite` | `ticket-003.md` | Sprite layout & seated bust geometry verification | Confirm `.pov-patron-sprite--sit` maintains `max-height: 55%` with `object-fit: contain; object-position: bottom center; image-rendering: pixelated;`, ensuring seated busts align naturally at the bar counter. |
| `src/app/page.tsx` | L460–L467, L1400–L1409: `<PatronLayer>` mount | `ticket-004.md` | Parent container decoupling verification | Confirm `<PatronLayer>` receives stable `barSeatInputs`, `patronLayouts`, and `barCutoffD`, ensuring parent re-renders do not remount or clear active patron instances. |

---

## 3. Detailed Step-by-Step Edit Instructions

### 1. `src/components/PatronLayer.tsx`: Deterministic Arrival Seating Transition (`ticket-002.md`)

- **Lines 309–343:**
  In `tick(now)`, verify the walk progression and arrival check:
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

- **Lines 371–376:**
  Verify driver quiescence:
  ```typescript
      if (stillWalking) {
        driverRafRef.current = requestAnimationFrame(tick);
      } else {
        driverRunningRef.current = false;
        driverRafRef.current = 0;
      }
  ```

### 2. `src/components/PatronLayer.tsx`: Seated State Persistence & Asset Rendering (`ticket-003.md`)

- **Lines 294–296:**
  Verify that seated patrons pass through the motion loop unmutated:
  ```typescript
          const next = prev.map((p) => {
            if (p.phase !== 'walking') return p;
  ```

- **Lines 506–544:**
  Verify seated asset, positioning, width, and styling:
  ```typescript
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

### 3. `src/components/PatronLayer.tsx`: Seat Occupancy & Auto-Fill Quiescence (`ticket-004.md`)

- **Lines 68–83:**
  Verify `freeSeats` collects taken seats from all instances (both walking and seated):
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
  Verify capacity saturation gating in `trySpawn`:
  ```typescript
    const snapshot = instancesRef.current;
    if (snapshot.length >= seatList.length) return;

    const free = freeSeats(seatList, snapshot);
    if (!free.length) return;

    const characterId = pickRandomFreeCharacterId(snapshot);
    if (!characterId) return;
  ```

- **Lines 433–449:**
  Verify atomic uniqueness registration inside `flushSync`:
  ```typescript
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
  ```

---

## 4. Verification Checkpoints

1. **Deterministic Arrival Transition (`AC1`)**:
   - Patron reaches end of walk path (`t >= 1 || elapsed >= walkMs`).
   - Sprite updates immediately to `sit.png`, DOM element gains `data-phase="seated"` and `.pov-patron-sprite--sit`.
2. **Seated Posture Persistence (`AC2`)**:
   - Seated character remains stationary at bar stool indefinitely across multiple animation cycles without resetting or disappearing.
3. **Zero Arrival Reset Loop (`AC3`)**:
   - Reaching bar stool never resets position coordinates back to entrance or restarts walking traversal.
4. **Occupancy Integrity (`AC4`)**:
   - Assigned bar stool remains marked occupied from spawn through seated stay, preventing duplicate seat assignments.
5. **Capacity Quiescence (`AC5`)**:
   - Auto-fill spawning halts completely once all bar stools are occupied.

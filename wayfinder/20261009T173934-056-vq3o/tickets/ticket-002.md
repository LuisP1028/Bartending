---
ticket_id: 002
title: "Deterministic Arrival Detection, Seated Transition & Motion Driver Quiescence"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_104.md"
---

# Ticket 002: Deterministic Arrival Detection, Seated Transition & Motion Driver Quiescence

## Question
How must destination arrival detection, walk termination, state machine transitions, and animation frame driver lifecycle in `src/components/PatronLayer.tsx` be structured to guarantee that every arriving patron immediately transitions to `phase: 'seated'` upon reaching their assigned stool, completely ceases walking animations and positional interpolation, eliminates the arrival reset loop, and allows the single rAF driver to gracefully quiesce?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_104.md`
  - §Observed Errors: "When an arriving character reaches the end of their walk path at their designated stool, they do not settle onto the stool. Instead, their horizontal coordinate immediately resets back toward the spawn point:
    - Trump (`bar_seat_3`): Advances from `left: 16.5%` to `left: 60.3%` at the stool, but upon arrival, immediately snaps back to `left: 22.7%` / `16.9%` and repeats the traversal, cycling indefinitely.
    - Caesar (`bar_seat_2`): Advances to `left: 38.8%`, reaches destination, and immediately snaps back to `left: 17.3%` / `14.0%` in a continuous walking cycle.
    - Elder (`bar_seat_1`): Loops continuously between `left: 12.8%` and `20.5%` without settling into the seat."
  - §Desired Functionality (1): "When an arriving patron reaches the end of their walking path at their assigned bar stool, they must definitively transition from the walking phase into the seated state. Walking motion, positional interpolation, and walk-cycle sprite cycling must immediately cease upon arrival. The character's seated visual asset (`sit.png` or equivalent seated sprite) must immediately display at the designated stool position and scale."
  - §Desired Functionality (3): "Reaching a seat must never trigger a position reset, despawn, or replacement spawn. Arriving at and occupying a seat must conclusively satisfy that seat's fill requirement."
  - §Acceptance Criteria:
    - **AC1** (Arrival Seating Completion): Every patron arriving at their assigned bar stool ceases walking and immediately transitions into their seated visual asset (`phase: "seated"`).
    - **AC3** (Zero Arrival Reset Loop): Reaching a seat never snaps a character back to the entrance or triggers infinite walking cycles.

## Codebase Audit & Inspection
In `src/components/PatronLayer.tsx` (lines 285–379):
1. **rAF Tick Loop Structure:**
   - The motion driver `ensureMotionDriver()` invokes `requestAnimationFrame(tick)`.
   - `tick(now)` evaluates all instances in `prev` using `setInstances(prev => ...)` wrapped in `flushSync`.
2. **Current Arrival Logic:**
   - Lines 309–343 compute:
     ```typescript
     const elapsed = Math.max(0, now - clock.startMs);
     const walkMs = clock.walkMs > 0 ? clock.walkMs : 2400;
     const t = Math.min(1, elapsed / walkMs);
     const nFrames = Math.max(p.def.walkFrames.length, 1);
     const frameMs = clock.frameMs > 0 ? clock.frameMs : 120;
     const frameIndex = Math.floor(elapsed / frameMs) % nFrames;
     ```
   - Condition evaluation:
     `if (t < 1 && elapsed < walkMs)` branches to continuing walk motion.
     When `t >= 1 || elapsed >= walkMs`, execution falls through to the seated transition:
     ```typescript
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
3. **Driver Quiescence & Pass-Through:**
   - Line 295: `if (p.phase !== 'walking') return p;` guarantees that instances already seated bypass clock lookup and remain unmutated.
   - Lines 352–354: `if (motionClockRef.current.size > 0) stillWalking = true;` ensures that when all active patrons have completed their walk, `stillWalking` becomes `false`.
   - Lines 371–376: If `stillWalking` is false, `driverRunningRef.current = false; driverRafRef.current = 0;`, cleanly shutting down the rAF loop until a future spawn.

## Architectural Decisions to Lock

1. **Definitive Arrival Threshold:**
   - Arrival is strictly reached when `t >= 1 || elapsed >= walkMs`.
   - The walk progression condition must be strictly: `if (t < 1 && elapsed < walkMs)`.
   - When the condition fails, transition to `phase: 'seated'` must execute synchronously and irrevocably in that exact frame.

2. **Irreversible Seated State Mutation:**
   - The returned object must explicitly lock:
     - `phase: 'seated' as const`
     - `t: 1`
     - `flipX: false`
     - `walkFrameIndex: 0`
   - `motionClockRef.current.delete(p.instanceKey)` must be called immediately so no residual clock remains.
   - The instance must remain in `instances` array permanently; it must never be pruned, filtered out, or re-initialized.

3. **Motion Driver Quiescence:**
   - When all instances in `instances` are seated, `stillWalking` evaluates to `false`.
   - The rAF driver loop must cleanly cancel/quiesce:
     `driverRunningRef.current = false; driverRafRef.current = 0;`
   - No background frame ticks may execute while all patrons are stationary and seated.

4. **Event Notification Decoupling:**
   - `onSitComplete` notifications queued in `pendingSitRef` are invoked outside `flushSync`.
   - Callbacks must be purely informational and must never mutate `instances` or re-trigger motion.

---

## Concrete Resolution

In `src/components/PatronLayer.tsx`, lock lines 285–377 to the deterministic implementation:

```typescript
    const tick = (now: number) => {
      pendingSitRef.current = [];
      let stillWalking = false;

      flushSync(() => {
        setInstances((prev) => {
          let changed = false;

          const next = prev.map((p) => {
            if (p.phase !== 'walking') return p;

            let clock = motionClockRef.current.get(p.instanceKey);
            if (!clock) {
              const walkDuration = Math.max(400, p.layout.walkMs || 2400);
              const frameDuration = Math.max(60, p.def.walkFrameMs || 120);
              clock = {
                startMs: now,
                walkMs: walkDuration,
                frameMs: frameDuration,
              };
              motionClockRef.current.set(p.instanceKey, clock);
            }

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
          });

          // Drop orphan clocks (no matching living instance)
          for (const key of [...motionClockRef.current.keys()]) {
            if (!next.some((p) => p.instanceKey === key)) {
              motionClockRef.current.delete(key);
            }
          }

          if (motionClockRef.current.size > 0) {
            stillWalking = true;
          }

          if (!changed) {
            instancesRef.current = prev;
            return prev;
          }
          instancesRef.current = next;
          return next;
        });
      });

      const sits = pendingSitRef.current;
      pendingSitRef.current = [];
      for (const ev of sits) {
        onSitCompleteRef.current?.(ev);
      }

      if (stillWalking) {
        driverRafRef.current = requestAnimationFrame(tick);
      } else {
        driverRunningRef.current = false;
        driverRafRef.current = 0;
      }
    };
```

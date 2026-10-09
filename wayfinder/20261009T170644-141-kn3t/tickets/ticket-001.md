---
ticket_id: 001
title: "Patron Arrival Seating Transition & Motion Driver Quiescence"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_103.md"
---

# Ticket 001: Patron Arrival Seating Transition & Motion Driver Quiescence

## Question
How must the motion driver tick loop, clock lifecycle, and walk termination state machine in `src/components/PatronLayer.tsx` be structured to guarantee that every arriving patron cleanly and definitively transitions into the seated state upon reaching their bar stool coordinates, stops walking movement and animation cycles, cleanly terminates their motion clock, and allows the single rAF driver to gracefully quiesce when all active patrons are seated?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_103.md`
  - §Purpose: "guarantee that once a patron reaches their assigned bar stool, they immediately transition to and persist in their seated state, displaying their seated visual asset at the counter, maintaining seat occupancy, and preventing runaway re-spawning cycles."
  - §Observed Errors: "Patrons continuously spawn at the entry point and walk along their path toward their designated bar stool. Upon reaching their destination at the stool, patrons do not settle into a permanent seated posture; instead, they vanish or reset."
  - §Desired Functionality:
    - 1. Definitive Seated Transition: "When an arriving patron reaches the end of their walking path at their assigned bar stool, they must cleanly and definitively transition from the walking phase into the seated state. Walking motion and walk-cycle animations must cease upon arrival. The character's seated visual asset must immediately display at the designated stool position and scale."
  - §Acceptance Criteria:
    - AC1: "Arrival Seating Completion — Every patron arriving at their assigned bar stool stops walking and immediately transitions into their seated visual asset."
    - AC3: "Zero Re-spawning Cycle — Arrival at a seat never triggers a reset or continuous re-spawning loop; patrons do not repetitively walk in and vanish."
- **Codebase Source Inspection:**
  - In `src/components/PatronLayer.tsx` (lines 281–379):
    - `ensureMotionDriver()` initiates a single `requestAnimationFrame(tick)` loop.
    - Each frame executes `setInstances(prev => ...)` wrapped in `flushSync`.
    - For each patron with `p.phase === 'walking'`:
      - Path progress `t = Math.min(1, elapsed / walkMs)`.
      - When `t < 1`, `stillWalking = true`, cycling `p.walkFrameIndex = Math.floor(elapsed / frameMs) % nFrames`.
      - When `t >= 1` (or `elapsed >= walkMs`):
        - `motionClockRef.current.delete(p.instanceKey)` removes the clock.
        - `pendingSitRef.current.push(...)` queues the sit event.
        - State transition returns:
          ```typescript
          {
            ...p,
            phase: 'seated' as const,
            t: 1,
            flipX: false,
            walkFrameIndex: 0,
          }
          ```
      - Post-mapping cleanup drops orphan clocks (`!next.some(p => p.instanceKey === key)`).
      - If `motionClockRef.current.size > 0`, `stillWalking = true`.
      - If `stillWalking` is false, `driverRunningRef.current = false; driverRafRef.current = 0;`, quiescing the animation frame loop.

## Architectural Decisions to Lock
1. **Deterministic Arrival Threshold & State Transition:**
   - Walking termination must be evaluated as `t >= 1 || elapsed >= walkMs`.
   - Upon meeting this condition:
     - Mutate `phase` to `'seated'`.
     - Lock progress `t` strictly to `1`.
     - Reset `flipX` to `false`.
     - Reset `walkFrameIndex` strictly to `0` to immediately halt walk-cycle animation.
     - Remove the instance key from `motionClockRef`.
     - Record the completed event into `pendingSitRef`.
2. **Graceful Driver Quiescence:**
   - When all instances in `prev` have `phase !== 'walking'`, `stillWalking` remains `false`.
   - The driver terminates its rAF request (`driverRunningRef.current = false; driverRafRef.current = 0`), eliminating unnecessary CPU/GPU overhead when the bar counter is populated by stationary seated patrons.
3. **Clock Life-Cycle Integrity:**
   - Pre-admission allocation in `trySpawn` ensures a valid clock exists before the first tick.
   - Self-healing clock fallback in `tick(now)` ensures that if an instance ever enters `walking` without a clock, a fallback clock is registered rather than stalling or resetting the instance.

## Scope & Invariant Guardrails
- **In Scope:** `src/components/PatronLayer.tsx` tick loop, state machine transition from `walking` to `seated`, walk frame reset, and rAF driver lifecycle.
- **Out of Scope:** Seated sprite asset rendering and occlusion (handled in `ticket-002.md`). Seat occupancy tracking and auto-fill gating (handled in `ticket-003.md`).

---

## Resolution

### Concrete State Machine Logic in `src/components/PatronLayer.tsx`
Ensure lines 294–363 in `src/components/PatronLayer.tsx` enforce definitive seated transition:

```typescript
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
```

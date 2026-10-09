---
ticket_id: 003
title: "Patron Motion Lifecycle & Deterministic Walk Termination"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-002.md"]
governing_specification: "functional_specification_100.md"
---

# Ticket 003: Patron Motion Lifecycle & Deterministic Walk Termination

## Question
How must `src/components/PatronLayer.tsx` be refactored to eliminate the possibility of patrons becoming trapped in an endless walk cycle, guaranteeing that every walking patron deterministically completes their walk trajectory and transitions to a seated state upon reaching their assigned bar stool coordinates?

## Context & Specification Grounding
- **Specification:** `functional_specification_100.md` §2 ("Patron Motion Lifecycle & Seating Transition"), Acceptance Criteria AC3 ("Approaching patrons cease walking upon reaching their stool and switch to their stationary seated pose; zero patrons remain trapped in a walk cycle"), Edge Case 2 ("Concurrent Patron Arrivals").
- **Current Defect:** In `src/components/PatronLayer.tsx`:
  1. Lines 297–302:
     ```typescript
     const clock = motionClockRef.current.get(p.instanceKey);
     if (!clock) {
       stillWalking = true;
       return p;
     }
     ```
     If a patron instance has `phase === 'walking'` but its clock entry is missing from `motionClockRef` (due to synchronous `flushSync` scheduling races, StrictMode re-mounts, or un-synchronized spawn timing), the motion driver returns `stillWalking = true` without updating `p`. The patron is stuck forever in `phase: 'walking'`.
  2. Lines 416–450 in `trySpawn`:
     `flushSync` renders the new patron instance into state, and `motionClockRef.current.set` is called *after* `flushSync` has completed. If the single rAF driver runs during or immediately around this boundary, a tick can observe an instance whose clock is not yet populated.
  3. Lack of elapsed time fail-safe: if `(now - clock.startMs)` calculation experiences any anomalies, `t` could fail to reach 1.

## Architectural Decisions to Lock
1. **Clock Synchronization Before Instance Admission:**
   - In `trySpawn`, allocate and attach the `MotionClock` to `motionClockRef.current.set(instanceKey, ...)` *before* executing the state update.
   - If the state update rejects the spawn (e.g. seat taken or duplicate), clean up the clock immediately.
2. **Fail-Safe Clock Recovery in Driver Tick:**
   - In `tick(now)`, if an instance has `phase === 'walking'` and `!clock`, do *not* leave it walking indefinitely with `stillWalking = true`.
   - Instead, dynamically synthesize a healing clock using `startMs: now`, `walkMs: Math.max(400, p.layout.walkMs || 2400)`, `frameMs: Math.max(60, p.def.walkFrameMs || 120)`. If already at endpoint (`p.t >= 1`), transition to `seated` immediately.
3. **Deterministic Walk Completion Evaluation:**
   - Calculate `elapsed = Math.max(0, now - clock.startMs)`.
   - Calculate `t = Math.min(1, elapsed / (clock.walkMs > 0 ? clock.walkMs : 2400))`.
   - If `t >= 1 || elapsed >= clock.walkMs`, transition definitively to:
     ```typescript
     {
       ...p,
       phase: 'seated' as const,
       t: 1,
       flipX: false,
       walkFrameIndex: 0,
     }
     ```
   - Delete the clock entry from `motionClockRef` and record the transition in `pendingSitRef`.

## Scope & Invariant Guardrails
- **In Scope:** Animation loop, clock management, `trySpawn` sequence, and walk-to-sit state machine transitions in `src/components/PatronLayer.tsx`.
- **Out of Scope:** Seated asset rendering and stability (handled in `ticket-004.md`).

---

## Resolution

### 1. Refactored Driver Tick Logic in `PatronLayer.tsx`
Replace lines 294–334 in `src/components/PatronLayer.tsx` with:
```typescript
const next = prev.map((p) => {
  if (p.phase !== 'walking') return p;

  let clock = motionClockRef.current.get(p.instanceKey);
  if (!clock) {
    // Fail-safe self-healing: attach fallback clock to prevent infinite stuck walk cycle
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

  if (t < 1) {
    stillWalking = true;
    if (Math.abs(p.t - t) < 0.0001 && p.walkFrameIndex === frameIndex) {
      return p;
    }
    changed = true;
    return { ...p, t, walkFrameIndex: frameIndex };
  }

  // Definite walk completion
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

### 2. Atomic Clock Initialization in `trySpawn`
In `src/components/PatronLayer.tsx`:
Pre-populate the clock in `motionClockRef` prior to or synchronously with `flushSync`:
```typescript
motionClockRef.current.set(instanceKey, {
  startMs: performance.now(),
  walkMs,
  frameMs,
});

let accepted = false;
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
```

### 3. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks Ticket 004.

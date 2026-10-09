---
ticket_id: "004"
title: "Patron Reversed Walk Departure Motion & Animation Inversion"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_110.md"
---

# Ticket 004: Patron Reversed Walk Departure Motion & Animation Inversion

## Question
How does the patron layer (`src/components/PatronLayer.tsx`) choreograph a departing patron upon successful drink service, constructing a horizontal exit trajectory back to `AUTHORITATIVE_SPAWN_ORIGIN` (143, 659), flipping the sprite horizontally (`scaleX(-1)`), sequencing walk frames in reverse order, applying full-body walking scale, and cleanly despawning the instance upon crossing the entrance threshold?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_110.md`
  - §Glossary: "Reversed Walk Departure: The visual departure state where a satisfied patron flips horizontally (`scaleX(-1)`) and steps backward toward the exit with their walk animation frames playing in reverse order."
  - §Desired Functionality (6): "Exit Pathing: The patron leaves their stool and walks horizontally along the floor baseline back toward the entrance spawn origin (`AUTHORITATIVE_SPAWN_ORIGIN` at $x=143, y=659$)."
  - §Desired Functionality (6): "Visual Inversion (Flip & Reversed Frames): Horizontal Orientation: The character sprite is flipped (`transform: scaleX(-1)`) to face leftward toward the exit. Reversed Walk Frames: The walking animation frames must play in reverse sequence (e.g. Frame $N \rightarrow \dots \rightarrow \text{Frame } 1$) to produce an authentic backward leaving cadence along the floor."
  - §Desired Functionality (6): "Clean Despawn: Upon reaching the entrance threshold, the patron instance is cleanly removed from stage memory."
  - §Acceptance Criteria (AC6): "Reversed Departure Motion: Departing patrons flip horizontally (`scaleX(-1)`) and animate their walking frames in reverse order back to the entrance."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Existing State Machine in `src/components/PatronLayer.tsx`
Currently in `src/components/PatronLayer.tsx`:
```typescript
type Phase = 'walking' | 'seated';
```
The codebase already noted in its architecture comments (L145):
`// Leave can join the same driver later as phase 'leaving'.`
However:
1. `Phase` is restricted to `'walking' | 'seated'`.
2. There is no departure path generator for returning from `inst.sitPoint.x` to `AUTHORITATIVE_SPAWN_ORIGIN`.
3. The motion driver only handles transitions from `'walking'` to `'seated'`, terminating clocks when `t >= 1`.
4. Walk frames are only played in forward sequence: `const frameIndex = Math.floor(elapsed / frameMs) % nFrames`.
5. Sprites only flip rightward if `pathEnd.x < pathStart.x`. During departure, the patron must flip (`scaleX(-1)`).

## Architectural Decisions to Lock

### 1. Extend Lifecycle Phase to Include `'leaving'`
Update `Phase` in `src/components/PatronLayer.tsx`:
```typescript
export type PatronPhase = 'walking' | 'seated' | 'leaving';
```

### 2. Departure Path Construction
When a patron at a seat transitions to departure:
- Starting coordinates: `{ x: inst.sitPoint.x, y: AUTHORITATIVE_GROUND_Y }` (where `AUTHORITATIVE_GROUND_Y = 659`).
- Terminus coordinates: `{ ...AUTHORITATIVE_SPAWN_ORIGIN }` ($x=143, y=659$).
- Path:
  ```typescript
  export function buildDeparturePath(
    sitPoint: StagePoint,
    layout: PatronLayout
  ): StagePoint[] {
    const startPoint: StagePoint = {
      x: sitPoint.x,
      y: AUTHORITATIVE_GROUND_Y,
    };
    const endPoint: StagePoint = {
      ...AUTHORITATIVE_SPAWN_ORIGIN,
    };
    // Include reversed waypoints along ground baseline if any exist
    const reversedWps = (layout.waypoints ?? [])
      .slice()
      .reverse()
      .map((p) => ({ x: p.x, y: AUTHORITATIVE_GROUND_Y }));

    return [startPoint, ...reversedWps, endPoint];
  }
  ```

### 3. Visual Inversion & Reversed Walk Animation
During `phase === 'leaving'`:
1. **Horizontal Orientation:** Set `inst.flipX = true` (or force `scaleX(-1)` in style). Since the entrance is at $x=143$ (to the left of all bar stools), facing leftward or inverting horizontal scale produces the desired retro character departure stance.
2. **Reversed Walk Frames:**
   ```typescript
   const nFrames = Math.max(p.def.walkFrames.length, 1);
   const forwardFrameIndex = Math.floor(elapsed / frameMs) % nFrames;
   const reversedFrameIndex = (nFrames - 1) - forwardFrameIndex;
   ```
   This plays the frames in backward order ($N-1 \rightarrow \dots \rightarrow 0$), producing authentic backward footwork cadence.
3. **Sprite Height & Width:** Departing patrons are standing/walking, not sitting busts:
   - `targetHeightPct = STANDARDIZED_PATRON_SCALE.walkTargetHeightPct;` (62%)
   - `widthPct = computeNormalizedWidthPct(targetHeightPct, ar);`
   - `src = inst.def.walkFrames[reversedFrameIndex] ?? inst.def.walkFrames[0];`
4. **Pointer Events Disabled:** Departing patrons are no longer interactive drop targets:
   - `pointer-events: none`
   - Remove `onDragOver`, `onDrop`, and `onClick` handlers.

### 4. Single rAF Driver Integration & Clean Despawn
Integrate departure motion seamlessly into the single rAF driver:
```typescript
if (p.phase === 'leaving') {
  let clock = motionClockRef.current.get(p.instanceKey);
  if (!clock) {
    const walkDuration = Math.max(400, p.layout.walkMs || 2400);
    const frameDuration = Math.max(60, p.def.walkFrameMs || 120);
    clock = { startMs: now, walkMs: walkDuration, frameMs: frameDuration };
    motionClockRef.current.set(p.instanceKey, clock);
  }

  const elapsed = Math.max(0, now - clock.startMs);
  const t = Math.min(1, elapsed / clock.walkMs);
  const nFrames = Math.max(p.def.walkFrames.length, 1);
  const forwardIdx = Math.floor(elapsed / clock.frameMs) % nFrames;
  const reversedIdx = (nFrames - 1) - forwardIdx;

  if (t < 1 && elapsed < clock.walkMs) {
    stillWalking = true;
    changed = true;
    return { ...p, t, walkFrameIndex: reversedIdx };
  }

  // Patron reached entrance origin (t >= 1) -> Clean Despawn
  changed = true;
  motionClockRef.current.delete(p.instanceKey);
  return null; // Filtered out of next instances array
}
```
When `null` is returned, filter instances: `const next = prev.map(...).filter(Boolean) as PatronInstance[];`. The patron is cleanly removed from stage memory.

## Exact Code Contracts & Signatures

### 1. `PatronInstance` State Schema
```typescript
type PatronInstance = {
  instanceKey: string;
  characterId: string;
  def: PatronDef;
  layout: PatronLayout;
  phase: 'walking' | 'seated' | 'leaving';
  seatId: string; // Set to '' once leaving so stool is immediately free
  t: number;
  walkPath: StagePoint[];
  sitPoint: StagePoint;
  flipX: boolean;
  walkFrameIndex: number;
};
```

### 2. Departure Trigger Method on `PatronLayer`
Expose via `PatronLayerHandle` or prop callback:
```typescript
export interface PatronLayerHandle {
  departSeat: (seatId: string) => boolean;
}
```
When `departSeat(seatId)` is invoked:
- Locate the seated instance with `inst.seatId === seatId && inst.phase === 'seated'`.
- Calculate departure polyline from `inst.sitPoint` to `AUTHORITATIVE_SPAWN_ORIGIN`.
- Update instance:
  ```typescript
  {
    ...inst,
    phase: 'leaving',
    seatId: '', // Immediately vacates the stool for turnover
    walkPath: departurePath,
    t: 0,
    flipX: true,
    walkFrameIndex: (inst.def.walkFrames.length || 1) - 1,
  }
  ```
- Reset motion clock and start motion driver.

## Acceptance & Verification Oracles
- Upon successful service, the seated patron immediately transitions from seated bust to full-body walking sprite.
- The sprite flips horizontally (`scaleX(-1)`) and navigates along `AUTHORITATIVE_GROUND_Y = 659` toward $x=143$.
- Walk animation frames cycle in reverse order ($N-1 \rightarrow \dots \rightarrow 0$) throughout the exit trajectory.
- When the patron reaches $x=143$ ($t \ge 1$), their DOM element and instance record are completely removed from stage memory with zero orphan clocks or memory leaks.

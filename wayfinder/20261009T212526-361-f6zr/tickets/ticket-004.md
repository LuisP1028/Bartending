---
ticket_id: "004"
title: "Seamless Motion-to-Sit Transition Continuity & Visual Stability Invariant"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md"]
governing_specification: "functional_specification_107.md"
---

# Ticket 004: Seamless Motion-to-Sit Transition Continuity & Visual Stability Invariant

## Question
How does the transition from the walking phase (`walking`) to the seated phase (`seated`) maintain continuous visual volume, horizontal alignment, and vertical stability without abrupt scale pops or coordinate teleportation?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_107.md`
  - §Desired Functionality (5): "When a patron reaches their assigned bar stool and completes their walking path:
    - The transition from the final walking frame to the seated bust sprite must be instantaneous, smooth, and visually stable.
    - The character must not visibly pop, jerk, change horizontal position, or shift dramatically in scale at the moment of seating."
  - §Glossary alignment: "Walk-to-Sit Transition Invariant: The requirement that transitioning from walking motion to the seated state preserves character visual continuity without sudden shifts in apparent scale, jarring teleportation, or vertical snaps."
  - §Acceptance Criteria (AC5): "At the instant of arrival at the stool, the character transitions from walking to seated without perceptible scale snapping or vertical coordinate jumps."

## Codebase Audit & Technical Discrepancy Analysis

### 1. The Discontinuous State Boundary at $t = 1$
In `src/components/PatronLayer.tsx` (L307–L335):
During the motion clock loop in `ensureMotionDriver`:
```tsx
const elapsed = Math.max(0, now - clock.startMs);
const t = Math.min(1, elapsed / walkMs);

if (t < 1 && elapsed < walkMs) {
  return { ...p, t, walkFrameIndex: frameIndex };
}

// Definitive seating transition
return {
  ...p,
  phase: 'seated' as const,
  t: 1,
  flipX: false,
  walkFrameIndex: 0,
};
```
In the render block (L522–L556):
- For $t < 1$ (`phase: 'walking'`):
  - Position is sampled from `pointAlongPath(walkPath, t)`.
  - At the terminal walking frame ($t \to 1$):
    $$pos = (walkEnd.x, groundY) = (seatEnd.x + sitOffset.x, 659)$$
  - Width is `inst.layout.walkDisplayWidthPct` ($57\%$).
  - Source image is `inst.def.walkFrames[...]` (full-body sprite).
- At $t = 1$ (`phase: 'seated'`):
  - Position abruptly switches to `inst.sitPoint`:
    $$pos = (seatEnd.x + sitOffset.x, seatEnd.y + sitOffset.y) = (seatEnd.x + sitOffset.x, 518)$$
  - Width abruptly switches to `inst.layout.sitDisplayWidthPct` ($35\%$).
  - Source image switches to `inst.def.sitSrc` (bust sprite).

### 2. Discontinuity Mechanics
1. **Vertical Coordinate Drop:** The bottom anchor coordinate jumps from $Y = 659$ to $Y = 518$ (a $141\text{px}$ vertical jump).
2. **Scale Pop:** Unnormalized width percentages ($57\%$ vs. $35\%$) abruptly alter the silhouette width, especially for custom 16:9 widescreen sprites where the figure shrinks by more than $50\%$ upon sitting.
3. **Horizontal Center Drift:** If `walkEnd.x` does not mathematically match `sitPoint.x`, the character shifts horizontally by several pixels at the moment of seating.

## Architectural Decision & Solution Design

### 1. Spatial Anchor Continuity Invariant (`walkEnd.x === sitPoint.x`)
In `src/data/patronLayout.ts` (`buildWalkPath`), enforce strict horizontal coordinate equality:
$$\text{walkEnd.x} \equiv \text{sitPoint.x}$$
The character arrives at the exact horizontal center of the target bar stool before the transition occurs.

### 2. Head/Shoulder Eye-Line Co-location Architecture
The physical reality of the scene is that while walking on the floor ($Y = 659$), a character's head is high in the air. When sitting down onto a bar stool ($Y \approx 518$), the character's bust rests on the stool behind the counter ($Y \approx 367$).
By calibrating the standardized full-body walking height ($546\text{px}$, $62\%$ of stage) and the standardized seated bust height ($422\text{px}$, $48\%$ of stage):
- **Walking Figure at Stool Arrival:**
  - Feet contact: $Y = 659\text{px}$.
  - Figure height: $\approx 546\text{px}$.
  - Figure head top: $659 - 546 \approx 113\text{px}$.
  - Figure eye-line: $\approx 180\text{px}$.
  - Figure shoulders: $\approx 250\text{px}–270\text{px}$.
- **Seated Bust at Stool Anchor:**
  - Base anchor: $Y = 518\text{px}$.
  - Bust height: $\approx 422\text{px}$.
  - Bust head top: $518 - 422 \approx 96\text{px}$.
  - Bust eye-line: $\approx 170\text{px}$.
  - Bust shoulders: $\approx 240\text{px}–260\text{px}$.

The eye-lines and head silhouettes are co-located within $\Delta Y \le 10\text{px}–15\text{px}$.
Because the bar counter polygon (`POV_BAR_CUTOFF.d`) occludes the stage from $Y \approx 367\text{px}$ down to $Y = 880\text{px}$, the lower body of both the walking sprite (arriving behind the counter) and the seated sprite is occluded behind the counter!
Above the countertop, the visible bust, chin, face, and eyes seamlessly align, creating a natural and stable seating transition without scale snapping.

### 3. Transition Debounce & Directional Flip Neutralization
- When transitioning at $t = 1$:
  - `flipX` is explicitly reset to `false` (seated busts are facing the bartender/player head-on).
  - The transition occurs on a single frame tick (`flushSync`).
  - No intermediate zero-opacity frame or flash of unstyled content occurs.

## Precise Contract & Transformation Specifications

### 1. In `src/data/patronLayout.ts`
```typescript
export function buildWalkPath(
  layout: PatronLayout,
  seatEnd: StagePoint
): { walkPath: StagePoint[]; sitPoint: StagePoint } {
  const groundY = AUTHORITATIVE_GROUND_Y;
  const spawn: StagePoint = { ...AUTHORITATIVE_SPAWN_ORIGIN };

  // Guaranteed strict horizontal match between walk terminus and sit point
  const targetX = seatEnd.x + (layout.sitOffset?.x ?? 0);
  const sitY = seatEnd.y + (layout.sitOffset?.y ?? 0);

  const wps = (layout.waypoints ?? []).map((p) =>
    clampStagePoint({ x: p.x, y: groundY })
  );

  const walkEnd: StagePoint = clampStagePoint({
    x: targetX,
    y: groundY,
  });

  const sitPoint: StagePoint = {
    x: targetX,
    y: sitY,
  };

  return {
    walkPath: [spawn, ...wps, walkEnd],
    sitPoint,
  };
}
```

### 2. In `src/components/PatronLayer.tsx`
Ensure that the rendered image element does not unmount or remount during the phase switch (`key={inst.instanceKey}` is preserved), allowing the browser to swap the `src` attribute from `walkFrames` to `sitSrc` without tearing down DOM elements or triggering layout shifts.

## Invariant & Verification Criteria
- **`INV-TRANS-01`**: $\text{walkPath}[\text{last}].x === \text{sitPoint}.x$ for every generated path.
- **`INV-TRANS-02`**: Head top coordinate variance between arrival walking frame ($t = 0.99$) and initial seated frame ($t = 1.0$) must be $\le 15\text{px}$.
- **`INV-TRANS-03`**: Relative bust volume variance between walking and seated states must not exceed $\pm 5\%$.

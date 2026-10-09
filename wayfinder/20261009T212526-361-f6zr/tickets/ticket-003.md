---
ticket_id: "003"
title: "Authoritative Entrance Spawn Origin & Horizontal Walking Baseline Governance"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_107.md"
---

# Ticket 003: Authoritative Entrance Spawn Origin & Horizontal Walking Baseline Governance

## Question
How does the motion system enforce a single, authoritative entrance spawn origin `(spawn.x, spawn.y)` and level horizontal walking baseline across all characters and seats, eliminating elevation drift, per-character spawn offsets, and orientation flip jumps?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_107.md`
  - §Desired Functionality (2): "All patrons entering the scene must originate from the exact same entrance spawn coordinate `(spawn.x, spawn.y)` in stage space."
  - §Desired Functionality (2): "Patrons must advance along a consistent, level horizontal floor baseline across the room to their target stools without vertical bobbing, elevation drift, or per-character starting offsets."
  - §Desired Functionality (2): "Horizontal flipping (`scaleX(-1)`) must preserve the exact anchor base and visual center of the character, avoiding any horizontal position jumps when changing orientation."
  - §Acceptance Criteria (AC3): "100% of spawned walking patrons begin their entrance path at the exact same screen coordinates `(spawn.x, spawn.y)`."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Insecure Spawn Point Invariance in Layout Storage
In `src/data/patronLayout.ts`:
```typescript
export const DEFAULT_PATRON_STAGE = {
  walkDisplayWidthPct: 57,
  sitDisplayWidthPct: 35,
  spawn: { x: 143, y: 659 } as StagePoint,
  waypoints: [] as StagePoint[],
  preferredSeatId: null as string | null,
  sitOffset: { x: 25, y: 85 } as StagePoint,
  lockHorizontalWalk: true,
  walkMs: 2400,
};
```
In `src/lib/patronLayoutStorage.ts` (L10–L24), `loadPatronLayouts` parses stored layout objects from `localStorage` (`pov-patron-layouts-v1`).
If an operator used `PatronPlacementEditor.tsx` to drag the SPAWN handle for one character, that character's `spawn` coordinate is persisted in `localStorage`.
When that character enters the bar in subsequent sessions, `resolvePatronLayout` merges the stored patch over `DEFAULT_PATRON_STAGE`, causing that specific character to spawn at a disparate coordinate (e.g. $X = 300, Y = 720$), violating the invariant that 100% of patrons enter through the identical entrance threshold.

### 2. Walking Baseline Elevation Drift
In `src/data/patronLayout.ts` (`buildWalkPath`):
```typescript
if (layout.lockHorizontalWalk) {
  const wps = layout.waypoints.map((p) =>
    clampStagePoint({ x: p.x, y: groundY })
  );
  const walkEnd = clampStagePoint({
    x: seatEnd.x + layout.sitOffset.x,
    y: groundY,
  });
  ...
}
```
If `lockHorizontalWalk` is ever false in a stored patch, `buildWalkPath` constructs a diagonal path from `(spawn.x, spawn.y)` directly to `(seatEnd.x, seatEnd.y)`.
Because `seatEnd.y` is $445\text{px}$ and `spawn.y` is $659\text{px}$, the character walks along an upward incline across the room, floating up into the air before sitting down.

### 3. Directional Flip Visual Centering
In `src/components/PatronLayer.tsx`:
`transform: translate(-50%, -100%) scaleX(-1)`:
When `flipX` is applied, the transform matrix flips around the center of the rendered element box.
If CSS `transform-origin` is unconstrained, browser default `transform-origin: 50% 50%` combined with `translate(-50%, -100%)` can cause sub-pixel rounding shifts or horizontal position displacement when changing direction.

## Architectural Decision & Solution Design

### 1. Authoritative Spawn Point Constant (`AUTHORITATIVE_SPAWN_ORIGIN`)
Define a non-overridable constant for the stage entrance coordinate:
```typescript
export const AUTHORITATIVE_SPAWN_ORIGIN: Readonly<StagePoint> = Object.freeze({
  x: 143,
  y: 659,
});
```
- In `src/components/PatronLayer.tsx` and `src/data/patronLayout.ts`:
  - Enforce `layout.spawn = { ...AUTHORITATIVE_SPAWN_ORIGIN }` unconditionally when building entry paths for live patrons.
  - Runtime layout overrides from `localStorage` may configure testing preferences (e.g. `walkMs`, editor preview), but `spawn` coordinates for live walking instances must strictly lock to `AUTHORITATIVE_SPAWN_ORIGIN`.

### 2. Enforced Floor Plane Baseline (`groundY = AUTHORITATIVE_SPAWN_ORIGIN.y`)
- In `buildWalkPath`:
  - `lockHorizontalWalk` is enforced as an invariant (`true`).
  - All walking path waypoints, the spawn origin, and the terminal walk point share identical $Y = 659\text{px}$.
  - Every patron advances along the level floor plane across the room until reaching their target stool's $X$ coordinate.

### 3. Directional Flip Parity & Transform Origin Locking
In `src/app/globals.css`:
- Configure `.pov-patron-sprite`:
  ```css
  transform-origin: 50% 100%;
  ```
- This guarantees that the bottom-center contact point of the character's feet is the invariant origin of all scaling, positioning, and horizontal flip operations, eliminating any horizontal position jumps when changing orientation.

## Precise Contract & Transformation Specifications

### 1. `src/data/patronLayout.ts` Authoritative Invariants
```typescript
export const AUTHORITATIVE_SPAWN_ORIGIN: Readonly<StagePoint> = Object.freeze({
  x: 143,
  y: 659,
});

export const AUTHORITATIVE_GROUND_Y = 659;

export function buildWalkPath(
  layout: PatronLayout,
  seatEnd: StagePoint
): { walkPath: StagePoint[]; sitPoint: StagePoint } {
  const groundY = AUTHORITATIVE_GROUND_Y;
  const spawn: StagePoint = { ...AUTHORITATIVE_SPAWN_ORIGIN };

  // All walking motion is strictly horizontal along AUTHORITATIVE_GROUND_Y
  const wps = layout.waypoints.map((p) =>
    clampStagePoint({ x: p.x, y: groundY })
  );
  const walkEnd = clampStagePoint({
    x: seatEnd.x + layout.sitOffset.x,
    y: groundY,
  });

  const sitPoint: StagePoint = {
    x: seatEnd.x + layout.sitOffset.x,
    y: seatEnd.y + layout.sitOffset.y,
  };

  return {
    walkPath: [spawn, ...wps, walkEnd],
    sitPoint,
  };
}
```

### 2. `src/components/PatronLayer.tsx` Invariant Locking
In `buildEntryForSeat`:
```typescript
function buildEntryForSeat(
  seat: PatronSeatInput,
  layout: PatronLayout
): { walkPath: StagePoint[]; sitPoint: StagePoint; seatId: string } | null {
  const a = resolveBarSeatAnchor(seat.zoneId, seat.d);
  if (!a) return null;
  const seatEnd: StagePoint = {
    x: (a.leftPct / 100) * POV_VIEWBOX.width,
    y: (a.topPct / 100) * POV_VIEWBOX.height,
  };
  // Ensure layout.spawn is strictly AUTHORITATIVE_SPAWN_ORIGIN
  const lockedLayout: PatronLayout = {
    ...layout,
    spawn: { ...AUTHORITATIVE_SPAWN_ORIGIN },
    lockHorizontalWalk: true,
  };
  const { walkPath, sitPoint } = buildWalkPath(lockedLayout, seatEnd);
  if (walkPath.length < 2) return null;
  return { walkPath, sitPoint, seatId: seat.zoneId };
}
```

## Invariant & Verification Criteria
- **`INV-SPAWN-01`**: 100% of generated walking instances have `walkPath[0].x === 143` and `walkPath[0].y === 659`.
- **`INV-SPAWN-02`**: For all points $p$ in `walkPath`, $p.y === 659$ strictly.
- **`INV-FLIP-01`**: Applying `scaleX(-1)` preserves the exact bottom-center coordinate $(X, Y)$ without horizontal displacement.

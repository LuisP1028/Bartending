---
ticket_id: 002
title: "Patron Seated State Persistence, Asset Rendering & Despawn Prevention"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_103.md"
---

# Ticket 002: Patron Seated State Persistence, Asset Rendering & Despawn Prevention

## Question
How must patron instance state retention and DOM rendering in `src/components/PatronLayer.tsx` and styling in `src/app/globals.css` be guaranteed so that once a patron transitions to `phase: 'seated'`, they permanently remain stationary in `instances` at their assigned bar stool coordinates, display their seated visual asset (`inst.def.sitSrc`) without disappearing or resetting to spawn coordinates, and preserve bar counter occlusion clipping?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_103.md`
  - §Purpose: "guarantee that once a patron reaches their assigned bar stool, they immediately transition to and persist in their seated state, displaying their seated visual asset at the counter, maintaining seat occupancy, and preventing runaway re-spawning cycles."
  - §Observed Errors:
    - "Upon reaching their destination at the stool, patrons do not settle into a permanent seated posture; instead, they vanish or reset."
    - "The bar counter never populates with stationary seated customers, leaving the bar stools visually unoccupied over extended durations despite continuous character spawning activity."
  - §Desired Functionality:
    - 2. Seated State Persistence: "Once seated, the patron must remain seated in place continuously at their bar stool for the entire duration of their stay. The seated character must not disappear, reset to the entry point, or revert to walking animations while occupying the seat."
    - 3. Elimination of Re-spawning Loops: "Reaching a seat must never trigger a despawn, reset, or replacement spawn. Arriving at and occupying a seat must conclusively satisfy that seat's fill requirement."
  - §Acceptance Criteria:
    - AC2: "Seated Pose Persistence — Seated patrons remain stationary at their bar stool continuously, without disappearing, resetting, or returning to the spawn point."
    - AC3: "Zero Re-spawning Cycle — Arrival at a seat never triggers a reset or continuous re-spawning loop; patrons do not repetitively walk in and vanish."
- **Codebase Source Inspection:**
  - In `src/components/PatronLayer.tsx` (lines 506–545):
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
  - In `src/app/globals.css` (lines 789–808):
    - `.pov-patron-sprite`: `position: absolute; height: auto; object-fit: contain; object-position: bottom center; image-rendering: pixelated; pointer-events: none;`.
    - `.pov-patron-sprite--walk`: `max-height: 85%;`.
    - `.pov-patron-sprite--sit`: `max-height: 55%;`.
  - In `src/lib/svgPathScale.ts` and `src/components/PatronLayer.tsx` (line 501):
    - `barClipCss = roomMinusBarClipPathCss(...)` clips the patron layer using `path(evenodd, "${rect} ${bar}")`, allowing the patron's upper body to remain visible above the bar counter while clipping the lower body behind the bar counter.

## Architectural Decisions to Lock
1. **Immutable Persistence of Seated Instances:**
   - In `tick(now)`, instances where `p.phase !== 'walking'` are strictly preserved as-is without state modification or removal:
     ```typescript
     if (p.phase !== 'walking') return p;
     ```
   - Reaching a seat does not trigger any eviction, despawn, or reset callback.
   - `onSitComplete` notifications remain purely informational (for future audio or dialogue triggers) and must not mutate the instance list or unseat the patron.
2. **Deterministic Seated Asset Selection & Positioning:**
   - When `isSeated` is true:
     - The rendered image source is strictly `inst.def.sitSrc`.
     - The coordinates are strictly `inst.sitPoint` (resolved as `seatEnd + sitOffset`), ensuring the patron appears stationary on their stool.
     - The sprite width is strictly `inst.layout.sitDisplayWidthPct`.
     - CSS class includes `.pov-patron-sprite--sit` with `max-height: 55%` and `object-position: bottom center`.
     - Orientation is strictly `flipX: false`, presenting a forward-facing seated bust.
3. **Bar Occlusion Fidelity:**
   - Retain `barClipCss` on `.pov-patron-layer` container to maintain natural counter occlusion, ensuring the seated bust sits cleanly behind the bar surface without visual artifacts.

## Scope & Invariant Guardrails
- **In Scope:** Seated instance lifecycle preservation, image element rendering, positioning attributes, CSS class assignments, and counter clipping in `src/components/PatronLayer.tsx`.
- **Out of Scope:** Walk trajectory state transitions (handled in `ticket-001.md`). Seat occupancy reservation and auto-fill gating (handled in `ticket-003.md`).

---

## Resolution

### Verified Seated Render Contract in `src/components/PatronLayer.tsx`
Ensure lines 506–545 in `src/components/PatronLayer.tsx` enforce persistent, unmutated rendering:

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

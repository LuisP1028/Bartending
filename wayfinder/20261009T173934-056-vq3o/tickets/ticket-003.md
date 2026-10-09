---
ticket_id: 003
title: "Seated State Persistence, Visual Asset Switching & Counter Occlusion"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md", "ticket-002.md"]
governing_specification: "functional_specification_104.md"
---

# Ticket 003: Seated State Persistence, Visual Asset Switching & Counter Occlusion

## Question
How must seated state persistence, visual asset switching, sizing geometry, and counter occlusion clipping be governed across `src/components/PatronLayer.tsx`, `src/lib/svgPathScale.ts`, and `src/app/globals.css` to guarantee that once a patron enters the seated state, they remain permanently seated at their bar stool, display their seated bust asset at designated stool coordinates and width, and maintain pixelated alignment behind the bar counter occluder?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_104.md`
  - §Purpose: "Specifically, guarantee that when an arriving character reaches their destination stool, they cease all walking animation, immediately enter and remain in their stationary seated state displaying their seated visual asset at the counter, maintain continuous seat occupancy, and halt redundant re-spawning."
  - §Desired Functionality (1): "The character's seated visual asset (`sit.png` or equivalent seated sprite) must immediately display at the designated stool position and scale."
  - §Desired Functionality (2): "Once seated, the patron must remain seated in place continuously at their bar stool throughout their stay at the bar. A seated patron must never disappear, reset to the entry/spawn coordinates, or revert to walking animations while occupying the stool."
  - §Edge Cases (2): "Sequential Seat Filling: As successive patrons arrive and sit, previously seated patrons must remain unaffected, stationary, and stable in their seated state."
  - §Acceptance Criteria:
    - **AC2** (Seated Pose Persistence): Seated patrons remain stationary at their bar stool continuously, without disappearing, resetting coordinates, or returning to the spawn point.

## Codebase Audit & Inspection
1. **Pass-Through in Motion Loop:**
   - In `src/components/PatronLayer.tsx` (L295):
     `if (p.phase !== 'walking') return p;`
     guarantees that whenever `tick()` evaluates instances, seated patrons pass through completely unmodified. Their `phase`, `sitPoint`, `t`, and asset references are never altered by the motion driver.
2. **JSX Rendering Branching:**
   - In `src/components/PatronLayer.tsx` (L506–L545):
     ```typescript
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
     ```
   - When `isSeated` is true:
     - Positional coordinate is strictly `inst.sitPoint`, derived from seat anchor + `sitOffset`.
     - Asset URL is strictly `inst.def.sitSrc` (`/assets/patrons/{characterId}/sit.png` or legacy flat path).
     - Width percentage is strictly `inst.layout.sitDisplayWidthPct` (35% default).
     - Class name includes `pov-patron-sprite--sit`.
     - Attribute `data-phase="seated"` is set on the DOM element.
3. **CSS Class Styling:**
   - In `src/app/globals.css` (L789–L808):
     ```css
     .pov-patron-sprite {
       position: absolute;
       pointer-events: none;
       user-select: none;
       image-rendering: pixelated;
     }

     .pov-patron-sprite--walk {
       max-height: 65%;
       object-fit: contain;
       object-position: bottom center;
     }

     .pov-patron-sprite--sit {
       max-height: 55%;
       object-fit: contain;
       object-position: bottom center;
     }
     ```
   - `.pov-patron-sprite--sit` constrains max-height to 55% with `object-fit: contain; object-position: bottom center;`, ensuring bust alignment directly on top of the bar counter.
4. **Counter Occlusion Clipping:**
   - In `src/components/PatronLayer.tsx` (L251–L261, L496–L505):
     - `barClipCss = useMemo(() => roomMinusBarClipPathCss(barCutoffD, layerSize.w, layerSize.h, POV_VIEWBOX.width, POV_VIEWBOX.height), [barCutoffD, layerSize.w, layerSize.h])`
     - Applied to `.pov-patron-layer` style.
     - Ensures character lower bodies are cleanly occluded behind the bar counter graphic.

## Architectural Decisions to Lock

1. **State Array Immutability for Seated Patrons:**
   - Seated patron records in `instances` state array must never be evicted, replaced, or reset to spawn coordinates during auto-fill cycles or subsequent patron arrivals.
   - When new walkers arrive, existing seated instances must pass through `prev.map()` untouched.

2. **Deterministic Seated Sprite Presentation:**
   - DOM elements for seated patrons must definitively carry:
     - `data-phase="seated"`
     - Class `pov-patron-sprite--sit`
     - `src={inst.def.sitSrc}`
     - `style.width = ${inst.layout.sitDisplayWidthPct}%`
     - `style.left = ${pct.leftPct}%` (at `inst.sitPoint.x`)
     - `style.top = ${pct.topPct}%` (at `inst.sitPoint.y`)
     - `style.transform = "translate(-50%, -100%)"` (zero horizontal flip)

3. **Occlusion Fidelity:**
   - The `.pov-patron-layer` container must continuously maintain its `barClipCss` polygon clipPath derived from `barCutoffD`, preserving diegetic layer depth where patrons sit behind the physical counter surface.

---

## Concrete Resolution

1. Confirm `src/components/PatronLayer.tsx` lines 506–545 render seated sprites deterministically:
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
2. Confirm `src/app/globals.css` lines 789–808 retain seated bust constraints (`max-height: 55%`, `image-rendering: pixelated;`).

---
ticket_id: 004
title: "Patron Seated State Persistence & Asset Switching"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-003.md"]
governing_specification: "functional_specification_100.md"
---

# Ticket 004: Patron Seated State Persistence & Asset Switching

## Question
How must patron sprite rendering and state immutability in `src/components/PatronLayer.tsx` be guaranteed so that once a patron transitions to the seated state, they persistently remain stationary at their bar stool counter, presenting their seated visual asset without reverting into walking animations?

## Context & Specification Grounding
- **Specification:** `functional_specification_100.md` §2 ("Clean Seated Pose Transition", "Persistent Seated State"), Acceptance Criteria AC4 ("Seated patrons maintain their seated posture continuously at the bar counter").
- **Current Architecture:** In `src/components/PatronLayer.tsx` (lines 500–537), each instance renders either `inst.def.sitSrc` (when `inst.phase === 'seated'`) or `inst.def.walkFrames[...]` (when walking).
- **Potential Failure Modes:**
  1. Spontaneous walk reversion caused by state re-hydration, re-spawn triggers targeting the same seat, or unhandled clock re-allocation.
  2. Fallback to walk sprite if `sitSrc` is empty or missing.
  3. Visual distortion or incorrect dimensions between walking full-body frame and seated bust asset.

## Architectural Decisions to Lock
1. **Terminal Nature of Seated Phase:**
   - Once an instance has `phase === 'seated'`, its phase is strictly immutable. No action, event, or driver frame may mutate `phase` back to `walking`.
   - In `trySpawn`, double-check that no new patron may be spawned for a seat already occupied by a seated or walking patron (`prev.some(p => p.seatId === built.seatId)`).
2. **Deterministic Seated Asset Presentation:**
   - When `isSeated` is true:
     - Render source: `inst.def.sitSrc`.
     - CSS class: `pov-patron-sprite pov-patron-sprite--sit`.
     - Coordinates: exactly `inst.sitPoint` (calculated from stool anchor plus `sitOffset`).
     - Display width: `inst.layout.sitDisplayWidthPct`.
     - Orientation: `flipX: false`.
3. **Bar Stage Clipping:**
   - Retain `barClipCss` on `.pov-patron-layer` so seated patrons sit naturally behind the counter polygon (`POV_BAR_CUTOFF`).

## Scope & Invariant Guardrails
- **In Scope:** Seated state persistence, asset selection, coordinate stability, and CSS class assignment in `src/components/PatronLayer.tsx`.
- **Out of Scope:** Equipment drawer stability and stage translation (handled in `ticket-005.md`).

---

## Resolution

### 1. Seated State Invariant Enforcement
In `src/components/PatronLayer.tsx`:
1. In `tick(now)`:
   ```typescript
   if (p.phase !== 'walking') {
     // Strictly pass-through seated patrons without state churn
     return p;
   }
   ```
2. In `trySpawn`:
   Confirm seat reservation check:
   ```typescript
   if (prev.some((p) => p.seatId === built.seatId)) {
     instancesRef.current = prev;
     return prev;
   }
   ```
3. In render loop (lines 500–537):
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

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks Ticket 005.

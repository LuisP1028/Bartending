---
ticket_id: "002"
title: "Diegetic Drag-and-Drop Vessel Interaction & Pointer Physics"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_110.md"
---

# Ticket 002: Diegetic Drag-and-Drop Vessel Interaction & Pointer Physics

## Question
How does the application provide a responsive, lag-free diegetic drag-and-drop interaction that allows players to pick up an assembled cocktail from the live prep mat (`drink_placement` / `pov-active-vessel`), drag it smoothly across responsive Game Boy playfield wrappers and touch devices, detect candidate seated patrons using centroid collision distance, and visually highlight the candidate recipient?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_110.md`
  - §Desired Functionality (2): "When a cocktail is present on the mat (`state.vessel !== null`), pressing and dragging on the vessel must initiate a drag session. The dragged drink sprite must follow pointer movement smoothly across the stage without lag or coordinate jumping."
  - §Desired Functionality (2): "Target Detection Over Seated Patrons: While dragging, hovering over any seated patron bust or bar stool bounding area must highlight the candidate recipient. Dragging must function reliably across desktop mouse controls, touch input on mobile devices, and within responsive Game Boy shell wrappers."
  - §Edge Cases (1 & 2): "Dragging with Incomplete or Empty Build: If the mat has no vessel (`state.vessel === null`), dragging must be disabled."
  - §Edge Cases (2 & 4): "Dragging Across Multiple Seats: If the player drags the drink over multiple seated patrons, collision must deterministically select the closest patron based on pointer centroid distance. Display Scaling & Aspect Ratios: Drag coordinate transformation must remain mathematically invariant across window resizing, responsive zoom levels, and letterboxed viewBox configurations."
  - §Acceptance Criteria (AC2): "Diegetic Drag-and-Drop: User can drag an assembled cocktail from the mat and drop it onto any seated patron."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Existing Drag Implementation
Currently in `src/app/page.tsx` (L1782–L1786):
```tsx
<div
  ref={vesselSlotRef}
  className={`pov-active-vessel${vesselHandoff ? ' pov-active-vessel--handoff' : ''}`}
  draggable={!vesselHandoff && !!state.vessel}
  onDragStart={(e) => {
    e.dataTransfer.setData('text/plain', 'cocktail-vessel');
    e.dataTransfer.effectAllowed = 'copy';
  }}
...
```
And in `src/components/PatronLayer.tsx` (L573–L595):
```tsx
onDragOver={isSeated ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } : undefined}
onDrop={isSeated ? (e) => { e.preventDefault(); onServeDrinkToSeat?.(inst.seatId); } : undefined}
onClick={isSeated ? () => { onServeDrinkToSeat?.(inst.seatId); } : undefined}
```
Deficiencies:
1. **Touch Incompatibility:** HTML5 native drag (`draggable="true"`) does not fire on mobile touch devices (iOS Safari, Android Chrome). Mobile users cannot drag drinks without Pointer Events.
2. **Game Boy Shell Scaling Drift:** In CSS-scaled or letterboxed containers (`.gb-shell__playfield`, `preserveAspectRatio="xMidYMid meet"`), HTML5 drag avatars cannot be customized or constrained to the stage coordinate space.
3. **No Continuous Hover Highlighting:** HTML5 drag events do not allow dynamic centroid distance collision detection across multiple candidate targets.
4. **No Click vs. Drag Differentiation:** A click on the vessel should open the drink build card (`setDrinkBuildCardOpen(true)`), whereas a drag gesture should deliver the drink.

## Architectural Decisions to Lock

### 1. Unified Pointer-Event Drag Engine
Implement a unified Pointer Event drag controller (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) operating on the stage container (`povStageRef`):
- **Pointer Down:**
  - Check if `state.vessel !== null` and `!vesselHandoff`. If empty or in handoff, ignore.
  - Record initial pointer coordinates `(e.clientX, e.clientY)`.
  - Mark drag candidate; do not trigger drag until movement threshold ($> 6\text{px}$) is exceeded.
- **Pointer Move:**
  - If movement threshold is exceeded, enter active drag state `isDragging = true`.
  - Calculate pointer position relative to the stage viewport:
    ```typescript
    const rect = povStageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const stageX = e.clientX - rect.left;
    const stageY = e.clientY - rect.top;
    ```
  - Compute candidate seated patron target via centroid distance calculation.
- **Pointer Up / Cancel:**
  - If `isDragging === false` (movement was $\le 6\text{px}$), trigger click action (open drink build card).
  - If `isDragging === true`:
    - If a candidate seat is targeted (`targetSeatId !== null`), trigger service evaluation to that seat.
    - If no seat is targeted (`targetSeatId === null`), trigger snap-back animation to prep mat.

### 2. Centroid Distance Collision Detection
In `src/app/page.tsx` or `src/components/PatronLayer.tsx`, dynamically locate seated patron sprites:
```typescript
function findClosestSeatedPatron(
  clientX: number,
  clientY: number,
  seats: Record<string, PatronSeatOrder>,
  stageEl: HTMLElement
): string | null {
  const patronElements = stageEl.querySelectorAll<HTMLElement>('.pov-patron-sprite--sit');
  let closestSeatId: string | null = null;
  let minDistance = Infinity;
  const COLLISION_RADIUS_PX = 90; // Maximum distance to register a drop target

  patronElements.forEach((el) => {
    const seatId = el.getAttribute('data-seat-id');
    if (!seatId || !seats[seatId] || seats[seatId].orderStatus !== 'waiting') return;

    const b = el.getBoundingClientRect();
    const centerX = b.left + b.width / 2;
    const centerY = b.top + b.height / 2;
    const dist = Math.hypot(clientX - centerX, clientY - centerY);

    if (dist < minDistance && dist <= COLLISION_RADIUS_PX) {
      minDistance = dist;
      closestSeatId = seatId;
    }
  });

  return closestSeatId;
}
```

### 3. Candidate Target Visual Highlighting
- Expose `highlightedSeatId: string | null` via state or prop to `PatronLayer`.
- When a seated patron has `inst.seatId === highlightedSeatId`, apply CSS class `.pov-patron-sprite--candidate-target`:
  ```css
  .pov-patron-sprite--candidate-target {
    filter: drop-shadow(0 0 10px #f7ca18) drop-shadow(0 0 20px rgba(247, 202, 24, 0.6));
    transform: translate(-50%, -100%) scale(1.04);
    transition: transform 0.15s ease-out, filter 0.15s ease-out;
  }
  ```

### 4. Floating Drag Avatar & Invariant Transform
During active drag, render the active cocktail vessel at pointer coordinates:
- The dragged vessel is positioned inside `.pov-stage` with `position: absolute; left: ${stageX}px; top: ${stageY}px; transform: translate(-50%, -50%); pointer-events: none; z-index: 100;`.
- Because coordinates are derived from `stageEl.getBoundingClientRect()`, scaling, aspect ratio letterboxing, and Game Boy shells remain mathematically invariant.

## Exact Code Contracts & Signatures

### 1. `VesselDragState` Interface
```typescript
export interface VesselDragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetSeatId: string | null;
  isSnappingBack: boolean;
}
```

### 2. `PatronLayer` Props Update
```typescript
type PatronLayerProps = {
  seats: PatronSeatInput[];
  layoutOverrides?: Record<string, PatronLayout>;
  barCutoffD?: string;
  editMode?: boolean;
  highlightedSeatId?: string | null;
  onSitComplete?: (info: {
    instanceKey: string;
    characterId: string;
    seatId: string;
  }) => void;
  onServeDrinkToSeat?: (seatId: string) => void;
};
```

## Acceptance & Verification Oracles
- Dragging does not trigger if `state.vessel === null`.
- Pointer movements under $6\text{px}$ reliably open the drink build card without initiating a drag session.
- Pointer movements over $6\text{px}$ initiate a drag session, smoothly translating the vessel avatar with cursor/touch coordinates.
- Hovering over a seated patron adds the glow highlight class `.pov-patron-sprite--candidate-target` to that patron's sprite.
- When dragging between two adjacent patrons, collision unambiguously selects the closer patron based on Euclidean centroid distance.

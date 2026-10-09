# FS103 — Patron arrival seating persistence and re-spawning cycle elimination

## Purpose

Establish required product functionality ensuring that patron characters traversing the barroom scene settle permanently into their designated bar seats upon reaching their destination, eliminating the defect state wherein arriving characters continuously re-spawn instead of remaining seated.

Specifically, guarantee that once a patron reaches their assigned bar stool, they immediately transition to and persist in their seated state, displaying their seated visual asset at the counter, maintaining seat occupancy, and preventing runaway re-spawning cycles.

The coding assistant is instructed to independently inspect the codebase, trace the state transitions, timing drivers, and seat occupancy logic across system layers, and identify all necessary edits to achieve these functional outcomes. This document specifies desired `{functionality}`, behavioral boundaries, constraints, and acceptance criteria only; it contains no diagnoses of code failure mechanics, component prescriptions, or implementation instructions.

**Prior:** [functional_specification_102.md](./functional_specification_102.md)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|------|---------|
| **Patron** | An animated customer character present in the bar environment that walks to and occupies a bar stool. |
| **Bar Seat** | A discrete physical seating location (bar stool) along the bar counter available for patron occupancy. |
| **Seated State** | The persistent, stationary state in which a patron occupies a designated bar stool, displays their seated visual asset, halts walking movement, and maintains occupancy. |
| **Re-spawning Cycle** | The defect condition where an arriving patron reaches their assigned stool, fails to persist in the seated state, and is replaced or reset into a newly spawned walking patron, producing continuous looping movement. |
| **Seat Occupancy** | The continuous state wherein a bar seat is reserved and occupied by a patron from the moment of assignment through their active seated duration, preventing duplicate assignments or redundant spawn triggers. |

---

## Specification: Observed `{errors}` vs. Desired `{functionality}`

### Observed `{errors}`
- Patrons continuously spawn at the entry point and walk along their path toward their designated bar stool.
- Upon reaching their destination at the stool, patrons do not settle into a permanent seated posture; instead, they vanish or reset.
- A new patron instance is repeatedly spawned in rapid succession, resulting in an infinite loop of patrons walking in, reaching the seat, and vanishing/re-spawning.
- The bar counter never populates with stationary seated customers, leaving the bar stools visually unoccupied over extended durations despite continuous character spawning activity.

### Desired `{functionality}`
1. **Definitive Seated Transition**:
   - When an arriving patron reaches the end of their walking path at their assigned bar stool, they must cleanly and definitively transition from the walking phase into the seated state.
   - Walking motion and walk-cycle animations must cease upon arrival.
   - The character's seated visual asset must immediately display at the designated stool position and scale.

2. **Seated State Persistence**:
   - Once seated, the patron must remain seated in place continuously at their bar stool for the entire duration of their stay.
   - The seated character must not disappear, reset to the entry point, or revert to walking animations while occupying the seat.

3. **Elimination of Re-spawning Loops**:
   - Reaching a seat must never trigger a despawn, reset, or replacement spawn.
   - Arriving at and occupying a seat must conclusively satisfy that seat's fill requirement.

4. **Continuous Seat Occupancy & Spawn Gating**:
   - An assigned seat must remain strictly occupied while the patron is walking toward it and while the patron is seated on it.
   - Auto-fill spawning mechanisms must recognize occupied seats and never spawn duplicate patrons for a seat that is already claimed or filled.
   - When all physical bar seats are occupied by walking or seated patrons, all auto-fill character spawning must halt entirely until a seat is legitimately vacated.

---

## Edge cases & behavioral boundaries

1. **Multiple Concurrent Patrons**: When multiple patrons walk toward different bar stools simultaneously, each patron must complete their arrival and transition to the seated state independently without resetting other active patrons or causing state collisions.
2. **Sequential Seat Filling**: As successive patrons arrive and sit, previously seated patrons must remain unaffected and stable in their seated state.
3. **Viewport Resizing & Reorientation**: Resizing the window or changing device orientation while patrons are walking or seated must preserve all active patron states, seat occupancies, and seated visual poses without triggering resets or re-spawns.
4. **Full Bar Capacity**: When all bar stools are occupied by seated patrons, the scene must remain in a stable, quiescent state with no background spawn attempts or visual glitches.

---

## Acceptance criteria

| ID | Criteria | Desired Outcome |
|:---|:---|:---|
| **AC1** | **Arrival Seating Completion** | Every patron arriving at their assigned bar stool stops walking and immediately transitions into their seated visual asset. |
| **AC2** | **Seated Pose Persistence** | Seated patrons remain stationary at their bar stool continuously, without disappearing, resetting, or returning to the spawn point. |
| **AC3** | **Zero Re-spawning Cycle** | Arrival at a seat never triggers a reset or continuous re-spawning loop; patrons do not repetitively walk in and vanish. |
| **AC4** | **Occupancy Integrity** | Seats occupied by seated or approaching patrons remain claimed, preventing duplicate assignments or premature re-spawns. |
| **AC5** | **Capacity Quiescence** | When all available bar stools are occupied, automatic patron spawning halts completely until a stool becomes vacant. |

---

## Instruction to Coding Assistant

The coding assistant is instructed to:
1. Independently inspect the patron lifecycle, arrival events, state transitions, and auto-spawning mechanisms across the codebase.
2. Identify all components, drivers, and timing systems requiring edits to ensure patrons transition to and persist in the seated state without re-spawning.
3. Formulate the required architectural plan and edit set without altering unrelated systems.

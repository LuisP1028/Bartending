# FS104 — Patron arrival seating persistence, re-spawn cycle elimination, and component ownership identification

## Purpose

Establish required product functionality ensuring that patron characters navigating the barroom scene transition cleanly and permanently into their designated bar seats upon reaching their destination, eliminating the defect state wherein characters continuously walk, reach their seats, reset, and re-spawn in an infinite loop without ever sitting.

Specifically, guarantee that when an arriving character reaches their destination stool, they cease all walking animation, immediately enter and remain in their stationary seated state displaying their seated visual asset at the counter, maintain continuous seat occupancy, and halt redundant re-spawning.

This document additionally provides explicit instructions for the coding assistant to inspect the architecture and identify exactly which components across the system layers are responsible for each phase of the patron lifecycle, arrival detection, timing, and seating persistence.

**Prior:** [functional_specification_103.md](./functional_specification_103.md)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|------|---------|
| **Patron** | An animated customer character that spawns, walks toward an assigned stool, and occupies the bar seat. |
| **Bar Seat** | A discrete physical seating location (bar stool) along the bar counter available for patron occupancy. |
| **Seated State** | The persistent, stationary state wherein a patron occupies their designated bar stool, displays their seated visual asset, halts all walking movement, and maintains occupancy. |
| **Arrival Reset Loop** | The defect condition verified via automated browser telemetry where an arriving patron traverses the bar to their assigned stool, but upon reaching the destination, fails to transition into the seated state, and instead snaps back to the spawn/entry coordinate to repeat the walk in an endless cycle. |
| **Seat Occupancy** | The uninterrupted state wherein a bar seat is reserved and occupied by a patron from the moment of assignment through their active seated duration, preventing duplicate assignments or redundant spawn triggers. |

---

## Specification: Observed `{errors}` vs. Desired `{functionality}`

### Observed `{errors}` (Verified via Playwright Telemetry)
- In a continuous 30-second live test session, **0% of patrons ever transitioned into the seated state**; all active characters remained perpetually in `data-phase="walking"` with walking animation assets.
- When an arriving character reaches the end of their walk path at their designated stool, they do not settle onto the stool. Instead, their horizontal coordinate immediately resets back toward the spawn point:
  - **Trump (`bar_seat_3`)**: Advances from `left: 16.5%` to `left: 60.3%` at the stool, but upon arrival, immediately snaps back to `left: 22.7%` / `16.9%` and repeats the traversal, cycling indefinitely.
  - **Caesar (`bar_seat_2`)**: Advances to `left: 38.8%`, reaches destination, and immediately snaps back to `left: 17.3%` / `14.0%` in a continuous walking cycle.
  - **Elder (`bar_seat_1`)**: Loops continuously between `left: 12.8%` and `20.5%` without settling into the seat.
- The bar counter remains devoid of stationary seated patrons despite ongoing character spawning and walking activity.

### Desired `{functionality}`
1. **Definitive Seated Transition**:
   - When an arriving patron reaches the end of their walking path at their assigned bar stool, they must definitively transition from the walking phase into the seated state.
   - Walking motion, positional interpolation, and walk-cycle sprite cycling must immediately cease upon arrival.
   - The character's seated visual asset (`sit.png` or equivalent seated sprite) must immediately display at the designated stool position and scale.

2. **Seated State Persistence**:
   - Once seated, the patron must remain seated in place continuously at their bar stool throughout their stay at the bar.
   - A seated patron must never disappear, reset to the entry/spawn coordinates, or revert to walking animations while occupying the stool.

3. **Elimination of Arrival Reset Loops**:
   - Reaching a seat must never trigger a position reset, despawn, or replacement spawn.
   - Arriving at and occupying a seat must conclusively satisfy that seat's fill requirement.

4. **Continuous Seat Occupancy & Spawn Gating**:
   - An assigned seat must remain strictly registered as occupied while a patron is walking toward it and while the patron is seated on it.
   - Auto-fill spawning mechanisms must recognize occupied seats and never spawn duplicate patrons for a seat that is already claimed or filled.
   - When all physical bar seats are occupied by walking or seated patrons, automatic character spawning must halt entirely until a seat is legitimately vacated.

---

## Edge cases & behavioral boundaries

1. **Multiple Concurrent Walkers**: When multiple patrons walk toward different bar stools simultaneously, each patron must complete their arrival and transition to the seated state independently without resetting other active patrons or causing state collisions.
2. **Sequential Seat Filling**: As successive patrons arrive and sit, previously seated patrons must remain unaffected, stationary, and stable in their seated state.
3. **Viewport Resizing & Reorientation**: Resizing the window or changing device orientation while patrons are walking or seated must preserve all active patron states, seat occupancies, and seated visual poses without triggering resets or re-spawns.
4. **Capacity Quiescence**: When all available bar stools are occupied by seated patrons, the scene must remain in a stable, quiescent state with zero background spawn attempts or visual resets.

---

## Acceptance criteria

| ID | Criteria | Desired Outcome |
|:---|:---|:---|
| **AC1** | **Arrival Seating Completion** | Every patron arriving at their assigned bar stool ceases walking and immediately transitions into their seated visual asset (`phase: "seated"`). |
| **AC2** | **Seated Pose Persistence** | Seated patrons remain stationary at their bar stool continuously, without disappearing, resetting coordinates, or returning to the spawn point. |
| **AC3** | **Zero Arrival Reset Loop** | Reaching a seat never snaps a character back to the entrance or triggers infinite walking cycles. |
| **AC4** | **Occupancy Integrity** | Seats occupied by seated or approaching patrons remain claimed, preventing duplicate assignments or premature re-spawns. |
| **AC5** | **Capacity Quiescence** | When all bar stools are occupied, automatic patron spawning halts completely until a stool becomes vacant. |

---

## Instruction to Coding Assistant

The coding assistant is instructed to:
1. **Identify Responsible Components**:
   Thoroughly inspect the codebase and identify which components, modules, hooks, and data definitions are responsible for:
   - Orchestrating patron spawning, auto-fill timers/intervals, and character selection.
   - Calculating bar seat anchors, target coordinates, and walk polylines.
   - Driving frame timing, wall-clock motion progression, and positional updates along the walk path.
   - Detecting destination arrival and executing the state transition from walking to seated.
   - Managing and reserving seat occupancy to prevent duplicate claims.
   - Rendering character sprites, switching visual assets between walking and seated states, and handling layer clipping.
2. **Document Findings in Architectural Plan**:
   Explicitly name and detail the role of each identified component in the required architectural plan and edit set prior to implementing any code changes.
3. **Preserve System Boundaries**:
   Ensure solutions address the root cause of the arrival reset loop without modifying unrelated systems or introducing temporary fallback workarounds.

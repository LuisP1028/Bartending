# FS110 — Physical drag-and-drop cocktail service: Multi-patron order concurrency, validation snap-back, reversed departure motion, and continuous turnover

## Purpose

Establish required product `{functionality}` for the primary barroom service gameplay loop: enabling players to drag built cocktails from the preparation mat and drop them directly onto seated patrons, validating recipes with fail-fast snap-back error physics, executing reversed walk departure animations upon successful service, and instantly spawning replacement patrons to maintain an endless, lively bar simulation.

This bridges the patron staging simulation, cocktail creation mat, and recipe validation logic into a cohesive, interactive service game.

**Prior:**
- [functional_specification_83.md](./functional_specification_83.md) (Multi-patron stage seating & auto-fill)
- [functional_specification_85.md](./functional_specification_85.md) (Concurrent walk motion driver)
- [functional_specification_107.md](./functional_specification_107.md) (Patron visual scale, spawn origin, and bar stool seating standardization)
- [functional_specification_108.md](./functional_specification_108.md) ("Join the bar!" configuration refinement and character prompt file generation)
- [functional_specification_109.md](./functional_specification_109.md) (Hugging Face LLM dialogue node and retro dialogue presentation)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|:---|:---|
| **Live Prep Mat** | The designated countertop area (`drink_placement` / `pov-active-vessel`) where the currently assembled cocktail resides. |
| **Diegetic Drag-and-Drop** | The interactive capability to pick up the completed cocktail from the prep mat and move it freely across the viewport toward a customer. |
| **Concurrent Seat Order Store** | The state management layer maintaining independent, simultaneous drink order records for all active bar stools (`bar_seat_1` through `bar_seat_4`). |
| **Snap-Back Physics** | The deterministic visual and logical return of a dragged drink to its home anchor on the live prep mat whenever validation fails or a drop is released outside valid targets. |
| **Reversed Walk Departure** | The visual departure state where a satisfied patron flips horizontally (`scaleX(-1)`) and steps backward toward the exit with their walk animation frames playing in reverse order. |
| **Immediate Turnover Spawn** | The immediate initiation of a new patron entrance path upon a seat being vacated, bypassing normal idle auto-fill timers. |

---

## Current Baseline & Observed `{errors}`

### Current Gameplay Deficiencies
1. **Stationary, Non-Transferable Cocktails**:
   - Built cocktails are permanently anchored to the `drink_placement` hotspot.
   - Players cannot pick up, move, or deliver drinks directly to patrons.
2. **Disconnected Validation Button**:
   - Validation occurs via an abstract "Serve / Validate" button on the receipt toolbar rather than interacting with the characters seated at the bar.
3. **No Dynamic Multi-Patron Orders**:
   - Currently, the game tracks a single active ticket decoupled from any particular seated guest. Multiple patrons cannot maintain distinct orders simultaneously.
4. **Permanent Seating Without Departure**:
   - Once a patron arrives and sits at a bar stool, they remain seated indefinitely. There is no departure transition, exit path, or seat turnover.

---

## Desired `{functionality}`

### 1. Concurrent Multi-Seat Order Registry
- **Independent Per-Seat State Isolation**:
  - The system must track up to four simultaneous seat records corresponding to `bar_seat_1`, `bar_seat_2`, `bar_seat_3`, and `bar_seat_4`.
  - When any patron transitions to `'seated'`, a random cocktail recipe from the active restaurant mode must be deterministically selected, pinned to a single variant, and assigned to that seat record.
  - An order at `bar_seat_1` must never alter, overwrite, or reset an order at `bar_seat_2`.
- **Order State Lifecycle**:
  - Each seat tracks: `seatId`, `instanceKey`, `characterId`, `assignedRecipe`, `orderStatus` (`'waiting'` | `'served'` | `'departing'`), and `activeDialogue`.

### 2. Diegetic Drag-and-Drop Interaction
- **Pickup from Live Prep Mat**:
  - When a cocktail is present on the mat (`state.vessel !== null`), pressing and dragging on the vessel must initiate a drag session.
  - The dragged drink sprite must follow pointer movement smoothly across the stage without lag or coordinate jumping.
- **Target Detection Over Seated Patrons**:
  - While dragging, hovering over any seated patron bust or bar stool bounding area must highlight the candidate recipient.
  - Dragging must function reliably across desktop mouse controls, touch input on mobile devices, and within responsive Game Boy shell wrappers.

### 3. Recipe Validation Gate
- **Drop Evaluation**:
  - Releasing the dragged drink over a seated patron immediately invokes recipe validation against that specific patron's assigned recipe.
- **Comprehensive Validation Checks**:
  - **Glass Vessel**: Matches required vessel (e.g. Coupe vs. Rocks vs. Highball).
  - **Glass Rim**: Matches required rim (e.g. Salt, Sugar, Tajin, or None).
  - **Ingredients & Ratios**: All required spirits and mixers present within permitted tolerance ($\pm 0.05\text{oz}$); zero unauthorized overpours.
  - **Agitation Method**: Matches required technique (e.g. Shaken, Stirred, Built).
  - **Garnishes**: All required garnishes present; zero missing or extra invalid garnishes.

### 4. Deterministic Rejection & Snap-Back Physics
- **Validation Failure Behavior**:
  - If one or more validation errors exist:
    1. The drink must **not** be consumed or cleared.
    2. The drink must visually animate or instantly snap back to its exact original position on the live prep mat (`vesselSlotStyle`).
    3. The rejection event must invoke the Hugging Face rejection speech pipeline (FS109), displaying the character's reaction in the dialogue box.
    4. The patron remains seated with their order intact, ready for a subsequent delivery attempt.
- **Aborted Drag (Missed Drop)**:
  - If the user releases the drink outside any seated patron drop zone, the drink snaps back to the mat with zero error penalty or dialogue trigger.

### 5. Fulfillment & State Clearing
- **Successful Service Behavior**:
  - If validation passes with zero errors:
    1. The active cocktail is consumed: live prep mat state (`state.vessel`, liquid, ingredients, garnishes) resets to empty.
    2. Any receipt associated with that order is finalized/stamped.
    3. The patron transitions immediately from `'seated'` to `'leaving'`.

### 6. Departure Motion & Reversed Walk Animation
- **Exit Pathing**:
  - The patron leaves their stool and walks horizontally along the floor baseline back toward the entrance spawn origin (`AUTHORITATIVE_SPAWN_ORIGIN` at $x=143, y=659$).
- **Visual Inversion (Flip & Reversed Frames)**:
  - **Horizontal Orientation**: The character sprite is flipped (`transform: scaleX(-1)`) to face leftward toward the exit.
  - **Reversed Walk Frames**: The walking animation frames must play in **reverse sequence** (e.g. Frame $N \rightarrow \dots \rightarrow \text{Frame } 1$) to produce an authentic backward leaving cadence along the floor.
- **Clean Despawn**:
  - Upon reaching the entrance threshold, the patron instance is cleanly removed from stage memory.

### 7. Immediate Turnover Spawning
- **Continuous Bar Simulation**:
  - The instant a patron transitions to `'leaving'` and vacates their stool, an immediate replacement spawn event is triggered without waiting for normal auto-fill intervals.
  - A new character from the unseated roster enters at the spawn point, walks to the vacant seat, receives a freshly generated drink order upon sitting, and continues the cycle.

---

## Edge Cases & Behavioral Boundaries

1. **Dragging with Incomplete or Empty Build**:
   - If the mat has no vessel (`state.vessel === null`), dragging must be disabled.
2. **Dragging Across Multiple Seats**:
   - If the player drags the drink over multiple seated patrons, collision must deterministically select the closest patron based on pointer centroid distance.
3. **Simultaneous Turnover**:
   - If multiple patrons finish drinks in quick succession, each seat must independently process departure and trigger replacement spawning without queue clobbering or race conditions.
4. **Display Scaling & Aspect Ratios**:
   - Drag coordinate transformation must remain mathematically invariant across window resizing, responsive zoom levels, and letterboxed viewBox configurations.

---

## Acceptance Criteria & Success Verification

| ID | Criterion | Measurable Verification |
|:---|:---|:---|
| **AC1** | **Multi-Seat Order Independence** | All four bar seats can hold distinct, pinned cocktail recipes simultaneously without crosstalk. |
| **AC2** | **Diegetic Drag-and-Drop** | User can drag an assembled cocktail from the mat and drop it onto any seated patron. |
| **AC3** | **Recipe Validation Gate** | Dropping a drink triggers full ingredient, glass, rim, and garnish validation against that specific patron's assigned recipe. |
| **AC4** | **Rejection Snap-Back** | An invalid drink immediately snaps back to the prep mat intact, triggering character rejection dialogue. |
| **AC5** | **Drink Consumption on Match** | A correct drink clears the live mat completely and marks the order as fulfilled. |
| **AC6** | **Reversed Departure Motion** | Departing patrons flip horizontally (`scaleX(-1)`) and animate their walking frames in reverse order back to the entrance. |
| **AC7** | **Immediate Replacement Turnover** | Vacating a stool immediately triggers a new patron arrival path from the spawn point to the empty seat. |

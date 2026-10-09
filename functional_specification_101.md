# FS101 — Menu viewport containment and patron population lifecycle

## Purpose

Document two active defect states in the bartending game, contrasting observed `{errors}` with desired `{functionality}`:
1. **Main menu console sizing**: Eliminating viewport overflow and cropping on the menu selection screen.
2. **Patron lifecycle and capacity**: Eliminating endless runaway character spawning and ensuring characters complete their transition into a permanent seated pose at bar stools.

The coding assistant is instructed to independently inspect the codebase, trace the root causes across system layers, and identify all necessary edits to satisfy these requirements. This document specifies behavior, outcomes, constraints, and acceptance criteria only; it contains no diagnoses of code failure mechanics, component prescriptions, or implementation instructions.

**Prior:** [functional_specification_100.md](./functional_specification_100.md)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|------|---------|
| **Menu Console** | The retro handheld console frame presenting the Synthwave Navigator main menu, mode selectors, menu actions, and navigation controls. |
| **Viewport Containment** | Proportional scaling geometry where an entire interface element is strictly contained within the visible viewport boundaries on both axes without clipping. |
| **Bar Capacity** | The finite maximum number of patron characters permitted simultaneously in the bar, strictly determined by the number of physical bar stools. |
| **Seated State** | The stationary state where a patron character occupies a bar stool, displays their seated visual asset, and ceases all walking motion. |
| **Runaway Spawning** | An error condition where the system continuously generates new character instances beyond the physical seating capacity of the environment. |

---

## Specification: Observed `{errors}` vs. Desired `{functionality}`

### 1. Main Menu Console Viewport Containment

#### Observed `{errors}`
- When transitioning from the boot intro to the main menu screen, the console presentation is mis-sized and oversized relative to the viewport.
- The top of the console casing and the top of the menu playfield are cropped outside the screen boundaries.
- Menu options (`JOIN THE BAR!`, `WARP DIAGNOSTICS`, `TERMINATE UPLINK`) and mode badges are pushed upward into the top bezel.
- The console controls and casing borders are clipped and do not fit proportionally within the viewable window.

#### Desired `{functionality}`
- **Universal Containment**: The entire menu console must scale proportionally to fit completely within the active viewport on any screen size, device category (mobile phones, tablets, laptops, desktop monitors), and orientation (portrait and landscape).
- **Zero Viewport Overflow**: Neither the width nor the height of the console may exceed 100% of the viewport bounds.
- **Centering & Alignment**: The console must remain centered within the visible window without vertical or horizontal displacement clipping the housing.
- **Full Control & Text Visibility**: All console elements—top housing, screen playfield, Synthwave Navigator menu items, mode badges, D-pad, action buttons, and SELECT/START controls—must be 100% visible, legible, and unclipped.

---

### 2. Patron Population Bounds and Seating Lifecycle

#### Observed `{errors}`
- In the interactive bar scene, character spawning fires continuously without bound, creating an endless stream/population of characters.
- Characters never transition into a stationary seated pose; they remain perpetually in motion or fail to settle onto bar stools.
- Physical bar seating capacity is disregarded, resulting in an unconstrained accumulation of spawned character instances.

#### Desired `{functionality}`
- **Strict Capacity Gating**: Character spawning must be strictly bounded by the physical bar stools. The maximum number of active characters in the scene must never exceed the number of available stools.
- **Deterministic Walk-to-Sit Completion**: Each spawned patron must travel toward their assigned unoccupied stool, stop walking upon arrival, and transition immediately and definitively into the seated state.
- **Seated Pose Persistence**: Once seated, the patron must remain stationary at the counter displaying their seated visual asset throughout their stay, without resetting into walking movement.
- **Zero Runaway Spawning**: While all bar stools are occupied by seated or approaching patrons, all auto-fill spawning must halt completely. New character spawning may only occur when a stool becomes vacant.

---

## Edge cases & behavioral boundaries

1. **Window Resizing During Menu Display**: Dynamically resizing the browser window while on the main menu must dynamically rescale the console, preserving containment and centering without clipping.
2. **Simultaneous Seat Approaching**: If multiple patrons approach stools concurrently, each character must independently complete their walk-to-sit transition without desynchronizing seat occupancy tracking.
3. **Empty Roster / Single Character Fallback**: If the pool of available character definitions is smaller than the number of stools, the system must not spawn duplicate active identities or enter an infinite loop attempting to fill remaining seats.

---

## Acceptance criteria

| ID | Criteria | Desired Outcome |
|:---|:---|:---|
| **AC1** | **Menu Console Containment** | On all screen sizes and orientations, the complete main menu console housing and all menu options are 100% visible with zero clipping. |
| **AC2** | **Menu Legibility & Alignment** | Synthwave Navigator menu items, mode badges, and console buttons are fully legible and centered within the viewport. |
| **AC3** | **Bounded Bar Population** | The total number of spawned character instances never exceeds the count of physical bar stools. |
| **AC4** | **Definitive Seated Transition** | Every arriving patron ceases walking upon reaching their assigned stool and transitions into their stationary seated pose. |
| **AC5** | **Seated Pose Stability** | Seated patrons maintain their seated visual asset continuously at the counter without reverting to walk animations. |
| **AC6** | **Spawning Halt on Full Bar** | Auto-fill spawning halts completely once all bar stools are occupied. |

---

## Instruction to Coding Assistant

The coding assistant is instructed to:
1. Independently analyze the active codebase across presentation, styling, layout, and state management layers.
2. Identify all components, styles, and logic flows that require edits to resolve the observed `{errors}` and satisfy the desired `{functionality}`.
3. Formulate the required architectural plan and edit set without altering unrelated systems.

# Functional Specification 009: 3D Nintendo Game Boy Console Housing with Native-Color DITHER-OS Bartending Screen & Physical Control Mapping

## 1. Overview & Objective

The objective of this specification is to define the exact desired `{functionality}`, behavioral requirements, inputs, outputs, edge cases, invariants, and acceptance criteria for embedding the live **DITHER-OS Bartending** game (`LuisP1028/Bartending`) directly inside the screen of the interactive 3D **Nintendo Game Boy** asset (`Snokke/game-boy-challenge`) within a browser runtime.

This document describes only the desired behavior, observable outcomes, constraints, inputs, outputs, and evaluation criteria. It contains zero implementation guidance, code sketches, component breakdowns, or architectural prescriptions.

**DO NOT CODE YET.** No coding, scaffolding, or implementation planning may proceed until explicit operator authorization is granted.

---

## 2. Glossary & Evaluation Taxonomy Alignment

All state assessments and verification gates in this specification strictly adopt the authoritative definitions established in `LANGUAGE.md`:

* **`{errors}`**: Explicit failure states surfaced during execution, including stack traces, syntax errors, unhandled exceptions, compilation failures, non-zero exit codes, fatal timeouts, broken asset loads, or severe warnings that halt execution.
* **`{correctness}`**: Precise local execution of each behavior—verifying accurate spatial alignment, color fidelity, input routing, state transitions, and boundary conditions without logical flaws, even when no explicit `{errors}` are thrown.
* **`{functionality}`**: The global objective of presenting and playing the full-color DITHER-OS Bartending experience inside the 3D Nintendo Game Boy screen, controllable seamlessly via both direct screen interaction and the 3D console's physical buttons.
* **`{correct required outputs}`**: Objectively measurable states after execution, including rendered 3D geometry, native-color screen presentation, deterministic button-to-action transitions, and zero console/network failures.
* **`{sufficient}`**: The documentation state where zero ambiguity remains and implementation can proceed without guessing or hallucinating context.
* **`{insufficient}`**: Any state where missing context, unstated behaviors, or ambiguous requirements would force assumptions.

---

## 3. Input Specifications & Source Assets

### 3.1 3D Console Asset Inputs (`Snokke/game-boy-challenge`)
1. **3D Console Geometry (`game-boy.glb`)**:
   * Contains exclusively the fifteen (15) articulated Nintendo Game Boy console parts:
     - `body`
     - `screen`
     - `cartridge-pocket`
     - `power-button`
     - `power-button-frame`
     - `power-indicator`
     - `volume-control`
     - `button-a`
     - `button-b`
     - `button-select`
     - `button-start`
     - `button-cross-up`
     - `button-cross-down`
     - `button-cross-left`
     - `button-cross-right`
   * External game cartridges (`game-boy-cartridge.glb`) and standalone cartridge games (Tetris, Space Invaders, Zelda) are excluded from the scene.
2. **Baked Console Surface Textures**:
   * `baked-game-boy.jpg`: Applied to the primary console housing (`body`), action buttons (`button-a`, `button-b`, `button-select`, `button-start`), directional pad (`button-cross-up`, `button-cross-down`, `button-cross-left`, `button-cross-right`), power switch (`power-button`, `power-button-frame`), and volume wheel (`volume-control`).
   * `baked-cartridge-pocket.jpg`: Applied to the rear cartridge slot (`cartridge-pocket`).
   * `baked-power-indicator.jpg`: Applied to the battery LED indicator (`power-indicator`), supporting unlit (off) and illuminated red (on) states.
   * `baked-screen-shadow.png`: Optional inner-bezel drop-shadow overlay aligned to the `screen` UV bounds.

### 3.2 Embedded Game Inputs (`LuisP1028/Bartending`)
The embedded game is the complete **DITHER-OS Bartending** application comprising three primary operational phases and all associated diegetic sub-flows:
1. **Boot Intro Phase**: Studio boot video sequence (`doom_gamestudio.mp4`) with tap/button skip support.
2. **Main Menu ("Navigator") Phase**: Synthwave navigation terminal containing:
   * **Mode Selection**: Selectable mode emblems (`OBELISCO` and `CLASSICS`).
   * **Join the bar!**: Two-stage patron onboarding workflow consisting of the **Comm-Link** identity form followed by the **Camera** capture and patron generation pipeline.
3. **Gameplay ("Playfield") Phase**: The interactive lounge bartending simulator containing:
   * Barroom point-of-view stage (`OBELISCO_POV.jpg`), seated patrons, and interactive conversation/order dialogue boxes (`RetroRpgDialogueBox` / Character Conversation Box).
   * Spatial bar category hotspots (`liquors`, `syrups`, `garnishes`, `glassware`, `rims`, `hardware` including `juices`, `speedrail`, and `ice`).
   * Localized category overlays with magnification carousels for selecting glassware, pouring ingredients, adding garnishes/rims, and applying bar tools.
   * Active cocktail vessel on the bar mat (supporting click to inspect the Drink Build Card and drag-and-drop delivery to seated patrons).
   * Diegetic receipt printer, ticket rack, and jigger pour volume controls.

---

## 4. Desired `{functionality}` & Behavioral Requirements

### 4.1 3D Console Presentation & Isolation
* The browser viewport renders the 3D Nintendo Game Boy console asset centered in 3D space with its baked surface textures accurately mapped and uncorrupted.
* Only the Nintendo Game Boy console asset (its 15 constituent parts) is present in the 3D console view; no external cartridge meshes are rendered.
* Users can view the 3D console housing and actuate its physical controls with tactile 3D button depression/rotation feedback:
  - Pressing `button-a`, `button-b`, `button-select`, or `button-start` depresses the corresponding 3D button mesh along its local press axis and returns it smoothly on release.
  - Pressing `button-cross-up`, `button-cross-down`, `button-cross-left`, or `button-cross-right` tilts the 3D directional cross assembly toward the actuated direction and restores it to neutral on release.

### 4.2 Native-Color Bartending Screen Integration
* The `screen` mesh of the 3D Game Boy asset displays the live **DITHER-OS Bartending** interface fitted cleanly within the screen bezel bounds (`1.238 × 1.092` console screen aspect area) without clipping critical HUD controls, stretching, or UV inversion.
* **Strict Native Color Preservation**:
  - The legacy Game Boy `#96a06e` monochrome olive-green color matrix tint is completely bypassed/disabled.
  - All visuals of the Bartending game—including the boot video, synthwave menu, gold mode emblems, Obelisco bar photography, patron sprites, liquid colors, money flybys, and retro RPG dialogue boxes—render in their **original, unmodified native colors**.

### 4.3 Dual-Modal Input & Physical Button Mapping
The system must support harmonious operation between **direct pointer interaction on the screen** and **3D physical Game Boy button actuation** (via clicking the 3D button meshes or pressing their bound keyboard equivalents):

#### 1. Directional Pad (`D-Pad`: `Up`, `Down`, `Left`, `Right`) — Scroll & Navigate Options
* **In Main Menu (`Navigator`)**:
  - `Up` / `Down`: Scrolls focus vertically between menu rows (`Mode Selection` and `Join the bar!`).
  - `Left` / `Right`: When `Mode Selection` is focused, scrolls focus horizontally between the `OBELISCO` and `CLASSICS` mode emblems.
* **In "Join the bar!" (`Comm-Link` / `Camera`)**:
  - `Up` / `Left`: Moves focus to the previous interactive field or control.
  - `Down` / `Right`: Moves focus to the next interactive field or control.
* **In Gameplay (`Playfield` — Category Carousel Closed)**:
  - `Up` / `Down` / `Left` / `Right`: Moves spatial focus across the bar's interactive category hotspots (`POV_CATEGORY_HOTSPOTS`), visually highlighting the currently focused hotspot zone without shifting or panning the stationary bar stage.
* **In Gameplay (`Playfield` — Category Carousel Open)**:
  - `Left`: Steps the open magnification carousel to the previous item.
  - `Right`: Steps the open magnification carousel to the next item.
  - `Up`: Jumps to the first item in the open magnification carousel.
  - `Down`: Jumps to the last item in the open magnification carousel.
* **In Patron Conversation / Dialogue Overlays**:
  - `Up` / `Down` / `Left` / `Right`: Cycles focus among selectable conversation starters, input controls, or dialogue actions when a conversation overlay is active.

#### 2. `B` Button (`button-b`) — Interact / Confirm / Select
* **In Boot Intro**: Counts toward or triggers advancing/interacting with the intro sequence.
* **In Main Menu (`Navigator`)**:
  - When `Mode Selection` is active: Confirms the currently focused mode emblem (`OBELISCO` or `CLASSICS`), switches to that mode if different, and enters the live gameplay phase.
  - When `Join the bar!` is active: Opens the `Join the bar!` Comm-Link onboarding overlay inside the screen.
* **In "Join the bar!" (`Comm-Link` / `Camera`)**:
  - Activates/submits the currently focused Comm-Link control or triggers camera capture when on the capture control.
* **In Gameplay (`Playfield` — Category Carousel Closed)**:
  - Opens the category overlay carousel for the currently focused bar hotspot zone.
* **In Gameplay (`Playfield` — Category Carousel Open)**:
  - Interacts with and applies the currently centered/focused carousel item (selects the glass vessel, pours the liquor/syrup/juice ingredient at the active jigger volume, adds the garnish or rim, or applies the bar hardware/ice tool).
* **In Patron Conversation / Dialogue Overlays**:
  - Selects the focused conversation starter, submits the active action, or advances finished typewriter dialogue.

#### 3. `A` Button (`button-a`) — Back / Cancel / Dismiss
* **In "Join the bar!" Stack**:
  - If in `Camera` view: Returns to the Main Menu (`camera → menu`) without aborting any background generation job already in flight.
  - If in `Comm-Link` view: Closes `Comm-Link` and returns to the root Main Menu (`comm → menu`).
* **In Root Main Menu (`Navigator`)**:
  - Exits the Main Menu and returns to the live bartending gameplay phase.
* **In Gameplay (`Playfield`)**:
  - If a category carousel overlay is open: Closes the open category carousel and restores spatial focus to the bar hotspot without losing the current drink build.
  - If the Drink Build Card or a patron dialogue/conversation overlay is open: Dismisses the open card/overlay and returns to the bar stage.

#### 4. `Start` Button (`button-start`) — Trigger Game Immediately
* Pressing the `Start` button from **any** non-play state (including immediately during the `Boot Intro` video, from the root `Main Menu`, or while viewing an overlay) immediately transitions the screen into the active bartending **Gameplay (`Playfield`)** phase so the player can begin bartending right away.
* If already in the Gameplay phase with transient overlays open, pressing `Start` ensures the active gameplay stage is immediately ready for play.

#### 5. `Select` / Options Button (`button-select`) — Trigger Menu ("Join the bar!", Mode Selection)
* Pressing the `Select` (Options) button from the `Boot Intro` or from the active **Gameplay (`Playfield`)** phase immediately opens the **Main Menu (`Navigator`)** inside the Game Boy screen, presenting `"Mode Selection"` (`OBELISCO` / `CLASSICS`) and `"Join the bar!"` while preserving the player's in-progress bar session and parked drink builds in memory.

#### 6. Direct Screen Pointer Interaction Coexistence
* Clicking, tapping, or dragging directly inside the Game Boy `screen` area interacts natively with the Bartending UI (clicking hotspots, scrolling/clicking carousel items, clicking jigger volumes, inspecting receipts, clicking patrons, typing in conversation or Comm-Link inputs, and dragging a built drink from the bar mat to a seated patron).
* Direct screen interactions must not inadvertently trigger uncontrolled 3D console tumbling during active drink drag-and-drop or UI control manipulation.

---

## 5. Edge Cases, Constraints & Fail-Fast Invariants

1. **INV-COLOR-01 (Zero Monochrome Tint)**:
   * Under no circumstances may the `#96a06e` Game Boy color matrix or any grayscale/green-scale filter be applied to the DITHER-OS Bartending screen output, including after mode switches, menu transitions, or video completions.
2. **INV-BUTTON-01 (`B` = Interact, `A` = Back, `Start` = Immediate Game, `Select` = Menu)**:
   * The physical button bindings must strictly follow the operator's specification (`D-Pad` scrolls options, `B` interacts/selects, `A` goes back/closes, `Start` triggers the game immediately, and `Select`/Options triggers the menu containing `"Join the bar!"`). Any legacy inverted mapping where `A` selects and `B` goes back, or where `Start` opens the menu instead of triggering the game, must be updated so all layers behave consistently.
3. **INV-CAROUSEL-DISMISS-01 (Button Press Protection)**:
   * Clicking or pressing the 3D Game Boy physical buttons (`D-Pad`, `B`, `A`, `Start`, `Select`) while a category carousel is open must never be misinterpreted as an "outside click" that prematurely closes the carousel before the button's intended action (`step`, `interact`, etc.) executes.
4. **INV-DRAG-01 (Cocktail Delivery vs. Console Rotation Isolation)**:
   * Dragging a prepared drink vessel from the bar mat to a seated patron inside the screen must route pointer motion exclusively to the drink delivery handler without rotating the 3D Game Boy body mid-drag.
5. **INV-FAILFAST-01 (Zero Silent Fallbacks)**:
   * Missing 3D model binaries (`game-boy.glb`), missing baked textures, unresolvable game modes, or failed backend API calls must surface explicit `{errors}` immediately without silent exception suppression or mock placeholder states.

---

## 6. Acceptance Criteria & Verification (`{correct required outputs}`)

| ID | Parameter | Verification Requirement |
| :--- | :--- | :--- |
| **AC-01** | `{functionality}` | The 3D Nintendo Game Boy asset (`game-boy.glb`, 15 parts, baked textures, zero cartridges) renders in the browser with the live DITHER-OS Bartending application mounted inside the `screen` mesh. |
| **AC-02** | `{correctness}` | The Bartending screen retains 100% of its native colors (`OBELISCO_POV.jpg`, synthwave menu, gold logos, drink liquids, patron sprites, dialogue boxes) with zero `#96a06e` green tinting. |
| **AC-03** | `{functionality}` | Actuating the 3D **D-Pad** (`Up`, `Down`, `Left`, `Right`) scrolls menu rows, switches mode emblems (`OBELISCO` / `CLASSICS`), traverses Comm-Link fields, moves spatial focus across bar category hotspots, and steps through open magnification carousel items. |
| **AC-04** | `{functionality}` | Actuating the 3D **`B` Button** (`button-b`) interacts with and confirms the focused target (launches selected mode, opens `"Join the bar!"`, activates Comm-Link action, opens focused bar hotspot carousel, or adds/applies the focused carousel item to the drink build). |
| **AC-05** | `{functionality}` | Actuating the 3D **`A` Button** (`button-a`) performs the Back/Cancel action (steps back through `camera → comm → menu`, exits menu to gameplay, or closes an open category carousel / Drink Build Card / dialogue overlay). |
| **AC-06** | `{functionality}` | Actuating the 3D **`Start` Button** (`button-start`) immediately triggers and enters the live bartending gameplay (`Playfield`) phase from intro or menu. |
| **AC-07** | `{functionality}` | Actuating the 3D **`Select` / Options Button** (`button-select`) opens the Synthwave Navigator menu featuring `"Mode Selection"` and `"Join the bar!"` while preserving session state. |
| **AC-08** | `{correctness}` | Direct pointer interactions inside the screen (clicking hotspots, selecting jigger volumes, typing in forms, and dragging drinks to patrons) function accurately alongside 3D console button controls. |
| **AC-09** | `{errors}` | Zero unhandled runtime exceptions, zero WebGL/shader compilation errors, zero broken texture/model loads, and zero input event deadlocks occur across all phase transitions. |

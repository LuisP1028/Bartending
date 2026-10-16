# Functional Specification 120: Removal of External Header Mode Buttons & Ticket Toolbar Controls, Interactive 3D Game Boy Axis Spin & Mobile Shake-to-Center Reset (`(0, 0, 0)`)

## 1. Overview & Objective

The objective of this specification is to define the exact desired `{functionality}`, user interaction flows, visual and spatial states, constraints, edge cases, inputs, outputs, and acceptance criteria for four console presentation and interaction refinements:

1. **Remove Header `OBELISCO` / `CLASSICS` Mode Buttons**: Eliminating the external header bar and its `OBELISCO` / `CLASSICS` mode-switching buttons rendered outside the 3D Game Boy console during gameplay.
2. **Remove `"Generate Ticket"` and `"Validate Ticket"` (`"Validate Drink"`) Buttons**: Eliminating the external ticket control bar containing the `"Generate Ticket"` button, `"Validate Ticket"` / `"Validate Drink"` button, and active ticket text hint rendered outside the 3D Game Boy console during gameplay.
3. **Interactive 3D Game Boy Axis Spin**: Allowing the player to grab and drag the 3D Game Boy console (or surrounding 3D viewport space outside the interactive screen and physical buttons) to smoothly spin and inspect the 3D Game Boy on its axis in 3D space, while keeping the live bartending screen locked to the 3D screen bezel surface and preserving full screen and physical button interactivity.
4. **Device Shake-to-Center Reset (`(0, 0, 0)`)**: Detecting when a user shakes their mobile device and automatically returning/centering the 3D Game Boy's rotation to its neutral front-facing orientation `(0, 0, 0)`.

This document specifies only the desired `{functionality}`, observable behaviors, visual states, constraints, edge cases, inputs, outputs, and verification criteria. It contains zero implementation instructions, component breakdowns, code sketches, library recommendations, architectural advice, or "how to build" language.

**DO NOT CODE YET.** No coding, scaffolding, or implementation planning may proceed until this specification is established and the subsequent planning workflow is executed.

---

## 2. Glossary & Evaluation Taxonomy Alignment

All state assessments and verification gates in this specification strictly adopt the authoritative definitions established in `LANGUAGE.md`:

* **`{errors}`**: Explicit failure states surfaced during execution or rendering, including browser console errors, unhandled runtime exceptions, network request failures (HTTP 4xx/5xx), broken 3D/texture assets, or failed device motion event handling.
* **`{correctness}`**: Exact behavioral, visual, and spatial fidelity across all four requirements—verifying complete absence of the external header mode bar and external ticket toolbar, smooth interactive 3D axis spinning of the Game Boy with perspective-synchronized screen alignment and rear-face occlusion, deterministic shake-to-center reset to `(0, 0, 0)` upon device shake, and preserved inside-screen and physical button operation without `{errors}`.
* **`{functionality}`**: The end-to-end operational state in which the 3D Game Boy occupies a clean, chrome-free viewport without external header or footer debug/mode toolbars, can be interactively rotated on its axis in 3D space by the user, and smoothly re-centers to `(0, 0, 0)` when the user shakes their phone.
* **`{correct required outputs}`**: Objectively measurable visual, geometric, and behavioral states verified directly in the live browser runtime across desktop and mobile viewports via automated inspection and visual captures.
* **`{sufficient}`**: The documentation state where zero ambiguity remains regarding desired outcomes, rotational degrees of freedom, screen behavior during rotation, shake detection thresholds, and verification criteria.
* **`{insufficient}`**: Any state where behavioral, visual, or geometric requirements are ambiguous, incomplete, or contradictory.

---

## 3. Inputs & Trigger Conditions

1. **Gameplay Phase Entry (`play`)**:
   * Transitioning from the boot intro or main menu into active bar gameplay across both desktop (`1280×800`) and mobile portrait (`390×844`) viewports.
2. **Pointer / Touch Drag Gesture on the 3D Console Housing or Background**:
   * Mouse click-and-drag or single-finger touch-and-drag initiated on the 3D Game Boy casing (`body`, `cartridge-pocket`, bezel frame) or the surrounding 3D viewport background outside the interactive game screen and physical action buttons (`D-Pad`, `A`, `B`, `START`, `SELECT`, `power-button`).
3. **Mobile Device Shake Gesture**:
   * Rapid physical acceleration of a mobile device exceeding a deterministic shake threshold across one or more spatial axes, after device motion sensor access is active (including after initial user tap permission on iOS mobile browsers).
4. **In-Screen & Physical Button Interactions**:
   * Clicking or tapping physical console buttons (`D-Pad`, `A`, `B`, `START`, `SELECT`, `power-button`) and interacting with inside-screen gameplay elements (bar hotspots, carousels, seated patrons, dialogue boxes, and drink dragging).

---

## 4. Desired `{functionality}` & Behavioral Requirements

### 4.1 Remove External Header `OBELISCO` / `CLASSICS` Mode Switcher Buttons
* **Complete Removal of External Header Bar**:
  - During active gameplay (and across all console phases), no external header bar containing the `OBELISCO` or `CLASSICS` mode-switching buttons may be rendered above or outside the 3D Game Boy console.
  - The 3D Game Boy viewport must occupy the full browser window without vertical displacement or space reserved for an external top header bar.
* **Preserved Diegetic Mode Switching**:
  - Switching between `OBELISCO` and `CLASSICS` modes remains fully functional inside the Game Boy screen via the Main Menu (accessible at startup or by pressing the console's `SELECT` / Options button).

---

### 4.2 Remove External `"Generate Ticket"` and `"Validate Ticket"` (`"Validate Drink"`) Buttons
* **Complete Removal of External Ticket Toolbar**:
  - During active gameplay (and across all console phases), no external bottom toolbar containing the `"Generate Ticket"` button, `"Validate Ticket"` / `"Validate Drink"` button, active ticket text hint (`ACTIVE: ...` / `NO ACTIVE TICKET`), or external validation banner may be rendered below or outside the 3D Game Boy console.
  - The 3D Game Boy viewport must not be vertically compressed or scrolled by an external bottom toolbar.
* **Preserved Diegetic Ticket Generation & Drink Validation**:
  - Order tickets continue to generate and print diegetically inside the bar stage whenever patrons arrive and take a seat at the bar.
  - Drink validation, rejection dialogue, money flyby rewards, and patron serving handoffs continue to execute diegetically when the player drags the active drink vessel from the bar mat onto a seated patron.

---

### 4.3 Interactive 3D Game Boy Axis Spin
* **Direct Axis Rotation via Pointer / Touch Drag**:
  - When a user initiates a pointer or touch drag on the 3D Game Boy body (or the surrounding 3D canvas outside the interactive screen and physical buttons) and moves horizontally (and optionally with subtle vertical tilt), the 3D Game Boy console smoothly spins around its central axis in 3D space.
  - Horizontal dragging spins the console a full 360° continuously around its vertical (`Y`) axis so the user can inspect the front face, left and right profiles (including the volume wheel and power switch), and the rear casing (including the `cartridge-pocket`).
  - Vertical dragging applies a bounded pitch tilt around the horizontal (`X`) axis (clamped within a comfortable viewing range so the console never flips upside-down uncontrollably).
* **Non-Interference with Screen & Physical Buttons**:
  - Pointer or touch interactions initiated inside the active Bartending screen (when facing the camera) must route directly to the in-game UI (clicking stations, scrolling carousels, inspecting patrons, dragging drinks to patrons) without spinning the 3D Game Boy.
  - Clicking or tapping a physical 3D console button (`D-Pad`, `A`, `B`, `START`, `SELECT`, `power-button`) without dragging must actuate that button normally without unintended rotation drift.
* **Synchronized 3D Screen Alignment & Back-Face Occlusion**:
  - As the 3D Game Boy spins on its axis, the live Bartending screen must remain spatially anchored and perspective-transformed onto the 3D `screen` surface of the console rather than remaining a flat, un-rotated 2D rectangle floating detached from the rotated 3D body.
  - When the 3D Game Boy is spun past edge-on (`> 90°` from front-facing, i.e., when the rear of the Game Boy faces the camera), the front screen overlay must be hidden (`backface-visibility: hidden` / occluded) and non-interactive so the rear `cartridge-pocket` and back shell are cleanly visible without the 2D screen bleeding through the back of the console.
  - Physical button hit overlays must stay dynamically projected to the current 3D button positions when the front face is oriented toward the camera, and users can also click the 3D button meshes directly via 3D raycasting at any front-facing angle.

---

### 4.4 Device Shake-to-Center Reset (`(0, 0, 0)`)
* **Mobile Shake Detection**:
  - When the application runs on a device supporting motion events, shaking the phone (producing a sharp linear or total acceleration delta exceeding a deterministic shake threshold within a short cooldown window) must trigger a **Center Reset** of the 3D Game Boy.
  - On mobile platforms that require explicit user-gesture permission for motion sensors (such as iOS 13+ Safari), the permission request must be automatically triggered on the first user touch/tap interaction without blocking gameplay if permission is denied or unsupported.
* **Smooth Return to `(0, 0, 0)`**:
  - Upon detecting a shake (or a deterministic reset trigger), the 3D Game Boy's target rotation immediately resets to `(0, 0, 0)` (shortest-angle unwrap back to `0` radians on all axes) and smoothly animates back to the neutral front-facing orientation `(0, 0, 0)` where the Bartending screen and physical controls face the player squarely.

---

## 5. Invariants, Constraints & Edge Cases

* **`INV-NO-EXTERNAL-CHROME-01` (Zero External Header Mode Buttons or Ticket Toolbar)**:
  - Across all application phases (`intro`, `menu`, `play`), zero external `.sys-header` mode buttons (`OBELISCO`, `CLASSICS`) and zero external `.receipt-toolbar` controls (`Generate Ticket`, `Validate Drink` / `Validate Ticket`) exist in the DOM outside the 3D Game Boy console.
* **`INV-3D-AXIS-SPIN-01` (Smooth 3D Axis Rotation & Back-Face Screen Occlusion)**:
  - Dragging the 3D Game Boy housing or canvas background rotates the 3D console smoothly around its axis; the screen transforms in 3D synchrony with the console's front face and is occluded when the back of the console faces the camera (`cos(rotY) <= 0`).
* **`INV-SCREEN-INTERACT-01` (Unbroken In-Screen & Button Interactivity)**:
  - When the Game Boy faces the player, clicking hotspots, operating carousels, dragging drinks to patrons, and pressing physical `D-Pad`, `A`, `B`, `START`, and `SELECT` controls operate with zero pointer interception from the 3D spin handler.
* **`INV-SHAKE-RESET-01` (Deterministic Shake-to-Center `(0, 0, 0)` Reset)**:
  - Dispatching or experiencing a device shake motion spike above threshold smoothly resets the 3D Game Boy rotation back to `(0, 0, 0)`.
* **`INV-FAILFAST-01` (Zero Silent Fallbacks or Runtime Errors)**:
  - All 3D asset loads, projection updates, and motion listeners must execute with zero console errors or unhandled exceptions.

---

## 6. Acceptance Criteria & Verification (`{correct required outputs}`)

| ID | Criterion | Expected Measurable Outcome (`{correct required outputs}`) |
| :--- | :--- | :--- |
| **`AC-01`** | **Header `OBELISCO` / `CLASSICS` Buttons Removed** | In `play` phase on both desktop (`1280×800`) and mobile (`390×844`), zero external `.sys-header` or `.mode-btn` elements are rendered outside the 3D Game Boy console, and the 3D shell fills 100% of the viewport height. |
| **`AC-02`** | **`"Generate Ticket"` & `"Validate Ticket"` Buttons Removed** | In `play` phase on both desktop and mobile, zero `.receipt-toolbar` elements and zero `"Generate Ticket"` or `"Validate Drink"` / `"Validate Ticket"` buttons exist in the DOM. |
| **`AC-03`** | **Interactive 3D Game Boy Axis Spin & Screen Sync** | Dragging on the 3D Game Boy body/canvas rotates the 3D console on its axis (`rotationY` / `rotationX` change proportionally); the embedded screen rotates in 3D perspective with the console face and hides cleanly when rotated to view the back (`cartridge-pocket`, `|rotationY| > 90°`). |
| **`AC-04`** | **Phone Shake Resets Rotation to `(0, 0, 0)`** | When the 3D Game Boy is rotated away from `(0, 0, 0)` and a device shake motion event (`devicemotion` acceleration spike) occurs, the console target rotation immediately resets to `(0, 0, 0)` and animates smoothly back to `(0, 0, 0)`. |
| **`AC-05`** | **Preserved Gameplay & Zero `{errors}`** | With the console at `(0, 0, 0)`, all physical buttons (`D-Pad`, `A`, `B`, `START`, `SELECT`) and inside-screen interactions (hotspots, carousels, patron inspection, drink serving) work with zero console errors or uncaught page exceptions. |

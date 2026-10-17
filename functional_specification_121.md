# Functional Specification 121: Mobile Camera Screen-Zoom on D-Pad Activation & Automatic Zoom-Out on Console Rotation

## 1. Overview & Objective

The objective of this specification is to define the exact desired `{functionality}`, user interaction flows, visual and spatial states, constraints, edge cases, inputs, outputs, and acceptance criteria for **Mobile Camera Screen-Zoom on D-Pad Activation & Automatic Zoom-Out on Console Rotation**:

1. **Mobile Camera Zoom Into Game Boy Screen on D-Pad Click**: On mobile viewports, when the user clicks or taps any of the four directional buttons on the Game Boy's physical D-Pad (`Up`, `Down`, `Left`, `Right`), the 3D viewport camera smoothly zooms in toward the Game Boy console so that the Game Boy's screen fills the mobile viewport while remaining diegetically rendered inside the 3D Game Boy shell.
2. **1:1 Screen & Playfield Registration While Zoomed**: Throughout the zoom-in transition, while zoomed in, and during zoom-out, the live interactive game screen remains strictly registered 1:1 to the 3D Game Boy's screen aperture without detachment, cropping mismatch, or loss of touch interactivity.
3. **Automatic Camera Zoom-Out to Normal Framing on Console Rotation**: When the user initiates a drag gesture to rotate the 3D Game Boy console on its axis, the camera automatically exits the zoomed-in state and smoothly zooms back out to the normal full-console framing while rotating the console in 3D space.

This document specifies only the desired `{functionality}`, observable behaviors, visual states, constraints, edge cases, inputs, outputs, and verification criteria. It contains zero implementation instructions, component breakdowns, code sketches, library recommendations, architectural advice, or "how to build" language.

**DO NOT CODE YET.** No coding, scaffolding, or implementation planning may proceed until the user explicitly confirms that this specification constitutes a shared understanding of the desired `{functionality}` and authorizes the next step.

---

## 2. Glossary & Evaluation Taxonomy Alignment

All state assessments and verification gates in this specification strictly adopt the authoritative definitions established in `LANGUAGE.md`:

* **`{errors}`**: Explicit failure states surfaced during execution or rendering, including browser console errors, unhandled runtime exceptions, network request failures (HTTP 4xx/5xx), broken 3D/texture assets, or failed projection/camera states.
* **`{correctness}`**: Exact behavioral, visual, and spatial fidelity across all requirements—verifying that clicking any D-Pad button on mobile zooms the 3D camera so the Game Boy screen fills the mobile viewport width/height while still rendered on the 3D Game Boy shell, that the interactive game playfield stays 1:1 co-registered with the 3D screen surface, that rotating the console zooms the camera back out to the normal full-console view, and that zero `{errors}` occur.
* **`{functionality}`**: The end-to-end operational state in which mobile players can trigger a close-up, screen-filling view of the Game Boy screen by pressing any D-Pad direction (while executing the corresponding D-Pad action) and seamlessly return to the full-console 3D view by rotating the console.
* **`{correct required outputs}`**: Objectively measurable visual, geometric, and behavioral states verified directly in the live browser runtime across mobile and desktop viewports.
* **`{sufficient}`**: The documentation state where zero ambiguity remains regarding desired outcomes, zoom framing geometry, trigger conditions, rotation-induced zoom-out behavior, and verification criteria.
* **`{insufficient}`**: Any state where behavioral, visual, or geometric requirements are ambiguous, incomplete, or contradictory.

---

## 3. Inputs & Trigger Conditions

1. **Mobile D-Pad Button Activation (`Up`, `Down`, `Left`, `Right`)**:
   * A tap or click on any of the four physical D-Pad directional inputs while viewing the application on a mobile viewport (e.g., mobile portrait `390×844` or coarse-pointer/narrow mobile viewport).
2. **Console Rotation Drag Gesture**:
   * A touch-and-drag or pointer-and-drag gesture exceeding the drag threshold that rotates the 3D Game Boy console on its horizontal or vertical axis (initiated on the visible 3D Game Boy shell/bezel or via a rotation drag gesture).
3. **In-Screen Touch & Tap Interactions While Zoomed**:
   * Tapping or interacting with gameplay elements inside the zoomed Game Boy screen (e.g., bar hotspots, carousels, seated patrons, dialogue boxes, drink build cards, and drink handoff dragging).
4. **Viewport Resize or Orientation Change**:
   * Resizing the browser viewport or transitioning between mobile and desktop viewport dimensions.

---

## 4. Desired `{functionality}` & Behavioral Requirements

### 4.1 Mobile Camera Zoom Into the Game Boy Screen on D-Pad Click
* **Triggering Screen Zoom via D-Pad**:
  - On a mobile viewport, clicking or tapping any of the four D-Pad directional buttons (`Up`, `Down`, `Left`, `Right`) simultaneously performs the standard in-game D-Pad navigation action (such as cycling seated patrons, navigating menu items, or scrolling carousels) **and** activates the **Screen-Zoomed Camera State**.
  - If the 3D Game Boy console is slightly tilted when the D-Pad button is clicked, activating the Screen-Zoomed Camera State also centers the console's orientation to its front-facing neutral orientation `(0, 0, 0)` so the zoomed screen faces the player squarely.
  - Pressing a D-Pad button when the camera is already in the Screen-Zoomed Camera State maintains the zoomed-in framing while continuing to execute the D-Pad directional action.
* **Screen-Filling Framing Inside the 3D Game Boy Shell**:
  - In the Screen-Zoomed Camera State on mobile, the 3D camera moves closer to the Game Boy console and centers vertically and horizontally on the 3D Game Boy screen aperture rather than the full console body.
  - The zoomed camera distance is framed such that the 3D Game Boy screen fills the mobile viewport width (with the surrounding 3D Game Boy shell/bezel still rendered around the screen in 3D space, confirming the game is still rendered on the 3D Game Boy shell rather than detaching into a standalone 2D page).
  - The transition from normal full-console framing to screen-zoomed framing is smooth and continuous rather than an abrupt instantaneous jump.
* **Desktop Viewport Unchanged**:
  - On desktop viewports, clicking D-Pad buttons performs the normal D-Pad navigation without zooming the camera away from the full-console framing.

---

### 4.2 1:1 Playfield & Control Registration During and After Zoom
* **Continuous 1:1 Screen Projection**:
  - At every frame of the zoom-in animation, while resting in the Screen-Zoomed Camera State, and during the zoom-out animation, the interactive game screen overlay remains strictly aligned 1:1 with the 3D Game Boy's screen surface.
  - All in-screen visual layers—the bar background, interactive station hotspots, bottle/glass/garnish carousels, seated patrons, orange patron focus outlines, receipt papers, dialogue boxes, and active drink vessels—scale proportionally with the enlarged 3D screen aperture so they fill the zoomed Game Boy screen cleanly without clipping or misalignment.
* **Preserved In-Screen Interactivity**:
  - While zoomed into the Game Boy screen on mobile, all inside-screen touch/click interactions (tapping patrons, opening station carousels, pouring ingredients, conversing with patrons, and dragging completed drinks to patrons) remain 100% responsive and accurately mapped to their visual positions.

---

### 4.3 Automatic Zoom-Out to Normal Framing on Console Rotation
* **Rotation Gesture Exits Screen Zoom**:
  - When the camera is in the Screen-Zoomed Camera State on mobile and the user initiates a drag gesture to rotate the 3D Game Boy console (dragging across the visible 3D Game Boy shell/bezel around the screen, or dragging to spin the console on its axis), the camera immediately exits the Screen-Zoomed Camera State.
  - As the console rotates in response to the user's drag gesture, the 3D camera smoothly zooms back out to the normal full-console framing (where both the Game Boy screen and the full physical control cluster—`D-Pad`, `A`, `B`, `START`, `SELECT`—fit inside the mobile viewport).
* **Re-Entry via Subsequent D-Pad Click**:
  - Once zoomed back out (and returned to a front-facing view, either by dragging back toward the front or shaking the device to reset rotation to `(0, 0, 0)`), clicking any D-Pad button again re-activates the Screen-Zoomed Camera State.

---

## 5. Invariants, Constraints & Edge Cases

* **`INV-MOBILE-DPAD-ZOOM-01` (D-Pad Click Activates Mobile Screen Zoom)**:
  - On mobile viewports, clicking any D-Pad button (`Up`, `Down`, `Left`, `Right`) transitions the 3D camera from full-console framing into screen-zoomed framing centered on the 3D Game Boy screen, expanding the projected screen width/height to fill the mobile viewport width while remaining rendered on the 3D Game Boy shell.
* **`INV-ZOOM-REGISTRATION-01` (1:1 Screen & Hit-Target Registration Across Zoom States)**:
  - The live game screen and physical button hit regions remain 1:1 registered with their corresponding 3D meshes before, during, and after any camera zoom transition.
* **`INV-ROTATE-UNZOOM-01` (Console Rotation Restores Normal Camera Zoom)**:
  - Initiating a 3D console rotation drag while in the Screen-Zoomed Camera State immediately cancels the zoomed state and smoothly returns the camera to the normal full-console framing while rotating the 3D console.
* **`INV-DESKTOP-STABILITY-01` (Desktop Framing Preserved)**:
  - Desktop viewports retain the full-console framing when D-Pad buttons are clicked.
* **`INV-FAILFAST-01` (Zero Silent Fallbacks or Runtime Errors)**:
  - All camera zoom transitions, 3D projections, D-Pad interactions, and rotation gestures execute with zero console errors or unhandled runtime exceptions.

---

## 6. Acceptance Criteria & Verification (`{correct required outputs}`)

| ID | Criterion | Expected Measurable Outcome (`{correct required outputs}`) |
| :--- | :--- | :--- |
| **`AC-01`** | **D-Pad Click Zooms Camera to Fill Mobile Viewport With Game Boy Screen** | On a mobile viewport (`390×844`), clicking any D-Pad button (`Up`, `Down`, `Left`, `Right`) executes the D-Pad action and smoothly zooms the 3D camera into the 3D Game Boy screen so the projected Game Boy screen fills the mobile viewport width (`>= 90%` of viewport width) while still rendered inside the 3D Game Boy shell. |
| **`AC-02`** | **1:1 Screen Registration & In-Game Interactivity While Zoomed** | While zoomed in on mobile, the interactive game screen remains 1:1 aligned with the 3D Game Boy screen surface, and in-screen elements (patrons, hotspots, dialogue, carousels) remain fully interactive. |
| **`AC-03`** | **Console Rotation Automatically Zooms Camera Back to Normal** | While zoomed in on mobile, dragging to rotate the 3D Game Boy console on its axis smoothly zooms the camera back out to the normal full-console framing (restoring the baseline screen dimensions and full visibility of the lower physical button cluster) while rotating the console. |
| **`AC-04`** | **Re-Zoom After Reset & Zero `{errors}`** | After rotating and re-centering the console, clicking a D-Pad button on mobile zooms the camera back into the Game Boy screen again, with zero console errors or uncaught page exceptions across the entire flow. |

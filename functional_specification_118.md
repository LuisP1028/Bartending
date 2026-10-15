# Functional Specification 118: Mobile Chat Input Auto-Zoom Prevention, Invisible Mobile Start/Select Hitboxes, A/B Button Role Swap & D-Pad Patron Cycling with Thin Orange Silhouette Outlines

## 1. Overview & Objective

The objective of this specification is to define the exact desired `{functionality}`, user interaction flows, visual states, spatial and viewport constraints, edge cases, inputs, outputs, and acceptance criteria for four console and bar-stage refinements on the **Nintendo Game Boy** bartending interface:

1. **Disable Mobile Auto-Zoom on Chatbox Text Input**: Preventing mobile browsers from automatically zooming in or shifting the viewport when the player taps or focuses the conversation text input box (`"SAY SOMETHING..."`) on a mobile device.
2. **Eliminate Pill-Shaped Hitboxes on Mobile Start / Options Buttons**: Removing the visible pill-shaped hitboxes, borders, shadows, backgrounds, and duplicate text labels that appear over the `START` and `SELECT` (Options) buttons on mobile viewports so those touch targets remain completely invisible over the 3D console body.
3. **Swap the `A` and `B` Buttons**: Reversing the functional roles of the `A` and `B` buttons across the entire experience so that **`A` acts as Interact / Confirm / Select** and **`B` acts as Back / Cancel / Dismiss**.
4. **D-Pad Patron Cycling & Thin Orange Patron Outline**:
   * Enabling the `D-Pad` to scroll/cycle through seated patrons at the bar, supporting the full console interaction loop: **Cycle through patrons (`D-Pad`) → Press `A` → Open patron receipt/conversation box → Press `B` → Return to hovering over that patron**.
   * Rendering a **thin orange silhouette outline** around each seated patron whenever that patron is hovered by pointer, focused via the `D-Pad`, or clicked/inspected.

This document specifies only the desired `{functionality}`, observable behaviors, visual states, constraints, edge cases, inputs, outputs, and verification criteria. It contains zero implementation instructions, code sketches, component names, or architectural prescriptions.

**DO NOT CODE YET.** No coding, scaffolding, or implementation planning may proceed until the operator confirms that this specification constitutes a shared understanding of the desired `{functionality}` and authorizes the next stage.

---

## 2. Glossary & Evaluation Taxonomy Alignment

All assessments and verification gates in this specification strictly adopt the authoritative definitions established in `LANGUAGE.md`:

* **`{errors}`**: Explicit failure states surfaced during execution or rendering, including browser console errors, unhandled runtime exceptions, network request failures (HTTP 4xx/5xx), broken image/SVG/3D assets, or fatal process exits.
* **`{correctness}`**: Exact behavioral, visual, and spatial fidelity across all four requirements—verifying zero mobile viewport auto-zoom on text input focus, 100% transparent `START`/`SELECT` touch hitboxes on mobile, consistent `A` (Interact) and `B` (Back) button behavior across all console screens, deterministic `D-Pad` patron cycling with focus restoration on `B`, and a crisp thin orange silhouette outline on hovered, `D-Pad`-focused, or clicked patrons even when no explicit `{errors}` are thrown.
* **`{functionality}`**: The end-to-end operational state in which mobile chat entry preserves 1:1 viewport framing, mobile `START`/`SELECT` controls show no pill-shaped overlay artifacts, `A` and `B` operate as Confirm and Back respectively, and players can cycle seated patrons with the `D-Pad`, open their receipt/conversation box with `A`, and return to hovering the patron with `B` while a thin orange outline highlights the active patron.
* **`{correct required outputs}`**: Objectively measurable visual, geometric, and behavioral states verified directly in the live browser runtime across desktop and mobile viewports via Playwright inspection and screenshots.
* **`{sufficient}`**: The documentation state where zero ambiguity remains regarding desired outcomes, interaction state transitions, visual appearance, and verification criteria.
* **`{insufficient}`**: Any state where behavioral, visual, or geometric requirements are ambiguous, incomplete, or contradictory.

---

## 3. Input Specifications & Triggers

1. **Mobile Chat Input Focus Event**:
   * Touch tap or focus on the freeform player text input box (`"SAY SOMETHING..."`) inside the full-screen patron conversation box (as well as any text input field inside the console screen) on mobile viewports (e.g., `390×844` portrait touch devices).
2. **Mobile Viewport Rendering of Console Controls**:
   * Rendering and touch interaction with the `START` and `SELECT` (Options) button regions on mobile portrait viewports (`max-width: 600px`, touch input).
3. **Physical / Virtual Console Button Inputs (`D-Pad`, `A`, `B`, `START`, `SELECT`)**:
   * Pointer clicks, touch taps, or 3D console button presses on the Game Boy's `D-Pad` (`Up`, `Down`, `Left`, `Right`), `A` button, `B` button, `START` button, and `SELECT` button across the boot intro, main menu, and active bar play phases.
4. **Seated Bar Patrons & Pointer/D-Pad Interaction**:
   * Characters currently seated at any of the four bar stools (from leftmost stool 1 to rightmost stool 4), interacted with via mouse hover, touch/click, or `D-Pad` cycling plus `A`/`B` button presses.

---

## 4. Desired `{functionality}` & Behavioral Requirements

### 4.1 Disable Mobile Auto-Zoom When Clicking the Chatbox Input Text Box

* **Zero Viewport Zoom on Focus**:
  - On mobile browsers (including iOS Safari and mobile Chromium), tapping or focusing the chatbox text input field (`"SAY SOMETHING..."`) must never trigger automatic browser viewport zoom-in.
  - Both the viewport scaling rules and the effective text input sizing must satisfy mobile browser non-zoom thresholds so the page scale remains locked at `1.0` (`100%`) before, during, and after focusing the input box.
* **Preserved Layout & Visual Proportions**:
  - While preventing mobile auto-zoom, the visible text inside the chatbox input row and the surrounding full-screen Retro RPG chatbox must remain cleanly proportioned and contained within the Game Boy screen without horizontal overflow, clipped buttons, or displaced borders.

---

### 4.2 Remove Pill-Shaped Hitboxes on Mobile Start / Options (`SELECT`) Buttons

* **100% Transparent Hit Targets Across All Viewports**:
  - On mobile portrait and touch viewports, the interactive hitboxes registered over the 3D Game Boy's `START` and `SELECT` (Options) buttons must render with **zero visible background fill, zero border, zero outer ring or shadow, zero pill-shaped outline, and zero overlaid `"START"` / `"SELECT"` text labels**.
* **Visual Purity of the 3D Console Body**:
  - The player must see only the 3D Game Boy console's native textured `START` and `SELECT` buttons in idle, hover, focus, and active/pressed states.
  - Tapping the `START` or `SELECT` button region on mobile must continue to animate the 3D button depression and execute the button's console action immediately without displaying or flashing a grey or white pill-shaped shape on top of the 3D console body.

---

### 4.3 Swap the `A` and `B` Buttons Across All Console Phases

* **Global Role Assignment**:
  - **`A` Button (right circular button on the Game Boy face)** = **Interact / Confirm / Select (Primary Action)**.
  - **`B` Button (left circular button on the Game Boy face)** = **Back / Cancel / Dismiss (Secondary Action)**.
  - Accessible labels and tooltips on the `A` and `B` controls must match these swapped assignments (`A` = Interact / Select; `B` = Back / Close).

* **Phase-by-Phase Behavior Under the Swapped Mapping**:
  1. **Boot Intro Phase**:
     - Pressing **`A`** triggers the primary intro tap/advance interaction.
     - Pressing **`B`** skips/finishes the intro immediately and transitions to the main menu.
  2. **Main Menu & Join-the-Bar Flows (Comm-Link & Camera)**:
     - Pressing **`A`** activates/confirms the currently focused menu option, form control, or camera action.
     - Pressing **`B`** navigates back or cancels out of the active sub-screen (`Camera` → `Main Menu`, `Comm-Link` → `Main Menu`, `Mode Selection` → `Main Menu`).
  3. **Active Bar Play Phase**:
     - **Pressing `A` (Interact / Confirm / Select)**:
       * If a bar station item carousel is open: activates/applies the currently focused item (pours ingredient, selects glass, applies hardware/ice, or adds garnish/rim).
       * If a patron's inspection view (order receipt / conversation carousel or full-screen chatbox) is open: interacts with the inspection view (switches from the `ORDER` receipt slide to the `CHAT` conversation slide, expands from the `CHAT` slide into the full-screen chatbox, or immediately completes an active typewriter speech animation).
       * If a bottom-docked patron greeting/dialogue box is open: fast-forwards the typewriter animation or advances/completes the dialogue.
       * If a seated patron at the bar is currently focused/hovered via the `D-Pad`: selects that patron, isolates them on the bar stage, binds their order ticket to the bar mat, and opens their patron receipt / conversation inspection box.
       * If a bar station hotspot is currently focused via the `D-Pad`: opens that station's localized item carousel.
     - **Pressing `B` (Back / Cancel / Dismiss)**:
       * If the mat drink build/trash pop-up is open: closes the pop-up without trashing the drink.
       * If a patron's inspection view (order receipt slide, conversation box slide, or full-screen chatbox) is open: closes the patron inspection view, restores all other seated patrons to the bar stage, and **returns focus to hovering over that same patron** (with their thin orange outline visible).
       * If a bar station item carousel is open: closes the carousel and keeps `D-Pad` focus on that station hotspot.
       * If a bottom-docked patron dialogue box is open: dismisses the dialogue box.
       * If no overlay is open and a patron or hotspot is focused: clears or steps back without error.

---

### 4.4 D-Pad Patron Scrolling & Thin Orange Patron Silhouette Outline

* **End-to-End D-Pad Patron Navigation Loop**:
  - During active bar play when no station carousel, mat drink pop-up, or patron inspection overlay is open, the `D-Pad` allows the player to scroll through seated patrons at the bar as well as bar station hotspots:
    1. **Cycle Through Seated Patrons (`D-Pad`)**:
       - Only patrons currently seated at the bar with an active order are eligible for `D-Pad` patron focus; walking or departing patrons are never focused.
       - Seated patrons are ordered spatially from left to right across the bar counter (from leftmost stool 1 to rightmost stool 4, restricted to currently occupied seats).
       - Using the `D-Pad` (`Left` / `Right` / `Up` / `Down`) allows the player to move focus onto seated patrons and cycle sequentially across all seated patrons at the bar:
         * When focus is on a seated patron, pressing **`D-Pad Right`** advances focus to the next seated patron to the right (or transitions deterministically if at the rightmost seated patron), and pressing **`D-Pad Left`** moves focus to the previous seated patron to the left.
         * Pressing **`D-Pad Down`** / **`D-Pad Up`** (or cycling past the ends of the hotspot/patron lists) smoothly transitions focus between the seated patrons and the bar station hotspots so every seated patron and every bar station is reachable via the `D-Pad`.
         * Whenever a seated patron is focused via the `D-Pad`, any previously focused bar station hotspot highlight is cleared so only one target (either the focused seated patron or the focused bar station hotspot) shows active focus at a time.
    2. **Open Patron Receipt / Conversation Box (`A` Button)**:
       - While hovering/focusing a seated patron via the `D-Pad`, pressing **`A`** opens that patron's inspection carousel (starting on their `ORDER` receipt slide with the `CHAT` conversation tab available) and isolates that patron at the bar.
    3. **Switch Receipt / Conversation Slides (`D-Pad` / `A` Button)**:
       - While the patron inspection carousel is open (in non-fullscreen mode), pressing **`D-Pad Left`** or **`D-Pad Right`** toggles between the patron's `ORDER` receipt slide and `CHAT` conversation box slide, and pressing **`A`** advances from `ORDER` to `CHAT` or opens the full-screen chatbox from `CHAT`.
    4. **Close Inspection & Return to Hovering Over Patron (`B` Button)**:
       - Pressing **`B`** while the patron's receipt/conversation box (or full-screen chatbox) is open closes the inspection overlay, restores all other seated patrons to the bar stage, and **keeps `D-Pad` focus on the patron that was just inspected**, immediately displaying their thin orange hover/focus outline so the player can either press `A` again or use the `D-Pad` to scroll to another patron.

* **Dynamic Seat Turnover Handling**:
  - If a seated patron who is currently focused via the `D-Pad` is served and departs the bar, focus on that vacated seat is automatically cleared or shifted to another remaining seated patron so an empty seat or walking character never retains focus.

* **Thin Orange Silhouette Outline on Hovered, D-Pad-Focused, or Clicked Patrons**:
  - Whenever a seated patron is:
    1. **Hovered by pointer** (mouse cursor over the seated patron),
    2. **Focused/hovered via `D-Pad` navigation**, or
    3. **Clicked / actively inspected** (while their order receipt / conversation box is open),
    that patron must display a **thin orange outline** around their character silhouette.
  - **Visual Specification of the Thin Orange Outline**:
    - **Color**: Vibrant, high-visibility orange (`#ff8c00` / `#ff9900` family), distinct from the background bar art.
    - **Thickness & Contour**: A crisp, thin (`~1px–2px`) contour outline that traces the opaque silhouette of the seated character artwork rather than rendering a rectangular box border around the transparent image frame.
    - **Clean Inactive State**: Seated patrons that are neither pointer-hovered, `D-Pad`-focused, nor actively inspected (as well as any walking or leaving patrons) must not display the orange outline.

---

## 5. Invariants, Constraints & Edge Cases

* **`INV-NO-MOBILE-ZOOM-01` (Zero Mobile Viewport Auto-Zoom on Text Input)**:
  - Focusing or typing into the chatbox text input or any console text input on a mobile viewport must not trigger browser auto-zoom; the viewport scale must remain `1.0` (`100%`) at all times.
* **`INV-START-SELECT-TRANSPARENT-01` (Zero Visible Pill Hitbox on Mobile Start/Select)**:
  - On both mobile portrait (`390×844`, touch input) and desktop (`1280×800`) viewports, the `START` and `SELECT` (Options) hit targets must be completely transparent with zero visible background fill, zero border, zero shadow ring, and zero overlaid text labels.
* **`INV-AB-SWAP-01` (`A` = Interact/Confirm, `B` = Back/Cancel)**:
  - Across boot intro, main menu, registration/camera sub-screens, and active bar play, pressing `A` always executes the primary Interact/Confirm/Select action and pressing `B` always executes the Back/Cancel/Dismiss action.
* **`INV-DPAD-PATRON-LOOP-01` (Deterministic D-Pad Patron Cycle → `A` Open → `B` Return to Patron Hover)**:
  - Cycling via the `D-Pad` onto a seated patron highlights that patron; pressing `A` opens their receipt/conversation inspection view; pressing `B` closes the inspection view, restores all seated patrons, and leaves that same seated patron focused/hovered with its thin orange outline active.
* **`INV-PATRON-ORANGE-OUTLINE-01` (Thin Orange Silhouette Outline on Hover, D-Pad Focus, and Click)**:
  - Every seated patron displays a thin orange silhouette outline (`~1px–2px` contour) when hovered by pointer, focused via `D-Pad`, or clicked/isolated, and removes the outline immediately when unfocused, unhovered, and uninspected.
* **`INV-FAILFAST-01` (Zero Silent Fallbacks)**:
  - Any attempt to inspect a seated patron lacking a bound order or receipt instance must fail fast with an explicit error rather than silently ignoring the interaction.

---

## 6. Acceptance Criteria & Verification (`{correct required outputs}`)

All acceptance criteria must be verified in the live browser runtime across desktop and mobile viewports:

| ID | Criterion | Expected Measurable Outcome (`{correct required outputs}`) |
| :--- | :--- | :--- |
| **`AC-01`** | **Mobile Chat Input Auto-Zoom Disabled** | On a mobile viewport (`390×844`), opening a patron's full-screen chatbox and focusing the `"SAY SOMETHING..."` text input results in zero viewport zoom (`scale === 1.0`), mobile auto-zoom thresholds are satisfied, and the input box remains cleanly contained inside the chatbox. |
| **`AC-02`** | **Mobile Start/Select Pill Hitboxes Removed** | On a mobile portrait viewport (`390×844` with touch/coarse pointer), the `START` and `SELECT` hit targets have transparent backgrounds, zero shadow/border rings, and zero overlaid text pseudo-elements, with screenshots confirming zero pill-shaped overlay over the 3D `START`/`SELECT` buttons. |
| **`AC-03`** | **`A` and `B` Buttons Swapped Globally** | Pressing `A` confirms/interacts in the main menu, opens focused station carousels, activates focused carousel items, opens a focused patron's receipt/conversation box, and advances carousel/chat slides; pressing `B` navigates back in menu/registration flows and closes open carousels, drink build pop-ups, and patron inspection views. |
| **`AC-04`** | **D-Pad Patron Cycling → `A` Open → `B` Return to Hover** | In active bar play, pressing the `D-Pad` cycles focus through seated patrons in left-to-right order; pressing `A` on a focused patron opens their receipt/conversation box and isolates that patron; pressing `B` closes the inspection box, restores all other seated patrons, and preserves hover/focus on that patron so subsequent `D-Pad Left`/`Right` steps immediately move to the adjacent seated patron. |
| **`AC-05`** | **Thin Orange Silhouette Outline on Patrons** | Seated patrons render a thin orange silhouette outline when pointer-hovered, `D-Pad`-focused, or clicked/inspected, and do not render the orange outline when inactive, verified via live visual and style inspection. |
| **`AC-06`** | **Zero `{errors}`** | Live verification across desktop (`1280×800`) and mobile (`390×844`) viewports completes with zero console errors, zero uncaught page exceptions, and zero failed network requests. |

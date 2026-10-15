# Functional Specification 114: Game Boy Screen Component Sizing, Transient Receipt Printer Lifecycle, Patron-Bound Ticket Inspection & Carousel Item Name Popup

## 1. Overview & Objective

The objective of this specification is to define the exact desired `{functionality}`, visual sizing constraints, interaction flows, inputs, outputs, edge cases, fail-fast invariants, and verification criteria for four diegetic UI improvements when running inside the **Nintendo Game Boy** console screen:

1. **Bottom-Docked Character Dialogue Boxes**: Resizing and anchoring character dialogue boxes so they render strictly along the bottom strip of the Game Boy screen rather than consuming the entire screen, verified via Playwright.
2. **Transient Receipt Printer & Patron-Click Ticket Inspection**: Replacing the permanently visible receipt printer and floating ticket clutter with a transient **fade-in → print → fade-out** printer mechanism, marking every receipt with the ordering patron's identity, and displaying a patron's full opened receipt inside the designated screen-size-agnostic bounding area (per `/Users/diesel/Desktop/receipt_render_box.png`) without the printer and while temporarily blocking out other bar patrons when that patron is clicked.
3. **Jigger Control (`"jiggertext"`) Sizing & Glyph Integrity**: Sizing the bottom-right jigger pour-volume control and its typography so that `"JIGGER"` and the `"0.50 oz"` readout render with 100% glyph integrity and zero clipping across all screen sizes.
4. **Carousel Bottle Sizing & Dialogue-Themed Item Name Popup**: Properly sizing bottle silhouettes inside category carousels and displaying a compact, retro RPG dialogue-themed popup showing the focused item's name as the user scrolls through the carousel.

This document specifies only the desired behavior, observable outcomes, spatial bounds, constraints, edge cases, and acceptance criteria. It contains zero implementation guidance, code sketches, component breakdowns, or architectural prescriptions.

**DO NOT CODE YET.** No coding, scaffolding, or implementation planning may proceed until the operator confirms this specification and authorizes the next stage.

---

## 2. Glossary & Evaluation Taxonomy Alignment

All assessments in this specification strictly adopt the authoritative definitions established in `LANGUAGE.md`:

* **`{errors}`**: Explicit failure states surfaced during execution or rendering, including browser console errors, unhandled JavaScript exceptions, network request failures (404/500/CORS), CSS syntax errors, non-zero exit codes, or fatal runtime crashes.
* **`{correctness}`**: Precise local execution and visual/behavioral integrity of each component—verifying complete and unclipped text rendering, proper element containment within the Game Boy screen, accurate event binding, valid screen-size-agnostic scaling, and mathematically sound box-model boundaries even when no explicit `{errors}` are thrown.
* **`{functionality}`**: The global objective of presenting legible, properly proportioned diegetic bartending controls, patron dialogues, transient ticket printing, patron-bound order inspection, and bottle selection within the Nintendo Game Boy screen across all display formats.
* **`{correct required outputs}`**: Objectively measurable visual and behavioral states after rendering or interaction, verified directly in the browser runtime via Playwright.
* **`{sufficient}`**: The documentation state where zero ambiguity remains and implementation can proceed without guessing or hallucinating context.
* **`{insufficient}`**: Any documentation state where critical context is missing, vague, or contradictory.

---

## 3. Input Specifications & Reference Artifacts

1. **Reference Layout Image (`/Users/diesel/Desktop/receipt_render_box.png`)**:
   * Depicts the live bartending stage inside the Nintendo Game Boy screen housing (`DOT MATRIX WITH STEREO SOUND`).
   * Highlights three current visual defects and the target receipt inspection region:
     - **Red Outline Target Box**: A hand-drawn red rectangular region situated immediately to the right of the left-seated patron, spanning horizontally across the center-right bar area (`~35%` to `~70%` of the screen width) and vertically from the upper pendant-light level (`~14%` from the top of the screen) down to the top edge of the lower bottle rail (`~72%` from the top of the screen, above the bottom shelf of bottles and clear of the bottom-right jigger control).
     - **Oversized Printer & Clipped Tickets**: Shows the black printer housing and stacked tickets occupying the upper-right quadrant and clipping mid-text (`MARGARITA / ROCKS GLASS / COLLINS GLASS`).
     - **Clipped Jigger Control (`"jiggertext"`)**: Shows the bottom-right jigger box clipping `"JIGGER"` into `"IGGER"` and cutting off `"oz"` vertically below `"0.50"`.
2. **Active Game Boy Screen Viewport**:
   * The inner playable screen area of the Nintendo Game Boy housing, across arbitrary desktop and mobile browser viewport sizes.
3. **Seated Bar Patrons & Order Tickets**:
   * Each seated patron has a canonical identity (character ID, display name, seated sprite, and portrait sprite) and an assigned cocktail order recipe upon taking a seat at the bar.
4. **Bar Category Inventories (Bottles & Bar Assets)**:
   * Scrollable inventories of liquors, syrups, juices, speedrail bottles, glassware, garnishes, rims, and hardware tools presented in localized stage carousels.

---

## 4. Desired `{functionality}` & Behavioral Requirements

### 4.1 Bottom-Docked Character Dialogue Box in the Game Boy Shell

* **Strict Bottom-Strip Placement**:
  - When a character dialogue box is open inside the Nintendo Game Boy screen, it must render **exclusively at the bottom of the screen** as a compact horizontal strip.
  - The dialogue box must occupy no more than the lower portion of the screen (approximately `22%–28%` of the Game Boy screen height, anchored near the bottom edge with a small margin), leaving the upper `70%+` of the bar stage and the seated patrons clearly visible above it.
* **Screen-Size-Agnostic Proportional Scaling**:
  - Every visual element of the dialogue box—including the outer dual-white-and-black border, deep navy interior (`#09133b`), four pixelated corner scrollwork loops, silver beveled portrait frame, character portrait image, gold speaker name header (`#f7ca18`), uppercase typewriter body text, and bouncing advancement arrow—must scale proportionally to the Game Boy screen container dimensions rather than using large fixed desktop pixel sizes.
  - All dialogue text and the speaker's name must remain 100% legible and unclipped inside the bottom-docked window.
* **Interaction Parity**:
  - Clicking/tapping the dialogue box or pressing the Game Boy `B` (Interact) button while text is typing immediately completes the typewriter line; clicking/pressing `B` again (or pressing `A` to dismiss) advances or closes the dialogue box.

---

### 4.2 Transient Receipt Printer Lifecycle (Fade In → Print → Disappear)

* **Hidden When Idle**:
  - The receipt printer hardware bezel and paper slot must **not** remain permanently visible on the screen when no ticket is actively printing.
* **Automated Print Sequence**:
  - Whenever a new order ticket is triggered (e.g., when a patron finishes walking in and sits at a bar stool, or when a ticket is generated):
    1. **Fade In**: The receipt printer hardware fades smoothly into the top-right area of the screen.
    2. **Print Ticket**: The receipt paper unrolls/prints downward from the printer slot, displaying the summary ticket marked with the ordering patron's name.
    3. **Pause & Fade Out**: After the ticket finishes unrolling and remains briefly readable, **both the printed ticket and the receipt printer fade out and disappear completely** from the screen, returning the upper-right bar scene to an unobstructed state.
* **Sequential Queue Integrity**:
  - If multiple patrons sit down in close succession, their print jobs queue cleanly so each ticket prints visibly and then disappears without leaving orphan paper slips or stuck printer hardware on screen.

---

### 4.3 Patron-Marked Receipts & Patron-Click Ticket Inspection

* **Explicit Patron Attribution on Every Receipt**:
  - Every receipt generated for a patron must store and visibly display the **patron's display name** (e.g., `PATRON: <DISPLAY NAME>`) on both the summary face (during the transient print animation) and the full expanded receipt face.
* **Clicking a Seated Patron to Inspect Their Ticket**:
  - When the player clicks or taps a seated patron `x` (without dragging a drink vessel):
    1. **No Printer Hardware**: Patron `x`'s receipt appears directly on screen **without** the receipt printer hardware bezel.
    2. **Temporary Isolation of Clicked Patron**: All **other** patrons at the bar (seated or walking in other seats) are temporarily blocked out / hidden from view while patron `x`'s receipt is open, isolating visual focus on patron `x` and their order. Patron `x` remains visible in their seat.
    3. **Full Opened Ticket in the Red Reference Box**:
       - Patron `x`'s receipt renders in its **opened, full recipe state** (displaying mode branding, order ID, patron name, cocktail title, required vessel, preparation method, exact ingredient ounce proportions, required garnishes/rims, itemized pricing, total, and barcode).
       - The opened receipt is positioned and sized strictly within the **red outline bounding box** shown in `/Users/diesel/Desktop/receipt_render_box.png`:
         * **Horizontal Bounds**: Positioned immediately to the right of the left-seated patron zone, spanning from approximately `35%` to `70%` of the Game Boy screen width (width `~35%` of the screen), never overlapping the left-seated patron's face/body or the right-edge jigger control.
         * **Vertical Bounds**: Spanning from approximately `14%` from the top of the Game Boy screen down to `72%` from the top of the screen (height `~58%` of the screen), staying cleanly above the lower bottle shelf rail.
       - **Screen-Size Agnostic & Unclipped**: The ticket's outer bounds, internal padding, typography, dividers, and recipe lines scale proportionally to the Game Boy screen so the full ticket renders cleanly inside the red target box across all viewport sizes (with smooth internal vertical scrolling if a recipe has an unusually long line list, while keeping 100% of horizontal text unclipped).
    4. **Active Order Binding**:
       - Opening patron `x`'s receipt selects and binds that receipt as the active order on the bar mat (parking any previous build and loading patron `x`'s in-progress drink build if one exists).
* **Dismissing the Patron's Ticket**:
  - Clicking/tapping the open receipt to collapse/close it, clicking outside the receipt on the bar background, or pressing the Game Boy `A` (Back) button closes the opened receipt and immediately **restores the visibility of all other patrons** at the bar.
* **Coexistence with Drink Delivery**:
  - Dragging a prepared cocktail vessel from the bar mat and dropping it onto seated patron `x` continues to execute recipe validation and drink service (handoff or rejection dialogue) rather than merely toggling the receipt view.

---

### 4.4 Jigger Control (`"jiggertext"`) Sizing & Unclipped Typography

* **Complete Glyph Visibility**:
  - The bottom-right jigger pour-volume trigger button must be sized and styled proportionally to the Game Boy screen so that:
    - The jigger SVG icon renders cleanly at the top of the button.
    - The word **`JIGGER`** renders on a single horizontal line with 100% of its letters (`J-I-G-G-E-R`) fully visible and centered, never clipped to `"IGGER"`.
    - The volume readout (e.g., **`0.50 oz`**, **`0.75 oz`**, **`1.00 oz`**, etc.) renders with 100% of its digits and the `"oz"` unit intact and unclipped inside the button's bottom border.
* **Proportional Popup Panel**:
  - When clicked/activated, the stepped pour-volume selection panel opens above the jigger trigger, scaled proportionally to the Game Boy screen so all volume options are legible, clickable, and fully contained within the screen bounds.

---

### 4.5 Bottle Sizing in Carousels & Dialogue-Themed Item Name Popup

* **Proper Bottle Proportions in Category Carousels**:
  - When a bar category hotspot (`liquors`, `syrups`, `juices`, `speedrail`, etc.) is opened on the Game Boy screen, the bottles inside the carousel must render at a clean, well-proportioned scale that fills the carousel height comfortably without being squashed by inline multi-line text labels or clipped at the top/bottom edges.
  - Inline cramped text labels underneath individual carousel items inside the local stage carousel are replaced by the dedicated dialogue-themed popup described below.
* **Dialogue-Themed Item Name Popup on Carousel Scroll**:
  - Whenever a local category carousel is open on the stage, a compact **item name popup** is displayed for the currently centered/focused item in the carousel.
  - **Visual Theme Parity**: The popup must be styled to match the **Retro RPG Dialogue Box** aesthetic:
    - Deep navy background (`#09133b`).
    - Crisp white inner border with black outer outline and pixel corner styling.
    - High-contrast pixel typography (`Press Start 2P` / retro monospace) in gold (`#f7ca18`) or crisp white (`#ffffff`) with pixel drop-shadow.
  - **Dynamic Scroll Synchronization**:
    - As the user scrolls the carousel via pointer/touch or steps through items using the Game Boy `D-Pad` (`Left` / `Right` / `Up` / `Down`), the popup updates immediately in real time to show the exact name (`label`) of the currently centered/focused bottle or bar item.
  - **Unobstructed Placement**:
    - The popup is anchored cleanly near the active carousel (or at a consistent non-overlapping HUD position on the stage) so that it never obscures the focused bottle silhouette and never overflows the Game Boy screen bezel.

---

## 5. Edge Cases, Constraints & Fail-Fast Invariants

1. **INV-DIALOGUE-BOTTOM-01 (No Full-Screen Dialogue Takeover)**:
   * Under no viewport aspect ratio or window size may the character dialogue box expand to cover more than the bottom strip (`≤ 30%` height) of the Game Boy screen.
2. **INV-PRINTER-TRANSIENT-01 (Zero Permanent Printer/Ticket Clutter)**:
   * Outside of an active print animation, the receipt printer hardware and uninspected free tickets must remain completely hidden (`0` screen footprint).
3. **INV-PATRON-ISOLATION-01 (Deterministic Patron Masking & Restoration)**:
   * While patron `x`'s receipt is open via patron click, other patrons at the bar are hidden; the instant patron `x`'s receipt is closed, served, or dismissed (including via mode switch or `A` button), all other living patrons at the bar must immediately become visible again without losing their walk/sit state or seat assignments.
4. **INV-RECEIPT-BOX-01 (Screen-Size-Agnostic Red-Box Containment)**:
   * When inspecting a patron's receipt, the ticket must always render inside the proportional stage region defined by `/Users/diesel/Desktop/receipt_render_box.png` (`left: ~35%`, `top: ~14%`, `width: ~35%`, `height: ~58%`) regardless of whether the browser window is desktop landscape, tablet, or mobile portrait.
5. **INV-JIGGER-TEXT-01 (Zero Text Clipping on Jigger Control)**:
   * Neither `"JIGGER"` nor the `"<X.XX> oz"` volume label may overflow, wrap mid-word, or clip against the jigger button borders at any viewport resolution.
6. **INV-FAILFAST-01 (Zero Silent Fallbacks)**:
   * Missing patron metadata on a patron-ordered ticket, missing recipe definitions, or failed asset loads must surface explicit `{errors}` immediately without silent fallbacks.

---

## 6. Acceptance Criteria & Verification (`{correct required outputs}`)

All acceptance criteria must be verified in the live browser runtime inside the Nintendo Game Boy shell using **Playwright MCP**:

| ID | Parameter | Verification Requirement |
| :--- | :--- | :--- |
| **AC-01** | `{correctness}` | **Dialogue Box Bottom-Docking**: When a patron speaks in the Game Boy shell, the `RetroRpgDialogueBox` renders strictly at the bottom of the Game Boy screen (`≤ 30%` of screen height), with portrait, speaker name, and text scaled proportionally and the upper bar scene clearly visible. |
| **AC-02** | `{functionality}` | **Transient Printer Fade-In / Print / Disappear**: When a patron sits and orders (or a ticket is generated), the receipt printer fades in, unrolls the patron-marked ticket, and both the ticket and printer fade out and disappear once printing finishes. |
| **AC-03** | `{correctness}` | **Patron Attribution on Receipts**: Every patron-ordered receipt visibly displays the ordering patron's name. |
| **AC-04** | `{functionality}` | **Patron-Click Ticket Inspection & Isolation**: Clicking a seated patron `x` temporarily hides all other patrons at the bar and displays patron `x`'s opened full receipt next to them **without** the receipt printer. |
| **AC-05** | `{correctness}` | **Red-Box Screen-Size-Agnostic Placement**: The opened patron receipt renders inside the exact proportional stage region indicated by the red outline in `/Users/diesel/Desktop/receipt_render_box.png` (`~35%–70%` X, `~14%–72%` Y) across both desktop and mobile viewports, with all text legible and unclipped. |
| **AC-06** | `{correctness}` | **Jigger Text Integrity (`"jiggertext"`)**: The bottom-right jigger button renders the icon, the full word `"JIGGER"`, and the full volume `"0.50 oz"` completely inside its box with zero horizontal or vertical clipping. |
| **AC-07** | `{functionality}` | **Bottle Sizing & Dialogue-Themed Scroll Popup**: Opening a bottle/category carousel renders properly sized, unclipped bottles and displays a compact retro dialogue-themed popup (`#09133b` navy, white/black pixel border, pixel font) that updates live with the focused item's name as the user scrolls or uses the D-Pad. |
| **AC-08** | `{errors}` | **Playwright Verification & Zero Errors**: Live verification via Playwright MCP confirms all visual bounds and interactions with zero console errors, zero uncaught page errors, and zero network failures. |

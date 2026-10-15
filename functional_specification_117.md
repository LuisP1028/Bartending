# Functional Specification 117: Receipt Metadata Removal, Dialogue-Themed Screen-Contained Mat Drink Pop-Up, On-Screen Asset Descriptive Boxes & Background Ice Outline Alignment

## 1. Overview & Objective

The objective of this specification is to define the exact desired `{functionality}`, visual and spatial geometry, thematic requirements, behavioral constraints, edge cases, inputs, outputs, and acceptance criteria for four refinements inside the **Nintendo Game Boy** screen:

1. **Removal of `"CHK: ORD-..."`, `"DATE/TIME"`, and `"SRV"` from Receipts**: Eliminating the check number (`CHK: ORD-...`), date (`MM/DD/YYYY`), time (`HH:MM AM/PM`), and server (`SRV: ...`) metadata lines from all order receipts (both the transient printed summary receipt and the full patron-inspected receipt).
2. **Dialogue-Box-Themed, Screen-Size-Agnostic Mat Drink Pop-Up**: Refining the pop-up that appears when an active drink on the bar mat is clicked—replacing the translucent glass card with the **Retro RPG Dialogue Box** visual theme and ensuring the pop-up scales proportionally and stays 100% contained within the visible Game Boy screen across all viewport sizes.
3. **Strict On-Screen Containment for Asset Descriptive Boxes**: Refining the descriptive item-name boxes displayed for each bar asset across all interactive stations (such as `garnishes`, `juices`, `rims`, `glassware`, `syrups`, `liquors`, `hardware`, and `ice`) so that every descriptive box remains 100% inside the visible Game Boy screen without spilling over the left, right, top, or bottom screen edges, verified via Playwright.
4. **Alignment of the Standard Ice / Large Ice Block Outline with Background Artwork**: Realigning the interactive outline for the standard ice / large ice block station so that its silhouette registers directly over the ice well depicted in the background bar artwork rather than floating above it on the metal backsplash, verified via Playwright.

This document specifies only the desired `{functionality}`, observable outcomes, visual and geometric bounds, constraints, inputs, outputs, and verification criteria. It contains zero implementation guidance, code sketches, component names, or architectural prescriptions.

**DO NOT CODE YET.** No coding, scaffolding, or implementation planning may proceed until the operator confirms that this specification constitutes a shared understanding of the desired `{functionality}` and authorizes the next stage.

---

## 2. Glossary & Evaluation Taxonomy Alignment

All state assessments and verification gates in this specification strictly adopt the authoritative definitions established in `LANGUAGE.md`:

* **`{errors}`**: Explicit failure states surfaced during execution or rendering, including browser console errors, unhandled runtime exceptions, network request failures (HTTP 4xx/5xx), broken image/SVG assets, or fatal process exits.
* **`{correctness}`**: Exact visual, spatial, thematic, and behavioral fidelity across all four requirements—verifying complete removal of prohibited receipt metadata tokens, authentic Retro RPG Dialogue Box styling and full Game Boy screen containment on the mat drink pop-up, zero off-screen spill on any asset descriptive box across all categories, and 1:1 visual registration of the ice station outline with the background ice well even when no explicit `{errors}` are thrown.
* **`{functionality}`**: The end-to-end operational state in which receipts render without check/date/time/server clutter, clicking a drink on the mat opens a screen-size-agnostic dialogue-themed build/trash pop-up inside the Game Boy screen, asset descriptive boxes remain fully on-screen across all stations, and the ice station outline matches the background ice artwork.
* **`{correct required outputs}`**: Objectively measurable visual and geometric states verified directly in the live browser runtime via Playwright bounding-box evaluations, text assertions, and screenshots.
* **`{sufficient}`**: The documentation state where zero ambiguity remains regarding desired outcomes, spatial bounds, thematic properties, and verification criteria.
* **`{insufficient}`**: Any state where behavioral, visual, or geometric requirements are ambiguous, incomplete, or contradictory.

---

## 3. Baseline Observations & Verified Defect Telemetry (Playwright)

Live Playwright inspection of the running application established the following deterministic baseline measurements:

1. **Receipt Metadata Clutter**:
   * Both the transient summary ticket and the inspected full receipt currently render check ID (`CHK: ORD-XXXX`), date (`MM/DD/YYYY`), timestamp (`HH:MM AM/PM`), and server (`SRV: V_BARTENDER`) rows beneath the `PATRON: <DISPLAY NAME>` header.
2. **Mat Drink Pop-Up Theme & Top-Bezel Overflow**:
   * Clicking an active drink vessel on the bar mat currently opens a translucent, rounded glassmorphic pop-up (`rgba(255, 255, 255, 0.12)` with system sans-serif typography) rather than matching the Retro RPG Dialogue Box theme.
   * On a `1280×800` desktop viewport where the visible Game Boy screen spans `top: 130.0px` to `bottom: 371.3px` (`273.6px × 241.3px`), the mat drink pop-up renders at `top: 124.1px`, spilling `5.9px` above the top edge of the Game Boy screen onto the `"DOT MATRIX WITH STEREO SOUND"` bezel.
3. **Asset Descriptive Box Off-Screen Spill (e.g., Garnishes)**:
   * On the same `1280×800` viewport (visible Game Boy screen `left: 503.2px`, `right: 776.8px`), clicking the **garnishes** station opens the descriptive box (`[FRESH] LIME_WHEEL`) at `left: 646.9px` to `right: 789.8px` (`width: 142.9px`), spilling **`13.0px` past the right edge** of the Game Boy screen and slicing off the end of the text (`"WHEE"`).
   * Clicking the **juices** station (`[JUICE] FRESH LIME`) places the descriptive box at `right: 777.2px`, spilling `0.4px` past the right edge (and spilling further on longer labels).
   * Because the underlying bar stage uses cover scaling inside the Game Boy screen aperture, stations near the left or right stage edges (`fridge` on the far left, `garnishes` and `juices` on the right) cause fixed-percentage horizontal centering to push descriptive boxes (and edge carousels) outside the visible Game Boy screen bounds.
4. **Misaligned Standard Ice / Large Ice Block Outline**:
   * In the `1184×880` bar stage coordinate space, the actual blue ice cubes in the background bar artwork's ice well occupy `x: 518..777` (`width: 259`), `y: 603..672` (`height: 69`).
   * The interactive ice station outline currently occupies `x: 462.6..721.1` (`width: 258.5`), `y: 520.5..586.5` (`height: 66.0`)—displaced approximately `56` units to the left and `84` units too high, causing the glowing outline to float on the dark metal backsplash above and to the left of the actual ice well.

---

## 4. Desired `{functionality}` & Behavioral Requirements

### 4.1 Removal of `"CHK: ORD-..."`, `"DATE/TIME"`, and `"SRV"` from Receipts

* **Complete Omission Across All Receipt Faces**:
  - Neither the transient summary receipt (`1appear`) nor the full patron-inspected square receipt (`3be shown when a character is clicked`) may display:
    1. Any check identifier (`"CHK:"` or `"ORD-..."`).
    2. Any calendar date (`MM/DD/YYYY`) or time of day (`HH:MM AM/PM` or `"DATE/TIME"`).
    3. Any server attribution (`"SRV"` or `"SRV: V_BARTENDER"`).
* **Preserved Receipt Header & Recipe Content**:
  - The top header of the summary receipt continues to display the mode title (e.g., `OBELISCO` or `CLASSICS`) and `PATRON: <DISPLAY NAME>` cleanly above the header divider.
  - The top header of the full inspected receipt continues to display the crisp mode brand logo and `PATRON: <DISPLAY NAME>` cleanly above the header divider, followed immediately by the cocktail name, `VESSEL`, `METHOD`, ingredient proportions, garnish/rim specifications, pricing (`SUBTOTAL`, `PIXEL TAX`, `TOTAL`), footer text, and barcode.

---

### 4.2 Dialogue-Themed, Screen-Size-Agnostic Mat Drink Pop-Up

* **Activation & Purpose**:
  - When a drink vessel is present on the bar mat (`drink_placement`) and the player clicks or taps the drink (without dragging it to a patron), a pop-up opens displaying the active drink's build status and a trash action.
* **Retro RPG Dialogue Box Theme Parity**:
  - Instead of a transparent or blurred glass card, the mat drink pop-up must use the exact **Retro RPG Dialogue Box** visual theme used by the character dialogue box and asset descriptive boxes:
    1. **Opaque Deep Navy Interior**: Solid `#09133b` background (no transparency or backdrop blur).
    2. **Pixelated Dual Border & Corner Ornaments**: Crisp white inner border (`#ffffff`), black outer outline (`#000000`), and pixelated corner squares/scrollwork matching the dialogue box aesthetic.
    3. **Retro Pixel Typography**: High-contrast uppercase pixel typography (`'Press Start 2P'`, monospace) with pixel drop-shadows:
       - **Header / Drink Title**: Rendered in gold (`#f7ca18`) at the top of the box (e.g., the active cocktail name or `FREESTYLE` / `(NO TICKET)`), paired with a clean pixel close button (`×`).
       - **Pours / Proportions List**: Displays each poured ingredient and its ounce measurement (`<INGREDIENT> = <X.XX>OZ`) and/or pour count in crisp white (`#ffffff`), or `"NO POURS YET"` when empty, with smooth internal vertical scrolling if the list of pours exceeds the pop-up's vertical budget.
       - **Trash Action Button**: A distinct, retro-styled interactive `"TRASH?"` button integrated cleanly at the bottom of the dialogue box with high-contrast pixel border and hover/active feedback.
* **Strict Game Boy Screen Containment & Screen-Size Agnostic Scaling**:
  - The mat drink pop-up must be positioned and sized relative to the **visible Game Boy screen aperture** so that across all desktop, tablet, and mobile viewport dimensions:
    1. **100% Inside the Game Boy Screen**: All four edges of the pop-up (left, right, top, bottom) remain strictly within the visible Game Boy screen bounds with at least a `4px` inner margin—never overlapping the top `"DOT MATRIX WITH STEREO SOUND"` bezel or spilling outside the screen.
    2. **Proportional Sizing**: The pop-up's width, height, padding, border thickness, and font sizes scale proportionally with the Game Boy screen dimensions (e.g., occupying roughly `42%–58%` of the visible Game Boy screen width and `34%–52%` of the visible Game Boy screen height, anchored cleanly above or over the bar mat region).
    3. **Unclipped Controls & Dismissal**: The drink title, pour lines, close button (`×`), and `"TRASH?"` button are 100% legible and clickable. Clicking `"TRASH?"` clears the active drink from the mat and closes the pop-up; clicking `×`, clicking outside the pop-up, pressing `Escape`, or pressing the Game Boy `A` button closes the pop-up without trashing the drink.

---

### 4.3 On-Screen Containment for All Asset Descriptive Boxes

* **Universal On-Screen Requirement Across All Stations**:
  - Whenever any bar station is clicked or navigated to via the Game Boy `D-Pad` (`rims`, `juices`, `double_strainer`, `hawthorne`, `boston_shaker`, `garnishes`, `fridge`/`glassware`, `syrups`, `speedrail`/`liquors`, and `ice`), the Retro RPG Dialogue-themed descriptive box (`[data-testid="carousel-dialogue-popup"]`) displaying the focused asset's name must render **100% inside the visible Game Boy screen**.
* **Dynamic Horizontal & Vertical Screen Clamping**:
  - Regardless of where the station hotspot sits on the bar stage (including far-right stations like `garnishes` and `juices` or far-left stations like `fridge` and `rims`) and regardless of the character length of the focused asset's label:
    1. **Zero Horizontal Spill**: The left edge of the descriptive box must never be less than ` visibleScreen.left + 4px`, and the right edge of the descriptive box must never exceed `visibleScreen.right - 4px`.
    2. **Zero Vertical Spill**: The top edge of the descriptive box must never be less than `visibleScreen.top + 4px`, and the bottom edge of the descriptive box must never exceed `visibleScreen.bottom - 4px`.
    3. **Complete Label Visibility**: The descriptive box must size and clamp within the visible Game Boy screen so that the asset's name (such as `[FRESH] LIME_WHEEL` in `garnishes`, `KOSHER SALT / SEA SALT` in `rims`, `[JUICE] FRESH LIME` in `juices`, or `STANDARD_ICE` / `LARGE_ICE_ROCK` in `ice`) is completely visible inside its bordered box without the box itself being sliced off by the Game Boy screen edge.
    4. **Every Category Populates a Descriptive Box**: Every interactive asset category—including `rims`, `garnishes`, `juices`, `syrups`, `speedrail`, `fridge`, `hardware`, and `ice`—must display its descriptive box when opened and update dynamically as the user scrolls or steps through items.

---

### 4.4 Alignment of the Standard Ice / Large Ice Block Outline with Background Ice

* **Exact Co-Registration with the Background Ice Well**:
  - In the `1184×880` bar stage coordinate space, the interactive outline for the ice well (`zoneId: "ice"`, which opens the `STANDARD_ICE` and `LARGE_ICE_ROCK` selection) must be positioned directly over the visual ice cubes in the background bar artwork (`/OBELISCO_POV.jpg`):
    - **Target Horizontal Bounds**: Spanning approximately `x: 518` to `x: 777` (width `~258.5` viewBox units) so the left and right edges of the outline match the left and right walls of the ice bin in the background artwork.
    - **Target Vertical Bounds**: Spanning approximately `y: 604` to `y: 671` (height `~66` viewBox units) so the jagged top contour traces the top peaks of the ice cubes and the bottom edge rests along the front lip of the ice bin, rather than floating on the dark metal backsplash above (`y: 520..586`).
* **Interactive & Carousel Alignment**:
  - Hovering, clicking, or focusing the ice station via the Game Boy `D-Pad` highlights the outline directly on top of the background ice cubes, and clicking/activating it opens the `STANDARD_ICE` / `LARGE_ICE_ROCK` carousel centered cleanly over the aligned ice well.

---

## 5. Invariants, Constraints & Edge Cases

* **`INV-RECEIPT-NO-META-01` (Zero Check, Date, Time, or Server Tokens)**:
  - No rendered receipt element (summary or full) may contain the substrings `"CHK:"`, `"ORD-"`, `"SRV"`, `"V_BARTENDER"`, a formatted date (`MM/DD/YYYY`), or a formatted timestamp (`AM` / `PM` time).
* **`INV-MAT-POPUP-DIALOGUE-01` (Dialogue Theme & Screen Containment for Mat Pop-Up)**:
  - The mat drink pop-up must render with `#09133b` background, white/black pixel borders, and pixel typography, and its bounding box must lie 100% within the visible Game Boy screen (`.pov-shell-section` / `.gb-shell__playfield`) across both desktop (`1280×800`) and mobile (`390×844`) viewports.
* **`INV-ASSET-BOX-ONSCREEN-01` (Zero Off-Screen Spill for Asset Descriptive Boxes)**:
  - Across all 10 interactive bar zones (`rims`, `juices`, `double_strainer`, `hawthorne`, `boston_shaker`, `garnishes`, `fridge`, `syrups`, `speedrail`, `ice`) and across all items within each zone, the descriptive box (`[data-testid="carousel-dialogue-popup"]`) must have `left >= screen.left + 2`, `right <= screen.right - 2`, `top >= screen.top + 2`, and `bottom <= screen.bottom - 2` at all times.
* **`INV-ICE-ALIGN-01` (Ice Outline Registered to Background Ice Well)**:
  - The `ice` hotspot path bounding box in `1184×880` stage coordinates must satisfy `x ∈ [514, 524]`, `y ∈ [600, 610]`, `width ∈ [254, 264]`, and `height ∈ [62, 72]`, aligning directly with the background ice well pixel region (`x: 518..777`, `y: 603..672`).
* **`INV-FAILFAST-01` (Zero Silent Fallbacks)**:
  - Any missing asset label, missing hotspot path, or invalid drink build state must surface an explicit error immediately rather than failing silently.

---

## 6. Acceptance Criteria & Verification (`{correct required outputs}`)

All acceptance criteria must be verified in the live browser runtime via **Playwright** (`browser_evaluate` geometry/text assertions and `browser_take_screenshot` visual inspection):

| ID | Criterion | Expected Measurable Outcome (`{correct required outputs}`) |
| :--- | :--- | :--- |
| **`AC-01`** | **Receipt Metadata Removed** | Both the transient summary receipt (`1appear`) and the patron-clicked full receipt (`3be shown`) render zero occurrences of `"CHK:"`, `"ORD-"`, date (`MM/DD/YYYY`), time (`HH:MM AM/PM`), or `"SRV"`, while preserving the mode logo/title, `PATRON: <DISPLAY NAME>`, recipe body, totals, and barcode. |
| **`AC-02`** | **Mat Drink Pop-Up Dialogue Theme** | Clicking an active drink on the bar mat opens a pop-up styled with the Retro RPG Dialogue Box theme (`backgroundColor: rgb(9, 19, 59)`, white/black pixel borders, corner ornaments, pixel font) displaying the drink title, poured proportions / pour count (or `"NO POURS YET"`), close button, and `"TRASH?"` option. |
| **`AC-03`** | **Mat Drink Pop-Up Screen-Size-Agnostic Containment** | Across desktop (`1280×800`) and mobile (`390×844`) viewports, the mat drink pop-up bounding box lies 100% inside the visible Game Boy screen (`popup.top >= screen.top + 4`, `popup.bottom <= screen.bottom - 4`, `popup.left >= screen.left + 4`, `popup.right <= screen.right - 4`), and clicking `"TRASH?"` clears the drink from the mat. |
| **`AC-04`** | **Asset Descriptive Boxes 100% On-Screen (Playwright Verified)** | Clicking each of the 10 bar zones (`rims`, `juices`, `double_strainer`, `hawthorne`, `boston_shaker`, `garnishes`, `fridge`, `syrups`, `speedrail`, `ice`) and stepping through their assets in Playwright confirms that `[data-testid="carousel-dialogue-popup"]` is visible and stays 100% within the visible Game Boy screen (`0px` left, right, top, or bottom spill, specifically confirming `garnishes` no longer spills out of the screen). |
| **`AC-05`** | **Ice Outline Aligned with Background Ice (Playwright Verified)** | Playwright SVG bounding-box inspection and screenshot verification confirm that `[data-zone="ice"]` is positioned at `x ≈ 518.6..777.1`, `y ≈ 604.5..670.5` in the `1184×880` stage viewBox, aligning directly over the ice cubes in `/OBELISCO_POV.jpg`. |
| **`AC-06`** | **Zero `{errors}`** | Live Playwright verification completes with zero console errors, zero uncaught page exceptions, and zero failed network requests. |

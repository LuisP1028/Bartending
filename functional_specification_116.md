# Functional Specification 116: Receipt Lifecycle Integrity (`1appear`, `2disappear`, `3be shown when a character is clicked`), Unclipped Summary Printing & Larger Square Patron Order Inspection

## 1. Overview & Objective

The objective of this specification is to define the exact desired `{functionality}`, visual geometry, typographical and asset rendering requirements, lifecycle transitions, constraints, edge cases, and acceptance criteria for the bartending order receipt system inside the **Nintendo Game Boy** screen across its three core operational states:

1. **`1appear` (Transient Order Receipt Appearance)**: When a patron takes a seat and places an order (or when a ticket is generated), the receipt printer and summary receipt appear in the upper-right region of the Game Boy screen and unroll a complete, cleanly formatted, unclipped summary ticket without the printer bezel slicing off the top header, without truncating the patron's name, without breaking metadata tokens across lines, and without cutting off the lower half of the summary ticket.
2. **`2disappear` (Transient Order Receipt & Printer Disappearance)**: Once the summary receipt finishes unrolling and remains briefly readable, both the printed receipt and the printer hardware smoothly fade out and disappear completely from the screen, leaving zero permanent hardware or floating paper clutter on the bar stage.
3. **`3be shown when a character is clicked` (Patron-Click Full Receipt Inspection in a Larger Square)**: When a seated character is clicked, all other patrons are temporarily hidden to isolate the clicked character, and that character's full order receipt is displayed (without the printer hardware) inside a **substantially larger square container** within the Game Boy screen, with the top brand logo, patron attribution, check/date/time/server metadata, drink title, vessel, method, ingredient measurements, pricing, and barcode rendered cleanly and legibly without mid-word wrapping or asset distortion.

This document specifies only the desired `{functionality}`, observable outcomes, spatial and visual requirements, constraints, inputs, outputs, and evaluation criteria. It contains zero implementation guidance, code sketches, component names, or architectural prescriptions.

**DO NOT CODE YET.** No coding, scaffolding, or implementation planning may proceed until the operator confirms that this specification constitutes a shared understanding of the desired `{functionality}` and authorizes the next stage.

---

## 2. Glossary & Evaluation Taxonomy Alignment

All assessments and verification gates in this specification strictly adopt the authoritative definitions established in `LANGUAGE.md`:

* **`{errors}`**: Explicit failure states surfaced during execution or rendering, including browser console errors, unhandled runtime exceptions, network request failures (HTTP 4xx/5xx), broken image or canvas assets, or fatal process exits.
* **`{correctness}`**: Exact visual, spatial, and behavioral fidelity of the receipt system across all three states—verifying zero bezel overlap, zero premature text ellipsis, zero mid-token word breaks (such as splitting `"V_BARTENDER"`, `"ORD-XXXX"`, dates, or times across lines), crisp logo and barcode rendering, and accurate square geometry even when no explicit `{errors}` are thrown.
* **`{functionality}`**: The end-to-end operational lifecycle in which receipts cleanly `1appear` when ordered, `2disappear` after printing, and `3be shown when a character is clicked` inside a larger square with 100% legible text and assets inside the Nintendo Game Boy screen.
* **`{correct required outputs}`**: Objectively measurable visual and behavioral states verified directly in the live browser runtime via Playwright inspection and screenshots.
* **`{sufficient}`**: The documentation state where zero ambiguity remains regarding desired outcomes, spatial bounds, typography integrity, lifecycle transitions, and verification criteria.
* **`{insufficient}`**: Any state where behavioral, visual, or geometric requirements are ambiguous, incomplete, or contradictory.

---

## 3. Input Specifications & Reference Defect Artifacts

1. **Defect Reference 1 — Misrendered `"1appear"` Transient Print State (`/Users/diesel/Desktop/Screenshot 2026-10-15 at 9.25.44 AM.png`)**:
   * Depicts the upper-right transient printer and unrolling summary receipt when patron `CAESAR` places an order inside the Game Boy screen.
   * Documents four explicit `{correctness}` failures that must be eliminated:
     - **Header Sliced by Printer Bezel**: The bottom edge of the dark grey printer housing overlaps the top of the unrolled paper, cutting the mode title (`OBELISCO`) in half horizontally.
     - **Truncated Patron Name**: The patron attribution banner clips `"PATRON: CAESAR"` into `"PATRON: CA..."` even though horizontal space is available if properly proportioned.
     - **Shattered Metadata Line**: The check and time row (`CHK: ORD-4739` and `09:25 AM`) breaks across three vertical lines (`CHK:` / `ORD-` / `4739` on the left; `09:25` / `AM` on the right).
     - **Clipped Ticket Body**: The summary ticket cuts off abruptly immediately after the drink title (`PACHAMAMA`), hiding the required vessel, preparation method, ingredient summary, total price, and bottom torn paper edge.
2. **Defect Reference 2 — Misrendered & Undersized Clicked-Character Receipt (`/Users/diesel/Desktop/Screenshot 2026-10-15 at 9.27.02 AM.png`)**:
   * Depicts the inspected receipt when seated patron `ELDER` is clicked inside the Game Boy screen.
   * Documents four explicit `{correctness}` and sizing failures that must be eliminated:
     - **Undersized, Narrow Rectangular Footprint**: The receipt box is a narrow vertical strip that is too small for comfortable reading and cramps all internal content horizontally.
     - **Crushed / Garbled Top Brand Logo**: The crest logo at the top of the receipt is squashed into a tiny, heavily pixelated blob that is visually unrecognizable.
     - **Mid-Token Line Wrapping on Metadata**:
       * `CHK: ORD-6185` wraps across three lines (`CHK:` / `ORD-` / `6185`).
       * The date `10/15/2026` splits mid-year across two lines (`10/15/20` / `26`).
       * `SRV: V_BARTENDER` splits mid-word across three lines (`SRV:` / `V_BARTEN` / `DER`).
     - **Truncated Recipe View**: Everything below `METHOD BUILT` (all cocktail ingredients and ounce proportions, garnish/rim requirements, itemized pricing, total, footer, and barcode) is cut off from view.
3. **Active Game Boy Screen Viewport**:
   * The inner playable screen area of the Nintendo Game Boy housing across arbitrary desktop and mobile viewport dimensions.
4. **Seated Patrons & Associated Order Tickets**:
   * Seated characters at the bar, each bound to a unique cocktail order ticket containing patron identity, order ID, timestamp, mode branding, cocktail name, vessel, preparation method, ingredient proportions, garnishes/rims, pricing, and verification seed.

---

## 4. Desired `{functionality}` & Behavioral Requirements

### 4.1 State 1 (`1appear`): Clean, Unclipped Transient Receipt Printing

* **Trigger & Emergence**:
  - Whenever a patron finishes walking to their bar stool and sits down to order (or when a new ticket is generated), the receipt printer hardware fades smoothly into the upper-right area of the Game Boy screen and unrolls the summary receipt downward from the printer slot.
* **Zero Bezel Overlap on the Unrolled Slip**:
  - The top of the unrolled summary receipt paper must emerge **cleanly below the printer slot opening** so that the printer bezel never covers, slices, or obscures the top header text (e.g., `OBELISCO`) or top margin of the receipt once unrolled.
* **100% Complete & Unbroken Summary Typography**:
  - Every element on the summary receipt must be proportioned to fit the summary paper width and height cleanly without truncation or mid-token line breaks:
    1. **Mode Title Header**: Centered and fully visible at the top of the slip (e.g., `OBELISCO`), never clipped at its top edge.
    2. **Full Patron Attribution**: Displays `PATRON: <DISPLAY NAME>` (e.g., `PATRON: CAESAR`, `PATRON: ELDER`) in full on a single horizontal line without `...` ellipsis truncation.
    3. **Single-Line Check & Timestamp Row**: Displays `CHK: ORD-XXXX` on the left and the time (`HH:MM AM/PM`) on the right on a **single horizontal row**, never splitting `ORD-XXXX` or `HH:MM AM` across multiple lines.
    4. **Cocktail Name**: Displays the ordered drink's name clearly and prominently below the header divider.
    5. **Vessel & Preparation Method**: Displays the required glass/vessel and preparation method cleanly without awkward single-letter or mid-word breaks.
    6. **Ingredient Summary & Total**: Displays the concise ingredient list and the `TOTAL $XX.XX` row at the bottom of the summary slip, terminating in the visible jagged paper tear edge so the summary ticket looks like a complete physical ticket rather than a vertically sliced fragment.

---

### 4.2 State 2 (`2disappear`): Complete Transient Dismissal of Receipt & Printer

* **Hold & Synchronized Fade-Out**:
  - After the summary receipt completes its downward unroll animation, it remains stationary for a brief readable hold period so the player can register the new order and patron attribution.
  - Immediately following the hold period, **both the summary receipt paper and the receipt printer hardware fade out together and disappear completely** from the Game Boy screen.
* **Zero Idle Screen Footprint**:
  - Once the fade-out completes, neither the printer bezel nor any uninspected receipt slip remains visible or interactive on the bar stage, leaving the upper-right bar background and any right-seated patron completely unobstructed.
* **Deterministic Queueing**:
  - If multiple patrons sit down and order in rapid succession, their print sequences queue in order so each ticket completes its full `1appear` → `2disappear` cycle cleanly without overlapping slips or stuck printer hardware.

---

### 4.3 State 3 (`3be shown when a character is clicked`): Larger Square Receipt Inspection & Complete Asset/Text Fidelity

* **Patron-Click Activation & Isolation**:
  - Clicking or tapping any seated patron who has an active order:
    1. Immediately selects and binds that patron's order as the active drink build on the bar mat.
    2. Temporarily hides all **other** patrons at the bar so visual focus is isolated on the clicked patron and their receipt.
    3. Displays the clicked patron's full order receipt **without** the receipt printer hardware bezel.
* **Larger Square Receipt Geometry**:
  - Instead of a narrow vertical strip, the inspected receipt must render in a **substantially larger square (or near-square `1:1` aspect ratio) bounding box** inside the Game Boy screen:
    - **Size & Aspect Ratio**: The inspected receipt container must form a generous square (or near-square where width and height are approximately equal, occupying roughly `50%–58%` of the Game Boy screen's width and `50%–58%` of the Game Boy screen's height, or matching pixel dimensions at a `~1:1` ratio).
    - **Placement**: Positioned cleanly in the center-right stage region immediately to the right of the left-seated patron (`left: ~34%–38%` of the Game Boy screen width, `top: ~14%–18%` of the Game Boy screen height), ensuring it never covers the left-seated patron's face, stays clear of the bottom-left/bottom-right HUD controls, and stays 100% inside the Game Boy screen boundaries across all desktop and mobile viewports.
* **Clean Asset & Text Rendering Inside the Larger Square**:
  - Taking full advantage of the wider square width, every asset and text row on the full receipt must render cleanly and legibly:
    1. **Crisp Mode Brand Logo**: The venue/mode logo artwork at the top of the receipt must render at a clear, legible scale with smooth aspect-ratio preservation—never crushed into a tiny, illegible pixelated smudge.
    2. **Unbroken Patron Attribution Banner**: `PATRON: <DISPLAY NAME>` renders centered on a single line with 100% of the patron's name visible.
    3. **Single-Line Metadata Rows (Zero Mid-Token Wrapping)**:
       - Row 1: `CHK: ORD-XXXX` on the left and the full date `MM/DD/YYYY` on the right must fit on **one single horizontal line** (never wrapping `ORD-XXXX` onto extra lines and never splitting `2026` into `20` / `26`).
       - Row 2: `SRV: V_BARTENDER` on the left and the full time `HH:MM AM/PM` on the right must fit on **one single horizontal line** (never breaking `V_BARTENDER` into `V_BARTEN` / `DER`).
    4. **Complete, Legible Cocktail Recipe Specification**:
       - The cocktail title, `VESSEL` row, `METHOD` row, all required ingredient rows with exact ounce measurements (`oz` / `dashes`), and any required `GARNISH` or `RIM` rows must render with clear left-label / right-value alignment and zero mid-word wrapping.
       - The typography and vertical rhythm inside the larger square must be proportioned so the core recipe specification (header, patron name, metadata, drink name, vessel, method, and ingredient lines) is immediately visible inside the square without being prematurely cut off, while supporting smooth vertical scrolling to view lower commercial lines, `SUBTOTAL`, `PIXEL TAX`, `TOTAL`, footer, and the barcode canvas.
    5. **Crisp Barcode & Footer**: The bottom barcode canvas and seed string render cleanly and centered at the foot of the receipt without horizontal overflow or distortion.
* **Dismissal & Patron Restoration**:
  - Clicking/tapping the open square receipt, clicking outside on the bar stage background, or pressing the Game Boy `A` button closes the inspected receipt and immediately restores the visibility of all other patrons at the bar.
  - Dragging and dropping a prepared drink vessel onto a seated patron continues to perform drink service and recipe validation.

---

## 5. Invariants, Constraints & Edge Cases

* **`INV-APPEAR-UNCLIPPED-01` (Zero Bezel Overlap or Summary Cutoff)**:
  - During `1appear`, the printer bezel must never overlap the top text of the unrolled summary receipt, and the summary receipt must never clip mid-ticket before displaying the drink name, vessel/method, ingredients summary, and total.
* **`INV-DISAPPEAR-CLEAN-01` (Zero Residual Printer/Paper Clutter)**:
  - After `2disappear` completes, both the printer hardware and the printed slip must have `0` visual opacity and `0` pointer-event interception until the next print event occurs.
* **`INV-INSPECT-SQUARE-01` (Larger Square Geometry on Patron Click)**:
  - When a character is clicked (`3be shown when a character is clicked`), the inspected receipt box must maintain a larger square / near-square proportion (aspect ratio `width / height` between `0.85` and `1.15`, with width `≥ 48%` of the Game Boy playfield width) fully contained inside the Game Boy screen across both desktop and mobile viewports.
* **`INV-TEXT-INTEGRITY-01` (Zero Mid-Word Wrapping or Ellipsis Truncation)**:
  - Neither the transient summary receipt nor the inspected square receipt may truncate `PATRON: <DISPLAY NAME>` with `...`, split `CHK: ORD-XXXX`, split `MM/DD/YYYY`, split `HH:MM AM/PM`, or break `SRV: V_BARTENDER` across multiple lines.
* **`INV-ASSET-INTEGRITY-01` (Legible Brand Logo & Barcode)**:
  - The top brand logo image on the inspected receipt must load with `complete === true` and `naturalWidth > 0` and render at a legible height without crushed pixel distortion; the bottom barcode canvas must render with non-zero dimensions inside the ticket bounds.
* **`INV-PATRON-ISOLATION-01` (Deterministic Isolation & Restoration)**:
  - Clicking a seated patron hides all other patrons while the square receipt is open and restores them 100% intact the moment the receipt is dismissed or served.
* **`INV-FAILFAST-01` (Zero Silent Fallbacks)**:
  - Missing patron attribution, missing recipe data, or missing receipt instance bindings must fail fast with an explicit error rather than rendering blank or degraded placeholders.

---

## 6. Acceptance Criteria & Verification (`{correct required outputs}`)

All acceptance criteria must be verified in the live browser runtime via **Playwright** (`browser_evaluate` geometry/text assertions and `browser_take_screenshot` visual inspection):

| ID | Criterion | Expected Measurable Outcome (`{correct required outputs}`) |
| :--- | :--- | :--- |
| **`AC-01`** | **`1appear` Unobstructed Top Header** | During the transient print sequence (`printing` / `holding`), the top edge of the summary receipt content (`OBELISCO` / mode title) lies strictly below the bottom edge of the printer bezel housing (`0px` overlap). |
| **`AC-02`** | **`1appear` Complete Summary Content & Single-Line Meta** | During `1appear`, `PATRON: <DISPLAY NAME>` renders in full without `...` truncation; `CHK: ORD-XXXX` and `HH:MM AM/PM` each render on a single line (`clientHeight <= 1.4 * lineHeight`); and the drink name, vessel, method, ingredient summary, and `TOTAL` all fit visibly inside the unrolled summary slip without vertical clipping. |
| **`AC-03`** | **`2disappear` Complete Fade-Out** | After the transient print cycle finishes, the printer hardware and summary ticket transition to `idle` (`opacity: 0`, `visibility: hidden`) leaving zero visible printer or floating paper elements on screen. |
| **`AC-04`** | **`3be shown` Larger Square Geometry** | Clicking a seated patron opens their full receipt (without the printer bezel) in a larger square / near-square bounding box (`width >= 48%` of Game Boy playfield width, aspect ratio `width / height` between `0.85` and `1.15`) fully contained within the Game Boy playfield across desktop (`1280×800`) and mobile (`390×844`) viewports. |
| **`AC-05`** | **`3be shown` Single-Line Metadata Integrity** | Inside the opened square receipt, `PATRON: <DISPLAY NAME>`, `CHK: ORD-XXXX` + `MM/DD/YYYY`, and `SRV: V_BARTENDER` + `HH:MM AM/PM` each render on a single horizontal line with zero mid-word or mid-date wrapping. |
| **`AC-06`** | **`3be shown` Recipe Visibility & Crisp Logo Asset** | Inside the opened square receipt, the top brand logo renders cleanly at a legible size (`height >= 28px` on desktop), and the drink title, `VESSEL`, `METHOD`, and ingredient ounce lines render clearly without horizontal clipping or mid-word breaks. |
| **`AC-07`** | **Patron Isolation & Dismissal Restoration** | While a clicked patron's square receipt is open, all other patrons are hidden; clicking the receipt, clicking the background, or pressing the Game Boy `A` button closes the receipt and immediately restores all other patrons. |
| **`AC-08`** | **Playwright Visual Verification & Zero `{errors}`** | Live Playwright screenshots and DOM/bounding-box evaluations confirm `AC-01` through `AC-07` with zero console errors, zero uncaught page errors, and zero network errors. |

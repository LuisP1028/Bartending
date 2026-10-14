# FS112 — Mode Selection Screen Broken Background Asset Removal, Stub Option Elimination, and Maximum Shell-Bounded Asset Scaling

## Purpose

Establish required product `{functionality}` for the startup / mode selection screen presented inside the console screen playfield, ensuring three cohesive outcomes:
1. No missing or broken background image assets are requested or rendered, completely eliminating the broken-image placeholder icon from the display and presenting a clean, uniform dark display surrounding the interactive navigation terminal.
2. The non-functional `"WARP DIAGNOSTICS"` and `"TERMINATE UPLINK"` options are completely removed from the startup menu's options and navigation cycle, leaving only `"Mode Selection"` and `"Join the bar!"`.
3. The remaining `"Mode Selection"` assets (including the mode selection header and the dual gold cutout mode logos for **OBELISCO** and **CLASSICS**), the `"Join the bar!"` option, the navigation pointer graphic, and the enclosing Synthwave Navigator terminal frame are resized to be as large as possible while remaining strictly bounded within the console screen playfield constraints without clipping, overflowing, or inducing scrollbars.

The coding assistant is instructed to independently inspect the codebase, trace the mode selection view rendering tree and styling assets, and identify all necessary edits to achieve these functional outcomes. This document specifies desired `{functionality}`, inputs, outputs, behavioral constraints, edge cases, and acceptance criteria only; it contains no implementation guidance, component breakdowns, code sketches, or architectural prescriptions.

**Prior:**
- [functional_specification_80.md](./functional_specification_80.md) (Synthwave Navigator menu within console housing)
- [functional_specification_81.md](./functional_specification_81.md) (Screen housing and playfield alignment)
- [functional_specification_87.md](./functional_specification_87.md) (Mode selection row and dual mode logo presentation)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow system taxonomy (`LANGUAGE.md`).

| Term | Meaning |
|:---|:---|
| **Mode Selection Screen** | The initial interactive startup menu presented within the console screen playfield upon completing or bypassing boot sequences, hosting the Synthwave Navigator menu, mode selection options, and console navigation actions. |
| **Console Playfield Glass** | The recessed screen viewing aperture bounded by the console bezel, within which all game screens and menus are visually framed. |
| **Synthwave Navigator** | The centered terminal box inside the console playfield glass containing the navigation list, mode title, mode logos, `"Join the bar!"` action, and navigation pointer graphic. |
| **Broken Image Placeholder** | The client browser's native failure icon (e.g., torn page / missing media indicator) rendered whenever an image element cannot resolve its requested asset source. |
| **Legacy Stub Options** | The obsolete `"Warp Diagnostics"` and `"Terminate Uplink"` startup menu rows that previously appeared below `"Join the bar!"` as non-operative placeholders. |
| **Shell-Bounded Maximum Scaling** | Sizing the Synthwave Navigator panel and its internal interactive assets (`"Mode Selection"` block, dual mode logos, `"Join the bar!"` control, and selection pointer) to utilize the maximum available area of the Console Playfield Glass without crossing bezel boundaries, clipping visual effects, or causing layout overflow. |

---

## Current Baseline & Observed `{errors}`

### Observed `{errors}` & Limitations
1. **Broken Image Indicator in Screen Glass**:
   - On the mode selection screen, a broken image icon is rendered at the top-left corner of the console screen playfield glass.
   - This occurs because an image element attempting to render a background asset fails to resolve its source file over the network/filesystem.
2. **Extraneous Asset Dependency**:
   - The mode selection screen requires an external static image for background rendering that is redundant given the dark styling of the terminal frame and console playfield.
3. **Presence of Obsolete Non-Functional Menu Rows**:
   - The startup menu displays two placeholder entries—`"Warp Diagnostics"` and `"Terminate Uplink"`—that perform no action when activated, cluttering vertical navigation and consuming vertical real estate inside the console screen playfield.
4. **Undersized Mode Selection & `"Join the bar!"` Presentation**:
   - Because vertical space was previously partitioned across four distinct menu rows, the Synthwave Navigator frame, the `"Mode Selection"` header, the **OBELISCO** and **CLASSICS** gold cutout logo graphics, the `"Join the bar!"` action row, and the pixel pointer graphic are constrained to small dimensions that underutilize the console playfield glass.

---

## Desired `{functionality}`

### 1. Complete Elimination of Broken Asset Rendering
- **No Missing Asset Requests or Broken Placeholders**:
  - The mode selection screen must not render any image element or reference any asset path that results in a failed network request or browser broken-image placeholder.
  - The top-left corner of the console screen playfield must be completely free of broken image icons, missing graphic glyphs, or failed asset indicators.

### 2. Clean Dark Playfield Presentation
- **Uniform Playfield Background**:
  - The area of the console screen playfield behind and around the Synthwave Navigator menu must display as a solid, uniform black presentation consistent with the unpowered or dormant screen glass aesthetic of the console.
- **Uncompromised Synthwave Navigator Display**:
  - The Synthwave Navigator terminal frame, including its internal gradient, inset shadows, scanlines, border, typography, and pointer graphic, must remain visually prominent and unobstructed.

### 3. Complete Removal of `"WARP DIAGNOSTICS"` and `"TERMINATE UPLINK"`
- **Exclusive Two-Row Menu Structure**:
  - The `"Warp Diagnostics"` and `"Terminate Uplink"` options must be removed in their entirety from the startup menu.
  - Zero DOM nodes, labels, focus targets, or menu indices may exist for `"Warp Diagnostics"` or `"Terminate Uplink"`.
  - The startup menu must consist strictly and exclusively of two vertical entries:
    1. **Row 0 — `"Mode Selection"`**: The mode selection block containing the `"Mode Selection"` heading and the dual horizontal mode logo controls (**OBELISCO** and **CLASSICS**).
    2. **Row 1 — `"Join the bar!"`**: The interactive entry that launches the Join the Bar Comm-Link / patron registration flow.
- **Two-Row Vertical Navigation Cycle**:
  - Pressing `Up` or `Down` (via keyboard arrow keys or the console D-pad) must cycle focus strictly between Row 0 (`"Mode Selection"`) and Row 1 (`"Join the bar!"`) with wrap-around behavior (`0 ↔ 1`).
  - Transitioning vertically onto Row 0 (`"Mode Selection"`) must continue to default horizontal logo focus to the first mode logo (**OBELISCO**), while `Left` and `Right` inputs on Row 0 toggle focus between **OBELISCO** and **CLASSICS**.

### 4. Maximum Shell-Bounded Scaling of Mode Selection & `"Join the bar!"` Assets
- **Maximized Synthwave Navigator Footprint**:
  - With the two lower stub options removed, the Synthwave Navigator container must expand to fill as much of the Console Playfield Glass width and height as possible while preserving a clean, uniform margin inside the playfield glass boundary.
- **Maximized Mode Selection Assets**:
  - The `"Mode Selection"` title and the dual gold cutout mode logos (**OBELISCO** and **CLASSICS**) must be scaled up to the largest possible dimensions permitted by the expanded Synthwave Navigator container.
  - Both mode logos must remain side-by-side within the mode selection row, maintaining their intrinsic aspect ratios, crisp/pixelated rendering fidelity, interactive hit areas, hover/active drop-shadow glows, and focus-visible dashed outlines without colliding with each other or clipping against the container edges.
- **Maximized `"Join the bar!"` Asset & Pointer Graphic**:
  - The `"Join the bar!"` menu control must be scaled up proportionally in typography/visual size and vertical spacing to match the enlarged `"Mode Selection"` presentation and command prominent visual weight in the lower portion of the Synthwave Navigator.
  - The animated left-hand pixel selection pointer graphic must scale up proportionally to match the enlarged menu rows and mode logos, with sufficient left gutter clearance so the pointer never overlaps the mode logos or text labels.
- **Strict Adherence to Shell Constraints**:
  - All enlarged assets, focus rings, glow filters, and padding must remain 100% contained within the Console Playfield Glass across all supported viewport sizes and aspect ratios (desktop, tablet, and mobile portrait shell).
  - Neither the Synthwave Navigator nor the Console Playfield Glass may exhibit horizontal or vertical clipping of content, text wrapping that breaks layout integrity, or internal scrollbars.
  - Pointer vertical snapping must dynamically align with the vertical center of whichever enlarged target is focused (either the active mode logo button on Row 0 or the enlarged `"Join the bar!"` button on Row 1).

---

## Inputs & `{correct required outputs}`

### Inputs
1. **Mode Selection Display State**:
   - Transition into the startup / mode selection screen following boot completion, restart, or navigation back from sub-screens.
2. **Directional & Action Inputs**:
   - Console D-pad (`Up`, `Down`, `Left`, `Right`), console `A` / `B` / `START` buttons, keyboard arrow keys (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Space`, `Escape`), and pointer clicks/taps.

### `{correct required outputs}`
1. **Clean Screen Surface & Network Cleanliness**:
   - Screen glass rendering with zero 404/broken asset indicators at coordinates `(0, 0)` or anywhere else in the display, and zero failed HTTP requests for defunct menu background images.
2. **Strictly Two Menu Options Rendered**:
   - The rendered startup menu contains only `"Mode Selection"` (with the **OBELISCO** and **CLASSICS** logo buttons) and `"Join the bar!"`. `"Warp Diagnostics"` and `"Terminate Uplink"` are completely absent from the DOM and accessibility tree.
3. **Maximized, Non-Clipping Visual Presentation**:
   - The Synthwave Navigator, `"Mode Selection"` heading, **OBELISCO** and **CLASSICS** logo graphics, `"Join the bar!"` option, and pixel selection pointer render at maximum shell-bounded scale within the Console Playfield Glass, with zero overflow or clipping across all viewport dimensions.
4. **Accurate Two-Row Navigation & Pointer Alignment**:
   - `Up` / `Down` navigation toggles exclusively between `"Mode Selection"` and `"Join the bar!"`, `Left` / `Right` toggles between **OBELISCO** and **CLASSICS** when `"Mode Selection"` is active, and the selection pointer graphic snaps accurately to the vertical center of the focused enlarged target.

---

## Edge Cases & Behavioral Constraints

1. **Viewport and Container Scaling Stability**:
   - Resizing the browser window, rotating device orientation, or rendering across extreme aspect ratios must dynamically scale the enlarged Synthwave Navigator, mode logos, and `"Join the bar!"` text/assets via container-relative constraints so they never exceed the Console Playfield Glass or trigger overflow clipping.
2. **Side-by-Side Mode Logo Integrity at Maximum Scale**:
   - Enlarging the **OBELISCO** and **CLASSICS** logo buttons must not cause one logo to wrap onto a second line or push `"Join the bar!"` outside the bottom border of the Synthwave Navigator panel; both logos must comfortably fit side-by-side within the available horizontal width after accounting for the left pointer gutter and container padding.
3. **Glow Filter and Focus Ring Clearance**:
   - Active/hover drop-shadow glows and dashed keyboard focus outlines around the enlarged mode logos and `"Join the bar!"` button must have sufficient interior padding within the Synthwave Navigator so they are not visibly sheared off by `overflow: hidden` boundaries.
4. **Sub-Screen Transitions**:
   - Navigating forward into `"Join the bar!"` (Comm-Link / camera overlay) or gameplay, and subsequently returning back to the startup menu (via Back / `B` button or `Escape`), must preserve the two-row layout, clean black playfield backing, and accurate pointer positioning without regression.
5. **No Fallback Clutter or Hidden Dead DOM**:
   - In accordance with system fail-fast and zero-hack-fix rules, `"Warp Diagnostics"` and `"Terminate Uplink"` must not be merely hidden via `display: none`, `visibility: hidden`, or opacity tricks—they must be completely removed from the menu definition. Similarly, the defunct background image must be cleanly removed rather than masked with error handlers.

---

## Acceptance Criteria & `{correctness}` Verification

| ID | Criterion | Measurable Verification |
|:---|:---|:---|
| **AC1** | **Zero Broken Background Assets** | Viewing the mode selection screen produces zero broken-image icons in the Console Playfield Glass and zero 404 network requests for menu background files. |
| **AC2** | **Complete Removal of Stub Options** | Inspecting the DOM and accessibility tree of the startup menu confirms `"Warp Diagnostics"` and `"Terminate Uplink"` do not exist; only `"Mode Selection"` and `"Join the bar!"` are present. |
| **AC3** | **Two-State Vertical Navigation** | Pressing `Up` or `Down` via keyboard or D-pad cycles focus strictly between `"Mode Selection"` (Row 0) and `"Join the bar!"` (Row 1). |
| **AC4** | **Maximized Shell-Bounded Asset Sizing** | The Synthwave Navigator, **OBELISCO** and **CLASSICS** logos, `"Join the bar!"` control, and pointer graphic occupy maximum available space inside the Console Playfield Glass while remaining side-by-side (for logos) and fully inside the panel borders without clipping or scrollbars. |
| **AC5** | **Pointer Snap & Action Integrity** | The selection pointer accurately centers vertically on the enlarged mode logos and `"Join the bar!"` row upon focus/resize, and activating **OBELISCO**, **CLASSICS**, or `"Join the bar!"` transitions into the respective game mode or Join the Bar flow without `{errors}`. |

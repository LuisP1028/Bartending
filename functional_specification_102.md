# FS102 — Mode selection menu landscape containment and orientation parity

## Purpose

Establish required product functionality ensuring the mode selection menu interface achieves full orientation parity with the startup sequence across all window dimensions, aspect ratios, and device orientations.

Specifically, eliminate the visual breakdown occurring when the mode selection menu is viewed in landscape mode (window width > window height), ensuring that the console frame scales proportionally to fit within viewport boundaries on both axes, guaranteeing 100% visibility of the mode selection header, logos, menu options, and console controls.

The coding assistant is instructed to independently inspect the codebase, trace the styling and layout rules governing the mode selection menu, and identify all necessary edits to achieve these functional outcomes. This document specifies desired `{functionality}`, behavioral boundaries, and acceptance criteria only; it contains no diagnoses of code failure mechanics, component prescriptions, or implementation instructions.

**Prior:** [functional_specification_101.md](./functional_specification_101.md)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|------|---------|
| **Mode Selection Menu** | The interactive menu presentation displaying the mode selection dialogue ("MODE SELECTION"), brand mode logos (Obelisco, Classics), and navigation actions ("JOIN THE BAR!", "WARP DIAGNOSTICS", "TERMINATE UPLINK"). |
| **Landscape Mode** | Any viewport or window configuration where horizontal width exceeds vertical height ($W > H$). |
| **Orientation Parity** | Ensuring that the mode selection menu dynamically responds to window dimensions and orientations with the same containment geometry established for the startup sequence. |
| **Universal Containment** | Proportional scaling geometry where an entire console element is strictly bounded within the visible viewport on both axes, guaranteeing zero clipping or cut-off interface controls regardless of screen aspect ratio. |

---

## Specification: Observed `{errors}` vs. Desired `{functionality}`

### Observed `{errors}`
- While portrait viewports (window height > window width) correctly contain the console and display the full menu, viewing or resizing into **landscape mode** completely breaks the visual presentation.
- In landscape mode, the console over-expands horizontally to fill window width, causing the proportional height to blow up far beyond the available screen height.
- The top half of the console housing, top screen bezel, "BATTERY" status light, and critical upper menu content ("MODE SELECTION" header, Obelisco and Classics logos, "JOIN THE BAR!", and "WARP DIAGNOSTICS") are pushed off the top edge of the browser window and completely clipped from view.
- Only the bottom edge of the menu box ("TERMINATE UPLINK") and lower playfield water background remain visible, rendering the menu unusable in landscape orientation.

### Desired `{functionality}`
1. **Parity with Startup Sequence**: The mode selection menu must be configured to mirror the dynamic scaling and containment behavior of the startup sequence across all screen orientations and dimensions.
2. **Strict Landscape Containment**: When the viewport is in landscape mode ($W > H$):
   - The console must constrain its scale to the **height** of the viewport, ensuring that neither width nor height exceeds 100% of the visible window.
   - The entire console housing—including top casing, screen bezel, battery indicator, screen glass, D-pad, action buttons, and SELECT/START controls—must fit completely inside the window without any clipping.
3. **Complete Menu Visibility in Landscape**:
   - In landscape mode, the entire interactive menu overlay—the **"MODE SELECTION"** header, Obelisco and Classics mode logos, and all selection options (**"JOIN THE BAR!"**, **"WARP DIAGNOSTICS"**, and **"TERMINATE UPLINK"**)—must be fully visible and centered inside the screen glass.
   - No text, badge, button, or label may be pushed off the top, bottom, or side edges of the screen.
4. **Smooth Resizing Responsiveness**:
   - Dynamically resizing the browser window or rotating a device between portrait and landscape modes must smoothly scale the console, preserving universal containment and visual alignment at all times.

---

## Edge cases & behavioral boundaries

1. **Ultra-Wide Landscape Displays**: On 21:9 or 32:9 desktop monitors, the console must strictly constrain its height to the viewport height and center horizontally with clean letterboxing, preventing extreme horizontal stretching.
2. **Transition from Startup to Menu in Landscape**: When the boot intro sequence finishes while in landscape mode, the transition into the mode selection menu must maintain identical scale and screen alignment without sudden jumps, shifts, or cropping.
3. **Window Resizing During Navigation**: Actively resizing the window while navigating menu options with keyboard, D-pad, or pointer must preserve active option focus and layout integrity without repositioning the menu box.

---

## Acceptance criteria

| ID | Criteria | Desired Outcome |
|:---|:---|:---|
| **AC1** | **Landscape Viewport Containment** | In landscape viewports ($W > H$), the entire console housing and screen fit 100% within the visible window with zero clipping. |
| **AC2** | **Full Menu Visibility in Landscape** | The "MODE SELECTION" header, mode logos, and all menu actions ("JOIN THE BAR!", "WARP DIAGNOSTICS", "TERMINATE UPLINK") are completely visible and centered inside the screen glass in landscape mode. |
| **AC3** | **Console Housing Integrity** | The top casing, battery light, screen borders, D-pad, action buttons, and SELECT/START controls remain fully visible and proportional in landscape mode. |
| **AC4** | **Dynamic Resize Parity** | Resizing the browser window between portrait and landscape dynamically scales the menu console, maintaining containment parity with the startup sequence. |

---

## Instruction to Coding Assistant

The coding assistant is instructed to:
1. Independently inspect the layout and styling configurations governing the mode selection menu.
2. Identify all components, styles, and container rules requiring edits to ensure landscape mode behaves with containment parity to the startup sequence.
3. Formulate the required architectural plan and edit set without altering unrelated systems.

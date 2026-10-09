# FS100 — Core UX and stage stability: console containment, patron seating, and station view stability

## Purpose

Establish required product functionality across three core areas of the bartending game:
1. Universal containment and unclipped presentation of the Game Boy boot sequence across all viewport sizes and device types.
2. Complete patron animation lifecycles ensuring moving patrons deterministically transition into stationary seated states upon arriving at bar stools.
3. Complete stage layout stability ensuring equipment, station, and drawer interactions occur in-place without displacing or translating the background bar stage.

The coding assistant is instructed to analyze the existing codebase and independently identify all components, layout models, state machines, and styling rules requiring modification to satisfy these functional outcomes. This document specifies desired `{functionality}` and success criteria only; it contains no implementation instructions, component mandates, or architectural advice.

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|------|---------|
| **Boot Console** | The retro handheld console frame (housing, screen glass, d-pad, action buttons, branding, and status indicators) presenting the initial boot sequence. |
| **Universal Containment** | Sizing geometry where an element is strictly bounded within the active viewport on both axes, guaranteeing zero clipping or cut-off interface controls regardless of screen aspect ratio. |
| **Walk Cycle** | The animated state where a patron character steps through walking frames along an approach trajectory toward a destination bar stool. |
| **Seated State** | The stationary state where a patron character occupies a bar stool, displaying their seated asset and terminating all walking motion. |
| **Bar Stage** | The primary point-of-view canvas comprising the background establishment, bar top, stools, and stationary service hardware. |
| **Station Drawer / Carousel** | The interactive overlay displaying selectable inventory, glassware, tools, or bottles associated with a specific bar zone. |

---

## Desired `{functionality}`

### 1. Boot Console Presentation & Viewport Containment
- **Full Enclosure Visibility**: On every screen size, device category (mobile phones, tablets, laptops, desktop monitors), and viewport orientation (portrait and landscape), the complete boot console housing—including top casing, branding text, video playfield, D-pad, action buttons, and SELECT/START controls—must be completely visible within the viewport.
- **Proportional Scaling (`contain` behavior)**: The console presentation must scale down or up proportionally so that neither its width nor its height exceeds the viewport boundaries. No part of the casing or interactive surface may be cropped or pushed off-screen.
- **Centering & Alignment**: The console must remain centered in the viewable viewport without vertical or horizontal displacement clipping the housing.
- **Uncropped Media Playback**: The boot video playing within the console display must fit completely within the playfield glass so that all titles, logos, and animations remain fully legible and unclipped.
- **Interactive Integrity**: Skip interactions (tap/click triggers and START button activation) must remain accessible and functional across all screen configurations.

### 2. Patron Motion Lifecycle & Seating Transition
- **Complete Journey from Spawn to Stool**: When a patron spawns, they must navigate toward an assigned unoccupied bar stool.
- **Deterministic Walk Termination**: Upon arriving at the assigned stool coordinates, the character's walking movement must definitively end. Characters must not remain indefinitely in place looping a walk cycle.
- **Clean Seated Pose Transition**: The character must transition immediately and definitively from their walking state into their stationary seated state, presenting their seated visual asset at the counter.
- **Persistent Seated State**: Once seated, the patron must remain seated at the counter throughout their visit without spontaneously reverting into a walking animation.

### 3. Stage Layout Stability During Equipment & Drawer Interactions
- **Stationary Canvas**: Clicking on bar stations, glassware storage, bottle wells, or category hotspots must never translate, jolt, pan, or displace the underlying bar stage.
- **Anchored Stage & HUD**: The bar background, stools, seated patrons, and on-screen HUD status indicators (`VALIDATION PASSED!`, active order details, receipt tray) must remain stable and stationary when drawers, carousels, or equipment overlays are opened, browsed, or closed.
- **In-Place Drawer Presentation**: Selection carousels, item magnification drawers, and equipment inspection overlays must present in-place or centered over the active workstation without shifting the surrounding stage environment.

---

## Edge cases & behavioral boundaries

1. **Extreme Viewport Aspect Ratios**: Extremely narrow mobile viewports (e.g. 9:20) and ultra-wide desktop monitors must both preserve 100% visibility of the boot console without cropping any edge controls.
2. **Concurrent Patron Arrivals**: If multiple patrons enter or approach seats concurrently, each patron's motion lifecycle must independently and deterministically resolve to a seated pose without clock collisions or stalled walk states.
3. **Rapid Drawer Toggling**: Repeatedly opening, switching between, and closing equipment drawers must leave the bar stage strictly at its baseline origin without cumulative coordinate drift.

---

## Acceptance criteria

| ID | Criteria | Desired Outcome |
|:---|:---|:---|
| **AC1** | **Console Viewport Containment** | On mobile portrait, mobile landscape, tablet, and desktop viewports, the entire boot console housing and controls are 100% visible with zero clipping. |
| **AC2** | **Boot Video Legibility** | The boot intro video plays inside the housing screen without title or border clipping. |
| **AC3** | **Walk-to-Sit Transition** | Approaching patrons cease walking upon reaching their stool and switch to their stationary seated pose; zero patrons remain trapped in a walk cycle. |
| **AC4** | **Patron Seating Stability** | Seated patrons maintain their seated posture continuously at the bar counter. |
| **AC5** | **Zero Stage Translation on Interaction** | Opening glassware, bottles, or tool drawers results in zero displacement (`0px` translation) of the underlying bar stage. |
| **AC6** | **HUD & Receipt Alignment** | HUD status elements and receipts retain their fixed alignment and positions when equipment drawers are toggled. |

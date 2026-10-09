# FS107 — Patron visual scale, spawn origin, and bar stool seating standardization

## Purpose

Establish required product `{functionality}` ensuring that all barroom patrons—encompassing hardcoded stock characters (Elder, Caesar, Trump) and dynamically registered custom patrons arriving via the in-game generative pipeline—maintain standardized physical dimensions, originate from an identical entrance spawn point, and sit at uniform bar counter heights with consistent eye-line and shoulder-line alignment.

This eliminates the defect state where newly generated patrons render as sunken, miniature figures barely peeking over the countertop, or where patrons exhibit disparate physical volumes, start at mismatched stage locations, and clip unnaturally against the bar surface.

**Prior:**
- [functional_specification_83.md](./functional_specification_83.md) (Multi-patron stage seating & auto-fill)
- [functional_specification_85.md](./functional_specification_85.md) (Concurrent walk motion driver)
- [functional_specification_97.md](./functional_specification_97.md) (Stock patron visual parity & fallback anchors)
- [functional_specification_104.md](./functional_specification_104.md) (Patron arrival seating persistence)
- [functional_specification_105.md](./functional_specification_105.md) (Autonomous in-game patron generation)
- [functional_specification_106.md](./functional_specification_106.md) (Cloud asset storage & relational persistence)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|:---|:---|
| **Standardized Visual Scale** | The invariant that all character sprites render with uniform apparent physical height, head proportions, and volumetric presence on stage, whether in motion or seated. |
| **Standardized Spawn Origin** | The single, authoritative starting point in stage coordinate space from which all walking patrons originate upon entering the barroom scene. |
| **Standardized Seated Anchor** | The fixed spatial anchor and vertical seating offset defined for each bar stool (`bar_seat_1` through `bar_seat_4`) that positions character busts at a uniform, natural height relative to the bar counter. |
| **Counterline Alignment** | The consistent vertical posture where a seated patron's chin, shoulders, and chest clear the top of the bar counter naturally, allowing full facial expression and bust visibility across all seats. |
| **Sunken Patron Defect (Peeking Defect)** | The defect state where a seated patron is rendered too low or too small relative to the bar counter, causing the bar graphic cutout to clip their body and leaving only the forehead or eyes visible above the counter. |
| **Aspect Ratio Discrepancy** | The mismatch between varying source image canvas dimensions (e.g., 2:3 portrait vs. 1:1 square vs. 16:9 landscape) that causes dimensional distortion or unequal vertical heights under single-axis constraints. |
| **Walk-to-Sit Transition Invariant** | The requirement that transitioning from walking motion to the seated state preserves character visual continuity without sudden shifts in apparent scale, jarring teleportation, or vertical snaps. |

---

## Current Functionality & Observed `{errors}`

### Current Scene Behavior & Defect Manifestation
1. **The Sunken Patron Defect**:
   - When a newly generated patron (created through the in-game selfie registration flow) is selected by the barroom simulation and assigned to an open bar stool, only the patron's eyes and top of the head are visible above the countertop.
   - The torso, chin, and facial features are occluded behind the bar countertop graphic, creating an unnatural "peeking head" appearance that disrupts the visual cohesion of the scene.
2. **Visual Scale Disparity Across Cast Members**:
   - Stock patrons (Elder, Caesar, Trump) and newly generated patrons exhibit severe scale disparities.
   - While Elder and Caesar occupy full, prominent bust volumes behind the counter, custom joiner patrons appear drastically smaller, resembling miniature characters sitting on oversized furniture.
3. **Canvas Dimension Incompatibilities**:
   - Existing character assets utilize conflicting canvas aspect ratios:
     - Elder assets are delivered in a tall portrait format (832×1248, 2:3 ratio).
     - Caesar and Trump assets are roughly square (1024×1024 / 1056×976, ~1:1 ratio).
     - Pipeline-generated patron assets are produced in a widescreen landscape format (1280×720, 16:9 ratio).
   - Because current display scaling applies a single percentage width without accounting for varying aspect ratios or vertical centering, landscape assets suffer severe vertical height compression.
4. **Bottom-Anchored Vertical Compression**:
   - Positioning logic anchors the bottom edge of the sprite image bounding box to the stool anchor point.
   - For a short or landscape sprite, anchoring the bottom of the canvas places the character's head significantly lower in stage space than for a tall portrait sprite. When combined with the bar cutout mask, the bottom-anchored short sprite is clipped almost entirely out of view.
5. **Inconsistent Entrance & Approach Paths**:
   - Lack of unified, strict spawn invariants permits discrepancies in how different patrons enter the stage, walk along the floor plane, and navigate to their assigned stools.

---

## Desired `{functionality}`

### 1. Standardized Patron Sizing (Walking & Seated)
- **Uniform Apparent Scale Across All Patrons**:
  - Every patron—regardless of whether they are a built-in stock character or a dynamically registered user character—must render at an identical visual scale.
  - Head sizes, shoulder widths, and overall silhouette volumes must be normalized so that all guests appear to belong to the same world scale and artistic perspective.
- **Walking Sprite Standardization**:
  - During the walking phase, all characters must exhibit uniform full-body height and floor-contact proportions while moving along the barroom floor.
- **Seated Bust Standardization**:
  - During the seated phase, all character busts must occupy a standardized visual volume behind the bar counter.
  - Seated sprites must not appear miniature, oversized, or squashed.

### 2. Standardized Entrance Spawn Origin
- **Single Authoritative Spawn Point**:
  - All patrons entering the scene must originate from the exact same entrance spawn coordinate `(spawn.x, spawn.y)` in stage space.
- **Standardized Walking Baseline**:
  - Patrons must advance along a consistent, level horizontal floor baseline across the room to their target stools without vertical bobbing, elevation drift, or per-character starting offsets.
- **Directional Flip Parity**:
  - Horizontal flipping (`scaleX(-1)`) must preserve the exact anchor base and visual center of the character, avoiding any horizontal position jumps when changing orientation.

### 3. Standardized Bar Stool Seating & Counterline Alignment
- **Uniform Counterline Clearance**:
  - Every seated patron in any bar stool (`bar_seat_1`, `bar_seat_2`, `bar_seat_3`, `bar_seat_4`) must rest naturally behind the bar counter with standardized vertical alignment.
  - The patron's upper chest, shoulders, chin, and entire face must remain clearly visible above the bar counter edge across all four stools.
  - Zero patrons may suffer from the sunken "peeking" defect where only the upper forehead or eyes are visible.
  - Zero patrons may appear to float unnaturally high above the bar stool or hover in mid-air.
- **Uniform Seated Anchors Across Stools**:
  - All four bar stools must have standardized anchor locations and seating offsets that guarantee equivalent depth and vertical positioning across the entire counter length.
- **Consistent Bar Occlusion Masking**:
  - The bar counter foreground mask must cleanly occlude only the lower torso and stool structure, producing a convincing and uniform illusion of guests sitting on stools behind the bar counter.

### 4. Aspect Ratio & Canvas Dimension Normalization
- **Aspect-Ratio-Independent Presentation**:
  - Character rendering must be robust against variations in sprite image aspect ratios (including 2:3 portrait, 1:1 square, and 16:9 widescreen).
  - Variations in image resolution or canvas aspect ratio must not dictate the physical on-screen size or vertical eye-line of the character.
- **Head/Eye-Line Vertical Normalization**:
  - Seated character positioning must reference an authoritative seated height or eye-level baseline, ensuring that characters with wider or shorter canvas boundaries align consistently with characters with taller canvases.

### 5. Seamless Motion-to-Sit Continuity
- When a patron reaches their assigned bar stool and completes their walking path:
  - The transition from the final walking frame to the seated bust sprite must be instantaneous, smooth, and visually stable.
  - The character must not visibly pop, jerk, change horizontal position, or shift dramatically in scale at the moment of seating.

---

## Edge Cases & Behavioral Boundaries

1. **Mixed Aspect Ratios in Roster**:
   - The active roster will simultaneously contain legacy portrait assets (Elder), square assets (Caesar/Trump), and newly generated landscape assets. Standardization must function uniformly across all three formats without requiring re-generation of existing stock assets.
2. **Extreme Character Aspect Ratios or Padding**:
   - If a custom sprite has substantial transparent margins around the character silhouette, the rendering system must still ensure the visible character figure aligns with the standard counterline height rather than letting transparent padding push the character downwards.
3. **Viewport & Responsive Stage Scaling**:
   - On varying display resolutions and mobile screen sizes, all standardized proportions (spawn location, walk size, sit size, and counterline alignment) must scale proportionally with the stage viewBox (1184×880) without distortion or relative shift between background hotspots, bar counter clipping masks, and patron sprites.
4. **Rapid Auto-Fill Spawning**:
   - When multiple bar stools are empty and auto-fill spawns patrons in sequence, each character must independently respect the standardized spawn origin and seating alignment rules without interfering with adjacent seated patrons.
5. **Seat Switching / Eviction Continuity**:
   - If a seated patron is later replaced, despawned, or made to leave, the subsequent occupant of that seat must adhere to the exact same standardized seating posture.

---

## Acceptance Criteria & Success Verification

| ID | Criterion | Measurable Verification |
|:---|:---|:---|
| **AC1** | **Uniform Seated Scale** | All seated patrons (stock Elder, Caesar, Trump, and newly generated pipeline patrons) exhibit matching head and bust visual volumes (within $\pm 5\%$ relative scale variance). |
| **AC2** | **Counterline Visibility (No Peeking Defect)** | Seated patrons in all four bar stools display their full face (eyes, nose, mouth), chin, and upper shoulders clearly above the bar counter edge. Zero instances of "peeking eyes" or sunken heads. |
| **AC3** | **Standardized Spawn Origin** | 100% of spawned walking patrons begin their entrance path at the exact same screen coordinates `(spawn.x, spawn.y)`. |
| **AC4** | **Aspect Ratio Robustness** | Landscape sprites (16:9), square sprites (1:1), and portrait sprites (2:3) all render at the same apparent character height when seated at any bar stool. |
| **AC5** | **Smooth Seating Transition** | At the instant of arrival at the stool, the character transitions from walking to seated without perceptible scale snapping or vertical coordinate jumps. |
| **AC6** | **Responsive Mask Invariance** | On both desktop and mobile viewports, the bar counter cutout mask cleanly covers the lower torso while preserving 100% full-face and shoulder visibility. |

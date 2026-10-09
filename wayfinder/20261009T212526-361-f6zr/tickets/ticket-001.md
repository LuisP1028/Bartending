---
ticket_id: "001"
title: "Standardized Visual Scale & Aspect-Ratio Normalization Architecture"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_107.md"
---

# Ticket 001: Standardized Visual Scale & Aspect-Ratio Normalization Architecture

## Question
How does the patron rendering engine (`src/components/PatronLayer.tsx`, `src/components/PatronPlacementEditor.tsx`, and `src/app/globals.css`) normalize character visual scale across disparate canvas aspect ratios (2:3 portrait, 1:1 square, 16:9 widescreen) and transparent margin paddings so that all patrons exhibit uniform head/shoulder silhouette volume and physical height without distortion?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_107.md`
  - §Desired Functionality (1): "Every patron—regardless of whether they are a built-in stock character or a dynamically registered user character—must render at an identical visual scale. Head sizes, shoulder widths, and overall silhouette volumes must be normalized so that all guests appear to belong to the same world scale and artistic perspective."
  - §Desired Functionality (1): "During the walking phase, all characters must exhibit uniform full-body height and floor-contact proportions while moving along the barroom floor. During the seated phase, all character busts must occupy a standardized visual volume behind the bar counter. Seated sprites must not appear miniature, oversized, or squashed."
  - §Desired Functionality (4): "Character rendering must be robust against variations in sprite image aspect ratios (including 2:3 portrait, 1:1 square, and 16:9 widescreen). Variations in image resolution or canvas aspect ratio must not dictate the physical on-screen size or vertical eye-line of the character."
  - §Acceptance Criteria (AC1): "All seated patrons (stock Elder, Caesar, Trump, and newly generated pipeline patrons) exhibit matching head and bust visual volumes (within $\pm 5\%$ relative scale variance)."
  - §Acceptance Criteria (AC4): "Landscape sprites (16:9), square sprites (1:1), and portrait sprites (2:3) all render at the same apparent character height when seated at any bar stool."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Width-Only CSS Sizing Under Divergent Canvas Aspect Ratios
In `src/components/PatronLayer.tsx` (L532–L556), sprite sizing applies an inline width style based purely on stage percentage width:
```tsx
const widthPct = isSeated
  ? inst.layout.sitDisplayWidthPct
  : inst.layout.walkDisplayWidthPct;

return (
  <img
    className={`pov-patron-sprite${
      isSeated ? ' pov-patron-sprite--sit' : ' pov-patron-sprite--walk'
    }`}
    src={src}
    alt=""
    draggable={false}
    style={{
      left: `${pct.leftPct}%`,
      top: `${pct.topPct}%`,
      width: `${widthPct}%`,
      transform: `translate(-50%, -100%)${
        inst.flipX ? ' scaleX(-1)' : ''
      }`,
    }}
  />
);
```
In `src/app/globals.css` (L789–L807):
```css
.pov-patron-sprite {
    position: absolute;
    height: auto;
    object-fit: contain;
    object-position: bottom center;
    image-rendering: pixelated;
    background: transparent;
    pointer-events: none;
    filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.45));
}
.pov-patron-sprite--walk { max-height: 85%; }
.pov-patron-sprite--sit { max-height: 55%; }
```
When stage width is 1184px and `sitDisplayWidthPct = 35%`, rendered width is $0.35 \times 1184 = 414.4\text{px}$.
- **Elder (2:3 Portrait, 832×1248):** Aspect ratio is $H/W = 1.5$. Computed height is $414.4 \times 1.5 = 621.6\text{px}$, which is clamped by `max-height: 55%` ($0.55 \times 880 = 484\text{px}$). Rendered box is $322.6\text{px} \times 484\text{px}$.
- **Caesar (1:1 Square, 1024×1024):** Aspect ratio is $H/W = 1.0$. Computed height is $414.4 \times 1.0 = 414.4\text{px}$ (under 484px). Rendered box is $414.4\text{px} \times 414.4\text{px}$.
- **Cool Guy / Custom Joiners (16:9 Landscape, 1280×720):** Aspect ratio is $H/W = 0.5625$. Computed height is $414.4 \times 0.5625 = 233.1\text{px}$ ($26.5\%$ of stage height). Rendered box is $414.4\text{px} \times 233.1\text{px}$.
A 16:9 sprite renders at less than half the vertical height of a 2:3 sprite ($233.1\text{px}$ vs. $484\text{px}$).

### 2. Silhouette Padding Discrepancy
Measured via alpha channel bounding box analysis:
- Elder sit canvas: 832×1248; figure height: 1057px ($84.7\%$ of canvas). Top padding: 113px, bottom padding: 78px.
- Caesar sit canvas: 1024×1024; figure height: 899px ($87.8\%$ of canvas). Top padding: 102px, bottom padding: 23px.
- Cool Guy sit canvas: 1280×720; figure height: 600px ($83.3\%$ of canvas height), figure width: 800px ($62.5\%$ of canvas width). Horizontal padding: 240px transparent margin on left and right.
In walking full-body sprites:
- Cool Guy walk canvas: 1280×720; figure width: 340px ($26.5\%$ of canvas width, 470px left/right transparent margins); figure height: 612px ($85\%$ of canvas height).
Applying `width: 57%` to the 1280px canvas stretches the transparent margins, causing the actual character figure to be only $322\text{px}$ tall on stage, compared to Elder whose walking figure is $509\text{px}$ tall (a 37% scale deficit).

## Architectural Decision & Solution Design

### 1. Height-Authoritative Dimensioning for Seated and Walking Sprites
Instead of sizing sprites exclusively by stage percentage width, character sprites must be governed by a **standardized target visual height percentage** (`sitDisplayHeightPct` and `walkDisplayHeightPct`), with width derived from native aspect ratio:
- **Standardized Seated Height (`TARGET_SIT_HEIGHT_PCT`):** Fixed at **$48\%$** of stage viewBox height ($0.48 \times 880 = 422.4\text{px}$).
- **Standardized Walking Height (`TARGET_WALK_HEIGHT_PCT`):** Fixed at **$62\%$** of stage viewBox height ($0.62 \times 880 = 545.6\text{px}$).

### 2. Aspect-Ratio Compensation Formula
To preserve backward compatibility with existing layout override storage while normalizing varied aspect ratios, compute the effective display width and height as follows:
Given an asset's natural aspect ratio $R = \text{width} / \text{height}$:
- For a canonical 1:1 asset: $R = 1.0$.
- For Elder (2:3 portrait): $R \approx 0.667$.
- For widescreen 16:9: $R \approx 1.778$.
The target visual height is held constant:
$$\text{heightPx} = \text{stageHeight} \times \left(\frac{\text{targetHeightPct}}{100}\right)$$
$$\text{widthPx} = \text{heightPx} \times R$$
$$\text{widthPct} = \left(\frac{\text{widthPx}}{\text{stageWidth}}\right) \times 100$$

When expressed in CSS percentage units:
$$\text{widthPct} = \text{targetHeightPct} \times \left(\frac{\text{stageHeight}}{\text{stageWidth}}\right) \times R = \text{targetHeightPct} \times \left(\frac{880}{1184}\right) \times R$$

### 3. Aspect Ratio Resolution at Runtime
1. In `src/data/characters.ts`: Extend `PatronDef` and `CharacterDefInput` to carry optional `aspectRatio?: number` (or `width: number; height: number;`).
   - For `patron_elder`: `aspectRatio: 832 / 1248 = 0.6667`
   - For `caesar_9aea2cd1a4bf32d6`: `aspectRatio: 1024 / 1024 = 1.0`
   - For `trump_ca36306f5c662816`: `aspectRatio: 1056 / 976 = 1.082`
   - For runtime joiners: `aspectRatio: 1280 / 720 = 1.7778` (or dynamic resolution via `HTMLImageElement.naturalWidth / naturalHeight`).
2. In `src/components/PatronLayer.tsx`:
   - Compute `effectiveWidthPct` and `effectiveHeightPct` dynamically using the character's aspect ratio.
   - For seated sprites: apply `height: ${effectiveHeightPct}%`, `width: auto`, or computed `widthPct` matching the target height $48\%$.
   - For walking sprites: apply `height: ${effectiveHeightPct}%`, `width: auto`, or computed `widthPct` matching the target height $62\%$.
   - In `src/app/globals.css`:
     - Update `.pov-patron-sprite--sit`: `height: auto; max-height: none;`
     - Update `.pov-patron-sprite--walk`: `height: auto; max-height: none;`

### 4. Transparent Margin Normalization (Figure Centering)
For custom 16:9 sprites with wide horizontal padding (e.g. 1280×720 canvas with 340px walking figure or 800px sitting figure):
- Because the figure is centered in the canvas ($470\text{px}$ padding on left and right), horizontal centering via `transform: translate(-50%, -100%)` remains visually centered on the stool anchor.
- Scaling by height ensures the figure's vertical height is $85\%$ of the $48\%$ stage height, exactly matching Caesar and Elder's seated bust height.

## Precise Contract & Transformation Specifications

### 1. `src/data/patronLayout.ts` Constants
```typescript
export const STANDARDIZED_PATRON_SCALE = {
  /** Target full-body walking height as % of stage height (880px) -> 545.6px */
  walkTargetHeightPct: 62,
  /** Target seated bust height as % of stage height (880px) -> 422.4px */
  sitTargetHeightPct: 48,
  /** Canonical aspect ratios for stock cast */
  stockAspectRatios: {
    patron_elder: 832 / 1248,
    caesar_9aea2cd1a4bf32d6: 1.0,
    trump_ca36306f5c662816: 1056 / 976,
    default_runtime: 1280 / 720,
  } as Record<string, number>,
};

/** Compute stage width percentage for a patron sprite given target height % and aspect ratio (W/H) */
export function computeNormalizedWidthPct(
  targetHeightPct: number,
  aspectRatio: number,
  viewW = 1184,
  viewH = 880
): number {
  const heightPx = (targetHeightPct / 100) * viewH;
  const widthPx = heightPx * aspectRatio;
  return (widthPx / viewW) * 100;
}
```

### 2. `src/components/PatronLayer.tsx` Sprite Dimensioning
In the render loop for each instance:
```tsx
const isSeated = inst.phase === 'seated';
const targetHeightPct = isSeated
  ? STANDARDIZED_PATRON_SCALE.sitTargetHeightPct
  : STANDARDIZED_PATRON_SCALE.walkTargetHeightPct;

const ar = inst.def.aspectRatio ??
  STANDARDIZED_PATRON_SCALE.stockAspectRatios[inst.characterId] ??
  (isSeated ? 1.0 : 0.667);

const widthPct = computeNormalizedWidthPct(targetHeightPct, ar);

return (
  <img
    key={inst.instanceKey}
    className={`pov-patron-sprite${
      isSeated ? ' pov-patron-sprite--sit' : ' pov-patron-sprite--walk'
    }`}
    src={src}
    alt=""
    draggable={false}
    data-character-id={inst.characterId}
    data-seat-id={inst.seatId}
    data-phase={inst.phase}
    style={{
      left: `${pct.leftPct}%`,
      top: `${pct.topPct}%`,
      width: `${widthPct}%`,
      transform: `translate(-50%, -100%)${
        inst.flipX ? ' scaleX(-1)' : ''
      }`,
    }}
  />
);
```

## Invariant & Verification Criteria
- **`INV-SCALE-01`**: Across all characters (Elder, Caesar, Trump, and runtime joiners), rendered bust height on stage must fall within $422\text{px} \pm 20\text{px}$ ($\pm 5\%$).
- **`INV-ASPECT-01`**: 16:9, 1:1, and 2:3 sprites seated at any stool must exhibit uniform vertical height and head silhouette size.

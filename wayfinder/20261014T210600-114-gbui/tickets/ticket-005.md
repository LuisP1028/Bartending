---
ticket_id: "005"
title: "Carousel Bottle Sizing, Inline Label Removal & Retro RPG Dialogue-Themed Item Name Popup on Scroll"
type: task
status: resolved
claimed_by: "wayfinder"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_114.md"
---

# Ticket 005: Carousel Bottle Sizing, Inline Label Removal & Retro RPG Dialogue-Themed Item Name Popup on Scroll

## Question
How do local stage carousels size bottles and bar items to fill the carousel height cleanly without inline label squashing, and display a synchronized, Retro RPG Dialogue-themed item name popup (`#09133b` navy, white/black pixel border, pixel font) that updates in real time as the user scrolls or presses the Game Boy D-Pad?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_114.md`
  - §4.5 (Proper Bottle Proportions in Category Carousels):
    - "When a bar category hotspot (`liquors`, `syrups`, `juices`, `speedrail`, etc.) is opened on the Game Boy screen, the bottles inside the carousel must render at a clean, well-proportioned scale that fills the carousel height comfortably without being squashed by inline multi-line text labels or clipped at the top/bottom edges."
    - "Inline cramped text labels underneath individual carousel items inside the local stage carousel are replaced by the dedicated dialogue-themed popup described below."
  - §4.5 (Dialogue-Themed Item Name Popup on Carousel Scroll):
    - "Whenever a local category carousel is open on the stage, a compact **item name popup** is displayed for the currently centered/focused item in the carousel."
    - **Visual Theme Parity**: Deep navy background (`#09133b`), crisp white inner border with black outer outline and pixel corner styling, high-contrast pixel typography (`Press Start 2P` / retro monospace) in gold (`#f7ca18`) or crisp white (`#ffffff`) with pixel drop-shadow.
    - **Dynamic Scroll Synchronization**: Updates immediately in real time as the user scrolls via pointer/touch or steps through items using the Game Boy `D-Pad` (`Left` / `Right` / `Up` / `Down`).
    - **Unobstructed Placement**: Anchored cleanly near the active carousel so that it never obscures the focused bottle silhouette and never overflows the Game Boy screen bezel.
  - §6 `AC-07`.

## Codebase Audit & Root Cause Analysis

1. **Bottle Shelf Frame Squashing in `src/data/hotspotGeometry.ts`**:
   - `boundsToFrameStyle` treated any hotspot with `aspect >= 1.6` as a flat `isWideShort` tray (`WIDE_FRAME_MAX_HEIGHT_PCT = 22%`). Because `speedrail` has aspect `3.01`, the primary liquor shelf was vertically squashed to `22%` height instead of a tall bottle-carousel height (`30%–38%`).
   - Additionally, `boundsToFrameStyle` clamped `leftPct` to `[0, 100]` of `.pov-stage` rather than the visible Game Boy screen glass inset, allowing edge hotspots (`fridge`, `garnishes`) to clip at the bezel edge.
2. **Inline `.asset-under-label` Compressing Overlay Silhouettes**:
   - `BottleAsset.tsx`, `GlassAsset.tsx`, `GarnishAsset.tsx`, `RimmingAsset.tsx`, and `HardwareAsset.tsx` rendered `.asset-under-label` in `presentation === 'overlay'` and capped `.asset-art-root` height (`78%` on bottles, `calc(100% - 28px)` on hardware, `70%` on garnishes), shrinking bottle silhouettes inside the Game Boy screen.
3. **No Focused-Item Label Synchronization or Dialogue-Themed Popup**:
   - `MagnificationCarousel.tsx` highlighted the centered item with `.is-focused` but did not extract or emit the focused item's `label` or render a retro RPG dialogue-themed item name popup.

## Architectural Decisions Locked

1. **Un-squash Bottle Carousel Frames & Respect Visible Glass Bounds (`src/data/hotspotGeometry.ts`)**:
   - Restrict `isWideShort` tray height clamping exclusively to `zoneId === 'rims'`.
   - Give bottle/glassware zones (`speedrail`, `syrups`, `juices`, `fridge`) a minimum stage height of `30%` (up to `38%`) so `64:96` bottle silhouettes have ample vertical room.
   - Clamp `leftPct` and `topPct` within the visible `.pov-shell-section` glass bounds when `stageEl` is inside the Game Boy screen so no carousel frame or popup ever overflows the bezel.
2. **Eliminate Inline Overlay Labels & Maximize Bottle Silhouettes (`src/components/BottleAsset.tsx`, `GlassAsset.tsx`, `GarnishAsset.tsx`, `RimmingAsset.tsx`, `HardwareAsset.tsx`, `MagnificationCarousel.tsx`, `src/app/globals.css`)**:
   - Do not render `.asset-under-label` when `presentation === 'overlay'` (and enforce `.carousel-container--local .asset-under-label { display: none !important; }`).
   - Expand `.asset-art-root` in `BottleAsset.tsx` (`presentation === 'overlay'`) to `height: '94%', maxHeight: '94%', width: 'auto', maxWidth: '94%', aspectRatio: '64 / 96'`, and update `syncLayoutMetrics` in `MagnificationCarousel.tsx` (`layout === 'local'`) so each cell uses `94%` of container height (`cellH = Math.max(28, Math.round(ch * 0.94))`, `cellW = Math.min(Math.max(28, Math.round(cw * 0.85)), Math.max(36, Math.round(cellH * 0.78)))`).
3. **Real-Time Focused Item Name Tracking & Retro RPG Dialogue-Themed Popup (`src/components/MagnificationCarousel.tsx`, `src/components/CategoryOverlay.tsx`, `src/app/globals.css`)**:
   - In `MagnificationCarousel.tsx`, attach `data-item-label` from each child element's `label` prop onto `.carousel-item-wrapper`, track the centered wrapper's label on mount, scroll, click-to-center, resize, and imperative `step` / `goFirst` / `goLast`, and notify `onFocusLabelChange?: (label: string) => void` (and expose focused label state).
   - In `CategoryOverlay.tsx`, render the Retro RPG Dialogue-themed popup (`.carousel-dialogue-popup`, `data-testid="carousel-item-popup"`) anchored immediately above `.hotspot-carousel-frame` (never overlapping `.hotspot-carousel-frame` and clamped strictly within the visible Game Boy screen bounds) with:
     - Deep navy interior (`#09133b`), crisp white border (`2px solid #ffffff`), black outer outline (`1.5px solid #000000`), dual inset border shadow, and four pixel-art corner accents matching `RetroRpgDialogueBox`.
     - Gold pixel typography (`#f7ca18`, `Press Start 2P` / monospace, pixel drop-shadow) displaying the focused item's exact `label`.

## Acceptance & Verification Oracles
- Opening any bottle/category carousel (`speedrail`, `syrups`, `juices`, `fridge`, `garnishes`, `rims`, `hardware`, `ice`) renders tall, unclipped item silhouettes with zero inline `.asset-under-label` elements visible.
- `.carousel-dialogue-popup` (`[data-testid="carousel-item-popup"]`) renders with `#09133b` (`rgb(9, 19, 59)`) background, white border, and pixel font, displaying the centered item's exact `label`, never overlapping the focused bottle silhouette, and 100% contained within `.gb-shell__playfield`.
- Scrolling the carousel or pressing the Game Boy D-Pad (`Right`, `Left`, `Down`, `Up`) immediately updates the popup text to match the newly focused item's `label` (`AC-07`).

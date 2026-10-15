# Required Edits — Functional Specification 117 (`functional_specification_117.md`)

## Edit 1: Receipt Metadata Removal (`AC-01`, `INV-RECEIPT-NO-META-01`)
- **`src/components/receipt/ReceiptPaper.tsx`**:
  - Remove unused `dateStr` and `timeStr` local formatting variables.
  - In the full receipt header (`showFull` branch), remove `<div className="r-line r-meta" data-testid="receipt-meta-chk">` (`CHK: {entity.orderId}` and `{dateStr}`) and `<div className="r-line r-meta" data-testid="receipt-meta-srv">` (`SRV: V_BARTENDER` and `{timeStr}`).
  - In the summary receipt header (`!showFull` branch), remove `<div className="r-line r-meta" data-testid="receipt-meta-chk">` (`CHK: {entity.orderId}` and `{timeStr}`).
- **`src/lib/receipt/mapTicketToReceipt.ts`**:
  - Update `buildSeed(orderId, ticket)` so that `"ORD-"` is stripped from `orderId` before constructing the barcode seed string (`${nameFrag}-${numFrag}-${frag}`), ensuring `"ORD-"` never appears in `.r-seed` on the full receipt.

## Edit 2: Dialogue-Themed, Screen-Contained Mat Drink Pop-Up (`AC-02`, `AC-03`, `INV-MAT-POPUP-DIALOGUE-01`)
- **`src/app/page.tsx`**:
  - Move `<DrinkBuildCard>` inside `<PovStageShell>` (alongside `<JiggerPourControl>` and `<RetroRpgDialogueBox>`) so it renders within `.pov-stage` and inherits `--shell-glass-inset-x`, `--shell-glass-inset-y`, `--shell-glass-w`, and `--shell-glass-h`.
- **`src/components/DrinkBuildCard.tsx` & `src/app/globals.css`**:
  - Replace `LiquidGlassCard` with the Retro RPG Dialogue Box theme (`#09133b` background, dual `#ffffff`/`#000000` pixel borders, 4 SVG pixel corner loops matching `RetroRpgDialogueBox`, `'Press Start 2P'` pixel font).
  - Render the drink title in gold (`#f7ca18`), pour count badge (`N POUR` / `N POURS`), poured ingredient lines (`{label} = {oz.toFixed(2)}OZ` or `"NO POURS YET"`), close button (`×`), and dialogue-styled `"TRASH?"` action button.
  - Anchor the pop-up inside `.pov-stage` and dynamically clamp its bounding box inside `.pov-shell-section` via `useLayoutEffect`/`ResizeObserver` so it never spills outside the visible Game Boy screen on any viewport.

## Edit 3: On-Screen Containment for Asset Descriptive Boxes (`AC-04`, `INV-ASSET-BOX-ONSCREEN-01`)
- **`src/components/CategoryOverlay.tsx` & `src/app/globals.css`**:
  - Add a `popupRef` and deterministic `useLayoutEffect` + `ResizeObserver` boundary clamping in `CategoryOverlay.tsx` that measures `[data-testid="carousel-dialogue-popup"]` against the visible Game Boy screen container (`.pov-shell-section` / `.gb-shell__playfield`, falling back to `.pov-stage`) whenever `activeLabel`, `frameStyle`, or viewport dimensions change.
  - Apply horizontal (`dx`) and vertical (`dy`) pixel corrections so `popupRect` stays strictly inside `screenRect` with at least `5px` safety inset on all four sides across all 10 stations (`rims`, `juices`, `double_strainer`, `hawthorne`, `boston_shaker`, `garnishes`, `fridge`, `syrups`, `speedrail`, `ice`) and every item within each station.
  - Also clamp `.hotspot-carousel-frame` and `.hotspot-carousel-local-dim` horizontally to the visible Game Boy glass (`--shell-glass-inset-x` and `--shell-glass-w`) so edge carousels (`garnishes`, `fridge`) never overhang the bezel.

## Edit 4: Background Ice Outline Alignment (`AC-05`, `INV-ICE-ALIGN-01`)
- **`src/data/povHotspots.ts`**:
  - Translate the `zoneId: "ice"` hotspot SVG path `d` by `(+56, +84)` in the `1184×880` viewBox coordinate space so its bounding box (`x: 518.56..777.06, y: 604.51..670.51`) aligns 1:1 with the ice cubes in the counter ice well on `/OBELISCO_POV.jpg`.

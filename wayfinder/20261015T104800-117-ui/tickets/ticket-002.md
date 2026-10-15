---
id: ticket-002
title: Dialogue-Themed Screen-Contained Mat Drink Pop-Up (DrinkBuildCard)
status: completed
depends_on: []
acceptance_criteria:
  - AC-02
  - AC-03
---

# Ticket 002: Dialogue-Themed Screen-Contained Mat Drink Pop-Up (DrinkBuildCard)

## Scope
Replace the transparent `LiquidGlassCard` mat drink pop-up (`DrinkBuildCard`) with a self-contained Retro RPG Dialogue Box theme (`#09133b` navy background, dual white/black pixel borders, 4 SVG corner loops, pixel typography in gold `#f7ca18` and white `#ffffff`), showing the drink title, pour count (`N POUR` / `N POURS`), poured ingredient lines (or `"NO POURS YET"`), close control (`×`), and `"TRASH?"` action. Mount inside `PovStageShell` and clamp dynamically so the pop-up stays 100% inside the visible Game Boy screen across all viewport sizes (`INV-MAT-POPUP-DIALOGUE-01`).

## Files Modified
- `src/components/DrinkBuildCard.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`

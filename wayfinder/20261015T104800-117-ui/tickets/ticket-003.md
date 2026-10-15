---
id: ticket-003
title: On-Screen Containment for Asset Descriptive Boxes (CategoryOverlay)
status: completed
depends_on: []
acceptance_criteria:
  - AC-04
---

# Ticket 003: On-Screen Containment for Asset Descriptive Boxes (CategoryOverlay)

## Scope
Refine the positioning and clamping of `[data-testid="carousel-dialogue-popup"]` (and edge carousel frames) in `CategoryOverlay.tsx` and `globals.css` so that for every station (`rims`, `juices`, `double_strainer`, `hawthorne`, `boston_shaker`, `garnishes`, `fridge`, `syrups`, `speedrail`, `ice`) and every item within each station, the descriptive box remains 100% inside the visible Game Boy screen bounds (`left`, `right`, `top`, `bottom`) across desktop (`1280×800`) and mobile (`390×844`) viewports (`INV-ASSET-BOX-ONSCREEN-01`).

## Files Modified
- `src/components/CategoryOverlay.tsx`
- `src/app/globals.css`

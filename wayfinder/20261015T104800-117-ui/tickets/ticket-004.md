---
id: ticket-004
title: Background Ice Outline Alignment & Live Playwright Verification
status: completed
depends_on:
  - ticket-001
  - ticket-002
  - ticket-003
acceptance_criteria:
  - AC-05
  - AC-06
---

# Ticket 004: Background Ice Outline Alignment & Live Playwright Verification

## Scope
Translate the `zoneId: "ice"` hotspot SVG path in `src/data/povHotspots.ts` by `(+56, +84)` in the `1184×880` viewBox so its bounding box (`x ≈ 518.56..777.06, y ≈ 604.51..670.51`) aligns 1:1 with the ice cubes in the counter ice well on `/OBELISCO_POV.jpg` (`INV-ICE-ALIGN-01`). Verify all acceptance criteria (`AC-01` through `AC-06`) live in Playwright.

## Files Modified
- `src/data/povHotspots.ts`

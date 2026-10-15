---
id: ticket-004
title: Game Boy Controls Integration, Carousel Return & Live Playwright Verification
status: done
depends_on:
  - ticket-003
acceptance_criteria:
  - AC-01
  - AC-02
  - AC-03
  - AC-04
  - AC-05
  - AC-06
  - AC-07
  - AC-08
  - AC-09
---

# Ticket 004: Game Boy Controls Integration, Carousel Return & Live Playwright Verification

## Scope
Wire `PatronInspectionCarousel` into `src/app/page.tsx` and `ReceiptSystem.tsx` so Game Boy `D-Pad Left` / `Right` and keyboard arrow keys switch carousel slides, `B` interacts, `[ ◀ ORDER ]` collapses the full-screen chatbox back to Slide 1 (`Order Receipt`) in the carousel, and `[ × ]`, `Escape`, Game Boy `A`, or outside click closes the interface and restores all bar patrons (`AC-09`). Verify all acceptance criteria (`AC-01` through `AC-09`) live in Playwright.

## Files Modified
- `src/app/page.tsx`
- `src/components/GameBoy3DShell.tsx`
- `src/app/receipt.css`
- `wayfinder/20261015T114000-113-chat/test_matrix_113.md`
- `handoff/20261015T114000-113-chat/verify_113_e2e.mjs`

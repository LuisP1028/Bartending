---
id: ticket-002
title: Seat-Aware Non-Occluding Patron Inspection Carousel (Order Receipt ↔ Conversation Box)
status: in_progress
depends_on: []
acceptance_criteria:
  - AC-01
  - AC-02
---

# Ticket 002: Seat-Aware Non-Occluding Patron Inspection Carousel (Order Receipt ↔ Conversation Box)

## Scope
Create `PatronInspectionCarousel` (`src/components/PatronInspectionCarousel.tsx` and `src/components/PatronInspectionCarousel.module.css`) and update `ReceiptPaper.tsx`, `ReceiptSystem.tsx`, and `receipt.css` so clicking a seated patron `x` isolates patron `x`, binds patron `x`'s order to the active bar mat, and opens a two-slide carousel positioned on the non-occluding side of the Game Boy screen (`46%–96%` X for `bar_seat_1`/`bar_seat_2`; `4%–54%` X for `bar_seat_3`/`bar_seat_4`) enabling switching between Slide 1 (`Order Receipt`) and Slide 2 (`Conversation Box`) (`INV-CAROUSEL-ORDER-CHAT-01`, `INV-CAROUSEL-NO-OCCLUDE-01`).

## Files Modified
- `src/components/PatronInspectionCarousel.tsx`
- `src/components/PatronInspectionCarousel.module.css`
- `src/components/receipt/ReceiptPaper.tsx`
- `src/components/receipt/ReceiptSystem.tsx`
- `src/app/receipt.css`

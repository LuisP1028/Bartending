---
id: ticket-003
title: Full-Screen Patron Chatbox with Photo, Name, Typewriter Speech, Starters & Custom Input
status: in_progress
depends_on:
  - ticket-001
  - ticket-002
acceptance_criteria:
  - AC-03
  - AC-04
  - AC-05
  - AC-06
  - AC-07
  - AC-08
---

# Ticket 003: Full-Screen Patron Chatbox with Photo, Name, Typewriter Speech, Starters & Custom Input

## Scope
Implement the Full-Screen Patron Chatbox mode inside `PatronInspectionCarousel` (`[data-testid="patron-chatbox-fullscreen"]`) so that interacting in conversation with patron `x` expands the Conversation Box to cover `96% × 96%` (`>= 92%` width and `>= 90%` height) of the visible Game Boy screen in the Retro RPG Dialogue theme (`#09133b` navy, dual white/black pixel borders, 4 SVG corner loops), displaying patron `x`'s photo inside a silver beveled frame, patron `x`'s display name in gold (`#f7ca18`), typewriter-animated responses, two LLM-generated starter buttons, and a `<= 140`-char custom text input + `"SEND"` button (`INV-CHATBOX-FULLSCREEN-01`).

## Files Modified
- `src/components/PatronInspectionCarousel.tsx`
- `src/components/PatronInspectionCarousel.module.css`

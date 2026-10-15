---
id: ticket-001
title: Hugging Face LLM Starters, Bidirectional Chat & Fail-Fast Persona Service
status: in_progress
depends_on: []
acceptance_criteria:
  - AC-05
  - AC-07
  - AC-08
---

# Ticket 001: Hugging Face LLM Starters, Bidirectional Chat & Fail-Fast Persona Service

## Scope
Extend `src/data/characterDialogue.ts`, `src/lib/hfDialogueService.ts`, and `src/app/api/dialogue/route.ts` to support:
1. Strict authoritative persona resolution (`resolveAuthoritativePersona`) from `public/assets/patrons/{characterId}/personality.txt`, disk `meta.json` `aboutMe`, or PostgreSQL `patrons.about_me`, failing fast with `PersonaNotFoundError` (`404`) when missing (`INV-FAILFAST-DIALOGUE-01`).
2. `type: 'starters'` (`StartersDialoguePayload`): Dynamically generating two (2) persona-conditioned conversation starters via the Hugging Face LLM (`HF_DIALOGUE_MODEL`), sanitizing to uppercase, and returning `starters: [string, string]` (`INV-STARTERS-PERSONA-01`).
3. `type: 'chat'` (`ChatDialoguePayload`): Accepting a player-selected starter or custom message (`<= 140` chars) plus conversation history and active cocktail context, and returning an in-character uppercase patron reply (`AC-07`).

## Files Modified
- `src/data/characterDialogue.ts`
- `src/lib/hfDialogueService.ts`
- `src/app/api/dialogue/route.ts`

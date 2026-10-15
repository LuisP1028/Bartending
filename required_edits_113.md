# Required Edits — Functional Specification 113 (`functional_specification_113.md`)

## Edit 1: Hugging Face LLM Dialogue Service & Authoritative Persona Fail-Fast (`AC-05`, `AC-07`, `AC-08`, `INV-STARTERS-PERSONA-01`, `INV-FAILFAST-DIALOGUE-01`)
- **`src/data/characterDialogue.ts`**:
  - Update `resolveAuthoritativePersona(characterId, repoRoot)` to resolve strictly from:
    1. `public/assets/patrons/{characterId}/personality.txt` on disk (`loadCharacterPromptFile`).
    2. `public/assets/patrons/{characterId}/meta.json` (`aboutMe` field) on disk if present.
    3. PostgreSQL `SELECT about_me FROM patrons WHERE id = $1 LIMIT 1`.
  - Remove static catalog fallbacks from `resolveAuthoritativePersona` so missing persona records immediately throw `PersonaNotFoundError` (`statusCode = 404`, `code = 'PERSONA_NOT_FOUND'`).
- **`src/lib/hfDialogueService.ts`**:
  - Extend `DialogueRequestType` to `'order' | 'rejection' | 'starters' | 'chat'`.
  - Add `StartersDialoguePayload` (`type: 'starters'`, `characterId`, optional `cocktail`, optional `greeting`) and `ChatDialoguePayload` (`type: 'chat'`, `characterId`, `playerMessage`, optional `cocktail`, optional `history`).
  - Add `buildStartersSystemPrompt(personaText)` and `parseAndSanitizeStarters(rawText)` to generate and validate exactly two (2) distinct, persona-derived conversation starters in uppercase (`10–95` chars each). Throw `DialogueError('LLM failed to generate two valid conversation starters', 'STARTERS_EMPTY_ERROR', 500)` if fewer than 2 valid starters are returned.
  - Handle `type: 'chat'` in `generateDialogueCompletion`: validate non-empty `playerMessage` (`<= 140` chars), include recent conversation history turns (`player` / `patron`) and active cocktail context, and return an in-character uppercase response sanitized via `sanitizeDialogueOutput`.
- **`src/app/api/dialogue/route.ts`**:
  - Validate request payloads for `'order'`, `'rejection'`, `'starters'`, and `'chat'` (returning `400 INVALID_PAYLOAD` if `type` is unsupported or if `type === 'chat'` and `playerMessage` is missing/empty).

## Edit 2: Patron Inspection Carousel & Full-Screen Patron Chatbox Component (`AC-01`, `AC-02`, `AC-03`, `AC-04`, `AC-05`, `AC-06`, `AC-07`, `AC-08`, `AC-09`)
- **`src/components/PatronInspectionCarousel.tsx` & `src/components/PatronInspectionCarousel.module.css`**:
  - Create `PatronInspectionCarousel` with `forwardRef<PatronInspectionCarouselHandle, PatronInspectionCarouselProps>`.
  - **Non-Occluding Carousel Mode (`!isChatFullscreen`)**:
    - Position dynamically based on `seatId`:
      - Left bar stools (`bar_seat_1`, `bar_seat_2`): right half of the visible Game Boy screen (`left: calc(var(--shell-glass-inset-x, 0px) + (var(--shell-glass-w, 100%) * 0.46))`, `width: calc(var(--shell-glass-w, 100%) * 0.50)`).
      - Right bar stools (`bar_seat_3`, `bar_seat_4`): left half of the visible Game Boy screen (`left: calc(var(--shell-glass-inset-x, 0px) + (var(--shell-glass-w, 100%) * 0.04))`, `width: calc(var(--shell-glass-w, 100%) * 0.50)`).
    - Render a retro carousel navigation bar with `◀` (`[data-testid="carousel-prev-btn"]`), `[ ORDER ]` (`[data-testid="carousel-tab-order"]`), `[ CHAT ]` (`[data-testid="carousel-tab-chat"]`), `▶` (`[data-testid="carousel-next-btn"]`), and `[ × ]` (`[data-testid="carousel-close-btn"]`).
    - **Slide 1 (`activeSlide === 'order'`)**: Renders the patron's full `ReceiptPaper` (`[data-testid="receipt-inspected"]`) inside a clean square/near-square viewport.
    - **Slide 2 (`activeSlide === 'chat'`)**: Renders the patron's **Conversation Box** (`[data-testid="patron-conversation-box"]`) in the Retro RPG Dialogue Aesthetic (`#09133b` navy background, dual white/black pixel borders, 4 SVG corner loops, silver beveled portrait frame with patron photo, gold speaker name, spoken greeting, `"TALK / FULL CHAT"` button, 2 AI-generated starters, and custom input trigger). Interacting with any conversation action expands into Full-Screen Chatbox mode.
  - **Full-Screen Patron Chatbox Mode (`isChatFullscreen`)**:
    - Expands to cover `96% × 96%` of the playable Game Boy screen (`left: 2%`, `top: 2%`, `width: 96%`, `height: 96%` of `--shell-glass-w` / `--shell-glass-h`), styled in `#09133b` navy with dual pixel borders and 4 SVG corner loops (`[data-testid="patron-chatbox-fullscreen"]`).
    - Renders the silver beveled portrait frame (`[data-testid="chatbox-patron-portrait-frame"]`) with patron `x`'s photo (`[data-testid="chatbox-patron-photo"]`), canonical display name in gold (`#f7ca18`, `[data-testid="chatbox-patron-name"]`), `[ ◀ ORDER ]` button (`[data-testid="chatbox-back-to-order"]`) to return to Slide 1 in the carousel, and `[ × ]` close button (`[data-testid="chatbox-close-btn"]`).
    - Renders the conversation transcript area (`[data-testid="chatbox-transcript"]`) with player message echo (`[data-testid="chatbox-player-message"]`), typewriter-animated patron response (`[data-testid="chatbox-patron-message"]`), and explicit fail-fast error alert (`[data-testid="patron-chat-error"]`) when upstream/persona/token errors occur.
    - Renders the two persona-derived LLM conversation starter buttons (`[data-testid="chat-starter-0"]`, `[data-testid="chat-starter-1"]`) and the custom text input (`[data-testid="chat-custom-input"]`, `maxLength={140}`, placeholder `"SAY SOMETHING..."`) + `"SEND"` button (`[data-testid="chat-send-btn"]`).

## Edit 3: Receipt System & Playfield Integration (`AC-01`, `AC-02`, `AC-09`, `INV-CAROUSEL-ORDER-CHAT-01`, `INV-PATRON-ISOLATION-01`)
- **`src/components/receipt/ReceiptSystem.tsx` & `src/app/receipt.css`**:
  - Update `ReceiptStageOverlay` and `.receipt-wrapper.state-inspected` so that when a receipt is inspected inside the Patron Inspection Carousel (`inCarousel` prop on `ReceiptPaper`), `ReceiptPaper` fills the carousel slide container cleanly (`width: 100%; height: 100%; left: 0; top: 0; position: relative`) while preserving internal vertical scroll (`touch-action: pan-y`) and not collapsing on internal clicks.
- **`src/app/page.tsx`**:
  - Mount `PatronInspectionCarousel` inside `PovStageShell` when `isolatedSeatId` is active.
  - Wire Game Boy `D-Pad Left` / `D-Pad Right` (`shellDpad`), `B` button (`shellPressBInteract`), `A` button (`shellPressABack`), `Escape` key, and outside clicks to navigate/dismiss the Patron Inspection Carousel and Full-Screen Patron Chatbox cleanly.

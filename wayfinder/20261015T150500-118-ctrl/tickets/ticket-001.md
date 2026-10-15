---
id: ticket-001
title: Disable Mobile Auto-Zoom on Chatbox Text Input Focus
status: completed
depends_on: []
acceptance_criteria:
  - AC-01
---

# Ticket 001: Disable Mobile Auto-Zoom on Chatbox Text Input Focus

## Scope
Prevent mobile browsers (including iOS Safari and mobile Chromium) from automatically zooming in or shifting the viewport when the player focuses `[data-testid="chat-custom-input"]` (`"SAY SOMETHING..."`) inside the Full-Screen Patron Chatbox (`INV-NO-MOBILE-ZOOM-01`).

## Completed Edits
- `src/app/layout.tsx`: Added `maximumScale: 1` and `userScalable: false` to `export const viewport: Viewport`.
- `src/components/PatronInspectionCarousel.module.css`: Updated `.customInput` to `font-size: 16px`, `font-family: var(--font-receipt), 'VT323', var(--font-press-start), monospace`, `-webkit-text-size-adjust: 100%`, and `touch-action: manipulation`.

## Verification (`AC-01`)
- Verified on `390×844` mobile portrait viewport in Playwright (`mobile_chat_input_focus.png`):
  - `<meta name="viewport">` content: `"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"`
  - `getComputedStyle(input).fontSize`: `"16px"` (`computedFontSizePx === 16`)
  - `window.visualViewport.scale === 1` on focus.

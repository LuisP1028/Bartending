---
ticket_id: "002"
title: "Presentation Shell Decoupling & Remote Endpoint Severing"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_99.md"
---

# Ticket 002: Presentation Shell Decoupling & Remote Endpoint Severing

## Question
How should the presentation shell (`docs/index.html`) and application asset references be decoupled from the remote Hugging Face Space (`https://choppedcheese-dither-os-bartending.hf.space`) so that all shell launches, iframe embeddings, and media streaming target the local runtime instance (`localhost`) with zero remote network requests?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_99.md` Current Baseline §1 ("Presentation / Hosting Split"), §2 ("Hardcoded Remote Endpoints"), Desired Functionality §1 ("Complete Local Hosting & Remote Decoupling"), and AC2 ("Remote Endpoint Independence").
- **Current Baseline:** `docs/index.html` lines 95-97 hardcode:
  ```javascript
  const SPACE_URL = "https://choppedcheese-dither-os-bartending.hf.space";
  document.getElementById("game").src = SPACE_URL;
  ```
  And lines 76-79 display:
  ```html
  <p class="hint">Loading game…<br />If this stays blank, wait for the Space to wake.</p>
  ```
- **Affected Files:**
  - `docs/index.html` (lines 8-12, 76-79, 94-98)
  - `DEPLOY.md` (lines 1-10, 94-100)
  - `README.md` (lines 42-53)

## Architectural Decisions to Lock
1. **Dynamic Local Target Resolution in Shell (`docs/index.html`):**
   - Eliminate hardcoded `https://choppedcheese-dither-os-bartending.hf.space`.
   - Update script logic to resolve the local game server dynamically:
     - Check query parameter `?target=...` first.
     - If current `window.location.hostname` is `localhost` or `127.0.0.1`, use `window.location.origin`.
     - Otherwise default to `http://localhost:3000`.
   - Update user-facing hint text to reflect local operation: *"Loading game… If this stays blank, ensure the local game server is running on localhost (default: http://localhost:3000)."*
   - Update page description: *"DITHER-OS lounge bartender simulator — local standalone runtime"*.
2. **Permission Boundary Delegation:**
   - Retain full feature policy attributes on the shell iframe:
     `allow="fullscreen; autoplay; clipboard-write; camera; microphone"`
     This ensures that if a player accesses the game through the shell on `localhost`, camera permissions flow through to the embedded page seamlessly.
3. **Zero Remote Requests:**
   - Network inspections during local play must dispatch zero requests to `choppedcheese-dither-os-bartending.hf.space` or any `*.hf.space` subdomain.

## Scope & Invariant Guardrails
- **In Scope:** Static iframe shell decoupling, target URL resolution logic, local permissions delegation.
- **Out of Scope:** Removing the Next.js standalone root page at `src/app/page.tsx`, which serves as the primary direct entry point for local play.

---

## Resolution

### 1. Concrete Transformation for `docs/index.html`
In `docs/index.html`:
- Replace meta description (lines 9-12):
```html
    <meta
      name="description"
      content="DITHER-OS lounge bartender simulator — local standalone runtime"
    />
```
- Replace hint paragraph (lines 76-79):
```html
        <p class="hint">
          Loading game…<br />
          If this stays blank, ensure the local game server is running on localhost (default: http://localhost:3000).
        </p>
```
- Replace script block (lines 94-98):
```html
    <script>
      (function() {
        const params = new URLSearchParams(window.location.search);
        const explicitTarget = params.get('target');
        let targetUrl = 'http://localhost:3000';
        if (explicitTarget) {
          targetUrl = explicitTarget;
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          targetUrl = window.location.origin;
        }
        document.getElementById("game").src = targetUrl;
      })();
    </script>
```

### 2. Direct Navigation Parity
When users navigate directly to `http://localhost:3000`, Next.js directly renders `src/app/page.tsx` without iframe nesting, executing entirely in first-party local origin context. The shell in `docs/index.html` provides optional desktop/wrapper compatibility while guaranteeing zero remote network calls.

### 3. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks [Local Runtime Verification Protocol & Subsystem Smoke Test (ticket-006.md)](./ticket-006.md).

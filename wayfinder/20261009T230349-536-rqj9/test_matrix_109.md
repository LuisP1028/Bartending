# TM109 — Master Integration Test Matrix: Hugging Face LLM Dialogue Node: Dynamic In-Character Cocktail Ordering, Error-Aware Rejection Speech, and Retro Dialogue Presentation

**Governing Specification:** `functional_specification_109.md` (FS109)  
**Run ID:** `20261009T230349-536-rqj9`  
**Decision Ticket:** [Ticket 006: FS109 Hugging Face LLM Dialogue Node: Dynamic In-Character Cocktail Ordering, Error-Aware Rejection Speech, and Retro Dialogue Presentation Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./tickets/ticket-006.md)  
**Upstream Predecessor Decision Tickets:**
- [Ticket 001: Hugging Face Inference Backend Service & Fail-Fast Authentication Architecture](./tickets/ticket-001.md)
- [Ticket 002: Deterministic Patron Persona Resolution & System Instruction Governance](./tickets/ticket-002.md)
- [Ticket 003: Seating Transition (onSitComplete) Wiring & In-Character Drink Order Generation](./tickets/ticket-003.md)
- [Ticket 004: Drink Delivery Interaction & Error-Aware Rejection Speech Dispatch Architecture](./tickets/ticket-004.md)
- [Ticket 005: Diegetic Retro RPG Dialogue Box Stage Integration & Typewriter Presentation](./tickets/ticket-005.md)

---

## 1. Upstream Manifest Binding & Audit Summary

- **Modified / Created Source Components (from `handoff/20261009T230349-536-rqj9/implementer.txt` & `reviewer.txt`):**
  1. `src/app/api/dialogue/route.ts` (Next.js App Router POST API handler for dialogue generation with payload validation and error telemetry)
  2. `src/app/globals.css` (Pointer events on `.pov-patron-sprite--sit` and cursor styling on draggable active vessel `.pov-active-vessel`)
  3. `src/app/page.tsx` (Per-seat order orchestration, `handlePatronSitComplete`, `handleServeDrinkToSeat`, draggable vessel, and `RetroRpgDialogueBox` mounting)
  4. `src/components/PatronLayer.tsx` (`onSitComplete` prop propagation, `onServeDrinkToSeat` prop, and drag/drop/click event listeners on seated patrons)
  5. `src/components/RetroRpgDialogueBox.module.css` (Authentic 16-bit retro RPG dialogue box CSS: navy background, double white border, metallic portrait frame, gold text)
  6. `src/components/RetroRpgDialogueBox.tsx` (Diegetic React dialogue box component with typewriter animation, punctuation delays, bouncing prompt arrow, and click-to-skip)
  7. `src/data/characterDialogue.ts` (Deterministic persona resolution hierarchy: disk `personality.txt` -> DB `patrons.about_me` -> catalog, and `PersonaNotFoundError`)
  8. `src/lib/hfDialogueService.ts` (Hugging Face Inference client, `generateDialogueCompletion`, system prompt builder, output sanitizer, and `DialogueError`)

- **Zero-Mock Verification Certification (`INV-PAYLOAD-01` & `INV-ASSERTION-01`):**
  - All test definitions are grounded strictly in authentic codebase schemas, real filesystem layouts, actual PostgreSQL table columns, and live API endpoints.
  - Zero synthetic mock objects, dummy JSON fixtures, placeholder strings, or renamed fields are used.

---

## 2. Admissible Observed Payloads Register (`INV-PAYLOAD-01`)

| Payload Reference | Description & Structure | Source / Origin | Authentic Schema Grounding |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-ORDER-ELDER` | Authentic drink order payload for stock Elder ordering an Old Fashioned | `src/app/page.tsx` (`handlePatronSitComplete`) | `OrderDialoguePayload` (`type: 'order'`, `characterId: 'patron_elder'`, `cocktail: { name: 'Old Fashioned', vessel: 'rocks', garnishes: ['orange_twist'], agitation: 'stirred', flavorNotes: 'bourbon, simple_syrup, angostura_bitters' }`) |
| `PAYLOAD-ORDER-CAESAR` | Authentic drink order payload for stock Caesar ordering a Negroni | `src/app/page.tsx` (`handlePatronSitComplete`) | `OrderDialoguePayload` (`type: 'order'`, `characterId: 'caesar_9aea2cd1a4bf32d6'`, `cocktail: { name: 'Negroni', vessel: 'rocks', garnishes: ['orange_twist'], agitation: 'stirred', flavorNotes: 'gin, campari, sweet_vermouth' }`) |
| `PAYLOAD-ORDER-TRUMP` | Authentic drink order payload for stock Trump ordering a Manhattan | `src/app/page.tsx` (`handlePatronSitComplete`) | `OrderDialoguePayload` (`type: 'order'`, `characterId: 'trump_ca36306f5c662816'`, `cocktail: { name: 'Manhattan', vessel: 'coupe', garnishes: ['maraschino_cherry'], agitation: 'stirred', flavorNotes: 'rye_whiskey, sweet_vermouth, angostura_bitters' }`) |
| `PAYLOAD-REJECTION-CAESAR-VESSEL` | Rejection payload when Caesar is served a Negroni in a coupe instead of rocks | `src/app/page.tsx` (`handleServeDrinkToSeat`) | `RejectionDialoguePayload` (`type: 'rejection'`, `characterId: 'caesar_9aea2cd1a4bf32d6'`, `recipe: { name: 'Negroni', vessel: 'rocks', garnishes: ['orange_twist'], agitation: 'stirred' }`, `deliveredDrink: { vessel: 'coupe', ingredients: { gin: 1, campari: 1, sweet_vermouth: 1 }, rim: null, agitation: 'stirred', garnishes: ['orange_twist'] }`, `discrepancies: ['[GLS] Expected rocks, Got coupe']`) |
| `PAYLOAD-REJECTION-ELDER-GARNISH` | Rejection payload when Elder is served an Old Fashioned missing orange twist | `src/app/page.tsx` (`handleServeDrinkToSeat`) | `RejectionDialoguePayload` (`type: 'rejection'`, `characterId: 'patron_elder'`, `recipe: { name: 'Old Fashioned', vessel: 'rocks', garnishes: ['orange_twist'], agitation: 'stirred' }`, `deliveredDrink: { vessel: 'rocks', ingredients: { bourbon: 2, simple_syrup: 0.25, angostura_bitters: 0.1 }, rim: null, agitation: 'stirred', garnishes: [] }`, `discrepancies: ['[GRN] Missing orange_twist']`) |
| `PAYLOAD-REJECTION-OVERPOUR` | Rejection payload with overpour ingredient discrepancy | `src/app/page.tsx` (`handleServeDrinkToSeat`) | `RejectionDialoguePayload` (`type: 'rejection'`, `characterId: 'patron_elder'`, `recipe: { name: 'Manhattan', vessel: 'coupe', garnishes: ['maraschino_cherry'], agitation: 'stirred' }`, `deliveredDrink: { vessel: 'coupe', ingredients: { rye_whiskey: 2, sweet_vermouth: 1, campari: 0.5 }, rim: null, agitation: 'stirred', garnishes: ['maraschino_cherry'] }`, `discrepancies: ['[ING] campari: Overpour (Not in Recipe)']`) |
| `PAYLOAD-AUTH-FAIL-UNSET` | Missing `HF_TOKEN` environment variable | Node process environment | `process.env.HF_TOKEN = ''` or unset |
| `PAYLOAD-AUTH-FAIL-INVALID` | Unauthenticated token rejected by Hugging Face Inference router | Upstream HTTP response | `process.env.HF_TOKEN = 'invalid_token'` resulting in HTTP 401 |
| `PAYLOAD-PERSONA-MISSING` | Patron ID lacking disk `personality.txt`, database record, or catalog entry | `src/data/characterDialogue.ts` | `characterId: 'unknown_patron_xyz'` |
| `PAYLOAD-INVALID-BODY` | JSON payload missing required discriminator fields (`type` or `characterId`) | HTTP POST body | `{ type: 'order' }` or `{}` |
| `PAYLOAD-TIMEOUT-TRIGGER` | Upstream network latency exceeding 4000ms threshold | Upstream fetch call | `AbortSignal.timeout(4000)` firing prior to HTTP headers |
| `PAYLOAD-MULTI-SEAT-CONCURRENT` | Multiple seated patrons at distinct seats (`bar_seat_1` and `bar_seat_3`) | `src/app/page.tsx` (`seatOrders`) | `Record<string, PatronSeatOrder>` containing entries for `bar_seat_1` and `bar_seat_3` |

---

## 3. Master Integration Test Matrix

| Test Case ID | Target Component | Acceptance Criterion / Boundary | Authentic Codebase Schema / Interface | Admissible Observed Input Payload (`INV-PAYLOAD-01`) | `{correct required outputs}` (`INV-ASSERTION-01`) | Explicit `{errors}` (`LANGUAGE.md`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-FS109-01** | `src/app/api/dialogue/route.ts`<br>`src/lib/hfDialogueService.ts` | **AC1** (HF Node Authentication & Live Generation) | `POST /api/dialogue`<br>`generateDialogueCompletion()` | `PAYLOAD-ORDER-ELDER` with valid `HF_TOKEN` | HTTP 200 OK; response JSON `{ dialogue, characterId: 'patron_elder', model, latencyMs }`; `dialogue` is non-empty, all-uppercase, $\le 120$ chars, zero quotes/markdown, 1–2 sentences; `latencyMs` is positive finite number | HTTP 500 error; unhandled crash; lowercase dialogue; markdown asterisks present; empty dialogue string |
| **IT-FS109-02** | `src/app/api/dialogue/route.ts`<br>`src/lib/hfDialogueService.ts` | **AC2** (Fail-Fast on Missing Token) | `POST /api/dialogue`<br>`generateDialogueCompletion()` | `PAYLOAD-ORDER-ELDER` with `PAYLOAD-AUTH-FAIL-UNSET` | HTTP 500 Internal Server Error; response JSON `{ error: 'HF_TOKEN environment variable is not set or empty', code: 'HF_TOKEN_MISSING', timestamp }`; zero mock fallbacks, placeholder text, or simulated speech | HTTP 200 returning canned/fallback speech; silent exception swallowing; missing `code: 'HF_TOKEN_MISSING'` |
| **IT-FS109-03** | `src/app/api/dialogue/route.ts`<br>`src/lib/hfDialogueService.ts` | **AC2** (Fail-Fast on Invalid Upstream Token) | `POST /api/dialogue`<br>`generateDialogueCompletion()` | `PAYLOAD-ORDER-ELDER` with `PAYLOAD-AUTH-FAIL-INVALID` | HTTP 500 Internal Server Error; response JSON `{ error: ..., code: 'HF_UPSTREAM_ERROR', details: ..., timestamp }`; fatal exception surfaced immediately | HTTP 200 with default speech; process hang; empty error body |
| **IT-FS109-04** | `src/app/api/dialogue/route.ts` | **Edge Case 3** (Request Payload Validation) | `POST /api/dialogue` | `PAYLOAD-INVALID-BODY` (missing `characterId` or `type`) | HTTP 400 Bad Request; response JSON `{ error: 'Missing required dialogue payload fields: type and characterId', code: 'INVALID_PAYLOAD' }` | HTTP 500 unhandled property access exception; missing validation error code |
| **IT-FS109-05** | `src/data/characterDialogue.ts` | **AC3**, **AC5** (Authoritative Persona Resolution Hierarchy) | `resolveAuthoritativePersona()` | Character IDs: `patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816` | Returns exact text from `public/assets/patrons/{characterId}/personality.txt` verbatim; Elder (183 bytes), Caesar (166 bytes), Trump (161 bytes) | File read ignored; static catalog returned when disk file exists; persona text altered or truncated |
| **IT-FS109-06** | `src/data/characterDialogue.ts`<br>`src/app/api/dialogue/route.ts` | **Fail-Fast** (Persona Not Found Error Surface) | `resolveAuthoritativePersona()`<br>`POST /api/dialogue` | `PAYLOAD-PERSONA-MISSING` (`unknown_patron_xyz`) | `resolveAuthoritativePersona` throws `PersonaNotFoundError` (`code: 'PERSONA_NOT_FOUND'`, `statusCode: 404`); API route returns HTTP 404 `{ error: ..., code: 'PERSONA_NOT_FOUND', timestamp }` | Returns generic default prompt; throws untyped 500 error; silent fallback |
| **IT-FS109-07** | `src/lib/hfDialogueService.ts` | **Invariant** (System Prompt & Output Sanitization Governance) | `buildSystemPrompt()`<br>`sanitizeDialogueOutput()` | Raw persona text and messy LLM output: `"Here is your drink: *grumbles* \"NEGRONI, PLEASE!\" ```extra```"` | `buildSystemPrompt` includes persona and output constraints; `sanitizeDialogueOutput` strips quotes, markdown fences, and asterisks, converts to uppercase, enforces 120-char sentence-aware truncation | Markdown syntax leaked; quotation marks preserved; text $> 120$ chars; word truncated mid-letter |
| **IT-FS109-08** | `src/lib/hfDialogueService.ts` | **Edge Case 1** (Upstream Abort Timeout Enforcement) | `generateDialogueCompletion()` | `PAYLOAD-TIMEOUT-TRIGGER` (upstream mock delay $> 4000\text{ms}$) | AbortSignal triggers at 4000ms; throws `DialogueError` with `code: 'HF_UPSTREAM_ERROR'`; API route responds promptly without game loop freeze | Request hangs indefinitely; unhandled promise rejection crashes Node server |
| **IT-FS109-09** | `src/components/PatronLayer.tsx`<br>`src/app/page.tsx` | **AC3** (Seating Transition Wiring & Order Dialogue Trigger) | `onSitComplete`<br>`handlePatronSitComplete()` | Seating event `{ instanceKey: 'inst-1', characterId: 'patron_elder', seatId: 'bar_seat_1' }` | `onSitComplete` invokes `handlePatronSitComplete`; registers `seatOrders['bar_seat_1']` with `recipe` and `status: 'ordered'`; dispatches `POST /api/dialogue`; updates `seatOrders['bar_seat_1'].orderDialogue`; sets `activeDialogueSeat = 'bar_seat_1'` | Patron sits down silently; `onSitComplete` not wired; order recipe not generated; dialogue state empty |
| **IT-FS109-10** | `src/components/PatronLayer.tsx`<br>`src/app/globals.css` | **AC4** (Seated Patron Drop Target & Pointer Events) | DOM event inspection on `.pov-patron-sprite--sit` | Drag-over and drop events with dataTransfer `cocktail-vessel`, and click event on seated patron | `.pov-patron-sprite--sit` has `pointer-events: auto` and `cursor: pointer`; `onDragOver` allows drop (`dropEffect = 'copy'`); `onDrop` and `onClick` invoke `onServeDrinkToSeat(seatId)` | Pointer events blocked (`pointer-events: none`); drop rejected; click does not trigger drink delivery |
| **IT-FS109-11** | `src/app/page.tsx` | **AC4** (Recipe Validation & Error-Aware Rejection Speech Dispatch) | `handleServeDrinkToSeat()` | Served drink with wrong glass (`PAYLOAD-REJECTION-CAESAR-VESSEL`) | `validateDrink` returns `['[GLS] Expected rocks, Got coupe']`; `seatOrders['bar_seat_1'].status` becomes `'rejected'`; `errors` updated; dispatches `POST /api/dialogue` with `type: 'rejection'`; on response, `rejectionDialogues` updated and `<RetroRpgDialogueBox>` displays rejection speech mentioning glass defect | Success handoff triggered despite error; rejection speech fails to reference discrepancy; unhandled validation crash |
| **IT-FS109-12** | `src/app/page.tsx` | **AC4** (Perfect Drink Delivery Success Path) | `handleServeDrinkToSeat()` | Served drink matching recipe perfectly (`discrepancies: []`) | `validateDrink` returns empty array; `seatOrders['bar_seat_1'].status` becomes `'served'`; active dialogue for `bar_seat_1` dismissed (`activeDialogueSeat = null`); `runSuccessHandoff()` executes | Drink rejected despite being correct; active dialogue remains open; success handoff blocked |
| **IT-FS109-13** | `src/components/RetroRpgDialogueBox.tsx`<br>`src/components/RetroRpgDialogueBox.module.css` | **AC5**, **AC6** (Retro RPG Dialogue Box Typewriter & Parity) | `RetroRpgDialogueBox` component mount | `isOpen: true`, `speakerName: 'ELDER'`, `portraitSrc: '/assets/patrons/patron_elder/sit.png'`, `message: 'A NEGRONI. NOW.'` | Renders in `.pov-stage` with navy background (`#09133b`), double white border, 4 corner loops, silver portrait frame, gold speaker name (`#f7ca18`); typewriter increments at 35ms/char with +120ms punctuation delay; prompt arrow bounces when complete; click during typing instantly reveals full text; click when done invokes `onDismiss` | Instant text appearance without typewriter; punctuation delay absent; skip on click not working; prompt arrow static |
| **IT-FS109-14** | `src/app/page.tsx` | **Edge Case 2 & 4** (Multi-Seat Concurrency Isolation & Departure Cleanliness) | `seatOrders`<br>`activeDialogueSeat` | `PAYLOAD-MULTI-SEAT-CONCURRENT` with concurrent seating at `bar_seat_1` and `bar_seat_3`, followed by departure of patron at `bar_seat_1` | `seatOrders['bar_seat_1']` and `seatOrders['bar_seat_3']` maintain completely independent state and dialogue; arrival of order for `bar_seat_1` does not affect `bar_seat_3`; departure of `bar_seat_1` clears `activeDialogueSeat` cleanly | State collision between seats; dialogue for Seat 1 overwrites Seat 3; orphan dialogue persists after patron leaves |

---

## 4. Evaluation Criteria & Assertions Mapping (`LANGUAGE.md`)

### 4.1 Evaluation Parameters
- **`{errors}`**:
  - Missing, empty, or unreadable upstream manifests `handoff/20261009T230349-536-rqj9/wayfinder-read-and-plan.txt`, `handoff/20261009T230349-536-rqj9/implementer.txt`, or `handoff/20261009T230349-536-rqj9/reviewer.txt` (`INV-HANDOFF-01`).
  - Synthesized test payloads, dummy JSON fixtures, placeholder objects, or renamed fields (`INV-PAYLOAD-01`).
  - Assertions written against handwritten expected blobs not mandated by the functional specification (`INV-ASSERTION-01`).
  - A field the schema does not carry, or a required output the specification does not name.
  - Violation of the strict "DO NOT CODE YET" gate prior to explicit operator authorization (`INV-BOUNDARY-01`).
  - Silent exception handling, empty fallbacks, or mock responses when `HF_TOKEN` is unset or authentication fails.
  - Lowercase dialogue strings, markdown formatting, or length $> 120$ characters returned by dialogue engine.
  - Unwired `onSitComplete` prop causing newly seated patrons to remain completely silent.
  - Missing pointer event styles on seated patrons preventing drag-and-drop or click drink delivery.
- **`{correctness}`**:
  - Exact relational key, column name, and data type alignment between planned test payloads and active codebase interfaces/schemas.
  - 100% schema fidelity: payloads contain only authentic field names with exact optionality and typing.
  - Exact status code alignment: HTTP 200 for successful completion, HTTP 400 for missing fields, HTTP 404 for missing personas, HTTP 500 for missing token or upstream failure.
  - Strict uppercase text compliance with zero markdown, zero quotation marks, and $\le 120$ characters.
  - Authentic 30–40ms typewriter timing with +120ms punctuation delays and instant skip on click.
- **`{functionality}`**:
  - Planning an integration test architecture that verifies the components implemented in `handoff/20261009T230349-536-rqj9/implementer.txt` and post-review states in `handoff/20261009T230349-536-rqj9/reviewer.txt` against real system states without relying on brittle, synthetic mocks.
- **`{correct required outputs}`**:
  - Integration Test Decision Ticket charted in `wayfinder/20261009T230349-536-rqj9/tickets/ticket-006.md`.
  - Authoritative Master Integration Test Matrix documented in `wayfinder/20261009T230349-536-rqj9/test_matrix_109.md`.
  - Updated Wayfinder Map in `wayfinder/20261009T230349-536-rqj9/map.md`.
  - Dedicated role handoff manifest at `handoff/20261009T230349-536-rqj9/test-plan.txt` atomically overwritten with one repository-relative path per line.
  - Exactly zero lines of test execution code, fixtures, parsers, or dummy payloads written.
- **`{sufficient}`**:
  - The state of documentation where every asserted field name is a real schema field, every asserted output is a `{correct required output}`, and absolutely zero ambiguity remains for the future test authoring session.
- **`{insufficient}`**:
  - Any test plan where inputs are synthesized (even if the resulting test would pass/be green), where payloads carry unverified fields, where assertion oracles are hand-invented, or where fallback mechanisms are injected without specification authority.

---

## 5. Coding Gate Affirmation (`INV-BOUNDARY-01`)

**DO NOT CODE YET: Implementation coding gate remains locked. Zero test code, test fixtures, parsers, or expected-output files have been generated. Coding waits on an empty frontier and explicit operator authorization.**

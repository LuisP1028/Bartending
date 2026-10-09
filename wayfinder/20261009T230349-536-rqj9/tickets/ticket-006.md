---
ticket_id: "006"
title: "FS109 Hugging Face LLM Dialogue Node: Dynamic In-Character Cocktail Ordering, Error-Aware Rejection Speech, and Retro Dialogue Presentation Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol"
type: task
status: resolved
claimed_by: "wayfinder-test-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md", "ticket-004.md", "ticket-005.md"]
governing_specification: "functional_specification_109.md"
---

# Ticket 006: FS109 Hugging Face LLM Dialogue Node: Dynamic In-Character Cocktail Ordering, Error-Aware Rejection Speech, and Retro Dialogue Presentation Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol

## Question
What deterministic integration test decisions, authentic codebase schemas, admissible observed payloads, and specification oracles govern the verification of the modified dialogue API route, Hugging Face inference client, patron persona resolution hierarchy, seating transition orchestration, drink delivery validation, and diegetic retro RPG dialogue box presentation components (`src/app/api/dialogue/route.ts`, `src/lib/hfDialogueService.ts`, `src/data/characterDialogue.ts`, `src/components/PatronLayer.tsx`, `src/app/page.tsx`, `src/components/RetroRpgDialogueBox.tsx`, `src/components/RetroRpgDialogueBox.module.css`, `src/app/globals.css`) to guarantee that seated patrons dynamically deliver in-character drink orders upon seating, verbalize contextual error-aware rejection speech naming precise recipe discrepancies when served incorrect drinks, render faithfully through a 16-bit retro RPG dialogue window with exact typewriter cadence and bouncing prompt arrow, enforce fail-fast non-zero error telemetry on missing credentials or upstream errors with zero mock fallbacks, and preserve multi-seat concurrency isolation without synthetic mocks or executable test code under `INV-PAYLOAD-01` and `INV-ASSERTION-01`?

---

## Context & Specification Grounding

- **Governing Specification:** `functional_specification_109.md` (FS109 — Hugging Face LLM dialogue node: Dynamic in-character cocktail ordering, error-aware rejection speech, and retro dialogue presentation)
  - §Purpose: "Establish required product `{functionality}` for a dedicated AI dialogue generation service powered by the Hugging Face Inference API, enabling barroom patrons to dynamically deliver in-character drink orders upon taking their seats and verbalize contextual, personality-driven rejection speech when served an incorrect cocktail. This replaces static, silent, or repetitive character states with reactive, distinct verbal personalities rendered through an authentic retro RPG dialogue box interface."
  - §Glossary alignment:
    - **Hugging Face LLM Dialogue Node**: Backend service communicating with the Hugging Face Inference API using configured credentials (`HF_TOKEN`) to generate character dialogue.
    - **In-Character Order Dialogue**: A short, personality-rich natural language statement spoken by a newly seated patron requesting their assigned cocktail recipe.
    - **Error-Aware Rejection Speech**: Dynamic dialogue verbalized by a patron when an invalid drink is served, explicitly referencing the precise preparation discrepancy in character.
    - **Prompt File Resolution**: Deterministic loading of a patron's authoritative `personality.txt` file from disk or database to configure the LLM system prompt.
    - **Retro Dialogue Box View**: Diegetic UI component modeled after 16-bit RPGs displaying speaker name, character portrait, animated typewriter text, and prompt arrow.
    - **Fail-Fast Dialogue Invariant**: Missing credentials, network failures, or API errors surface explicit fatal telemetry immediately, with zero silent fallbacks or hardcoded placeholder speech.
  - §Desired Functionality:
    1. Hugging Face Inference Service Integration: Authenticate via `process.env.HF_TOKEN`; instruction-tuned conversational model endpoint (`https://router.huggingface.co/v1/chat/completions`); fail-fast telemetry if `HF_TOKEN` unset or empty; 4000ms abort signal.
    2. Prompt File Resolution & System Context: Resolve `public/assets/patrons/{characterId}/personality.txt`, fallback to PostgreSQL database `patrons.about_me`, fail fast with `PERSONA_NOT_FOUND` if neither exists; system prompt invariants (persona adherence, Obelisco bar setting, 1–2 uppercase sentences, max 120 chars, zero markdown, zero quotation marks).
    3. In-Character Drink Order Generation: Triggered by seating transition event (`onSitComplete`); inputs: character persona, assigned cocktail recipe; output: authentic in-character order line.
    4. Error-Aware Rejection Speech Generation: Triggered when player serves an incorrect drink failing recipe validation; inputs: persona, recipe, delivered drink attributes, itemized discrepancies (`[GLS]`, `[RIM]`, `[MTD]`, `[ING]`, `[GRN]`); output: in-character line complaining specifically about discrepancies.
    5. Retro RPG Dialogue Box Integration: Diegetic stage presentation inside `PovStageShell`; gold pixel font (`#f7ca18`); metallic beveled portrait frame; animated typewriter (30–40ms/char with punctuation delay); bouncing downward prompt arrow; click-to-advance dismissal.
  - §Acceptance Criteria:
    - **AC1** (HF Node Authentication): Backend dialogue route successfully authenticates using `HF_TOKEN` and completes test prompts.
    - **AC2** (Fail-Fast on Missing Token): When `HF_TOKEN` is unset, the dialogue service immediately raises a fatal HTTP 500/503 with explicit error telemetry. Zero mock fallbacks.
    - **AC3** (Order Dialogue Generation): Seating at a bar stool invokes the HF node with the assigned recipe and displays an in-character order string in the dialogue box.
    - **AC4** (Error-Aware Rejection Speech): Delivering an incorrect drink with recipe errors (e.g. wrong vessel) generates a dialogue response that explicitly names the discrepancy.
    - **AC5** (Retro Presentation Parity): Dialogue displays with matching styling from `retro_rpg_dialogue_box.html`: dual white border, corner loops, silver portrait frame, gold speaker name, and bouncing prompt arrow.
    - **AC6** (Typewriter Animation Timing): Text renders character-by-character at 30–40ms cadence, with punctuation delays, and immediate completion upon click.
  - §Edge Cases & Behavioral Boundaries:
    1. Hugging Face Upstream Latency / Rate Limits: 4000ms timeout abort signal; returns non-zero error telemetry (`HF_UPSTREAM_ERROR`) rather than freezing game loop.
    2. Concurrent Dialogue Across Multiple Seats: Strict per-seat isolation (`seatOrders[seatId]`); dialogue for `bar_seat_1` does not collide with `bar_seat_3`.
    3. Empty or Truncated LLM Response: Empty or whitespace-only dialogue string throws fatal `DIALOGUE_EMPTY_ERROR` immediately.
    4. Dialogue Dismissal on Premature Departure: Departing patron cleanly dismisses active dialogue for that seat immediately.
- **Upstream Manifest Context:**
  - `handoff/20261009T230349-536-rqj9/wayfinder-read-and-plan.txt`
  - `handoff/20261009T230349-536-rqj9/implementer.txt`
  - `handoff/20261009T230349-536-rqj9/reviewer.txt`
- **Predecessor Decision Tickets:**
  - [Ticket 001: Hugging Face Inference Backend Service & Fail-Fast Authentication Architecture](./ticket-001.md)
  - [Ticket 002: Deterministic Patron Persona Resolution & System Instruction Governance](./ticket-002.md)
  - [Ticket 003: Seating Transition (onSitComplete) Wiring & In-Character Drink Order Generation](./ticket-003.md)
  - [Ticket 004: Drink Delivery Interaction & Error-Aware Rejection Speech Dispatch Architecture](./ticket-004.md)
  - [Ticket 005: Diegetic Retro RPG Dialogue Box Stage Integration & Typewriter Presentation](./ticket-005.md)

---

## Architectural Decisions to Lock

### 1. Ground-Truth Codebase Interface & Schema Definition (Zero Mocks)
The integration test interfaces for verifying the FS109 Hugging Face dialogue generation and retro presentation subsystem are grounded strictly in authentic TypeScript types, database schemas, filesystem contracts, and HTTP endpoints without synthetic wrappers or mock layers:

#### A. Hugging Face Dialogue Service Schema (`src/lib/hfDialogueService.ts`)
```typescript
export type DialogueRequestType = 'order' | 'rejection';

export interface OrderDialoguePayload {
  type: 'order';
  characterId: string;
  cocktail: {
    name: string;
    vessel: string;
    garnishes: string[];
    agitation: string;
    flavorNotes?: string;
  };
}

export interface RejectionDialoguePayload {
  type: 'rejection';
  characterId: string;
  recipe: {
    name: string;
    vessel: string;
    garnishes: string[];
    agitation: string;
  };
  deliveredDrink: {
    vessel: string | null;
    ingredients: Record<string, number>;
    rim: string | null;
    agitation: string | null;
    garnishes: string[];
  };
  discrepancies: string[];
}

export type DialoguePayload = OrderDialoguePayload | RejectionDialoguePayload;

export interface DialogueServiceResult {
  dialogue: string;
  characterId: string;
  model: string;
  latencyMs: number;
}

export class DialogueError extends Error {
  code: string;
  statusCode: number;
  details?: string;
}

export function buildSystemPrompt(personaText: string): string;
export function sanitizeDialogueOutput(rawText: string): string;
export function generateDialogueCompletion(payload: DialoguePayload): Promise<DialogueServiceResult>;
```

#### B. Dialogue API Route Schema (`src/app/api/dialogue/route.ts`)
- **HTTP Method:** `POST`
- **Request Headers:** `Content-Type: application/json`
- **Request Body:** Authentic `DialoguePayload` (`OrderDialoguePayload` or `RejectionDialoguePayload`)
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "dialogue": "A DRY GIN MARTINI IN A COUPE, WITH A LEMON TWIST. MAKE IT CRISP.",
    "characterId": "patron_elder",
    "model": "Qwen/Qwen2.5-72B-Instruct",
    "latencyMs": 425
  }
  ```
- **Payload Validation Error (HTTP 400 Bad Request):**
  ```json
  {
    "error": "Missing required dialogue payload fields: type and characterId",
    "code": "INVALID_PAYLOAD"
  }
  ```
- **Missing Token Error (HTTP 500 Internal Server Error):**
  ```json
  {
    "error": "HF_TOKEN environment variable is not set or empty",
    "code": "HF_TOKEN_MISSING",
    "timestamp": "2026-10-09T23:03:49.000Z"
  }
  ```
- **Persona Not Found Error (HTTP 404 Not Found):**
  ```json
  {
    "error": "Authoritative persona not found on disk or database for patron \"unknown_patron\"",
    "code": "PERSONA_NOT_FOUND",
    "timestamp": "2026-10-09T23:03:49.000Z"
  }
  ```
- **Upstream Gateway / Timeout Error (HTTP 500 / 502 / 504):**
  ```json
  {
    "error": "Hugging Face API returned status 503: Service Unavailable",
    "code": "HF_UPSTREAM_ERROR",
    "details": "Service Unavailable",
    "timestamp": "2026-10-09T23:03:49.000Z"
  }
  ```
- **Empty LLM Output Error (HTTP 500 Internal Server Error):**
  ```json
  {
    "error": "LLM returned empty or whitespace-only dialogue string",
    "code": "DIALOGUE_EMPTY_ERROR",
    "timestamp": "2026-10-09T23:03:49.000Z"
  }
  ```

#### C. Persona Resolution Hierarchy Schema (`src/data/characterDialogue.ts`)
```typescript
export class PersonaNotFoundError extends Error {
  code = 'PERSONA_NOT_FOUND';
  statusCode = 404;
}

export function loadCharacterPromptFile(characterId: string, repoRoot?: string): string | null;
export function resolveSystemPromptForPersonality(personality: string): string | null;
export function resolveAuthoritativePersona(characterId: string, repoRoot?: string): Promise<string>;
```

#### D. Patron Seating and Serving Layer (`src/components/PatronLayer.tsx`)
```typescript
type PatronLayerProps = {
  seats: PatronSeatInput[];
  layoutOverrides?: Record<string, PatronLayout>;
  barCutoffD?: string;
  editMode?: boolean;
  onSitComplete?: (info: {
    instanceKey: string;
    characterId: string;
    seatId: string;
  }) => void;
  onServeDrinkToSeat?: (seatId: string) => void;
};
```
- Seated Patron Sprite DOM: `<img className="pov-patron-sprite pov-patron-sprite--sit" ... />`
- Event Listeners:
  - `onDragOver`: `e.preventDefault()`, `e.dataTransfer.dropEffect = 'copy'`
  - `onDrop`: `e.preventDefault()`, `onServeDrinkToSeat?.(inst.seatId)`
  - `onClick`: `onServeDrinkToSeat?.(inst.seatId)`

#### E. Game State & Order Orchestration Schema (`src/app/page.tsx`)
```typescript
export interface PatronSeatOrder {
  seatId: string;
  characterId: string;
  instanceKey: string;
  recipe: CocktailRecipe;
  orderDialogue: string | null;
  status: 'ordered' | 'served' | 'rejected';
  timestamp: number;
}
```
- Active Vessel Drag Contract:
  - `<div className="pov-active-vessel" draggable={!vesselHandoff && !!state.vessel} onDragStart={...} />`
- Recipe Validation Contract:
  - `mode.getRecipeManager().validateDrink(state, order.recipe)` returning discrepancy array: `[GLS]`, `[RIM]`, `[MTD]`, `[ING]`, `[GRN]`.

#### F. Retro RPG Dialogue Box Component Schema (`src/components/RetroRpgDialogueBox.tsx`)
```typescript
export interface RetroRpgDialogueBoxProps {
  isOpen: boolean;
  speakerName: string;
  portraitSrc: string;
  message: string;
  onAdvance?: () => void;
  onDismiss?: () => void;
  speedMs?: number; // default 35ms
}
```
- Timing & Interaction Contracts:
  - Base typewriter speed: 35ms per character.
  - Punctuation pause: +120ms for `['.', '!', '?']`.
  - In-flight click: immediately clears timer, displays full `message`, reveals prompt arrow.
  - Completed click: invokes `onAdvance?.()` and `onDismiss?.()`.
- Diegetic Styling (`RetroRpgDialogueBox.module.css`):
  - `.wrapper`: `z-index: 50`, `bottom: 16px`, `left: 16px`, `right: 16px`, `max-width: 680px`.
  - `.window`: `#09133b` navy interior, `border: 3px solid #ffffff`, `box-shadow: inset 0 0 0 3px #09133b, inset 0 0 0 5px #ffffff`.
  - `.speakerName`: `#f7ca18` gold, `text-shadow: 2px 2px 0px #000000`.
  - `.portraitFrame`: `92px` $\times$ `92px`, `#cbd5e1` border, metallic inset shadows.
  - `.promptArrow`: `@keyframes retroBounce` (0.75s steps(2, jump-none) infinite).

---

### 2. Admissible Observed Payloads Register (`INV-PAYLOAD-01`)
In accordance with `INV-PAYLOAD-01`, test planning relies exclusively on observed, authentic codebase payloads, real stock patron profiles, verified cocktail recipes, and real error discrepancies. Synthetic mock fixtures, placeholder strings, or invented properties are strictly prohibited.

| Payload Identifier | Origin / Grounding | Structure & Authentic Values |
| :--- | :--- | :--- |
| `PAYLOAD-ORDER-ELDER` | Stock patron `patron_elder` ordering an Old Fashioned | `type: 'order'`, `characterId: 'patron_elder'`, `cocktail: { name: 'Old Fashioned', vessel: 'rocks', garnishes: ['orange_twist'], agitation: 'stirred', flavorNotes: 'bourbon, simple_syrup, angostura_bitters' }` |
| `PAYLOAD-ORDER-CAESAR` | Stock patron `caesar_9aea2cd1a4bf32d6` ordering a Negroni | `type: 'order'`, `characterId: 'caesar_9aea2cd1a4bf32d6'`, `cocktail: { name: 'Negroni', vessel: 'rocks', garnishes: ['orange_twist'], agitation: 'stirred', flavorNotes: 'gin, campari, sweet_vermouth' }` |
| `PAYLOAD-ORDER-TRUMP` | Stock patron `trump_ca36306f5c662816` ordering a Manhattan | `type: 'order'`, `characterId: 'trump_ca36306f5c662816'`, `cocktail: { name: 'Manhattan', vessel: 'coupe', garnishes: ['maraschino_cherry'], agitation: 'stirred', flavorNotes: 'rye_whiskey, sweet_vermouth, angostura_bitters' }` |
| `PAYLOAD-REJECTION-CAESAR-VESSEL` | Rejection payload when Caesar receives wrong glass | `type: 'rejection'`, `characterId: 'caesar_9aea2cd1a4bf32d6'`, `recipe: { name: 'Negroni', vessel: 'rocks', garnishes: ['orange_twist'], agitation: 'stirred' }`, `deliveredDrink: { vessel: 'coupe', ingredients: { gin: 1, campari: 1, sweet_vermouth: 1 }, rim: null, agitation: 'stirred', garnishes: ['orange_twist'] }`, `discrepancies: ['[GLS] Expected rocks, Got coupe']` |
| `PAYLOAD-REJECTION-ELDER-GARNISH` | Rejection payload when Elder misses required garnish | `type: 'rejection'`, `characterId: 'patron_elder'`, `recipe: { name: 'Old Fashioned', vessel: 'rocks', garnishes: ['orange_twist'], agitation: 'stirred' }`, `deliveredDrink: { vessel: 'rocks', ingredients: { bourbon: 2, simple_syrup: 0.25, angostura_bitters: 0.1 }, rim: null, agitation: 'stirred', garnishes: [] }`, `discrepancies: ['[GRN] Missing orange_twist']` |
| `PAYLOAD-REJECTION-MULTI-ERROR` | Rejection payload with multiple discrepancies | `type: 'rejection'`, `characterId: 'patron_elder'`, `recipe: { name: 'Martini', vessel: 'coupe', garnishes: ['olive'], agitation: 'stirred' }`, `deliveredDrink: { vessel: 'rocks', ingredients: { gin: 2.5, sweet_vermouth: 0.5 }, rim: null, agitation: 'shaken', garnishes: [] }`, `discrepancies: ['[GLS] Expected coupe, Got rocks', '[MTD] Expected stirred, Got shaken', '[GRN] Missing olive', '[ING] sweet_vermouth: Overpour (Not in Recipe)']` |
| `PAYLOAD-AUTH-FAIL-UNSET` | Missing `HF_TOKEN` configuration | `process.env.HF_TOKEN = ''` or `undefined` |
| `PAYLOAD-AUTH-FAIL-INVALID` | Invalid `HF_TOKEN` credentials | `process.env.HF_TOKEN = 'hf_invalid_token_xyz'` resulting in HTTP 401 from Hugging Face API |
| `PAYLOAD-PERSONA-MISSING` | Non-existent patron ID | `characterId: 'patron_nonexistent_999'` where no `personality.txt`, database row, or catalog entry exists |
| `PAYLOAD-MALFORMED-BODY` | Invalid JSON body | `{ type: 'order' }` (missing `characterId`) or `{ characterId: 'patron_elder' }` (missing `type`) |
| `PAYLOAD-MULTI-SEAT-ISOLATION` | Concurrent seating at `bar_seat_1` and `bar_seat_3` | `seat_1: { seatId: 'bar_seat_1', characterId: 'patron_elder' }`, `seat_3: { seatId: 'bar_seat_3', characterId: 'caesar_9aea2cd1a4bf32d6' }` |

---

### 3. Specification Oracles & Assertion Laws (`INV-ASSERTION-01`)
In strict adherence to `INV-ASSERTION-01` and `LANGUAGE.md`:
- All assertions test `{correct required outputs}` directly derived from `functional_specification_109.md` and locked tickets.
- Zero assertions test against handwritten, synthetic expected blobs.
- `{correctness}` is evaluated by schema compliance, exact status code alignment, uppercase string constraints, and fail-fast invariants.

#### Oracle 1: Backend Authentication & Live LLM Completion (AC1)
- When a valid `OrderDialoguePayload` or `RejectionDialoguePayload` is posted to `/api/dialogue` with a valid `HF_TOKEN`:
  - `{correct required outputs}`: HTTP status 200 OK. Response body contains:
    1. `dialogue`: A non-empty uppercase string satisfying $1 \le \text{length} \le 120$ characters, zero quotation marks (`"`, `'`), zero markdown/asterisks (`*`), exactly 1–2 sentences.
    2. `characterId`: Exactly matching payload `characterId`.
    3. `model`: String matching configured model (e.g. `Qwen/Qwen2.5-72B-Instruct`).
    4. `latencyMs`: Finite positive number $> 0$.
  - `{errors}`: HTTP 500 with unhandled crash, lowercase dialogue, markdown characters present, length $> 120$ characters, or synthetic placeholder string.

#### Oracle 2: Fail-Fast on Missing or Invalid Token (AC2)
- When `HF_TOKEN` is unset or empty:
  - `{correct required outputs}`: HTTP status 500 Internal Server Error. Structured JSON response:
    ```json
    {
      "error": "HF_TOKEN environment variable is not set or empty",
      "code": "HF_TOKEN_MISSING",
      "timestamp": "ISO-8601 string"
    }
    ```
  - Zero mock responses, canned strings, or simulated responses are emitted.
- When `HF_TOKEN` fails upstream authentication (HTTP 401):
  - `{correct required outputs}`: HTTP status 500 Internal Server Error with `code: 'HF_UPSTREAM_ERROR'`, structured error details, and non-zero exit/rejection.
  - `{errors}`: HTTP 200 returning fallback dialogue, silent console warnings without HTTP error, or game freeze.

#### Oracle 3: Deterministic Persona Resolution & Hierarchy (AC3, AC5)
- For stock patrons (`patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`):
  - `resolveAuthoritativePersona(characterId)` inspects `public/assets/patrons/{characterId}/personality.txt` and returns the exact file content (Elder: 183 bytes, Caesar: 166 bytes, Trump: 161 bytes).
- For custom patrons missing disk file:
  - Inspects PostgreSQL database `SELECT about_me FROM patrons WHERE id = $1`.
- When neither disk file nor database record exists:
  - `{correct required outputs}`: Immediately throws `PersonaNotFoundError` with `code: 'PERSONA_NOT_FOUND'` and `statusCode: 404`. API route surfaces HTTP 404 with structured JSON.
  - `{errors}`: Silent fallback to generic default persona for unknown patrons.

#### Oracle 4: Seating Completion Event (`onSitComplete`) Wiring & Order Dialogue Display (AC3)
- When `PatronLayer` completes walking animation and triggers `onSitComplete({ instanceKey, characterId, seatId })`:
  - `{correct required outputs}`:
    1. `seatOrders[seatId]` is registered in state with `status: 'ordered'`, `recipe: mode.getRecipeManager().getRandomTicket()`, and initial `orderDialogue: null`.
    2. An asynchronous HTTP POST is dispatched to `/api/dialogue` with `PAYLOAD-ORDER-*`.
    3. Upon 200 response, `seatOrders[seatId].orderDialogue` is populated and `activeDialogueSeat` is set to `seatId`.
    4. `<RetroRpgDialogueBox>` is mounted in the DOM inside `.pov-stage`, displaying:
       - `speakerName`: `requireCharacter(characterId).displayName` in gold pixel text.
       - `portraitSrc`: `talkSrcForCharacter(characterId)` or `sitSrcForCharacter(characterId)`.
       - `message`: `orderDialogue`.
  - `{errors}`: Patron sits down but remains silent; `onSitComplete` prop missing or uncalled; order ticket unassigned.

#### Oracle 5: Drink Delivery Interaction & Error-Aware Rejection Speech (AC4)
- When the player drags the active vessel (`.pov-active-vessel`) or clicks on a seated patron (`.pov-patron-sprite--sit`):
  - If drink validation fails (`discrepancies.length > 0`):
    - `{correct required outputs}`:
      1. `seatOrders[seatId].status` transitions to `'rejected'`.
      2. `errors` state updates with itemized discrepancies (`[GLS]`, `[RIM]`, `[MTD]`, `[ING]`, `[GRN]`).
      3. An asynchronous HTTP POST is dispatched to `/api/dialogue` with `type: 'rejection'` containing `discrepancies`.
      4. Upon 200 response, `rejectionDialogues[seatId]` is set, `activeDialogueSeat` is set to `seatId`.
      5. `<RetroRpgDialogueBox>` renders the character's rejection speech which specifically references the defect (e.g. glass or garnish).
  - If drink validation passes (`discrepancies.length === 0`):
    - `{correct required outputs}`:
      1. `seatOrders[seatId].status` transitions to `'served'`.
      2. Active dialogue for `seatId` is dismissed.
      3. `runSuccessHandoff()` executes with vessel animation.
  - `{errors}`: Seated patron ignores drag/drop or clicks; rejection dialogue does not mention discrepancies; success handoff fires on failed drink.

#### Oracle 6: Diegetic Retro Presentation & Typewriter Animation Timing (AC5, AC6)
- Inside `<RetroRpgDialogueBox>`:
  - `{correct required outputs}`:
    1. Rendered inside `.pov-stage` with `.wrapper` positioned at bottom, `z-index: 50`.
    2. Dual white border, navy background (`#09133b`), four corner loops SVG, metallic portrait frame (`92px` $\times$ `92px`), and gold speaker name (`#f7ca18`).
    3. Typewriter animation reveals characters at 35ms cadence, adding +120ms pause on punctuation (`.`, `!`, `?`).
    4. When typing finishes, prompt arrow appears with bouncing `@keyframes retroBounce`.
    5. Clicking anywhere during typewriter reveals full text immediately; clicking after typing completes invokes `onDismiss` and unmounts the box.
  - `{errors}`: Text appears all at once without typewriter; punctuation pauses missing; click does not skip or dismiss; prompt arrow fails to bounce.

#### Oracle 7: Multi-Seat Concurrency Isolation & Premature Departure
- When patrons are seated concurrently at multiple seats (`bar_seat_1` and `bar_seat_3`):
  - `{correct required outputs}`:
    1. `seatOrders` maintains distinct dictionary keys for each seat without state overwrites.
    2. An order or rejection line arriving for `bar_seat_1` does not modify `bar_seat_3`.
    3. If patron at `bar_seat_1` begins leaving, `activeDialogueSeat === 'bar_seat_1'` resets to `null`, cleanly unmounting the dialogue window.
  - `{errors}`: Seat 1 order overwriting Seat 3; orphan dialogue remaining open after patron has left the bar.

---

## Component Boundary & Verification Governance (`INV-BOUNDARY-01`)

1. **Strict Coding Gate:**
   - Implementation coding gate remains locked.
   - Zero test execution code, test fixtures, synthetic parsers, or dummy payloads are generated in this session.
   - Execution waits on explicit operator authorization.
2. **Deterministic Frontier Closure:**
   - With this ticket claimed and resolved, all test decision requirements for FS109 are mapped, grounded in real schemas, and governed under zero-mock invariants.

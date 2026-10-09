# Wayfinder Map: FS109 Hugging Face LLM Dialogue Node: Dynamic In-Character Cocktail Ordering, Error-Aware Rejection Speech, and Retro Dialogue Presentation

## Destination
Establish an exhaustive, verified architectural decision roadmap and master component edit plan detailing the backend API routing, Hugging Face Inference client authentication, fail-fast error telemetry, deterministic persona resolution hierarchy, system prompt invariants, in-character order dialogue generation on seating completion, error-aware rejection speech on recipe validation failure, diegetic retro RPG dialogue box component integration, typewriter animation timing, and multi-seat concurrency isolation required across the codebase to transition patrons from silent visual entities into reactive, distinct verbal personalities rendered through an authentic 16-bit RPG dialogue interface.

## Notes
- **Governing Specification:** `functional_specification_109.md` (FS109 — Hugging Face LLM dialogue node: Dynamic in-character cocktail ordering, error-aware rejection speech, and retro dialogue presentation)
- **Run ID:** `20261009T230349-536-rqj9`
- **Domain:** AI dialogue generation service, Hugging Face Inference API, prompt file resolution, system instruction formatting, seating event listeners, drink recipe validation integration, diegetic retro UI components, and pixel font presentation.
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-BOUNDARY-01`: Planning node produces architectural decisions and edit matrices without application code execution.
  - `INV-MAP-01`: Monotonic ticketing inside run directory (`ticket-001.md` through `ticket-005.md`) using human-readable titles.
  - `INV-ATOMIC-01`: Discrete, atomic decision tickets resolving one architectural question each.
  - `INV-FAILFAST-01`: Fail fast without silent exception handling, mock fallbacks, or simulated hardcoded responses.
  - `INV-HANDOFF-01`: Deterministic manifest overwrite at `handoff/20261009T230349-536-rqj9/wayfinder-read-and-plan.txt`.

## Decisions so far
- [Hugging Face Inference Backend Service & Fail-Fast Authentication Architecture (ticket-001.md)](./tickets/ticket-001.md) — Establish `src/app/api/dialogue/route.ts` and `src/lib/hfDialogueService.ts` targeting `https://router.huggingface.co/v1/chat/completions` using server credentials (`process.env.HF_TOKEN`), enforcing a 4000ms upstream abort signal, and raising immediate structured non-zero error telemetry (`HF_TOKEN_MISSING`, `HF_UPSTREAM_ERROR`) with zero mock fallbacks.
- [Deterministic Patron Persona Resolution & System Instruction Governance (ticket-002.md)](./tickets/ticket-002.md) — Standardize prompt resolution hierarchy in `src/data/characterDialogue.ts` to inspect local disk (`public/assets/patrons/{characterId}/personality.txt`) then fallback to PostgreSQL database record (`patrons.about_me`), failing fast with `PERSONA_NOT_FOUND` if neither exists, and locking system instruction invariants (strict persona adherence, Obelisco bar setting immersion, 1–2 uppercase sentences, max 120 chars, zero markdown, zero quotation marks).
- [Seating Transition (`onSitComplete`) Wiring & In-Character Drink Order Generation (ticket-003.md)](./tickets/ticket-003.md) — Wire `onSitComplete` callback in `src/app/page.tsx` from `<PatronLayer>`, bind newly seated patrons to deterministic cocktail tickets generated via `mode.getRecipeManager().getRandomTicket()`, maintain isolated per-seat order states, dispatch asynchronous order dialogue requests to the backend service, and render in-character order dialogue upon arrival.
- [Drink Delivery Interaction & Error-Aware Rejection Speech Dispatch Architecture (ticket-004.md)](./tickets/ticket-004.md) — Implement dual drink delivery mechanisms (drag-and-drop from `.pov-active-vessel` and direct click on `.pov-patron-sprite--sit`), execute recipe validation against the patron's assigned ticket using `validateDrink(state, recipe)`, trigger success handoffs on perfect builds, and dispatch itemized validation discrepancies (`[GLS]`, `[RIM]`, `[MTD]`, `[ING]`, `[GRN]`) to `/api/dialogue` to verbalize contextual rejection speech.
- [Diegetic Retro RPG Dialogue Box Stage Integration & Typewriter Presentation (ticket-005.md)](./tickets/ticket-005.md) — Port `retro_rpg_dialogue_box.html` into a reusable React component (`src/components/RetroRpgDialogueBox.tsx`) mounted inside `.pov-stage`, featuring gold pixel typography (`var(--font-press-start)`, `#f7ca18`), metallic portrait frame (`talk.png`/`sit.png`), authentic 30–40ms typewriter cadence with punctuation delays, bouncing downward prompt arrow, and click-to-advance dismissal.

## Not yet specified
*(None. All architectural, routing, error telemetry, persona resolution, drink delivery, and retro presentation decisions required for FS109 are fully specified, verified, and locked across decision tickets ticket-001.md through ticket-005.md and required_edits_109.md).*

## Out of scope
- Modifying sprite generation skills (`scripts/patron-pipeline/skills/*`) or image model prompt architectures.
- Altering visual scale, spawn origins, or bar stool seating anchors calibrated under FS107.
- Modifying drink crafting recipes, glass pouring physics, or checkout receipt generation.
- Client-side patron signup form enhancements calibrated under FS108.

# FS109 — Hugging Face LLM dialogue node: Dynamic in-character cocktail ordering, error-aware rejection speech, and retro dialogue presentation

## Purpose

Establish required product `{functionality}` for a dedicated AI dialogue generation service powered by the Hugging Face Inference API, enabling barroom patrons to dynamically deliver in-character drink orders upon taking their seats and verbalize contextual, personality-driven rejection speech when served an incorrect cocktail.

This replaces static, silent, or repetitive character states with reactive, distinct verbal personalities rendered through an authentic retro RPG dialogue box interface.

**Prior:**
- [functional_specification_107.md](./functional_specification_107.md) (Patron visual scale, spawn origin, and bar stool seating standardization)
- [functional_specification_108.md](./functional_specification_108.md) ("Join the bar!" configuration refinement and character prompt file generation)
- [functional_specification_97.md](./functional_specification_97.md) (Stock patron visual parity & fallback anchors)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|:---|:---|
| **Hugging Face LLM Dialogue Node** | The backend service responsible for communicating with the Hugging Face Inference API using configured credentials to generate character dialogue. |
| **In-Character Order Dialogue** | A short, personality-rich natural language statement spoken by a newly seated patron requesting their assigned cocktail recipe. |
| **Error-Aware Rejection Speech** | Dynamic dialogue verbalized by a patron when an invalid drink is served, explicitly referencing the precise preparation discrepancy in character. |
| **Prompt File Resolution** | The deterministic loading of a patron's authoritative `personality.txt` file from disk or database to configure the LLM system prompt. |
| **Retro Dialogue Box View** | The diegetic UI component modeled after 16-bit RPGs that displays the speaker name, character portrait, animated typewriter text, and prompt arrow. |
| **Fail-Fast Dialogue Invariant** | In strict accordance with system rules, the requirement that any missing credentials, network failures, or API errors surface explicit fatal telemetry immediately, with zero silent fallbacks or hardcoded placeholder speech. |

---

## Current Baseline & Observed `{errors}`

### Current Architecture Limitations
1. **Silent / Non-Communicative Patrons**:
   - When patrons walk to a stool and transition to the seated phase, they remain completely silent.
   - Patrons have no mechanism to declare what drink they desire, forcing the player to guess or rely on disconnected receipt controls.
2. **Missing In-Game Feedback for Failed Service**:
   - Currently, drink validation occurs only via an external receipt toolbar button without character interaction.
   - Serving a drink to a character produces zero verbal reaction, emotional expression, or in-world feedback.
3. **Disconnected Prototype Dialogue Box**:
   - The standalone [retro_rpg_dialogue_box.html](file:///Users/diesel/Desktop/bartending/Bartending/retro_rpg_dialogue_box.html) asset exists as an isolated HTML demo file and is not yet integrated into the active game canvas.

---

## Desired `{functionality}`

### 1. Hugging Face Inference Service Integration
- **Server-Side Credentials & Model Binding**:
  - The dialogue service must authenticate against the Hugging Face Inference API using the repository-configured environment variable (`HF_TOKEN`).
  - The service must target an instruction-tuned conversational model endpoint suitable for rapid low-latency character dialogue generation.
- **Fail-Fast Telemetry**:
  - If `HF_TOKEN` is unset, empty, or fails authentication, the node must immediately return a structured, non-zero error status with explicit diagnostic details.
  - Silent exception swallowing, simulated hardcoded responses, or arbitrary default fallbacks are strictly prohibited.

### 2. Prompt File Resolution & System Context
- **Patron Persona Resolution**:
  - Prior to dispatching a completion request, the system must resolve the patron's authoritative prompt file (`public/assets/patrons/{characterId}/personality.txt`).
  - If the prompt file is missing on disk, the system must attempt resolution via the patron's relational database record (`about_me`), failing fast with an explicit error if neither exists.
- **System Instruction Invariants**:
  - The system prompt must enforce:
    1. Full adherence to the character's persona defined in `personality.txt`.
    2. Strict setting immersion (seated at Obelisco bar).
    3. Output formatting constraint: exactly 1 to 2 short sentences, all uppercase, maximum 120 characters, zero markdown syntax, zero quotation marks.

### 3. In-Character Drink Order Generation
- **Trigger**:
  - Automatically fired when a walking patron reaches their assigned bar stool and fires the seating transition event (`onSitComplete`).
- **Prompt Inputs**:
  - Character persona (`personality.txt`).
  - Assigned cocktail recipe details: cocktail name, glass vessel, primary flavor notes, and garnish.
- **Output Requirements**:
  - An authentic, in-character line requesting the drink without reciting raw technical recipe schemas (e.g. Caesar: *"BRING ME A NEGRONI IN A CHILLED ROCKS GLASS, WITH A WIDE ORANGE TWIST. PROMPTLY."* vs. Elder: *"A NEGRONI TONIGHT. AND DON'T FORGET THE BITTERS, KID."*).

### 4. Error-Aware Rejection Speech Generation
- **Trigger**:
  - Automatically fired when a player drags and drops a drink onto a seated patron that fails recipe validation.
- **Prompt Inputs**:
  - Character persona (`personality.txt`).
  - Target recipe name and expected attributes.
  - User's delivered drink attributes.
  - The specific, itemized validation failure list generated by the recipe validator (e.g. `[GLS] Expected Coupe, Got Rocks`, `[GRN] Missing Maraschino Cherry`, `[ING] Gin: Overpour`).
- **Output Requirements**:
  - An in-character line expressing rejection while specifically calling out the observed defect (e.g. Caesar: *"YOU DARE HAND ME A ROCKS GLASS? THIS COCKTAIL CALLS FOR A COUPE!"* or Elder: *"WHERE IS THE MARASCHINO CHERRY? TASTES LIKE WATER WITHOUT IT."*).

### 5. Retro RPG Dialogue Box Integration
- **Diegetic Presentation on Stage**:
  - The dialogue generated by the Hugging Face node must render in the retro RPG dialogue window on the game screen.
- **Visual & Interactive Features**:
  - **Speaker Name**: Displayed in gold pixel font (`#f7ca18`) with black drop shadow.
  - **Portrait Display**: Displays the seated patron's facial portrait (`talk.png` or `sit.png`) within the metallic beveled frame.
  - **Animated Typewriter**: Characters appear incrementally at authentic retro speeds (30–40ms/char) with natural pauses at punctuation.
  - **Prompt Arrow**: An animated bouncing downward triangle appears upon typewriter completion.
  - **Click-to-Advance**: Clicking anywhere on the dialogue box instantly completes in-flight text or dismisses the completed box.

---

## Edge Cases & Behavioral Boundaries

1. **Hugging Face Upstream Latency / Rate Limits**:
   - If the Hugging Face API exceeds a configured timeout threshold (e.g., 4000ms) or returns an HTTP 429/503 status, execution must surface an explicit dialogue error event to telemetry rather than freezing the game loop.
2. **Concurrent Dialogue Across Multiple Seats**:
   - When multiple patrons are seated concurrently, each patron's dialogue state must be strictly isolated. An order request or rejection line generated for `bar_seat_1` must never overwrite or collide with the dialogue box of `bar_seat_3`.
3. **Empty or Truncated LLM Response**:
   - If the model returns an empty string or malformed payload, the dialogue validator must catch the error immediately and emit an explicit failure record.
4. **Dialogue Dismissal on Premature Departure**:
   - If a patron begins leaving the bar, any active dialogue box assigned to that patron must immediately close cleanly.

---

## Acceptance Criteria & Success Verification

| ID | Criterion | Measurable Verification |
|:---|:---|:---|
| **AC1** | **HF Node Authentication** | Backend dialogue route successfully authenticates using `HF_TOKEN` and completes test prompts. |
| **AC2** | **Fail-Fast on Missing Token** | When `HF_TOKEN` is unset, the dialogue service immediately raises a fatal HTTP 500/503 with explicit error telemetry. Zero mock fallbacks. |
| **AC3** | **Order Dialogue Generation** | Seating at a bar stool invokes the HF node with the assigned recipe and displays an in-character order string in the dialogue box. |
| **AC4** | **Error-Aware Rejection Speech** | Delivering an incorrect drink with recipe errors (e.g. wrong vessel) generates a dialogue response that explicitly names the discrepancy. |
| **AC5** | **Retro Presentation Parity** | Dialogue displays with matching styling from `retro_rpg_dialogue_box.html`: dual white border, corner loops, silver portrait frame, gold speaker name, and bouncing prompt arrow. |
| **AC6** | **Typewriter Animation Timing** | Text renders character-by-character at 30–40ms cadence, with punctuation delays, and immediate completion upon click. |

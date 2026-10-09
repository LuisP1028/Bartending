# FS108 — "Join the bar!" configuration refinement: "About Me" bio capture and character prompt file generation

## Purpose

Establish required product `{functionality}` to expand the in-game patron registration workflow ("Join the bar!") with an "About Me" personality profile section, ensuring every newly registered patron possesses an authoritative, file-backed personality prompt document that governs their conversational demeanor, vocabulary, and behavioral quirks for AI-driven dialogue generation.

This eliminates the limitation where custom registered patrons possess only visual art without individual personalities, causing all custom characters to either share generic dialogue or lack distinct voices at the bar counter.

**Prior:**
- [functional_specification_94.md](./functional_specification_94.md) (Join selfie drives full generative patron pipeline)
- [functional_specification_95.md](./functional_specification_95.md) (Patron pipeline folder contracts and CLI)
- [functional_specification_105.md](./functional_specification_105.md) (Autonomous in-game patron generation)
- [functional_specification_106.md](./functional_specification_106.md) (Cloud asset storage & relational persistence)
- [functional_specification_107.md](./functional_specification_107.md) (Patron visual scale, spawn origin, and bar stool seating standardization)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|:---|:---|
| **"About Me" Bio** | User-submitted descriptive text capturing a character's persona, attitude, conversational tone, quirks, and drink preferences during registration. |
| **Character Prompt File (`personality.txt`)** | An authoritative, durable text document generated in the character's storage folder that compiles their identity, background, and behavioral rules into a structured system prompt for LLM consumption. |
| **Durable Persona Record** | The relational database persistence of the character's "About Me" bio and prompt configuration alongside their visual assets and contact records. |
| **Stock Persona Parity** | The requirement that all hardcoded stock characters (Elder, Caesar, Trump) possess standardized prompt files matching the format generated for custom patrons. |
| **Unvoiced Patron Defect** | The defect state where a registered patron exists visually in the scene but lacks any personal system prompt or bio, resulting in empty, generic, or broken dialogue calls. |

---

## Current Baseline & Observed `{errors}`

### Current Registration Limitations
1. **Visual-Only Character Capture**:
   - The current "Join the bar!" registration form captures only `name`, `email`, `phone`, and a portrait photograph.
   - No interface exists for users to define who their character is, how they speak, what mood they bring to the bar, or what drinks they favor.
2. **Missing Persona Artifacts in Patron Storage**:
   - The registration endpoint and patron folder manager generate `meta.json` containing only identifiers and contact hashes.
   - No prompt file is generated or stored alongside the visual assets in the character's folder.
3. **Hardcoded Stock Dialogue Divergence**:
   - Hardcoded characters rely on static system prompts hardcoded in code catalogs rather than file-backed prompt assets, creating a divergence between how built-in characters and dynamic patrons are managed.

---

## Desired `{functionality}`

### 1. "Join the bar!" Form Expansion
- **"About Me" Profile Section**:
  - The in-game registration modal must provide a dedicated, prominent "About Me" multi-line text input field.
  - Clear descriptive guidance must prompt the user to describe their patron's personality, conversational tone, quirks, or cocktail preferences (e.g., *"Grumpy retired sailor who loves bitter drinks"*, *"Excitable futuristic tourist who wants something neon"*).
- **Validation & Input Constraints**:
  - The bio field must require a minimum meaningful length (e.g., at least 10 non-whitespace characters) and enforce a reasonable upper boundary (e.g., up to 500 characters) to ensure sufficient context for prompt construction without exceeding LLM context windows.
  - Submitting without satisfying the bio requirement must prevent submission and surface a clear, readable validation message.
- **Multipart Payload Inclusion**:
  - The submission payload dispatched to the backend registration handler must include the sanitized `aboutMe` text alongside the existing name, contact, and image file data.

### 2. Character Prompt File Generation
- **Authoritative Prompt File Creation (`personality.txt`)**:
  - Upon receiving a valid registration request, the system must deterministically compile the patron's display name and "About Me" bio into an authoritative text file:
    ```
    public/assets/patrons/{characterId}/personality.txt
    ```
- **Prompt Structure & Invariants**:
  - The generated prompt file must contain:
    1. **Identity & Setting Directives**: Explicit instructions establishing that the character is seated at Obelisco, a vintage cocktail bar.
    2. **Tone & Mannerisms**: Directives grounded in the user's provided bio dictating how the character speaks, reacts, and interacts with the bartender.
    3. **Retro Output Formatting Rules**: Instructions mandating concise, 1–2 sentence responses suitable for display in an authentic retro dialogue box (under 120 characters, all-caps or retro arcade phrasing).
    4. **Safety & In-Character Integrity**: Strict instructions forbidding out-of-character AI disclaimers, meta-commentary, or markdown syntax.
- **Staging & Public Directory Parity**:
  - When staging folders are created during art generation, the prompt file must be mirrored in the staging directory alongside `meta.json`.

### 3. Durable Persona Persistence in Relational Storage
- **Metadata Record Ingestion**:
  - The patron's `meta.json` must be updated to store `aboutMe` as an explicit field.
- **Relational Database Synchronization**:
  - When database persistence is active, the `patrons` table record must store the `about_me` text and a flag indicating prompt file readiness.
- **Cloud Asset Synchronization**:
  - During cloud asset synchronization (GCS), the `personality.txt` file must be published alongside the sprite PNGs so cloud-backed rosters maintain persona parity across environments.

### 4. Stock Patron Prompt File Normalization
- All built-in stock characters (`patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`) must have corresponding, standardized `personality.txt` files placed in their respective asset directories, guaranteeing that stock and dynamic patrons follow the exact same prompt resolution mechanism.

---

## Edge Cases & Behavioral Boundaries

1. **Submission with Special Characters or PII in Bio**:
   - If a user inputs quotes, emojis, or markdown characters in their "About Me" text, the prompt generation engine must sanitize inputs to prevent prompt injection or broken file encodings.
2. **Missing or Corrupted Prompt File on Disk**:
   - If a custom patron exists on disk or in the database without a `personality.txt` file (e.g. legacy patrons registered prior to this feature), the system must dynamically generate the missing `personality.txt` from their stored database bio or default personality profile upon first access.
3. **Registration Without Image Generation**:
   - If a user creates a patron folder with `runPipeline=false` (folder + meta only), the `personality.txt` file must still be generated immediately so the patron's identity is fully formed.
4. **Offline / Disconnected Operation**:
   - Prompt file generation must be entirely local and deterministic, requiring zero external network calls or third-party API dependencies during registration.

---

## Acceptance Criteria & Success Verification

| ID | Criterion | Measurable Verification |
|:---|:---|:---|
| **AC1** | **"About Me" Form Input** | The "Join the bar!" registration modal renders an "About Me" textarea field with validation enforcing input boundaries (10–500 chars). |
| **AC2** | **Prompt File Generation** | Successful patron registration produces a valid `personality.txt` file inside `public/assets/patrons/{characterId}/`. |
| **AC3** | **Prompt Content Invariants** | The generated `personality.txt` contains the character's display name, the user's "About Me" content, barroom setting context, and retro output length rules. |
| **AC4** | **Metadata Persistence** | `meta.json` inside the patron folder contains the `aboutMe` string attribute matching the submitted form value. |
| **AC5** | **Stock Patron Parity** | `personality.txt` exists in the asset directories for Elder, Caesar, and Trump, conforming to the same prompt format. |
| **AC6** | **Deterministic Local Execution** | Prompt file synthesis completes in $< 50\text{ms}$ synchronously during registration with zero external API calls. |

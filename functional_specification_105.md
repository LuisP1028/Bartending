# FS105 — End-to-end in-game "Join the bar" patron generation and automatic spawn availability

## Purpose

Establish required product `{functionality}` enabling players to complete the in-game "Join the bar!" registration flow (providing an alias, contact info, and a selfie photo) such that the system autonomously generates a complete patron visual asset pack, registers the patron into the active runtime pool, and renders them spawnable and seated at the bar counter during live gameplay.

This eliminates the defect condition where the automated in-game generation flow fails, stalls, or times out, forcing operators to bypass the game interface and manually invoke the generative pipeline script from a command-line terminal.

**Prior:**
- [functional_specification_94.md](./functional_specification_94.md) (Join selfie drives full generative patron pipeline)
- [functional_specification_95.md](./functional_specification_95.md) (Join register must reach full generative --run)
- [functional_specification_96.md](./functional_specification_96.md) (No ghost patrons without ready pack)
- [functional_specification_98.md](./functional_specification_98.md) (Runtime-only join character storage)
- [functional_specification_104.md](./functional_specification_104.md) (Patron arrival seating persistence)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|:---|:---|
| **Join the Bar** | In-game player feature accessed through the Game Boy Comm-Link interface allowing a player to input identity details, take or upload a selfie, and request patron creation. |
| **Ready Pack** | The required set of four verified, non-empty transparent patron visual assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) saved to accessible storage on the application host. |
| **Automated Generation Pipeline** | The multi-stage visual transformation process that accepts a captured source selfie, produces styled 8-bit character views (`head_on`, `profile`, `sit`, `talk`, `walk_01`, `walk_02`), applies background removal, and outputs the ready pack. |
| **Runtime Roster** | The active collection of spawnable patrons maintained during server execution, encompassing built-in stock patrons and dynamically registered join patrons. |
| **Ghost Patron** | An invalid state wherein a character record exists in the spawn pool or roster without a corresponding, verified ready pack on disk, resulting in missing or invisible character rendering in the game. |
| **Manual CLI Workaround** | The historical fallback procedure wherein an operator had to leave the game interface, open a terminal shell, and manually invoke the pipeline script with command-line arguments to produce character assets. |

---

## Current Functionality & Observed `{errors}`

### Current Player & Operator Experience
1. **In-Game Submission Stalling**:
   - When a player navigates to the "Join the bar!" interface, enters their name and contact information, captures a selfie, and selects "Use Photo", the interface transitions to a generating state.
   - In live testing, this automated request consistently fails to complete successfully: it either terminates with a generation failure error, hangs until the client polling timer expires (timeout), or exits without producing the required visual assets.
2. **Missing Ready Pack & Omission from Game**:
   - Because the background process fails to produce the verified ready pack on disk, the system's readiness checks properly prevent the character from being marked as ready.
   - Consequently, the newly registered player never appears in the runtime roster and is never spawned into the active barroom scene.
3. **Reliance on Manual CLI Execution**:
   - To successfully bring a new patron into the game, operators have had to bypass the web interface entirely and manually execute the command-line script in a local terminal (`node scripts/patron-pipeline/generate-patron-assets.mjs --run ...`).
   - Only manual terminal runs have been capable of driving the pipeline to completion, installing the asset pack, and enabling the patron to appear in-game.

---

## Desired `{functionality}`

### 1. Autonomous In-Game Initiation
- A player must be able to complete the entire registration workflow from within the game UI:
  1. Open the Comm-Link "Join the bar!" screen.
  2. Enter their alias (display name) and at least one contact channel (email or phone).
  3. Snap a live photo via their device camera or select a local photo file.
  4. Submit the photo to initiate character creation.
- Submitting the photo with character creation intent must autonomously start the full generative asset pipeline without requiring any manual developer intervention, terminal commands, or server restarts.

### 2. Reliable Background Generation Execution
- The system must reliably execute all pipeline stages in the background:
  - Securely store and format the source photo.
  - Execute all six transformation stages (`head_on` $\rightarrow$ `profile` $\rightarrow$ `sit` $\rightarrow$ `talk` $\rightarrow$ `walk_01` $\rightarrow$ `walk_02`).
  - Perform background removal on the stage outputs to produce transparent sprites for `sit`, `talk`, `walk_01`, and `walk_02`.
  - Install the resulting ready pack to host storage.
- The pipeline execution must run to completion under server runtime conditions, properly managing process lifecycle, memory, working directories, and environmental credentials.

### 3. Clear, Non-Blocking Player UX & Status Feedback
- While generation is in progress:
  - The UI must provide clear visual feedback indicating that character generation is actively proceeding.
  - The Game Boy navigation shell must remain responsive; player navigation (such as pressing B to return to mode selection or menus) must not crash or corrupt the in-flight generation task.
  - The client must poll generation status at regular intervals and reflect meaningful progress updates.
- Upon completion:
  - If generation succeeds, the interface must display a clear confirmation showing the patron alias and readiness confirmation.
  - If generation fails (e.g. missing API keys, upstream generation failure, or processing timeout), the interface must surface a descriptive, user-readable explanation of the failure rather than a generic hang or crash, allowing the player to safely exit.

### 4. Zero Ghost Patrons & Strict Readiness Verification
- A newly generated patron must be admitted into the spawnable runtime roster if and only if all four assets of the ready pack (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) are verified to exist as non-empty, valid image files on host disk.
- If any stage of generation fails or produces incomplete files, the system must never add the character to the active roster, completely preventing ghost (invisible) patrons.

### 5. Instant In-Game Availability
- As soon as a join-generated patron's ready pack is verified and added to the runtime roster:
  - The live barroom simulation must discover the new character on its next roster refresh.
  - The character must immediately become eligible for auto-fill selection and bar stool seating during gameplay alongside built-in stock patrons.
  - The character's walking and seated animations must render accurately using the newly generated sprites without requiring a browser page reload, server reboot, or application rebuild.

---

## Edge cases & behavioral boundaries

1. **Missing or Invalid Generation Credentials**:
   - If required image generation API credentials are missing, invalid, or exhausted, the system must immediately reject or fail the job with a specific, intelligible error message. It must never initiate a silent hanging task or attempt to create empty files.
2. **Concurrent User Registrations**:
   - If multiple players submit selfies concurrently or in rapid succession, each registration must be assigned an isolated job identity, dedicated staging paths, and independent execution tracking. Concurrent jobs must not overwrite one another's intermediate files or corrupt the shared runtime roster.
3. **Session Interruption & Client Navigation**:
   - If a player closes the browser tab, loses network connection, or switches game modes while their generation is running, the server-side generation job must continue uninterrupted until completion or terminal failure. The resulting character, if successfully completed, must still be persisted to the runtime roster.
4. **Invalid or Unprocessable Images**:
   - If a submitted image is corrupt, empty, or cannot be decoded, the system must catch the validation error early, reject the submission with an actionable message, and avoid spawning background processes.
5. **Host Storage Ephemerality**:
   - Runtime joiner assets and roster records must be managed cleanly on the host disk, with roster queries consistently verifying the physical existence of the ready pack before returning characters to the game client.

---

## Acceptance criteria

| ID | Criteria | Desired Outcome |
|:---|:---|:---|
| **AC1** | **Autonomous In-Game Generation** | Submitting a photo and identity via "Join the bar!" triggers and fully executes background asset generation without any manual CLI terminal command. |
| **AC2** | **Ready Pack Completeness** | Generation reliably produces all four required sprite assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) on the host filesystem. |
| **AC3** | **Readiness Gating & Ghost Prevention** | A patron is only added to the active roster once all four ready pack assets exist and are verified; failed jobs produce zero ghost entries. |
| **AC4** | **Immediate Gameplay Discovery** | Successfully generated patrons appear in the live barroom simulation, walk into the bar, and occupy bar seats without requiring a server reboot, redeploy, or page reload. |
| **AC5** | **User-Facing Status & Error Clarity** | The player UI displays clear in-progress feedback during generation and surfaces definitive, readable error messages if generation cannot proceed. |
| **AC6** | **Stock Patron Preservation** | The automated registration and runtime roster integration does not disrupt or degrade the spawning, walking, or seating behavior of built-in stock patrons (Elder, Caesar, Trump). |

---

## Instruction to Coding Assistant

The coding assistant is instructed to:
1. **Trace the End-to-End Execution Path**:
   - Inspect the entire workflow from the client-side capture component through the server registration endpoint, background execution manager, pipeline orchestrator, background removal module, asset storage, and runtime roster loader.
2. **Identify Root Causes of In-Game Execution Failures**:
   - Pinpoint the exact technical discrepancies between manual CLI execution (`generate-patron-assets.mjs --run`) and programmatic in-game execution (spawned via the web server handler).
   - Evaluate process execution context, working directories, environment variable transmission (such as API keys), process lifecycle/timeouts, output stream buffering, and error propagation.
3. **Formulate Architectural Plan**:
   - Produce a detailed architectural analysis and required edits document explaining how the in-game pipeline execution will be made robust, deterministic, and fully integrated with the live game simulation.
   - Do not write implementation code until the plan and required edits are fully vetted and authorized.

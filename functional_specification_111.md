# FS111 — Mode selection menu "Join the bar!" personality capture and registration workflow completion

## Purpose

Establish required product `{functionality}` ensuring that selecting **"JOIN THE BAR!"** from the mode selection menu provides a dedicated personality / "About Me" input within the in-screen registration terminal and carries that personality description through the entire registration workflow, enabling users to successfully add themselves as playable patrons in the bar without encountering a registration error.

This eliminates the workflow defect where the mode selection menu's registration flow collects only an alias, contact address/number, and camera portrait while omitting the required personality bio—resulting in a rejected registration request when the user confirms their captured photo.

The coding assistant is instructed to independently inspect the codebase, trace the mode selection menu registration workflow and submission pipeline, and identify all necessary edits to achieve these functional outcomes. This document specifies desired `{functionality}`, inputs, outputs, behavioral constraints, edge cases, and acceptance criteria only; it contains no implementation guidance, component breakdowns, code sketches, or architectural prescriptions.

**Prior:**
- [functional_specification_89.md](./functional_specification_89.md) (Join the bar! Comm-Link → Camera → character pipeline workflow)
- [functional_specification_90.md](./functional_specification_90.md) (Join the bar! terminal containment within the console screen glass)
- [functional_specification_93.md](./functional_specification_93.md) (Comm-Link focus zoom prevention and D-pad field navigation)
- [functional_specification_105.md](./functional_specification_105.md) (Autonomous in-game patron generation)
- [functional_specification_108.md](./functional_specification_108.md) ("Join the bar!" "About Me" bio capture and character prompt file generation)
- [functional_specification_109.md](./functional_specification_109.md) (Dynamic in-character dialogue driven by patron personality prompts)

**DO NOT CODE from this document alone.** Wait for architectural planning, required edits documentation, and explicit operator authorization.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|:---|:---|
| **Mode Selection Menu** | The primary console menu presenting game mode choices (Obelisco, Classics) alongside navigation options including **"JOIN THE BAR!"**, **"WARP DIAGNOSTICS"**, and **"TERMINATE UPLINK"**. |
| **Comm-Link Registration Terminal** | The first interactive stage of the **"JOIN THE BAR!"** workflow displayed within the console screen, where the player enters their identity and persona details prior to launching the camera stage. |
| **Visual Uplink (Camera Stage)** | The second interactive stage of the **"JOIN THE BAR!"** workflow where the player captures and confirms a portrait photograph to trigger patron registration and character generation. |
| **Personality Bio ("About Me")** | User-authored text describing the patron's persona, attitude, speaking style, quirks, or drink preferences used as the authoritative source of truth for their in-game character personality. |
| **Console Shell Navigation** | Hardware-style directional (D-pad), confirm (A), and back (B) controls—alongside keyboard, mouse, and touch interactions—used to navigate and submit controls inside the console screen. |

---

## Current Baseline & Observed `{errors}`

### Observed `{errors}`
1. **Missing Personality Input in the "JOIN THE BAR!" Menu Flow**:
   - When the user activates **"JOIN THE BAR!"** from the mode selection menu, the Comm-Link registration terminal only provides input fields for the user's **Alias** and **Email or Comm-Number**.
   - There is no input field allowing the user to enter their character's personality / "About Me" description during this flow.
2. **Registration Failure Upon Photo Confirmation**:
   - Because the backend registration contract requires a valid personality description (10 to 500 characters) to establish the patron's authoritative personality record, submitting the registration request at the end of the camera capture stage fails immediately with a missing personality bio error.
   - Users attempting to join the bar through the mode selection menu are completely blocked from registering and generating their character in-game.

---

## Desired `{functionality}`

### 1. Personality Input in the "JOIN THE BAR!" Comm-Link Stage
- **Dedicated Personality Field**:
  - When **"JOIN THE BAR!"** is selected from the mode selection menu, the Comm-Link registration terminal must present a dedicated input box for the user's **Personality / About Me** description alongside the existing **Alias** and **Email or Comm-Number** inputs.
  - The field must include clear labeling and placeholder guidance prompting the user to describe their character's persona, conversational tone, quirks, or drink preferences.
  - A live character length indicator or clear boundary feedback must inform the user of the permitted length limits (up to 500 characters).
- **Visual & Containment Parity**:
  - The personality input must match the synthwave terminal visual presentation of the Comm-Link screen and remain cleanly contained within the console playfield glass across both portrait and landscape viewports without clipping or overflowing outside the screen boundaries.
  - Focusing or typing into the personality input on mobile devices (including iOS Safari) must not trigger involuntary browser viewport zoom-in, preserving full console screen stability.

### 2. Console D-Pad, Keyboard, and Pointer Navigation
- **Unified Focus Cycle**:
  - The interactive focus cycle within the Comm-Link terminal must include the new personality input in natural top-to-bottom sequence:
    1. **Alias** input
    2. **Email or Comm-Number** input
    3. **Personality / About Me** input
    4. **Transmit Data** submission control
  - Navigating with the console D-pad (up/down/left/right) or keyboard arrow keys must cycle focus deterministically across all four controls with a clear visual focus indicator on the active control.
  - Pressing the console **A** button must focus the active input field or trigger form submission when the **Transmit Data** control is focused.
  - Pressing the console **B** button, pressing `Escape`, or activating the **Abort** control must exit the Comm-Link terminal back to the mode selection menu as established by prior specifications.

### 3. Input Validation & Stage Transition Constraints
- **Mandatory Pre-Transmission Validation**:
  - Attempting to transmit from the Comm-Link stage to the Camera stage must validate all three user inputs before advancing:
    1. **Alias**: Required (non-empty after trimming whitespace).
    2. **Email or Comm-Number**: Required (non-empty after trimming whitespace).
    3. **Personality Bio**: Required; must contain at least **10 non-whitespace characters** (after trimming leading/trailing whitespace) and must not exceed **500 characters** in total length.
- **Fail-Fast Validation Feedback**:
  - If the personality input is empty, shorter than 10 characters, or longer than 500 characters when transmission is attempted:
    - The workflow must **not** advance to the Camera stage.
    - A clear, readable terminal validation error message must be displayed on the Comm-Link screen explaining the requirement.
    - Focus must move directly to the invalid input field so the user can immediately correct it.
- **Stage Transition**:
  - Only when Alias, Email or Comm-Number, and Personality Bio all satisfy validation requirements may the workflow transition from the Comm-Link terminal to the Visual Uplink (Camera) stage.

### 4. End-to-End Registration Payload & Patron Creation
- **Identity & Persona Retention Across Stages**:
  - The validated personality bio captured in the Comm-Link stage must be retained alongside the user's alias and contact information while the user captures and confirms their portrait in the Camera stage.
- **Complete Registration Submission**:
  - When the user confirms their captured photo (**Use Photo**), the registration request dispatched to the backend must include:
    - Sanitized alias (name)
    - Contact email or phone number
    - Sanitized personality bio
    - Captured portrait image file
    - Flag to execute the character generation pipeline
- **Successful Patron Addition**:
  - With all required fields supplied, the registration request must succeed without throwing a missing-personality error, creating the patron's authoritative personality prompt record, persisting their metadata and database records, initiating the character sprite generation pipeline, and adding the patron to the live in-game roster upon completion.

---

## Inputs & `{correct required outputs}`

### Inputs
| Input | Source | Constraints |
|:---|:---|:---|
| **Alias** | User text entry in Comm-Link | Required; non-empty trimmed string. |
| **Email or Comm-Number** | User text entry in Comm-Link | Required; non-empty trimmed string (routed as email if containing `@`, otherwise phone). |
| **Personality / About Me** | User text entry in Comm-Link | Required; trimmed length $\ge 10$ characters, maximum length $\le 500$ characters. |
| **Selfie / Portrait** | Captured still image in Visual Uplink | Required; valid non-empty image capture ($\ge 1024$ bytes). |

### `{correct required outputs}`
1. **Comm-Link UI Presentation**: Displays Alias, Email/Comm-Number, and Personality inputs plus Transmit and Abort controls inside the console screen glass.
2. **Validation Enforcement**: Blocks stage transition and surfaces an explicit terminal error message if any of the three inputs (including the 10–500 character personality requirement) is missing or invalid.
3. **Registration Payload Completeness**: Dispatches the user's Alias, Contact, Personality bio, and captured Photo together upon photo confirmation.
4. **Error-Free Registration & Generation**: Completes patron registration without throwing an error, persists the verbatim personality prompt, and runs the in-game patron generation lifecycle to completion.

---

## Edge Cases & Behavioral Boundaries

1. **Whitespace-Only or Too-Short Personality Input**:
   - Entering only spaces/newlines or fewer than 10 non-whitespace characters (e.g., `"hello"`) must be rejected at the Comm-Link stage with a clear validation error before the camera is ever opened.
2. **Maximum Character Boundary (500 Characters)**:
   - Input exceeding 500 characters must either be prevented by input length enforcement or rejected with an explicit validation message prior to advancing.
3. **Special Characters, Punctuation, and Multi-Sentence Bios**:
   - Standard punctuation, quotes, apostrophes, and expressive character descriptions must be preserved verbatim through transmission and registration without truncation or encoding corruption.
4. **Retaking Photos in the Camera Stage**:
   - If the user captures a photo, selects **Retake**, and captures a new photo before selecting **Use Photo**, the previously entered Alias, Contact, and Personality bio from Stage 1 must remain intact in memory and be submitted with the final confirmed photo.
5. **Aborting and Re-Opening "JOIN THE BAR!"**:
   - Closing/aborting the join workflow and re-selecting **"JOIN THE BAR!"** from the mode selection menu must start a clean Comm-Link session with empty input fields and cleared error states.
6. **Small Viewport / Mobile On-Screen Keyboard**:
   - When all three inputs are rendered inside the console screen glass, the Comm-Link terminal must remain scrollable or compactly fitted within the screen glass so the **Transmit Data** button and error messages are always reachable across mobile and desktop viewports.

---

## Acceptance Criteria

| ID | Criterion | Measurable Verification |
|:---|:---|:---|
| **AC1** | **Personality Input Presence** | Selecting **"JOIN THE BAR!"** from the mode selection menu opens the Comm-Link terminal displaying a dedicated Personality / About Me input box alongside Alias and Email/Comm-Number. |
| **AC2** | **D-Pad & Keyboard Navigation** | Console D-pad and arrow keys cycle focus cleanly across Alias, Email/Comm-Number, Personality, and Transmit Data; console A focuses inputs or activates Transmit Data. |
| **AC3** | **No Mobile Focus Zoom** | Focusing the Personality input on mobile Safari does not zoom the browser viewport. |
| **AC4** | **Pre-Camera Bio Validation** | Attempting to transmit with an empty personality field or fewer than 10 non-whitespace characters blocks progression to the camera stage and displays a terminal error message. |
| **AC5** | **End-to-End Registration Success** | Submitting valid Alias, Contact, and Personality (10–500 chars) advances to the camera stage, and confirming a captured photo successfully initiates patron registration and generation without throwing an error. |
| **AC6** | **Authoritative Persona Persistence** | The registered patron's authoritative personality prompt document and metadata record contain the exact personality text entered in the Comm-Link terminal. |

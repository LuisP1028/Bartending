# Functional Specification 113: Patron Order & Conversation Carousel, Full-Screen Patron Chatbox with Photo & Name, and Hugging Face LLM Conversation Engine

## 1. Purpose & Objective

Establish the required product `{functionality}` for inspecting a seated patron's order and engaging in direct, bidirectional player-to-patron conversation within the barroom stage inside the **Nintendo Game Boy** console screen. Specifically:

1. **Interactive Patron Selection & Isolation**:
   - Every visible seated bar patron in the playfield is interactively selectable via pointer click or touch tap (when not dragging a drink vessel).
   - Clicking a seated patron `x` temporarily hides all other bar patrons to isolate visual focus on patron `x`, binds patron `x`'s order to the active bar mat, and opens a **Patron Inspection Carousel** alongside patron `x` without covering or occluding patron `x`.
2. **Patron Inspection Carousel (Order Receipt ↔ Conversation Box)**:
   - Instead of displaying only a static receipt upon clicking a patron, the patron's **Order Receipt** and **Conversation Box** are housed together inside an interactive **carousel**.
   - The carousel enables the player to smoothly switch back and forth between **Slide 1: Patron `x`'s Order Receipt** (the full recipe specification for patron `x`'s drink order) and **Slide 2: Patron `x`'s Conversation Box** (the retro RPG-styled conversational entry view).
3. **Full-Screen Patron Chatbox on Conversation Interaction**:
   - When the player interacts in conversation with patron `x` (by engaging the Conversation Box, selecting a conversation starter, or focusing/submitting custom chat input), the **Conversation Box** transforms and expands into a **Full-Screen Patron Chatbox** that covers the entire visible Game Boy game screen.
   - The Full-Screen Patron Chatbox prominently includes a **photo / portrait of patron `x`** inside a beveled frame alongside **the canonical display name of patron `x`**, and presents the interactive chat interface.
4. **Hugging Face LLM Conversation Starters, Custom Input & In-Character Responses**:
   - The conversation interface provides three distinct conversation pathways:
     - **Two (2) AI-generated contextual conversation starters** dynamically produced by the Hugging Face LLM dialogue service using patron `x`'s authoritative personality prompt record.
     - **One (1) interactive custom text input field** allowing the player to author and transmit their own freeform message.
   - Selecting an AI-generated starter or submitting a custom message dispatches the player's message together with patron `x`'s authoritative persona context to the Hugging Face LLM dialogue node, returning an in-character response rendered inside the chatbox with typewriter animation.

This document specifies only the desired `{functionality}`, observable outcomes, visual and spatial bounds, behavioral constraints, inputs, outputs, edge cases, fail-fast invariants, and acceptance criteria. It contains zero implementation guidance, component breakdowns, code sketches, or architectural prescriptions.

**Prior Context:**
- `functional_specification_80.md` (Synthwave Navigator menu within console housing)
- `functional_specification_107.md` (Patron visual scale, spawn origin, and bar stool seating standardization)
- `functional_specification_108.md` ("Join the bar!" personality capture and character prompt file generation)
- `functional_specification_109.md` (Hugging Face LLM dialogue node, in-character speech, and retro dialogue presentation)
- `functional_specification_110.md` (Patron departure, stool cycling, and automatic seat replenishment)
- `functional_specification_111.md` (Mode selection menu "Join the bar!" personality capture workflow completion)
- `functional_specification_114.md` (Game Boy screen component sizing, transient receipt printer lifecycle, and patron-click isolation)
- `functional_specification_116.md` (Receipt lifecycle integrity and larger square patron order inspection)
- `functional_specification_117.md` (Receipt metadata removal and dialogue-themed screen-contained pop-ups)

**DO NOT CODE YET.** No coding, scaffolding, or implementation planning may proceed until the operator confirms that this specification constitutes a shared understanding of the desired `{functionality}` and authorizes the next stage.

---

## 2. Glossary & Evaluation Taxonomy Alignment

All assessments and verification gates in this specification strictly adopt the authoritative definitions established in `LANGUAGE.md`:

* **`{errors}`**: Explicit failure states surfaced during execution or rendering, including browser console errors, unhandled runtime exceptions, network request failures (HTTP 4xx/5xx), missing environment credentials, unresolvable persona records, empty LLM completions, broken image assets, or fatal process exits.
* **`{correctness}`**: Exact visual, spatial, thematic, and behavioral fidelity across the Patron Inspection Carousel and Full-Screen Patron Chatbox—verifying non-occlusion of the isolated patron during carousel inspection, full Game Boy screen coverage during active chatbox conversation, visible patron photo and patron name inside the chatbox, unclipped pixel typography, and accurate LLM persona conditioning even when no explicit `{errors}` are thrown.
* **`{functionality}`**: The end-to-end operational capability allowing the player to click any seated patron, switch between that patron's Order Receipt and Conversation Box via a carousel, expand the Conversation Box into a full-screen Chatbox featuring the patron's photo and name when conversing, and conduct bidirectional in-character conversations via two LLM-generated starters or custom typed input.
* **`{correct required outputs}`**: Objectively measurable visual, geometric, and conversational states verified directly in the live browser runtime via Playwright inspection.
* **`{sufficient}`**: The documentation state where zero ambiguity remains regarding desired outcomes, spatial bounds, state transitions, and verification criteria.
* **`{insufficient}`**: Any state where behavioral, visual, or geometric requirements are ambiguous, incomplete, or contradictory.

| Domain Term | Definition |
| :--- | :--- |
| **Patron Inspection Carousel** | The interactive two-slide carousel opened when seated patron `x` is clicked, allowing the player to switch between patron `x`'s **Order Receipt** and patron `x`'s **Conversation Box** while other patrons are temporarily hidden. |
| **Order Receipt Slide** | Slide 1 of the Patron Inspection Carousel, displaying patron `x`'s full cocktail order receipt (without the printer bezel and without check/date/time/server metadata). |
| **Conversation Box Slide** | Slide 2 of the Patron Inspection Carousel, presenting the retro RPG-styled conversation preview/entry box for patron `x` inside the carousel. |
| **Full-Screen Patron Chatbox** | The expanded conversational interface that covers 100% of the playable Game Boy game screen when the player is actively interacting in conversation with patron `x`, featuring patron `x`'s photo, patron `x`'s display name, dialogue history/response area, two LLM starter choices, and custom text input. |
| **Hugging Face LLM Dialogue Node** | The backend inference service interfacing with the Hugging Face API to generate contextual conversation starters and in-character patron responses. |
| **Authoritative Persona Prompt** | The patron-specific personality biography resolved deterministically from disk (`public/assets/patrons/{characterId}/personality.txt`) or the persistent patron database record. |
| **Conversation Starters** | Two dynamically generated, contextually relevant prompt options produced by the LLM from patron `x`'s authoritative persona record. |
| **Custom Player Input** | An interactive text input field within the conversation interface allowing the player to compose and dispatch freeform natural language to patron `x`. |
| **Retro RPG Dialogue Aesthetic** | Visual theme featuring a deep navy background (`#09133b`), double white-and-black borders with pixelated corner scrollwork loops, silver beveled portrait frame, gold speaker header (`#f7ca18`), and high-contrast pixel typography. |

---

## 3. Current Baseline & Observed Limitations

1. **Receipt-Only Patron Click (No Carousel or Conversation Switching)**:
   - Currently, clicking a seated patron `x` isolates patron `x` (temporarily hiding other patrons) and immediately displays only patron `x`'s opened receipt. There is no carousel to switch between patron `x`'s order receipt and a conversation box.
2. **Inspected Receipt Occludes Seated Patrons**:
   - The opened receipt is currently pinned to a fixed horizontal region (`left: 36%`, `width: 54%`) regardless of which bar stool patron `x` occupies, causing the receipt to cover/occlude patron `x` when patron `x` is seated in the center or right bar stools.
3. **One-Way / Non-Interactive Dialogue Strip**:
   - The existing dialogue box is a passive output-only bottom strip triggered only when a patron first orders or rejects a drink. It cannot be opened by clicking a patron, cannot be switched to from the order view, does not expand into a full-screen chatbox with the patron's photo and name during conversation, and provides no AI-generated starter choices or custom text input.
4. **Missing Conversational Starter & Reply Generation Pathways**:
   - While the backend dialogue service supports initial drink `order` and `rejection` lines, it lacks request pathways to generate two persona-conditioned conversation starters and in-character conversational replies to player-selected starters or freeform player text.

---

## 4. Desired `{functionality}` & Behavioral Requirements

### 4.1 Clicking a Seated Patron: Isolation & Non-Occluding Carousel Placement

* **Interactive Patron Hit Targets**:
  - Every seated patron sprite on the barroom stage must act as an interactive click/tap target with a pointer cursor on hover.
  - If the player is actively dragging a prepared cocktail vessel to serve a drink, dropping the vessel onto a seated patron continues to execute drink delivery and recipe validation; otherwise, clicking or tapping seated patron `x` activates the **Patron Inspection Carousel** for patron `x`.
* **Temporary Isolation of Patron `x` & Active Order Binding**:
  - While patron `x`'s inspection carousel (or expanded chatbox) is open:
    1. All **other** patrons at the bar are temporarily hidden from view so visual focus is dedicated to patron `x`.
    2. Patron `x`'s cocktail order is selected and bound as the active order on the bar mat (parking any previous build and loading patron `x`'s in-progress build if one exists).
* **Seat-Aware, Non-Occluding Carousel Positioning**:
  - In carousel mode (prior to expanding into the full-screen chatbox), the **Patron Inspection Carousel** must be positioned inside the visible Game Boy screen so that **patron `x` remains clearly visible in their seat and is not covered by the carousel container**:
    - When patron `x` is seated on the left half of the bar (the left two bar stools), the carousel positions itself in the right portion of the Game Boy screen (`~46%–96%` X) to the right of patron `x`.
    - When patron `x` is seated on the right half of the bar (the right two bar stools), the carousel positions itself in the left portion of the Game Boy screen (`~4%–54%` X) to the left of patron `x`.
    - In all cases, 100% of the carousel container and its navigation controls must remain inside the visible Game Boy screen aperture across all desktop and mobile viewports.

---

### 4.2 Patron Inspection Carousel: Switching Between Order Receipt & Conversation Box

* **Two-Slide Carousel Structure**:
  - Clicking seated patron `x` opens the **Patron Inspection Carousel** containing two switchable slides for patron `x`:
    1. **Slide 1 — Order Receipt (`ORDER`)**:
       - Renders patron `x`'s full order receipt (without the printer hardware bezel and without `CHK`, `DATE/TIME`, or `SRV` metadata), displaying the crisp mode brand logo, `PATRON: <DISPLAY NAME>`, cocktail name, required `VESSEL`, `METHOD`, ingredient ounce proportions, required garnishes/rims, pricing (`SUBTOTAL`, `PIXEL TAX`, `TOTAL`), footer, and barcode inside a clean, scrollable square/near-square receipt card.
    2. **Slide 2 — Conversation Box (`CONVERSATION` / `CHAT`)**:
       - Renders patron `x`'s **Conversation Box** styled in the **Retro RPG Dialogue Aesthetic** (`#09133b` deep navy background, double white/black borders, pixelated corner loops, silver beveled portrait frame with patron `x`'s photo/portrait, and gold speaker name header `#f7ca18`).
       - Displays patron `x`'s current spoken greeting/order line along with clear interactive controls to engage in conversation (selecting a conversation starter, clicking the custom input field, or clicking an explicit `"TALK"` / `"OPEN CHAT"` action).
* **Carousel Navigation & Switching Controls**:
  - The Patron Inspection Carousel must provide intuitive, visible controls allowing the player to switch between the **Order Receipt** and the **Conversation Box** at any time:
    1. **Interactive Carousel Switchers**: Crisp retro-styled previous/next arrows (`◀` / `▶`) and/or labeled slide tabs (`[ ORDER ]` / `[ CHAT ]`) anchored cleanly to the carousel header or frame.
    2. **Game Boy D-Pad & Keyboard Support**: Pressing `Left` or `Right` on the Game Boy `D-Pad` (or keyboard arrow keys) while the Patron Inspection Carousel is open switches between the **Order Receipt** slide and the **Conversation Box** slide.
    3. **Slide Indicator**: Visually highlights whether the player is currently viewing `ORDER` or `CHAT`.

---

### 4.3 Transition to Full-Screen Patron Chatbox When Interacting in Conversation

* **Triggering Full-Screen Chatbox Mode**:
  - When the player interacts in conversation with patron `x`—by clicking/activating the **Conversation Box** slide to talk, selecting one of the conversation starters, or focusing/typing into the custom message input—the **Conversation Box** smoothly transitions into a **Full-Screen Patron Chatbox** that **covers the entire visible Game Boy game screen**.
* **Full Game Boy Screen Coverage & Containment**:
  - In active conversation mode, the **Full-Screen Patron Chatbox** expands to occupy the full inner playable Game Boy screen aperture (covering `~94%–100%` of the visible Game Boy screen width and height with clean border framing), completely covering the background barroom stage while staying 100% contained inside the Game Boy screen bezel across all desktop and mobile viewports.
* **Mandatory Patron Photo & Patron Name in the Chatbox**:
  - The **Full-Screen Patron Chatbox** must prominently display:
    1. **Patron `x`'s Photo / Portrait**: A clearly visible, framed photo/portrait of patron `x` rendered inside the silver beveled portrait frame in the chatbox header/sidebar (using the patron's canonical portrait/photo asset, completely loaded and unclipped).
    2. **Patron `x`'s Display Name**: The canonical display name of patron `x` rendered prominently in gold pixel typography (`#f7ca18`) next to their photo in the chatbox header, paired with a control to return to the Order/Conversation carousel (`[ ◀ ORDER ]`) or close the chatbox (`[ × ]`).
* **Chatbox Conversation Transcript & Typewriter Speech Area**:
  - The central body of the Full-Screen Patron Chatbox displays the active conversational exchange with patron `x`:
    - Shows the player's sent prompt/message (when a message has been sent in the current exchange) and patron `x`'s in-character response.
    - Patron `x`'s response renders using the signature retro typewriter animation effect (with punctuation pauses and click-to-complete behavior) and supports clean internal vertical scrolling if multiple lines are present.

---

### 4.4 LLM-Generated Conversation Starters & Custom Text Input in the Chatbox

* **Two Dynamic In-Character Conversation Starters**:
  - When conversation with patron `x` is opened, the system requests **two (2) distinct contextual conversation starters** from the backend Hugging Face LLM dialogue service.
  - These two starter options must be dynamically generated from patron `x`'s authoritative persona prompt file (`personality.txt` or database biography), reflecting patron `x`'s specific background, personality traits, speaking style, and current bar visit.
  - The two starters are rendered as clearly selectable, retro-styled option buttons inside the chatbox.
  - **Loading & Refresh Behavior**:
    - While the LLM is generating the two starters, the option slots display an explicit retro loading state (e.g., `"CONNECTING..."`).
    - Selecting either starter button immediately dispatches that starter text as the player's message to patron `x`.
    - If starter generation fails, the chatbox must surface an explicit fatal error state rather than substituting hardcoded dummy prompts.
* **Interactive Custom Text Input Field**:
  - Alongside the two AI-generated starter buttons, the Full-Screen Patron Chatbox provides an interactive text input row allowing the player to compose and send their own custom message to patron `x`:
    - Styled in the retro RPG aesthetic (dark navy/black input field, crisp pixel border, high-contrast pixel font, placeholder `"SAY SOMETHING..."`).
    - Bounded to a maximum length of `140` characters.
    - Submitting via the `Enter` key or clicking the accompanying retro `"SEND"` button dispatches the custom text to the backend Hugging Face LLM dialogue node.
    - On mobile/touch viewports, focusing the input must not cause unintended browser zoom or break the Game Boy screen layout.

---

### 4.5 Bidirectional Conversational Exchange & LLM Node Processing

* **Authoritative Persona Conditioning**:
  - When the player selects one of the two conversation starters or submits a custom message, the system dispatches a conversational reply request to the backend LLM dialogue service containing the patron's character identifier, the player's message, and recent conversation context.
  - The backend service deterministically loads patron `x`'s authoritative persona (`personality.txt` or registered patron biography) and prompts the Hugging Face LLM to reply strictly in character as patron `x` seated at the bar.
* **In-Character Response Rendering & Continuous Conversation**:
  - While awaiting the LLM response, the chatbox displays an in-character thinking/waiting indicator (e.g., `"..."`).
  - Once the response arrives, patron `x`'s reply is rendered in the chatbox with the typewriter animation effect.
  - The player may continue conversing with patron `x` (sending additional custom messages or selecting available prompts), switch back to patron `x`'s **Order Receipt** slide in the carousel to review the drink recipe, or close the interface to mix and serve patron `x`'s drink.

---

### 4.6 Switching Back to Order Receipt & Dismissing to Barroom State

* **Switching Between Full-Screen Chatbox and Order Receipt**:
  - From inside the Full-Screen Patron Chatbox, clicking the carousel switch control (e.g., `[ ◀ ORDER ]` / receipt tab) collapses the full-screen chatbox back into the **Patron Inspection Carousel** on the **Order Receipt** slide so the player can inspect patron `x`'s drink recipe while keeping patron `x` isolated.
* **Closing & Restoring All Bar Patrons**:
  - The player can close the Patron Chatbox or Patron Inspection Carousel at any time by:
    - Clicking the explicit retro `"CLOSE"` / `"×"` button.
    - Pressing the `Escape` key.
    - Pressing the physical Game Boy `A` (Back) button.
    - Clicking outside the carousel on the bar background (when in non-fullscreen carousel mode).
  - Closing the interface immediately restores the normal barroom stage and makes all other living patrons at the bar visible again in their respective seats/walk paths without losing any order or drink-build state.

---

## 5. Edge Cases, Constraints & Fail-Fast Invariants

1. **`INV-CAROUSEL-ORDER-CHAT-01` (Unified Patron Order & Conversation Carousel)**:
   * Clicking any seated patron `x` must open a carousel that enables switching between patron `x`'s **Order Receipt** and patron `x`'s **Conversation Box**, rather than showing a standalone receipt with no conversation access.
2. **`INV-CAROUSEL-NO-OCCLUDE-01` (Carousel Never Covers Clicked Patron)**:
   * While viewing the Patron Inspection Carousel (before expanding into the full-screen chatbox), the carousel container must be positioned on the non-overlapping side of the Game Boy screen relative to patron `x`'s bar stool so patron `x`'s seated sprite remains unobstructed.
3. **`INV-CHATBOX-FULLSCREEN-01` (Full-Screen Game Screen Chatbox with Photo & Name)**:
   * Whenever the player is actively interacting in conversation with patron `x`, the conversation box must turn into a **Full-Screen Patron Chatbox** covering the visible Game Boy game screen (`width >= 92%` and `height >= 90%` of the playable screen aperture) and must visibly render both **patron `x`'s photo/portrait** and **patron `x`'s display name** inside the chatbox.
4. **`INV-STARTERS-PERSONA-01` (Two Persona-Derived LLM Starters)**:
   * Opening conversation with patron `x` must dynamically fetch two (2) conversation starters generated by the Hugging Face LLM service from patron `x`'s authoritative persona record. Static hardcoded fallback starters are strictly prohibited.
5. **`INV-FAILFAST-DIALOGUE-01` (Strict Fail-Fast on Missing Token, Persona, or Empty Output)**:
   * If the Hugging Face API token is missing or invalid, if patron `x` lacks an authoritative `personality.txt` or database persona, or if the LLM returns an empty completion, the system must fail fast and surface an explicit diagnostic error state immediately without silent fallbacks.
6. **`INV-PATRON-ISOLATION-01` (Deterministic Patron Isolation & Restoration)**:
   * All other patrons are hidden while patron `x`'s carousel or full-screen chatbox is open, and all other living patrons are immediately restored to view when the carousel/chatbox is closed or when patron `x` is served.
7. **`INV-SERVE-PRIORITY-01` (Drink Delivery Precedence)**:
   * Dragging and dropping an active drink vessel onto seated patron `x` always executes drink validation and service rather than opening the carousel or chatbox.

---

## 6. Acceptance Criteria & Verification (`{correct required outputs}`)

All acceptance criteria must be verified in the live browser runtime inside the Nintendo Game Boy shell using **Playwright**:

| ID | Category | Verification Requirement (`{correct required outputs}`) |
| :--- | :--- | :--- |
| **`AC-01`** | **Patron-Click Carousel & Non-Occlusion** | Clicking a seated patron `x` hides all other patrons, binds patron `x`'s order to the mat, and opens the **Patron Inspection Carousel** inside the Game Boy screen without covering/occluding patron `x`'s seated sprite. |
| **`AC-02`** | **Carousel Switching (Order Receipt ↔ Conversation Box)** | The Patron Inspection Carousel allows the user to switch back and forth between patron `x`'s **Order Receipt** and patron `x`'s **Conversation Box** via on-screen carousel controls and the Game Boy `D-Pad` (`Left` / `Right`). |
| **`AC-03`** | **Full-Screen Chatbox Transformation on Conversation** | Interacting in conversation with patron `x` transforms the Conversation Box into a **Full-Screen Patron Chatbox** covering the visible Game Boy game screen (`>= 92%` width and `>= 90%` height of the playable Game Boy screen), styled in the Retro RPG Dialogue theme (`#09133b` navy, pixel borders). |
| **`AC-04`** | **Patron Photo & Display Name in Chatbox** | The Full-Screen Patron Chatbox visibly displays a loaded photo/portrait of patron `x` inside the portrait frame alongside patron `x`'s canonical display name in gold pixel typography. |
| **`AC-05`** | **Two LLM-Generated Conversation Starters** | The chatbox dynamically loads and presents two (2) selectable conversation starter options generated by the Hugging Face LLM service from patron `x`'s authoritative persona record (`personality.txt` / biography). |
| **`AC-06`** | **Custom Text Input & Submission** | The chatbox provides a retro-styled text input field and `"SEND"` action allowing the player to type and submit a custom message (`<= 140` chars) to patron `x`. |
| **`AC-07`** | **In-Character LLM Reply & Typewriter Rendering** | Selecting either AI starter or submitting a custom message dispatches the prompt and persona context to the Hugging Face LLM dialogue service and renders patron `x`'s in-character response in the chatbox with typewriter animation. |
| **`AC-08`** | **Fail-Fast Error Enforcement** | Missing tokens, missing persona files, or upstream API failures surface explicit error states immediately with zero silent or mock fallbacks. |
| **`AC-09`** | **Carousel Return & Clean Dismissal** | The user can switch from the Full-Screen Chatbox back to patron `x`'s Order Receipt in the carousel, or close the chatbox/carousel via the close control, `Escape`, or Game Boy `A` button to restore all bar patrons with zero console or page `{errors}`. |

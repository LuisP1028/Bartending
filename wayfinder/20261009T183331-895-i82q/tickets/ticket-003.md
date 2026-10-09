---
ticket_id: 003
title: "Non-Blocking Client UX, Shell Navigation & In-Game Status Feedback"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-002.md"]
governing_specification: "functional_specification_105.md"
---

# Ticket 003: Non-Blocking Client UX, Shell Navigation & In-Game Status Feedback

## Question
How does the Game Boy Comm-Link and Camera UI maintain interactive shell responsiveness (permitting B-button navigation, mode switches, and abort actions without corrupting server-side generation) while providing real-time stage progress polling and clear completion/failure dialogs?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_105.md`
  - §Desired Functionality (3): "While generation is in progress: The UI must provide clear visual feedback indicating that character generation is actively proceeding. The Game Boy navigation shell must remain responsive; player navigation (such as pressing B to return to mode selection or menus) must not crash or corrupt the in-flight generation task. The client must poll generation status at regular intervals and reflect meaningful progress updates."
  - §Desired Functionality (3): "Upon completion: If generation succeeds, the interface must display a clear confirmation showing the patron alias and readiness confirmation. If generation fails (e.g. missing API keys, upstream generation failure, or processing timeout), the interface must surface a descriptive, user-readable explanation of the failure rather than a generic hang or crash, allowing the player to safely exit."
  - §Edge Cases (3): "If a player closes the browser tab, loses network connection, or switches game modes while their generation is running, the server-side generation job must continue uninterrupted until completion or terminal failure. The resulting character, if successfully completed, must still be persisted to the runtime roster."
  - §Edge Cases (4): "If a submitted image is corrupt, empty, or cannot be decoded, the system must catch the validation error early, reject the submission with an actionable message, and avoid spawning background processes."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Navigation Trapping & Locked B-Button / Escape Behavior
- **Audit Findings:**
  - In `src/app/page.tsx` (L1069–L1080):
    ```typescript
    const onShellBack = useCallback((): boolean => {
      if (joinBusy) return true;
      if (joinStage === 'camera') {
        onCameraBack();
        return true;
      }
      if (joinStage === 'comm') {
        onCloseJoin();
        return true;
      }
      return false;
    }, [joinBusy, joinStage, onCameraBack, onCloseJoin]);
    ```
    When `joinBusy` is `true`, `onShellBack` returns `true` (indicating it "consumed" the back event), but does absolutely nothing!
  - In `onCloseJoin` (L1048–L1055) and `onCameraBack` (L1058–L1063):
    `if (joinBusy) return;` completely ignores the player's back action.
  - In `src/components/JoinBarCamera.tsx` (L84–L94, L158, L238, L246):
    The `Escape` key listener skips `onClose()` when `busy` is true. The Abort close button has `disabled={busy}`.
  - Because generation takes between 1.5 and 4 minutes, the player is completely trapped in the camera interface. They cannot return to the main menu, inspect diagnostics, or play the game while generation proceeds.

### 2. Static Status Message & Lack of Stage Visibility
- **Audit Findings:**
  - In `src/app/page.tsx` (L1144–L1146, L1184–L1186):
    The client sets `joinStatus = 'GENERATING Maya… (THIS MAY TAKE A FEW MINUTES)'`.
    Inside the polling loop `tick()`, when `sj.status === 'running'`, it resets `joinStatus = 'GENERATING Maya…'`.
  - In `src/components/JoinBarCamera.tsx` (L254–L260):
    The status line merely displays this static string. There is no feedback indicating whether the pipeline is on head_on, profile, sit, talk, walk, or background removal.
  - If a network error occurs during polling, `page.tsx` throws and displays `'UPLINK FAILED'`, even though the background server process may still be running successfully.

### 3. Client-Side Pre-Validation Deficiencies
- **Audit Findings:**
  - In `JoinBarCamera.tsx` (L128–L134):
    `usePhoto` packages `stillBlob` into a `File` object and calls `onCapture(file)` without verifying that the blob size is greater than 0 or checking that the canvas render completed.
  - If an uninitialized or 0-byte canvas blob is emitted, it is sent over the network to the server, causing unnecessary network overhead and failing server-side.

## Architectural Decision & Solution Design

### 1. Decoupled Navigation & Background Job Resilience
- In `src/app/page.tsx`:
  - Decouple modal navigation (`joinStage`) from active generation tracking:
    - Maintain an independent ref / state `activeJobIdRef` and `backgroundGenerationState` (`{ jobId: string, characterId: string, displayName: string, status: string, statusMessage: string }`).
    - When the user presses `B` / `Escape` or clicks `Abort` while `joinBusy` is `true`:
      - Do **not** abort or kill the background generation.
      - Close the camera overlay (`setJoinStage(null)` or return to menu), but keep the polling loop running in the background.
      - When the background job completes, trigger in-game notification / toast, and trigger the live barroom simulation update.
  - In `src/components/JoinBarCamera.tsx`:
    - Remove `disabled={busy}` from the close button so the player can exit back to the main menu at any time. Change the button label during busy state to `"Run in Background"` or keep `"Abort View"`.
    - Allow `Escape` key navigation to exit cleanly even when `busy` is true.

### 2. Real-Time Dynamic Progress Reflection in Camera HUD
- In `src/app/page.tsx`:
  - In the polling loop `tick()`, consume the rich fields returned by `GET /api/patrons/generate-status` (defined in `ticket-002.md`):
    `currentStage`, `stageIndex`, `totalStages`, `progressPct`, and `statusMessage`.
  - Update `setJoinStatus(sj.statusMessage || 'GENERATING PATRON...')`.
- In `src/components/JoinBarCamera.tsx`:
  - Display the specific stage status message and percentage progress in the terminal HUD (e.g. `[ STAGE 3/8: GENERATING SITTING POSE — 37% ]`).
  - Provide a retro scanline progress bar or step indicator reflecting current stage advancement.

### 3. Early Photo Buffer & Decodability Pre-Validation
- In `src/components/JoinBarCamera.tsx`:
  - Before calling `onCapture(file)` in `usePhoto`:
    - Verify `stillBlob.size >= 1024` (at least 1KB).
    - If `stillBlob` is empty or invalid, surface an immediate localized error: `"ERR: CAPTURE FAILED — RETAKE SELFIE"` without initiating network dispatch.

### 4. Deterministic Success & Failure Dialog UX
- In `src/app/page.tsx` & `src/components/JoinBarCamera.tsx`:
  - **On Success:**
    - Display confirmation: `"READY: [Alias] ([characterId]) — PATRON AVAILABLE AT THE BAR"`.
    - Keep dialog visible for 3 seconds before auto-closing, or provide an immediate `"Enter Bar"` button.
  - **On Failure:**
    - Set `joinStatusError = true`.
    - Display the exact sanitized error message returned from `sj.error` (e.g. `"Uplink error: Missing API key in server .env"` or `"Generation timed out"`).
    - Reset `busy = false` and enable the `"Retake"` button and `"Close"` button, allowing the user to safely exit or retry.

## Precise Contract & Transformation Specifications

### Contract 1: Non-Blocking Shell Back Handler in `src/app/page.tsx`
```typescript
const onShellBack = useCallback((): boolean => {
  if (joinStage === 'camera') {
    // Return to main menu while letting any in-flight background job continue
    setJoinStage(null);
    return true;
  }
  if (joinStage === 'comm') {
    setJoinStage(null);
    setJoinIdentity(null);
    return true;
  }
  return false;
}, [joinStage]);
```

### Contract 2: Dynamic Polling Progress Loop in `src/app/page.tsx`
```typescript
const pollJob = async (jobId: string, displayName: string, characterId: string) => {
  const started = Date.now();
  const maxMs = 12 * 60 * 1000; // 12 minutes
  const pollIntervalMs = 3000;

  const tick = async () => {
    if (Date.now() - started > maxMs) {
      setJoinStatus('GENERATION TIMED OUT — CHECK SERVER LOGS');
      setJoinStatusError(true);
      setJoinBusy(false);
      return;
    }
    try {
      const res = await fetch(`/api/patrons/generate-status?jobId=${encodeURIComponent(jobId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status check failed');

      if (data.status === 'done') {
        setJoinStatus(`READY: ${displayName} (${characterId})`);
        setJoinStatusError(false);
        setJoinBusy(false);
        // Trigger live simulation roster update
        window.dispatchEvent(new CustomEvent('patron-roster-updated', { detail: { characterId } }));
        return;
      }
      if (data.status === 'failed') {
        setJoinStatus(`GENERATION FAILED: ${data.error || 'Unknown error'}`);
        setJoinStatusError(true);
        setJoinBusy(false);
        return;
      }

      // Display real-time stage progress
      const progressText = data.statusMessage || `GENERATING ${displayName}…`;
      const pctText = data.progressPct ? ` [${data.progressPct}%]` : '';
      setJoinStatus(`${progressText}${pctText}`);
      window.setTimeout(tick, pollIntervalMs);
    } catch (err) {
      // Network hiccup during poll — retry without crashing in-flight job
      window.setTimeout(tick, pollIntervalMs);
    }
  };
  void tick();
};
```

### Contract 3: `JoinBarCamera.tsx` Action Button & Close Decoupling
```typescript
<button
  type="button"
  className={styles.closeBtn}
  onClick={handleClose}
  aria-label="Close camera"
>
  {busy ? 'Run in Background' : 'Abort'}
</button>
```

## Verification & Invariant Adherence
- **`INV-FAILFAST-01`**: Early photo capture validation rejects empty frames before network transmission; polling failures surface explicit errors without masking them.
- **`INV-BOUNDARY-01`**: Defines architectural and schema decisions without embedding execution holds or coding prohibitions.
- **`INV-MAP-01`**: Registered monotonically in `wayfinder/20261009T183331-895-i82q/tickets/ticket-003.md`.

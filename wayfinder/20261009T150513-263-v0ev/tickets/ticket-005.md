---
ticket_id: "005"
title: "Local Camera Uplink & Missing Key Graceful Degradation"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_99.md"
---

# Ticket 005: Local Camera Uplink & Missing Key Graceful Degradation

## Question
How does the Comm-Link camera interface (`JoinBarCamera.tsx`, `JoinBarCommLink.tsx`) interact with browser security contexts on `localhost`, and what error handling protocol must be maintained when external API keys (e.g. `XAI_API_KEY`) or camera hardware are absent in the local development environment?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_99.md` Current Baseline §4 ("Permissions Boundary"), Edge Case 2 ("Missing Local Environment Configuration"), Edge Case 3 ("Local Origin Camera Access"), and AC7 ("Camera & Comm-Link").
- **Current Baseline:**
  - Historically, when hosted inside an iframe on GitHub Pages, video/camera access required explicit `allow="camera"` feature policy delegation to Hugging Face Spaces.
  - On `http://localhost:<port>`, the browser treats `localhost` as a Secure Context (`window.isSecureContext === true`).
  - In `src/app/api/patrons/register/route.ts` lines 109-117:
    ```typescript
    if (!hasImagineCredentials()) {
      return NextResponse.json(
        {
          error:
            'Imagine credentials missing. Set XAI_API_KEY (or XAIKEY / HF_TOKEN) on the server to generate characters.',
        },
        { status: 503 }
      );
    }
    ```
- **Affected Files:**
  - `src/components/JoinBarCamera.tsx` (lines 45-75, 110-150)
  - `src/components/JoinBarCommLink.tsx` (lines 40-100)
  - `src/app/page.tsx` (lines 1194-1296)
  - `src/app/api/patrons/register/route.ts` (lines 109-117, 240-247)

## Architectural Decisions to Lock
1. **Localhost Secure Context Media Access:**
   - Under standard local web execution (`http://localhost:3000`), modern browsers (Chromium, Safari, Firefox) classify `localhost` as a trustworthy, secure origin.
   - Calling `navigator.mediaDevices.getUserMedia({ video: { ... }, audio: false })` prompts the user for camera permission directly without third-party iframe privilege escalation issues.
   - If the player runs via the decoupled local shell (`docs/index.html`), the iframe explicitly maintains `allow="camera; microphone"`.
2. **Camera Hardware Absence Handling:**
   - In `JoinBarCamera.tsx`, if the local machine has no connected webcam or the user denies the browser permission prompt:
     - The exception is caught cleanly in `startCamera()`.
     - `setError(err.message || 'Camera permission denied or camera unavailable.')` is set in local component state.
     - The UI presents a readable error message and an "Abort" / Back button returning to Comm-Link without an unhandled runtime crash.
3. **Missing Environment Keys Protocol (Graceful Degradation):**
   - The core game loop, stock patron spawning (Elder, Caesar, Trump), drink pouring, mixing, and ticket receipt checkout operate 100% locally with zero external keys.
   - If `XAI_API_KEY` (or `XAIKEY`) is missing in the local environment:
     - The game boots normally, menu navigates normally, and drinks can be served.
     - When a player attempts Comm-Link registration and clicks "Use Photo":
       - `/api/patrons/register` returns HTTP 503 with JSON:
         `{ error: "Imagine credentials missing. Set XAI_API_KEY (or XAIKEY / HF_TOKEN) on the server to generate characters." }`
       - In `src/app/page.tsx`, `onJoinCapture` catches the 503 and sets `setJoinStatus(data.error)` with `setJoinStatusError(true)`.
       - The UI displays the clear explanatory status message.
       - The system does not hang or produce ghost patrons.
       - The user can press Game Boy B button or Abort to return to the main menu.

## Scope & Invariant Guardrails
- **In Scope:** Local origin camera handling, permission error states, informative key absence messaging, zero impact of missing keys on core bar play.
- **Out of Scope:** Implementing mock character generation or modifying third-party LLM prompts.

---

## Resolution

### 1. Local Origin Camera Contract
In `src/components/JoinBarCamera.tsx`, the camera initialization sequence runs directly against the browser's native API:
```typescript
const startCamera = useCallback(async () => {
  setError(null);
  setStillUrl(null);
  setStillBlob(null);
  stopStream();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: false,
    });
    streamRef.current = stream;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      await video.play();
      setLive(true);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setError(`CAMERA UNAVAILABLE: ${message}`);
    setLive(false);
  }
}, [stopStream]);
```

### 2. Missing External Credentials Contract
In `src/app/api/patrons/register/route.ts`:
```typescript
if (!hasImagineCredentials()) {
  return NextResponse.json(
    {
      error:
        'Imagine credentials missing. Set XAI_API_KEY (or XAIKEY / HF_TOKEN) on the server to generate characters.',
    },
    { status: 503 }
  );
}
```
Client handler in `src/app/page.tsx` gracefully displays this error in the Comm-Link HUD and restores interactive controls:
```typescript
if (!res.ok) {
  throw new Error(data.error || res.statusText);
}
```

### 3. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks [Local Runtime Verification Protocol & Subsystem Smoke Test (ticket-006.md)](./ticket-006.md).

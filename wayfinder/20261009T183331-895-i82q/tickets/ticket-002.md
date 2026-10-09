---
ticket_id: 002
title: "Detached Process Execution, Stream Telemetry & Real-Time Progress Persistence"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_105.md"
---

# Ticket 002: Detached Process Execution, Stream Telemetry & Real-Time Progress Persistence

## Question
How does the background execution manager reliably supervise the multi-minute generative asset pipeline (`spawn`, process detachment, stdio stream ingestion, process lifecycle) and continuously persist fine-grained stage progress into the job registry?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_105.md`
  - §Desired Functionality (2): "The system must reliably execute all pipeline stages in the background... properly managing process lifecycle, memory, working directories, and environmental credentials."
  - §Desired Functionality (3): "While generation is in progress: The UI must provide clear visual feedback indicating that character generation is actively proceeding... The client must poll generation status at regular intervals and reflect meaningful progress updates."
  - §Desired Functionality (3): "If generation fails (e.g. missing API keys, upstream generation failure, or processing timeout), the interface must surface a descriptive, user-readable explanation of the failure rather than a generic hang or crash, allowing the player to safely exit."
  - §Edge Cases (3): "If a player closes the browser tab, loses network connection, or switches game modes while their generation is running, the server-side generation job must continue uninterrupted until completion or terminal failure. The resulting character, if successfully completed, must still be persisted to the runtime roster."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Fragile Child Process Attachment to HTTP Request Scope
- **Audit Findings:**
  - In `src/app/api/patrons/register/route.ts` (L159–L165):
    ```typescript
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });
    ```
  - Spawning with `detached: false` keeps the child process in the exact same process group as the Next.js HTTP server.
  - When the POST request completes and returns `NextResponse.json(...)` (L223), the HTTP response lifecycle terminates.
  - In serverless runtimes, containerized environments, or during Next.js worker recycling, processes attached to completed HTTP handlers may receive SIGPIPE, SIGTERM, or be aborted prematurely when request sockets close.
  - `child.unref()` is never invoked, creating ambiguous process retention where Node's event loop is held hostage by child stdio pipes.

### 2. Disconnected In-Memory Log Buffering & Zero Live Telemetry
- **Audit Findings:**
  - In `src/app/api/patrons/register/route.ts` (L166–L171):
    ```typescript
    let logBuf = '';
    const appendLog = (chunk: Buffer) => {
      logBuf = (logBuf + chunk.toString('utf8')).slice(-12000);
    };
    child.stdout?.on('data', appendLog);
    child.stderr?.on('data', appendLog);
    ```
  - The streamed output from `generate-patron-assets.mjs` is written solely to a local JavaScript closure variable `logBuf`.
  - In `data/generation-jobs/${jobId}.json`, the job is written once at start with `status: 'running'` (L130).
  - During the entire multi-minute run (6 Imagine stages + 4 imgly background removals), `updateGenerationJob` is **never called once**.
  - `updateGenerationJob` is only triggered when `child.on('close')` fires (L181) or `child.on('error')` fires (L173).
  - In `src/app/api/patrons/generate-status/route.ts` (L21–L38):
    The route reads `data/generation-jobs/${jobId}.json` via `readGenerationJob`.
    While running, `job.logTail` is `undefined`, `job.updatedAt` never advances, and there is zero stage progress.
  - Consequently, client polling sees only `status: 'running'` with zero progress or heartbeats, giving players and operators the impression that the system is completely hung.

### 3. Lack of Pipeline Watchdog, Heartbeats & Actionable Error Classification
- **Audit Findings:**
  - There is no execution timeout or watchdog timer on the child process. If the xAI API hangs without socket timeout, or if ONNX initialization in `@imgly/background-removal-node` enters an infinite loop or runs out of memory, the child process hangs indefinitely.
  - If the child process exits with a non-zero code, `register/route.ts` merely records `error: Pipeline exited with code ${code}`. It does not parse the tail of stderr to surface the actual root cause (e.g. `XAI_API_KEY missing`, `HTTP 401 Unauthorized`, `HTTP 429 Rate Limit`, `Out of Memory`, or `Background removal failed`).

## Architectural Decision & Solution Design

### 1. Robust Process Detachment & Supervision
- In `src/app/api/patrons/register/route.ts`:
  - Configure `spawn` with robust stdio handling:
    ```typescript
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    ```
  - Ensure stdout and stderr remain piped to the server supervisor while unlinking the process group from the HTTP request context.
  - Call `child.unref()` on the process object while maintaining active listeners on `child.stdout`, `child.stderr`, and `child.on('close')`. This guarantees that background execution continues independently of whether the client disconnects, navigates away, or closes their browser.

### 2. Live Stream Telemetry & Stage Progress Parser
- In `src/app/api/patrons/register/route.ts`:
  - Implement a deterministic stdout parser that detects pipeline progress markers emitted by `generate-patron-assets.mjs`:
    - `--- [1] head_on ---` $\rightarrow$ `{ stage: 'head_on', stageIndex: 1, totalStages: 8, message: 'Generating 8-bit head-on view (1/8)...' }`
    - `--- [2] profile ---` $\rightarrow$ `{ stage: 'profile', stageIndex: 2, totalStages: 8, message: 'Generating 8-bit profile view (2/8)...' }`
    - `--- [3] sit ---` $\rightarrow$ `{ stage: 'sit', stageIndex: 3, totalStages: 8, message: 'Generating sitting pose (3/8)...' }`
    - `--- [4] talk ---` $\rightarrow$ `{ stage: 'talk', stageIndex: 4, totalStages: 8, message: 'Generating talking pose (4/8)...' }`
    - `--- [5] walk_01 ---` $\rightarrow$ `{ stage: 'walk_01', stageIndex: 5, totalStages: 8, message: 'Generating walking frame 1 (5/8)...' }`
    - `--- [6] walk_02 ---` $\rightarrow$ `{ stage: 'walk_02', stageIndex: 6, totalStages: 8, message: 'Generating walking frame 2 (6/8)...' }`
    - `=== Install (imgly background removal) ===` $\rightarrow$ `{ stage: 'bg_removal', stageIndex: 7, totalStages: 8, message: 'Removing backgrounds & generating transparent sprites (7/8)...' }`
    - `bg-remove OK [role]` $\rightarrow$ detailed progress update per sprite.
    - `=== DONE ===` $\rightarrow$ `{ stage: 'install', stageIndex: 8, totalStages: 8, message: 'Verifying ready pack & registering patron (8/8)...' }`
  - Throttled disk persistence: On every recognized stage transition or periodically (every 1500ms when new stdout/stderr chunks arrive), invoke `updateGenerationJob(root, jobId, { currentStage, progressPct, statusMessage, logTail, updatedAt })`.
  - This ensures `GET /api/patrons/generate-status` returns real-time stage progress, percentage completion, and fresh log tails on every client poll.

### 3. Execution Watchdog & Process Heartbeats
- In `src/app/api/patrons/register/route.ts`:
  - Set an explicit execution ceiling timer: `const WATCHDOG_TIMEOUT_MS = 10 * 60 * 1000` (10 minutes).
  - If the child process has not exited within `WATCHDOG_TIMEOUT_MS`, or if no stdout/stderr output is received for 3 minutes (stalled connection), terminate the child process (`child.kill('SIGKILL')`), mark the job as `failed`, and write an intelligible error: `"Generation timed out: upstream provider did not respond within the allocated timeframe."`.

### 4. Deterministic Error Categorization & Extraction
- In `src/app/api/patrons/register/route.ts`:
  - On non-zero process exit or error event, extract the last lines of `logBuf` and inspect for known failure patterns:
    - Auth failures (`IMAGINE_AUTH`, `401`, `API_KEY invalid`) $\rightarrow$ `"Authentication failed with image provider. Verify API key in .env."`
    - Rate limits (`429`, `Rate limit`) $\rightarrow$ `"Upstream generation rate limit reached. Please wait a moment and try again."`
    - Missing templates/skills $\rightarrow$ `"Pipeline installation incomplete: missing required templates or skills."`
    - Background removal failure $\rightarrow$ `"Background removal failed during sprite processing."`
  - Persist this sanitized, human-readable error into `job.error`, while preserving the raw text in `job.logTail` for debugging.

## Precise Contract & Transformation Specifications

### Contract 1: Extended `GenerationJobRecord` Schema in `src/lib/runtimePatronStore.ts`
```typescript
export type GenerationJobRecord = {
  jobId: string;
  characterId: string;
  displayName: string;
  status: GenerationJobStatus;
  currentStage?: string;
  stageIndex?: number;
  totalStages?: number;
  progressPct?: number;
  statusMessage?: string;
  error?: string;
  logTail?: string;
  createdAt: string;
  updatedAt: string;
  photoPath?: string;
};
```

### Contract 2: Stream Parser & Telemetry Dispatcher in `register/route.ts`
```typescript
function parsePipelineOutput(line: string): Partial<GenerationJobRecord> | null {
  const trimmed = line.trim();
  if (trimmed.includes('--- [1] head_on ---')) {
    return { currentStage: 'head_on', stageIndex: 1, totalStages: 8, progressPct: 12, statusMessage: 'Generating head-on view (1/8)...' };
  }
  if (trimmed.includes('--- [2] profile ---')) {
    return { currentStage: 'profile', stageIndex: 2, totalStages: 8, progressPct: 25, statusMessage: 'Generating profile view (2/8)...' };
  }
  if (trimmed.includes('--- [3] sit ---')) {
    return { currentStage: 'sit', stageIndex: 3, totalStages: 8, progressPct: 37, statusMessage: 'Generating sitting pose (3/8)...' };
  }
  if (trimmed.includes('--- [4] talk ---')) {
    return { currentStage: 'talk', stageIndex: 4, totalStages: 8, progressPct: 50, statusMessage: 'Generating talking pose (4/8)...' };
  }
  if (trimmed.includes('--- [5] walk_01 ---')) {
    return { currentStage: 'walk_01', stageIndex: 5, totalStages: 8, progressPct: 62, statusMessage: 'Generating walking frame 1 (5/8)...' };
  }
  if (trimmed.includes('--- [6] walk_02 ---')) {
    return { currentStage: 'walk_02', stageIndex: 6, totalStages: 8, progressPct: 75, statusMessage: 'Generating walking frame 2 (6/8)...' };
  }
  if (trimmed.includes('=== Install (imgly background removal) ===')) {
    return { currentStage: 'bg_removal', stageIndex: 7, totalStages: 8, progressPct: 87, statusMessage: 'Processing transparent sprites (7/8)...' };
  }
  if (trimmed.includes('=== DONE ===')) {
    return { currentStage: 'done', stageIndex: 8, totalStages: 8, progressPct: 100, statusMessage: 'Finalizing ready pack (8/8)...' };
  }
  return null;
}
```

### Contract 3: Status Response Contract in `generate-status/route.ts`
```typescript
return NextResponse.json({
  ok: true,
  jobId: job.jobId,
  characterId: job.characterId,
  displayName: job.displayName,
  status: job.status,
  currentStage: job.currentStage ?? null,
  stageIndex: job.stageIndex ?? null,
  totalStages: job.totalStages ?? null,
  progressPct: job.progressPct ?? null,
  statusMessage: job.statusMessage ?? null,
  error: job.error ?? null,
  logTail: job.logTail ?? null,
  sitSrc:
    job.status === 'done'
      ? `/api/patrons/assets/${job.characterId}/sit.png`
      : null,
  updatedAt: job.updatedAt,
});
```

## Verification & Invariant Adherence
- **`INV-FAILFAST-01`**: Process crashes, network errors, or watchdog timeouts immediately transition the job to `status: 'failed'` with explicit diagnostic descriptions, eliminating silent hangs.
- **`INV-BOUNDARY-01`**: Defines architectural and schema decisions without embedding execution holds or coding prohibitions.
- **`INV-MAP-01`**: Registered monotonically in `wayfinder/20261009T183331-895-i82q/tickets/ticket-002.md`.

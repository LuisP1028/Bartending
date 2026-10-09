# RE105 — Master Component-to-Edit Matrix: End-to-End In-Game "Join the Bar" Patron Generation and Automatic Spawn Availability

**Spec:** [functional_specification_105.md](./functional_specification_105.md)  
**Map:** [wayfinder/20261009T183331-895-i82q/map.md](./wayfinder/20261009T183331-895-i82q/map.md)  
**Tickets:**
- [Ticket 001: Deterministic Credential Discovery, Execution Context & Root Path Alignment](./wayfinder/20261009T183331-895-i82q/tickets/ticket-001.md)
- [Ticket 002: Detached Process Execution, Stream Telemetry & Real-Time Progress Persistence](./wayfinder/20261009T183331-895-i82q/tickets/ticket-002.md)
- [Ticket 003: Non-Blocking Client UX, Shell Navigation & In-Game Status Feedback](./wayfinder/20261009T183331-895-i82q/tickets/ticket-003.md)
- [Ticket 004: Strict Ready-Pack Verification, Ghost Prevention & Instant Live Barroom Discovery](./wayfinder/20261009T183331-895-i82q/tickets/ticket-004.md)

---

## 1. System Layer Component Ownership Register

| Lifecycle / Architectural Responsibility | Primary Component & File Path | Supporting Modules & Data Definitions | Key Functions, Hooks & Data Structures |
| :--- | :--- | :--- | :--- |
| **Credential Discovery & Environment Transmission** | `scripts/patron-pipeline/lib/loadEnv.mjs` | `src/lib/runtimePatronStore.ts`<br>`src/lib/patronPackReady.ts` | `loadRepoEnv()`, `applyEnvAliases()`, `hasImagineCredentials()`, `resolveAppRoot()`, candidate paths traversal |
| **Registration Request & Pre-Flight Validation** | `src/app/api/patrons/register/route.ts` | `src/lib/patronIdentity.ts`<br>`src/lib/patronFolders.ts` | `POST()`, `isValidImageBuffer()`, photo magic bytes verification, `ensurePatronFolders()`, early 400/503 responses |
| **Background Process Supervision & Stream Telemetry** | `src/app/api/patrons/register/route.ts` | `scripts/patron-pipeline/generate-patron-assets.mjs` | `spawn(process.execPath, args, { detached: true })`, `child.unref()`, `parsePipelineOutput()`, stdout/stderr piping, execution watchdog |
| **Generation Job State & Progress Persistence** | `src/lib/runtimePatronStore.ts` | `src/app/api/patrons/generate-status/route.ts` | `GenerationJobRecord`, `writeGenerationJob()`, `updateGenerationJob()`, `readGenerationJob()`, `GET()` endpoint |
| **Pipeline CLI Orchestration & Concurrency Isolation** | `scripts/patron-pipeline/generate-patron-assets.mjs` | `scripts/patron-pipeline/lib/paths.mjs`<br>`scripts/patron-pipeline/lib/writeAssets.mjs` | `parseArgs()`, `--repo-root`, `runFull()`, isolated `stagingDir/plan.json`, 6 Imagine stages, `@imgly/background-removal-node` |
| **Client UI Navigation & Status Feedback** | `src/app/page.tsx`<br>`src/components/JoinBarCamera.tsx` | `src/components/JoinBarCommLink.tsx`<br>`src/components/MainMenu.tsx` | `onShellBack()`, `pollJob()`, `usePhoto()`, non-blocking close/abort buttons, HUD progress display, `'patron-roster-updated'` event |
| **Ready-Pack Verification & Ghost Prevention** | `src/lib/patronPackReady.ts`<br>`src/lib/runtimePatronStore.ts` | `src/app/api/patrons/roster/route.ts`<br>`src/app/api/patrons/assets/[characterId]/[file]/route.ts` | `isPatronPackReady()`, `upsertRuntimePatron()`, `readRuntimePatrons()`, ghost filtering, HEAD validation |
| **Live Barroom Discovery & Counter Seating** | `src/components/PatronLayer.tsx` | `src/data/characters.ts`<br>`src/data/runtimePatrons.ts` | `useEffect(onRosterUpdate)`, `loadRoster()`, `pickRandomFreeCharacterId()`, `trySpawn()`, `STOCK_CHARACTER_IDS` priority |

---

## 2. Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `scripts/patron-pipeline/lib/loadEnv.mjs` | L15–L37: `loadRepoEnv()` | `ticket-001.md` | Multi-candidate `.env` discovery traversal | Traverse worktree parents, repo root, and `process.env.REPO_ROOT` to load `XAI_API_KEY`, `HF_TOKEN`, and `PII_ENCRYPTION_KEY` across all host environments. |
| `src/lib/runtimePatronStore.ts` | L27–L37: `GenerationJobRecord` | `ticket-002.md` | Extended job progress schema | Add `currentStage`, `stageIndex`, `totalStages`, `progressPct`, and `statusMessage` fields to support real-time stage progress persistence. |
| `src/lib/runtimePatronStore.ts` | L155–L161: `hasImagineCredentials()` | `ticket-001.md` | Pre-flight server credential verification | Ensure environment variables are loaded prior to declaring missing credentials; return boolean status deterministically. |
| `src/app/api/patrons/register/route.ts` | L66–L79: photo validation | `ticket-001.md` | Image buffer integrity pre-flight check | Inspect uploaded buffer length ($\ge 256$ bytes) and verify JPEG/PNG/WEBP magic bytes; fail fast with HTTP 400 on corrupt/empty submissions. |
| `src/app/api/patrons/register/route.ts` | L136–L165: `spawn()` invocation | `ticket-001.md`, `ticket-002.md` | Detached execution & explicit repo root | Pass `--repo-root` with resolved root; spawn child with `detached: true` and invoke `child.unref()`, ensuring process survival across request lifecycles. |
| `src/app/api/patrons/register/route.ts` | L166–L221: stream listeners & exit handling | `ticket-002.md`, `ticket-004.md` | Real-time stage parsing & atomic ready pack gating | Parse stdout markers into stage progress; throttle updates to `updateGenerationJob`; on code 0 verify `isPatronPackReady()` before upserting runtime patron; format descriptive error on failure. |
| `scripts/patron-pipeline/generate-patron-assets.mjs` | L75–L158, L214–L358, L450–L475: CLI args & plan writing | `ticket-001.md` | `--repo-root` argument & per-job plan isolation | Support `--repo-root` CLI option; bind `REPO_ROOT`; write stage plan to `stagingDir/plan.json` instead of shared `.last-plan.json` for concurrency safety. |
| `src/app/api/patrons/generate-status/route.ts` | L25–L38: response payload | `ticket-002.md` | Rich stage progress serialization | Return `currentStage`, `stageIndex`, `totalStages`, `progressPct`, and `statusMessage` in JSON payload for client consumption. |
| `src/app/page.tsx` | L1048–L1080: `onShellBack()`, `onCloseJoin()`, `onCameraBack()` | `ticket-003.md` | Decoupled non-blocking shell navigation | Allow B-button / Escape / Abort navigation back to main menu during active generation without corrupting or aborting the background task. |
| `src/app/page.tsx` | L1148–L1200: `pollJob()` loop | `ticket-003.md`, `ticket-004.md` | Dynamic progress polling & roster event dispatch | Consume rich stage progress from `generate-status`; update HUD status; dispatch `'patron-roster-updated'` window event upon completion. |
| `src/components/JoinBarCamera.tsx` | L128–L134: `usePhoto()` | `ticket-003.md` | Client-side photo blob pre-validation | Validate blob size ($\ge 1024$ bytes) before dispatching to server; surface localized error if capture is empty. |
| `src/components/JoinBarCamera.tsx` | L158, L238, L246, L254–L260: controls & status | `ticket-003.md` | Responsive close button & stage progress HUD | Remove `disabled={busy}` from close button; display stage details and percentage in terminal HUD; enable retake/close on failure. |
| `src/components/PatronLayer.tsx` | L174–L249: roster lifecycle hook | `ticket-004.md` | Immediate event-driven simulation discovery | Listen for `'patron-roster-updated'`; trigger immediate `loadRoster()` and `trySpawn()`, eliminating the 20-second discovery delay. |
| `src/components/PatronLayer.tsx` | L96–L103: `pickRandomFreeCharacterId()` | `ticket-004.md` | Stock character priority preservation | Maintain stock character priority for initial seats while admitting newly registered join patrons into available stools (e.g. stool 4). |

---

## 3. Detailed Step-by-Step Edit Instructions

### 1. `scripts/patron-pipeline/lib/loadEnv.mjs`: Multi-Candidate `.env` Discovery (`ticket-001.md`)

- **Lines 15–37 (`loadRepoEnv`):**
  Enhance candidate path resolution to search parent worktrees and process root:
  ```javascript
  export function loadRepoEnv(envPath) {
    const candidates = [
      envPath,
      process.env.REPO_ROOT ? path.join(process.env.REPO_ROOT, '.env') : null,
      path.join(REPO_ROOT, '.env'),
      path.resolve(REPO_ROOT, '../.env'),
      path.resolve(REPO_ROOT, '../../.env'),
      path.resolve(REPO_ROOT, '../../../.env'),
      path.join(REPO_ROOT, '.env.local'),
      path.resolve(REPO_ROOT, '../../../.env.local'),
    ].filter((p) => Boolean(p) && fs.existsSync(p));

    let loaded = false;
    for (const candidate of candidates) {
      try {
        const text = fs.readFileSync(candidate, 'utf8');
        for (const line of text.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eq = trimmed.indexOf('=');
          if (eq <= 0) continue;
          const key = trimmed.slice(0, eq).trim();
          let val = trimmed.slice(eq + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
        loaded = true;
      } catch {
        /* try next candidate */
      }
    }
    applyEnvAliases();
    return { loaded, paths: candidates };
  }
  ```

---

### 2. `src/lib/runtimePatronStore.ts`: Extended Schema & Credential Check (`ticket-001.md`, `ticket-002.md`)

- **Lines 27–37 (`GenerationJobRecord`):**
  Add telemetry fields:
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

- **Lines 155–161 (`hasImagineCredentials`):**
  Ensure lazy environment loading if credentials are not yet populated in `process.env`:
  ```typescript
  export function hasImagineCredentials(): boolean {
    if (!process.env.XAI_API_KEY && !process.env.XAIKEY && !process.env.HF_TOKEN) {
      try {
        // Attempt loading from repo root or parent worktrees if in node runtime
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { loadRepoEnv } = require('../../scripts/patron-pipeline/lib/loadEnv.mjs');
        loadRepoEnv();
      } catch {
        /* ignore */
      }
    }
    return !!(
      process.env.XAI_API_KEY ||
      process.env.XAIKEY ||
      process.env.HF_TOKEN
    );
  }
  ```

---

### 3. `scripts/patron-pipeline/generate-patron-assets.mjs`: CLI Arguments & Plan Isolation (`ticket-001.md`)

- **Lines 75–158 (`parseArgs`):**
  Add `--repo-root` argument handling:
  ```javascript
  case '--repo-root':
    out.repoRoot = next();
    break;
  ```

- **Lines 44–49 (Module Root Initialization):**
  ```javascript
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  let REPO_ROOT = path.resolve(__dirname, '../..');
  ```
  In `main()`: if `args.repoRoot` is provided, assign `REPO_ROOT = path.resolve(args.repoRoot)`.

- **Lines 350–358 and L461–L471 (Plan File Isolation):**
  Instead of writing exclusively to `LAST_PLAN = path.join(__dirname, '.last-plan.json')`:
  ```javascript
  const planPath = path.join(stagingDir, 'plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');
  try {
    fs.writeFileSync(LAST_PLAN, JSON.stringify(plan, null, 2), 'utf8');
  } catch {
    /* non-blocking if shared plan path is locked */
  }
  ```

---

### 4. `src/app/api/patrons/register/route.ts`: Validation, Supervision & Telemetry (`ticket-001.md`, `ticket-002.md`, `ticket-004.md`)

- **Lines 66–79 (Photo Buffer Validation):**
  ```typescript
  let photoPath: string | null = null;
  if (photo && typeof photo === 'object' && 'arrayBuffer' in photo) {
    const file = photo as File;
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length >= 256) {
      const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
      const isPng =
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      const isWebp =
        buf.length > 12 &&
        buf.toString('ascii', 0, 4) === 'RIFF' &&
        buf.toString('ascii', 8, 12) === 'WEBP';

      if (!isJpeg && !isPng && !isWebp) {
        return NextResponse.json(
          {
            error:
              'Invalid image format. Please submit a valid JPEG, PNG, or WebP photo.',
          },
          { status: 400 }
        );
      }
      const ext = isPng ? '.png' : isWebp ? '.webp' : '.jpg';
      photoPath = path.join(folders.stagingDir, `source${ext}`);
      fs.writeFileSync(photoPath, buf);
      fs.writeFileSync(path.join(folders.publicDir, `source${ext}`), buf);
    } else {
      return NextResponse.json(
        { error: 'Photo file is empty or corrupted (under 256 bytes).' },
        { status: 400 }
      );
    }
  }
  ```

- **Lines 136–165 (Process Spawning & Detached Execution):**
  ```typescript
  const args = [
    script,
    '--run',
    '--repo-root',
    root,
    '--photo',
    photoPath,
    '--name',
    name,
    '--character-id',
    identity.characterId,
    '--no-register',
    ...(email ? ['--email', email] : []),
    ...(phone ? ['--phone', phone] : []),
  ];

  const childEnv = { ...process.env, REPO_ROOT: root };
  if (!childEnv.XAI_API_KEY && childEnv.XAIKEY) childEnv.XAI_API_KEY = childEnv.XAIKEY;
  if (!childEnv.XAI_API_KEY && childEnv.XAI_KEY) childEnv.XAI_API_KEY = childEnv.XAI_KEY;

  const child = spawn(process.execPath, args, {
    cwd: root,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  child.unref();
  ```

- **Lines 166–221 (Real-Time Stage Telemetry Parser & Gating):**
  ```typescript
  let logBuf = '';
  let lastUpdateMs = 0;

  const handleOutput = (chunk: Buffer) => {
    const text = chunk.toString('utf8');
    logBuf = (logBuf + text).slice(-12000);
    const now = Date.now();

    let patch: Partial<GenerationJobRecord> | null = null;
    if (text.includes('--- [1] head_on ---')) {
      patch = { currentStage: 'head_on', stageIndex: 1, totalStages: 8, progressPct: 12, statusMessage: 'Generating head-on view (1/8)...' };
    } else if (text.includes('--- [2] profile ---')) {
      patch = { currentStage: 'profile', stageIndex: 2, totalStages: 8, progressPct: 25, statusMessage: 'Generating profile view (2/8)...' };
    } else if (text.includes('--- [3] sit ---')) {
      patch = { currentStage: 'sit', stageIndex: 3, totalStages: 8, progressPct: 37, statusMessage: 'Generating sitting pose (3/8)...' };
    } else if (text.includes('--- [4] talk ---')) {
      patch = { currentStage: 'talk', stageIndex: 4, totalStages: 8, progressPct: 50, statusMessage: 'Generating talking pose (4/8)...' };
    } else if (text.includes('--- [5] walk_01 ---')) {
      patch = { currentStage: 'walk_01', stageIndex: 5, totalStages: 8, progressPct: 62, statusMessage: 'Generating walking frame 1 (5/8)...' };
    } else if (text.includes('--- [6] walk_02 ---')) {
      patch = { currentStage: 'walk_02', stageIndex: 6, totalStages: 8, progressPct: 75, statusMessage: 'Generating walking frame 2 (6/8)...' };
    } else if (text.includes('=== Install (imgly background removal) ===')) {
      patch = { currentStage: 'bg_removal', stageIndex: 7, totalStages: 8, progressPct: 87, statusMessage: 'Processing transparent sprites (7/8)...' };
    } else if (text.includes('=== DONE ===')) {
      patch = { currentStage: 'install', stageIndex: 8, totalStages: 8, progressPct: 98, statusMessage: 'Finalizing ready pack (8/8)...' };
    }

    if (patch || now - lastUpdateMs > 2000) {
      lastUpdateMs = now;
      updateGenerationJob(root, jobId, {
        ...(patch || {}),
        logTail: logBuf,
      });
    }
  };

  child.stdout?.on('data', handleOutput);
  child.stderr?.on('data', handleOutput);

  child.on('close', (code) => {
    const packReady = isPatronPackReady(root, identity.characterId);
    if (code === 0 && packReady) {
      try {
        upsertRuntimePatron(root, {
          id: identity.characterId,
          displayName: identity.displayName,
          personality: `${identity.characterId.replace(/^patron_/, '').replace(/[^a-z0-9]+/gi, '_')}_friendly`,
          walkFrameCount: 2,
          walkFrameMs: 120,
          createdAt: new Date().toISOString(),
        });
        updateGenerationJob(root, jobId, {
          status: 'done',
          currentStage: 'done',
          progressPct: 100,
          statusMessage: `Ready pack verified. Patron ${identity.displayName} registered into runtime roster.`,
          logTail: logBuf,
          error: undefined,
        });
      } catch (e: unknown) {
        updateGenerationJob(root, jobId, {
          status: 'failed',
          error: e instanceof Error ? e.message : String(e),
          logTail: logBuf,
        });
      }
    } else {
      let errorMsg = `Pipeline exited with code ${code}`;
      if (code === 0 && !packReady) {
        errorMsg = 'Pipeline exited 0 but ready pack missing (sit/talk/walk_01/walk_02 under public/assets/patrons/{id}/)';
      } else if (logBuf.includes('IMAGINE_AUTH') || logBuf.includes('401')) {
        errorMsg = 'Authentication failed with image provider. Verify API key in .env.';
      } else if (logBuf.includes('429')) {
        errorMsg = 'Upstream generation rate limit reached. Please wait a moment and try again.';
      }
      updateGenerationJob(root, jobId, {
        status: 'failed',
        error: errorMsg,
        logTail: logBuf,
      });
    }
  });
  ```

---

### 5. `src/app/api/patrons/generate-status/route.ts`: Rich Stage Progress Response (`ticket-002.md`)

- **Lines 25–38 (Status Serialization):**
  Return the telemetry fields in the JSON response:
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

---

### 6. `src/app/page.tsx`: Decoupled Navigation & Event Dispatch (`ticket-003.md`, `ticket-004.md`)

- **Lines 1048–1080 (Non-Blocking Back Navigation):**
  ```typescript
  const onCloseJoin = useCallback(() => {
    setJoinStage(null);
    setJoinIdentity(null);
    setJoinStatus(null);
    setJoinStatusError(false);
    setJoinBusy(false);
  }, []);

  const onCameraBack = useCallback(() => {
    setJoinStage(null);
  }, []);

  const onShellBack = useCallback((): boolean => {
    if (joinStage === 'camera') {
      onCameraBack();
      return true;
    }
    if (joinStage === 'comm') {
      onCloseJoin();
      return true;
    }
    return false;
  }, [joinStage, onCameraBack, onCloseJoin]);
  ```

- **Lines 1148–1200 (Progress Polling & Immediate Event Dispatch):**
  ```typescript
  const tick = async () => {
    try {
      if (Date.now() - started > maxMs) {
        setJoinStatus('GENERATION TIMED OUT — TRY AGAIN LATER');
        setJoinStatusError(true);
        setJoinBusy(false);
        return;
      }
      const sr = await fetch(`/api/patrons/generate-status?jobId=${encodeURIComponent(jobId)}`);
      const sj = await sr.json();
      if (!sr.ok) throw new Error(sj.error || sr.statusText);

      if (sj.status === 'done') {
        setJoinStatus(`READY: ${data.displayName || joinIdentity.name} (${sj.characterId || data.characterId})`);
        setJoinStatusError(false);
        setJoinBusy(false);
        // Immediate live barroom discovery event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('patron-roster-updated', {
              detail: { characterId: sj.characterId || data.characterId },
            })
          );
        }
        return;
      }
      if (sj.status === 'failed') {
        setJoinStatus(`GENERATION FAILED: ${sj.error || 'Pipeline failure'}`);
        setJoinStatusError(true);
        setJoinBusy(false);
        return;
      }

      const stageMsg = sj.statusMessage || `GENERATING ${data.displayName || joinIdentity.name}…`;
      const pctMsg = sj.progressPct ? ` [${sj.progressPct}%]` : '';
      setJoinStatus(`${stageMsg}${pctMsg}`);
      window.setTimeout(tick, pollMs);
    } catch (e) {
      window.setTimeout(tick, pollMs);
    }
  };
  ```

---

### 7. `src/components/JoinBarCamera.tsx`: Responsive Controls & Pre-Validation (`ticket-003.md`)

- **Lines 128–134 (`usePhoto` Pre-Validation):**
  ```typescript
  const usePhoto = useCallback(() => {
    if (!stillBlob) return;
    if (stillBlob.size < 1024) {
      setError('ERR: CAPTURE FAILED — RETAKE SELFIE');
      return;
    }
    const file = new File([stillBlob], 'join-selfie.jpg', {
      type: stillBlob.type || 'image/jpeg',
    });
    onCapture(file);
  }, [onCapture, stillBlob]);
  ```

- **Lines 158, 238, 246 (Responsive Navigation Controls):**
  Remove `disabled={busy}` so the user can close the overlay or abort the view while background generation runs:
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

---

### 8. `src/components/PatronLayer.tsx`: Immediate Simulation Discovery (`ticket-004.md`)

- **Lines 174–249 (`loadRoster` & Event Subscription):**
  Wire `patron-roster-updated` event listener to trigger immediate roster refresh and spawn evaluation:
  ```typescript
  useEffect(() => {
    const handleRosterUpdate = () => {
      void loadRoster().then(() => {
        trySpawn();
      });
    };
    window.addEventListener('patron-roster-updated', handleRosterUpdate);
    return () => window.removeEventListener('patron-roster-updated', handleRosterUpdate);
  }, [loadRoster, trySpawn]);
  ```

- **Lines 96–103 (`pickRandomFreeCharacterId`):**
  Preserve `STOCK_CHARACTER_IDS` priority so stock patrons (Elder, Caesar, Trump) claim the initial stools, while the newly registered join patron seamlessly fills the remaining stool (e.g. stool 4) without disrupting existing animations or seating positions.

---

## 4. Verification Checklists & Edge-Case Coverage

1. **Missing / Invalid Credentials (Edge Case 1):** Pre-flight check in `register/route.ts` returns HTTP 503 with `"Image generation credentials missing on server"` before starting background tasks or creating empty files.
2. **Concurrent Registrations (Edge Case 2):** Each registration receives an isolated `jobId`, staging directory, and per-job `plan.json`, preventing race conditions across concurrent player submissions.
3. **Session Interruption & Client Navigation (Edge Case 3):** Detached process execution with `child.unref()` ensures server-side generation runs to completion even if the player closes the browser, presses B to return to menus, or switches modes.
4. **Corrupt / Empty Images (Edge Case 4):** Pre-validation in `JoinBarCamera.tsx` and magic-byte validation in `register/route.ts` rejects empty or non-image submissions with HTTP 400.
5. **Zero Ghost Patrons (AC3):** Both `register/route.ts` and `roster/route.ts` verify all four ready-pack assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) before admission, completely eliminating ghost characters.
6. **Immediate Discovery (AC4):** Window event `'patron-roster-updated'` triggers immediate `loadRoster()` and `trySpawn()`, eliminating the 20-second latency.
7. **Stock Patron Preservation (AC6):** Stock characters retain seating priority, preserving all existing gameplay behavior.

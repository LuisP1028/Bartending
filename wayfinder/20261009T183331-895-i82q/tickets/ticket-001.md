---
ticket_id: 001
title: "Deterministic Credential Discovery, Execution Context & Root Path Alignment"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_105.md"
---

# Ticket 001: Deterministic Credential Discovery, Execution Context & Root Path Alignment

## Question
How does the system guarantee deterministic credential discovery (locating and loading `.env` across repository roots, parent worktrees, and server process environments) and resolve unified filesystem paths between Next.js server handlers, background child processes, and asset storage?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_105.md`
  - §Desired Functionality (1): "Submitting the photo with character creation intent must autonomously start the full generative asset pipeline without requiring any manual developer intervention, terminal commands, or server restarts."
  - §Desired Functionality (2): "The pipeline execution must run to completion under server runtime conditions, properly managing process lifecycle, memory, working directories, and environmental credentials."
  - §Edge Cases (1): "If required image generation API credentials are missing, invalid, or exhausted, the system must immediately reject or fail the job with a specific, intelligible error message. It must never initiate a silent hanging task or attempt to create empty files."
  - §Edge Cases (2): "If multiple players submit selfies concurrently or in rapid succession, each registration must be assigned an isolated job identity, dedicated staging paths, and independent execution tracking. Concurrent jobs must not overwrite one another's intermediate files or corrupt the shared runtime roster."

## Codebase Audit & Technical Discrepancy Analysis

### 1. The Worktree / Parent `.env` Credential Discrepancy
- **Audit Findings:**
  - In `scripts/patron-pipeline/lib/loadEnv.mjs` (L9–L37), `REPO_ROOT` is statically computed as `path.resolve(__dirname, '../../..')`.
  - When invoked inside an active git worktree (such as `.sandcastle/worktrees/agent-plan-20261009T183331-895-i82q`), `path.join(REPO_ROOT, '.env')` evaluates to `.sandcastle/worktrees/.../.env`, which does not exist.
  - The actual operational `.env` file containing `XAI_API_KEY` resides in the top-level repository root (`/Users/diesel/Desktop/bartending/Bartending/.env`).
  - When Next.js server starts in the worktree, Next.js does not load the parent `.env`. Consequently, `process.env.XAI_API_KEY` is undefined in the server process.
  - In `src/lib/runtimePatronStore.ts` (L155–L161), `hasImagineCredentials()` returns `false`.
  - In `src/app/api/patrons/register/route.ts` (L109–L117), the endpoint immediately aborts with HTTP 503 `"Imagine credentials missing"`.
  - In contrast, when operators run CLI commands manually from their user shell, the shell session frequently has `XAI_API_KEY` pre-exported or sourced from root `.env`, masking the technical failure in manual terminal runs.

### 2. Disparate Root Path Resolution Across Modules
- **Audit Findings:**
  - `src/lib/patronPackReady.ts` defines `resolveAppRoot()` (L18–L39), traversing candidates `[repoRoot, process.cwd(), path.resolve(process.cwd(), '..'), '/home/node/app']` to locate the folder containing `public/assets/patrons` or `public`.
  - `src/app/api/patrons/register/route.ts` calls `repoRoot()` which uses `resolveAppRoot(process.cwd())`.
  - `scripts/patron-pipeline/generate-patron-assets.mjs` (L47) hardcodes `REPO_ROOT = path.resolve(__dirname, '../..')` and does not accept `--repo-root` from CLI arguments or use `resolveAppRoot()`.
  - If `resolveAppRoot()` in Next.js chooses a root that differs from `__dirname/../..` (for example, when running inside nested worktrees or Docker containers), the web server spawns `generate-patron-assets.mjs` with a working directory `root`, but the script uses its internal `REPO_ROOT`, writing intermediate files and final assets into a disjoint path.

### 3. Shared File Concurrency Bottleneck in CLI Script
- **Audit Findings:**
  - In `scripts/patron-pipeline/generate-patron-assets.mjs` (L48, L357, L470), the script writes execution plans to a single shared file: `LAST_PLAN = path.join(__dirname, '.last-plan.json')`.
  - When multiple players submit selfies concurrently, concurrent invocations overwrite this shared file, corrupting stage plans and race-conditioning references.

## Architectural Decision & Solution Design

### 1. Multi-Candidate Traversal in `loadRepoEnv` & Credential Detection
- In `scripts/patron-pipeline/lib/loadEnv.mjs`:
  - Enhance `loadRepoEnv(envPath?)` to search multiple candidate locations if the default `REPO_ROOT/.env` is absent:
    1. Explicit `envPath` argument (if supplied).
    2. `process.env.REPO_ROOT/.env` (if defined).
    3. `path.join(REPO_ROOT, '.env')`.
    4. Parent directory hierarchy traversal (`path.resolve(REPO_ROOT, '../.env')`, `path.resolve(REPO_ROOT, '../../.env')`, `path.resolve(REPO_ROOT, '../../../.env')`).
    5. Parent `.env.local` variants.
  - Apply `applyEnvAliases()` immediately upon loading to ensure `XAIKEY`, `XAI_KEY`, `XAI_API_KEY`, `HF_TOKEN`, `HUGGINGFACE_TOKEN`, and `PII_ENCRYPTION_KEY` are populated in `process.env`.
- In `src/lib/runtimePatronStore.ts`:
  - Update `hasImagineCredentials()` to invoke environment resolution if keys are not currently populated in `process.env`, inspecting parent roots before declaring missing credentials.

### 2. Explicit `--repo-root` CLI Parameter & Working Directory Parity
- In `scripts/patron-pipeline/generate-patron-assets.mjs`:
  - Add `--repo-root <dir>` CLI argument to `parseArgs(argv)`.
  - When passed, bind `REPO_ROOT = path.resolve(args.repoRoot)`.
  - Default `REPO_ROOT` to `process.env.REPO_ROOT || resolveAppRoot(path.resolve(__dirname, '../..'))`.
- In `src/app/api/patrons/register/route.ts`:
  - Pass `--repo-root` with `root` (`resolveAppRoot(process.cwd())`) in the spawned argument list:
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
    ```
  - Forward `REPO_ROOT: root` in `childEnv`.

### 3. Pre-Flight Validation with Actionable Error Surface
- In `src/app/api/patrons/register/route.ts`:
  - Perform fail-fast validation before job creation:
    1. **Photo decodability check:** Verify photo buffer is at least 256 bytes, has valid magic bytes (JPEG `0xFF, 0xD8`, PNG `0x89, 0x50, 0x4E, 0x47`, or WEBP `RIFF`), and reject corrupt buffers with HTTP 400 and clear message `"Uploaded photo file is empty or not a supported image format (JPEG/PNG/WEBP)"`.
    2. **Credential verification:** Call updated `hasImagineCredentials()`. If false, return HTTP 503 with `"Image generation credentials missing on server. Please configure XAI_API_KEY (or XAIKEY / HF_TOKEN) in .env"`.
    3. Ensure no empty or dangling files are created when pre-flight fails.

### 4. Per-Job Plan File Isolation for Concurrent Invocations
- In `scripts/patron-pipeline/generate-patron-assets.mjs`:
  - Write stage plans to dedicated per-patron staging paths: `path.join(stagingDir, 'plan.json')` rather than the single shared `scripts/patron-pipeline/.last-plan.json`.
  - Maintain a non-conflicting `.last-plan.json` symlink/copy only when running interactive CLI, ensuring concurrent background tasks never clobber each other's execution context.

## Precise Contract & Transformation Specifications

### Contract 1: `scripts/patron-pipeline/lib/loadEnv.mjs`
```javascript
export function loadRepoEnv(envPath) {
  const candidatePaths = [
    envPath,
    process.env.REPO_ROOT ? path.join(process.env.REPO_ROOT, '.env') : null,
    path.join(REPO_ROOT, '.env'),
    path.resolve(REPO_ROOT, '../.env'),
    path.resolve(REPO_ROOT, '../../.env'),
    path.resolve(REPO_ROOT, '../../../.env'),
    path.join(REPO_ROOT, '.env.local'),
    path.resolve(REPO_ROOT, '../../../.env.local'),
  ].filter((p): p is string => Boolean(p) && fs.existsSync(p));

  for (const candidate of candidatePaths) {
    parseAndApplyEnv(candidate);
  }
  applyEnvAliases();
  return { loaded: candidatePaths.length > 0, paths: candidatePaths };
}
```

### Contract 2: `src/lib/runtimePatronStore.ts`
```typescript
export function hasImagineCredentials(): boolean {
  if (!process.env.XAI_API_KEY && !process.env.XAIKEY && !process.env.HF_TOKEN) {
    try {
      // Dynamic import / require of loadRepoEnv if running in Node server environment
      const { loadRepoEnv } = require('../../scripts/patron-pipeline/lib/loadEnv.mjs');
      loadRepoEnv();
    } catch {
      /* ignore if in client context */
    }
  }
  return !!(
    process.env.XAI_API_KEY ||
    process.env.XAIKEY ||
    process.env.HF_TOKEN
  );
}
```

### Contract 3: Image Buffer Header Validation
```typescript
function isValidImageBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 256) return false;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng =
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isWebp =
    buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return isJpeg || isPng || isWebp;
}
```

## Verification & Invariant Adherence
- **`INV-FAILFAST-01`**: Missing credentials or corrupt image buffers abort immediately with precise descriptive error messages, preventing background process spawning, empty file creation, or degraded execution.
- **`INV-BOUNDARY-01`**: Defines architectural and schema decisions without embedding execution holds or coding prohibitions.
- **`INV-MAP-01`**: Registered monotonically in `wayfinder/20261009T183331-895-i82q/tickets/ticket-001.md`.

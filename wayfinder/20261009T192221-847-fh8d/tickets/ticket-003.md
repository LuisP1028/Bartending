---
ticket_id: "003"
title: "Durable Job Telemetry & Asynchronous Lifecycle Tracking via PostgreSQL"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-002.md"]
governing_specification: "functional_specification_106.md"
---

# Ticket 003: Durable Job Telemetry & Asynchronous Lifecycle Tracking via PostgreSQL

## Question
How does the system transition asynchronous character generation job tracking from ephemeral local JSON files to the durable `generation_jobs` PostgreSQL table, ensuring that `POST /api/patrons/register`, background child process telemetry streams, and `GET /api/patrons/generate-status` read and write consistent state with zero race conditions across concurrent player registrations?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_106.md`
  - §Desired Functionality (2): "Registration requests must write their initial job state to a durable `generation_jobs` table. The pipeline must update job status (`queued` $\rightarrow$ `running` $\rightarrow$ `done` | `failed`), error messages, and log tails directly in PostgreSQL."
  - §Desired Functionality (2): "Clients polling `GET /api/patrons/generate-status?jobId=...` must receive consistent status updates from the database without race conditions or file-system locking failures."
  - §Edge Cases & Behavioral Boundaries (3): "Multiple concurrent player registrations must operate on independent rows in `generation_jobs` and isolated GCS object paths (`patrons/{characterId}/`), preventing collisions or corrupted states."
  - §Acceptance Criteria (AC3): "In-game registration jobs are tracked in PostgreSQL; status polling returns accurate real-time states and logs until completion or failure."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Ephemeral File Operations in `runtimePatronStore.ts`
- In `src/lib/runtimePatronStore.ts` (L123–L158):
  - `writeGenerationJob(repoRoot, job)` writes to `data/generation-jobs/${jobId}.json`.
  - `readGenerationJob(repoRoot, jobId)` reads from `data/generation-jobs/${jobId}.json`.
  - `updateGenerationJob(repoRoot, jobId, patch)` reads JSON, spreads `patch`, and overwrites the file.
- Under concurrent writes or rapid pipeline telemetry bursts, reading and writing flat JSON files can lead to race conditions, partial reads, and lost progress updates.

### 2. Registration and Status Endpoints Coupling to Local Files
- In `src/app/api/patrons/register/route.ts` (L141–L156): Initial job creation calls `writeGenerationJob`.
- In `src/app/api/patrons/register/route.ts` (L297–L303, L311–L316, L344–L349, L362–L367): Stream handlers, exit handlers, and watchdog timers invoke `updateGenerationJob`.
- In `src/app/api/patrons/generate-status/route.ts` (L22–L45): Polling handler calls `readGenerationJob`.
- None of these components currently read from or write to a relational database.

## Architectural Decision & Solution Design

### 1. Database-Backed Job Store Functions
- Refactor `src/lib/runtimePatronStore.ts` to implement async database queries against `generation_jobs`:
  - `insertGenerationJobDb(job: GenerationJobRecord): Promise<void>`
    ```sql
    INSERT INTO generation_jobs (
      job_id, character_id, display_name, status,
      current_stage, stage_index, total_stages, progress_pct,
      status_message, error, log_tail, photo_path, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
    ```
  - `getGenerationJobDb(jobId: string): Promise<GenerationJobRecord | null>`
    ```sql
    SELECT
      job_id AS "jobId",
      character_id AS "characterId",
      display_name AS "displayName",
      status,
      current_stage AS "currentStage",
      stage_index AS "stageIndex",
      total_stages AS "totalStages",
      progress_pct AS "progressPct",
      status_message AS "statusMessage",
      error,
      log_tail AS "logTail",
      photo_path AS "photoPath",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM generation_jobs
    WHERE job_id = $1;
    ```
  - `updateGenerationJobDb(jobId: string, patch: Partial<GenerationJobRecord>): Promise<GenerationJobRecord | null>`
    Construct dynamic parameterised SQL update updating provided fields along with `updated_at = NOW()`, returning the updated row.

### 2. Updating Server Route Endpoints
- In `src/app/api/patrons/register/route.ts`:
  - Await `insertGenerationJobDb(job)` when creating the in-flight job record.
  - In `handleOutput` (stdout/stderr parser):
    - Update `generation_jobs` in PostgreSQL with `stageIndex`, `totalStages`, `progressPct`, `currentStage`, `statusMessage`, and `logTail`.
    - Apply a 1-second debounce/throttle per job to prevent saturating the PostgreSQL connection pool during rapid log output.
  - In watchdog timer (`watchdogTimer`):
    - When stalled or timed out, await `updateGenerationJobDb` to mark `status = 'failed'` with actionable diagnostic message.
  - In child process exit handler:
    - If `code === 0` and pack verification passes: set `status = 'done'`, `progressPct = 100`.
    - If failed: set `status = 'failed'`, recording specific error messages.

### 3. Status Polling Endpoint (`src/app/api/patrons/generate-status/route.ts`)
- Await `getGenerationJobDb(jobId)`.
- If job not found: return HTTP 404 with `{ error: 'job not found' }`.
- Return normalized JSON response with `jobId`, `characterId`, `displayName`, `status`, stage metrics, `error`, `logTail`, and GCS `sitSrc` when `status === 'done'`.

## Precise Contract & Transformation Specifications

### 1. `GenerationJobRecord` TypeScript Interface
```typescript
export type GenerationJobStatus = 'queued' | 'running' | 'done' | 'failed';

export interface GenerationJobRecord {
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
  photoPath?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2. Migration & Concurrency Isolation
- Rows in `generation_jobs` are strictly keyed by unique UUID `job_id`. Multiple concurrent player registrations write to isolated rows.
- No disk access under `data/generation-jobs/` is required for production persistence.

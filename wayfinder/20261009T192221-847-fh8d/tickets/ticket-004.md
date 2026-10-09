---
ticket_id: "004"
title: "Relational Active Roster Management, Cloud Readiness Verification & Ghost Prevention"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md", "ticket-002.md"]
governing_specification: "functional_specification_106.md"
---

# Ticket 004: Relational Active Roster Management, Cloud Readiness Verification & Ghost Prevention

## Question
How does the system evolve ready-pack verification to validate sprite assets directly in Google Cloud Storage, transition the active patron roster query (`GET /api/patrons/roster`) to PostgreSQL, enforce atomic admission gating (`is_ready = true`) to prevent ghost patrons, and guarantee built-in fallback resilience preserving stock patrons during transient database latency?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_106.md`
  - §Desired Functionality (2): "The live game API route (`GET /api/patrons/roster`) must query PostgreSQL to deliver a unified, validated patron roster to `PatronLayer.tsx`."
  - §Desired Functionality (3): "A patron record in the `patrons` table must never be flagged as ready or active (`is_ready = true`) until all four ready pack assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) are verified to exist in GCS and are publicly readable."
  - §Desired Functionality (3): "If cloud upload fails or is interrupted, the generation job must record a terminal `failed` state in the database, preventing any phantom or broken character from appearing in the barroom simulation."
  - §Desired Functionality (5): "Built-in Fallback Resilience: The system must retain built-in stock patrons (Elder, Caesar, Trump) as an immutable foundation. In the event of temporary database latency or transient cloud storage degradation, the bar simulation must gracefully preserve stock patron gameplay without crashing or rendering an empty barroom."
  - §Edge Cases & Behavioral Boundaries (5): "Partial Asset Loss: If any individual sprite in GCS is deleted or inaccessible, the roster query must detect the missing asset and exclude that patron from the active spawn pool until the ready pack is intact."
  - §Acceptance Criteria (AC2, AC5): "The live bar simulation queries active patrons from the PostgreSQL database, correctly displaying both stock and cloud-persisted patrons... Patrons are admitted to the active spawn roster only after all four required sprite PNGs are confirmed readable in GCS; failed jobs create zero ghost patrons."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Local Filesystem Coupling in `patronPackReady.ts`
- In `src/lib/patronPackReady.ts` (L97–L114): `isPatronPackReady(repoRoot, characterId)` checks whether `sit.png`, `talk.png`, `walk_01.png`, and `walk_02.png` exist on local disk under `public/assets/patrons/${characterId}/`.
- On cloud deployments or migrated hosts, local disk is empty, causing `isPatronPackReady` to return `false` for valid cloud-persisted patrons.

### 2. Flat-File Reads in `roster/route.ts`
- In `src/app/api/patrons/roster/route.ts` (L30–L70):
  - Calls `readRuntimePatrons(root)` which reads `data/runtime-patrons.json`.
  - Filters using local disk `isPatronPackReady`.
  - Constructs URLs pointing to `/api/patrons/assets/${id}/...` (disk-serving endpoint).
- If the server restarts or runs in a fresh container, all join patrons disappear from the roster.

## Architectural Decision & Solution Design

### 1. Cloud-Aware Ready-Pack Verification (`isPatronPackCloudReady`)
- In `src/lib/patronPackReady.ts`:
  - Retain local check as fallback for local asset testing, but introduce `isPatronPackCloudReady(characterId: string, cloudAssets?: PatronCloudAssets): Promise<boolean>`:
    - Verifies via GCS SDK (`bucket.file(...).exists()`) or authenticated HEAD requests that the 4 essential sprites (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) exist in GCS and have content length $> 0$.
    - Ensures non-empty PNG magic bytes verification.

### 2. Roster Query Endpoint Migration (`src/app/api/patrons/roster/route.ts`)
- Replace flat-file reading with PostgreSQL query:
  ```sql
  SELECT
    id,
    display_name AS "displayName",
    personality,
    walk_frame_count AS "walkFrameCount",
    walk_frame_ms AS "walkFrameMs",
    sit_url AS "sitUrl",
    talk_url AS "talkUrl",
    walk_01_url AS "walk01Url",
    walk_02_url AS "walk02Url",
    source_url AS "sourceUrl",
    created_at AS "createdAt"
  FROM patrons
  WHERE is_ready = TRUE AND is_active = TRUE
  ORDER BY created_at ASC;
  ```
- Build `CharacterDef` entries with direct cloud URLs:
  - `sitSrc`: row.sitUrl
  - `talkSrc`: row.talkUrl
  - `walkFrames`: [row.walk01Url, row.walk02Url]
- Merge with immutable stock characters from `CHARACTERS` (`patron_elder`, `caesar_...`, `trump_...`).

### 3. Built-In Fallback Resilience
- In `roster/route.ts`:
  - Wrap database query in a robust try/catch block.
  - If PostgreSQL query fails (due to temporary latency, network hiccup, or offline DB):
    - Log explicit error: `console.error('[roster] PostgreSQL query failed, falling back to immutable stock patrons:', error)`.
    - Return `characters: Object.values(CHARACTERS)` with HTTP 200 and `{ ok: true, fallback: true }`.
    - The live barroom continues operating with Elder, Caesar, and Trump, guaranteeing zero empty barrooms or client crashes.

### 4. Strict Cloud Readiness Gate on Registration Completion
- In `src/app/api/patrons/register/route.ts` (child exit handler):
  - On pipeline success (`code === 0`):
    - Verify cloud assets exist using `isPatronPackCloudReady(identity.characterId)`.
    - If verified:
      - Upsert row into `patrons` with `is_ready = TRUE`, `is_active = TRUE`, and permanent GCS URLs.
      - Update `generation_jobs` with `status = 'done'`, `progressPct = 100`, `sitSrc = gcsUrls.sitUrl`.
    - If cloud verification fails:
      - Do NOT insert or activate patron in `patrons`.
      - Update `generation_jobs` with `status = 'failed'` and descriptive error `"Cloud verification failed: ready pack assets missing in GCS"`.

## Precise Contract & Transformation Specifications

### 1. `GET /api/patrons/roster` Response Payload Contract
```typescript
export interface PatronRosterResponse {
  ok: boolean;
  storage: 'cloud-postgres';
  characters: Array<{
    id: string;
    displayName: string;
    personality: string;
    walkFrameCount: number;
    walkFrameMs: number;
    sitSrc: string;     // e.g. "https://storage.googleapis.com/bartending-patron-assets/patrons/cool_guy_.../sit.png"
    walkFrames: string[]; // [".../walk_01.png", ".../walk_02.png"]
    talkSrc: string | null;
  }>;
  runtimeCount: number;
  fallback?: boolean;
}
```

### 2. Ghost Patron Prevention Invariant
- A patron cannot be inserted into `patrons` with `is_ready = TRUE` without preceding successful GCS verification.
- Any patron lacking any of the 4 ready pack URLs is excluded from `GET /api/patrons/roster`.

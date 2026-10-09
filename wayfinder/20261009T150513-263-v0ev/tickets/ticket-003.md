---
ticket_id: "003"
title: "Local SQLite Database & Runtime JSON Persistence"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_99.md"
---

# Ticket 003: Local SQLite Database & Runtime JSON Persistence

## Question
How must local database storage (`data/patrons.sqlite`) and runtime JSON registers (`data/runtime-patrons.json`, `data/generation-jobs/*.json`) be structured, initialized, and maintained on disk to guarantee deterministic state persistence across local workstation server restarts without remote ephemeral wipeouts or external synchronization dependencies?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_99.md` Current Baseline §3 ("Remote Ephemeral Runtime"), Desired Functionality §2 ("Data Persistence"), Edge Case 4 ("Native Module Compatibility"), and AC6 ("Local Data Persistence").
- **Current Baseline:**
  - On Hugging Face Spaces, `/data` was ephemeral and lost on container restart unless a persistent cloud volume was mounted.
  - SQLite storage for encrypted patron PII is defined in `scripts/patron-pipeline/lib/patronDb.mjs` targeting `data/patrons.sqlite` using `better-sqlite3`.
  - In `src/app/api/patrons/register/route.ts`, PII SQLite storage was marked optional with a warning string (`PII store not wired on API path`).
  - Runtime character records are persisted in `data/runtime-patrons.json` by `src/lib/runtimePatronStore.ts`.
- **Affected Files:**
  - `src/lib/runtimePatronStore.ts` (lines 39-47, 59-81, 87-99)
  - `scripts/patron-pipeline/lib/patronDb.mjs` (lines 15-52, 74-135)
  - `src/app/api/patrons/register/route.ts` (lines 57-65, 181-221)
  - `data/.gitkeep`

## Architectural Decisions to Lock
1. **Local Persistent Storage Root (`data/`):**
   - All persistent local state resides deterministically under `<repoRoot>/data/`:
     - `data/patrons.sqlite`: SQLite database for encrypted patron records.
     - `data/runtime-patrons.json`: Persistent roster registry for dynamically joined patrons.
     - `data/generation-jobs/*.json`: Asynchronous character generation status records.
   - On local workstation execution, these files reside on the host disk filesystem and naturally survive server shutdowns, terminal reloads, and application restarts.
2. **Deterministic SQLite Initialization Contract:**
   - In `scripts/patron-pipeline/lib/patronDb.mjs`:
     ```sql
     CREATE TABLE IF NOT EXISTS patrons (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       character_id TEXT NOT NULL UNIQUE,
       contact_hash TEXT NOT NULL UNIQUE,
       name_enc TEXT NOT NULL,
       email_enc TEXT,
       phone_enc TEXT,
       created_at TEXT NOT NULL,
       updated_at TEXT NOT NULL
     );
     CREATE INDEX IF NOT EXISTS idx_patrons_contact_hash ON patrons(contact_hash);
     ```
   - WAL journal mode (`PRAGMA journal_mode = WAL;`) and foreign keys (`PRAGMA foreign_keys = ON;`) ensure ACID guarantees and crash resilience on local disk.
3. **Runtime Roster Integrity Contract:**
   - In `src/lib/runtimePatronStore.ts`, `dataDir(repoRoot)` automatically creates `data/` via `fs.mkdirSync(d, { recursive: true })`.
   - `readRuntimePatrons()` filters and validates ready packs on disk, persisting updates back to `data/runtime-patrons.json`.
   - State persists across server restarts on local disk.
4. **API Route Registration Persistence:**
   - When a patron registers via `/api/patrons/register` with `runPipeline=true`, upon pipeline completion (`code === 0 && packReady`), `upsertRuntimePatron()` persists the record to `data/runtime-patrons.json`.
   - If `PII_ENCRYPTION_KEY` is present, the pipeline child process records encrypted PII in `data/patrons.sqlite` via `upsertPatronPii()`.
   - If `PII_ENCRYPTION_KEY` is not provided, the pipeline gracefully bypasses encrypted PII storage without crashing registration or game loop execution.

## Scope & Invariant Guardrails
- **In Scope:** Persistent database schema initialization, JSON roster persistence, local filesystem directory creation, server restart survival.
- **Out of Scope:** Cloud database synchronization (e.g. PostgreSQL, Supabase) or external volume provisioning for cloud containers.

---

## Resolution

### 1. Database Schema & Path Resolution
The local SQLite store path resolves to `path.join(repoRoot, 'data', 'patrons.sqlite')` or the explicit override `process.env.PATRON_DB_PATH`.
Initialization guarantees table existence:
```javascript
export function openPatronDb(repoRoot = process.cwd()) {
  const dbPath = defaultDbPath(repoRoot);
  if (_db && _dbPath === dbPath) return _db;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS patrons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id TEXT NOT NULL UNIQUE,
      contact_hash TEXT NOT NULL UNIQUE,
      name_enc TEXT NOT NULL,
      email_enc TEXT,
      phone_enc TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_patrons_contact_hash ON patrons(contact_hash);
  `);

  _db = db;
  _dbPath = dbPath;
  return db;
}
```

### 2. Verification of Server Restart Persistence
Testing persistence across server restarts consists of:
1. Writing a test record to `data/runtime-patrons.json` or `data/patrons.sqlite`.
2. Terminating the Next.js process (`SIGTERM` / `SIGINT`).
3. Re-launching `npm run dev` or calling `readRuntimePatrons(root)` / `openPatronDb(root)`.
4. Confirming the records remain present on local disk with 100% data fidelity.

### 3. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks [Local Static & Dynamic Asset Serving and Zero-Ghost Integrity (ticket-004.md)](./ticket-004.md) and [Local Runtime Verification Protocol & Subsystem Smoke Test (ticket-006.md)](./ticket-006.md).

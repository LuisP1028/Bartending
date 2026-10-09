---
ticket_id: "002"
title: "PostgreSQL Managed Connection Pool, Lifecycle Governance & Database Schema Architecture"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_106.md"
---

# Ticket 002: PostgreSQL Managed Connection Pool, Lifecycle Governance & Database Schema Architecture

## Question
How does the system establish managed connection pooling using `pg.Pool` with resilient reconnection handling and lifecycle governance, define the exact relational DDL schema definitions for `patrons`, `generation_jobs`, and `patron_pii`, and ensure seamless schema bootstrap without crashing the Next.js server runtime during transient database latency?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_106.md`
  - §Desired Functionality (2): "The central relational database responsible for persistently maintaining the active patron roster, generation job lifecycles, and contact records."
  - §Desired Functionality (2): "Active Patron Roster (`patrons`): The system must persist character identity records in a PostgreSQL database table containing unique character identifier, display alias, personality routing key, animation configuration, direct GCS URLs, readiness/active flags, and timestamps."
  - §Desired Functionality (2): "Asynchronous Generation Job Tracking (`generation_jobs`): Registration requests must write their initial job state to a durable `generation_jobs` table. The pipeline must update job status, error messages, and log tails directly in PostgreSQL."
  - §Desired Functionality (2): "Secure Patron Contact Store (`patron_pii`): Player contact details provided during registration must be persistently recorded in an isolated `patron_pii` table linked by character identifier."
  - §Edge Cases & Behavioral Boundaries (2): "The application must utilize managed connection pooling with reconnection handling so transient network hiccups between the server and the PostgreSQL database do not crash the Next.js process."
  - §Acceptance Criteria (AC2, AC4): "The live bar simulation queries active patrons from the PostgreSQL database... Restarting the Next.js server, clearing local scratch directories, or launching the app on a new host preserves all created patrons without data loss."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Ephemeral Flat-File & In-Memory State Limitations
- Currently, patron roster entries are stored in flat JSON file `data/runtime-patrons.json`.
- Generation job states are written to individual JSON files in `data/generation-jobs/${jobId}.json`.
- When Docker containers rebuild or code is deployed to a remote server, all files in `data/` are lost.
- In-flight jobs risk file locking collisions and inconsistent reads during concurrent updates.

### 2. Database Driver & Dependency Selection
- `package.json` contains `better-sqlite3`, which was only used for local PII in `patronDb.mjs`.
- PostgreSQL drivers (`pg` and `@types/pg`) are not installed.
- Next.js server routes require a singleton `Pool` instance that handles connection pooling across hot-reloading in dev and concurrent HTTP requests in production.

## Architectural Decision & Solution Design

### 1. PostgreSQL Package & Driver Installation
- Add `pg` to `dependencies` and `@types/pg` to `devDependencies` in `package.json`.
- Create database connection singleton module at `src/lib/db.ts`.

### 2. Managed Connection Pool Configuration
- Configuration resolution:
  - If `process.env.DATABASE_URL` or `process.env.POSTGRES_URL` is set, pass connection string to `new Pool({ connectionString, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false } })`.
  - Otherwise, parse standard PostgreSQL parameters:
    - `host`: `process.env.PGHOST || '127.0.0.1'`
    - `port`: `Number(process.env.PGPORT || 5432)`
    - `database`: `process.env.PGDATABASE || 'bartending'`
    - `user`: `process.env.PGUSER || 'postgres'`
    - `password`: `process.env.PGPASSWORD || ''`
    - `ssl`: `process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false`
- Pool lifecycle governance:
  - `max`: 10 (maximum concurrent connections in pool)
  - `idleTimeoutMillis`: 30,000 (close idle connections after 30 seconds)
  - `connectionTimeoutMillis`: 5,000 (fail fast if connection cannot be acquired within 5 seconds)
  - Attach `pool.on('error', (err) => { console.error('Unexpected error on idle PostgreSQL client:', err); })` to prevent unhandled process crashes.

### 3. Exact Relational DDL Schemas

#### A. Active Patron Roster Table (`patrons`)
```sql
CREATE TABLE IF NOT EXISTS patrons (
  id VARCHAR(255) PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  personality VARCHAR(255) NOT NULL,
  walk_frame_count INT NOT NULL DEFAULT 2,
  walk_frame_ms INT NOT NULL DEFAULT 120,
  sit_url TEXT NOT NULL,
  talk_url TEXT NOT NULL,
  walk_01_url TEXT NOT NULL,
  walk_02_url TEXT NOT NULL,
  source_url TEXT,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patrons_active_ready ON patrons(is_active, is_ready);
CREATE INDEX IF NOT EXISTS idx_patrons_created_at ON patrons(created_at);
```

#### B. Asynchronous Generation Jobs Table (`generation_jobs`)
```sql
CREATE TABLE IF NOT EXISTS generation_jobs (
  job_id VARCHAR(255) PRIMARY KEY,
  character_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'queued' | 'running' | 'done' | 'failed'
  current_stage VARCHAR(100),
  stage_index INT,
  total_stages INT,
  progress_pct INT,
  status_message TEXT,
  error TEXT,
  log_tail TEXT,
  photo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_character_id ON generation_jobs(character_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
```

#### C. Encrypted Patron PII Table (`patron_pii`)
```sql
CREATE TABLE IF NOT EXISTS patron_pii (
  id SERIAL PRIMARY KEY,
  character_id VARCHAR(255) NOT NULL,
  contact_hash VARCHAR(255) NOT NULL UNIQUE,
  name_enc TEXT NOT NULL,
  email_enc TEXT,
  phone_enc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patron_pii_contact_hash ON patron_pii(contact_hash);
CREATE INDEX IF NOT EXISTS idx_patron_pii_character_id ON patron_pii(character_id);
```

### 4. Automatic Schema Bootstrapping
- Export `ensureSchema(): Promise<void>` in `src/lib/db.ts`.
- When invoked, execute the DDL definitions idempotently using `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
- Call `ensureSchema()` on initial module load or first database operation with a cached promise guard to avoid duplicate DDL executions.

## Precise Contract & Transformation Specifications

### 1. `src/lib/db.ts` Exported Functions
```typescript
import { Pool, QueryResult, QueryResultRow } from 'pg';

export function getDbPool(): Pool;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>>;

export async function ensureSchema(): Promise<void>;

export async function checkDatabaseHealth(): Promise<boolean>;
```

### 2. Error Governance & Resilience
- Any query syntax error, constraint violation, or connection failure immediately throws an explicit Error indicating the query purpose and cause.
- Idle client errors are caught and logged by the pool listener without terminating the application.

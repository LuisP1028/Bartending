---
ticket_id: "003"
title: "Durable Persona Persistence, Metadata Ingestion & Relational Schema Standardization"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-002.md"]
governing_specification: "functional_specification_108.md"
---

# Ticket 003: Durable Persona Persistence, Metadata Ingestion & Relational Schema Standardization

## Question
How do the patron metadata records (`meta.json`), relational database schema (`src/lib/db.ts`), runtime persistence store (`src/lib/runtimePatronStore.ts`), and pipeline generation CLI (`scripts/patron-pipeline/generate-patron-assets.mjs`) durably persist the patron's `aboutMe` bio and prompt file readiness flag (`prompt_ready`) across local filesystem and PostgreSQL tables?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_108.md`
  - §Desired Functionality (3): "Metadata Record Ingestion: The patron's `meta.json` must be updated to store `aboutMe` as an explicit field."
  - §Desired Functionality (3): "Relational Database Synchronization: When database persistence is active, the `patrons` table record must store the `about_me` text and a flag indicating prompt file readiness."
  - §Glossary: "Durable Persona Record: The relational database persistence of the character's 'About Me' bio and prompt configuration alongside their visual assets and contact records."
  - §Acceptance Criteria (AC4): "Metadata Persistence: `meta.json` inside the patron folder contains the `aboutMe` string attribute matching the submitted form value."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Incomplete `meta.json` Schema
In `src/lib/patronFolders.ts` (L20–L29) and `scripts/patron-pipeline/lib/patronFolder.mjs` (L38–L47):
```typescript
export type PatronMeta = {
  version: number;
  characterId: string;
  folderSlug: string;
  displayName: string;
  contactHash: string;
  contactKind: string | null;
  createdAt: string;
  updatedAt: string;
};
```
The schema omits `aboutMe`. When `meta.json` is generated or updated, the submitted bio is lost from the folder's metadata file.

### 2. Missing Relational Columns in PostgreSQL Schema
In `src/lib/db.ts` (L60–L75), table `patrons` definition includes:
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
```
There is no `about_me` column to preserve the user's bio, nor a `prompt_ready` boolean flag indicating that `personality.txt` has been materialized and validated.

### 3. Pipeline CLI CLI Argument Gap
In `scripts/patron-pipeline/generate-patron-assets.mjs` (L78–L158), `parseArgs` parses `--name`, `--email`, `--phone`, and `--character-id`, but has no `--about-me` argument. Furthermore, `maybeUpsertPostgresPatron` (L633–L650) does not include `about_me` or `prompt_ready` in its `INSERT` / `ON CONFLICT` queries.

## Architectural Decisions to Lock

### 1. `meta.json` Record Ingestion
- In `src/lib/patronFolders.ts` and `scripts/patron-pipeline/lib/patronFolder.mjs`:
  - Update `PatronMeta` interface:
    ```typescript
    export type PatronMeta = {
      version: number;
      characterId: string;
      folderSlug: string;
      displayName: string;
      contactHash: string;
      contactKind: string | null;
      aboutMe?: string;
      createdAt: string;
      updatedAt: string;
    };
    ```
  - In `ensurePatronFolders`:
    ```typescript
    const meta: PatronMeta = {
      version: 1,
      characterId: identity.characterId,
      folderSlug: slug,
      displayName: identity.displayName,
      contactHash: identity.contactHash,
      contactKind: identity.contactKind || null,
      aboutMe: identity.aboutMe || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ```
  - When merging previous `meta.json`:
    ```typescript
    if (fs.existsSync(metaPath)) {
      try {
        const prev = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as Partial<PatronMeta>;
        meta.createdAt = prev.createdAt || meta.createdAt;
        meta.displayName = identity.displayName || prev.displayName || meta.displayName;
        meta.aboutMe = identity.aboutMe || prev.aboutMe || meta.aboutMe;
      } catch {
        /* replace */
      }
    }
    ```

### 2. Relational Database Schema Migration (`src/lib/db.ts`)
- Update `ensureSchema()` in `src/lib/db.ts` to add schema migrations:
  ```sql
  ALTER TABLE patrons ADD COLUMN IF NOT EXISTS about_me TEXT;
  ALTER TABLE patrons ADD COLUMN IF NOT EXISTS prompt_ready BOOLEAN NOT NULL DEFAULT FALSE;
  ```
- Update the base `CREATE TABLE IF NOT EXISTS patrons` statement to include:
  ```sql
  about_me TEXT,
  prompt_ready BOOLEAN NOT NULL DEFAULT FALSE,
  ```

### 3. Runtime Patron Store Synchronization (`src/lib/runtimePatronStore.ts`)
- Update `RuntimePatronRecord`:
  ```typescript
  export interface RuntimePatronRecord {
    id: string;
    displayName: string;
    personality: string;
    aboutMe?: string;
    promptReady?: boolean;
    walkFrameCount: number;
    walkFrameMs: number;
    sitUrl?: string;
    talkUrl?: string;
    walk01Url?: string;
    walk02Url?: string;
    sourceUrl?: string;
    isReady?: boolean;
    isActive?: boolean;
    createdAt: string;
    updatedAt?: string;
  }
  ```
- In `readRuntimePatronsDb`:
  - Query columns `about_me`, `prompt_ready`.
  - Map `aboutMe: row.about_me ?? undefined` and `promptReady: row.prompt_ready ?? false`.
- In `upsertRuntimePatronDb`:
  - Add `aboutMe?: string; promptReady?: boolean` to the parameter payload.
  - Include `about_me, prompt_ready` in `INSERT INTO patrons (...)` and `ON CONFLICT (id) DO UPDATE SET about_me = EXCLUDED.about_me, prompt_ready = EXCLUDED.prompt_ready`.

### 4. CLI Pipeline Propagation (`scripts/patron-pipeline/generate-patron-assets.mjs`)
- In `parseArgs(argv)`:
  - Add `aboutMe: null` to output object.
  - Add case:
    ```javascript
    case '--about-me':
      out.aboutMe = next();
      break;
    ```
- In `src/app/api/patrons/register/route.ts`:
  - Pass `--about-me` when spawning the background generation script:
    ```typescript
    ...(aboutMe ? ['--about-me', aboutMe] : []),
    ```
- In `maybeUpsertPostgresPatron`:
  - Include `about_me` and `prompt_ready = TRUE` in the SQL `INSERT` and `ON CONFLICT` query.

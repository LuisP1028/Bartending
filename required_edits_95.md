# RE95 — Unblock Join Use Photo so full generative `--run` is called

**Spec:** [functional_specification_95.md](./functional_specification_95.md)  
**Map:** [wayfinder/map-078.md](./wayfinder/map-078.md)  
**Research:** [wayfinder/research/join-pipeline-dynamic-import-failure.md](./wayfinder/research/join-pipeline-dynamic-import-failure.md)  
**Context pack:** `aaa90/`  
**Goal:** Once a user uploads a photo on Join (Use Photo), the **generative pipeline is actually started** (product CLI equivalent: `node scripts/patron-pipeline/generate-patron-assets.mjs --run …`).

**DO NOT CODE until operator authorizes after documentation sufficiency.**

---

## Problem (locked)

`src/app/api/patrons/register/route.ts` uses `loadPipelineMod(rel)`:

- builds `pathToFileURL(path.join(process.cwd(), rel)).href`
- then `import(href)` with a **fully dynamic** expression

Next’s server bundler rejects this (`expression is too dynamic` / cannot find module). That runs **before** `spawn(... generate-patron-assets.mjs --run ...)`, so generation never starts even though the client already sends `runPipeline=1` + photo.

**FS94 async job + poll UX is fine.** Fix the **pre-spawn module load** so the existing spawn path executes.

---

## Chosen approach (decision for implementer)

**Do not** keep runtime `import(variableUrl)` of `scripts/**/*.mjs` from the Next route.

**Do:**

1. **Port** (or reimplement byte-for-byte algorithmically) the **register-route helpers** that today come from pipeline `.mjs` into **TypeScript modules under `src/lib/`** that the route can **statically** import.  
2. Keep **generation** as **child process** `spawn(process.execPath, [script, '--run', …])` of the existing CLI (unchanged product engine).  
3. Treat `registerCharacterInSource` (patch `characters.ts`) as **optional / best-effort** — production roster remains `data/runtime-patrons.json` via existing FS94 close handler.  
4. Treat PII SQLite upsert as **optional / best-effort** without dynamic `.mjs` import — either port a thin TS path that already works with `better-sqlite3` + existing server packages, or soft-fail with `piiError` string and still generate.

**Do not** require the coding agent to redesign Imagine skills, walk counts, or Join camera UI for this ticket.

---

## Files to touch

| File | Role |
|------|------|
| **New** `src/lib/patronIdentity.ts` (name may vary; one module ok) | Port of `scripts/patron-pipeline/lib/characterId.mjs` exports used by register: at least `resolvePatronIdentity` (+ helpers it needs) |
| **New** `src/lib/patronFolders.ts` (or same module as above) | Port of `ensurePatronFolders` from `patronFolder.mjs` |
| Optional **New** `src/lib/registerCharacterSource.ts` | Optional port of `registerCharacterInSource`, or delete call |
| Optional PII | Port or skip dynamic load; must not block generation |
| `src/app/api/patrons/register/route.ts` | Remove `loadPipelineMod` + `pathToFileURL` dynamic import; use static `@/lib/...` imports; **preserve** job write + `spawn(--run)` when `runPipeline` + photo + credentials |
| `src/lib/runtimePatronStore.ts` | No behavioral change required unless helpers move here; keep `hasImagineCredentials`, job, runtime roster |
| Client `page.tsx` / `JoinBarCamera.tsx` | **No change required** if API contract unchanged (`jobId`, status poll) |
| CLI `generate-patron-assets.mjs` | **No change required** for the gate; remains the generative process |

Copy set for implementer context: `aaa90/`.

---

## Edit 1 — TypeScript identity helper (required)

**Source of truth for behavior:** `scripts/patron-pipeline/lib/characterId.mjs` (also in `aaa90/characterId.mjs`).

**Create** a server-usable module under `src/lib/` that exports the same semantics as:

- `resolvePatronIdentity({ name, email, phone })` →  
  `{ displayName, characterId, folderSlug, contactHash, contactKind }`  
- Same hash: sha256 of `patron-identity:v1:${normalized}` truncated to 16 hex  
- Same name sanitize + slug `{sanitizedName}_{hash}`  

**Constraints:**

- Use Node `crypto` (route is already `runtime = 'nodejs'`).  
- **Static** import only from the register route (e.g. `import { resolvePatronIdentity } from '@/lib/patronIdentity'`).  
- Do **not** change the hash/slug algorithm (re-joiners / folders must stay stable with CLI).

---

## Edit 2 — TypeScript folder helper (required)

**Source:** `scripts/patron-pipeline/lib/patronFolder.mjs`.

**Create** (or co-locate) `ensurePatronFolders(repoRoot, identity)` that:

- Ensures `public/assets/patrons/{slug}/` and `scripts/patron-pipeline/staging/{slug}/`  
- Writes `meta.json` without raw email/phone (same fields as existing meta writer)  
- Returns `{ publicDir, stagingDir, metaPath, meta }`  

Register route must call this **via static import**, not `loadPipelineMod`.

---

## Edit 3 — Register route: remove dynamic pipeline import (required)

**File:** `src/app/api/patrons/register/route.ts`

### Delete / stop using

- `loadPipelineMod`  
- `import { pathToFileURL } from 'url'` if only used for that  
- Any `await import(runtimeComputedHref)` of pipeline scripts  

### Replace with

- Static imports of Edit 1–2 helpers  
- Optional: static import of a small TS registerCharacter / PII helper, or **try/catch omit** with same response fields (`registered`, `pii`, `piiError`)  

### Preserve (must remain after successful load)

Order of existing generate path:

1. Validate name + email|phone  
2. Resolve identity + ensure folders  
3. Optional PII  
4. Write photo to staging (+ public source copy) when file present  
5. Optional `registerCharacterInSource` (dev only; must not throw out the request)  
6. If **not** `runPipeline`: return registered-only payload (existing)  
7. If `runPipeline` and no photo: **400** photo required  
8. If `runPipeline` and `!hasImagineCredentials()`: **503** clear message (existing)  
9. Create `jobId`, `writeGenerationJob` status `running`  
10. **`spawn(process.execPath, [generate-patron-assets.mjs, '--run', '--photo', photoPath, '--name', name, '--character-id', characterId, '--no-register', optional email/phone], { cwd: root, env: process.env, stdio pipes })`**  
11. On child close 0: `upsertRuntimePatron` + job `done`; else job `failed` with log tail  
12. Return JSON with `ok`, `jobId`, `status: 'running'`, `pipeline.mode: 'run-async'`, etc. (existing contract)

**Critical acceptance:** With generate + photo + credentials, step 10 **runs** (process spawned). No 500 from dynamic import.

### Photo path

Keep writing selfie under staging as today so `--photo` is an absolute path the child can read.

---

## Edit 4 — Optional PII / characters.ts (non-blocking)

| Concern | Required behavior |
|---------|-------------------|
| PII encrypt DB | Must not use dynamic `import(href)` of `patronDb.mjs`. Prefer soft-fail `piiError` if not ported; generation still proceeds. |
| `registerCharacterInSource` | Optional; failures must not prevent spawn. Runtime roster on job success remains authoritative for HF. |

If PII is ported: reuse `better-sqlite3` already in `serverExternalPackages`; keep encryption key env semantics identical to pipeline.

---

## Edit 5 — Do not break CLI parity

- CLI continues to import its own `.mjs` libs (no Next).  
- Identity hash/slug in TS **must match** `characterId.mjs` so API-created folders align with `--run --character-id`.  
- Register already passes `--character-id` and `--no-register`; keep that so child does not fight runtime roster.

---

## Edit 6 — Client / status (verify only)

| Surface | Expectation |
|---------|-------------|
| `page.tsx` `onJoinCapture` | Still sets `runPipeline=1`, requires `jobId`, polls `/api/patrons/generate-status` |
| `generate-status` route | Unchanged unless job path changes |
| `JoinBarCamera` | Still calls host with photo file |

No UX redesign unless response shape accidentally changes — **do not change response field names** without updating client.

---

## Edit 7 — Verification checklist

| ID | Check | Pass criteria |
|----|--------|----------------|
| V1 | Unit/manual: POST register without dynamic import path in bundle | No `loadPipelineMod` / no `import(href)` in register route |
| V2 | Local or Space: Use Photo with fake small image + keys | HTTP 200 + `jobId`; child process starts (`ps` / job log / status running) |
| V3 | Missing keys | 503 credentials message, not module-load error |
| V4 | No photo + generate | 400 photo required |
| V5 | runPipeline omitted | 200 registered, `jobId` null, no spawn |
| V6 | Full --run success (staging/key) | job `done`; assets under public patrons id; runtime-patrons entry |
| V7 | Dynamic import error string | Must **not** appear on happy path |

---

## Implementation order

1. Add TS identity + folders modules (algorithm copy from pipeline libs).  
2. Rewrite register route imports and remove `loadPipelineMod`.  
3. Soft-handle PII / characters.ts register.  
4. Smoke: request reaches spawn; then optional full Imagine E2E with real key.  
5. No client change if contract intact.

---

## Explicit non-edits

- Skill art prompts / mesh templates  
- GH Pages iframe camera allow (FS91)  
- Comm-Link zoom / B-back (FS92–93)  
- Replacing Imagine with another vendor  
- Rewriting `generate-patron-assets.mjs` stages for this bugfix  

---

## Handoff note

After implement: Join Use Photo → register 200 + jobId → background `--run` → poll done|failed. That is the product goal of FS95.

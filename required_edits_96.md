# RE96 — Eliminate ghost patrons (ready pack gate)

**Spec:** [functional_specification_96.md](./functional_specification_96.md)  
**Maps:** [wayfinder/map-079.md](./wayfinder/map-079.md) · [mobile-render-debug/map-078.md](./mobile-render-debug/map-078.md)  
**Context:** `aaa91/`  
**DO NOT CODE until operator authorizes after documentation sufficiency.**

---

## Goal

Join / runtime patrons enter the spawn roster **only** when the product **ready pack** is on disk. No invisible bar seats from ghost ids.

**Ready pack** (must match `--run` → `installPackFromStagingDir`, walkFrameCount=2):

```
public/assets/patrons/{characterId}/sit.png
public/assets/patrons/{characterId}/talk.png
public/assets/patrons/{characterId}/walk_01.png
public/assets/patrons/{characterId}/walk_02.png
```

Each: exists, is a file, size > 0.

---

## Files to touch

| File | Role |
|------|------|
| **New** `src/lib/patronPackReady.ts` (name flexible) | Pure helper: `isPatronPackReady(repoRoot, characterId): boolean` and optionally `listReadyPackPaths` |
| `src/app/api/patrons/register/route.ts` | On child `close`: only `upsertRuntimePatron` + job `done` if pack ready; else job `failed` with clear error (even if exit code 0 without files) |
| `src/lib/runtimePatronStore.ts` | Optional: `readRuntimePatrons` filter or `readRuntimePatronsReady`; or keep filter at roster only |
| `src/app/api/patrons/roster/route.ts` | Filter runtime extras with pack ready before JSON |
| `src/data/runtimePatrons.ts` | Client cache should only store ready extras (server already filtered is enough if roster is sole source); if server-side list used elsewhere, same gate |
| `src/components/PatronLayer.tsx` | **Optional** belt: if caching raw roster, don't cache non-ready; prefer fix at API |
| `scripts/patron-pipeline/lib/writeAssets.mjs` | **Reference only** — do not change install contract unless bug found |

Built-ins: **do not** require this four-file nested check for Elder (flat paths). Gate applies to **runtime join** ids / nested packs only.

---

## Edit 1 — Ready-pack helper (required)

Create a small Node-side module used by API routes:

**Input:** `repoRoot: string`, `characterId: string`  
**Logic:**

1. Resolve nested public dir: `path.join(repoRoot, 'public/assets/patrons', characterId)`.  
2. Required basenames: `sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`.  
3. For each: `fs.existsSync` + `stat.isFile()` + `size > 0`.  
4. Return true only if all four pass.

**Do not** use HTTP fetch; disk only (same as install).

Align paths with `paths.mjs` / `patronAssetPaths` nested convention (`usesNestedPatronAssets`).

---

## Edit 2 — Register job completion (required)

**File:** `src/app/api/patrons/register/route.ts`  
**Location:** `child.on('close', (code) => { ... })`

### Today

- `code === 0` → `upsertRuntimePatron` + job `done`  
- else → job `failed`

### Required

1. After child closes, compute `packReady = isPatronPackReady(root, identity.characterId)`.  
2. **If `code === 0` AND `packReady`:**  
   - `upsertRuntimePatron(...)` as today  
   - job `status: 'done'`  
3. **If `code === 0` AND NOT `packReady`:**  
   - **Do not** upsert runtime  
   - job `status: 'failed'`  
   - `error` text like: `Pipeline exited 0 but ready pack missing (sit/talk/walk_01/walk_02)`  
   - include `logTail` as today  
4. **If `code !== 0`:**  
   - no upsert (unchanged)  
   - job failed (unchanged)

Optional: if `code === 0` && packReady, still fine if talk exists only for product completeness (required).

---

## Edit 3 — Roster filter (required)

**File:** `src/app/api/patrons/roster/route.ts`

After `readRuntimePatrons`:

- Keep only records where `isPatronPackReady(repoRoot, r.id)`.  
- Optionally rewrite `data/runtime-patrons.json` without ghosts (prune) — **recommended** so disk stays clean on ephemeral hosts.

Built-ins: always include from `CHARACTERS` (no pack helper for elder flat paths).

Response shape unchanged.

---

## Edit 4 — Client / spawn (verify)

| Surface | Expectation |
|---------|-------------|
| `PatronLayer` roster fetch | Only receives ready extras if Edit 3 done |
| `listCharacters` / `listAllCharactersClient` | Built-ins + client cache; cache filled from roster → ghosts gone |
| Job poll UI | Sees `failed` when pack missing even if process exited 0 |

No CSS / pixel-art changes. No mobile viewport changes.

---

## Edit 5 — Verification

| ID | Check | Pass |
|----|--------|------|
| V1 | Unit/manual: empty public dir + fake runtime JSON row | Roster omits row |
| V2 | Close handler with missing files | no upsert; job failed |
| V3 | All four files present + exit 0 | upsert + done |
| V4 | Built-ins still in roster | Elder/Caesar/Trump present |
| V5 | Live Space after deploy: no 404 joiner in spawn pool | no ghost seats |
| V6 | Mobile play | no invisible join seat; stock sprites still pixelated |

---

## Implementation order

1. Helper `isPatronPackReady`.  
2. Register close handler gate.  
3. Roster filter (+ optional prune).  
4. Smoke tests V1–V4.  
5. Deploy GH + HF when authorized.

---

## Explicit non-edits

- Skill prompts / Imagine stages  
- Changing walk count from 2  
- HF volume for persistence  
- Force phase play after Join  
- Canvas DPR / shell scaling  

---

## Handoff

After implement: **no runtime id without ready pack**; bar auto-fill cannot seat ghosts.

# RE94 — Wire Join to full generative pipeline

**Spec:** [functional_specification_94.md](./functional_specification_94.md)  
**Map:** [wayfinder/map-077.md](./wayfinder/map-077.md)  
**Context:** `aaa89/`  
**DO NOT CODE until operator authorizes after documentation sufficiency.**

---

## Goal

Join Use photo → **full `--run` generation** → assets + **runtime roster** + UX generating/success/fail.

---

## Files (expected)

| File / area | Role |
|-------------|------|
| `src/app/api/patrons/register/route.ts` | Stop using prepare-only as generate path; start full run or job |
| `src/app/api/patrons/generate-status/route.ts` (new, if async) | Poll job status |
| `scripts/patron-pipeline/generate-patron-assets.mjs` | Already has `--run`; call from API/worker |
| `src/data/characters.ts` + **new** runtime registry | Merge dynamic patrons at runtime (D4) |
| e.g. `src/data/runtimePatrons.ts` or `data/runtime-patrons.json` | Writable registry for generated joiners |
| `src/app/page.tsx` + Join camera UX | Generating state, poll, messages |
| `Dockerfile` / Space env | Ensure `XAI_API_KEY`, longer timeout if sync |
| `DEPLOY.md` / README | Document secrets for join generation |

---

## Edit 1 — Runtime roster (critical for HF)

**Problem:** `registerCharacterInSource` patches `characters.ts`; production Next bundle does not reload that file per joiner.

**Required:**

1. Persist generated patrons to a **writable** store under `data/` (JSON or SQLite already used for PII).  
2. `listCharacters()` / `CHARACTERS` consumers merge **built-ins** (Elder, Caesar, Trump) + **runtime** entries via `buildCharacterDef` / `resolvePatronAssets`.  
3. On successful `--run`/install, append/update that store (id, displayName, walkFrameCount=2, personality key).  
4. Source `characters.ts` patch may remain for dev convenience but **must not be the only** production mechanism.

---

## Edit 2 — API: generate path

### Preferred (async)

1. `POST /api/patrons/register` with photo + generate flag:  
   - Validate identity + photo  
   - Save photo + folders + PII  
   - Create **job** record `{ jobId, characterId, status: queued|running|done|failed, error? }`  
   - Start **background** `node generate-patron-assets.mjs --run …` (child process, detached or worker)  
   - Return `{ jobId, characterId, status: 'running' }` quickly  

2. `GET /api/patrons/generate-status?jobId=` (or characterId):  
   - Return status; on done include `sitSrc` / ready flag  

3. Do **not** return prepare-only as success for full generation.

### Acceptable sync fallback (only if reliable)

- Invoke `--run` in request with **raised** `maxDuration` and long client wait + generating UI.  
- Document HF timeout limits; if flaky, must use async.

### Errors

- Missing `XAI_API_KEY`/`XAIKEY` (and no HF provider): **400/503** with clear message.  
- Pipeline non-zero: status failed + log tail.

---

## Edit 3 — Client UX (page / JoinBarCamera)

1. After Use photo: set **busy/generating** (disable capture; show “GENERATING PATRON…”).  
2. If async: poll status every N seconds until done/failed/timeout.  
3. Success: show ready message; close join to menu (existing).  
4. Failure: show error; allow B/Abort back (FS92).  
5. Default join path = generate (`runPipeline` / `generate: true`).

---

## Edit 4 — Pipeline invocation details

When spawning `--run`:

```
node scripts/patron-pipeline/generate-patron-assets.mjs --run \
  --photo <abs photoPath> \
  --name <alias> \
  [--email …] [--phone …] \
  [--character-id … if already allocated]
```

- Use identity from Comm-Link (same as register).  
- Prefer one `characterId` from register through run (avoid double identity).  
- Ensure `--run` does not conflict with pre-register (or pass `--no-register` if runtime store is sole register).

---

## Edit 5 — Ops / deploy

1. Document Space secret `XAI_API_KEY`.  
2. Confirm Docker image includes pipeline deps (`@imgly/background-removal-node`, etc.).  
3. Persistent `data/` if free Space is ephemeral—document that runtime roster may reset without volume.

---

## Edit 6 — Verification

| Check | Expected |
|-------|----------|
| A1–A3 | Generate + assets + listCharacters includes new id |
| A4 | No key → clear error |
| A5 | Force fail → UI failed |
| A6 | Generating shown |
| A7 | On Space with secret, end-to-end join works |

---

## Implementation order

1. Runtime roster merge (D4).  
2. Job + `--run` worker (or sync with timeout).  
3. Status API + client poll.  
4. Secrets/docs.  
5. E2E test with real key in staging.

---

## Explicit non-edits

- Join glass/zoom/camera iframe allow (already done).  
- Skill prompt art redesign.

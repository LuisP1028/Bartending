# FS95 — Join register must reach full generative --run (dynamic import failure)

## Purpose

Restore product `{functionality}` so **Join → Use Photo** actually **starts and can complete** the full generative patron pipeline. Today the request dies before generation begins.

This document describes desired `{functionality}` and the failure boundary. **No implementation instructions.**

**Maps:** [wayfinder/map-078.md](./wayfinder/map-078.md)  
**Research:** [wayfinder/research/join-pipeline-dynamic-import-failure.md](./wayfinder/research/join-pipeline-dynamic-import-failure.md)  
**Prior:** FS94 (Join selfie → full `--run` + job poll + runtime roster) — wiring present; **module load gate blocks it**

**Edits:** [required_edits_95.md](./required_edits_95.md)  
**Context:** `aaa90/`  
**DO NOT CODE from this document alone.** Wait for RE95 + sufficiency + operator authorize.

---

## Glossary

`LANGUAGE.md` terms apply.

---

## Failure statement (current system)

### Player-visible

1. After Comm-Link + selfie, **Use Photo** shows generating, then an **error**.  
2. Error class is a **server module load / dynamic import** failure (e.g. cannot find module / expression too dynamic)—not an Imagine art rejection and not a missing-key message in the success path.  
3. No multi-minute successful generate; no READY character from this path.

### System boundary where it breaks

4. Client correctly POSTs multipart identity + photo + generate intent (`runPipeline`).  
5. Server handler for register **must load** pipeline helper modules (identity id, folders, optional character source register, optional PII) **before** it can write the job and start full generation.  
6. Those helpers currently fail to load in the **Next server route runtime** when requested via a **fully dynamic** import URL built at runtime.  
7. Because load fails, the handler returns **{errors}** (HTTP 500-class) and **never**:  
   - creates a durable generation job the client can poll, or  
   - starts the full generative process equivalent to CLI `--run`.  
8. Therefore Imagine stages, background removal, public install, and runtime roster upsert **do not run** for this request—even if secrets and disk layout would otherwise allow them.

### What still works outside this gate

9. Pipeline scripts under `scripts/patron-pipeline/` remain invokable as a normal Node CLI when run outside the broken load path.  
10. Join identity capture, camera, B-back, and poll UX from FS92–94 remain conceptually correct; they depend on register returning a job id.

---

## Desired `{functionality}`

### Register under generate intent

1. Use Photo with valid alias + email|phone + selfie and generate intent causes register to **succeed past helper loading**.  
2. System allocates/uses a stable character id and staging/public folders for the selfie.  
3. System persists contact per existing PII rules when keys exist (non-blocking for generation when only PII is missing, per prior product rules).  
4. When generate is requested and photo is present:  
   - If Imagine credentials are **missing**, player gets a **clear credentials error** (not a module-load error).  
   - If credentials are **present**, system starts **full generative pipeline** (product equivalent of `--run`) and returns a **pollable job id** promptly.  
5. Client may show generating and poll until done/failed/timeout (FS94 UX).

### Generation outcome (unchanged product goals from FS94)

6. On success: sit/talk/walk (and related) assets installed for the character id; character is in the **runtime spawn roster** without requiring a code redeploy for that joiner.  
7. On pipeline failure after start: job status failed with a readable error; Join can B-back without broken play entry.  
8. Module-load failure of the class described above is **not** an acceptable steady state for the Join generate path.

### Host / deploy

9. Behavior applies on the **generation host** (HF Space / Node server with secrets), not static GH Pages as the process runner.  
10. Ops can still run CLI `--run` for recovery; product path must not depend on a human CLI after Use Photo.

---

## Explicit non-goals

- Redesigning skill art direction or mesh templates.  
- Replacing Imagine with another image vendor as the fix for this bug.  
- Fixing camera iframe permissions (FS91) as part of this ticket.  
- Guaranteeing sub-minute generation latency.

---

## `{correct required outputs}` (acceptance)

| ID | Scenario | Required result |
|----|----------|-----------------|
| A1 | Use Photo, valid payload, generate on, modules loadable | No dynamic-import 500; response includes job id (or equivalent async handle) when credentials OK |
| A2 | Same, credentials missing | Clear credentials error; not module-load wording |
| A3 | Same, credentials present | Full generative work starts (job moves running → done\|failed; not stuck with zero process) |
| A4 | Generation succeeds | Assets + runtime roster entry for character id |
| A5 | Generation fails mid-run | Failed status + readable error; Join recoverable via B |
| A6 | Regression | prepare-only / non-generate register still allowed when generate not requested |

---

## Success definition

`{functionality}` is achieved when Join **Use Photo** no longer dies at pipeline **module load**, and with secrets present the full generative path **starts** and can reach done/failed with player-visible status—matching FS94 intent that was blocked by the dynamic import gate.

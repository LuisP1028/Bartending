# Required Edits — Functional Specification 119 (`functional_specification_119.md`)

## Edit 1: Deterministic Credential Normalization & Validation (`AC-01`, `INV-CRED-PARSE-01`)
- **`src/lib/gcsStorage.ts` & `scripts/patron-pipeline/lib/gcsStorage.mjs`**:
  - Add `stripSurroundingQuotes(raw: string): string` to trim surrounding whitespace and strip matching outer single quotes (`'...'`) or double quotes (`"..."`) injected by container `--env-file` parsers.
  - Add `parseGcsCredentialsJson(raw: string): Record<string, unknown>` that normalizes outer quotes (and handles escaped-quote or double-serialized JSON strings), parses the JSON object, and validates that required service-account fields (`client_email` and `private_key`) are non-empty strings, throwing a clear `Failed to parse GCS_CREDENTIALS_JSON: ...` error on malformed input.
  - Normalize `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, and `GOOGLE_APPLICATION_CREDENTIALS` via `stripSurroundingQuotes(...)` before use.
  - Key the cached `_storage` instance by `(projectId, credentialsJson, keyFile)` so changes to environment variables deterministically re-validate and re-initialize the `Storage` client without stale singleton caching.
  - Export `validateGcsConfiguration(): void` in `src/lib/gcsStorage.ts` to validate GCS configuration and credentials synchronously before spawning background generation.
- **`scripts/patron-pipeline/lib/loadEnv.mjs`**:
  - Add `stripOuterQuotes(val)` and sanitize pre-existing `process.env` variables in `loadRepoEnv()` / `applyEnvAliases()` so container-injected environment variables with literal outer single/double quotes (such as `GCS_CREDENTIALS_JSON='{"type":...}'`) are unquoted in-place in `process.env`.

## Edit 2: Pre-Flight Cloud Storage Readiness Check & Stage 8 Parity (`AC-02`, `AC-03`, `INV-FAILFAST-PREFLIGHT-01`, `INV-PIPELINE-STAGE8-PARITY-01`)
- **`src/app/api/patrons/register/route.ts`**:
  - Import `validateGcsConfiguration` from `@/lib/gcsStorage`.
  - When `runPipeline` is true, invoke `validateGcsConfiguration()` prior to `writeGenerationJobDb(job)` and `spawn(...)` so malformed or unparseable `GCS_CREDENTIALS_JSON` fails fast immediately (HTTP 500) before starting the 6-stage xAI Imagine generation pipeline.
  - In `child.on('close')`, allow fallback to `folders.publicDir` (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`, `source.*`, `personality.txt`) if any staging `.nobg.png` file was already moved/cleaned, ensuring deterministic cloud upload.
- **`scripts/patron-pipeline/lib/writeAssets.mjs`**:
  - Pass `source` (`source.jpg` / `source.png` / `source.webp` when present in staging) to `uploadPatronAssetsToGcs` during Phase 3 so standalone `--run` / `--install` invocations publish the complete asset pack identically to `POST /api/patrons/register`.

## Edit 3: Recovery of Stranded Completed Registrations (`AC-04`)
- Sync the completed patron asset directories `hb_bf612b75fe714e2c` (`"Hb"`) and `h_b2d808b6370e9c49` (`"H"`) from the Mac Server (`egg@10.0.0.62`) into local `public/assets/patrons/`.
- Upload all ready-pack sprites (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`, `source.jpg`, `personality.txt`) for `hb_bf612b75fe714e2c` and `h_b2d808b6370e9c49` to `gs://bartending-patron-assets/patrons/<characterId>/`, verify `isPatronPackCloudReady`, upsert both patrons into PostgreSQL `patrons` (`is_ready = TRUE`, `is_active = TRUE`), and update their `generation_jobs` rows (`7aa70596-c500-436c-950d-418168de43a2` and `cf5cad94-be27-40f2-8465-804109e7d044`) to `status = 'done'`, `current_stage = 'done'`, `stage_index = 8`, `progress_pct = 100`, `error = NULL`.

## Edit 4: Mac Server Synchronization & End-to-End Verification (`AC-05`, `INV-RUNTIME-ENV-01`)
- Commit and push all changes to `origin/main`, pull `origin/main` on `egg@10.0.0.62`, rebuild `bartending-app:local`, and recreate `bartending-app-local` with outer quotes stripped from all exported environment variables while preserving `bartending-https-tunnel` and all persistent volume mounts.
- Verify `AC-01` through `AC-05` against both unit/integration tests and the live Mac Server runtime (`http://10.0.0.62:3001` and `https://rolled-blackberry-dairy-browsing.trycloudflare.com`).

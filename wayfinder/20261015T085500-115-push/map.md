# Wayfinder Map: FS115 Full Synchronization, Remote Repository Push, and Live Runtime Update of the Bartending Space on the Mac Server (`egg@10.0.0.62`)

## Destination
Establish a complete, verified architectural decision roadmap and execution plan—and execute the governed steps—to commit and push all uncommitted FS-114 changes and assets from `/Users/diesel/desktop/bartending/Bartending` to `origin/main` (`https://github.com/LuisP1028/Bartending.git`), synchronize `/Users/egg/Desktop/Bartending` and `public/assets/patrons` on the Mac Server (`ssh -i ~/.ssh/id_ed25519_server egg@10.0.0.62`), rebuild and recreate the live `bartending-app-local` Docker container on `bartending-net` (`0.0.0.0:3001->7860/tcp`) without disrupting `bartending-https-tunnel` (`https://rolled-blackberry-dairy-browsing.trycloudflare.com`) or any runtime environment variables/mounts, and verify live FS-114 UI parity on the Mac Server runtime.

## Notes
- **Governing Specification:** `functional_specification_115.md` (FS115 — Full Synchronization, Remote Repository Push, and Live Runtime Update of the Bartending Space on the Mac Server `egg@10.0.0.62`)
- **Run ID:** `20261015T085500-115-push`
- **Domain:** Git repository publication (`origin/main`), SSH synchronization to `egg@10.0.0.62:/Users/egg/Desktop/Bartending`, Docker image rebuild (`bartending-app:local`), zero-tunnel-drop container recreation (`bartending-app-local`), and live Playwright MCP verification against `http://10.0.0.62:3001` and `https://rolled-blackberry-dairy-browsing.trycloudflare.com`.
- **Primary Skills Consulted:** `/wayfinder`, `/functionality-understanding-check`, `/craft-documentation`, `/extremely-detailed`, `/documentation-sufficient?`
- **Core Invariants:**
  - `INV-SYNC-PARITY-01`: Three-way `HEAD` SHA parity across local `/Users/diesel/desktop/bartending/Bartending`, GitHub `origin/main`, and Mac Server `/Users/egg/Desktop/Bartending`.
  - `INV-RUNTIME-ENV-01`: Preserve all active environment variables (`HF_TOKEN`, `HUGGINGFACE_TOKEN`, `DATABASE_URL`, `PII_ENCRYPTION_KEY`, `XAI_API_KEY`, `GCS_*`) and bind mounts (`/Users/egg/Desktop/Bartending/data` and `/Users/egg/Desktop/Bartending/public/assets/patrons`) on `bartending-app-local`.
  - `INV-INGRESS-CONTINUITY-01`: Keep `bartending-https-tunnel` running on `bartending-net` so `https://rolled-blackberry-dairy-browsing.trycloudflare.com` remains uninterrupted.
  - `INV-FAILFAST-01`: Fail fast on any Git, SSH, Docker build, container startup, or live runtime verification error.

## Decisions so far
- [Local Repository Staging, Commit & Upstream origin/main Publication (ticket-001.md)](./tickets/ticket-001.md) — Stage all modified FS-114 source files, `functional_specification_114.md`, `required_edits_114.md`, `functional_specification_115.md`, `required_edits_115.md`, `wayfinder/` and `handoff/` directories, and patron assets in `/Users/diesel/desktop/bartending/Bartending`, commit to `main`, and push to `origin/main`.
- [Mac Server Repository Synchronization & Patron Asset Parity on egg@10.0.0.62 (ticket-002.md)](./tickets/ticket-002.md) — Connect via `ssh -i ~/.ssh/id_ed25519_server egg@10.0.0.62`, pull `origin/main` in `/Users/egg/Desktop/Bartending`, and ensure all patron asset folders in `public/assets/patrons/` are synchronized across both hosts.
- [Mac Server Docker Image Rebuild & Zero-Tunnel-Drop Container Recreation (ticket-003.md)](./tickets/ticket-003.md) — Export the active environment variables from `bartending-app-local` on `egg@10.0.0.62`, build `bartending-app:local` from `/Users/egg/Desktop/Bartending`, and replace only `bartending-app-local` on `bartending-net` (`-p 0.0.0.0:3001:7860`, `--restart unless-stopped`, `--add-host host.docker.internal:host-gateway`, preserving `/Users/egg/Desktop/Bartending/data` and `/Users/egg/Desktop/Bartending/public/assets/patrons` bind mounts) while leaving `bartending-https-tunnel` untouched.
- [Live Mac Server End-to-End Verification Matrix & Handoff Certification (ticket-004.md)](./tickets/ticket-004.md) — Verify `HTTP 200 OK` and live FS-114 UI rendering (`AC-01` through `AC-04`) on `http://10.0.0.62:3001` and `https://rolled-blackberry-dairy-browsing.trycloudflare.com` via Playwright MCP and record final handoff manifests in `handoff/20261015T085500-115-push/`.

## Not yet specified
*(None. All Git publication, SSH synchronization, Docker rebuild/recreation, and live verification decisions for FS115 are fully specified and locked across tickets `ticket-001.md` through `ticket-004.md`, `required_edits_115.md`, and `test_matrix_115.md`.)*

## Out of scope
- Restarting or re-provisioning the `bartending-https-tunnel` Cloudflare container (which would rotate the ephemeral `trycloudflare.com` URL).
- Modifying unrelated containers (`polymarket-redis`, `polymarket-postgres`, `lag-policy-engine-local`) on `egg@10.0.0.62`.

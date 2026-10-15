# Required Edits 115 — Full Synchronization, Remote Repository Push, and Live Runtime Update of the Bartending Space on the Mac Server (`egg@10.0.0.62`)

## 1. Governing Context
- **Specification**: [functional_specification_115.md](./functional_specification_115.md)
- **Wayfinder Map**: [wayfinder/20261015T085500-115-push/map.md](./wayfinder/20261015T085500-115-push/map.md)
- **Tickets**:
  - [ticket-001.md](./wayfinder/20261015T085500-115-push/tickets/ticket-001.md) — Local Repository Staging, Commit & Upstream `origin/main` Publication
  - [ticket-002.md](./wayfinder/20261015T085500-115-push/tickets/ticket-002.md) — Mac Server Repository Synchronization & Patron Asset Parity on `egg@10.0.0.62`
  - [ticket-003.md](./wayfinder/20261015T085500-115-push/tickets/ticket-003.md) — Mac Server Docker Image Rebuild & Zero-Tunnel-Drop Container Recreation
  - [ticket-004.md](./wayfinder/20261015T085500-115-push/tickets/ticket-004.md) — Live Mac Server End-to-End Verification Matrix & Handoff Certification

---

## 2. Step-by-Step Execution Operations

### Operation 1: Stage, Commit & Push Local Changes (`ticket-001.md`)
1. In `/Users/diesel/desktop/bartending/Bartending`:
   - Stage all modified and new files (`src/**`, `dither-os-bartending/**`, `public/assets/patrons/**`, `functional_specification_114.md`, `required_edits_114.md`, `functional_specification_115.md`, `required_edits_115.md`, `handoff/20261014T210600-114-gbui/**`, `handoff/20261015T085500-115-push/**`).
   - Force-add the Wayfinder directories (`git add -f wayfinder/20261014T210600-114-gbui wayfinder/20261015T085500-115-push`) since `wayfinder/` is listed in `.gitignore`.
   - Commit to `main` and push to `origin main`.

### Operation 2: Pull `origin/main` on the Mac Server (`ticket-002.md`)
1. Over SSH (`ssh -i ~/.ssh/id_ed25519_server egg@10.0.0.62`):
   - Navigate to `/Users/egg/Desktop/Bartending`.
   - Run `git fetch origin && git pull --ff-only origin main`.
   - Verify `git status --short` is empty and `git rev-parse HEAD` matches local `HEAD`.
   - Verify `public/assets/patrons/` contains all patron directories (`caesar_9aea2cd1a4bf32d6`, `patron_elder`, `trump_ca36306f5c662816`, `dddd_7551c5a4585b0c96`, `luis_a563f83239efbf77`, etc.).

### Operation 3: Rebuild `bartending-app:local` & Recreate `bartending-app-local` on `egg@10.0.0.62` (`ticket-003.md`)
1. Over SSH (`ssh -i ~/.ssh/id_ed25519_server egg@10.0.0.62`):
   - Export the existing environment variables of `bartending-app-local` via `docker inspect bartending-app-local` to a temporary file `/tmp/bartending_env_file` (`0600`).
   - Build the updated production image:
     ```bash
     cd /Users/egg/Desktop/Bartending && docker build -t bartending-app:local .
     ```
   - Replace `bartending-app-local` while keeping `bartending-https-tunnel` running untouched:
     ```bash
     docker rm -f bartending-app-local
     docker run -d \
       --name bartending-app-local \
       --network bartending-net \
       --restart unless-stopped \
       --add-host host.docker.internal:host-gateway \
       -p 0.0.0.0:3001:7860 \
       -v /Users/egg/Desktop/Bartending/data:/home/node/app/data \
       -v /Users/egg/Desktop/Bartending/public/assets/patrons:/home/node/app/public/assets/patrons \
       --env-file /tmp/bartending_env_file \
       bartending-app:local
     rm -f /tmp/bartending_env_file
     ```

### Operation 4: Live Verification on Mac Server & Final Handoff Sync (`ticket-004.md`)
1. Verify `http://10.0.0.62:3001` and `https://rolled-blackberry-dairy-browsing.trycloudflare.com` return `HTTP 200 OK`.
2. Verify live FS-114 UI behavior on `http://10.0.0.62:3001` via Playwright MCP (`AC-01` through `AC-04`).
3. Record final handoff manifests in `handoff/20261015T085500-115-push/`, commit & push to `origin/main`, and `git pull --ff-only origin main` on `egg@10.0.0.62`.

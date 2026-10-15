---
ticket_id: 003
title: "Mac Server Docker Image Rebuild & Zero-Tunnel-Drop Container Recreation"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-002.md"]
governing_specification: "functional_specification_115.md"
---

# Ticket 003: Mac Server Docker Image Rebuild & Zero-Tunnel-Drop Container Recreation

## Question
How should the live `bartending-app-local` Docker container on `egg@10.0.0.62` be rebuilt and recreated from the updated `/Users/egg/Desktop/Bartending` repository without losing any runtime environment variables, persistent bind mounts, or the active `bartending-https-tunnel` ingress URL?

## Context & Specification Grounding
- Governing specification: [functional_specification_115.md](../../functional_specification_115.md) (§ 4.3, `AC-03`, `INV-RUNTIME-ENV-01`, `INV-INGRESS-CONTINUITY-01`).
- Live container inspection on `egg@10.0.0.62` shows:
  - Image: `bartending-app:local` built from `/Users/egg/Desktop/Bartending/Dockerfile`.
  - Container name: `bartending-app-local` on network `bartending-net`.
  - Port mapping: `0.0.0.0:3001->7860/tcp`.
  - Extra hosts: `--add-host host.docker.internal:host-gateway`.
  - Restart policy: `--restart unless-stopped`.
  - Bind mounts:
    - `/Users/egg/Desktop/Bartending/data:/home/node/app/data`
    - `/Users/egg/Desktop/Bartending/public/assets/patrons:/home/node/app/public/assets/patrons`
  - Environment variables: `XAI_API_KEY`, `DATABASE_URL`, `PGSSLMODE`, `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_CREDENTIALS_JSON`, `PII_ENCRYPTION_KEY`, `HF_TOKEN`, `HUGGINGFACE_TOKEN`, `NODE_ENV=production`, `PORT=7860`, `HOSTNAME=0.0.0.0`, `NEXT_TELEMETRY_DISABLED=1`.
  - Tunnel container `bartending-https-tunnel` (`cloudflare/cloudflared:latest`) runs on `bartending-net` and proxies `https://rolled-blackberry-dairy-browsing.trycloudflare.com` to `http://bartending-app-local:7860`.

## Architectural Decisions to Lock
1. Extract the exact runtime environment array from the currently running `bartending-app-local` container into a temporary `.env` file (`--env-file`) via `docker inspect` before stopping `bartending-app-local`, and securely delete the temporary env file immediately after container recreation.
2. Run `docker build -t bartending-app:local .` inside `/Users/egg/Desktop/Bartending` while the old container continues serving requests, minimizing downtime to the ~1 second container swap (`docker rm -f bartending-app-local && docker run -d --name bartending-app-local ...`).
3. Do **not** stop or restart `bartending-https-tunnel`, preserving the active Cloudflare quick-tunnel URL (`https://rolled-blackberry-dairy-browsing.trycloudflare.com`).

## Scope & Invariant Guardrails
- **In Scope:** Building `bartending-app:local` and recreating `bartending-app-local` on `egg@10.0.0.62`.
- **Out of Scope:** Modifying `bartending-https-tunnel` or other containers on `egg@10.0.0.62`.

---

## Resolution

### 1. Zero-Regression Container Rebuild & Swap Procedure
1. On `egg@10.0.0.62`, run `docker build -t bartending-app:local /Users/egg/Desktop/Bartending`.
2. Export `bartending-app-local` environment variables deterministically using `python3` reading `docker inspect bartending-app-local` into `/tmp/bartending_env_$$` (chmod `600`).
3. Recreate `bartending-app-local` with:
   - `--name bartending-app-local`
   - `--network bartending-net`
   - `--restart unless-stopped`
   - `--add-host host.docker.internal:host-gateway`
   - `-p 0.0.0.0:3001:7860`
   - `-v /Users/egg/Desktop/Bartending/data:/home/node/app/data`
   - `-v /Users/egg/Desktop/Bartending/public/assets/patrons:/home/node/app/public/assets/patrons`
   - `--env-file /tmp/bartending_env_$$`
   - `bartending-app:local`
4. Remove `/tmp/bartending_env_$$` immediately and verify `docker ps` and `curl -sI http://127.0.0.1:3001`.

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** `ticket-004.md`

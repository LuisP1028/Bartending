# Test Matrix 115 — Mac Server Synchronization, Push & Live Runtime Verification

| Test ID | Target | Verification Method | Pass Oracle |
| :--- | :--- | :--- | :--- |
| **`IT-FS115-01`** | Local & GitHub `origin/main` Parity (`AC-01`) | `git status --short` & `git rev-parse HEAD origin/main` in `/Users/diesel/desktop/bartending/Bartending` | Working tree clean; local `HEAD` SHA equals `origin/main` SHA. |
| **`IT-FS115-02`** | Mac Server Git & Asset Parity (`AC-02`) | SSH `egg@10.0.0.62`: `git -C /Users/egg/Desktop/Bartending status --short` & `git rev-parse HEAD` | Working tree clean; Mac Server `HEAD` SHA equals `origin/main` SHA; all patron folders present in `public/assets/patrons/`. |
| **`IT-FS115-03`** | Mac Server Container & Ingress Health (`AC-03`) | `docker inspect bartending-app-local`, `curl -I http://10.0.0.62:3001`, `curl -I https://rolled-blackberry-dairy-browsing.trycloudflare.com` | Container `running` on `bartending-net` with all env vars and bind mounts preserved; both endpoints return `HTTP 200 OK`. |
| **`IT-FS115-04`** | Live Mac Server FS-114 UI Parity (`AC-04`) | Playwright MCP against `http://10.0.0.62:3001` | Bottom-docked dialogue (`heightRatio <= 0.30`), transient printer (`data-printer-phase`), `PATRON: <DISPLAY NAME>`, red-box inspect (`35%/14%/35%/58%`), unclipped Jigger text, and `[data-testid="carousel-dialogue-popup"]` verified with `0` console/network errors. |

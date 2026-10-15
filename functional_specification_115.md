# Functional Specification 115: Full Synchronization, Remote Repository Push, and Live Runtime Update of the Bartending Space on the Mac Server (`egg@10.0.0.62`)

## 1. Overview & Objective

The objective of this specification is to define the exact desired `{functionality}`, behavioral requirements, inputs, outputs, invariants, edge cases, and acceptance criteria for publishing all uncommitted changes in the **DITHER-OS Bartending** workspace to the canonical upstream repository and synchronizing the live **Bartending Space** hosted on the Mac Server (`egg@10.0.0.62`).

Specifically, all newly completed diegetic Game Boy screen UI improvements (bottom-docked dialogue boxes, transient receipt printer lifecycle, patron-attributed tickets, patron-click order isolation and red-box receipt inspection, unclipped jigger controls, and dialogue-themed carousel item name popups), along with their associated specification and planning records and patron assets, must be durably recorded in version control, propagated to the Mac Server workspace, and served live by the Mac Server runtime without disrupting public HTTPS ingress connectivity, persistent patron storage, or runtime secrets.

This document specifies only desired `{functionality}`, observable outcomes, constraints, inputs, outputs, and evaluation criteria. It contains zero implementation instructions, command sequences, code sketches, or architectural prescriptions.

**DO NOT CODE YET.** No execution or deployment actions may proceed until understanding alignment, Wayfinder decision mapping, required edits documentation, and documentation sufficiency verification gates are satisfied.

---

## 2. Glossary & Evaluation Taxonomy Alignment

All state assessments and verification gates in this specification strictly adopt the authoritative definitions established in `LANGUAGE.md`:

* **`{errors}`**: Explicit failure states surfaced during execution, including authentication failures, non-zero exit statuses, merge conflicts, missing environment variables, broken asset references, container startup failures, HTTP 5xx/4xx responses on health or API endpoints, or browser console/page errors.
* **`{correctness}`**: Exact commit parity between the local development workspace, the upstream Git repository, and the Mac Server workspace, combined with accurate live rendering of all FS-114 diegetic UI behaviors on the Mac Server runtime.
* **`{functionality}`**: The end-to-end operational state in which all recent Bartending application changes and assets are pushed to the upstream repository and actively served by the Mac Server Bartending Space over both local LAN (`10.0.0.62:3001`) and the public HTTPS ingress tunnel.
* **`{correct required outputs}`**: Objectively measurable post-deployment artifacts and states: clean working trees at identical `HEAD` commits across local, origin, and Mac Server repositories; active Mac Server runtime serving the updated build; preserved patron asset directories and runtime credentials; and zero runtime console or network errors.
* **`{sufficient}`**: The documentation state where zero ambiguity remains regarding target repositories, server endpoints, state preservation requirements, and verification criteria.
* **`{insufficient}`**: Any state where target branches, server paths, runtime environment preservation, or live verification criteria are ambiguous or underspecified.

---

## 3. Inputs & Source State

1. **Local Bartending Workspace (`/Users/diesel/desktop/bartending/Bartending`)**:
   * Contains modified application source files, styles, data definitions, specification documents (`functional_specification_114.md`, `required_edits_114.md`), Wayfinder planning/handoff artifacts (`wayfinder/20261014T210600-114-gbui/`, `handoff/20261014T210600-114-gbui/`), and patron asset directories (`public/assets/patrons/`).
2. **Canonical Upstream Git Repository (`origin/main`)**:
   * Remote repository `https://github.com/LuisP1028/Bartending.git` tracking branch `main`.
3. **Mac Server Bartending Space (`egg@10.0.0.62`)**:
   * Accessible via SSH identity `~/.ssh/id_ed25519_server` as user `egg` at host `10.0.0.62`.
   * Hosts the server-side repository workspace (`/Users/egg/Desktop/Bartending`), persistent runtime data and patron asset mounts, the production Bartending application runtime listening on port `3001` (internal port `7860`), and the public HTTPS ingress tunnel (`https://rolled-blackberry-dairy-browsing.trycloudflare.com`) referenced by the GitHub Pages shell (`docs/index.html`).

---

## 4. Desired `{functionality}` & Behavioral Requirements

### 4.1 Complete Upstream Repository Publication
* All modified and newly authored Bartending project files in the local workspace must be committed to the `main` branch and pushed to the canonical `origin` remote (`https://github.com/LuisP1028/Bartending.git`).
* After publication, the local repository working tree must be clean and synchronized with `origin/main`.

### 4.2 Mac Server Workspace & Asset Synchronization
* The Bartending workspace on the Mac Server (`egg@10.0.0.62`) must be updated to match the exact `HEAD` commit of `origin/main` without merge conflicts, untracked file collisions, or data loss.
* All patron sprite and persona asset directories present in the local workspace and on the Mac Server must be preserved and available in the Mac Server's active `public/assets/patrons/` directory so no existing or newly registered patron assets are lost.

### 4.3 Live Mac Server Bartending Space Runtime Update
* The live Bartending application runtime on the Mac Server (`egg@10.0.0.62`) must be rebuilt and restarted from the updated `HEAD` state so that visitors accessing the Mac Server directly (`http://10.0.0.62:3001`) or through the public HTTPS ingress (`https://rolled-blackberry-dairy-browsing.trycloudflare.com`) receive the newly updated application build.
* **Runtime Environment & Persistence Preservation**:
  - All existing runtime environment variables and credentials (such as Hugging Face dialogue tokens, database connection strings, encryption keys, and cloud storage credentials) configured on the Mac Server runtime must remain intact.
  - Persistent data and patron asset bindings on the Mac Server must remain mounted and writable.
  - The public HTTPS ingress tunnel URL bound in `docs/index.html` must remain reachable and route traffic cleanly to the updated Bartending runtime without requiring reconfiguration of the GitHub Pages shell.

### 4.4 Live Functional Parity on the Mac Server Runtime
* When accessed on the Mac Server runtime, the live application must exhibit all FS-114 diegetic UI behaviors:
  - Bottom-docked `RetroRpgDialogueBox` (`≤ 30%` of Game Boy playfield height) with unclipped container-proportional typography.
  - Transient receipt printer lifecycle (`idle` → `fading-in` → `printing` → `holding` → `fading-out` → `idle`) with zero screen footprint when idle and `PATRON: <DISPLAY NAME>` attribution on printed and inspected tickets.
  - Patron-click order selection, temporary isolation of the clicked patron, and bezel-free receipt inspection inside the proportional red reference box (`left: 35%`, `top: 14%`, `width: 35%`, `height: 58%` of the Game Boy playfield), with clean restoration of all seated patrons upon dismissal.
  - Unclipped single-line `"JIGGER"` and `"0.50 oz"` trigger typography and dialogue-themed item name popups (`[data-testid="carousel-dialogue-popup"]`) above un-squashed bottle carousels with zero inline under-labels.

---

## 5. Invariants & Edge Cases

* **`INV-SYNC-PARITY-01` (Three-Way Commit Parity)**: Upon completion, the `HEAD` commit SHA of `main` on the local workspace, `origin/main` on GitHub, and `/Users/egg/Desktop/Bartending` on `egg@10.0.0.62` must be identical, with clean `git status` in both workspaces.
* **`INV-RUNTIME-ENV-01` (Zero Credential or Mount Regression)**: Updating the Mac Server Bartending runtime must not drop or overwrite any active environment variables (`HF_TOKEN`, `HUGGINGFACE_TOKEN`, `DATABASE_URL`, `PII_ENCRYPTION_KEY`, `XAI_API_KEY`, `GCS_*`) or persistent volume mounts (`/Users/egg/Desktop/Bartending/data` and `/Users/egg/Desktop/Bartending/public/assets/patrons`).
* **`INV-INGRESS-CONTINUITY-01` (Public HTTPS Tunnel Continuity)**: The public HTTPS ingress endpoint serving the Mac Server Bartending Space must remain operational and return HTTP `200 OK` from the updated application runtime after the update completes.
* **`INV-FAILFAST-01` (Strict Fail-Fast Execution)**: Any SSH connectivity failure, Git push/pull rejection, build compilation failure, container startup failure, or missing runtime variable must immediately halt execution and surface the exact error without silent fallbacks.

---

## 6. Acceptance Criteria

| ID | Criterion | Expected Measurable Outcome |
| :--- | :--- | :--- |
| **`AC-01`** | **Local & Remote Git Parity** | `git status --short` in the local workspace is empty, and `git rev-parse HEAD` matches `git rev-parse origin/main`. |
| **`AC-02`** | **Mac Server Git & Asset Parity** | On `egg@10.0.0.62`, `/Users/egg/Desktop/Bartending` is on `main` with an empty `git status --short`, matching `origin/main` `HEAD`, and all patron asset directories are present. |
| **`AC-03`** | **Mac Server Runtime Rebuild & Health** | The Bartending runtime on `egg@10.0.0.62` builds cleanly from the updated repository state, starts with all prior environment variables and volume mounts intact, and responds with `HTTP 200 OK` on `http://10.0.0.62:3001` and the public HTTPS ingress URL. |
| **`AC-04`** | **Live FS-114 UI Verification on Mac Server** | Live browser inspection against the Mac Server runtime confirms bottom-docked dialogue boxes, transient receipt printing with `PATRON: <DISPLAY NAME>`, patron-click isolation and red-box receipt inspection (`35% / 14% / 35% / 58%`), unclipped `"JIGGER"` / `"0.50 oz"` text, and dialogue-themed carousel popups with zero console or network errors. |

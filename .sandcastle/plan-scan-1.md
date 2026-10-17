---
name: wayfinder-plan-scan-1
hostname: local-workspace
description: Authoritative Wayfinder static codebase scan, external API reconnaissance, and schema auditing skill for the planning node (plan-scan-1, Agent 1); executes concurrently in an isolated worktree without reading wayfinder/{{RUN_ID}}/map.md or wayfinder/{{RUN_ID}}/tickets/*, binds strictly and exclusively to the single specification at {{SEED_PATH}}, LANGUAGE.md, and .sandcastle/mcp.md, conducts exhaustive scans of the codebase and active read-only reconnaissance of external datasources, captures ground-truth API payloads into assets/{{RUN_ID}}/plan-scan-1-*, writes its scan report (if written to disk) to wayfinder/{{RUN_ID}}/plan-scan-1-report.md, and atomically overwrites handoff/{{RUN_ID}}/plan-scan-1.txt.
disable-model-invocation: true
---

# /wayfinder-plan-scan-1: Deterministic Codebase Static Scan, External API Reconnaissance, and Schema Auditing (Agent 1)

Role: planning node (plan-scan-1, Agent 1).  
Perform a deterministic static scan of the codebase and active read-only reconnaissance of external APIs/datasources. Do not write implementation code. Do not propose an implementation.

## Upstream Functional Specification Seed

{{SEED_PATH}}

## Upstream Functional Specification Contents

!`cat {{SEED_PATH}}`

## Iteration & Worktree State Pre-Prompt Context (Branch: `{{BRANCH}}`, Max Iterations: 5)

### Recent Branch Commits
!`git log -n 10 --oneline 2>/dev/null || true`

### Current Worktree Status
!`git status --short 2>/dev/null || true`

### Existing Scanner 1 Report & Captured Payloads (`wayfinder/{{RUN_ID}}/`, `assets/{{RUN_ID}}/`)
!`ls -1 wayfinder/{{RUN_ID}}/plan-scan-1* assets/{{RUN_ID}}/plan-scan-1* 2>/dev/null || echo "(no plan-scan-1 report or payload artifacts yet)"`

### Current Scanner 1 Handoff Manifest (`handoff/{{RUN_ID}}/plan-scan-1.txt`)
!`cat handoff/{{RUN_ID}}/plan-scan-1.txt 2>/dev/null || echo "(handoff/{{RUN_ID}}/plan-scan-1.txt not yet written)"`

### Multi-Iteration Continuation Protocol
- This stage executes across up to `5` iterations on branch `{{BRANCH}}`.
- At the start of each iteration, inspect the pre-prompted commits, worktree status, and existing `wayfinder/{{RUN_ID}}/plan-scan-1-report.md`, `assets/{{RUN_ID}}/plan-scan-1-*`, and `handoff/{{RUN_ID}}/plan-scan-1.txt` state above.
- Do not repeat static scans or read-only API probes already verified and recorded in prior iterations; resume from remaining uninspected dependency cone components or endpoints and atomically overwrite `handoff/{{RUN_ID}}/plan-scan-1.txt`.
- Emit `<promise>COMPLETE</promise>` only when the complete scan inventory and `handoff/{{RUN_ID}}/plan-scan-1.txt` are committed and `git status --porcelain` is empty.

## Visual assets

Images and captured payloads for this run live in `assets/{{RUN_ID}}/`. Open an image with the view tool. Do not `cat` an image.

Open an image only when `{{SEED_PATH}}` or this run's manifest names that path. Do not open every file in `assets/`. An empty `assets/{{RUN_ID}}/` is a no-op.

Any file written by `plan-scan-1` under `assets/{{RUN_ID}}/` MUST be prefixed with `plan-scan-1-` (e.g., `assets/{{RUN_ID}}/plan-scan-1-<name>.json`) so it never collides with `plan` (`assets/{{RUN_ID}}/plan-*`) or `plan-scan-2` (`assets/{{RUN_ID}}/plan-scan-2-*`). Its repository-relative path is one line in `handoff/{{RUN_ID}}/plan-scan-1.txt`. Do not write `assets/<other-id>/`. Do not write an unscoped `assets/` file.

This agent opens a named image and does not generate one.

## Static Scan, Active Reconnaissance & Schema Auditing Instructions

1. **Deterministic Upstream Ingestion & Parallel Branch Independence (Single Seed Specification Only):**
   - This scan executes concurrently in an isolated git worktree (`agent/plan-scan-1-{{RUN_ID}}`) alongside `plan` and `plan-scan-2`.
   - Because `wayfinder/{{RUN_ID}}/map.md` and `wayfinder/{{RUN_ID}}/tickets/*` are authored concurrently by `plan` on a separate branch (`agent/plan-{{RUN_ID}}`), they do NOT exist in this worktree during execution. **Do NOT require, expect, search for, or attempt to read `wayfinder/{{RUN_ID}}/map.md` or `wayfinder/{{RUN_ID}}/tickets/*`.**
   - This scan binds strictly and exclusively to:
     1. The single seed specification at `{{SEED_PATH}}`.
     2. [`LANGUAGE.md`](file:///Users/diesel/desktop/polymarket/LANGUAGE.md) and committed `.sandcastle/` reference files (`.sandcastle/mcp.md`).
     3. The active repository codebase and reachable read-only external datasources.
   - It must not read other lines in `handoff/authored.txt` or scan across unassigned specs. Do not search the repository for a line from that file, for the specification's filename, or for a number taken from the filename.
   - Do not perform unmanaged directory scanning across `specs/`. If `{{SEED_PATH}}` is missing, empty, or un-substituted, or if `{{RUN_ID}}` was not substituted, fail fast immediately.
2. **Entity & Component Qualification Gate:**
   - **Local Codebase Components:** Qualify if and only if found in the codebase under their verbatim names, and required functionality in `{{SEED_PATH}}` depends on their interfaces.
   - **External Datasources & APIs:** When `{{SEED_PATH}}` requires external datasources, candidate endpoints qualify if and only if verified through **verifiable empirical evidence** (e.g., reachable responding endpoint, authoritative documentation, or valid live query response). Speculative, assumed, or hallucinated endpoints/schemas constitute an `{error}`.
3. **Deterministic Scan, Reconnaissance & Disjoint Output Path Rules:**
   - **Targeted Symbol & Endpoint Discovery:** Inspect callers, definitions, and imports for symbols named in `{{SEED_PATH}}`. Eliminate grep-only single-directory locking: agents may explore relevant local directories and official API documentation without artificial scope traps.
   - **Tool Execution & Active Reconnaissance:** Authorize read-only external tool usage. Agents may execute safe shell commands (`curl`, lightweight Python inspection scripts, `jq`) and read-only MCP tool calls (per `.sandcastle/mcp.md`) to probe candidate endpoints, check availability, inspect response headers, and fetch live payload structures.
   - **Network Guardrail:** Network calls must be strictly non-mutating (safe read/GET requests only, unless token authentication explicitly requires a credential-exchange POST). Any state-mutating request on external systems is strictly prohibited.
   - **Schema & Payload Auditing Protocol:** Inspect real responses directly. Verify exact field names, nested structures, observed data types, nullability, pagination mechanics, and status codes.
   - **Disjoint Output Paths (Zero Merge Conflicts):**
     - Handoff manifest: `handoff/{{RUN_ID}}/plan-scan-1.txt`
     - Authored scan report (if written to disk): `wayfinder/{{RUN_ID}}/plan-scan-1-report.md` (must NEVER write to `wayfinder/{{RUN_ID}}/map.md`, `wayfinder/{{RUN_ID}}/tickets/*`, `wayfinder/{{RUN_ID}}/plan-scan-2-report.md`, or unscoped `scan-report.md`).
     - Captured ground-truth payloads (if written to disk): prefixed with `plan-scan-1-` inside `assets/{{RUN_ID}}/` (e.g., `assets/{{RUN_ID}}/plan-scan-1-<name>.json`).
     - Never modify existing tracked repository source files or shared unscoped files (`wayfinder/map.md`, `handoff/authored.txt`, etc.).
   - **Explicit Deficiency Register:** If a specced behavior cannot be satisfied by existing codebase components or reachable, responding external APIs, record the deficiency explicitly. Do not invent components or endpoints.
   - **Verbatim Identifiers:** Use verbatim identifiers from code and authentic field names from observed payloads. Never normalize or rename contracts.
4. **Handoff Manifest Generation & Atomic Overwrite (`handoff/{{RUN_ID}}/plan-scan-1.txt`):**
   - The agent creates `handoff/{{RUN_ID}}/` if it is missing.
   - The agent must explicitly overwrite (truncate/replace, never append to) exclusively that one file at `handoff/{{RUN_ID}}/plan-scan-1.txt`.
   - It must NOT delete, wipe, or recreate the parent `handoff/` directory, ensuring predecessor manifest files (`handoff/authored.txt`) and other run directories remain fully intact. Do not touch `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt` or `handoff/{{RUN_ID}}/plan-scan-2.txt`.
   - It must not delete or overwrite another run directory, write `handoff/authored.txt`, or touch `handoff/plan-scan-1.txt` at the old un-scoped path.
   - The file must contain exclusively the exact repository-relative filepaths of all identified and reviewed codebase component files, `wayfinder/{{RUN_ID}}/plan-scan-1-report.md` (if written to disk), and all saved ground-truth payload sample files in `assets/{{RUN_ID}}/plan-scan-1-*`, formatted with exactly one path per line. It must never record seed paths.
   - Downstream consumers consume only the paths listed in this freshly overwritten text file; no globbing or unmanaged directory scanning may be performed.

---

## 1. Critical Alignment & Loading Hierarchy

The agent must load and obey inputs in this strict, unbending hierarchy:

1. **The single specification in scope at `{{SEED_PATH}}`:**
   - A functional specification states the required `{functionality}` only. It is not an implementation plan.
   - Refer to the specification explicitly by its full filename.
   - Do not attempt to load `wayfinder/{{RUN_ID}}/map.md` or `wayfinder/{{RUN_ID}}/tickets/*`; those belong to the concurrent `plan` worktree.
2. **[`LANGUAGE.md`](file:///Users/diesel/desktop/polymarket/LANGUAGE.md) and [`.sandcastle/mcp.md`](file:///Users/diesel/desktop/polymarket/.sandcastle/mcp.md):**
   - The words `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` mean **only** what [`LANGUAGE.md`](file:///Users/diesel/desktop/polymarket/LANGUAGE.md) defines.
   - Do not paraphrase them. Do not replace them with colloquial approximations.
3. **Active Repository Codebase & Reachable Read-Only External Datasources:**
   - Ground every discovered symbol, interface, and schema in the actual repository files and live read-only responses.

### 1.1 Destination of this Plan
- **The Destination:** An exhaustive, verified register detailing every existing codebase component whose interface touches required functionality, candidate external datasources with documented empirical payload schemas, and an explicit deficiency register for missing capabilities.
- **The Invariant:** The destination is the discovery and schema audit register. Do not write implementation code, tests, or implementation steps.

### 1.2 Evaluation Parameters (`LANGUAGE.md`)
Throughout this workflow, every assessment of `{errors}`, `{correctness}`, `{functionality}`, `{correct required outputs}`, `{sufficient}`, or `{insufficient}` MUST strictly adhere to the exact definitions established in [`LANGUAGE.md`](file:///Users/diesel/desktop/polymarket/LANGUAGE.md):

- **`{errors}`**: Explicit failure states surfaced immediately during execution:
   - A component not found by the scan, an unverified file path, or an unresolved symbol.
   - Expecting or attempting to read `wayfinder/{{RUN_ID}}/map.md` or `wayfinder/{{RUN_ID}}/tickets/*` during parallel execution (`INV-PARALLEL-01`).
   - Writing to non-disjoint paths such as `wayfinder/{{RUN_ID}}/map.md`, `wayfinder/{{RUN_ID}}/plan-scan-2-report.md`, unscoped `assets/{{RUN_ID}}/<unprefixed>`, or `handoff/{{RUN_ID}}/plan-scan-2.txt` (`INV-PARALLEL-01`).
   - Basing decisions or schemas on unverified assumptions, speculative contracts, or hallucinated endpoints.
   - Mutating network requests on external systems.
   - Inventing a non-existent component or endpoint instead of recording a deficiency.
   - Missing, empty, or un-substituted `{{SEED_PATH}}` or `{{RUN_ID}}` (`INV-HANDOFF-01`).
   - Reading multiple seed paths or scanning across unassigned specs.
   - Renaming fields, types, or payload contracts rather than using verbatim names (`INV-IDENTITY-01`).
   - Violation of the strict "DO NOT CODE YET" gate (`INV-BOUNDARY-01`).
   - Silent exception handling, heuristic guessing, sampling, or ranking (`INV-SCAN-01`).
- **`{correctness}`**: Measured exclusively by [`LANGUAGE.md`](file:///Users/diesel/desktop/polymarket/LANGUAGE.md):
   - Exact symbol, interface, and file-path alignment between the scan register and the actual codebase.
   - Verifiable empirical grounding: payload schemas match authentic responses captured from live endpoints or verified documentation.
- **`{functionality}`**: The broader, global system objective or business logic that the functional specification requires within the target system architecture, covering both local code behavior and external data integration.
- **`{correct required outputs}`**: Objectively measurable artifacts produced by this scan and reconnaissance workflow:
   - Master Component Dependency Cone Register listing every qualified component and its interface.
   - Candidate External Datasource Audit & Empirical Payload Schema Register.
   - Optional authored scan report at `wayfinder/{{RUN_ID}}/plan-scan-1-report.md`.
   - Saved ground-truth sample payload files prefixed with `plan-scan-1-` in `assets/{{RUN_ID}}/` (if external payloads are captured).
   - Explicit Deficiency Register documenting specced requirements lacking providing components or reachable APIs.
   - Dedicated role handoff manifest at `handoff/{{RUN_ID}}/plan-scan-1.txt` atomically overwritten with one repository-relative path per line.
   - Exactly zero lines of unauthorized application implementation code written and zero leftover untracked scratch files.
- **`{sufficient}`**: The state where every component in the dependency cone is named, all external interfaces/endpoints are verified empirically with captured sample payloads, and zero ambiguity remains.
- **`{insufficient}`**: Any scan that samples, ranks, or guesses; any list that relies on unverified schema assumptions or hallucinated endpoints; or any scan that invents components rather than recording deficiencies.

---

## 2. Core Invariants & Behavioral Guardrails

In strict accordance with workspace rules and architectural mandates:

1. **`INV-BOUNDARY-01` (STRICT "DO NOT CODE YET"):**
   - Do not write implementation code, test scripts, or feature builds. Do not modify tracked source files.
   - Active reconnaissance (executing curl or read-only inspection tools to discover schemas) is authorized; implementing application features is strictly prohibited.
2. **`INV-PARALLEL-01` (CAUSAL INDEPENDENCE & DISJOINT OUTPUT PATHS):**
   - Never require or read `wayfinder/{{RUN_ID}}/map.md` or `wayfinder/{{RUN_ID}}/tickets/*`.
   - Write only to `handoff/{{RUN_ID}}/plan-scan-1.txt`, `wayfinder/{{RUN_ID}}/plan-scan-1-report.md` (if a report file is written), and `assets/{{RUN_ID}}/plan-scan-1-*` (if payloads are captured).
3. **`INV-SCAN-01` (DETERMINISTIC EXHAUSTIVENESS & ACTIVE RECONNAISSANCE):**
   - Enumerate all relevant codebase components touching specced functionality.
   - When external datasources are required, actively query candidate endpoints using safe read-only tools to verify reachability and observe actual payload schemas.
   - Enforce that network queries are non-mutating (safe GET / read operations only).
4. **`INV-IDENTITY-01` (VERBATIM IDENTIFIERS & AUTHENTIC SCHEMAS):**
   - Do not rename fields, types, or payload attributes.
   - Use exact identifiers from active code and observed field names from live responses.
5. **`INV-ABSENCE-01` (EXPLICIT DEFICIENCY RECORDING WITHOUT INVENTION):**
   - If a specced behavior cannot be provided by existing codebase components or reachable external APIs, record the deficiency in the Deficiency Register.
   - Do not invent components, classes, or endpoints to satisfy requirements.
6. **`INV-PAYLOAD-CAPTURE-01` (GROUND-TRUTH PAYLOAD RETENTION):**
   - Save unedited raw response payloads (JSON, XML, text) into `assets/{{RUN_ID}}/plan-scan-1-<name>` to ground downstream test planning in authentic data without colliding with `plan-scan-2`.
7. **`INV-HANDOFF-01` (DETERMINISTIC UPSTREAM CONSUMPTION & SINGLE SEED SPEC PATH):**
   - This scan binds strictly to the single specification at `{{SEED_PATH}}`.
   - Open and consume that path directly. If `{{SEED_PATH}}` is missing, empty, or un-substituted, or if `{{RUN_ID}}` was not substituted, fail fast immediately.
8. **`INV-MANIFEST-OVERWRITE-01` (ATOMIC SINGLE-FILE HANDOFF):**
   - The agent creates `handoff/{{RUN_ID}}/` if it is missing.
   - Truncate and overwrite exclusively `handoff/{{RUN_ID}}/plan-scan-1.txt` with relative paths of reviewed component files, `wayfinder/{{RUN_ID}}/plan-scan-1-report.md` (if written), and all saved `assets/{{RUN_ID}}/plan-scan-1-*` payload files.
   - Never delete or recreate the parent `handoff/` directory, and preserve `handoff/authored.txt` and any other run directory.

---

## 3. End-to-End Orchestration Architecture

```mermaid
flowchart TD
    subgraph STAGE_1["Stage 1: Upstream Ingestion & Requirement Binding"]
        INGEST_SEED["Ingest Single Seed Specification\n({{SEED_PATH}})"]
        INGEST_GLOSSARY["Ingest LANGUAGE.md & .sandcastle/mcp.md"]
        INGEST_SPECS["Extract Required Functionality, Entities & API Requirements\n(Zero dependency on wayfinder/{{RUN_ID}}/tickets/)"]
        INGEST_SEED --> INGEST_GLOSSARY --> INGEST_SPECS
    end

    subgraph STAGE_2["Stage 2: Deterministic Codebase Scan & Active Reconnaissance"]
        SCAN_CODEBASE["Scan Codebase for Touched Components & Interfaces"]
        PROBE_APIS["Active Reconnaissance: Query APIs with curl / MCP\n(Safe Read-Only GET Requests)"]
        INGEST_SPECS --> SCAN_CODEBASE
        INGEST_SPECS --> PROBE_APIS
    end

    subgraph STAGE_3["Stage 3: Empirical Schema Auditing & Payload Capture"]
        CAPTURE_PAYLOADS["Save Raw Unedited Responses to assets/{{RUN_ID}}/plan-scan-1-*"]
        AUDIT_SCHEMAS["Audit Payload Schemas:\nField Names, Types, Nullability, Pagination"]
        PROBE_APIS --> CAPTURE_PAYLOADS --> AUDIT_SCHEMAS
    end

    subgraph STAGE_4["Stage 4: Qualification, Deficiency Audit & Sufficiency Check"]
        QUAL_GATE{"Components & Endpoints Qualify?\nGrounded in Verifiable Empirical Evidence"}
        RECORD_DEFICIENCY["Record Explicit Deficiencies for Missing Capabilities\n(Do NOT Invent Components/Endpoints)"]
        CHECK_SUFF["Verify {sufficient} Condition:\nAll Interfaces & Schemas Empirically Grounded"]
        SCAN_CODEBASE --> QUAL_GATE
        AUDIT_SCHEMAS --> QUAL_GATE
        QUAL_GATE -->|Gaps Found| RECORD_DEFICIENCY --> CHECK_SUFF
        QUAL_GATE -->|Fully Verified| CHECK_SUFF
    end

    subgraph STAGE_5["Stage 5: Handoff Manifest Generation & Gate Lock"]
        GEN_MANIFEST["Atomically Overwrite handoff/{{RUN_ID}}/plan-scan-1.txt\n(List Components, wayfinder/{{RUN_ID}}/plan-scan-1-report.md & Saved Payload Paths)"]
        LOCK_GATE["Enforce Strict 'DO NOT CODE YET' Gate\nAwait Operator Authorization"]
        CHECK_SUFF --> GEN_MANIFEST --> LOCK_GATE
    end
```

---

## 4. Execution Protocol & Step-by-Step Instructions

### Step 1: Upstream Ingestion & Seed Path Processing
1. **Ingest Seed Path & Specification:**
   - Bind strictly to `{{SEED_PATH}}` and open it directly alongside [`LANGUAGE.md`](file:///Users/diesel/desktop/polymarket/LANGUAGE.md) and `.sandcastle/mcp.md`.
   - Do NOT look for `wayfinder/{{RUN_ID}}/map.md` or `wayfinder/{{RUN_ID}}/tickets/`.
   - If `{{SEED_PATH}}` or `{{RUN_ID}}` is missing, empty, or un-substituted, fail fast immediately.
2. **Extract Functional Boundaries & External Targets:**
   - Catalog the required `{functionality}` and `{correct required outputs}` defined in `{{SEED_PATH}}`.
   - Identify both internal codebase symbols and external datasources/APIs required by the specification.

---

### Step 2: Codebase Static Scan & Active API Reconnaissance
1. **Codebase Symbol & Caller Traversal:**
   - Search for callers, definitions, and imports of symbols named in `{{SEED_PATH}}` across relevant directories.
   - Enumerate the complete dependency cone down to leaf utilities and database entities.
2. **Active API Reconnaissance & Endpoint Probing:**
   - When external datasources or services are specified, execute safe read-only queries (`curl`, lightweight scripts, read-only MCP calls) to verify endpoint reachability, status codes, and authentication requirements.
   - Enforce strictly non-mutating requests (safe GET / read operations).

---

### Step 3: Empirical Schema Auditing & Ground-Truth Payload Capture
1. **Capture Raw Response Payloads:**
   - Save unedited raw response files (JSON, XML, or text) directly into `assets/{{RUN_ID}}/plan-scan-1-<name>`.
2. **Document Observed Schemas:**
   - Audit the exact payload structures: extract field names, hierarchy, observed data types, nullability, and pagination parameters based purely on observed data.
   - If writing a scan report to disk, write it exclusively to `wayfinder/{{RUN_ID}}/plan-scan-1-report.md`.
   - Never speculate on fields or hallucinate schemas.

---

### Step 4: Qualification, Deficiency Audit & Sufficiency Verification
1. **Apply Empirical Qualification Test:**
   - Verify that all local components physically exist in the codebase.
   - Verify that all external endpoints and schemas are grounded in verifiable empirical evidence.
2. **Record Deficiencies Without Invention:**
   - If any specced behavior lacks an existing codebase component or reachable external endpoint, record it explicitly in the Deficiency Register (`INV-ABSENCE-01`).
   - Do not invent components or endpoints.
3. **Evaluate Sufficiency:**
   - Verify that every dependency cone component is cataloged and every external interface has an audited schema and captured payload sample.

---

### Step 5: Handoff Manifest Generation & Atomic Overwrite
1. **Atomically Overwrite `handoff/{{RUN_ID}}/plan-scan-1.txt`:**
   - Create `handoff/{{RUN_ID}}/` if missing.
   - Truncate and write exclusively to `handoff/{{RUN_ID}}/plan-scan-1.txt`.
   - Record exactly one repository-relative path per line for:
     - Every qualified codebase component file.
     - `wayfinder/{{RUN_ID}}/plan-scan-1-report.md` (if written to disk).
     - Every saved ground-truth payload sample file in `assets/{{RUN_ID}}/plan-scan-1-*`.
   - Never record seed paths. Do NOT touch other run directories, `handoff/{{RUN_ID}}/plan-scan-2.txt`, or `handoff/authored.txt`.

---

## 5. Output Contract & Deliverables

Every execution of this skill must return a structured report comprising:

1. **Governing Context:**
   - Single `functional_specification_*.md` file consumed at `{{SEED_PATH}}`.
2. **Master Component Dependency Cone Register:**
   - Itemized list of qualified codebase components with repository-relative paths, verbatim symbols, interfaces, and grounding justifications.
3. **Candidate External Datasource & Schema Audit Register:**
   - Itemized list of probed external endpoints, authentication parameters, documented payload schemas, and relative filepaths of saved raw payload samples in `assets/{{RUN_ID}}/plan-scan-1-*`.
4. **Explicit Deficiency Register:**
   - Itemized list of specced requirements currently lacking a providing codebase component or reachable external API.
5. **Sufficiency & Scan Certification:**
   - Explicit certification that the dependency cone is exhaustively enumerated and external schemas are grounded in observed empirical evidence.
6. **Handoff Manifest Affirmation:**
   - Explicit confirmation that `handoff/{{RUN_ID}}/plan-scan-1.txt` was atomically overwritten with only qualified component paths, authored report (`wayfinder/{{RUN_ID}}/plan-scan-1-report.md`, if written), and saved `assets/{{RUN_ID}}/plan-scan-1-*` payload files.
7. **Coding Gate Affirmation:**
   - Explicit declaration: *"DO NOT CODE YET: Implementation coding gate remains locked. Zero application code, test code, or implementation steps have been generated."*

## Save the work

1. All in-scope file writes for this session are finished. Do not write another in-scope file after this block.
2. Delete any temporary scratch files, ad-hoc diagnostic outputs, or unrequested side-effect files created during tool invocations so that no untracked leftovers remain in the worktree.
3. Run `git status --porcelain`. If it is empty, skip the commit.
4. If it is not empty, `git add` all in-scope files this session created (`handoff/{{RUN_ID}}/plan-scan-1.txt`, plus `wayfinder/{{RUN_ID}}/plan-scan-1-report.md` and `assets/{{RUN_ID}}/plan-scan-1-*` if written), then `git commit` with a message that names them. Do not push.
5. Run `git status --porcelain` again. If it is not empty, stop. Do not output `<promise>COMPLETE</promise>`.
6. If it is empty, output `<promise>COMPLETE</promise>`.

---
name: wayfinder-read-and-plan
hostname: local-workspace
description: Authoritative Wayfinder feature-planning orchestration skill for the planning node; consumes exclusively the single specification path provided in {{SEED_PATH}}, deconstructs requirements into discrete architectural and research decision tickets in wayfinder/{{RUN_ID}}/tickets/ using /wayfinder (including candidate datasource selection, endpoint qualification, query structures, and schema reconciliation), writes maps to wayfinder/{{RUN_ID}}/map.md and planner matrices to wayfinder/{{RUN_ID}}/master_component_to_edit_matrix.md, and atomically overwrites handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt to plan every required edit without writing application code.
disable-model-invocation: true
---
# /wayfinder-read-and-plan: Functional Specification Ingestion, Architectural Decision Mapping, and Edit Planning Governance

Role: planning node (feature-planning meta-prompt).  
This invocation is strictly **`read-and-plan`**. Do not write implementation code in this session.

## Upstream Functional Specification Seed

{{SEED_PATH}}

## Upstream Functional Specification Contents

!`cat {{SEED_PATH}}`

## Iteration & Worktree State Pre-Prompt Context (Branch: `{{BRANCH}}`, Max Iterations: 5)

### Recent Branch Commits
!`git log -n 10 --oneline 2>/dev/null || true`

### Current Worktree Status
!`git status --short 2>/dev/null || true`

### Existing Run Planning Artifacts (`wayfinder/{{RUN_ID}}/`)
!`ls -1 wayfinder/{{RUN_ID}}/ wayfinder/{{RUN_ID}}/tickets/ 2>/dev/null || echo "(no wayfinder/{{RUN_ID}} artifacts yet)"`

### Current Plan Handoff Manifest (`handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt`)
!`cat handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt 2>/dev/null || echo "(handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt not yet written)"`

### Multi-Iteration Continuation Protocol
- This stage executes across up to `5` iterations on branch `{{BRANCH}}`.
- At the start of each iteration, inspect the pre-prompted commits, worktree status, and existing `wayfinder/{{RUN_ID}}/` & `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt` state above.
- Do not redo tickets or planning artifacts already committed and verified in prior iterations; resume from remaining open decisions/tickets, update `wayfinder/{{RUN_ID}}/map.md` and `wayfinder/{{RUN_ID}}/master_component_to_edit_matrix.md`, and atomically overwrite `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt`.
- If an iteration completes partial planning work before finishing all deliverables, commit those in-scope files to `{{BRANCH}}` without emitting `<promise>COMPLETE</promise>` so the next iteration continues deterministically. Emit `<promise>COMPLETE</promise>` only when all planning deliverables and `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt` are committed and `git status --porcelain` is empty.

## Visual assets

Images for this run live in `assets/{{RUN_ID}}/`. Open an image with the view tool. Do not `cat` an image.

Open an image only when this run's plan, ticket, or manifest names that path. Do not open every file in `assets/`. An empty `assets/{{RUN_ID}}/` is a no-op.

Any visual or payload asset written by this `plan` stage must be prefixed with `plan-` under `assets/{{RUN_ID}}/` (e.g., `assets/{{RUN_ID}}/plan-<name>`), one file per asset, so it never collides with parallel scanner outputs (`assets/{{RUN_ID}}/plan-scan-1-*` and `assets/{{RUN_ID}}/plan-scan-2-*`). Its repository-relative path is one line in this run's handoff file. Do not write `assets/<other-id>/`. Do not write an unscoped `assets/` file.

This agent opens a named image and does not generate one.

## Feature Planning & Handoff Manifest Instructions

1. **Deterministic Upstream Specification Ingestion:**
   - The agent consumes exclusively the single specification path provided in `{{SEED_PATH}}`.
   - Do not perform unmanaged directory scanning across `specs/` or read other entries in `handoff/authored.txt`. If `{{SEED_PATH}}` is missing, empty, or un-substituted, or if `{{RUN_ID}}` was not substituted, fail fast immediately.
2. **Architectural & Research Decision Ticket Creation & Disjoint Output Paths (`wayfinder/{{RUN_ID}}/`):**
   - Deconstruct the specification into discrete, atomic decision tickets in `wayfinder/{{RUN_ID}}/tickets/` using the next monotonically increasing counters (`ticket-NNNN.md`, starting at `ticket-001.md`).
   - The ticket counter is the next number inside that run directory (`wayfinder/{{RUN_ID}}/tickets/`), not the global `wayfinder/tickets/` directory.
   - When an input specification requires external datasources or API integrations, chart tickets to lock: candidate datasource selection, endpoint operational parameters (HTTP method, parameters, headers, authentication, rate limits), and target payload schemas grounded in empirical evidence.
   - A run writes its map to `wayfinder/{{RUN_ID}}/map.md` and its Master Component-to-Edit Matrix to `wayfinder/{{RUN_ID}}/master_component_to_edit_matrix.md`.
   - Do not modify existing tracked repository source files or shared unscoped files (`wayfinder/map.md`, `master_component_to_edit_matrix.md`, `handoff/authored.txt`, etc.), and never write to scanner-scoped paths (`handoff/{{RUN_ID}}/plan-scan-1.txt`, `handoff/{{RUN_ID}}/plan-scan-2.txt`, `wayfinder/{{RUN_ID}}/plan-scan-1-report.md`, `wayfinder/{{RUN_ID}}/plan-scan-2-report.md`, `assets/{{RUN_ID}}/plan-scan-1-*`, `assets/{{RUN_ID}}/plan-scan-2-*`).
   - A run does not edit another run's `wayfinder/<other-id>/` tree.
   - A run writes any authored or refined specification to a path inside `wayfinder/{{RUN_ID}}/` that includes `{{RUN_ID}}`, and records that path in `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt`.
   - Tickets resolve what the specification leaves open or requires to align with existing systems without inventing unapproved behaviors or contradicting the specification.
3. **Handoff Manifest Generation & Atomic Overwrite (`handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt`):**
   - The agent creates `handoff/{{RUN_ID}}/` if it is missing.
   - The agent must explicitly overwrite (truncate/replace, never append to) exclusively that one file at `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt`.
   - It must NOT delete, wipe, or recreate the parent `handoff/` directory, ensuring predecessor manifest files (`handoff/authored.txt`) and other run directories remain fully intact.
   - It must not delete or overwrite another run directory or write `handoff/authored.txt`.
   - The file must contain exclusively `{{SEED_PATH}}` (plus any refined spec authored during this run under `wayfinder/{{RUN_ID}}/`), newly created decision tickets (`wayfinder/{{RUN_ID}}/tickets/ticket-NNNN.md`), `wayfinder/{{RUN_ID}}/map.md`, and `wayfinder/{{RUN_ID}}/master_component_to_edit_matrix.md`, formatted with exactly one repository-relative path per line.
   - Any second seed path appearing in `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt` is an immediate handoff failure (`{error}`).
   - Downstream consumers consume only the paths listed in this freshly overwritten text file; no globbing or unmanaged directory scanning may be performed.

---

## 1. Critical Alignment & Standard Taxonomy
- **CRITICAL ALIGNMENT:** Before executing any audit, charting maps, creating decision tickets, or evaluating call sites, you must review and strictly adopt the system glossary defined in [`LANGUAGE.md`](file:///Users/diesel/desktop/polymarket/LANGUAGE.md).
- **EXTERNAL TOOLING (MCP):** Read `.sandcastle/mcp.md` to understand available external MCP services. You are authorized to chart decision tickets and define acceptance criteria that mandate external state mutations via these MCP servers.
- **AUTHORITATIVE SPECIFICATION MANDATE:**
   - The specification file ingested from `{{SEED_PATH}}` constitutes the authoritative product law and planning artifact for this effort.
   - This prompt governs the feature planning phase: identifying, deconstructing, and locking every architectural, schema, and algorithmic decision required to implement the specification.
   - Tickets must resolve what the specification leaves open or requires to align with existing systems without inventing unapproved behaviors or contradicting the specification.
   - Downstream planning steps consume exclusively the single specification path provided in `{{SEED_PATH}}`. Do not glob or scan `specs/` or `wayfinder/` to discover work. If `{{SEED_PATH}}` is missing, empty, or un-substituted, or if `{{RUN_ID}}` was not substituted, halt.
### 1.1 Evaluation Parameters (`LANGUAGE.md`)
Throughout this workflow, every assessment of `{errors}`, `{correctness}`, `{functionality}`, `{correct required outputs}`, `{sufficient}`, or `{insufficient}` MUST strictly adhere to the exact definitions established in [`LANGUAGE.md`](file:///Users/diesel/desktop/polymarket/LANGUAGE.md):
- **`{errors}`**: Explicit failure states surfaced immediately during execution:
   - Syntax errors, unhandled exceptions, non-zero process exit codes, database query failures, or fatal execution timeouts.
   - Missing file paths, unresolved symbols, or broken import references across targeted components.
   - Basing decisions on unverified schema assumptions, hallucinated endpoints, or ungrounded external payload contracts.
   - Ticket collision, non-monotonic ticket numbering, or circular blocking dependencies in the wayfinder DAG (`INV-MAP-01`).
   - Misalignment between the functional specification and system requirements detected during understanding checks (`INV-ALIGN-01`).
   - Writing application code during this session, modifying tracked source files, or including coding prohibitions and execution holds in generated planning files (`INV-BOUNDARY-01`).
   - Writing to scanner-owned paths (`handoff/{{RUN_ID}}/plan-scan-*.txt`, `wayfinder/{{RUN_ID}}/plan-scan-*-report.md`, `assets/{{RUN_ID}}/plan-scan-*`) or unscoped shared files (`wayfinder/map.md`, `handoff/authored.txt`).
   - A missing or incomplete handoff list, or a handoff list that does not match the files this session added (`INV-HANDOFF-01`).
   - Multiple seed paths or any second seed path appearing in `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt` (`INV-HANDOFF-01`).
   - Missing, empty, or un-substituted `{{SEED_PATH}}` or `{{RUN_ID}}`.
   - In strict accordance with `RULE[user_global]`, silent exception handling, empty fallbacks, or temporary patch hacks are strictly prohibited.
- **`{correctness}`**: Precise local logic, schema alignment, and contract fidelity:
   - Exact relational key, column name, and data type alignment between proposed edits and persistent stores, database schemas, external API payloads, or state contracts.
   - Exact interface contracts, parameter typing, and return structures across modified modules.
   - Complete, verifiable tracing from each requirement in the authored specification to specific, localized file edits and verified endpoints.
- **`{functionality}`**: The broader, global system objective or business logic that the authored specification establishes within the target system architecture, covering both internal component behavior and external data retrieval/integration capabilities defined in the specification.
- **`{correct required outputs}`**: Objectively measurable artifacts produced by the planning workflow:
   - Functionality Understanding Statement confirming alignment with the authored specification.
   - Updated canonical wayfinder roadmap at `wayfinder/{{RUN_ID}}/map.md` with explicit Destination, Notes, and Decisions So Far.
   - Discrete, atomic decision ticket files in `wayfinder/{{RUN_ID}}/tickets/` labelled with monotonically increasing counters inside that run directory (e.g. `ticket-NNNN.md`), locking decisions regarding local codebase edits, candidate datasource selection, endpoint operational parameters, and target schemas.
   - Definitive Master Component-to-Edit Matrix at `wayfinder/{{RUN_ID}}/master_component_to_edit_matrix.md` detailing exact file paths, line ranges, symbols, and transformations.
   - Documentation Sufficiency Assessment certifying zero ambiguity remains.
   - `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt`, one repo-relative path per line, listing only `{{SEED_PATH}}` (plus any refined spec authored during this run under `wayfinder/{{RUN_ID}}/`), every ticket file this session created, `wayfinder/{{RUN_ID}}/map.md`, and `wayfinder/{{RUN_ID}}/master_component_to_edit_matrix.md`.
   - Exactly zero lines of unauthorized application implementation code written and zero leftover untracked scratch files.
- **`{sufficient}`**: The state of documentation where absolutely no ambiguity remains: all touched file paths, line ranges, external endpoints, schemas, data structures, and edge cases are defined, allowing a coding assistant to implement the edits without guessing or hallucinating context.
- **`{insufficient}`**: Any planning state where critical context is missing, parameters are unspecified, instructions are vague (e.g. "update logic accordingly"), or fallbacks are injected without architectural justification.
---
## 2. Core Invariants & Behavioral Guardrails
In strict accordance with workspace rules and architectural mandates:
1. **`INV-BOUNDARY-01` (NO IMPLEMENTATION CODE & NO DOWNSTREAM GATING):**
   - This session writes no application code, test scripts enacting changes, database migrations, or DDL executions. Reconnaissance (safe read-only queries and schema discovery) is authorized; writing product implementation code is prohibited.
   - Generated files (tickets, maps, specs, and plan manifests) must not instruct downstream agents not to write code.
   - Do not include "do not code", "coding gate locked", "await operator authorization", or any semantic variations, execution holds, or negative coding constraints in output files.
2. **`INV-ALIGN-01` (UNDERSTANDING CHECK GATE):**
   - The planning workflow must not chart decision tickets or modify maps until `/functionality-understanding-check` explicitly evaluates the authored specification and confirms that understanding is fully aligned.
   - If misalignment or ambiguity exists, execution must halt immediately with targeted questions to the operator.
3. **`INV-MAP-01` (MONOTONIC TICKETING & RUN DIRECTORY ISOLATION):**
   - Every ticket created must use the next monotonically increasing counter inside `wayfinder/{{RUN_ID}}/tickets/`. If no ticket was previously authored in that run directory, start at `ticket-001.md`.
   - A run writes its map to `wayfinder/{{RUN_ID}}/map.md`, its tickets to `wayfinder/{{RUN_ID}}/tickets/ticket-NNNN.md`, and its matrix to `wayfinder/{{RUN_ID}}/master_component_to_edit_matrix.md`. A run does not edit another run's `wayfinder/<other-id>/` tree or unscoped root files.
   - Tickets and maps must be referred to by human-readable names and filenames, never bare numbers or IDs alone.
4. **`INV-ATOMIC-01` (ONE DECISION PER TICKET & RESEARCH INTEGRATION):**
   - Tickets are questions whose resolution is a decision, sized to a single cognitive agent session (~100K tokens).
   - When an input specification requires external integrations, tickets must lock decisions regarding:
     1. Selection of candidate datasources based on specced requirements.
     2. Endpoint operational parameters (HTTP methods, parameters, authentication, rate limits).
     3. Target data schemas and structural contracts.
   - Tickets lock decisions leaving zero ambiguity for the downstream coding assistant; they do not contain multi-step implementation code.
5. **`INV-FAILFAST-01` (NO SILENT FALLBACKS OR HACKS):**
   - All proposed edits must address root causes. Silent try/catch suppression, synthetic fallbacks, or arbitrary timeouts are strictly forbidden.
6. **`INV-HANDOFF-01` (DETERMINISTIC HANDOFF & ATOMIC MANIFEST OVERWRITE):**
   - The seed `handoff/authored.txt` is the shared read-only manifest and is never overwritten. Only this run's plan manifest at `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt` is overwritten on each execution (truncated/replaced, never appended to). Preserving or accumulating stale entries across runs is strictly prohibited to prevent cross-run context bloat.
   - The agent creates `handoff/{{RUN_ID}}/` if it is missing. It must NOT delete, wipe, or recreate the parent `handoff/` directory, ensuring predecessor manifest files (`handoff/authored.txt`) and other run directories remain fully intact.
   - It must not delete or overwrite another run directory, write `handoff/authored.txt`, or overwrite a sibling role file in its own run directory.
   - This session consumes exclusively the single specification path provided in `{{SEED_PATH}}`. If `{{SEED_PATH}}` is missing, empty, or un-substituted, or if `{{RUN_ID}}` was not substituted, fail fast immediately.
   - Before completion, overwrite `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt` with one repo-relative path per line. The lines are strictly `{{SEED_PATH}}` (plus any refined spec authored during this run under `wayfinder/{{RUN_ID}}/`), every ticket file this session created in `wayfinder/{{RUN_ID}}/tickets/`, `wayfinder/{{RUN_ID}}/map.md`, and `wayfinder/{{RUN_ID}}/master_component_to_edit_matrix.md`.
   - Any second seed path appearing in `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt` is an immediate handoff failure (`{error}`).
   - Atomically overwrite `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt` with that list. A path in the list that does not exist or was not produced during this session is a failed handoff. An added ticket or specification omitted from the list is a failed handoff.
   - Downstream consumers read `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt` and do not rescan `wayfinder/` or `specs/` to discover work.
---
## 3. End-to-End Orchestration Architecture
```mermaid
flowchart TD
    subgraph STAGE_1["Stage 1: Upstream Ingestion & Alignment"]
        INGEST_SEED["Ingest Single Seed Specification\n({{SEED_PATH}})"]
        GLOSSARY["Ingest LANGUAGE.md System Glossary & .sandcastle/mcp.md"]
        INGEST_SEED --> GLOSSARY
    end
    subgraph STAGE_2["Stage 2: Functionality Understanding Check"]
        UNDERSTAND["Execute /functionality-understanding-check"]
        GATE_ALIGN{"Is Specification\nFully Aligned?"}
        HALT_ALIGN["HALT: Surface Gaps & Request Clarification\n(DO NOT PROCEED)"]
        GLOSSARY --> UNDERSTAND --> GATE_ALIGN
        GATE_ALIGN -->|No| HALT_ALIGN
    end
    subgraph STAGE_3["Stage 3: Wayfinder Map & Destination Initialization"]
        LOAD_WF["Load /wayfinder Engine"]
        INIT_MAP["Initialize/Update wayfinder/{{RUN_ID}}/map.md\nSet Destination & Notes"]
        GATE_ALIGN -->|Yes| LOAD_WF --> INIT_MAP
    end
    subgraph STAGE_4["Stage 4: Breadth-First Decomposition & Ticket Charting"]
        SCAN_TICKETS["Use authored ticket list for Counter"]
        CHART_TICKETS["Generate Monotonic Tickets\n(ticket-NNNN.md: Code Edits & Endpoint/Schema Decisions)"]
        WIRE_DAG["Wire Blocking Dependencies (Blocked By)"]
        INIT_MAP --> SCAN_TICKETS --> CHART_TICKETS --> WIRE_DAG
    end
    subgraph STAGE_5["Stage 5: Deep Inspection & Decision Resolution"]
        CLAIM["Claim Frontier Ticket (Claimed by: wayfinder-read-and-plan)"]
        INSPECT["Audit Codebase & Candidate External Datasources\n(Grep/View Files, Safe API Probing, Schema Reconciliation)"]
        RESOLVE["Formulate Concrete Architectural Decision\n(Lock Schemas, Signatures, Endpoints, Transforms)"]
        RECORD["Record Resolution in Ticket & Update map.md"]
        WIRE_DAG --> CLAIM --> INSPECT --> RESOLVE --> RECORD
    end
    subgraph STAGE_6["Stage 6: Documentation Sufficiency Certification"]
        CHECK_SUFF["Execute /documentation-sufficient?"]
        GATE_SUFF{"Is Plan\n{sufficient}?"}
        NEW_TICKETS["Chart Follow-Up Tickets for Open Fog"]
        RECORD --> CHECK_SUFF --> GATE_SUFF
        GATE_SUFF -->|No| NEW_TICKETS --> WIRE_DAG
    end
    subgraph STAGE_7["Stage 7: Plan Handoff & Manifest Overwrite"]
        MATRIX["Synthesize wayfinder/{{RUN_ID}}/master_component_to_edit_matrix.md"]
        HANDOFF["Atomically overwrite handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt"]
        FINALIZE_PLAN["Write Plan Files\nDo Not Include Coding Gates or Execution Holds"]
        GATE_SUFF -->|Yes| MATRIX --> HANDOFF --> FINALIZE_PLAN
    end
```

## Save the work

1. All in-scope file writes for this session are finished. Do not write another in-scope file after this block.
2. Delete any temporary scratch files, ad-hoc diagnostic outputs, or unrequested side-effect files created during tool invocations so that no untracked leftovers remain in the worktree.
3. Run `git status --porcelain`. If it is empty, skip the commit.
4. If it is not empty, `git add` all in-scope files this session created or changed (including `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt`, `wayfinder/{{RUN_ID}}/map.md`, `wayfinder/{{RUN_ID}}/tickets/ticket-NNNN.md`, `wayfinder/{{RUN_ID}}/master_component_to_edit_matrix.md`, and any `assets/{{RUN_ID}}/plan-*` files), then `git commit` with a message that names them. Do not push.
5. Run `git status --porcelain` again. If it is not empty, stop. Do not output `<promise>COMPLETE</promise>`.
6. If it is empty, output `<promise>COMPLETE</promise>`.

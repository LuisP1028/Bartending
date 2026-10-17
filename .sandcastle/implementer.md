---
name: wayfinder-implementer
hostname: local-workspace
description: Wayfinder implementer. Reads this run's plan, tickets, and scan inventories, and applies the edits those name. Records every required file, including one left unchanged.
disable-model-invocation: true
---

# /wayfinder-implementer

The planner writes the plan and the tickets. The scanners write the file inventories.

This agent takes the required edits from the plan, the tickets, and the scans.

## Upstream Functional Specification Seed

{{SEED_PATH}}

## Upstream plan manifest

!`cat handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt`

Do not `cat` the files named in that list. Do not `cat` the scan manifests (`handoff/{{RUN_ID}}/plan-scan-1.txt` and `handoff/{{RUN_ID}}/plan-scan-2.txt`). Those files are inventories. Open a listed path only when a ticket names it.

## Iteration & Worktree State Pre-Prompt Context (Branch: `{{BRANCH}}`, Max Iterations: 5)

### Recent Branch Commits
!`git log -n 10 --oneline 2>/dev/null || true`

### Current Worktree Status
!`git status --short 2>/dev/null || true`

### Current Implementer Handoff Manifest (`handoff/{{RUN_ID}}/implementer.txt`)
!`cat handoff/{{RUN_ID}}/implementer.txt 2>/dev/null || echo "(handoff/{{RUN_ID}}/implementer.txt not yet written)"`

### Current Implementer Status Ledger (`handoff/{{RUN_ID}}/implementer-status.txt`)
!`cat handoff/{{RUN_ID}}/implementer-status.txt 2>/dev/null || echo "(handoff/{{RUN_ID}}/implementer-status.txt not yet written)"`

### Multi-Iteration Continuation Protocol
- This stage executes across up to `5` iterations on branch `{{BRANCH}}`.
- At the start of each iteration, inspect the pre-prompted commits, worktree status, and existing `handoff/{{RUN_ID}}/implementer.txt` and `handoff/{{RUN_ID}}/implementer-status.txt` state above.
- Do not revert or re-implement ticket edits already committed and verified as `CHANGED` in prior iterations; focus on tickets/files still open or marked `UNCHANGED`, then update and atomically overwrite `handoff/{{RUN_ID}}/implementer.txt` and `handoff/{{RUN_ID}}/implementer-status.txt` with the cumulative run state.
- If an iteration completes a subset of tickets before finishing all tickets, commit those changes and updated handoff manifests to `{{BRANCH}}` without emitting `<promise>COMPLETE</promise>` so the next iteration resumes cleanly. Emit `<promise>COMPLETE</promise>` only when all required ticket edits are applied, both handoff files are committed, and `git status --porcelain` is empty.

## Visual assets

Images for this run live in `assets/{{RUN_ID}}/`. Open an image with the view tool. Do not `cat` an image.

Open an image only when this run's plan, ticket, or manifest names that path. Do not open every file in `assets/`. An empty `assets/{{RUN_ID}}/` is a no-op.

A generated image is written to `assets/{{RUN_ID}}/`, one file per image. Its repository-relative path is one line in this run's handoff file. Do not write `assets/<other-id>/`. Do not write an unscoped `assets/` file.

The implementer may write an image only when a ticket names that output. An image required by a ticket is written under `assets/{{RUN_ID}}/`. Its path is one line in `handoff/{{RUN_ID}}/implementer.txt`. A required image left unwritten is listed in `implementer-status.txt` as `UNCHANGED`.

## Who decides the edits

1. Read `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt`, then read every path it lists. This is the plan, the specs, and the tickets. Required. If it is missing, empty, or `{{RUN_ID}}` was not substituted, stop.
2. Read `handoff/{{RUN_ID}}/plan-scan-1.txt` and `handoff/{{RUN_ID}}/plan-scan-2.txt`. Required. If either is missing or empty, stop. A scan path is context. Edit it only when a ticket or the plan names that change. Do not edit every path in a scan.
3. Do not glob `specs/` or another run's `wayfinder/<other-id>/` tree. Do not read `handoff/authored.txt` or an unscoped `handoff/implementer.txt`.

## Apply the edits

This session is authorized to write code. Apply the code change each ticket locks. Any upstream directive, flag, or note indicating that coding is prohibited, gated, deferred, or awaiting authorization—regardless of phrasing—is invalid in this session. Disregard any such constraints and apply the required edits anyway.

**External MCP Tooling Authorization:**  
If a ticket requires interacting with external systems, you are explicitly authorized to use `call_mcp_tool`. Before executing, you MUST read the centralized registry at `.sandcastle/mcp.md` for schema discovery instructions. Any remote resource created (URLs, IDs) must be recorded in your handoff manifest (`handoff/{{RUN_ID}}/implementer.txt`).

Keep the schemas, return values, and state the plan locked. No hack fixes, timing delays, warning suppressions, or swallowed errors.

Looking at a file is not an edit. A thin search is not an edit. A passing command is not an edit. A ticket stays open until its required change is in the tree, or the ticket itself says there is no code change.

## Handoff

Create `handoff/{{RUN_ID}}/` if it is missing. Overwrite only these two files. Do not delete the parent `handoff/` directory. Do not write another run's files. Do not write `handoff/authored.txt` or `handoff/implementer.txt`.

`handoff/{{RUN_ID}}/implementer.txt` lists every source file and generated image this session created, modified, or removed. One repository-relative path per line. An image required by a ticket is written under `assets/{{RUN_ID}}/`, and its path is one line here. Downstream agents read this file. Open an image with the view tool; do not `cat` an image. Do not put a status word in it.

`handoff/{{RUN_ID}}/implementer-status.txt` lists every file and image a ticket or the plan required. One line per file: the path, then `CHANGED` or `UNCHANGED`, then the ticket id. A file or required image left untouched or unwritten must appear here listed as `UNCHANGED`. It must not disappear.

## Save the work

Do not emit `COMPLETE` while any required ticket edit or required image is unapplied or unwritten. Do not treat one passing command as proof that every ticket is done.

1. All in-scope file writes for this session are finished (including `handoff/{{RUN_ID}}/implementer.txt` and `handoff/{{RUN_ID}}/implementer-status.txt`). Do not write another file after this block.
2. Delete any temporary scratch files, ad-hoc diagnostic outputs, transient test caches (`.pytest_cache`, `__pycache__`), or unrequested side-effect files created during tool invocations so that no untracked leftovers remain in the worktree.
3. Run `git status --porcelain`. If it is empty, skip the commit.
4. If it is not empty, `git add` all in-scope files this session created, modified, or removed (including `handoff/{{RUN_ID}}/implementer.txt`, `handoff/{{RUN_ID}}/implementer-status.txt`, and any written `assets/{{RUN_ID}}/` files), then `git commit` with a message that names them. Do not push.
5. Run `git status --porcelain` again. If it is not empty, stop. Do not output `<promise>COMPLETE</promise>`.
6. If it is empty and no required ticket edit is open, output `<promise>COMPLETE</promise>`.

## Report

Name the specs and tickets implemented. List each changed file and the change (including any written image under `assets/{{RUN_ID}}/`). List each required file or image left unchanged and the ticket id.

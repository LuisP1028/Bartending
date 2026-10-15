---
ticket_id: 001
title: "Local Repository Staging, Commit & Upstream origin/main Publication"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_115.md"
---

# Ticket 001: Local Repository Staging, Commit & Upstream origin/main Publication

## Question
How should all modified FS-114 source files, specifications, Wayfinder artifacts, and patron asset directories in `/Users/diesel/desktop/bartending/Bartending` be staged, committed, and pushed to `origin/main` (`https://github.com/LuisP1028/Bartending.git`) while respecting `.gitignore` rules?

## Context & Specification Grounding
- Governing specification: [functional_specification_115.md](../../functional_specification_115.md) (§ 4.1, `AC-01`, `INV-SYNC-PARITY-01`).
- Note that `.gitignore` in `/Users/diesel/desktop/bartending/Bartending/.gitignore` ignores `wayfinder/` unless force-added (`git add -f wayfinder/...`), whereas `handoff/`, `functional_specification_*.md`, `required_edits_*.md`, `src/`, `dither-os-bartending/`, and `public/assets/patrons/` are tracked in commits `597379d`, `0068871`, and `a3d71ab`.

## Architectural Decisions to Lock
1. Stage all modified source files (`src/**`, `dither-os-bartending/**`), new patron directories (`public/assets/patrons/dddd_7551c5a4585b0c96/`, `public/assets/patrons/luis_a563f83239efbf77/`), specifications (`functional_specification_114.md`, `required_edits_114.md`, `functional_specification_115.md`, `required_edits_115.md`), handoff directories (`handoff/20261014T210600-114-gbui/`, `handoff/20261015T085500-115-push/`), and force-add the Wayfinder directories (`git add -f wayfinder/20261014T210600-114-gbui wayfinder/20261015T085500-115-push`).
2. Commit to `main` with a clear commit message and push to `origin main`.

## Scope & Invariant Guardrails
- **In Scope:** Local Git staging, commit creation, and `git push origin main`.
- **Out of Scope:** Remote SSH execution on `egg@10.0.0.62` (handled in `ticket-002.md` and `ticket-003.md`).

---

## Resolution

### 1. Deterministic Git Publication Sequence
- Run `git add -A` and `git add -f wayfinder/20261014T210600-114-gbui wayfinder/20261015T085500-115-push` in `/Users/diesel/desktop/bartending/Bartending`.
- Verify `git status --short` contains only expected FS-114 and FS-115 files (excluding `.playwright-mcp/` which lives in the parent `/Users/diesel/desktop/bartending/.playwright-mcp` directory).
- Commit and run `git push origin main`, verifying exit code `0` and `git rev-parse HEAD === git rev-parse origin/main`.

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** `ticket-002.md`

---
ticket_id: 002
title: "Mac Server Repository Synchronization & Patron Asset Parity on egg@10.0.0.62"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_115.md"
---

# Ticket 002: Mac Server Repository Synchronization & Patron Asset Parity on egg@10.0.0.62

## Question
How should `/Users/egg/Desktop/Bartending` on the Mac Server (`ssh -i ~/.ssh/id_ed25519_server egg@10.0.0.62`) be synchronized with `origin/main` while ensuring all patron assets in `public/assets/patrons/` remain intact?

## Context & Specification Grounding
- Governing specification: [functional_specification_115.md](../../functional_specification_115.md) (§ 4.2, `AC-02`, `INV-SYNC-PARITY-01`).
- On `egg@10.0.0.62`, `/Users/egg/Desktop/Bartending` is a clean Git clone tracking `origin/main` (`https://github.com/LuisP1028/Bartending.git`).

## Architectural Decisions to Lock
1. Execute `git fetch origin && git pull --ff-only origin main` inside `/Users/egg/Desktop/Bartending` via `ssh -i ~/.ssh/id_ed25519_server egg@10.0.0.62`.
2. Verify that `git rev-parse HEAD` on `egg@10.0.0.62:/Users/egg/Desktop/Bartending` equals the local `HEAD` SHA and that `public/assets/patrons/` contains all tracked and existing patron directories.

## Scope & Invariant Guardrails
- **In Scope:** Remote Git synchronization and patron directory verification on `egg@10.0.0.62`.
- **Out of Scope:** Docker image rebuild and container recreation (handled in `ticket-003.md`).

---

## Resolution

### 1. Remote Synchronization Protocol
- Connect via `ssh -i ~/.ssh/id_ed25519_server -o BatchMode=yes egg@10.0.0.62`.
- In `/Users/egg/Desktop/Bartending`, run `git fetch origin && git pull --ff-only origin main`.
- Assert `git status --short` is empty and `git rev-parse HEAD` matches `origin/main`.

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** `ticket-003.md`

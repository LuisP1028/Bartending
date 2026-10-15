---
ticket_id: 004
title: "Live Mac Server End-to-End Verification Matrix & Handoff Certification"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-003.md"]
governing_specification: "functional_specification_115.md"
---

# Ticket 004: Live Mac Server End-to-End Verification Matrix & Handoff Certification

## Question
How should we verify that the updated Mac Server Bartending Space (`http://10.0.0.62:3001` and `https://rolled-blackberry-dairy-browsing.trycloudflare.com`) serves the new FS-114 build with zero regressions and complete three-way Git parity?

## Context & Specification Grounding
- Governing specification: [functional_specification_115.md](../../functional_specification_115.md) (`AC-01` through `AC-04`, `INV-SYNC-PARITY-01`, `INV-RUNTIME-ENV-01`, `INV-INGRESS-CONTINUITY-01`).

## Architectural Decisions to Lock
1. Verify HTTP `200 OK` on both `http://10.0.0.62:3001` and `https://rolled-blackberry-dairy-browsing.trycloudflare.com`.
2. Navigate Playwright MCP to `http://10.0.0.62:3001` (the live Mac Server!) and verify:
   - Bottom-docked `RetroRpgDialogueBox` (`heightRatio <= 0.30`).
   - Transient receipt printer (`data-printer-phase`) with `PATRON: <DISPLAY NAME>` attribution.
   - Patron-click isolation and red-box receipt placement (`35% / 14% / 35% / 58%`).
   - Unclipped `"JIGGER"` / `"0.50 oz"` trigger text and `[data-testid="carousel-dialogue-popup"]` above bottle carousels.
   - Zero console errors and `200 OK` on `/api/dialogue` and `/api/patrons/roster`.
3. Record all handoff artifacts in `handoff/20261015T085500-115-push/`, commit and push to `origin/main`, and fast-forward `/Users/egg/Desktop/Bartending` on `egg@10.0.0.62` so local, `origin/main`, and `egg@10.0.0.62` share the exact same final `HEAD` SHA.

## Scope & Invariant Guardrails
- **In Scope:** Live Playwright MCP verification against `http://10.0.0.62:3001` / `https://rolled-blackberry-dairy-browsing.trycloudflare.com` and final handoff parity.
- **Out of Scope:** New application feature changes.

---

## Resolution

### 1. Master Verification Matrix
Synthesized in [test_matrix_115.md](../test_matrix_115.md).

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** None (Terminal verification ticket)

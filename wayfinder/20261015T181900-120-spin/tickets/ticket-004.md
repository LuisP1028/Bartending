---
ticket_id: 004
title: "End-to-End Playwright Verification Matrix, Mac Server Deployment Sync & Handoff Certification"
type: task
status: resolved
claimed_by: "wayfinder-executor"
blocked_by: ["ticket-001.md", "ticket-003.md"]
governing_specification: "functional_specification_120.md"
---

# Ticket 004: End-to-End Playwright Verification Matrix, Mac Server Deployment Sync & Handoff Certification

## Context & Specification Grounding
- Governing specification: [functional_specification_120.md](../../functional_specification_120.md) (§ 6, `AC-01`–`AC-05`).

## Resolution
1. Verify `AC-01` through `AC-05` in a live Playwright browser session across desktop (`1280×800`) and mobile (`390×844`) viewports, capturing screenshots of the chrome-free Game Boy view, rotated 3D axis views (angled and rear `cartridge-pocket` view), and post-shake `(0, 0, 0)` reset view.
2. Synchronize changes to `origin/main` and rebuild/update `bartending-app-local` on `egg@10.0.0.62`.
3. Record handoff certification artifacts in `handoff/20261015T181900-120-spin/`.

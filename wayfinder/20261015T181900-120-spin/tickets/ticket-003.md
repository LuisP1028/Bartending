---
ticket_id: 003
title: "Mobile Shake-to-Center (0, 0, 0) Reset via DeviceMotionEvent"
type: task
status: resolved
claimed_by: "wayfinder-executor"
blocked_by: ["ticket-002.md"]
governing_specification: "functional_specification_120.md"
---

# Ticket 003: Mobile Shake-to-Center `(0, 0, 0)` Reset via `DeviceMotionEvent`

## Context & Specification Grounding
- Governing specification: [functional_specification_120.md](../../functional_specification_120.md) (§ 4.4, `AC-04`, `INV-SHAKE-RESET-01`).

## Resolution
1. Implement `resetRotationToOrigin()` in `GameBoy3DShell.tsx`:
   - Unwrap `currentRotRef.current.y` to `[-π, π]` via modulo arithmetic so multi-turn spins take the shortest angular path back to `0`.
   - Set `targetRotRef.current = { x: 0, y: 0 }` so the animation loop smoothly interpolates `gameBoyRoot.rotation` back to `(0, 0, 0)`.
2. Attach a `window` `'devicemotion'` listener in `GameBoy3DShell.tsx`:
   - Read `event.acceleration` and `event.accelerationIncludingGravity`.
   - Compute frame-to-frame acceleration delta magnitude (`deltaMag`) and linear acceleration magnitude (`linMag`).
   - When `deltaMag >= 14` m/s² or `linMag >= 16` m/s² (with a 400ms debounce), invoke `resetRotationToOrigin()`.
3. On iOS 13+ browsers where `typeof DeviceMotionEvent.requestPermission === 'function'`, request permission once on the first user gesture (`pointerdown` / `touchstart` on the shell host) without blocking interaction.
4. Also listen for a custom `'gb-shake-reset'` event on `window` for deterministic testing and accessibility reset support.

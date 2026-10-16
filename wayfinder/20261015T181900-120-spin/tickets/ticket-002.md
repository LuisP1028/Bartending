---
ticket_id: 002
title: "Interactive 3D Game Boy Axis Spin & 3D Perspective Screen Sync"
type: task
status: resolved
claimed_by: "wayfinder-executor"
blocked_by: []
governing_specification: "functional_specification_120.md"
---

# Ticket 002: Interactive 3D Game Boy Axis Spin & 3D Perspective Screen Sync

## Context & Specification Grounding
- Governing specification: [functional_specification_120.md](../../functional_specification_120.md) (§ 4.3, `AC-03`, `AC-05`, `INV-3D-AXIS-SPIN-01`, `INV-SCREEN-INTERACT-01`).
- `GameBoy3DShell.tsx` renders the 15-part `game-boy.glb` model inside `gameBoyRoot`.

## Resolution
1. Track `targetRotRef` (`{ x: number; y: number }`) and `currentRotRef` (`{ x: number; y: number }`) on `gameBoyRoot` (`rotation.order = 'YXZ'`).
2. Support pointer dragging on `canvasRef`:
   - On `pointerdown`, record initial pointer position and raycast against `gameBoyRoot.children`.
   - If the pointer moves beyond a 5px drag threshold, enter active spin-drag mode (`setPointerCapture`), updating `targetRotRef.current.y += dx * 0.011` (continuous 360° Y-axis spin) and `targetRotRef.current.x = clamp(targetRotRef.current.x + dy * 0.008, -0.65, 0.65)`.
   - If `pointerup` occurs without exceeding the drag threshold and a 3D button mesh (`button-a`, `button-b`, `button-start`, `button-select`, `button-cross-*`, `power-button`) was hit on `pointerdown`, trigger that button action cleanly.
3. Synchronize the HTML screen (`.gb-shell__screen-cont`) and button hitboxes with `gameBoyRoot`'s 3D rotation every animation frame:
   - Compute the world-space normal of the front screen and its dot product with the camera view vector (`facingDot`).
   - When `facingDot <= 0.08` (console rotated edge-on or showing its rear `cartridge-pocket`), hide `.gb-shell__screen-cont` and `.gb-shell__controls` (`opacity: 0`, `visibility: 'hidden'`, `pointerEvents: 'none'`).
   - When `facingDot > 0.08` and `|rotX| > 0.0005 || |rotY| > 0.0005`, compute the exact 2D projective homography `matrix3d(...)` from the unrotated `baseScreenRect` `(0..W, 0..H)` onto the 3D `screen` mesh front plane under `camera.projectionMatrix * camera.matrixWorldInverse * gameBoyRoot.matrixWorld`, keeping the DOM screen locked 1:1 to the 3D screen bezel without reflowing internal DOM children.
   - When at rest (`|rotX| <= 0.0005 && |rotY| <= 0.0005`), use `transform: 'none'` so axis-aligned screen geometry is preserved.

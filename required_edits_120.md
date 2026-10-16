# Required Edits — Functional Specification 120 (`functional_specification_120.md`)

## Edit 1: Remove External Header `OBELISCO` / `CLASSICS` Mode Buttons & External `ReceiptToolbar` (`AC-01`, `AC-02`, `INV-NO-EXTERNAL-CHROME-01`)
- **`src/app/page.tsx`**:
  - Remove the `<div className="sys-header">` block rendering the `OBELISCO` and `CLASSICS` mode buttons outside `<GameBoy3DShell>`.
  - Remove the `<ReceiptToolbar>` block rendering the `"Generate Ticket"` and `"Validate Drink"` (Validate Ticket) buttons outside `<GameBoy3DShell>`.
  - Clean up unused `ReceiptToolbar`, `AVAILABLE_MODES`, `OBELISCO_MODE_LOGO_SRC`, and `CLASSICS_MODE_LOGO_SRC` references in `src/app/page.tsx`.

## Edit 2: Interactive 3D Game Boy Axis Spin & 3D Perspective Screen Sync (`AC-03`, `AC-05`, `INV-3D-AXIS-SPIN-01`, `INV-SCREEN-INTERACT-01`)
- **`src/components/GameBoy3DShell.tsx`**:
  - Add `targetRotRef` (`{ x: number; y: number }`) and `currentRotRef` (`{ x: number; y: number }`) with `gameBoyRoot.rotation.order = 'YXZ'`.
  - Implement pointer-drag axis spinning on `canvasRef`:
    - Record pointer start coordinates and raycast hit part on `pointerdown`.
    - When pointer drag exceeds `5px`, enter spin-drag mode (`canvas.setPointerCapture`), updating `targetRotRef.current.y += dx * 0.011` (360° continuous Y-axis spin) and `targetRotRef.current.x = clamp(targetRotRef.current.x + dy * 0.008, -0.65, 0.65)` (bounded X-axis tilt).
    - When `pointerup` occurs without dragging (`<= 5px`), actuate the raycast-hit 3D button (`button-a`, `button-b`, `button-start`, `button-select`, `button-cross-*`, `power-button`).
  - Synchronize `.gb-shell__screen-cont` and `.gb-shell__controls` with `gameBoyRoot`'s 3D transform every frame:
    - Compute front-face visibility (`facingDot` between world screen normal and camera direction).
    - Hide `.gb-shell__screen-cont` and `.gb-shell__controls` (`opacity: 0`, `visibility: 'hidden'`, `pointerEvents: 'none'`) when `facingDot <= 0.08` so the rear `cartridge-pocket` and back casing render cleanly without screen bleed-through.
    - When rotated (`|rotX| > 0.0005 || |rotY| > 0.0005`) and front-facing (`facingDot > 0.08`), apply the exact 3D-to-2D projective homography `matrix3d(...)` mapping `(0..baseW, 0..baseH)` onto the projected 3D `screen` mesh quad.
    - Expose `data-rotation-x`, `data-rotation-y`, and `data-screen-visible` attributes on `.gb-3d-shell-host`.

## Edit 3: Mobile Shake-to-Center `(0, 0, 0)` Reset (`AC-04`, `INV-SHAKE-RESET-01`)
- **`src/components/GameBoy3DShell.tsx`**:
  - Add `resetRotationToOrigin()` which unwraps `currentRotRef.current.y` to `[-π, π]` and sets `targetRotRef.current = { x: 0, y: 0 }` so the console smoothly animates back to `(0, 0, 0)`.
  - Attach a `window` `'devicemotion'` listener detecting acceleration spikes (`deltaMag >= 14` m/s² or linear `linMag >= 16` m/s²) and invoking `resetRotationToOrigin()`.
  - Request `DeviceMotionEvent.requestPermission()` on the first user pointer/touch gesture when supported (iOS 13+ Safari), and listen for `window` `'gb-shake-reset'` events.

# Required Edits — Functional Specification 121 (`functional_specification_121.md`)

## Edit 1: Mobile Viewport Screen-Zoom State & D-Pad Trigger (`AC-01`, `INV-MOBILE-DPAD-ZOOM-01`, `INV-DESKTOP-STABILITY-01`)
- **`src/components/GameBoy3DShell.tsx`**:
  - Add `isScreenZoomedRef` (`boolean`), `targetZoomRef` (`number`, `0` = normal full-console framing, `1` = screen-zoomed framing), and `currentZoomRef` (`number`).
  - Add `isMobileViewport()` helper (`host.clientWidth <= 768` or coarse-pointer viewport `<= 920px`).
  - In `triggerDpad(dir: DpadDirection)`:
    - When `isMobileViewport()` is `true`, set `isScreenZoomedRef.current = true`, `targetZoomRef.current = 1`, and invoke `resetRotationToOrigin()` so any slight console tilt smoothly centers to `(0, 0, 0)` while zooming into the screen.
    - On desktop viewports (`!isMobileViewport()`), keep `isScreenZoomedRef.current = false` and `targetZoomRef.current = 0` so full-console framing is preserved.

## Edit 2: 3D Camera Screen-Zoom Framing & Continuous 1:1 Screen/Button Registration (`AC-01`, `AC-02`, `INV-ZOOM-REGISTRATION-01`)
- **`src/components/GameBoy3DShell.tsx`**:
  - Store unrotated 3D bounding boxes `localScreenBoxRef` and `localButtonBoxesRef` for `screen` and the 8 physical controls (`button-b`, `button-a`, `button-start`, `button-select`, `button-cross-up`, `button-cross-down`, `button-cross-left`, `button-cross-right`) when `game-boy.glb` loads.
  - Compute both camera framing targets for the current viewport `(w, h)`:
    - **Normal Full-Console Framing (`zoom = 0`)**: centered on `(0, 0.185)` at distance fitting the full Game Boy housing (`spanX = 2.38`, `spanY = 3.47 * 1.04`).
    - **Screen-Zoomed Framing (`zoom = 1`)**: centered on the 3D `screen` mesh center `(screenCenterX, screenCenterY)` (`(0, 0.861)`) at distance where the projected 3D `screen` mesh fills `94%` of the mobile viewport width (`>= 90%` required by `AC-01`, while keeping the surrounding 3D Game Boy shell/bezel visible around the screen).
  - In `animate()`, smoothly interpolate `currentZoomRef.current` toward `targetZoomRef.current` (`damping = 0.22`), interpolate the 3D `PerspectiveCamera` position and look-at target between normal and screen-zoomed framing, and project `localScreenBoxRef` and `localButtonBoxesRef` at every frame so `.gb-shell__screen-cont` and `.gb-shell__controls` remain strictly 1:1 co-registered with the 3D meshes before, during, and after zoom transitions.
  - Expose `data-screen-zoomed` (`"true"` / `"false"`) and `data-camera-zoom` on `.gb-3d-shell-host`.

## Edit 3: Automatic Camera Zoom-Out on Console Rotation Drag (`AC-03`, `AC-04`, `INV-ROTATE-UNZOOM-01`)
- **`src/components/GameBoy3DShell.tsx`**:
  - In `onWindowPointerMove`, as soon as a pointer drag outside the screen exceeds the `5px` spin-drag threshold (`isSpinDraggingRef.current = true`), immediately exit the Screen-Zoomed Camera State (`isScreenZoomedRef.current = false`, `targetZoomRef.current = 0`) so the 3D camera smoothly zooms back out to the normal full-console framing while rotating the console on its axis.
  - Guard DOM button `onClick` handlers against firing when `isSpinDraggingRef.current` was active.

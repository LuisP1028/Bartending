# Handoff Certification — Run `20261015T181900-120-spin` (FS120)

- **Run ID**: `20261015T181900-120-spin`
- **Specification**: [`functional_specification_120.md`](../../functional_specification_120.md)
- **Required Edits**: [`required_edits_120.md`](../../required_edits_120.md)
- **Status**: `CERTIFIED`

## Acceptance Criteria Verification Summary

| Criterion | Status | Verification Evidence |
|---|---|---|
| `AC-01` — External `OBELISCO` / `CLASSICS` header buttons removed | **PASS** | `document.querySelectorAll('.sys-header').length === 0` and `document.querySelectorAll('.mode-btn').length === 0` across desktop (`1280×800`) and mobile (`390×844`). |
| `AC-02` — External `"Generate Ticket"` and `"Validate Ticket"` / `"Validate Drink"` toolbar removed | **PASS** | `document.querySelectorAll('.receipt-toolbar').length === 0` and `document.querySelectorAll('.receipt-btn').length === 0` across desktop (`1280×800`) and mobile (`390×844`). |
| `AC-03` — Interactive 3D Game Boy axis spinning (`Y` yaw + `X` pitch), projective `matrix3d` screen homography, and rear-face occlusion | **PASS** | Verified at oblique angles (`rotY = 0.66 rad`, `rotX = -0.16 rad`, `data-screen-visible="true"`, `matrix3d(...)` applied; see `desktop-1280x800-oblique.png` and `mobile-390x844-oblique.png`) and rear view (`rotY = 3.135 rad`, `data-screen-visible="false"`, `opacity: 0`, `pointerEvents: none` showing rear `cartridge-pocket`; see `desktop-1280x800-rear.png`). |
| `AC-04` — Mobile phone shake (`DeviceMotionEvent` / `gb-shake-reset`) smoothly re-centers Game Boy at `(0, 0, 0)` | **PASS** | Verified via synthetic `devicemotion` shake event (`acceleration: { x: 18, y: 12, z: 8 }`) on mobile (`390×844`) and `gb-shake-reset` on desktop (`1280×800`), smoothly returning `data-rotation-x="0.0000"`, `data-rotation-y="0.0000"`, `data-screen-visible="true"` (`mobile-390x844-after-shake.png`). |
| `AC-05` — Physical controls (`D-Pad`, `A`, `B`, `START`, `SELECT`) and inside-screen interactions preserved with zero `{errors}` | **PASS** | Verified `START` skips boot intro into live Obelisco Bartending stage, `D-Pad Down` and `SELECT` actuate without error, inside-screen drag does not rotate shell (`afterScreenDragAttrs: { rotX: 0, rotY: 0 }`), and `pageErrors: []`. |

## Visual Evidence Artifacts
- [`wayfinder/20261015T181900-120-spin/desktop-1280x800-origin.png`](../../wayfinder/20261015T181900-120-spin/desktop-1280x800-origin.png)
- [`wayfinder/20261015T181900-120-spin/desktop-1280x800-oblique.png`](../../wayfinder/20261015T181900-120-spin/desktop-1280x800-oblique.png)
- [`wayfinder/20261015T181900-120-spin/desktop-1280x800-rear.png`](../../wayfinder/20261015T181900-120-spin/desktop-1280x800-rear.png)
- [`wayfinder/20261015T181900-120-spin/mobile-390x844-origin.png`](../../wayfinder/20261015T181900-120-spin/mobile-390x844-origin.png)
- [`wayfinder/20261015T181900-120-spin/mobile-390x844-oblique.png`](../../wayfinder/20261015T181900-120-spin/mobile-390x844-oblique.png)
- [`wayfinder/20261015T181900-120-spin/mobile-390x844-after-shake.png`](../../wayfinder/20261015T181900-120-spin/mobile-390x844-after-shake.png)

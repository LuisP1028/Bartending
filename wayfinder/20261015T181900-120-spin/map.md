# Wayfinder Map — Run `20261015T181900-120-spin` (FS120)

- **Run ID**: `20261015T181900-120-spin`
- **Specification**: [`functional_specification_120.md`](../../functional_specification_120.md)
- **Required Edits**: [`required_edits_120.md`](../../required_edits_120.md)
- **Test Matrix**: [`test_matrix_120.md`](./test_matrix_120.md)
- **Status**: `completed`

## Tickets

| Ticket ID | Title | Files | Status |
|---|---|---|---|
| [`ticket-001`](./tickets/ticket-001.md) | Remove external `.sys-header` (`OBELISCO`/`CLASSICS`) and `<ReceiptToolbar>` (`Generate Ticket`/`Validate Drink`) from `page.tsx` | `src/app/page.tsx` | `completed` |
| [`ticket-002`](./tickets/ticket-002.md) | Implement 3D Game Boy Y/X axis drag-to-spin, 3D-to-2D projective `matrix3d` screen homography, and rear-face screen occlusion in `GameBoy3DShell.tsx` | `src/components/GameBoy3DShell.tsx` | `completed` |
| [`ticket-003`](./tickets/ticket-003.md) | Implement `DeviceMotionEvent` mobile phone shake detector + iOS permission request + smooth reset to `(0, 0, 0)` in `GameBoy3DShell.tsx` | `src/components/GameBoy3DShell.tsx` | `completed` |
| [`ticket-004`](./tickets/ticket-004.md) | End-to-end Playwright verification (desktop `1280×800` & mobile `390×844`), visual inspection, and Mac Server (`egg@10.0.0.62`) sync | `wayfinder/20261015T181900-120-spin/`, `handoff/20261015T181900-120-spin/` | `completed` |

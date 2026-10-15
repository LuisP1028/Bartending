---
id: ticket-002
title: Eliminate Pill-Shaped Hitboxes on Mobile Start and Select Buttons
status: completed
depends_on: []
acceptance_criteria:
  - AC-02
---

# Ticket 002: Eliminate Pill-Shaped Hitboxes on Mobile Start and Select Buttons

## Scope
Ensure the projected 3D physical control hit targets for `START` (`.gb-shell__btn-start`) and `SELECT` / Options (`.gb-shell__btn-select`) are 100% visually transparent on mobile portrait viewports (`390×844`, `hover: none`, `pointer: coarse`) as well as desktop viewports, eliminating the grey/white pill-shaped box (`border-radius: 999px`, `box-shadow: 0 0 0 0.55cqw #dfdfdf`, `background: #999`) and overlaid `::after` `"SELECT"` / `"START"` labels (`INV-START-SELECT-TRANSPARENT-01`).

## Completed Edits
- `src/app/gameboy-shell.css`: Added explicit `.gb-3d-shell-host [data-gb-3d-controls="true"]` overrides enforcing `background: transparent !important`, `box-shadow: none !important`, `border: none !important`, `border-radius: 0 !important`, and `::before`/`::after` `content: none !important; display: none !important`.
- `src/components/GameBoy3DShell.tsx`: Added inline `boxShadow: 'none'`, `outline: 'none'`, `borderRadius: 0`, and `WebkitTapHighlightColor: 'transparent'` on all projected 3D control buttons.

## Verification (`AC-02`)
- Verified on `390×844` mobile portrait viewport in Playwright (`mobile_portrait_shell.png`):
  - `.gb-shell__btn-select` & `.gb-shell__btn-start` computed styles: `backgroundColor: "rgba(0, 0, 0, 0)"`, `boxShadow: "none"`, `borderRadius: "0px"`, `borderStyle: "none"`, `::after content: "none"`, `::after display: "none"`.

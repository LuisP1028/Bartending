---
ticket_id: "006"
title: "FS114 Integration Test Decision Mapping, Fail-Fast Invariant Governance & Playwright Verification Protocol"
type: task
status: resolved
claimed_by: "wayfinder"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md", "ticket-004.md", "ticket-005.md"]
governing_specification: "functional_specification_114.md"
---

# Ticket 006: FS114 Integration Test Decision Mapping, Fail-Fast Invariant Governance & Master Verification Protocol

## Question
What exact verification vectors, authentic codebase schemas, and fail-fast assertion oracles are required to verify Acceptance Criteria `AC-01` through `AC-08` and Invariants `INV-DIALOGUE-BOTTOM-01` through `INV-FAILFAST-01` of `functional_specification_114.md` in the live browser runtime via Playwright MCP?

## Verification Vectors & Oracles

| Test ID | Target Components | Acceptance Criterion / Invariant | Input / Scenario | Expected Output Oracle (`{correct required outputs}`) |
| :--- | :--- | :--- | :--- | :--- |
| **IT-FS114-01** | `RetroRpgDialogueBox.tsx`<br>`RetroRpgDialogueBox.module.css`<br>`page.tsx` | **AC-01**, **INV-DIALOGUE-BOTTOM-01** | Trigger patron sit & order dialogue inside the Game Boy screen on desktop (`1280×800`) and mobile (`390×844`); measure `.gb-shell__playfield` vs `[role="dialog"]` | Dialogue box height is `22%–28%` (`≤ 30%`) of `.gb-shell__playfield` height, anchored at the bottom strip (`bottom ≥ 95%` of screen height); upper `70%+` of bar stage and patrons remain visible; portrait, speaker name, and text have zero clipping (`scrollHeight <= clientHeight`, `scrollWidth <= clientWidth`). |
| **IT-FS114-02** | `ReceiptSystem.tsx`<br>`ReceiptPaper.tsx`<br>`receipt.css`<br>`mapTicketToReceipt.ts` | **AC-02**, **AC-03**, **INV-PRINTER-TRANSIENT-01** | Observe receipt printer when idle, during patron sit / ticket generation, and after print completion | When idle, printer hardware and free tickets have `0` screen footprint; on order trigger, printer fades in, unrolls summary ticket displaying `PATRON: <DISPLAY NAME>`, pauses briefly, and both ticket and printer fade out and disappear completely. |
| **IT-FS114-03** | `PatronLayer.tsx`<br>`ReceiptSystem.tsx`<br>`ReceiptPaper.tsx`<br>`page.tsx`<br>`receipt.css` | **AC-04**, **AC-05**, **INV-PATRON-ISOLATION-01**, **INV-RECEIPT-BOX-01** | Click a seated patron `x` when multiple patrons are at the bar; measure opened receipt bounding box vs `.gb-shell__playfield`; then dismiss via click or Game Boy `A` button | Clicking patron `x` hides all other patrons (`visibility: hidden` / `opacity: 0`), keeps patron `x` visible, binds patron `x`'s order to the mat, and renders patron `x`'s full receipt **without** the printer bezel inside `left: ~35%`, `top: ~14%`, `width: ~35%`, `height: ~58%` of `.gb-shell__playfield` on both desktop and mobile; dismissing restores all other patrons immediately. |
| **IT-FS114-04** | `JiggerPourControl.tsx`<br>`globals.css` | **AC-06**, **INV-JIGGER-TEXT-01** | Measure `.jigger-pour-trigger`, `.jigger-pour-icon`, `.jigger-pour-caption` (`"JIGGER"`), and `.jigger-pour-current` (`"0.50 oz"`) across desktop and mobile viewports; click to open `.jigger-pour-panel` | `"JIGGER"` and `"0.50 oz"` render with 100% glyph visibility on single lines (`scrollWidth <= clientWidth`, `scrollHeight <= clientHeight`) fully inside `.jigger-pour-trigger` borders; popup panel opens proportionally inside `.gb-shell__playfield`. |
| **IT-FS114-05** | `MagnificationCarousel.tsx`<br>`CategoryOverlay.tsx`<br>`BottleAsset.tsx`<br>`hotspotGeometry.ts` | **AC-07** | Open bottle/category carousels (`speedrail`, `syrups`, `juices`, etc.), measure bottle silhouettes and `[data-testid="carousel-item-popup"]`, and step via D-Pad (`Right` / `Left` / `Down` / `Up`) or scroll | Bottles render tall and unclipped with zero inline `.asset-under-label` text; `[data-testid="carousel-item-popup"]` renders in `#09133b` navy with white/black pixel border and pixel font, does not overlap the bottle silhouette, stays 100% inside `.gb-shell__playfield`, and updates live to the focused item's `label` on scroll/D-Pad. |
| **IT-FS114-06** | Full Application Runtime | **AC-08**, **INV-FAILFAST-01** | Execute end-to-end Playwright verification across desktop and mobile viewports while monitoring console errors, page errors, and network responses | Zero console errors, zero uncaught page exceptions, and zero HTTP 4xx/5xx asset failures. |

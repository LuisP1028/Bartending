---
ticket_id: "004"
title: "Live Playwright Verification Matrix Across Desktop & Mobile Viewports"
type: task
status: resolved
claimed_by: "wayfinder"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md"]
governing_specification: "functional_specification_116.md"
---

# Ticket 004: Live Playwright Verification Matrix Across Desktop & Mobile Viewports

## Question
How do we objectively verify and certify in the live browser runtime via Playwright MCP that `AC-01` through `AC-08` and all invariants (`INV-APPEAR-UNCLIPPED-01`, `INV-DISAPPEAR-CLEAN-01`, `INV-INSPECT-SQUARE-01`, `INV-TEXT-INTEGRITY-01`, `INV-ASSET-INTEGRITY-01`, `INV-PATRON-ISOLATION-01`, `INV-FAILFAST-01`) pass across both desktop (`1280×800`) and mobile (`390×844`) viewports with zero `{errors}`?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_116.md` (§6 Acceptance Criteria `AC-01`–`AC-08`).

## Architectural Decisions to Lock
1. **Desktop (`1280×800`) & Mobile (`390×844`) Playwright Evaluation Suite**:
   - Verify `AC-01` (`1appear` unobstructed top header): `titleRect.top >= bezelRect.bottom` (`0px` overlap).
   - Verify `AC-02` (`1appear` complete summary content & single-line meta): `PATRON: <DISPLAY NAME>` has `scrollWidth <= clientWidth` (no ellipsis truncation), `CHK: ORD-XXXX` and `HH:MM AM/PM` sit on a single horizontal line (`clientHeight <= 1.4 * lineHeight`), and `.receipt-paper--summary` + `.receipt-printer-mask` show the drink name, vessel, method, ingredient summary, and `TOTAL` without vertical clipping.
   - Verify `AC-03` (`2disappear` complete fade-out): After the transient print cycle finishes, `.receipt-hardware-cluster` and `.receipt-printer-mask` transition to `printer-phase--idle` (`opacity: 0`, `visibility: hidden`).
   - Verify `AC-04` (`3be shown` larger square geometry): Clicking a seated patron opens `.receipt-wrapper.state-inspected` with `width >= 48%` of `.gb-shell__playfield` width, aspect ratio `width / height` in `[0.85, 1.15]`, and 100% containment inside `.gb-shell__playfield` on both `1280×800` and `390×844`.
   - Verify `AC-05` (`3be shown` single-line metadata integrity): `PATRON: <DISPLAY NAME>`, `CHK: ORD-XXXX` + `MM/DD/YYYY`, and `SRV: V_BARTENDER` + `HH:MM AM/PM` each render on a single horizontal line (`clientHeight <= 1.4 * lineHeight`).
   - Verify `AC-06` (`3be shown` recipe visibility & crisp logo asset): `.r-logo` loads (`complete === true`, `naturalWidth > 0`) with `height >= 28px` on desktop, and drink title, `VESSEL`, `METHOD`, and ingredient lines are visible inside the square receipt without horizontal clipping or mid-word breaks.
   - Verify `AC-07` (patron isolation & dismissal restoration): Other seated patrons are hidden while the square receipt is open and restored immediately upon dismissal.
   - Verify `AC-08` (visual screenshots & zero `{errors}`): Capture Playwright screenshots of `1appear`, `2disappear`, and `3be shown` and confirm zero console/page/network errors.

---

## Resolution

### 1. Verification Execution
- Executed live Playwright verification across `1280×800` and `390×844` viewports against `http://localhost:3001`, confirming all acceptance criteria `AC-01` through `AC-08` with zero `{errors}`.

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** None (terminal verification ticket)

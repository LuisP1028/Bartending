---
ticket_id: "006"
title: "Local Runtime Verification Protocol & Subsystem Smoke Test"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md", "ticket-002.md", "ticket-003.md", "ticket-004.md", "ticket-005.md"]
governing_specification: "functional_specification_99.md"
---

# Ticket 006: Local Runtime Verification Protocol & Subsystem Smoke Test

## Question
What deterministic, measurable verification protocol and test assertions must be executed to validate that all five core functional subsystems (Boot Intro -> Main Menu -> Bar Playfield -> Bartending Mechanics -> Comm-Link) operate with 100% correctness on `localhost` before any gameplay or aesthetic modifications begin?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_99.md` Desired Functionality §3 ("Local Runtime Verification"), §4 ("Readiness Gate for Future Development"), and Acceptance Criteria AC1 through AC7:
  - AC1: Local Server Startup
  - AC2: Remote Endpoint Independence
  - AC3: Local Playfield Operation
  - AC4: Stock Patron Spawning
  - AC5: Local Asset Serving
  - AC6: Local Data Persistence
  - AC7: Camera & Comm-Link
- **Affected Files:**
  - `src/components/BootIntro.tsx`
  - `src/components/MainMenu.tsx`
  - `src/components/PatronLayer.tsx`
  - `src/hooks/useSimulation.ts`
  - `src/components/JoinBarCommLink.tsx`
  - `src/components/JoinBarCamera.tsx`
  - `src/app/page.tsx`
  - `src/app/api/patrons/roster/route.ts`

## Architectural Decisions to Lock
1. **Verification Gate Sequence:**
   Before any new gameplay features, UI alterations, or asset overhauls are introduced, the local runtime must pass all five verification stages:
   - **Stage 1 (Boot Intro):**
     - Verify local static route `GET /assets/boot/doom_gamestudio.mp4` returns HTTP 200 with video MIME type.
     - Verify video playback in housing screen; 5 taps on the screen skip intro to Main Menu (`onComplete()`).
   - **Stage 2 (Main Menu - Synthwave Navigator):**
     - Main menu renders options: "START GAME", "MODE SELECTION", "JOIN THE BAR", "CREDITS", "QUIT".
     - Keyboard navigation and Game Boy buttons transition selections.
     - "START" button transitions state smoothly.
   - **Stage 3 (Bar Playfield & Stock Patron Spawning):**
     - Main stage SVG renders bar cutoff, vessel slot, and bar seats.
     - Stock patrons (`elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`) spawn automatically onto free bar seats within 10 seconds.
     - Tapping a patron surfaces character dialogue.
   - **Stage 4 (Bartending Mechanics):**
     - Magnification carousel displays available liquor/syrup bottles.
     - Pour control updates fluid simulation levels.
     - Recipe evaluation against active mode succeeds and prints receipt ticket.
   - **Stage 5 (Comm-Link / Join):**
     - Main menu "JOIN THE BAR" opens Comm-Link interface.
     - Transmit step transitions to `JoinBarCamera`.
     - Camera requests `getUserMedia` under `localhost` secure origin.
     - Photo submission without external keys reports 503 informative error without crashing or producing ghost patrons.
2. **Automated Smoke Test Suite Contract:**
   Define an automated verification script that executes programmatically on `localhost` (e.g. via `npx tsx scripts/verify-local-runtime.mts` or Playwright) confirming:
   - Zero HTTP requests dispatched to `*.hf.space`.
   - Local endpoints `/`, `/api/patrons/roster`, and `/api/patrons/assets/...` return HTTP 200.
   - SQLite tables and runtime JSON persist across simulated restarts.

## Scope & Invariant Guardrails
- **In Scope:** Test protocol specification, acceptance criteria mapping, subsystem readiness gate definition.
- **Out of Scope:** Implementing gameplay re-balancing or modifying drink recipes.

---

## Resolution

### 1. Concrete Verification Matrix
| Subsystem Stage | Tested Call Site / Endpoint | Expected Local Output | Acceptance Criterion |
|---|---|---|---|
| 1. Boot Media | `GET /assets/boot/doom_gamestudio.mp4` | HTTP 200, Content-Type: video/mp4 | AC5 |
| 2. Main Menu | `src/components/MainMenu.tsx` | Menu items render; mode selection toggles | AC3 |
| 3. Bar Playfield | `src/components/PatronLayer.tsx` | Elder, Caesar, Trump spawn and animate | AC4 |
| 4. Bartending Mechanics | `src/hooks/useSimulation.ts` | Jigger pour, drink validation, ticket print | AC3 |
| 5. Comm-Link Camera | `src/components/JoinBarCamera.tsx` | `getUserMedia` permission prompt on `localhost` | AC7 |
| 6. Remote Decoupling | Browser network log audit | 0 requests to `*.hf.space` | AC2 |
| 7. Local Persistence | `data/runtime-patrons.json`, `data/patrons.sqlite` | File writes survive server restart | AC6 |
| 8. Server Startup | `npm run dev` / `npm run start` | Process boots on `http://localhost:3000` | AC1 |

### 2. Readiness Certification
Upon successful execution and verification of this protocol, the local environment is certified ready for future feature development.

### 3. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks final Master Component-to-Edit Matrix synthesis (`required_edits_99.md`).

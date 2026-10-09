---
ticket_id: "007"
title: "Presentation Shell Integration Testing, Target Resolution Matrix & Local Permissive Delegation"
type: task
status: resolved
claimed_by: "wayfinder-test-plan"
blocked_by: ["ticket-002.md", "ticket-006.md"]
governing_specification: "functional_specification_99.md"
---

# Ticket 007: Presentation Shell Integration Testing, Target Resolution Matrix & Local Permissive Delegation

## Question
What deterministic integration test decisions, input/output schemas, admissible observed payloads, and specification oracles govern the verification of the presentation shell (`docs/index.html`) following its decoupling from Hugging Face Spaces, ensuring zero network traffic to remote hosts, dynamic local target resolution, and seamless camera permission delegation under `INV-PAYLOAD-01` and `INV-ASSERTION-01` without synthesizing test fixtures or test code?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_99.md` §1 ("Complete Local Hosting & Remote Decoupling"), §3 ("Local Runtime Verification"), AC1 ("Local Server Startup"), AC2 ("Remote Endpoint Independence"), AC7 ("Camera & Comm-Link").
- **Upstream Manifest Context:**
  - `handoff/20261009T150513-263-v0ev/implementer.txt` and `handoff/20261009T150513-263-v0ev/reviewer.txt` identify `docs/index.html` as the sole modified component.
  - `handoff/20261009T150513-263-v0ev/implementer-status.txt` certifies `docs/index.html CHANGED ticket-002` while all other components remain `UNCHANGED`.
- **Predecessor Decision Tickets:**
  - [Ticket 001: Local Server Startup & Port Binding Configuration](./ticket-001.md)
  - [Ticket 002: Presentation Shell Decoupling & Remote Endpoint Severing](./ticket-002.md)
  - [Ticket 005: Local Camera Uplink & Missing Key Graceful Degradation](./ticket-005.md)
  - [Ticket 006: Local Runtime Verification Protocol & Subsystem Smoke Test](./ticket-006.md)
- **Current Baseline (`docs/index.html`):**
  - Line 11: `<meta name="description" content="DITHER-OS lounge bartender simulator — local standalone runtime" />`
  - Lines 76-79: `<p class="hint">Loading game…<br />If this stays blank, ensure the local game server is running on localhost (default: http://localhost:3000).</p>`
  - Lines 84-91: `<iframe id="game" title="DITHER-OS Bartending" allow="fullscreen; autoplay; clipboard-write; camera; microphone" allowfullscreen loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe>`
  - Lines 94-106: Dynamic IIFE script parsing `window.location.search` for `?target=`, falling back to `window.location.origin` if `hostname === 'localhost' || hostname === '127.0.0.1'`, and otherwise defaulting to `'http://localhost:3000'`.

## Architectural Decisions to Lock

### 1. Ground-Truth Codebase Interface & Schema Definition (Zero Mocks)
The integration test interface for `docs/index.html` is strictly grounded in the browser DOM and Window Location APIs:
- **Input Interfaces:**
  - `window.location.search`: `string` representing query string parameters parsed via `URLSearchParams`.
  - `window.location.hostname`: `string` representing current host (`'localhost'`, `'127.0.0.1'`, or arbitrary domain).
  - `window.location.origin`: `string` representing protocol, host, and port (e.g. `'http://localhost:3000'`, `'http://localhost:8080'`, `'http://127.0.0.1:4000'`).
- **Output Interfaces:**
  - `HTMLIFrameElement#game`:
    - `.src`: `string` representing the final navigated target URL.
    - `.getAttribute("allow")`: `string` containing required permission delegation tokens: `"fullscreen; autoplay; clipboard-write; camera; microphone"`.
    - `.hasAttribute("allowfullscreen")`: `boolean` (`true`).
  - `HTMLMetaElement`:
    - `name="description"`, `.content`: `"DITHER-OS lounge bartender simulator — local standalone runtime"`.
  - `HTMLParagraphElement.hint`:
    - `.textContent`: contains guidance `"ensure the local game server is running on localhost (default: http://localhost:3000)"`.
  - **Network Boundary:**
    - Zero outgoing HTTP/HTTPS requests matching `https://choppedcheese-dither-os-bartending.hf.space` or `*.hf.space`.

### 2. Admissible Observed Payloads (Payload Law `INV-PAYLOAD-01`)
In accordance with `INV-PAYLOAD-01`, no synthetic JSON fixtures, dummy objects, or invented URL formats are permitted. All payloads are observed real-world browser execution contexts:

| Payload ID | Observed Input Environment | Target Precedence Branch | Expected Admissible Output (`iframe#game.src`) |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-01` | `location.search = ""` <br> `location.hostname = ""` <br> `location.origin = "null"` | Default fallback | `"http://localhost:3000"` |
| `PAYLOAD-02` | `location.search = ""` <br> `location.hostname = "localhost"` <br> `location.origin = "http://localhost:3000"` | Localhost origin match | `"http://localhost:3000"` |
| `PAYLOAD-03` | `location.search = ""` <br> `location.hostname = "localhost"` <br> `location.origin = "http://localhost:8080"` | Localhost custom port match | `"http://localhost:8080"` |
| `PAYLOAD-04` | `location.search = ""` <br> `location.hostname = "127.0.0.1"` <br> `location.origin = "http://127.0.0.1:4000"` | Loopback IPv4 match | `"http://127.0.0.1:4000"` |
| `PAYLOAD-05` | `location.search = "?target=http://localhost:3005"` <br> `location.hostname = "localhost"` | Explicit query override | `"http://localhost:3005"` |
| `PAYLOAD-06` | `location.search = "?target=http://192.168.1.100:3000"` <br> `location.hostname = "example.com"` | Explicit query override (LAN/custom) | `"http://192.168.1.100:3000"` |

### 3. Specification Oracles (`INV-ASSERTION-01`)
Integration assertions must test strictly against `{correct required outputs}` mandated by `functional_specification_99.md` and locked ticket resolutions:
- **Oracle 1 (Remote Severance):** Network traffic monitoring during shell execution asserts that total requests dispatched to `choppedcheese-dither-os-bartending.hf.space` or any `*.hf.space` domain is exactly `0` (`AC2`).
- **Oracle 2 (Target Resolution Precision):** For each observed payload `PAYLOAD-01` through `PAYLOAD-06`, `document.getElementById('game').src` must strictly equal the designated `targetUrl` without string transformation, trailing slash corruption, or fallback failure.
- **Oracle 3 (Permission Policy Integrity):** `document.getElementById('game').getAttribute('allow')` must contain the exact substring `"camera; microphone"` and `"fullscreen; autoplay; clipboard-write"`, ensuring unblocked local camera access for Comm-Link character registration (`AC7`).
- **Oracle 4 (Branding & Guidance Veracity):**
  - `document.querySelector('meta[name="description"]').getAttribute('content') === "DITHER-OS lounge bartender simulator — local standalone runtime"`
  - `document.querySelector('.hint').textContent.includes("ensure the local game server is running on localhost (default: http://localhost:3000)")`

### 4. Explicit Error States (`{errors}` per `LANGUAGE.md`)
The integration test suite must immediately surface fatal errors if any of the following states occur:
- Any network request dispatched to `*.hf.space` or `https://choppedcheese-dither-os-bartending.hf.space`.
- `iframe#game.src` evaluated as undefined, null, or remaining hardcoded to the remote Space.
- Absence of `camera` or `microphone` in `iframe#game.allow`.
- Failure to default to `http://localhost:3000` when no parameters or origin match.
- Failure of explicit `?target=` parameter to override default origin.
- Failure of `localhost` or `127.0.0.1` origin detection when `explicitTarget` is absent.

## Scope & Invariant Guardrails
- **In Scope:** Test decision mapping, schema grounding, payload admissibility register, specification oracles, and explicit error definitions for `docs/index.html`.
- **Out of Scope:** Authoring executable integration test code, creating dummy mock libraries, writing mock servers, or modifying application source files (`INV-BOUNDARY-01`).

---

## Resolution

### 1. Locked Integration Test Decision Contract
1. Integration testing of `docs/index.html` evaluates the component within a standard DOM environment (such as JSDOM or Playwright browser context) against authentic `Window`, `Location`, `URLSearchParams`, and `HTMLIFrameElement` interfaces without synthetic wrappers.
2. The 6 discrete execution paths mapped in `PAYLOAD-01` through `PAYLOAD-06` form the exhaustive input domain for target resolution verification.
3. Network isolation verification asserts zero HTTP calls dispatched to remote Hugging Face infrastructure.
4. Permission delegation verification guarantees that camera and microphone features are explicitly granted to the embedded game iframe.

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-test-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks Authoritative Integration Test Matrix (`test_matrix_99.md`) and downstream test authoring upon operator authorization.

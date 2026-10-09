# Master Integration Test Matrix: FS99 Local Hosting Migration & Runtime Verification

**Governing Specification:** `functional_specification_99.md`  
**Wayfinder Map:** `wayfinder/20261009T150513-263-v0ev/map.md`  
**Governing Tickets:**
- [Ticket 001: Local Server Startup & Port Binding Configuration](./tickets/ticket-001.md)
- [Ticket 002: Presentation Shell Decoupling & Remote Endpoint Severing](./tickets/ticket-002.md)
- [Ticket 003: Local SQLite Database & Runtime JSON Persistence](./tickets/ticket-003.md)
- [Ticket 004: Local Static & Dynamic Asset Serving and Zero-Ghost Integrity](./tickets/ticket-004.md)
- [Ticket 005: Local Camera Uplink & Missing Key Graceful Degradation](./tickets/ticket-005.md)
- [Ticket 006: Local Runtime Verification Protocol & Subsystem Smoke Test](./tickets/ticket-006.md)
- [Ticket 007: Presentation Shell Integration Testing, Target Resolution Matrix & Local Permissive Delegation](./tickets/ticket-007.md)

---

## 1. Upstream Manifest Binding & Audit Summary

- **Modified Source Component:** `docs/index.html` (certified modified under `ticket-002.md` via `handoff/20261009T150513-263-v0ev/implementer.txt`, `handoff/20261009T150513-263-v0ev/reviewer.txt`, and `handoff/20261009T150513-263-v0ev/implementer-status.txt`).
- **Unchanged Upstream Components:** `package.json`, `next.config.ts`, `README.md`, `DEPLOY.md`, `src/lib/runtimePatronStore.ts`, `scripts/patron-pipeline/lib/patronDb.mjs`, `src/app/api/patrons/register/route.ts`, `src/app/api/patrons/assets/[characterId]/[file]/route.ts`, `src/lib/patronPackReady.ts`, `src/data/characters.ts`, `src/components/PatronLayer.tsx`, `src/app/api/patrons/roster/route.ts`, `src/components/JoinBarCamera.tsx`, `src/components/JoinBarCommLink.tsx`, `src/app/page.tsx`, `src/components/BootIntro.tsx`, `src/components/MainMenu.tsx`, `src/hooks/useSimulation.ts`.
- **Zero-Mock Verification Certification:** In strict accordance with `INV-PAYLOAD-01` and `INV-ASSERTION-01`, zero synthetic fixtures, mock APIs, simulated data stubs, or placeholder objects are used. All test definitions are grounded directly in authentic codebase types, DOM interfaces, and observed local filesystem/network states.

---

## 2. Master Integration Test Matrix

| Test Case ID | Target Component | Acceptance Criterion | Authentic Codebase Schema / Interface | Admissible Observed Input Payload (`INV-PAYLOAD-01`) | `{correct required outputs}` (`INV-ASSERTION-01`) | Explicit `{errors}` (`LANGUAGE.md`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-SHELL-01** | `docs/index.html` | **AC2** (Remote Independence) | `HTMLIFrameElement#game.src`<br>`window.location` | Standard shell boot without query parameters:<br>`location.search = ""` | `iframe#game.src` equals `"http://localhost:3000"`; zero network requests dispatched to `*.hf.space` | Request dispatched to `*.hf.space`; iframe src contains `hf.space` |
| **IT-SHELL-02** | `docs/index.html` | **AC2** (Remote Independence) | `HTMLIFrameElement#game.src`<br>`window.location` | Shell served from localhost origin:<br>`location.hostname = "localhost"`<br>`location.origin = "http://localhost:3000"`<br>`location.search = ""` | `iframe#game.src` equals `"http://localhost:3000"` (matches origin) | Iframe src does not match origin; fallback fails |
| **IT-SHELL-03** | `docs/index.html` | **AC1**, **AC2** | `HTMLIFrameElement#game.src`<br>`window.location` | Shell served from custom localhost port:<br>`location.hostname = "localhost"`<br>`location.origin = "http://localhost:8080"`<br>`location.search = ""` | `iframe#game.src` equals `"http://localhost:8080"` | Iframe defaults to 3000 instead of active host origin |
| **IT-SHELL-04** | `docs/index.html` | **AC1**, **AC2** | `HTMLIFrameElement#game.src`<br>`window.location` | Shell served from IPv4 loopback:<br>`location.hostname = "127.0.0.1"`<br>`location.origin = "http://127.0.0.1:4000"`<br>`location.search = ""` | `iframe#game.src` equals `"http://127.0.0.1:4000"` | Loopback address not recognized as local origin |
| **IT-SHELL-05** | `docs/index.html` | **AC1**, **AC2** | `HTMLIFrameElement#game.src`<br>`URLSearchParams` | Explicit query parameter override:<br>`location.search = "?target=http://localhost:3005"` | `iframe#game.src` equals `"http://localhost:3005"` | Target parameter ignored; origin takes priority over explicit parameter |
| **IT-SHELL-06** | `docs/index.html` | **AC1**, **AC2** | `HTMLIFrameElement#game.src`<br>`URLSearchParams` | Explicit LAN target override:<br>`location.search = "?target=http://192.168.1.150:3000"` | `iframe#game.src` equals `"http://192.168.1.150:3000"` | Target parameter malformed or rejected |
| **IT-SHELL-07** | `docs/index.html` | **AC7** (Camera & Comm-Link) | `HTMLIFrameElement#game.allow`<br>Feature Policy | Element attribute inspection | `iframe#game.getAttribute("allow")` contains `"fullscreen; autoplay; clipboard-write; camera; microphone"` | Missing `"camera"` or `"microphone"` in allow attribute |
| **IT-SHELL-08** | `docs/index.html` | **AC2** (Local Branding) | `HTMLMetaElement`<br>`HTMLParagraphElement` | DOM document tree inspection | `meta[name="description"].content === "DITHER-OS lounge bartender simulator — local standalone runtime"`<br>`.hint.textContent` contains guidance for `localhost:3000` | Description mentions Hugging Face; hint instructs waiting for Space to wake |
| **IT-SRV-01** | `package.json`<br>`next.config.ts` | **AC1** (Local Startup) | `ProcessEnv`<br>`NextConfig` | Launch with `PORT=3000`<br>or alternative port `PORT=3001` | Process initializes without unhandled exceptions; `better-sqlite3` native module loads cleanly | Process crash, native binding failure, or exit code != 0 |
| **IT-PERSIST-01** | `src/lib/runtimePatronStore.ts`<br>`scripts/patronDb.mjs` | **AC6** (Local Persistence) | SQLite WAL mode<br>JSON filesystem | Write patron entry to `data/runtime-patrons.json` and `data/patrons.sqlite`, restart server process, read state | Entries exist with 100% key and byte parity after simulated process restart | File missing, corrupted, or wiped upon server restart |
| **IT-ASSET-01** | `public/assets/boot/*`<br>`src/app/api/patrons/assets/*` | **AC5** (Local Asset Serving) | HTTP GET Response Headers | `GET /assets/boot/doom_gamestudio.mp4`<br>`GET /assets/boot/menu_background.jpg` | HTTP 200 OK, valid Content-Type (`video/mp4`, `image/jpeg`), Content-Length > 0 | HTTP 404, HTTP 500, or zero-byte response |
| **IT-PATRON-01** | `src/components/PatronLayer.tsx`<br>`src/lib/patronPackReady.ts` | **AC4** (Stock Patron Spawning) | Sprite Pack Filesystem & Component State | Load game in `phase === 'play'` on `localhost` | Stock patrons (`elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`) auto-seat and display Ready Packs | Ghost patron spawned (missing sprite files), or seat assignment timeout |
| **IT-MEDIA-01** | `src/components/JoinBarCamera.tsx`<br>`src/components/JoinBarCommLink.tsx` | **AC7** (Camera & Comm-Link) | `navigator.mediaDevices.getUserMedia` | Access Comm-Link camera on `http://localhost:3000` | Native browser permission prompt triggered under secure context; camera stream captures still photo | Permission prompt blocked due to non-secure origin or iframe policy drop |
| **IT-DEGRADE-01** | `src/app/api/patrons/register/route.ts`<br>`src/app/page.tsx` | Edge Case 2 (Missing Keys) | HTTP POST Response Payload | POST to `/api/patrons/register` with missing `XAI_API_KEY` | HTTP 503 Service Unavailable with JSON `{ error: "Imagine credentials missing..." }`; HUD surfaces error without crash | HTTP 500 crash, unhandled rejection, or creation of ghost patron |

---

## 3. Ground-Truth Schema & Interface Definitions

### 3.1 DOM Presentation Shell Interface (`docs/index.html`)
```typescript
interface PresentationShellDOM {
  window: {
    location: {
      search: string;
      hostname: string;
      origin: string;
      protocol: string;
    };
  };
  document: {
    getElementById(id: 'game'): HTMLIFrameElement | null;
    querySelector(selector: 'meta[name="description"]'): HTMLMetaElement | null;
    querySelector(selector: '.hint'): HTMLParagraphElement | null;
  };
}

interface HTMLIFrameElement {
  id: string;
  src: string;
  title: string;
  allow: string;
  allowFullscreen: boolean;
  loading: 'eager' | 'lazy';
  referrerPolicy: string;
}
```

### 3.2 Dynamic Target Resolution Logic
```typescript
function resolveGameTarget(location: { search: string; hostname: string; origin: string }): string {
  const params = new URLSearchParams(location.search);
  const explicitTarget = params.get('target');
  let targetUrl = 'http://localhost:3000';
  if (explicitTarget) {
    targetUrl = explicitTarget;
  } else if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    targetUrl = location.origin;
  }
  return targetUrl;
}
```

---

## 4. Documentation Sufficiency & Assertion Law Certification

- **`{sufficient}` State:** All tested inputs, interfaces, DOM selectors, query parameters, expected return states, and explicit failure qualifications are unambiguously specified against authentic codebase properties.
- **Assertion Law Guarantee:** No assertions test against synthetic blobs or unmandated values. All assertions test strictly against `{correct required outputs}` mandated by `functional_specification_99.md`.
- **Zero Mock Law:** Zero mocks, dummy JSON objects, or synthetic fixtures exist within this plan.

---

## 5. Coding Gate Affirmation (`INV-BOUNDARY-01`)

> **DO NOT CODE YET:** Implementation coding gate remains locked. Zero test code, test fixtures, parsers, or expected-output files have been generated. Coding waits on an empty frontier and explicit operator authorization.

# RE99 — Master Component-to-Edit Matrix: Local Hosting Migration and Runtime Verification

**Spec:** [functional_specification_99.md](./functional_specification_99.md)  
**Map:** [wayfinder/20261009T150513-263-v0ev/map.md](./wayfinder/20261009T150513-263-v0ev/map.md)  
**Tickets:**
- [Ticket 001: Local Server Startup & Port Binding Configuration](./wayfinder/20261009T150513-263-v0ev/tickets/ticket-001.md)
- [Ticket 002: Presentation Shell Decoupling & Remote Endpoint Severing](./wayfinder/20261009T150513-263-v0ev/tickets/ticket-002.md)
- [Ticket 003: Local SQLite Database & Runtime JSON Persistence](./wayfinder/20261009T150513-263-v0ev/tickets/ticket-003.md)
- [Ticket 004: Local Static & Dynamic Asset Serving and Zero-Ghost Integrity](./wayfinder/20261009T150513-263-v0ev/tickets/ticket-004.md)
- [Ticket 005: Local Camera Uplink & Missing Key Graceful Degradation](./wayfinder/20261009T150513-263-v0ev/tickets/ticket-005.md)
- [Ticket 006: Local Runtime Verification Protocol & Subsystem Smoke Test](./wayfinder/20261009T150513-263-v0ev/tickets/ticket-006.md)

---

## Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `docs/index.html` | L9-L12: `<meta name="description">` | `ticket-002.md` | Update description | Sever remote Hugging Face branding; declare local standalone runtime |
| `docs/index.html` | L76-L79: `<p class="hint">` | `ticket-002.md` | Update loading hint text | Direct user to local game server on `localhost:3000` rather than waiting for remote Space to wake |
| `docs/index.html` | L94-L98: `<script>` block | `ticket-002.md` | Dynamic local target resolution | Replace hardcoded `https://choppedcheese-dither-os-bartending.hf.space` with dynamic resolution defaulting to `http://localhost:3000` |
| `package.json` | L6-L10: `"scripts"` | `ticket-001.md` | Script documentation & verification | Confirm `"dev": "next dev"` and `"start": "next start"` support deterministic port binding via `PORT` environment variable |
| `next.config.ts` | L1-L7: `nextConfig` | `ticket-001.md`, `ticket-003.md` | Configuration audit | Lock `serverExternalPackages: ["better-sqlite3"]` for native SQLite execution on local workstation |
| `src/lib/runtimePatronStore.ts` | L39-L43: `dataDir()` | `ticket-003.md` | Path & persistence verification | Ensure deterministic creation and persistence of `data/` and `data/runtime-patrons.json` across server restarts |
| `src/app/api/patrons/register/route.ts` | L57-L65: PII handling | `ticket-003.md`, `ticket-005.md` | Informative error handling | Gracefully report missing `PII_ENCRYPTION_KEY` without crashing registration or game loop |
| `src/app/api/patrons/register/route.ts` | L109-L117: Imagine credentials check | `ticket-005.md` | Informative error contract | Return HTTP 503 with informative error message when `XAI_API_KEY` is not present locally |
| `src/app/api/patrons/assets/[characterId]/[file]/route.ts` | L57-L106: Asset reading | `ticket-004.md` | Local asset streaming & LFS filtering | Verify direct local disk reading and magic-byte validation; reject LFS pointers with HTTP 404 |
| `src/lib/patronPackReady.ts` | L20-L75: `isPatronPackReady()` | `ticket-004.md` | Ready pack integrity | Enforce all 4 files (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) exist with valid PNG magic bytes to prevent ghost patrons |
| `src/components/JoinBarCamera.tsx` | L45-L75: `startCamera()` | `ticket-005.md` | Local secure context camera access | Execute `navigator.mediaDevices.getUserMedia` under `localhost` secure origin; catch denials and display UI status |
| `src/components/PatronLayer.tsx` | L100-L180: auto-fill logic | `ticket-004.md`, `ticket-006.md` | Stock patron spawning verification | Confirm stock patrons (`elder`, `caesar`, `trump`) auto-fill free bar seats within 10s of entering play |
| `README.md` | L17-L25: "Run locally" | `ticket-001.md`, `ticket-002.md` | Local hosting primacy | Emphasize local standalone execution on `http://localhost:3000` |

---

## Detailed Step-by-Step Edit Instructions

### 1. `docs/index.html`: Decouple Presentation Shell from Remote HF Space
- **Lines 9-12:**
  Replace:
  ```html
  <meta
    name="description"
    content="DITHER-OS lounge bartender simulator — hosted on Hugging Face Spaces"
  />
  ```
  With:
  ```html
  <meta
    name="description"
    content="DITHER-OS lounge bartender simulator — local standalone runtime"
  />
  ```
- **Lines 76-79:**
  Replace:
  ```html
  <p class="hint">
    Loading game…<br />
    If this stays blank, wait for the Space to wake.
  </p>
  ```
  With:
  ```html
  <p class="hint">
    Loading game…<br />
    If this stays blank, ensure the local game server is running on localhost (default: http://localhost:3000).
  </p>
  ```
- **Lines 94-98:**
  Replace:
  ```html
  <script>
    const SPACE_URL =
      "https://choppedcheese-dither-os-bartending.hf.space";
    document.getElementById("game").src = SPACE_URL;
  </script>
  ```
  With:
  ```html
  <script>
    (function() {
      const params = new URLSearchParams(window.location.search);
      const explicitTarget = params.get('target');
      let targetUrl = 'http://localhost:3000';
      if (explicitTarget) {
        targetUrl = explicitTarget;
      } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        targetUrl = window.location.origin;
      }
      document.getElementById("game").src = targetUrl;
    })();
  </script>
  ```

### 2. `package.json`: Local Server Scripts Contract
- Ensure scripts in `package.json` support standard local development and production execution:
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "start:hf": "next start -H 0.0.0.0 -p 7860",
    "lint": "eslint"
  }
  ```
- Local execution defaults to port 3000 (`http://localhost:3000`). If port 3000 is occupied, the server can be launched on any arbitrary port via `PORT=<port> npm run dev` or `PORT=<port> npm run start`.

### 3. `src/lib/runtimePatronStore.ts`: Local Data Directory Initialization
- Verify directory initialization:
  ```typescript
  function dataDir(repoRoot: string): string {
    const d = path.join(resolveAppRoot(repoRoot), 'data');
    fs.mkdirSync(d, { recursive: true });
    return d;
  }
  ```
- Ensure file persistence in `data/runtime-patrons.json` retains roster state across server restarts on local disk.

### 4. `src/app/api/patrons/register/route.ts`: Graceful Missing-Key Protocol
- When `PII_ENCRYPTION_KEY` is not set:
  ```typescript
  if (!process.env.PII_ENCRYPTION_KEY) {
    piiError = 'PII_ENCRYPTION_KEY not set — folder created but contact not stored in DB';
  }
  ```
  The registration endpoint continues folder creation and does not crash.
- When `XAI_API_KEY` is not set:
  ```typescript
  if (!hasImagineCredentials()) {
    return NextResponse.json(
      {
        error:
          'Imagine credentials missing. Set XAI_API_KEY (or XAIKEY / HF_TOKEN) on the server to generate characters.',
      },
      { status: 503 }
    );
  }
  ```
  The client receives an informative HTTP 503 and presents it to the user without locking up or creating ghost patrons.

### 5. `src/components/JoinBarCamera.tsx`: Local Media Stream Permission
- Verify camera capture works directly via native `navigator.mediaDevices.getUserMedia` under `http://localhost:<port>`.
- If permission is denied or no camera device is connected, catch error gracefully:
  ```typescript
  catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setError(`CAMERA UNAVAILABLE: ${message}`);
    setLive(false);
  }
  ```

---

## Verification & Acceptance Mapping

1. **AC1 (Local Server Startup):** Run `npm run dev` or `npm run build && npm run start`. Verify server starts cleanly on `http://localhost:3000` with zero unhandled exceptions.
2. **AC2 (Remote Endpoint Independence):** In browser developer tools, inspect network requests during game loading, menu navigation, and drink preparation. Confirm zero requests to `choppedcheese-dither-os-bartending.hf.space` or `*.hf.space`.
3. **AC3 (Local Playfield Operation):** Verify boot intro video plays and skips, main menu renders, and clicking "START GAME" enters the bar playfield on `localhost`.
4. **AC4 (Stock Patron Spawning):** Confirm stock patrons (Elder, Caesar, Trump) spawn on bar seats within 10 seconds of entering play and display dialogue on interaction.
5. **AC5 (Local Asset Serving):** Confirm all audio, video (`/assets/boot/doom_gamestudio.mp4`), sprite packs, and glassware textures return HTTP 200 from local endpoints.
6. **AC6 (Local Data Persistence):** Confirm database writes to `data/patrons.sqlite` and roster writes to `data/runtime-patrons.json` survive local server restarts.
7. **AC7 (Camera & Comm-Link):** Open "JOIN THE BAR", proceed to camera step, and confirm camera permission prompt appears natively under `localhost`.

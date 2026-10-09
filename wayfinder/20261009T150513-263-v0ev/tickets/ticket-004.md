---
ticket_id: "004"
title: "Local Static & Dynamic Asset Serving and Zero-Ghost Integrity"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-003.md"]
governing_specification: "functional_specification_99.md"
---

# Ticket 004: Local Static & Dynamic Asset Serving and Zero-Ghost Integrity

## Question
How must static and dynamic asset delivery endpoints (`/assets/*` and `/api/patrons/assets/[characterId]/[file]`) be configured and verified to ensure that all game media (boot intro video, synthwave backgrounds, glassware, stock sprites) return HTTP 200 locally, and how does the local runtime enforce ready-pack verification to prevent ghost patrons from entering the bar stage?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_99.md` Glossary ("Ghost Patron", "Ready Pack"), Desired Functionality §2 ("Asset Delivery"), AC4 ("Stock Patron Spawning"), and AC5 ("Local Asset Serving").
- **Current Baseline:**
  - Stock assets live in `public/assets/` on local disk:
    - Intro video: `public/assets/boot/doom_gamestudio.mp4`
    - Background: `public/assets/boot/menu_background.jpg`
    - Stock patrons: `public/assets/patrons/caesar_9aea2cd1a4bf32d6/`, `public/assets/patrons/trump_ca36306f5c662816/`, and `public/assets/patrons/patron_elder_*`
  - Dynamic assets (join patrons) stream from local disk via `src/app/api/patrons/assets/[characterId]/[file]/route.ts`.
  - Pack readiness is checked by `src/lib/patronPackReady.ts`:
    Requires all 4 files: `sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`, each with valid PNG magic headers (`0x89, 0x50, 0x4E, 0x47`), length >= 8 bytes, and non-LFS pointer content.
- **Affected Files:**
  - `src/app/api/patrons/assets/[characterId]/[file]/route.ts` (lines 14-26, 40-106)
  - `src/lib/patronPackReady.ts` (lines 20-75)
  - `src/data/characters.ts` (lines 35-130)
  - `src/components/PatronLayer.tsx` (lines 100-180, 240-310)
  - `src/app/api/patrons/roster/route.ts` (lines 30-74)

## Architectural Decisions to Lock
1. **Local Endpoint Asset Serving:**
   - Static built-in assets are served by Next.js static handling under `/assets/...` mapped to `public/assets/...` on disk.
   - Dynamic patron art is served by the API route `GET /api/patrons/assets/[characterId]/[file]` directly reading `public/assets/patrons/[characterId]/[file]` on the local host.
   - The route must inspect magic bytes:
     - PNG: `0x89, 0x50, 0x4E, 0x47` -> `Content-Type: image/png`
     - JPEG: `0xFF, 0xD8` -> `Content-Type: image/jpeg`
     - WebP: `RIFF....WEBP` -> `Content-Type: image/webp`
   - Any LFS pointer text or empty file (< 8 bytes) must return HTTP 404 rather than corrupt binary streaming.
2. **Zero-Ghost Ready-Pack Verification:**
   - A patron identity is a "Ghost Patron" if it is registered in roster or spawn pools but lacks a complete Ready Pack on local storage.
   - A Ready Pack requires all four files:
     1. `sit.png`
     2. `talk.png`
     3. `walk_01.png`
     4. `walk_02.png`
   - `isPatronPackReady(root, characterId)` must strictly verify that all four files exist, are genuine image binaries, and non-empty.
   - `/api/patrons/roster` filters `readRuntimePatrons(root)` with `isPatronPackReady(root, id)` so that no ungenerated or incomplete character is ever sent to the client.
   - `PatronLayer.tsx` on the client performs fallback to built-in stock patrons (`elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`) whenever runtime joiners are absent or incomplete.
3. **Stock Patron Verification:**
   - Stock patrons (Elder, Caesar, Trump) have their Ready Packs verified present in `public/assets/patrons/`.
   - In `PatronLayer.tsx`, auto-fill timers seat stock characters immediately in `phase === 'play'`, ensuring AC4 is met without requiring any dynamic character creation.

## Scope & Invariant Guardrails
- **In Scope:** Local asset streaming, ready-pack validation, HTTP status verification, stock patron spawn validation.
- **Out of Scope:** Generation of new pixel art sprite assets or modifying sprite visual styles.

---

## Resolution

### 1. Ready-Pack Invariant Contract
The definition of `isPatronPackReady` in `src/lib/patronPackReady.ts` remains the strict gatekeeper:
```typescript
const REQUIRED_FILES = ['sit.png', 'talk.png', 'walk_01.png', 'walk_02.png'] as const;

export function isPatronPackReady(appRoot: string, characterId: string): boolean {
  const dir = path.join(resolveAppRoot(appRoot), 'public', 'assets', 'patrons', characterId);
  if (!fs.existsSync(dir)) return false;
  for (const f of REQUIRED_FILES) {
    const full = path.join(dir, f);
    if (!fs.existsSync(full)) return false;
    const stat = fs.statSync(full);
    if (!stat.isFile() || stat.size < 8) return false;
    const buf = Buffer.alloc(80);
    const fd = fs.openSync(full, 'r');
    fs.readSync(fd, buf, 0, 80, 0);
    fs.closeSync(fd);
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return false;
    const asText = buf.toString('utf8');
    if (asText.includes('git-lfs') || asText.startsWith('version https://git-lfs')) return false;
  }
  return true;
}
```

### 2. Stock Patron Spawning Guarantee
In `src/components/PatronLayer.tsx`:
- `listAllCharactersClient()` loads stock characters from `CHARACTERS` in `src/data/characters.ts`.
- `CHARACTERS['caesar_9aea2cd1a4bf32d6']` and `CHARACTERS['trump_ca36306f5c662816']` have complete ready-pack art under `public/assets/patrons/`.
- `elder` has flat assets under `public/assets/patrons/patron_elder_*`.
- Auto-fill logic checks available bar seats (`POV_BAR_SEAT_HOTSPOTS`) and assigns stock characters within 10 seconds of entering `phase === 'play'`.
- All sprite images return HTTP 200 locally.

### 3. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks [Local Runtime Verification Protocol & Subsystem Smoke Test (ticket-006.md)](./ticket-006.md).

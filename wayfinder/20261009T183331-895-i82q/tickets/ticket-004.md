---
ticket_id: 004
title: "Strict Ready-Pack Verification, Ghost Prevention & Instant Live Barroom Discovery"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-002.md", "ticket-003.md"]
governing_specification: "functional_specification_105.md"
---

# Ticket 004: Strict Ready-Pack Verification, Ghost Prevention & Instant Live Barroom Discovery

## Question
How does the runtime roster manager enforce strict, zero-ghost ready-pack gating upon pipeline completion, and how does the live barroom simulation immediately discover and spawn the newly registered patron without server reboots or manual reloads?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_105.md`
  - §Desired Functionality (4): "A newly generated patron must be admitted into the spawnable runtime roster if and only if all four assets of the ready pack (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) are verified to exist as non-empty, valid image files on host disk. If any stage of generation fails or produces incomplete files, the system must never add the character to the active roster, completely preventing ghost (invisible) patrons."
  - §Desired Functionality (5): "As soon as a join-generated patron's ready pack is verified and added to the runtime roster: The live barroom simulation must discover the new character on its next roster refresh. The character must immediately become eligible for auto-fill selection and bar stool seating during gameplay alongside built-in stock patrons. The character's walking and seated animations must render accurately using the newly generated sprites without requiring a browser page reload, server reboot, or application rebuild."
  - §Acceptance Criteria (AC3): "A patron is only added to the active roster once all four ready pack assets exist and are verified; failed jobs produce zero ghost entries."
  - §Acceptance Criteria (AC4): "Successfully generated patrons appear in the live barroom simulation, walk into the bar, and occupy bar seats without requiring a server reboot, redeploy, or page reload."
  - §Acceptance Criteria (AC6): "The automated registration and runtime roster integration does not disrupt or degrade the spawning, walking, or seating behavior of built-in stock patrons (Elder, Caesar, Trump)."

## Codebase Audit & Technical Discrepancy Analysis

### 1. In-Memory Roster Cache & Polling Latency in `PatronLayer.tsx`
- **Audit Findings:**
  - In `src/components/PatronLayer.tsx` (L174–L249):
    `loadRoster()` fetches `/api/patrons/roster`, validates candidate sit assets via async `HEAD` requests, and updates `clientRuntimeCache` via `setClientRuntimePatronCache(ready)`.
  - The polling interval is set to 20 seconds (`window.setInterval(loadRoster, 20000)`).
  - When in-game registration finishes via `src/app/page.tsx`, the client displays a success message, but does not notify `PatronLayer`.
  - Consequently, the player must wait up to 20 seconds for `PatronLayer`'s interval to trigger before the newly generated patron is even considered by `trySpawn()`.
  - If all 4 bar stools are already claimed or auto-fill is quiesced, the new character will never spawn unless an explicit spawn check or seat vacancy is created.

### 2. Ready-Pack Gating in `src/app/api/patrons/register/route.ts`
- **Audit Findings:**
  - In `src/app/api/patrons/register/route.ts` (L181–L221):
    When the child process exits with `code === 0`, it calls:
    `const packReady = isPatronPackReady(root, identity.characterId);`
  - In `src/lib/patronPackReady.ts` (L97–L114):
    `isPatronPackReady` checks that all 4 files (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) exist under `public/assets/patrons/${characterId}/`, are not LFS pointers, are valid PNGs (magic bytes `0x89, 0x50, 0x4E, 0x47`), and have size $\ge 256$ bytes.
  - If `code === 0 && packReady`, it invokes:
    ```typescript
    upsertRuntimePatron(root, {
      id: identity.characterId,
      displayName: identity.displayName,
      personality: `${identity.characterId.replace(/^patron_/, '').replace(/[^a-z0-9]+/gi, '_')}_friendly`,
      walkFrameCount: 2,
      walkFrameMs: 120,
      createdAt: new Date().toISOString(),
    });
    ```
  - In `src/lib/runtimePatronStore.ts` (L101–L116):
    `upsertRuntimePatron` also checks `if (!isPatronPackReady(root, record.id)) throw new Error(...)`.
    It filters out missing packs on write and on read (`readRuntimePatrons`).
  - This verification logic is architecturally sound; however, if `root` in `register/route.ts` does not match the output directory where `generate-patron-assets.mjs` installed the files (due to `REPO_ROOT` divergence addressed in `ticket-001.md`), `isPatronPackReady` falsely evaluates to `false`, causing the job to fail with `"ready pack missing"` even though assets were generated.

### 3. Character Selection & Auto-Fill Priority in `PatronLayer.tsx`
- **Audit Findings:**
  - In `src/components/PatronLayer.tsx` (L96–L103):
    ```typescript
    function pickRandomFreeCharacterId(instances: PatronInstance[]): string | null {
      const living = livingCharacterIds(instances);
      const pool = listCharacters().filter((c) => !living.has(c.id));
      if (!pool.length) return null;
      const stock = pool.filter((c) => STOCK_CHARACTER_IDS.has(c.id));
      const use = stock.length > 0 ? stock : pool;
      return use[Math.floor(Math.random() * use.length)].id;
    }
    ```
  - `STOCK_CHARACTER_IDS` contains the 3 stock characters: `'patron_elder'`, `'caesar_9aea2cd1a4bf32d6'`, and `'trump_ca36306f5c662816'`.
  - There are 4 bar stool zones: `'bar_seat_1'`, `'bar_seat_2'`, `'bar_seat_3'`, `'bar_seat_4'`.
  - When the 3 stock characters are seated, `stock.length` is 0, so `use` evaluates to `pool` (which contains the join patron).
  - Therefore, the 4th stool naturally seats the newly registered patron, fulfilling AC4 and AC6 without degrading stock patron behavior.
  - However, once `instances.length >= seats.length` (4 patrons seated), auto-fill quiesces as locked in FS104 (`ticket-004.md` of FS104).

## Architectural Decision & Solution Design

### 1. Dual Ready-Pack Integrity Gating (Zero-Ghost Guarantee)
- On the server:
  - In `src/app/api/patrons/register/route.ts`:
    - Before declaring `status: 'done'`, strictly execute `isPatronPackReady(root, identity.characterId)`.
    - If any of the four files (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) are missing, empty, or fail PNG header validation:
      - Terminate with `status: 'failed'`.
      - Record explicit diagnostic message: `"Verification failed: ready pack missing required sprite assets under public/assets/patrons/${characterId}"`.
      - Ensure the character is **never** added to `data/runtime-patrons.json`.
  - In `src/app/api/patrons/roster/route.ts`:
    - On every GET request, filter runtime patrons through `isPatronPackReady(root, r.id)`. Any patron whose physical asset files are missing on disk is immediately pruned and excluded from the returned roster, guaranteeing zero ghost patrons across host disk ephemerality.

### 2. Immediate Event-Driven Simulation Discovery
- Between `src/app/page.tsx` and `src/components/PatronLayer.tsx`:
  - Introduce an explicit window event `'patron-roster-updated'` carrying the newly registered `{ characterId, displayName }`.
  - In `src/app/page.tsx`:
    - When `pollJob()` receives `status: 'done'`, dispatch:
      `window.dispatchEvent(new CustomEvent('patron-roster-updated', { detail: { characterId: data.characterId } }));`
  - In `src/components/PatronLayer.tsx`:
    - Add an event listener for `'patron-roster-updated'`.
    - Upon receiving the event, immediately invoke `loadRoster()` and trigger `trySpawn()`.
    - This eliminates the 20-second latency, providing instant in-game arrival of the newly created patron as soon as the ready pack is verified on disk.

### 3. Dynamic Runtime Asset URL Resolution
- In `src/components/PatronLayer.tsx`:
  - When rendering patron sprites for join characters (`inst.def.id` not in built-ins), ensure `walkFrames` and `sitSrc` resolve to `/api/patrons/assets/${id}/${file}`.
  - This bypasses Next.js static asset bundling delays and serves fresh sprites directly from host disk, guaranteeing immediate visual fidelity without browser reload or application rebuild.

### 4. Stock Character Preservation Guarantee
- In `src/components/PatronLayer.tsx`:
  - Preserve `STOCK_CHARACTER_IDS` priority in `pickRandomFreeCharacterId`:
    - Stock characters (Elder, Caesar, Trump) always fill the initial stools (seats 1–3).
    - Newly registered patrons fill available capacity (seat 4) or substitute when free seats exist.
    - Animation timings (`walkFrameMs: 120`, `walkMs: 2400`), seat anchors, and SVG occluder clipping apply identically to both stock and custom patrons.

## Precise Contract & Transformation Specifications

### Contract 1: Immediate Event Dispatch in `src/app/page.tsx`
```typescript
if (data.status === 'done') {
  setJoinStatus(`READY: ${displayName} (${characterId})`);
  setJoinStatusError(false);
  setJoinBusy(false);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('patron-roster-updated', {
        detail: { characterId, displayName },
      })
    );
  }
}
```

### Contract 2: Immediate Event Subscription in `src/components/PatronLayer.tsx`
```typescript
useEffect(() => {
  const onRosterUpdate = () => {
    void loadRoster().then(() => {
      trySpawn();
    });
  };
  window.addEventListener('patron-roster-updated', onRosterUpdate);
  return () => window.removeEventListener('patron-roster-updated', onRosterUpdate);
}, [loadRoster, trySpawn]);
```

### Contract 3: Strict Ready-Pack Verification in `register/route.ts`
```typescript
child.on('close', (code) => {
  const packReady = isPatronPackReady(root, identity.characterId);
  if (code === 0 && packReady) {
    try {
      upsertRuntimePatron(root, {
        id: identity.characterId,
        displayName: identity.displayName,
        personality: `${identity.characterId.replace(/^patron_/, '').replace(/[^a-z0-9]+/gi, '_')}_friendly`,
        walkFrameCount: 2,
        walkFrameMs: 120,
        createdAt: new Date().toISOString(),
      });
      updateGenerationJob(root, jobId, {
        status: 'done',
        progressPct: 100,
        statusMessage: `Ready pack verified. Patron ${identity.displayName} registered into runtime roster.`,
        error: undefined,
      });
    } catch (e: unknown) {
      updateGenerationJob(root, jobId, {
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  } else {
    const errorMsg =
      code !== 0
        ? `Pipeline exited with non-zero code ${code}`
        : 'Pipeline exited 0 but ready pack missing (sit/talk/walk_01/walk_02 under public/assets/patrons/{id}/)';
    updateGenerationJob(root, jobId, {
      status: 'failed',
      error: errorMsg,
    });
  }
});
```

## Verification & Invariant Adherence
- **`INV-FAILFAST-01`**: Strict ready-pack verification gates admission to `runtime-patrons.json`. Any missing or corrupt asset results in an immediate fatal job failure with zero ghost entries.
- **`INV-BOUNDARY-01`**: Defines architectural and schema decisions without embedding execution holds or coding prohibitions.
- **`INV-MAP-01`**: Registered monotonically in `wayfinder/20261009T183331-895-i82q/tickets/ticket-004.md`.

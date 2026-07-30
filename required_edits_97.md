# RE97 — Bar stock (A) → Join E2E (B) → No ghosts (C)

**Spec:** [functional_specification_97.md](./functional_specification_97.md)  
**Map:** [wayfinder/map-080.md](./wayfinder/map-080.md)  
**Context:** `aaa92/`  
**DO NOT CODE until operator authorizes after documentation sufficiency.**

---

## Program order (mandatory)

1. **Phase A** — stock patrons visible in play  
2. **Phase B** — Join → ready pack → spawnable  
3. **Phase C** — ghost impossible on live roster  

Ship player-visible proof after each phase when possible. Prefer one deploy after A if A needs a fix; full A+B+C before claiming done.

---

## Phase A — Stock bar in play

### Problem class

Stock PNGs **already 200** on Space. Failure is **lifecycle/spawn**, not missing Elder art.

### Investigate first (read / measure, then edit)

| Check | Where |
|-------|--------|
| User is in `phase === 'play'` | `page.tsx` early returns for intro/menu |
| `PatronLayer` mounted | only in play tree with `seats={barSeatInputs}` |
| `seats.length` / bar_seat paths | `POV_BAR_SEAT_HOTSPOTS`, offsets |
| `listCharacters()` non-empty | built-ins via `runtimePatrons.listAllCharactersClient` |
| `trySpawn` silent returns | `editMode`, free seats, `buildEntryForSeat` null (`resolveBarSeatAnchor` / `getBBox`) |
| Clip-path hiding sprites | `barCutoffD` + `roomMinusBarClipPathCss` |
| Auto-fill timers fire | `AUTO_FILL_*` |

### Required product behavior after A edits

- Enter play → auto-fill seats stock characters without Join.  
- If spawn cannot run, **surface a recoverable signal** in dev or a single operator-visible path (prefer minimal: ensure spawn works rather than a permanent HUD).  
- Do **not** require runtime-patrons for stock.

### Likely files (A)

| File | Role |
|------|------|
| `src/components/PatronLayer.tsx` | auto-fill, trySpawn, silent bailouts |
| `src/app/page.tsx` | phase play mount, seats, editMode |
| `src/lib/patronSeats.ts` | seat anchors |
| `src/data/hotspotGeometry.ts` | path bounds |
| `src/data/characters.ts` / `runtimePatrons.ts` | listCharacters pool |
| `src/app/globals.css` | patron visibility (only if clip/CSS proven) |

### A acceptance

Player: enter play on Space → stock person(s) on bar within ~10s.

---

## Phase B — Join end-to-end

### Required flow

1. Use Photo → register + `runPipeline` + background `--run` (FS94/95).  
2. Child must load **skills** (already shipped) + mesh templates + secrets.  
3. Install writes **ready pack** (four files).  
4. Job `done` **only** with ready pack; else `failed` with readable reason (logTail / error).  
5. Runtime upsert only with ready pack.  
6. In play, joiner in pool and can sit when free.

### Likely files (B)

| File | Role |
|------|------|
| `src/app/api/patrons/register/route.ts` | spawn CLI, job close, pack gate |
| `scripts/patron-pipeline/generate-patron-assets.mjs` | `--run` |
| `scripts/patron-pipeline/lib/writeAssets.mjs` | install pack |
| `scripts/patron-pipeline/skills/**` | must remain in deploy |
| `.dockerignore` | must not strip skills/mesh |
| `src/app/page.tsx` | Join poll UX; optional post-success cue to enter play |
| `src/lib/runtimePatronStore.ts` | jobs + roster |

### B acceptance

Real selfie Join on Space → done with art → enter play → joiner can appear.

---

## Phase C — No ghosts (must work on live Space)

### Known failure of FS96

After deploy, `GET /api/patrons/roster` still listed `b_*` with sit **404**. Gate must be fixed so **production** omits that class of id.

### Required behavior

1. `isPatronPackReady(repoRoot, id)` correct for Space `process.cwd()` and real `public/` layout.  
2. `readRuntimePatrons` returns only ready ids; **prunes** disk JSON.  
3. Register never upserts without pack.  
4. Roster never returns joiner with 404 assets.  
5. **Verify with live HTTP** after deploy: roster ids’ sitSrc all 200 for joiners.

### Debug if still ghosts after code

- Log or temporarily return pack-check paths/cwd in a dev-only field (optional).  
- Confirm API process cwd = app root containing `public/assets/patrons`.  
- Confirm no second source injects join ids into roster (only runtime JSON + built-ins).

### Likely files (C)

| File | Role |
|------|------|
| `src/lib/patronPackReady.ts` | pack check (fix path/cwd if wrong) |
| `src/lib/runtimePatronStore.ts` | prune/filter |
| `src/app/api/patrons/roster/route.ts` | extras only ready |
| `src/app/api/patrons/register/route.ts` | close handler |

### C acceptance

Live roster: no joiner with 404; stock still present.

---

## Cross-cutting

| Topic | Rule |
|-------|------|
| Deploy | GH + HF after phases that need Space proof |
| Ephemeral HF | Join art can vanish on rebuild; C must not leave ghosts |
| Pixel art | Do not break `image-rendering: pixelated` on sprites for A |
| Docs | FS94–96 remain historical; FS97 is the active program |

---

## Explicit non-edits

- Skill prompt redesign  
- HF volume product unless operator asks  
- Mobile DPR canvas project  

---

## Implementation checklist

- [ ] A: stock visible in play on Space  
- [ ] B: one successful Join → ready pack → visible in play  
- [ ] C: live roster has zero 404 joiners  
- [ ] Push origin + hf  

---

## Handoff

Implement **A first**. Do not claim FS97 done until A+B+C player checks pass on Space.

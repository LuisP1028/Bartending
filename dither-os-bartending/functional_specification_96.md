# FS96 — No ghost patrons in spawn roster without ready pack

## Purpose

Ensure a join-generated character is **spawnable and visible on the bar only when the full generative pipeline pack is installed on disk**. Eliminate **ghost patrons** (roster/spawn identity without art).

This document describes desired `{functionality}` only. **No implementation instructions.**

**Maps:** [wayfinder/map-079.md](./wayfinder/map-079.md) · [mobile-render-debug/map-078.md](./mobile-render-debug/map-078.md)  
**Prior:** FS94–95 (Join selfie → full `--run` + job poll + runtime roster)  
**Context:** `aaa91/` · **Edits:** [required_edits_96.md](./required_edits_96.md)

**DO NOT CODE from this document alone.** Wait for RE96 + sufficiency + operator authorize.

---

## Glossary

`LANGUAGE.md` terms apply.

**Ghost patron:** An identity present in the runtime spawn pool (or roster API extras) for which the product **ready pack** files are missing or empty under public patron paths.

**Ready pack (join / skill-driven pack):** Exactly the files written by product CLI `--run` install (`installPackFromStagingDir`, walk count 2):

- `public/assets/patrons/{characterId}/sit.png`
- `public/assets/patrons/{characterId}/talk.png`
- `public/assets/patrons/{characterId}/walk_01.png`
- `public/assets/patrons/{characterId}/walk_02.png`

Each must exist as a non-empty file.

**Stock patrons:** Built-in Elder, Caesar, Trump from `CHARACTERS` — not gated by join runtime upsert; their assets use existing path conventions.

---

## Current failure boundary

1. Join can complete a background job that reports success and **upserts** `data/runtime-patrons.json` based on process exit code alone.  
2. Public pack files may be missing (install never completed, wrong path, or ephemeral host wiped art while JSON remained).  
3. Roster and client cache still expose that id; auto-fill may seat it → **invisible** character on desktop and mobile.  
4. Player may also see “no one at the bar” if still on **menu** after Join (patrons only mount in play)—separate from ghosts, but compounds the report.

---

## Desired `{functionality}`

### Readiness gate

1. A join-generated character is considered **ready** only when the **ready pack** (four files above) is present and non-empty.  
2. The system does **not** add a runtime roster entry for a character that fails the ready pack check.  
3. A generation job that exits without a ready pack is **not** presented as a successful ready character (player-visible failure or non-ready status; no ghost).

### Roster and spawn

4. `GET /api/patrons/roster` extras (join-generated) include only ready-pack characters (or equivalent filter).  
5. Auto-fill / `listCharacters` path used for bar spawn does **not** include non-ready joiners.  
6. Stock Elder, Caesar, Trump remain available for spawn when their existing assets are available (unchanged product).

### Player UX (join generate)

7. On true ready success: generating → ready (existing job poll UX family).  
8. On pack incomplete / pipeline fail: clear failed (or non-ready) state; no silent ghost later on the bar.  
9. Mobile and desktop share the same readiness rules (no mobile-only special case that allows ghosts).

### Host notes

10. On ephemeral hosts (e.g. free HF Space), after restart art may disappear; system must **not** keep spawning ghosts from stale JSON—filter or prune incomplete entries when reading.

---

## Explicit non-goals

- Guaranteeing joiner assets survive Space rebuild without a volume.  
- Changing 8bit skill art or walk count (still 2 walks for new packs).  
- Auto-entering play after Join.  
- Canvas DPR / shell scaling changes.

---

## `{correct required outputs}` (acceptance)

| ID | Scenario | Required result |
|----|----------|-----------------|
| A1 | `--run` / job completes with all 4 pack files | Runtime roster may include id; roster + spawn can use it |
| A2 | Job/process ends without all 4 files | No runtime upsert (or entry removed); status not “ready with art” |
| A3 | Stale JSON entry, missing files on disk | Roster extras omit id; auto-fill does not seat ghost |
| A4 | Built-ins only, no joiners | Elder/Caesar/Trump still list and can spawn in play |
| A5 | Mobile play after fix | No invisible join seats from ghosts; stock sprites still pixelated as today |
| A6 | Happy Join with real selfie + secrets + full install | Player can eventually see joiner in play when pack exists |

---

## Success definition

`{functionality}` is achieved when **no join identity occupies the bar spawn pool without the ready pack on disk**, and stock patrons remain playable. Ghost seats are eliminated by contract, not by hoping exit codes match install.

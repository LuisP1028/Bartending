# FS97 — Bar stock patrons, Join end-to-end, no ghost joiners (A → B → C)

## Purpose

Deliver three product outcomes as one ordered program so players see real people at the bar and Join creates real characters without invisible fakes.

**No implementation instructions** in this file.

**Maps:** [wayfinder/map-080.md](./wayfinder/map-080.md)  
**Prior:** FS94–96  
**Context:** `aaa92/` · **Edits:** [required_edits_97.md](./required_edits_97.md)

**DO NOT CODE from this document alone.** Wait for RE97 + sufficiency + operator authorize.

---

## Glossary

`LANGUAGE.md` applies.

| Term | Meaning |
|------|---------|
| **Play** | App phase where the bar stage + `PatronLayer` mount (not intro, not main menu alone) |
| **Stock patrons** | Elder, Caesar, Trump (`CHARACTERS`) |
| **Join** | Comm-Link + selfie → generate character pack |
| **Ready pack** | Product `--run` install output: `public/assets/patrons/{id}/sit.png`, `talk.png`, `walk_01.png`, `walk_02.png` (non-empty) |
| **Ghost** | Joiner id in spawn/roster pool without ready pack (art 404 / missing) |

---

## Goal A — Stock bar always populated in play

### Desired `{functionality}`

1. After the player **enters play** (mode selected / enter bar), within a short time (~few seconds), **stock patrons auto-fill free bar seats** (walk in, sit).  
2. No Join, no pipeline, no runtime JSON required for A.  
3. Stock art at existing public paths loads and is **visible** (not empty seats only).  
4. Behavior works on the **generation host** (HF Space) the same as local intent.  
5. Main menu alone is **not** required to show walking patrons (play is the bar).

### Acceptance A

| ID | Scenario | Required result |
|----|----------|-----------------|
| A1 | Enter play, wait ~10s | At least one stock patron walking or seated |
| A2 | Enough seats/time | Up to min(seats, stock count) stock patrons living |
| A3 | No runtime joiners | A still holds with empty runtime roster |

### Non-goals for A

- Join generation.  
- New art for stock cast.

---

## Goal B — Join end-to-end

### Desired `{functionality}`

6. Player completes Join (identity + selfie) with generate intent.  
7. System runs full generative pipeline (product `--run` equivalent).  
8. On success: **ready pack** exists on disk for the character id.  
9. Job status becomes success only when ready pack is real.  
10. Character is in the **runtime spawn pool**.  
11. In **play**, that character can be seated like stock (subject to seat exclusivity).  
12. On failure: player sees clear failure; no false “ready.”

### Acceptance B

| ID | Scenario | Required result |
|----|----------|-----------------|
| B1 | Valid Join + secrets + successful Imagine/install | Ready pack files exist; job done |
| B2 | After B1, enter play | Joiner can appear at a free seat with visible sprites |
| B3 | Imagine/install fails | Job failed; no false ready; no ghost roster |

### Non-goals for B

- Sub-minute generation guarantee.  
- Surviving HF rebuild without a volume (document ephemeral risk).

---

## Goal C — No ghost joiners

### Desired `{functionality}`

13. Spawn pool and roster **never** expose a join id without ready pack.  
14. Stale runtime JSON entries without files are omitted (and preferably removed).  
15. Live Space behavior matches this rule (prior FS96 intent failed live — must hold on production host).  
16. Stock patrons are not removed by ghost filtering.

### Acceptance C

| ID | Scenario | Required result |
|----|----------|-----------------|
| C1 | Runtime JSON has id without pack | Roster extras omit id; auto-fill does not seat them |
| C2 | After failed or incomplete generate | No ghost id in roster |
| C3 | Live GET roster after deploy | No joiner with 404 sit/walk |
| C4 | Stock still listed | Elder/Caesar/Trump remain |

---

## Program success

`{functionality}` for FS97 is achieved when **A, B, and C** all pass on the Space with **player-visible** checks—not when only a unit test of a helper passes.

**Order of implementation and verification: A → B → C** (C may share code with B’s ready gate, but A must be proven first).

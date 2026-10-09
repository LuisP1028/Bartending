# FS94 — Join selfie drives full generative patron pipeline

## Purpose

When a player completes **Join the bar!** (Comm-Link + selfie), the system must **generate a full patron character pack** from that photo (Imagine skill stages + background removal + public install) and make the character **available to spawn in the bar**, without a separate manual CLI/agent step.

This document describes desired `{functionality}` only. **No implementation instructions.**

**Maps:** [wayfinder/map-077.md](./wayfinder/map-077.md)  
**Prior:** FS89–93 (Join UI), register API prepare-only, patron pipeline README (`--run`)

**DO NOT CODE from this document alone.** Wait for RE94 + sufficiency + operator authorize.

---

## Glossary

`LANGUAGE.md` terms apply.

---

## Current baseline

1. Join collects alias + contact, captures selfie, POSTs register with photo + `runPipeline`.  
2. Register runs **`--prepare` only** when pipeline requested.  
3. Full generation exists as CLI **`--run`** (Imagine + imgly + install + register).  
4. API documents agent-driven completion after prepare.  
5. Built-in roster after prune: Elder, Caesar, Trump; pipeline can append to `characters.ts` (problematic for production build immutability).

---

## Desired `{functionality}`

### Trigger

1. Player completes Join: identity + **Use photo** with generation intent (default for Join).  
2. System accepts the selfie and identity as pipeline inputs.

### Generation

3. System runs the **full generative pipeline** equivalent to product CLI `--run`:  
   - Skill-driven Imagine stages (head-on → profile → sit → talk → walk frames)  
   - Background removal on required finals  
   - Install to public patron paths  
4. Generation is **not** prepare-only when the player requested character generation.  
5. If Imagine credentials are missing or generation fails, player sees a **clear failure** (not a silent prepare-only success).

### Availability in game

6. On success, character assets are loadable at the conventional public paths.  
7. Character appears in the **runtime list used for patron spawn** (same family as `listCharacters()`), including on **HF Docker production**, without requiring a code redeploy for each new joiner.  
8. New character can participate in auto-fill / seat lifecycle like other registered patrons (subject to existing seat exclusivity rules).

### Player UX

9. After Use photo, UI shows a **generating** / in-progress state appropriate for multi-minute work.  
10. On success: readable confirmation (e.g. alias / character id ready).  
11. On failure: readable error; player can return to menu (B) without entering a broken state.  
12. Join does not force enter-play; MODE SELECTION / shell nav (FS92–93) remain.

### Identity / security

13. Alias + email|phone continue to follow Join + secure store rules (Postgres/PII when configured).  
14. Photo is used only as generation source + stored per existing register/folder rules.

### Ops

15. Deploy environment must support required secrets for Imagine (and optional PII key).  
16. Prepare-only remains available for ops/debug if explicitly requested; **default Join path is full generate**.

---

## Explicit non-goals

- Redesigning 8bit skill art direction.  
- Guaranteeing sub-second generation.  
- Manual-only generation as the only path for joiners.  
- Changing Comm-Link zoom/D-pad (FS93) or GH iframe camera allow (FS91) except as needed for long-running UX.

---

## `{correct required outputs}` (acceptance)

| ID | Scenario | Required result |
|----|----------|-----------------|
| A1 | Join with valid identity + selfie + generate | Full pipeline runs (not prepare-only as the only step) |
| A2 | Secrets present, generation succeeds | Public sit/talk/walk assets exist for new id |
| A3 | After success | Character is in runtime spawn roster without redeploy |
| A4 | Missing Imagine key | Clear error to player; no false “ready with art” |
| A5 | Imagine/BG/install fails | Clear failure; join stack can close via B |
| A6 | Player UX | Generating state visible during work |
| A7 | HF production | Same success path works on Space with secrets set |

---

## Success definition

`{functionality}` is achieved when a player’s Join selfie results in a **generated, installed, spawnable** patron character through the product path, with clear progress and errors—without requiring a separate human agent CLI step after prepare.

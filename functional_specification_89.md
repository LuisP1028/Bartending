# FS89 — Join the bar! (Comm-Link → Camera → secure store + character pipeline)

## Purpose

Replace main-menu **Starfield Config** with **Join the bar!**, which runs an ordered join:

1. **Comm-Link** (joinbar assets): collect **alias (name)** + **email or phone**, intended for **secure Postgres / PII storage**.  
2. **Camera uplink** (cameratest assets): **selfie** for character generation.  
3. **Character creation entry** via the patron register / pipeline path using that identity + photo.

This document describes desired `{functionality}` only. **No implementation instructions.**

**Maps:** [wayfinder/map-072.md](./wayfinder/map-072.md), [mobile-render-debug/map-076.md](./mobile-render-debug/map-076.md)  
**Supersedes for this goal:** [functional_specification_88.md](./functional_specification_88.md) (camera-first draft)  
**Prior:** FS80–82 menu/shell, FS87 MODE SELECTION, register API

**DO NOT CODE from this document alone.** Wait for RE89 + sufficiency + operator authorize.

---

## Glossary

`LANGUAGE.md` terms apply.

---

## Current baseline

1. Menu second row is **Starfield Config** (no-op).  
2. Desktop `joinbar.html`: alias + email/phone UI; no backend.  
3. Desktop `cameratest.html`: live camera preview; no capture/API.  
4. App register: name + email|phone + optional photo; PII encryption path when configured.  
5. `PatronSignupForm` exists but is not the joinbar→camera ordered UX.

---

## Desired `{functionality}`

### Menu

1. Second root item labeled **Join the bar!**.  
2. Activating it starts the **Comm-Link** stage (not camera, not enter-play).  
3. MODE SELECTION, other stubs, B/START enter-play unchanged (FS87/FS80).

### Stage 1 — Comm-Link (joinbar)

4. Player sees **ESTABLISH COMM-LINK** (or equivalent) synthwave terminal matching joinbar presentation.  
5. Required fields:  
   - **Alias** (name / identity)  
   - **Email or phone** (single comm field)  
6. Promo/security notice may remain (promotions / no external routing copy).  
7. **TRANSMIT DATA** (or equivalent) validates both fields, then advances to Stage 2.  
8. Alias and contact are the identity used for **secure storage** and character creation (Postgres / existing secure PII store).  
9. Experience is **in-app / deployable** (not Desktop path at runtime).

### Stage 2 — Camera uplink (cameratest)

10. After successful transmit from Stage 1, open **Synthwave Camera Uplink**.  
11. Request front camera; show live preview when allowed.  
12. Permission denied / failure → clear error; can return to menu or back to Comm-Link.  
13. Player can **capture** a still; **retake** or **use photo**.  
14. In-app / deployable port of cameratest look.

### Completion — store + character pipeline

15. With alias, contact, and photo, complete **register / character entry** (folder + secure contact storage + photo for pipeline prepare when generation is requested).  
16. Success or failure is shown in readable form.  
17. Does **not** auto-enter the bar game or force mode change.

### Navigation / shell / mobile

18. Close/back from Stage 1 or 2 returns to **main menu** without play.  
19. Mobile: form usable with on-screen keyboard; camera plays inline; touch-friendly controls; shell glass family not permanently broken (FS81 intent).  
20. Overlay gestures must not steal scroll to browser chrome.

### Unchanged

21. Boot intro, MODE SELECTION, in-game mode strip.  
22. Server Imagine generation may remain agent/async after prepare per current pipeline contract.

---

## Explicit non-goals

- Desktop absolute paths in production.  
- Audio recording as primary artifact.  
- Guaranteeing full art pack finishes in one HTTP request if pipeline is async.  
- Replacing MODE SELECTION.

---

## `{correct required outputs}` (acceptance)

| ID | Scenario | Required result |
|----|----------|-----------------|
| A1 | Main menu | Second item **Join the bar!** |
| A2 | Activate Join the bar! | **Comm-Link** (joinbar) opens — not camera first |
| A3 | Transmit without alias or without comm | Blocked / validation error |
| A4 | Transmit with alias + email or phone | Advances to **camera** uplink |
| A5 | Camera allowed | Live selfie preview |
| A6 | Capture + use photo + complete join | Identity + photo enter register/secure store/pipeline path; success or clear failure |
| A7 | Close/back | Main menu; not forced into play |
| A8 | MODE SELECTION / B / START | Unchanged |
| A9 | Mobile | Form + camera usable; shell not permanently broken |

---

## Success definition

`{functionality}` is achieved when **Join the bar!** opens **Comm-Link (alias + contact) first**, then **camera selfie**, then **secure contact storage + character pipeline entry**, without breaking menu/mode navigation.

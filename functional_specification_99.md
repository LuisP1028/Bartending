# FS99 — Local hosting migration and runtime verification

## Purpose

Migrate the retro 8-bit bartending game from its remote Hugging Face Space backend and external GitHub Pages static hosting dependency into a fully self-contained local environment. The coding assistant is instructed to identify and execute all changes required to host the game locally and verify all local runtime components and services before any gameplay or aesthetic modifications begin.

This document describes desired `{functionality}` only. **No implementation instructions.**

**Prior:** [functional_specification_98.md](./functional_specification_98.md) (Runtime join character storage)

**DO NOT CODE from this document alone.** Implementation planning, required edits documentation, and explicit user authorization must occur before writing code.

---

## Glossary alignment

Terms `{functionality}`, `{correctness}`, `{correct required outputs}`, `{sufficient}`, `{insufficient}`, and `{errors}` follow `LANGUAGE.md`.

| Term | Meaning |
|------|---------|
| **Local Hosting** | Serving and executing all presentation layers, application routing, and backend services completely on the local workstation (`localhost`) without active traffic to remote cloud platforms. |
| **Remote Decoupling** | Severing external runtime dependencies on Hugging Face Spaces (`choppedcheese-dither-os-bartending.hf.space`) and GitHub Pages iframe routing for live gameplay and API resolution. |
| **Local Runtime & Services** | The local execution environment including server startup, dynamic route handling, asset streaming, SQLite database storage, and background process management. |
| **Local Verification** | Measurable validation that all core functional subsystems (boot media, synthwave menu, bar playfield, drink mixing, patron spawning, join pipeline, and hardware permissions) operate correctly on the local machine. |
| **Ghost Patron** | An identity registered in roster or spawn pools lacking complete, non-empty art pack files on local storage. |
| **Ready Pack** | The complete 4-file sprite set (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) stored locally and servable to the client. |

---

## Current baseline (remote architecture)

1. **Presentation / Hosting Split:** The user interface has historically been hosted as an iframe shell on GitHub Pages (`docs/index.html`), embedding a remote backend running inside a Docker container on Hugging Face Spaces.
2. **Hardcoded Remote Endpoints:** Embedded URLs point directly to `https://choppedcheese-dither-os-bartending.hf.space` for serving the application.
3. **Remote Ephemeral Runtime:** Patron assets, runtime registries, and SQLite database storage have been hosted on remote ephemeral container storage.
4. **Permissions Boundary:** Video/camera permissions for Comm-Link character registration have depended on iframe feature policy delegations targeting remote hosts.

---

## Desired `{functionality}`

### 1. Complete Local Hosting & Remote Decoupling
- The game must run locally on the host machine and be accessible via standard local web protocols (e.g. `http://localhost:<port>`).
- All application traffic—including HTML delivery, client scripting, asset loading, API queries, and media streaming—must resolve locally.
- Zero network requests to Hugging Face Spaces (`*.hf.space`) or external hosting environments may occur during standard local play, navigation, drink preparation, or character registration.
- Any shell or launcher interface provided for local play must target the local runtime instance.

### 2. Local Service & API Operation
- **Patron Registration & Roster:** Endpoint queries for character rosters (`/api/patrons/roster`), registrations, and status must execute against local persistence.
- **Asset Delivery:** Built-in assets (audio, boot video, backgrounds, sprites) and dynamically generated patron packs must be served reliably via local HTTP endpoints without 404 or missing-resource failures.
- **Data Persistence:** Local SQLite database tables and runtime JSON records must initialize, persist, and update deterministically on the local disk across server restarts without data loss or remote sync requirements.
- **Pipeline Execution:** Administrative or character generation utilities must execute directly against the local filesystem and local environment variables.

### 3. Local Runtime Verification
- The local runtime environment must be capable of clean startup, error-free execution, and clean termination.
- All functional stages of the application must be verified operational in the local environment:
  1. **Boot Intro:** Video playback of the studio intro, sound playback, and tap/skip mechanics.
  2. **Main Menu (Synthwave Navigator):** Menu navigation, selection transitions, and return-to-menu triggers (Game Boy START button).
  3. **Bar Playfield:** Character stage rendering, stock patron spawning (Elder, Caesar, Trump), and interactive dialogue.
  4. **Bartending Mechanics:** Pouring, drink construction, recipe inventory verification, and glass serving.
  5. **Comm-Link / Join:** Local camera access (under `localhost` security context), portrait capture, character generation workflow, and roster enrollment without producing ghost patrons.

### 4. Readiness Gate for Future Development
- Successful verification of all local services constitutes the gating criteria before any new gameplay features, UI alterations, or asset overhauls are introduced.

---

## Edge cases & failure modes

1. **Local Port & Host Binding Conflicts:** If default development or production ports are occupied, clear configuration must allow deterministic binding without unhandled process crashes.
2. **Missing Local Environment Configuration:** If external API keys (e.g., character generation LLM keys) are absent in the local environment, the core game loop, stock patrons, and existing ready-pack joiners must remain fully playable without fatal unhandled exceptions; non-configured external features must report informative local errors.
3. **Local Origin Camera Access:** Local execution must properly support browser media permissions (`getUserMedia`) under `localhost` without requiring third-party iframe privilege escalations.
4. **Native Module Compatibility:** Native dependencies (such as SQLite bindings or image decoders) must compile and operate cleanly in the local operating environment.

---

## Acceptance criteria

| ID | Criteria | Desired Outcome |
|----|----------|-----------------|
| **AC1** | **Local Server Startup** | Server initializes locally without `{errors}`, unhandled exceptions, or missing module crashes. |
| **AC2** | **Remote Endpoint Independence** | Network inspection during local play confirms zero requests dispatched to remote Hugging Face endpoints. |
| **AC3** | **Local Playfield Operation** | Game boots through intro video, opens menu, and enters interactive bartending playfield on `localhost`. |
| **AC4** | **Stock Patron Spawning** | Stock characters spawn, animate, and interact on the local bar stage without missing asset errors. |
| **AC5** | **Local Asset Serving** | All audio, video, sprite packs, and UI textures return HTTP 200 from local endpoints. |
| **AC6** | **Local Data Persistence** | Local roster updates and database writes persist across server restarts on local disk. |
| **AC7** | **Camera & Comm-Link** | Local Comm-Link interface successfully requests and receives camera permissions on `localhost`. |

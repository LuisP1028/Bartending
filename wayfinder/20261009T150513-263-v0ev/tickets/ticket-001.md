---
ticket_id: "001"
title: "Local Server Startup & Port Binding Configuration"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_99.md"
---

# Ticket 001: Local Server Startup & Port Binding Configuration

## Question
How must local server startup scripts, host/port binding parameters, and Next.js server runtime configurations be structured to ensure deterministic initialization on `localhost` (defaulting to port 3000 with configurable `PORT` override) while severing remote Hugging Face flags (`-H 0.0.0.0 -p 7860`) from standard local execution?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_99.md` §1 ("Complete Local Hosting & Remote Decoupling"), Edge Case 1 ("Local Port & Host Binding Conflicts"), and AC1 ("Local Server Startup").
- **Current Baseline:** `package.json` defines `"start:hf": "next start -H 0.0.0.0 -p 7860"` which targets Hugging Face container networking. The default scripts `"dev": "next dev"` and `"start": "next start"` do not explicitly document or enforce environment port binding fallbacks.
- **Affected Files:**
  - `package.json` (lines 5-10)
  - `next.config.ts` (lines 1-7)
  - `README.md` (lines 17-25)

## Architectural Decisions to Lock
1. **Script Target Architecture (`package.json`):**
   - Retain standard Next.js npm scripts `"dev": "next dev"` and `"start": "next start"` for zero-configuration local workstation launch, which natively binds to `http://localhost:3000`.
   - Support dynamic port binding via the standard `PORT` environment variable (`PORT=${PORT:-3000}`) without unhandled process termination or port conflict crashes.
   - Demote `"start:hf"` to legacy support or container-only usage; all primary documentation and local developer workflows must direct users to `npm run dev` and `npm run start` targeting `localhost`.
2. **Next.js Server Configuration (`next.config.ts`):**
   - Confirm `serverExternalPackages: ["better-sqlite3"]` remains active for Node.js native module loading in the local server runtime.
   - Disallow remote proxy rewrites or headers pointing to `choppedcheese-dither-os-bartending.hf.space`.

## Scope & Invariant Guardrails
- **In Scope:** Server startup command definitions, port conflict mitigation strategies, local environment variable configuration.
- **Out of Scope:** Modifications to UI layout, Game Boy button components, or audio synthesis hooks.

---

## Resolution

### 1. Script Definitions and Local Port Contracts
The application runtime scripts in `package.json` are locked to the following specification:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "start:hf": "next start -H 0.0.0.0 -p 7860",
  "lint": "eslint"
}
```
When running locally:
- Development server executes via `npm run dev`, listening on `http://localhost:3000` (or `PORT` specified in environment, e.g. `PORT=3001 npm run dev`).
- Production build and server execute via `npm run build && npm run start`, binding locally to `http://localhost:3000`.
- In the event of a port conflict on default port 3000, developers specify an alternative port via environment variable `PORT=<port> npm run dev`. Next.js handles port reallocation deterministically without native module crash or unhandled error.

### 2. Next.js Runtime Compatibility Lock
In `next.config.ts`, verify external native package binding:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```
This guarantees that local Node.js process invocations cleanly bind the native C++ SQLite bindings on macOS and Linux without bundling conflicts.

### 3. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks [Local Runtime Verification Protocol & Subsystem Smoke Test (ticket-006.md)](./ticket-006.md).

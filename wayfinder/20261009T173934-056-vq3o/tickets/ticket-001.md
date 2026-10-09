---
ticket_id: 001
title: "Component Ownership Identification & System Layer Architecture Mapping"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_104.md"
---

# Ticket 001: Component Ownership Identification & System Layer Architecture Mapping

## Question
Which specific components, modules, hooks, and data structures across the application architecture are responsible for orchestrating patron spawning, calculating seat anchors and walk polylines, driving frame timing and motion updates, detecting arrival and executing the seating transition, managing seat occupancy reservations, and rendering sprites with counter occlusion?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_104.md`
  - §Instruction to Coding Assistant (1): "Thoroughly inspect the codebase and identify which components, modules, hooks, and data definitions are responsible for:
    - Orchestrating patron spawning, auto-fill timers/intervals, and character selection.
    - Calculating bar seat anchors, target coordinates, and walk polylines.
    - Driving frame timing, wall-clock motion progression, and positional updates along the walk path.
    - Detecting destination arrival and executing the state transition from walking to seated.
    - Managing and reserving seat occupancy to prevent duplicate claims.
    - Rendering character sprites, switching visual assets between walking and seated states, and handling layer clipping."
  - §Instruction to Coding Assistant (2): "Explicitly name and detail the role of each identified component in the required architectural plan and edit set prior to implementing any code changes."

## Codebase Audit & System Layer Ownership Register

### 1. Spawning Cadence, Auto-Fill Interval & Character Selection
- **Governing Components & Modules:**
  - `src/components/PatronLayer.tsx`:
    - `useEffect` (L462–L486): Manages auto-fill timers via `window.setTimeout` for `AUTO_FILL_INITIAL_DELAY_MS` (800ms) and `window.setInterval` for `AUTO_FILL_INTERVAL_MS` (2500ms).
    - `trySpawn()` (L382–L457): Evaluates candidate seat availability, checks capacity (`snapshot.length >= seatList.length`), selects random character via `pickRandomFreeCharacterId(snapshot)`, constructs `nextInst`, records clock in `motionClockRef`, and executes atomic state addition inside `flushSync`.
    - `pickRandomFreeCharacterId()` (L96–L103): Filters candidate pool from `listCharacters()` excluding currently living instances (`livingCharacterIds(instances)`), prioritizing `STOCK_CHARACTER_IDS`.
    - `STOCK_CHARACTER_IDS` (L90–L94): Set containing `'patron_elder'`, `'caesar_9aea2cd1a4bf32d6'`, and `'trump_ca36306f5c662816'`.
  - `src/data/patronServiceConstants.ts`:
    - `AUTO_FILL_INITIAL_DELAY_MS` = 800
    - `AUTO_FILL_INTERVAL_MS` = 2500
  - `src/data/characters.ts`:
    - `listCharacters()`: Returns available characters merging built-in registry with client runtime cache.
    - `requireCharacter(id)`: Resolves full `CharacterDef` by character ID.
    - `characterToPatronDef(character)`: Maps `CharacterDef` to lightweight `PatronDef` containing `walkFrames`, `sitSrc`, `walkFrameMs`, and `displayWidthPct`.
  - `src/data/runtimePatrons.ts`:
    - `setClientRuntimePatronCache()`: Dynamic cache updater populated via async HEAD validation against `/api/patrons/roster`.

### 2. Bar Seat Anchors, Target Coordinates & Walk Polylines
- **Governing Components & Modules:**
  - `src/data/povHotspots.ts`:
    - `POV_BAR_SEAT_HOTSPOTS` (L165–L167): Canonical seat geometry zones (`bar_seat_1`, `bar_seat_2`, `bar_seat_3`, `bar_seat_4`) derived from `POV_HOTSPOTS`.
    - `POV_VIEWBOX` from `src/data/hotspotGeometry.ts`: Canonical POV stage viewBox `{ width: 1184, height: 880 }`.
  - `src/lib/patronSeats.ts`:
    - `resolveBarSeatAnchor(zoneId, pathD)` (L28–L44): Computes horizontal center and bottom bbox of seat path relative to `POV_VIEWBOX` (or uses `FALLBACK_SEAT_ANCHORS` for known bar stools), returning `{ leftPct, topPct }`.
    - `FALLBACK_SEAT_ANCHORS` (L16–L21): Explicit percentages for `bar_seat_1` (18.4%), `bar_seat_2` (38.2%), `bar_seat_3` (59.5%), and `bar_seat_4` (82.3%).
  - `src/data/patronLayout.ts`:
    - `DEFAULT_PATRON_STAGE` (L55–L64): Shared layout configuration specifying `walkDisplayWidthPct: 57`, `sitDisplayWidthPct: 35`, `spawn: { x: 143, y: 659 }`, `sitOffset: { x: 25, y: 85 }`, `lockHorizontalWalk: true`, and `walkMs: 2400`.
    - `buildWalkPath(layout, seatEnd)` (L205–L235): Constructs continuous polyline points (`walkPath: StagePoint[]`) from `layout.spawn` through waypoints to `walkEnd` (`{ x: seatEnd.x + layout.sitOffset.x, y: groundY }`), alongside final seated coordinates `sitPoint` (`{ x: seatEnd.x + layout.sitOffset.x, y: seatEnd.y + layout.sitOffset.y }`).
    - `pointAlongPath(points, t)` (L178–L199): Converts normalized progress `t` (0.0 to 1.0) to interpolated stage point `{ x, y }`.
    - `stagePointToPct(p)` (L154–L159): Normalizes stage point to percentage values `{ leftPct, topPct }` for CSS absolute positioning.
  - `src/lib/patronLayoutStorage.ts`:
    - `resolvePatronLayout(characterId, overrides)`: Resolves layout from overrides or defaults to `DEFAULT_PATRON_STAGE`.

### 3. Frame Timing, Wall-Clock Progression & Positional Updates
- **Governing Components & Modules:**
  - `src/components/PatronLayer.tsx`:
    - `ensureMotionDriver()` (L281–L380): Initializes and maintains the active `requestAnimationFrame(tick)` driver loop.
    - `driverRunningRef` (L154) & `driverRafRef` (L153): Driver state refs preventing redundant loop instantiation.
    - `motionClockRef` (L152): Map tracking per-walker motion clock: `Map<string, MotionClock>`.
    - `MotionClock` interface (L50–L54): `{ startMs: number; walkMs: number; frameMs: number }`.
    - `tick(now: number)` (L285–L377):
      - Calculates wall-clock delta: `elapsed = Math.max(0, now - clock.startMs)`.
      - Computes progress: `t = Math.min(1, elapsed / walkMs)`.
      - Computes sprite walk frame: `frameIndex = Math.floor(elapsed / frameMs) % nFrames`.
      - Updates walker instances via `setInstances(prev => ...)` in `flushSync`.

### 4. Destination Arrival Detection & Seated State Transition
- **Governing Components & Modules:**
  - `src/components/PatronLayer.tsx`:
    - `tick()` motion loop (L316–L343):
      - Arrival condition check: Evaluates whether `t >= 1` or `elapsed >= walkMs`.
      - State mutation on arrival:
        - Mutates `phase: 'seated'`.
        - Enforces progress `t: 1`.
        - Resets `flipX: false`.
        - Resets `walkFrameIndex: 0`.
        - Deletes clock from `motionClockRef.current.delete(p.instanceKey)`.
        - Enqueues sit notification to `pendingSitRef.current.push(...)`.
      - Event notification (L365–L369): Flushes `pendingSitRef` and invokes `onSitCompleteRef.current?.(ev)`.
      - Driver shutdown (L371–L376): Shuts down rAF loop when `stillWalking` is false and `motionClockRef.current.size === 0`.

### 5. Continuous Seat Occupancy & Duplicate Claim Reservation
- **Governing Components & Modules:**
  - `src/components/PatronLayer.tsx`:
    - `freeSeats(seats, instances)` (L68–L83):
      - Extracts occupied seats: `const taken = new Set(instances.map((i) => i.seatId).filter(Boolean));`.
      - Filters available seats: Excludes any seat present in `taken`, ensuring that a seat remains reserved during walking and throughout seated occupancy.
    - `trySpawn()` (L382–L457):
      - Pre-spawn capacity check: `if (snapshot.length >= seatList.length) return;`.
      - Seat selection from `freeSeats(seatList, snapshot)`.
      - Atomic registration in `flushSync` checking `prev.some(p => p.seatId === built.seatId)` and `prev.some(p => p.characterId === characterId)`.

### 6. Sprite Asset Switching, Layout Sizing & Layer Occlusion
- **Governing Components & Modules:**
  - `src/components/PatronLayer.tsx`:
    - JSX Render Loop (L506–L545):
      - Checks `isSeated = inst.phase === 'seated'`.
      - Position switching: `pos = isSeated ? inst.sitPoint : pointAlongPath(inst.walkPath, inst.t)`.
      - Asset switching: `src = isSeated ? inst.def.sitSrc : frames[inst.walkFrameIndex % nFrames] ?? frames[0]`.
      - Sizing switching: `widthPct = isSeated ? inst.layout.sitDisplayWidthPct : inst.layout.walkDisplayWidthPct`.
      - Styling classes: `pov-patron-sprite pov-patron-sprite--sit` vs `pov-patron-sprite pov-patron-sprite--walk`.
      - Attributes: `data-character-id`, `data-seat-id`, `data-phase`.
    - Container Occlusion (L496–L505): Applies `style={{ clipPath: barClipCss, WebkitClipPath: barClipCss }}`.
  - `src/lib/svgPathScale.ts`:
    - `roomMinusBarClipPathCss(barCutoffD, ...)`: Generates CSS polygon path for clipping the patron's lower body behind the bar counter.
  - `src/app/globals.css`:
    - `.pov-patron-sprite` (L789–L808): Base pixelated sprite layout with `position: absolute; pointer-events: none;`.
    - `.pov-patron-sprite--sit`: Configures `max-height: 55%; object-fit: contain; object-position: bottom center;` for seated bust display.
    - `.pov-patron-sprite--walk`: Configures `max-height: 65%; object-fit: contain; object-position: bottom center;` for walking full-body display.

## Architectural Decision
All 6 system responsibilities are mapped to concrete, verified source code files and interfaces. Future modifications must respect these architectural boundaries, preventing workarounds, hacks, or artificial timer delays.

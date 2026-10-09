# TM110 — Master Integration Test Matrix: Physical Drag-and-Drop Cocktail Service: Multi-Patron Order Concurrency, Validation Snap-Back, Reversed Departure Motion, and Continuous Turnover

**Governing Specification:** `functional_specification_110.md` (FS110)  
**Run ID:** `20261009T232731-335-sqow`  
**Decision Tickets:**
- [Ticket 001: Concurrent Multi-Seat Order Registry & State Lifecycle Isolation](./tickets/ticket-001.md)
- [Ticket 002: Diegetic Drag-and-Drop Vessel Interaction & Pointer Physics](./tickets/ticket-002.md)
- [Ticket 003: Recipe Validation Gate & Fail-Fast Snap-Back Physics](./tickets/ticket-003.md)
- [Ticket 004: Patron Reversed Walk Departure Motion & Animation Inversion](./tickets/ticket-004.md)
- [Ticket 005: Immediate Stool Vacating, Turnover Spawning & Continuous Service Loop](./tickets/ticket-005.md)
- [Ticket 006: FS110 Physical Drag-and-Drop Cocktail Service Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./tickets/ticket-006.md)
- [Ticket 007: FS110 Physical Drag-and-Drop Cocktail Service Integration Test Execution Protocol, Authentic Codebase Schemas, Payload Admissibility Governance, and Fail-Fast Oracles](./tickets/ticket-007.md)

---

## 1. Upstream Ingestion & Component Audit Summary

- **Governing Upstream Manifests:**
  - `handoff/20261009T232731-335-sqow/wayfinder-read-and-plan.txt`
  - `handoff/20261009T232731-335-sqow/implementer.txt`
  - `handoff/20261009T232731-335-sqow/reviewer.txt`

- **Modified Source Components Under Test:**
  1. `src/app/globals.css` (CSS classes for `.pov-patron-sprite--candidate-target`, `.pov-active-vessel--dragging`, `.pov-active-vessel--snapping`)
  2. `src/app/page.tsx` (Per-seat order registry, pointer drag session controller, centroid distance collision evaluation, recipe validation gate, snap-back physics, fulfillment handling)
  3. `src/components/PatronLayer.tsx` (Imperative `departSeat(seatId)` handle, rAF departure motion driver, horizontal sprite flip `scaleX(-1)`, reversed walk frame animation, immediate stool vacating, continuous turnover spawner)

- **Zero-Mock Verification Certification (`INV-PAYLOAD-01` & `INV-ASSERTION-01`):**
  - All test definitions are grounded strictly in authentic codebase schemas, actual restaurant catalog recipes from `src/data/obelisco_mapped.json`, and real patron definitions from `src/data/patrons.ts`.
  - Zero synthetic mock objects, dummy JSON fixtures, placeholder strings, or renamed fields are used.

---

## 2. Admissible Observed Payloads Register (`INV-PAYLOAD-01`)

Under `INV-PAYLOAD-01`, test inputs must use authentic data from the codebase without synthesized placeholders or simulated fields.

| Payload Identifier | Description & Structure | Source / Origin | Authentic Schema Grounding |
| :--- | :--- | :--- | :--- |
| `PAYLOAD-RECIPE-MARGARITA` | Pinned Obelisco Margarita ticket | `src/data/obelisco_mapped.json` | `CocktailRecipe` (`name: 'Margarita'`, `vessel: 'ROCKS'`, `agitation: 'BOSTON_SHAKER_TIN'`, `garnishes: ['freshlimewheel']`, `validRims: ['KOSHER_SALT_SEA_SALT', 'DEMERARA_SUGAR', 'TAJIN_CHILE_LIME']`, `variants: [{ variantName: 'CLASSIC - LIME (Tequila)', ingredients: { tequilablancosilver: 2, juicefreshlime: 1, syrupagavenectar: 1 } }]`) |
| `PAYLOAD-RECIPE-MARIETAS` | Pinned Obelisco Las Marietas ticket | `src/data/obelisco_mapped.json` | `CocktailRecipe` (`name: 'Las Marietas'`, `vessel: 'COLLINS'`, `agitation: 'BOSTON_SHAKER_TIN'`, `garnishes: ['herbfreshmintsprig', 'herbcinnamonflakes']`, `validRims: ['NONE']`, `variants: [{ variantName: 'Default', ingredients: { mixerhorchata: 3, juiceguava: 2 } }]`) |
| `PAYLOAD-RECIPE-NARANJADA` | Pinned Obelisco Naranjada ticket | `src/data/obelisco_mapped.json` | `CocktailRecipe` (`name: 'Naranjada'`, `vessel: 'COLLINS'`, `agitation: 'BUILT'`, `garnishes: ['freshorangewheel']`, `validRims: ['TAJIN_CHILE_LIME']`, `variants: [{ variantName: 'Default', ingredients: {} }]`) |
| `PAYLOAD-DRINK-PERFECT-MARGARITA` | Perfect Margarita cocktail build matching `PAYLOAD-RECIPE-MARGARITA` | `src/hooks/useSimulation.ts` | `DrinkState` (`vessel: 'ROCKS'`, `ingredients: { tequilablancosilver: 2, juicefreshlime: 1, syrupagavenectar: 1 }`, `rim: 'KOSHER_SALT_SEA_SALT'`, `agitation: 'BOSTON_SHAKER_TIN'`, `garnishes: [{ id: 'freshlimewheel', x: 0, y: 0 }]`) |
| `PAYLOAD-DRINK-INVALID-GARNISH` | Margarita missing fresh lime wheel garnish | `src/hooks/useSimulation.ts` | `DrinkState` (`vessel: 'ROCKS'`, `ingredients: { tequilablancosilver: 2, juicefreshlime: 1, syrupagavenectar: 1 }`, `rim: 'KOSHER_SALT_SEA_SALT'`, `agitation: 'BOSTON_SHAKER_TIN'`, `garnishes: []`) |
| `PAYLOAD-DRINK-INVALID-VESSEL` | Margarita in wrong vessel (`COLLINS` instead of `ROCKS`) | `src/hooks/useSimulation.ts` | `DrinkState` (`vessel: 'COLLINS'`, `ingredients: { tequilablancosilver: 2, juicefreshlime: 1, syrupagavenectar: 1 }`, `rim: 'KOSHER_SALT_SEA_SALT'`, `agitation: 'BOSTON_SHAKER_TIN'`, `garnishes: [{ id: 'freshlimewheel', x: 0, y: 0 }]`) |
| `PAYLOAD-DRINK-EMPTY-MAT` | Empty live preparation mat build | `src/hooks/useSimulation.ts` | `DrinkState` (`vessel: null`, `liquid: null`, `ingredients: {}`, `rim: null`, `agitation: null`, `garnishes: []`) |
| `PAYLOAD-SEATING-EVENT-ELDER` | Elder seating at `bar_seat_1` | `src/components/PatronLayer.tsx` (`onSitComplete`) | `{ instanceKey: 'patron-1-k1', characterId: 'patron_elder', seatId: 'bar_seat_1' }` |
| `PAYLOAD-SEATING-EVENT-CAESAR` | Caesar seating at `bar_seat_2` | `src/components/PatronLayer.tsx` (`onSitComplete`) | `{ instanceKey: 'patron-2-k2', characterId: 'caesar_9aea2cd1a4bf32d6', seatId: 'bar_seat_2' }` |
| `PAYLOAD-SEATING-EVENT-TRUMP` | Trump seating at `bar_seat_3` | `src/components/PatronLayer.tsx` (`onSitComplete`) | `{ instanceKey: 'patron-3-k3', characterId: 'trump_ca36306f5c662816', seatId: 'bar_seat_3' }` |

---

## 3. Master Integration Test Matrix (IT-FS110-01 – IT-FS110-10)

| Test Case ID | Target Component | Acceptance Criterion / Boundary | Authentic Codebase Schema / Interface | Admissible Observed Input Payload (`INV-PAYLOAD-01`) | `{correct required outputs}` (`INV-ASSERTION-01`) | Explicit `{errors}` (`LANGUAGE.md`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-FS110-01** | `src/app/page.tsx` | **AC1** (Multi-Seat Order Independence) | `seatOrders: Record<string, PatronSeatOrder>`<br>`handlePatronSitComplete` | Dispatch `PAYLOAD-SEATING-EVENT-ELDER`, `PAYLOAD-SEATING-EVENT-CAESAR`, and `PAYLOAD-SEATING-EVENT-TRUMP` for `bar_seat_1`, `bar_seat_2`, and `bar_seat_3` | `seatOrders` contains isolated entries for each seat; each has a distinct `assignedRecipe` pinned via `pinRandomVariant()`; modifying `bar_seat_1` leaves `bar_seat_2` and `bar_seat_3` completely untouched. | Key collision; order state overwritten; shared recipe mutation; unpinned multi-variant recipe. |
| **IT-FS110-02** | `src/app/page.tsx` | **AC2**, **Edge Case 1** (Empty Mat Drag Guard) | `vesselDragState`<br>`pointerDragRef`<br>`DrinkState` | Pointer down on live prep mat when `state.vessel === null` (`PAYLOAD-DRINK-EMPTY-MAT`) | Zero drag events fire; `dragState.isDragging === false`; cursor remains default; `pointerDragRef.current` remains null. | Drag state initialized when vessel is null; pointer capture on empty mat. |
| **IT-FS110-03** | `src/app/page.tsx`<br>`src/components/PatronLayer.tsx`<br>`src/app/globals.css` | **AC2** (Diegetic Drag Session & Candidate Glow) | `VesselDragState`<br>`PointerEvent`<br>CSS class modifiers | Pointer down on vessel followed by pointer movement $> 6\text{px}$ toward `bar_seat_1` with `PAYLOAD-DRINK-PERFECT-MARGARITA` | `dragState.isDragging === true`; `.pov-active-vessel--dragging` applied (z-index: 60, opacity: 0.95); `dragState.targetSeatId === 'bar_seat_1'`; target patron bust receives `.pov-patron-sprite--candidate-target` (gold glow, scale 1.04). | Coordinate jumping; missing `.pov-active-vessel--dragging`; candidate glow fails to appear; lag. |
| **IT-FS110-04** | `src/app/page.tsx` | **AC2**, **Edge Case 2** (Centroid Distance Collision & Tie-Breaking) | `findCandidateSeat`<br>DOM bounding rects | Pointer drag coordinates positioned between `bar_seat_1` and `bar_seat_2`, closer to `bar_seat_1` (distance $\le 95\text{px}$) | `findCandidateSeat` returns `'bar_seat_1'` based on minimum Euclidean distance; zero flickering; exactly one candidate highlighted. | Non-deterministic selection; multiple seats highlighted simultaneously; out-of-range selection ($>95\text{px}$). |
| **IT-FS110-05** | `src/app/page.tsx`<br>`src/app/globals.css` | **AC4**, **Edge Case 4** (Missed Drop Snap-Back Physics) | `triggerSnapBack`<br>`VesselDragState`<br>CSS transition styles | Releasing drag (`pointerup` or `pointercancel`) in empty space outside any patron bounding zone (`targetSeatId === null`) | `isSnappingBack === true`; `.pov-active-vessel--snapping` applied; vessel returns to `(startX, startY)` over 250ms with `cubic-bezier(0.2, 0.9, 0.3, 1)`; drink build state preserved intact; zero error banners; zero dialogue dispatched. | Drink build cleared on missed drop; vessel frozen mid-stage; error banner triggered. |
| **IT-FS110-06** | `src/app/page.tsx`<br>`src/data/RecipeManager.ts` | **AC3**, **AC4** (Recipe Rejection Gate & Snap-Back) | `validateDrink`<br>`handleRejectionDelivery`<br>`triggerSnapBack` | Dropping `PAYLOAD-DRINK-INVALID-GARNISH` onto seated Elder with `PAYLOAD-RECIPE-MARGARITA` order | `validateDrink` returns `['[GRN] Missing freshlimewheel']`; `triggerSnapBack` animates vessel back to mat; cocktail build preserved intact on mat; order remains `'waiting'`; POST `/api/dialogue` dispatched with `type: 'rejection'`; rejection speech displayed in dialogue box; patron remains seated. | Drink consumed on mismatch; patron leaves on error; silent failure without dialogue; snap-back fails to execute. |
| **IT-FS110-07** | `src/app/page.tsx`<br>`src/hooks/useSimulation.ts` | **AC3**, **AC5** (Service Fulfillment & Mat Reset) | `handleSuccessfulDelivery`<br>`trashDrink`<br>`PatronLayerHandle.departSeat` | Dropping `PAYLOAD-DRINK-PERFECT-MARGARITA` onto seated Elder with matching `PAYLOAD-RECIPE-MARGARITA` order | Validation returns zero errors; `trashDrink()` clears live prep mat (`state.vessel === null`, empty ingredients); attached receipt finalized via `handoffExitRef`; money flyby triggered if receipt has total; order status transitions to `'departing'`; `patronLayerRef.current.departSeat('bar_seat_1')` called. | Drink remains on mat; seat order remains `'waiting'`; receipt not finalized; departure not triggered. |
| **IT-FS110-08** | `src/components/PatronLayer.tsx` | **AC6** (Patron Departure Inversion & Reversed Walk Motion) | `departSeat`<br>rAF motion driver<br>`buildDeparturePath` | Calling `departSeat('bar_seat_1')` on seated patron instance | Patron transitions to `phase === 'leaving'`; sprite switches to full-body walk height; sprite flipped horizontally (`scaleX(-1)`); departure path constructed from `(sitPoint.x, 659)` to `(143, 659)`; walk frames sequence in reverse order ($N-1 \rightarrow \dots \rightarrow 0$); sprite moves smoothly leftward along baseline $y=659$. | Patron vanishes without walking; walk frames play forward; sprite not flipped; y-coordinate drifts off ground baseline. |
| **IT-FS110-09** | `src/components/PatronLayer.tsx` | **AC6** (Entrance Threshold Clean Despawn) | rAF motion driver<br>`instances: PatronInstance[]`<br>`motionClockRef` | Departing patron reaches $t \ge 1$ ($x=143$, entrance threshold) | Instance is cleanly filtered out of `instances` array; associated `motionClockRef` entry is deleted; character ID returns to available roster pool; zero orphan rAF timers or memory leaks. | Instance remains in DOM at entrance; motion clock leaks; character ID permanently blocked from re-entering. |
| **IT-FS110-10** | `src/components/PatronLayer.tsx` | **AC7** (Immediate Stool Vacating & Continuous Turnover) | `departSeat`<br>`freeSeats`<br>`trySpawn` | Transition of seated patron to `phase === 'leaving'` | Occupying instance clears `seatId` immediately to `''`; `freeSeats()` immediately reports stool as vacant; `trySpawn()` is triggered within 50ms (bypassing idle auto-fill timers); incoming replacement patron spawns from unseated cast, walks to stool, and triggers `onSitComplete`. | Stool locked until departing patron completely despawns; replacement spawn delayed by auto-fill timer; duplicate twin character spawned. |

---

## 4. Assertion Law Certification & Sufficiency Affirmation

- Every asserted field name (`seatId`, `instanceKey`, `characterId`, `assignedRecipe`, `orderStatus`, `activeDialogue`, `receiptInstanceId`, `isDragging`, `currentX`, `currentY`, `targetSeatId`, `isSnappingBack`, `phase`, `flipX`, `walkFrameIndex`) is an authentic codebase schema field.
- Every asserted output is a `{correct required output}` under `LANGUAGE.md`.
- Zero synthetic mock data or handwritten expected blobs were introduced.
- Status: **`{sufficient}`**.

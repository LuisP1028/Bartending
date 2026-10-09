# RE110 — Master Component-to-Edit Matrix: Physical Drag-and-Drop Cocktail Service: Multi-Patron Order Concurrency, Validation Snap-Back, Reversed Departure Motion, and Continuous Turnover

**Spec:** [functional_specification_110.md](./functional_specification_110.md)  
**Map:** [wayfinder/20261009T232731-335-sqow/map.md](./wayfinder/20261009T232731-335-sqow/map.md)  
**Tickets:**
- [Ticket 001: Concurrent Multi-Seat Order Registry & State Lifecycle Isolation](./wayfinder/20261009T232731-335-sqow/tickets/ticket-001.md)
- [Ticket 002: Diegetic Drag-and-Drop Vessel Interaction & Pointer Physics](./wayfinder/20261009T232731-335-sqow/tickets/ticket-002.md)
- [Ticket 003: Recipe Validation Gate & Fail-Fast Snap-Back Physics](./wayfinder/20261009T232731-335-sqow/tickets/ticket-003.md)
- [Ticket 004: Patron Reversed Walk Departure Motion & Animation Inversion](./wayfinder/20261009T232731-335-sqow/tickets/ticket-004.md)
- [Ticket 005: Immediate Stool Vacating, Turnover Spawning & Continuous Service Loop](./wayfinder/20261009T232731-335-sqow/tickets/ticket-005.md)
- [Ticket 006: FS110 Physical Drag-and-Drop Cocktail Service Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./wayfinder/20261009T232731-335-sqow/tickets/ticket-006.md)

---

## 1. System Layer Component Ownership Register

| Lifecycle / Architectural Responsibility | Primary Component & File Path | Supporting Modules & Data Definitions | Key Functions, Hooks & Data Structures |
| :--- | :--- | :--- | :--- |
| **Multi-Seat Order Registry & Lifecycle State** | `src/app/page.tsx` | `src/data/RecipeManager.ts`, `src/components/receipt/ReceiptSystem.tsx` | `seatOrders`, `PatronSeatOrder`, `handlePatronSitComplete`, `printAttachedTicketRef` |
| **Diegetic Drag Controller & Centroid Collision** | `src/app/page.tsx` | `src/data/patronLayout.ts`, `src/lib/patronSeats.ts` | `vesselDragState`, `handlePointerDown`, `handlePointerMove`, `handlePointerUp`, `findClosestSeatedPatron` |
| **Recipe Validation Gate & Snap-Back Physics** | `src/app/page.tsx` | `src/data/RecipeManager.ts`, `src/hooks/useSimulation.ts` | `handleServeDrinkToSeat`, `validateDrink`, `triggerSnapBack`, `trashDrink`, `/api/dialogue` rejection dispatch |
| **Departure Trajectory & Animation Inversion** | `src/components/PatronLayer.tsx` | `src/data/patronLayout.ts`, `src/data/characters.ts` | `Phase = 'walking' \| 'seated' \| 'leaving'`, `buildDeparturePath`, reversed walk frame calculation, horizontal flip (`scaleX(-1)`) |
| **Immediate Stool Vacancy & Turnover Spawning** | `src/components/PatronLayer.tsx` | `src/data/patronServiceConstants.ts`, `src/data/patrons.ts` | `freeSeats`, `departSeat`, immediate `trySpawn` dispatch, despawn filter upon $t \ge 1$ |
| **Visual Styles, Highlighting & Snap Animations** | `src/app/globals.css` | `src/app/layout.tsx` | `.pov-patron-sprite--candidate-target`, `.pov-active-vessel--dragging`, `.pov-active-vessel--snapping` |

---

## 2. Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `src/app/page.tsx` | L137–L146 (`PatronSeatOrder`) | `ticket-001.md` | Extend `PatronSeatOrder` with `assignedRecipe`, `orderStatus: PatronOrderStatus` (`'waiting' \| 'ordered' \| 'served' \| 'rejected' \| 'departing'`), `rejectionDialogue`, and `receiptInstanceId` | Fully aligns order lifecycle with FS110 while preserving aliases for backward compatibility (`recipe`, `status`, `orderDialogue`). |
| `src/app/page.tsx` | L356–L435 (`handlePatronSitComplete`) | `ticket-001.md`, `ticket-005.md` | Call `printAttachedTicketRef.current` to attach receipt on seat arrival; initialize `receiptInstanceId` in seat record | Synchronizes ticket rack receipts with seated patron orders; enables automated receipt slide-away on delivery. |
| `src/app/page.tsx` | L437–L522 (`handleServeDrinkToSeat`) | `ticket-003.md`, `ticket-005.md` | Integrate snap-back physics on failure; preserve cocktail state on failure; call `trashDrink()` and `patronLayerRef.current.departSeat(seatId)` on success | Satisfies AC3, AC4, and AC5. Rejection snaps back without clearing build; success clears mat and triggers departure. |
| `src/app/page.tsx` | L1775–L1825 (`.pov-active-vessel`) | `ticket-002.md`, `ticket-003.md` | Replace pure HTML5 drag with unified Pointer Event controller (`onPointerDown`, `pointermove`, `pointerup`); compute centroid distance collision; track `highlightedSeatId` | Enables lag-free dragging on mobile touch, Game Boy playfield, and desktop mouse. Restores tap-to-open card. |
| `src/app/page.tsx` | L1600–L1615 (`<PatronLayer />`) | `ticket-002.md`, `ticket-004.md`, `ticket-005.md` | Pass `ref={patronLayerRef}` and `highlightedSeatId={dragState.targetSeatId}` to `PatronLayer` | Bridges drag hover detection and imperative departure commands between page orchestrator and patron simulation. |
| `src/components/PatronLayer.tsx` | L40–L54 (`Phase`, `PatronInstance`) | `ticket-004.md` | Extend `Phase` with `'leaving'`; support `forwardRef<PatronLayerHandle, PatronLayerProps>` | Adds leaving state and exposes `departSeat(seatId)` to parent orchestrator. |
| `src/components/PatronLayer.tsx` | L75–L90 (`freeSeats`) | `ticket-005.md` | Treat stools as free when the occupying instance transitions to `phase === 'leaving'` (or `seatId === ''`) | Immediate stool vacating unblocks seat for immediate turnover spawning (AC7). |
| `src/components/PatronLayer.tsx` | L290–L360 (`ensureMotionDriver`) | `ticket-004.md` | Add `'leaving'` branch to rAF driver: reverse walk frames (`(nFrames - 1) - forwardIdx`), move toward $(143, 659)$, filter out instance on $t \ge 1$ | Satisfies AC6. Clean despawn at entrance threshold without orphan clocks or memory leaks. |
| `src/components/PatronLayer.tsx` | L530–L598 (`instances.map`) | `ticket-002.md`, `ticket-004.md` | Render full-body walk height for leaving patrons; apply `scaleX(-1)`; apply `.pov-patron-sprite--candidate-target` when highlighted | Visual inversion and scaling for departure; real-time recipient highlight during active drag. |
| `src/app/globals.css` | L805–L825 (`.pov-patron-sprite--sit`, `.pov-active-vessel`) | `ticket-002.md`, `ticket-003.md` | Add `.pov-patron-sprite--candidate-target`, `.pov-active-vessel--dragging`, and `.pov-active-vessel--snapping` | Gold pixel drop-shadow on candidate recipient; smooth cubic-bezier transition on snap-back return. |

---

## 3. Detailed Component-by-Component Specifications

### 3.1 `src/components/PatronLayer.tsx`
- **Governing Tickets:** `ticket-002.md`, `ticket-004.md`, `ticket-005.md`
- **Interface & Type Extensions:**
  ```typescript
  export type Phase = 'walking' | 'seated' | 'leaving';

  export interface PatronLayerHandle {
    departSeat: (seatId: string) => boolean;
  }

  type PatronLayerProps = {
    seats: PatronSeatInput[];
    layoutOverrides?: Record<string, PatronLayout>;
    barCutoffD?: string;
    editMode?: boolean;
    highlightedSeatId?: string | null;
    onSitComplete?: (info: {
      instanceKey: string;
      characterId: string;
      seatId: string;
    }) => void;
    onServeDrinkToSeat?: (seatId: string) => void;
  };
  ```
- **Departure Polyline Construction:**
  ```typescript
  function buildDeparturePath(
    sitPoint: StagePoint,
    layout: PatronLayout
  ): StagePoint[] {
    const groundY = AUTHORITATIVE_GROUND_Y; // 659
    const startPoint: StagePoint = { x: sitPoint.x, y: groundY };
    const endPoint: StagePoint = { ...AUTHORITATIVE_SPAWN_ORIGIN }; // 143, 659
    const reversedWps = (layout.waypoints ?? [])
      .slice()
      .reverse()
      .map((p) => ({ x: p.x, y: groundY }));
    return [startPoint, ...reversedWps, endPoint];
  }
  ```
- **Imperative `departSeat` Implementation:**
  ```typescript
  useImperativeHandle(ref, () => ({
    departSeat: (seatId: string) => {
      let found = false;
      flushSync(() => {
        setInstances((prev) => {
          return prev.map((inst) => {
            if (inst.seatId === seatId && inst.phase === 'seated') {
              found = true;
              const departurePath = buildDeparturePath(inst.sitPoint, inst.layout);
              const walkMs = Math.max(400, inst.layout.walkMs || 2400);
              const frameMs = Math.max(60, inst.def.walkFrameMs || 120);

              motionClockRef.current.set(inst.instanceKey, {
                startMs: performance.now(),
                walkMs,
                frameMs,
              });

              return {
                ...inst,
                phase: 'leaving' as const,
                seatId: '', // Stool is immediately vacated
                walkPath: departurePath,
                t: 0,
                flipX: true,
                walkFrameIndex: (inst.def.walkFrames.length || 1) - 1,
              };
            }
            return inst;
          });
        });
      });

      if (found) {
        ensureMotionDriver();
        // Trigger immediate turnover spawn
        window.setTimeout(() => {
          trySpawn();
        }, 50);
      }
      return found;
    },
  }), [ensureMotionDriver, trySpawn]);
  ```

- **rAF Motion Driver Departure & Despawn:**
  ```typescript
  if (p.phase === 'leaving') {
    let clock = motionClockRef.current.get(p.instanceKey);
    if (!clock) {
      const walkDuration = Math.max(400, p.layout.walkMs || 2400);
      const frameDuration = Math.max(60, p.def.walkFrameMs || 120);
      clock = { startMs: now, walkMs: walkDuration, frameMs: frameDuration };
      motionClockRef.current.set(p.instanceKey, clock);
    }

    const elapsed = Math.max(0, now - clock.startMs);
    const t = Math.min(1, elapsed / clock.walkMs);
    const nFrames = Math.max(p.def.walkFrames.length, 1);
    const frameIndex = Math.floor(elapsed / clock.frameMs) % nFrames;
    const reversedIndex = (nFrames - 1) - frameIndex;

    if (t < 1 && elapsed < clock.walkMs) {
      stillWalking = true;
      changed = true;
      return { ...p, t, walkFrameIndex: reversedIndex };
    }

    // Finished departure walk -> Clean Despawn
    changed = true;
    motionClockRef.current.delete(p.instanceKey);
    return null; // Filtered out of next instances array
  }
  ```

---

### 3.2 `src/app/page.tsx`
- **Governing Tickets:** `ticket-001.md`, `ticket-002.md`, `ticket-003.md`, `ticket-005.md`
- **State Schema:**
  ```typescript
  export type PatronOrderStatus = 'waiting' | 'ordered' | 'served' | 'rejected' | 'departing';

  export interface PatronSeatOrder {
    seatId: string;
    characterId: string;
    instanceKey: string;
    assignedRecipe: CocktailRecipe;
    recipe: CocktailRecipe; // alias
    orderStatus: PatronOrderStatus;
    status: PatronOrderStatus; // alias
    activeDialogue: string | null;
    orderDialogue: string | null; // alias
    rejectionDialogue: string | null;
    receiptInstanceId: string | null;
    timestamp: number;
  }
  ```
- **Unified Drag Engine State:**
  ```typescript
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    targetSeatId: string | null;
    isSnappingBack: boolean;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    targetSeatId: null,
    isSnappingBack: false,
  });
  ```
- **Centroid Collision Calculation:**
  ```typescript
  const findCandidateSeat = useCallback(
    (clientX: number, clientY: number): string | null => {
      if (!povStageRef.current) return null;
      const sprites = povStageRef.current.querySelectorAll<HTMLElement>(
        '.pov-patron-sprite--sit'
      );
      let closestSeatId: string | null = null;
      let minDistance = Infinity;
      const MAX_RADIUS_PX = 95;

      sprites.forEach((el) => {
        const seatId = el.getAttribute('data-seat-id');
        if (!seatId || !seatOrders[seatId]) return;
        if (seatOrders[seatId].orderStatus !== 'waiting' && seatOrders[seatId].orderStatus !== 'ordered') return;

        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(clientX - cx, clientY - cy);

        if (dist < minDistance && dist <= MAX_RADIUS_PX) {
          minDistance = dist;
          closestSeatId = seatId;
        }
      });

      return closestSeatId;
    },
    [seatOrders]
  );
  ```
- **Snap-Back Physics Implementation:**
  ```typescript
  const triggerSnapBack = useCallback(() => {
    setDragState((prev) => ({
      ...prev,
      isSnappingBack: true,
      currentX: prev.startX,
      currentY: prev.startY,
      targetSeatId: null,
    }));
    window.setTimeout(() => {
      setDragState({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        targetSeatId: null,
        isSnappingBack: false,
      });
    }, 250);
  }, []);
  ```

- **Fulfillment & Service Execution:**
  ```typescript
  const handleSuccessfulDelivery = useCallback(
    (seatId: string, order: PatronSeatOrder) => {
      trashDrink();
      setDrinkBuildCardOpen(false);
      setErrors([]);

      // Finalize attached receipt if open
      if (order.receiptInstanceId && handoffExitRef.current) {
        handoffExitRef.current(order.receiptInstanceId);
      }

      // Mark order as departing
      setSeatOrders((prev) => ({
        ...prev,
        [seatId]: {
          ...prev[seatId],
          orderStatus: 'departing',
          status: 'departing',
        },
      }));

      // Dismiss dialogue if open
      if (activeDialogueSeat === seatId) {
        setActiveDialogueSeat(null);
      }

      // Trigger departure & turnover
      patronLayerRef.current?.departSeat(seatId);
    },
    [trashDrink, activeDialogueSeat]
  );
  ```

---

### 3.3 `src/app/globals.css`
- **Governing Tickets:** `ticket-002.md`, `ticket-003.md`
- **CSS Additions:**
  ```css
  /* Candidate target glow highlight during active drag */
  .pov-patron-sprite--candidate-target {
    filter: drop-shadow(0 0 8px #f7ca18) drop-shadow(0 0 16px rgba(247, 202, 24, 0.75)) !important;
    transform: translate(-50%, -100%) scale(1.04) !important;
    transition: transform 0.15s ease-out, filter 0.15s ease-out;
    z-index: 12 !important;
  }

  /* Active vessel drag and snap-back styles */
  .pov-active-vessel--dragging {
    opacity: 0.95;
    pointer-events: none;
    z-index: 60;
    touch-action: none;
  }

  .pov-active-vessel--snapping {
    transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1) !important;
    pointer-events: none;
  }
  ```

---

## 4. Verification & Validation Protocol
All modifications must be verified against integration tests IT-FS110-01 through IT-FS110-10 detailed in `wayfinder/20261009T232731-335-sqow/tickets/ticket-006.md`.

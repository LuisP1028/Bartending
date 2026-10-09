---
ticket_id: "003"
title: "Recipe Validation Gate & Fail-Fast Snap-Back Physics"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-002.md"]
governing_specification: "functional_specification_110.md"
---

# Ticket 003: Recipe Validation Gate & Fail-Fast Snap-Back Physics

## Question
How does the application evaluate dropped cocktails against a recipient patron's pinned recipe using `RecipeManager.validateDrink`, execute fail-fast snap-back animation physics to return rejected or missed drinks to the live prep mat anchor (`vesselSlotStyle`) while preserving build state, and trigger error-aware HF rejection dialogue without clearing the patron's order?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_110.md`
  - §Desired Functionality (3): "Drop Evaluation: Releasing the dragged drink over a seated patron immediately invokes recipe validation against that specific patron's assigned recipe."
  - §Desired Functionality (3): "Comprehensive Validation Checks: Glass Vessel: Matches required vessel. Glass Rim: Matches required rim. Ingredients & Ratios: All required spirits and mixers present within permitted tolerance ($\pm 0.05\text{oz}$); zero unauthorized overpours. Agitation Method: Matches required technique. Garnishes: All required garnishes present; zero missing or extra invalid garnishes."
  - §Desired Functionality (4): "Validation Failure Behavior: If one or more validation errors exist: 1. The drink must not be consumed or cleared. 2. The drink must visually animate or instantly snap back to its exact original position on the live prep mat (`vesselSlotStyle`). 3. The rejection event must invoke the Hugging Face rejection speech pipeline (FS109), displaying the character's reaction in the dialogue box. 4. The patron remains seated with their order intact, ready for a subsequent delivery attempt."
  - §Desired Functionality (4): "Aborted Drag (Missed Drop): If the user releases the drink outside any seated patron drop zone, the drink snaps back to the mat with zero error penalty or dialogue trigger."
  - §Acceptance Criteria (AC3 & AC4): "AC3: Dropping a drink triggers full ingredient, glass, rim, and garnish validation against that specific patron's assigned recipe. AC4: An invalid drink immediately snaps back to the prep mat intact, triggering character rejection dialogue."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Existing Validation in `src/data/RecipeManager.ts`
`RecipeManager.validateDrink(d: any, t: CocktailRecipe)` already provides itemized diagnostic strings:
- `[GLS] Expected ${t.vessel}, Got ${d.vessel}`
- `[RIM] Expected one of [${validRims.join(', ')}], Got ${userRim}`
- `[ING] ${k}: Expected ${expected}, Got ${got}`
- `[ING] ${k}: Overpour (Not in Recipe)`
- `[MTD] Expected ${t.agitation}, Got ${d.agitation}`
- `[GRN] Missing ${g}`
- `[GRN] Extra/Invalid Garnish Applied: ${g}`
This contract matches FS110 §3 perfectly.

### 2. Current Disconnect Between Validation and Physical Snap-Back
In `src/app/page.tsx` (L467–L476):
When validation fails, `setErrors(discrepancies)` is called and rejection dialogue is requested. However:
1. There is no physical snap-back animation: the vessel remained statically drawn on the mat or jumped abruptly.
2. If a drag is released into empty space (outside any seated patron), there is no return animation to restore the vessel to the mat anchor.
3. User interactions during animation transitions are not guarded by an explicit `isSnappingBack` state.

## Architectural Decisions to Lock

### 1. Two-Tier Drop Dispatch Architecture
When a drag session concludes (`pointerup` or `onDrop`):
1. **Missed Drop (No Candidate Seat):**
   - The user released the vessel over empty stage space or non-patron elements.
   - Execute **Silent Snap-Back Physics**: Animate the vessel from its current `(currentX, currentY)` back to `(startX, startY)` over 220ms with easing `cubic-bezier(0.2, 0.9, 0.3, 1.0)`.
   - Zero error penalty; zero dialogue dispatch; prep mat state is preserved 100%.
2. **Targeted Drop (Candidate Seat Identified):**
   - Retrieve `order = seatOrders[targetSeatId]`. If `!order || order.orderStatus !== 'waiting'`, trigger silent snap-back.
   - Invoke `mode.getRecipeManager().validateDrink(state, order.assignedRecipe)`.
   - **Case A: `discrepancies.length === 0` (Success):**
     - Transition to Ticket 005 (Fulfillment & Departure).
   - **Case B: `discrepancies.length > 0` (Rejection):**
     - Execute **Error Snap-Back Physics**: Animate the vessel back to the live prep mat anchor over 260ms with easing.
     - Keep cocktail build intact in `useSimulation` state (`state.vessel`, ingredients, garnishes remain untouched).
     - Patron remains seated with order intact (`orderStatus: 'waiting'`).
     - Dispatch rejection dialogue request to `/api/dialogue` using existing FS109 contract with itemized `discrepancies`.
     - Display character reaction in retro RPG dialogue box.

### 2. Snap-Back Animation Controller
Define a deterministic animation controller for the drag avatar in `src/app/page.tsx`:
```typescript
interface SnapBackCoords {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  durationMs: number;
}
```
- During snap-back (`isSnappingBack = true`), the position interpolates smoothly:
  ```typescript
  const progress = Math.min(1, (now - startTime) / durationMs);
  const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
  const x = fromX + (toX - fromX) * ease;
  const y = fromY + (toY - fromY) * ease;
  ```
- When `progress === 1`, `isSnappingBack` resets to `false`, `isDragging` resets to `false`, and the live vessel resumes its standard resting mat position (`vesselSlotStyle`).
- Any pointer events on the vessel are ignored while `isSnappingBack === true`.

## Exact Code Contracts & Signatures

### 1. Drop Evaluation Handler
```typescript
async function handleVesselDrop(targetSeatId: string | null) {
  if (!state.vessel || handoffInProgressRef.current) return;

  if (!targetSeatId) {
    // Missed drop: silent snap-back
    triggerSnapBack();
    return;
  }

  const order = seatOrders[targetSeatId];
  if (!order || (order.orderStatus !== 'waiting' && order.orderStatus !== 'ordered')) {
    triggerSnapBack();
    return;
  }

  const discrepancies = mode
    ? mode.getRecipeManager().validateDrink(state, order.assignedRecipe)
    : ['[ERR] No active restaurant mode'];

  if (discrepancies.length === 0) {
    // Perfect build: consume drink and fulfill order
    await handleSuccessfulDelivery(targetSeatId, order);
  } else {
    // Invalid build: trigger snap-back and rejection dialogue
    triggerSnapBack();
    handleRejectionDelivery(targetSeatId, order, discrepancies);
  }
}
```

### 2. Rejection Delivery Flow
```typescript
function handleRejectionDelivery(
  seatId: string,
  order: PatronSeatOrder,
  discrepancies: string[]
) {
  setErrors(discrepancies);
  // Keep order status active so patron remains waiting
  setSeatOrders((prev) => ({
    ...prev,
    [seatId]: {
      ...prev[seatId],
      orderStatus: 'waiting',
      status: 'waiting',
    },
  }));

  // Fetch rejection dialogue from HF service asynchronously
  void fetchRejectionDialogue(seatId, order, discrepancies);
}
```

## Acceptance & Verification Oracles
- Dropping an invalid cocktail build (e.g., incorrect glass, missing garnish, overpoured spirit) does NOT clear the drink from the preparation mat.
- The dragged vessel visually glides back to its anchor position on the prep mat over ~250ms rather than teleporting or disappearing.
- Itemized validation errors are logged in `errors` state and sent to `/api/dialogue`.
- The patron remains seated at their bar stool, with their original order intact and ready for a corrected drink.
- Dropping onto empty space triggers a smooth return to the mat without setting errors or triggering dialogue.

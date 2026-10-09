---
ticket_id: "003"
title: "Seating Transition (`onSitComplete`) Wiring & In-Character Drink Order Generation"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md", "ticket-002.md"]
governing_specification: "functional_specification_109.md"
---

# Ticket 003: Seating Transition (`onSitComplete`) Wiring & In-Character Drink Order Generation

## Question
How does `PatronLayer`'s seating completion event (`onSitComplete`) wire into the main game state (`src/app/page.tsx`), deterministically assign a mode cocktail recipe to the newly seated patron, store seat-isolated order state, and trigger in-character drink order dialogue generation via the HF dialogue service?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_109.md`
  - §Desired Functionality (3): "Automatically fired when a walking patron reaches their assigned bar stool and fires the seating transition event (`onSitComplete`)."
  - §Desired Functionality (3): "Prompt Inputs: Character persona (`personality.txt`), Assigned cocktail recipe details: cocktail name, glass vessel, primary flavor notes, and garnish."
  - §Desired Functionality (3): "Output Requirements: An authentic, in-character line requesting the drink without reciting raw technical recipe schemas (e.g. Caesar: *'BRING ME A NEGRONI IN A CHILLED ROCKS GLASS, WITH A WIDE ORANGE TWIST. PROMPTLY.'* vs. Elder: *'A NEGRONI TONIGHT. AND DON'T FORGET THE BITTERS, KID.'*)."
  - §Edge Cases & Behavioral Boundaries (2 & 4): "When multiple patrons are seated concurrently, each patron's dialogue state must be strictly isolated. An order request or rejection line generated for `bar_seat_1` must never overwrite or collide with the dialogue box of `bar_seat_3`... If a patron begins leaving the bar, any active dialogue box assigned to that patron must immediately close cleanly."
  - §Acceptance Criteria (AC3): "Seating at a bar stool invokes the HF node with the assigned recipe and displays an in-character order string in the dialogue box."

## Codebase Audit & Technical Discrepancy Analysis

### 1. `onSitComplete` Defined but Unwired in `src/app/page.tsx`
In `src/components/PatronLayer.tsx` (L67–L72, L379–L381), `PatronLayer` defines:
```typescript
type PatronLayerProps = {
  // ...
  onSitComplete?: (info: {
    instanceKey: string;
    characterId: string;
    seatId: string;
  }) => void;
};
// ...
for (const ev of sits) {
  onSitCompleteRef.current?.(ev);
}
```
However, in `src/app/page.tsx` (L1412–L1421), `PatronLayer` is instantiated without passing the `onSitComplete` prop:
```tsx
<PatronLayer
  seats={barSeatInputs}
  layoutOverrides={patronLayouts}
  editMode={patronEditOpen}
  barCutoffD={pathWithStoredOffset(
    POV_BAR_CUTOFF.zoneId,
    POV_BAR_CUTOFF.d,
    hotspotOffsets
  )}
/>
```
Consequently, when patrons complete their walk and sit down, the game loop discards the event, patrons remain completely mute, and no drink order is registered.

### 2. Disconnected Drink Order State
Currently, recipes in `src/app/page.tsx` are selected exclusively through `ReceiptToolbar` / `ReceiptProvider` buttons (`onGenerate={() => mode.getRecipeManager().getRandomTicket()}`). There is no connection between the physical patrons seated at the bar and the cocktail tickets.

## Architectural Decisions to Lock

### 1. Per-Seat Order State Interface (`src/app/page.tsx`)
- Define state tracking patrons and their orders keyed strictly by `seatId` to preserve multi-seat concurrency isolation:
  ```typescript
  export interface PatronSeatOrder {
    seatId: string;
    characterId: string;
    instanceKey: string;
    recipe: CocktailRecipe;
    orderDialogue: string | null;
    status: 'ordered' | 'served' | 'rejected';
    timestamp: number;
  }
  ```
- In `src/app/page.tsx`, initialize state:
  ```typescript
  const [seatOrders, setSeatOrders] = useState<Record<string, PatronSeatOrder>>({});
  const [activeDialogueSeat, setActiveDialogueSeat] = useState<string | null>(null);
  ```

### 2. Seating Transition Handler (`handlePatronSitComplete`)
- Implement `handlePatronSitComplete` in `src/app/page.tsx`:
  ```typescript
  const handlePatronSitComplete = useCallback(
    async (info: { instanceKey: string; characterId: string; seatId: string }) => {
      const { instanceKey, characterId, seatId } = info;
      const recipe = mode.getRecipeManager().getRandomTicket();
      if (!recipe) return;

      // 1. Register order immediately in seat state
      setSeatOrders((prev) => ({
        ...prev,
        [seatId]: {
          seatId,
          characterId,
          instanceKey,
          recipe,
          orderDialogue: null,
          status: 'ordered',
          timestamp: Date.now(),
        },
      }));

      // 2. Dispatch order dialogue generation request
      try {
        const response = await fetch('/api/dialogue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'order',
            characterId,
            cocktail: {
              name: recipe.name,
              vessel: recipe.vessel,
              garnishes: recipe.garnishes,
              agitation: recipe.agitation,
              flavorNotes: recipe.mappingAudit?.variants?.[0]?.ingredients
                ?.map((i) => i.id)
                .join(', '),
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error('[DIALOGUE_ERROR] Order dialogue generation failed:', errData);
          return;
        }

        const data = await response.json();
        const dialogueText = data.dialogue;

        // 3. Update seat order with received dialogue and activate dialogue display
        setSeatOrders((prev) => {
          if (!prev[seatId] || prev[seatId].instanceKey !== instanceKey) {
            // Patron left or changed before response arrived — discard safely
            return prev;
          }
          return {
            ...prev,
            [seatId]: {
              ...prev[seatId],
              orderDialogue: dialogueText,
            },
          };
        });

        // Activate dialogue view for this seat
        setActiveDialogueSeat(seatId);
      } catch (err) {
        console.error('[DIALOGUE_ERROR] Network failure fetching order dialogue:', err);
      }
    },
    [mode]
  );
  ```

### 3. Wire Callback to `PatronLayer`
- In `src/app/page.tsx`:
  ```tsx
  <PatronLayer
    seats={barSeatInputs}
    layoutOverrides={patronLayouts}
    editMode={patronEditOpen}
    barCutoffD={pathWithStoredOffset(
      POV_BAR_CUTOFF.zoneId,
      POV_BAR_CUTOFF.d,
      hotspotOffsets
    )}
    onSitComplete={handlePatronSitComplete}
  />
  ```

### 4. Premature Departure & Cleanup
- When a patron instance leaves or seats are cleared, remove the corresponding `seatOrders[seatId]` entry.
- If `activeDialogueSeat === seatId`, immediately reset `setActiveDialogueSeat(null)` to dismiss the dialogue window cleanly.

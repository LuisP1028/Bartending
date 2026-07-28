# RE72

In `src/app/page.tsx`:
1. Comment out `<HotspotPlacementEditor … />` and `<PatronPlacementEditor … />` with restore note.
2. Comment out unused imports of those components.
3. Keep offset/layout load state; `editMode={false}` (or constant) for PatronLayer.

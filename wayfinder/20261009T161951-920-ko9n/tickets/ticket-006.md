---
ticket_id: 006
title: "Fixed HUD, Status Element & Receipt Alignment"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-005.md"]
governing_specification: "functional_specification_100.md"
---

# Ticket 006: Fixed HUD, Status Element & Receipt Alignment

## Question
How must on-screen HUD status indicators, the diegetic receipt printer, and live receipt trays in `src/app/page.tsx` and `src/app/gameboy-shell.css` be stabilized so that opening, toggling, or closing equipment drawers produces zero coordinate drift or displacement of HUD elements?

## Context & Specification Grounding
- **Specification:** `functional_specification_100.md` §3 ("Anchored Stage & HUD"), Acceptance Criteria AC6 ("HUD status elements and receipts retain their fixed alignment and positions when equipment drawers are toggled").
- **Current Architecture:**
  1. In `src/app/page.tsx` (lines 774–825), `shellHudNudge` computes offsets (`tx`, `tyTop`, `tyBot`) to counteract stage pan and cover crop.
  2. Because stage pan is locked to `0px` in `ticket-005.md`, `shellHudNudge` is now anchored purely to the fixed static geometry of the stage relative to the playfield glass.
  3. Opening or closing drawers must never trigger dynamic HUD repositioning or layout thrashing.
  4. HUD elements include: validation banner (`VALIDATION PASSED!`), receipt printer and paper tray (`ReceiptStageOverlay`), and jigger pour controls (`JiggerPourControl`).

## Architectural Decisions to Lock
1. **Stabilize `shellHudNudge` Effect:**
   - Decouple `shellHudNudge` calculation from `openCategory`, `activeZoneId`, and `frameStyle`.
   - The HUD nudge should only re-measure on viewport resize or initial mount, completely ignoring drawer toggle events.
2. **Deterministic Alignment of Receipt Printer & Papers:**
   - The receipt printer mask (`.receipt-printer-mask`) and hardware cluster (`.receipt-hardware-cluster`) remain anchored to the top-right corner of the glass playfield.
   - Live receipt papers on the counter mat remain anchored to stage coordinates.
3. **Validation Banner & Status Stability:**
   - HUD banners (e.g. DrinkBuildCard, validation toasts) remain in fixed viewport/stage alignment unaffected by drawer state.

## Scope & Invariant Guardrails
- **In Scope:** `shellHudNudge` calculation and HUD styling in `src/app/page.tsx` and `src/app/gameboy-shell.css`.
- **Out of Scope:** Drink validation logic or receipt pricing algorithms (unchanged).

---

## Resolution

### 1. Stabilize `shellHudNudge` Dependencies in `src/app/page.tsx`
In `src/app/page.tsx` (lines 778–825):
Update the `useEffect` for `shellHudNudge` so that its dependencies do *not* include `openCategory`, `activeZoneId`, or `frameStyle`:
```typescript
/**
 * FS75 / FS100: Keep jigger + receipt printer chrome anchored to the visible glass viewport.
 * Static geometry calculation: does NOT fluctuate when drawers are opened or closed.
 */
useEffect(() => {
  let cancelled = false;
  const updateHudNudge = () => {
    if (cancelled) return;
    const stage = povStageRef.current;
    if (!stage) {
      setShellHudNudge({ tx: 0, tyTop: 0, tyBot: 0 });
      return;
    }
    const section = stage.parentElement;
    if (
      !section ||
      !section.classList.contains('pov-shell-section') ||
      !section.closest('.gb-shell__playfield')
    ) {
      setShellHudNudge({ tx: 0, tyTop: 0, tyBot: 0 });
      return;
    }
    const S = section.getBoundingClientRect();
    const T = stage.getBoundingClientRect();
    if (S.width < 8 || S.height < 8 || T.width < 8 || T.height < 8) return;
    const next = {
      tx: S.right - T.right,
      tyTop: S.top - T.top,
      tyBot: S.bottom - T.bottom,
    };
    setShellHudNudge((prev) =>
      prev.tx === next.tx &&
      prev.tyTop === next.tyTop &&
      prev.tyBot === next.tyBot
        ? prev
        : next
    );
  };

  const id = requestAnimationFrame(() => {
    requestAnimationFrame(updateHudNudge);
  });
  const t = window.setTimeout(updateHudNudge, 60);
  window.addEventListener('resize', updateHudNudge);
  return () => {
    cancelled = true;
    cancelAnimationFrame(id);
    window.clearTimeout(t);
    window.removeEventListener('resize', updateHudNudge);
  };
}, []); // Empty dependencies: only re-measures on window resize or initial mount
```

### 2. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Complete set resolved; ready for map synthesis and matrix authoring.

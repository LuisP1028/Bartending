---
ticket_id: 005
title: "In-Place Drawer & Carousel Presentation (Zero Stage Translation)"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-004.md"]
governing_specification: "functional_specification_100.md"
---

# Ticket 005: In-Place Drawer & Carousel Presentation (Zero Stage Translation)

## Question
How must stage panning, carousel frame positioning, and stage wrapper styles in `src/app/page.tsx` and `src/app/gameboy-shell.css` be modified to guarantee that opening, toggling, or closing equipment, glassware, and bottle drawers results in strictly `0px` displacement of the underlying bar stage?

## Context & Specification Grounding
- **Specification:** `functional_specification_100.md` §3 ("Stationary Canvas", "In-Place Drawer Presentation"), Acceptance Criteria AC5 ("Opening glassware, bottles, or tool drawers results in zero displacement (`0px` translation) of the underlying bar stage"), Edge Case 3 ("Rapid Drawer Toggling: Repeatedly opening, switching between, and closing equipment drawers must leave the bar stage strictly at its baseline origin without cumulative coordinate drift").
- **Current Defect:**
  1. In `src/app/page.tsx` (lines 85–120), `PovStageShell` accepts `stagePan?: { x: number; y: number }` and sets:
     ```typescript
     const pan = stagePan ?? { x: 0, y: 0 };
     const transform = pan.x !== 0 || pan.y !== 0 ? `translate(${pan.x}px, ${pan.y}px)` : undefined;
     ```
  2. In `src/app/page.tsx` (lines 832–890), a `useEffect` dynamically calculates `shellStagePan` whenever a carousel is opened, measuring the carousel frame and shifting the stage using `computePanFromNeutral()` to nudge the stage up or sideways by `dx, dy`.
  3. When an overlay closes, `setShellStagePan({ x: 0, y: 0 })` resets the pan, causing the stage to jolt back to neutral.
  4. In `src/app/gameboy-shell.css` (lines 426–429), `.gb-shell__playfield .pov-stage` specifies `transition: transform 0.22s ease-out; will-change: transform;`.

## Architectural Decisions to Lock
1. **Permanent Severing of Stage Translation:**
   - Remove or neutralize `shellStagePan` in `src/app/page.tsx`. Lock `stagePan` to `{ x: 0, y: 0 }` so `PovStageShell` always renders with `transform: none` or no translate transform.
   - Remove the dynamic stage panning effect (`computePanFromNeutral`) that displaced the stage on carousel activation.
2. **In-Place Drawer Presentation:**
   - `CategoryOverlay` continues rendering in-place directly on top of the active workstation hotspot polygon using its calculated `frameStyle` (`left`, `top`, `width`, `height`, `transform`).
   - The bar canvas (`/OBELISCO_POV.jpg`), stools, patrons, and stationary service hardware remain 100% stationary at all times.
3. **CSS Transition Neutralization:**
   - In `src/app/gameboy-shell.css`, remove `transition: transform 0.22s ease-out` and `will-change: transform` on `.gb-shell__playfield .pov-stage` to prevent any residual transform interpolation.

## Scope & Invariant Guardrails
- **In Scope:** `shellStagePan` state and effect in `src/app/page.tsx`, `PovStageShell` transform style, and `.gb-shell__playfield .pov-stage` in `src/app/gameboy-shell.css`.
- **Out of Scope:** Diegetic HUD alignment and receipt positioning (handled in `ticket-006.md`).

---

## Resolution

### 1. Lock `stagePan` to `0px` in `src/app/page.tsx`
1. In `PovStageShell` (lines 106–111 in `src/app/page.tsx`):
   Set `transform: undefined` or eliminate the inline transform:
   ```typescript
   function PovStageShell({
     openCategory,
     povStageRef,
     shellHudNudge,
     children,
   }: {
     openCategory: CategoryKey | null;
     povStageRef: React.RefObject<HTMLDivElement | null>;
     stagePan?: { x: number; y: number };
     shellHudNudge?: { tx: number; tyTop: number; tyBot: number };
     children: React.ReactNode;
   }) {
     const { anyInspected } = useReceiptStageFlags();
     const overflow =
       openCategory !== null
         ? 'hidden'
         : anyInspected
           ? 'visible'
           : 'hidden';

     const hud = shellHudNudge ?? { tx: 0, tyTop: 0, tyBot: 0 };
     const style = {
       overflow,
       transform: 'none',
       ['--shell-hud-tx' as string]: `${hud.tx}px`,
       ['--shell-hud-ty-top' as string]: `${hud.tyTop}px`,
       ['--shell-hud-ty-bot' as string]: `${hud.tyBot}px`,
     } as React.CSSProperties;

     return (
       <div
         ref={povStageRef}
         className={
           openCategory !== null
             ? 'pov-stage pov-stage--carousel-open'
             : anyInspected
               ? 'pov-stage pov-stage--receipt-inspect'
               : 'pov-stage'
         }
         style={style}
       >
         {children}
       </div>
     );
   }
   ```
2. In lines 832–890 of `src/app/page.tsx`:
   Remove or deactivate the `useEffect` that updates `shellStagePan`:
   ```typescript
   useEffect(() => {
     // FS100: Zero Stage Translation — bar stage remains strictly stationary on interaction
     setShellStagePan({ x: 0, y: 0 });
   }, [openCategory]);
   ```

### 2. Neutralize CSS Transform on `.pov-stage` in `src/app/gameboy-shell.css`
Update lines 414–430 of `src/app/gameboy-shell.css`:
```css
.gb-shell__playfield .pov-stage {
  position: relative;
  flex: 0 0 auto;
  aspect-ratio: 1184 / 880;
  width: max(100cqw, calc(100cqh * 1184 / 880));
  height: max(100cqh, calc(100cqw * 880 / 1184));
  max-width: none;
  max-height: none;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  transform: none !important;
  transition: none;
}
```

### 3. Status & Downstream Unblocking
- **Claimed by:** `wayfinder-read-and-plan`
- **Resolution Status:** `resolved`
- **Downstream Unblocking:** Unblocks Ticket 006.

# RE102 — Master Component-to-Edit Matrix: Mode Selection Menu Landscape Containment & Orientation Parity

**Spec:** [functional_specification_102.md](./functional_specification_102.md)  
**Map:** [wayfinder/20261009T164539-008-wzck/map.md](./wayfinder/20261009T164539-008-wzck/map.md)  
**Tickets:**
- [Ticket 001: Mode Selection Menu Console Viewport Containment & Aspect-Ratio Sizing](./wayfinder/20261009T164539-008-wzck/tickets/ticket-001.md)
- [Ticket 002: Mode Selection Shell Slot Framing, Alignment & Letterbox Parity](./wayfinder/20261009T164539-008-wzck/tickets/ticket-002.md)
- [Ticket 003: Mode Selection Playfield Centering & Dynamic Resize Pointer Synchronization](./wayfinder/20261009T164539-008-wzck/tickets/ticket-003.md)

---

## Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `src/app/gameboy-shell.css` | L880–L940: `.boot-intro .gb-shell`, `.main-menu .gb-shell` | `ticket-001.md` | Proportional containment scaling & unification | Eliminate `max(...)` cover sizing, `transform: translateY(-4%)`, and `max-width: none`; enforce `width: min(100cqw, calc(100cqh * 422 / 697)); height: min(100cqh, calc(100cqw * 697 / 422)); max-width: 100%; max-height: 100%; transform: none; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);`; provide `@supports not (width: 1cqw)` viewport unit fallbacks. |
| `src/app/gameboy-shell.css` | L841–L872: `.boot-intro .gb-shell-slot`, `.main-menu .gb-shell-slot` | `ticket-002.md` | Outer slot containment, centering & letterbox parity | Eliminate `width: auto; height: auto; background: #eee;` on `.main-menu .gb-shell-slot`; unify with `.boot-intro .gb-shell-slot` to enforce `position: absolute; inset: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; container-type: size; container-name: gb-shell-slot; overflow: hidden; background: #111; z-index: 1;`. |
| `src/components/MainMenu.module.css` | L25–L44: `.synthwaveNav`, `.menuRoot` | `ticket-003.md` | Playfield interior containment & centering verification | Confirm `.synthwaveNav` preserves `max-width: 94%; max-height: 92%; min-width: min(78%, 260px);` centered within `.menuRoot`, ensuring 100% unclipped visibility of "MODE SELECTION" header, dual mode logos, and navigation options. |
| `src/components/MainMenu.tsx` | L147–L151: `onResize` listener & `snapPointer` | `ticket-003.md` | Dynamic resize pointer recalibration verification | Confirm `window.addEventListener('resize', ...)` executes `snapToCurrent(true)` synchronously updating `--target-y` across window dimension and orientation changes without coordinate drift. |

---

## Detailed Step-by-Step Edit Instructions

### 1. `src/app/gameboy-shell.css`: Slot Framing and Letterbox Parity (`ticket-002.md`)

- **Lines 841–872:**
  Replace:
  ```css
  .boot-intro .boot-intro__slot.gb-shell-slot,
  .boot-intro .gb-shell-slot {
    position: absolute;
    inset: 0;
    flex: none;
    min-height: 0;
    min-width: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    container-type: size;
    container-name: gb-shell-slot;
    overflow: hidden;
    background: #111;
    z-index: 1;
  }

  .main-menu .main-menu__slot.gb-shell-slot,
  .main-menu .gb-shell-slot {
    position: absolute;
    inset: 0;
    flex: none;
    min-height: 0;
    min-width: 0;
    width: auto;
    height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    container-type: size;
    container-name: gb-shell-slot;
    overflow: hidden;
    background: #eee;
    z-index: 1;
  }
  ```
  With:
  ```css
  .boot-intro .boot-intro__slot.gb-shell-slot,
  .boot-intro .gb-shell-slot,
  .main-menu .main-menu__slot.gb-shell-slot,
  .main-menu .gb-shell-slot {
    position: absolute;
    inset: 0;
    flex: none;
    min-height: 0;
    min-width: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    container-type: size;
    container-name: gb-shell-slot;
    overflow: hidden;
    background: #111;
    z-index: 1;
  }
  ```

### 2. `src/app/gameboy-shell.css`: Proportional Console Containment Scaling (`ticket-001.md`)

- **Lines 880–940:**
  Replace:
  ```css
  .boot-intro .gb-shell {
    position: relative;
    flex: 0 0 auto;
    display: block;
    margin: 0;
    box-sizing: border-box;
    aspect-ratio: 422 / 697;
    width: min(100cqw, calc(100cqh * 422 / 697));
    height: min(100cqh, calc(100cqw * 697 / 422));
    max-width: 100%;
    max-height: 100%;
    background: #eee;
    border-radius: 2.37% 2.37% 8.61% 2.37%;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
    container-type: size;
    container-name: gb-shell;
    overflow: hidden;
    transform: none;
  }

  @supports not (width: 1cqw) {
    .boot-intro .gb-shell {
      width: min(100vw, calc(100dvh * 422 / 697));
      height: min(100dvh, calc(100vw * 697 / 422));
      max-width: 100%;
      max-height: 100%;
      aspect-ratio: 422 / 697;
    }
  }

  .main-menu .gb-shell {
    position: relative;
    flex: 0 0 auto;
    display: block;
    margin: 0;
    box-sizing: border-box;
    aspect-ratio: 422 / 697;
    width: max(100cqw, calc(100cqh * 422 / 697));
    height: max(100cqh, calc(100cqw * 697 / 422));
    max-width: none;
    max-height: none;
    background: #eee;
    border-radius: 2.37% 2.37% 8.61% 2.37%;
    box-shadow: none;
    container-type: size;
    container-name: gb-shell;
    overflow: hidden;
    transform: translateY(-4%);
  }
  ```
  With:
  ```css
  .boot-intro .gb-shell,
  .main-menu .gb-shell {
    position: relative;
    flex: 0 0 auto;
    display: block;
    margin: 0;
    box-sizing: border-box;
    aspect-ratio: 422 / 697;
    width: min(100cqw, calc(100cqh * 422 / 697));
    height: min(100cqh, calc(100cqw * 697 / 422));
    max-width: 100%;
    max-height: 100%;
    background: #eee;
    border-radius: 2.37% 2.37% 8.61% 2.37%;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
    container-type: size;
    container-name: gb-shell;
    overflow: hidden;
    transform: none;
  }

  @supports not (width: 1cqw) {
    .boot-intro .gb-shell,
    .main-menu .gb-shell {
      width: min(100vw, calc(100dvh * 422 / 697));
      height: min(100dvh, calc(100vw * 697 / 422));
      max-width: 100%;
      max-height: 100%;
      aspect-ratio: 422 / 697;
    }
  }
  ```

### 3. Verification & Invariants Preservation (`ticket-003.md`)
- Verify that `.main-menu__playfield` interior layout in `src/components/MainMenu.module.css` and pointer calibration in `src/components/MainMenu.tsx` require zero code changes, as proportional scaling of `gb-shell` natively preserves their geometry and dynamic resize handlers.

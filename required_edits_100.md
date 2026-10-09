# RE100 — Master Component-to-Edit Matrix: Core UX and Stage Stability

**Spec:** [functional_specification_100.md](./functional_specification_100.md)  
**Map:** [wayfinder/20261009T161951-920-ko9n/map.md](./wayfinder/20261009T161951-920-ko9n/map.md)  
**Tickets:**
- [Ticket 001: Boot Console Viewport Containment & Proportional Sizing](./wayfinder/20261009T161951-920-ko9n/tickets/ticket-001.md)
- [Ticket 002: Boot Video Legibility & Playfield Media Containment](./wayfinder/20261009T161951-920-ko9n/tickets/ticket-002.md)
- [Ticket 003: Patron Motion Lifecycle & Deterministic Walk Termination](./wayfinder/20261009T161951-920-ko9n/tickets/ticket-003.md)
- [Ticket 004: Patron Seated State Persistence & Asset Switching](./wayfinder/20261009T161951-920-ko9n/tickets/ticket-004.md)
- [Ticket 005: In-Place Drawer & Carousel Presentation (Zero Stage Translation)](./wayfinder/20261009T161951-920-ko9n/tickets/ticket-005.md)
- [Ticket 006: Fixed HUD, Status Element & Receipt Alignment](./wayfinder/20261009T161951-920-ko9n/tickets/ticket-006.md)

---

## Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `src/app/gameboy-shell.css` | L874–L894: `.boot-intro .gb-shell` | `ticket-001.md` | Proportional containment scaling | Decouple from `.main-menu`; enforce `width: min(100cqw, calc(100cqh * 422 / 697)); height: min(100cqh, calc(100cqw * 697 / 422)); max-width: 100%; max-height: 100%; transform: none;` |
| `src/app/gameboy-shell.css` | L841–L860: `.boot-intro .gb-shell-slot` | `ticket-001.md` | Centered shell slot backdrop | Ensure `display: flex; align-items: center; justify-content: center; background: #111;` |
| `src/app/gameboy-shell.css` | L1041–L1056: `.boot-intro__video` | `ticket-002.md` | Media contain fitting | Replace `object-fit: cover` with `object-fit: contain; background: #000;` |
| `src/components/PatronLayer.tsx` | L294–L334: `tick()` loop | `ticket-003.md` | Deterministic walk termination | Self-healing clock on `!clock`; calculate `t = Math.min(1, elapsed / walkMs)`; transition definitively to `phase: 'seated'` upon arrival at stool |
| `src/components/PatronLayer.tsx` | L416–L450: `trySpawn()` | `ticket-003.md` | Pre-admission clock attachment | Synchronously register clock in `motionClockRef` prior to/during admission; delete on collision/rejection |
| `src/components/PatronLayer.tsx` | L500–L537: `instances.map()` | `ticket-004.md` | Seated asset integrity | Guarantee `isSeated` displays `inst.def.sitSrc` and `inst.layout.sitDisplayWidthPct` at `inst.sitPoint` |
| `src/app/page.tsx` | L106–L120: `PovStageShell` | `ticket-005.md` | Stage translation elimination | Lock `transform: 'none'`; eliminate dynamic `translate(${pan.x}px, ${pan.y}px)` |
| `src/app/page.tsx` | L832–L890: stage pan `useEffect` | `ticket-005.md` | Lock `shellStagePan` to `0px` | Always set `shellStagePan({ x: 0, y: 0 })` on carousel open/close |
| `src/app/gameboy-shell.css` | L414–L430: `.gb-shell__playfield .pov-stage` | `ticket-005.md` | Neutralize transform styling | Apply `transform: none !important; transition: none;` on `.pov-stage` |
| `src/app/page.tsx` | L778–L825: `shellHudNudge` `useEffect` | `ticket-006.md` | Stabilize HUD anchor positions | Decouple dependencies to `[]` (mount and resize only); eliminate HUD jitter on drawer toggle |

---

## Detailed Step-by-Step Edit Instructions

### 1. `src/app/gameboy-shell.css`: Decouple and Contain Boot Console Housing
- **Lines 874–894:**
  Replace:
  ```css
  .boot-intro .gb-shell,
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

- **Lines 841–860:**
  Ensure `.boot-intro .boot-intro__slot.gb-shell-slot, .boot-intro .gb-shell-slot` specifies:
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
  ```

- **Lines 1041–1056:**
  Replace:
  ```css
  .boot-intro__video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    object-fit: cover;
    object-position: center;
    background: #000;
    pointer-events: none;
    -webkit-appearance: none;
    appearance: none;
  }
  ```
  With:
  ```css
  .boot-intro__video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    object-fit: contain;
    object-position: center;
    background: #000;
    pointer-events: none;
    -webkit-appearance: none;
    appearance: none;
  }
  ```

- **Lines 414–430:**
  Replace:
  ```css
  .gb-shell__playfield .pov-stage {
    position: relative;
    flex: 0 0 auto;
    aspect-ratio: 1184 / 880;
    /* Cover nest: largest 1184∶880 that fully covers the playfield section */
    width: max(100cqw, calc(100cqh * 1184 / 880));
    height: max(100cqh, calc(100cqw * 880 / 1184));
    max-width: none;
    max-height: none;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    /* FS74: smooth pan when selected carousel was off-glass */
    transition: transform 0.22s ease-out;
    will-change: transform;
  }
  ```
  With:
  ```css
  .gb-shell__playfield .pov-stage {
    position: relative;
    flex: 0 0 auto;
    aspect-ratio: 1184 / 880;
    /* Cover nest: largest 1184∶880 that fully covers the playfield section */
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

---

### 2. `src/components/PatronLayer.tsx`: Deterministic Walk Lifecycle & Seating
- **Lines 294–334:**
  Replace the inner tick mapper:
  ```typescript
            const next = prev.map((p) => {
              if (p.phase !== 'walking') return p;

              let clock = motionClockRef.current.get(p.instanceKey);
              if (!clock) {
                const walkDuration = Math.max(400, p.layout.walkMs || 2400);
                const frameDuration = Math.max(60, p.def.walkFrameMs || 120);
                clock = {
                  startMs: now,
                  walkMs: walkDuration,
                  frameMs: frameDuration,
                };
                motionClockRef.current.set(p.instanceKey, clock);
              }

              const elapsed = Math.max(0, now - clock.startMs);
              const walkMs = clock.walkMs > 0 ? clock.walkMs : 2400;
              const t = Math.min(1, elapsed / walkMs);
              const nFrames = Math.max(p.def.walkFrames.length, 1);
              const frameMs = clock.frameMs > 0 ? clock.frameMs : 120;
              const frameIndex = Math.floor(elapsed / frameMs) % nFrames;

              if (t < 1) {
                stillWalking = true;
                if (
                  Math.abs(p.t - t) < 0.0001 &&
                  p.walkFrameIndex === frameIndex
                ) {
                  return p;
                }
                changed = true;
                return { ...p, t, walkFrameIndex: frameIndex };
              }

              // Definitive seating transition
              changed = true;
              motionClockRef.current.delete(p.instanceKey);
              pendingSitRef.current.push({
                instanceKey: p.instanceKey,
                characterId: p.characterId,
                seatId: p.seatId,
              });
              return {
                ...p,
                phase: 'seated' as const,
                t: 1,
                flipX: false,
                walkFrameIndex: 0,
              };
            });
  ```

- **Lines 415–450 in `trySpawn`:**
  Pre-set the clock before `flushSync` and clean up on rejection:
  ```typescript
      let accepted = false;

      motionClockRef.current.set(instanceKey, {
        startMs: performance.now(),
        walkMs,
        frameMs,
      });

      // flushSync: functional claim runs now so state updates synchronously
      flushSync(() => {
        setInstances((prev) => {
          if (
            prev.length >= seatList.length ||
            prev.some((p) => p.seatId === built.seatId) ||
            prev.some((p) => p.characterId === characterId) ||
            prev.some((p) => p.instanceKey === instanceKey)
          ) {
            instancesRef.current = prev;
            return prev;
          }

          accepted = true;
          const next = [...prev, nextInst];
          instancesRef.current = next;
          return next;
        });
      });

      if (!accepted) {
        motionClockRef.current.delete(instanceKey);
        return;
      }

      ensureMotionDriver();
  ```

- **Lines 515–536:**
  Ensure seated patrons render with stationary posture and attributes:
  ```typescript
            <img
              key={inst.instanceKey}
              className={`pov-patron-sprite${
                isSeated ? ' pov-patron-sprite--sit' : ' pov-patron-sprite--walk'
              }`}
              src={src}
              alt=""
              draggable={false}
              data-character-id={inst.characterId}
              data-seat-id={inst.seatId}
              data-phase={inst.phase}
              style={{
                left: `${pct.leftPct}%`,
                top: `${pct.topPct}%`,
                width: `${widthPct}%`,
                transform: `translate(-50%, -100%)${
                  inst.flipX ? ' scaleX(-1)' : ''
                }`,
              }}
            />
  ```

---

### 3. `src/app/page.tsx`: In-Place Drawers and Anchored HUD Stability
- **Lines 106–121 in `PovStageShell`:**
  Replace:
  ```typescript
    const pan = stagePan ?? { x: 0, y: 0 };
    const transform =
      pan.x !== 0 || pan.y !== 0
        ? `translate(${pan.x}px, ${pan.y}px)`
        : undefined;

    const hud = shellHudNudge ?? { tx: 0, tyTop: 0, tyBot: 0 };
    const style = {
      overflow,
      transform,
      // FS75: glass-relative HUD offsets for jigger / printer chrome
      ['--shell-hud-tx' as string]: `${hud.tx}px`,
      ['--shell-hud-ty-top' as string]: `${hud.tyTop}px`,
      ['--shell-hud-ty-bot' as string]: `${hud.tyBot}px`,
    } as React.CSSProperties;
  ```
  With:
  ```typescript
    const hud = shellHudNudge ?? { tx: 0, tyTop: 0, tyBot: 0 };
    const style = {
      overflow,
      transform: 'none',
      ['--shell-hud-tx' as string]: `${hud.tx}px`,
      ['--shell-hud-ty-top' as string]: `${hud.tyTop}px`,
      ['--shell-hud-ty-bot' as string]: `${hud.tyBot}px`,
    } as React.CSSProperties;
  ```

- **Lines 832–890:**
  Deactivate stage panning on carousel activation:
  ```typescript
    /**
     * FS100: Zero Stage Translation — bar stage remains strictly stationary on interaction.
     */
    useEffect(() => {
      setShellStagePan({ x: 0, y: 0 });
    }, [openCategory]);
  ```

- **Lines 778–825:**
  Decouple `shellHudNudge` from drawer toggle events:
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
    }, []);
  ```

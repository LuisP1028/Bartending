# FS85 — Independent walk→sit for every living patron (multi-instance motion)

## Purpose

When multiple characters are on the bar, **each** must complete entry **walk** and **sit**. The system must not leave all but one patron frozen. The motion design must remain correct as seat count or concurrent walkers grow (future-proof).

**Maps:** [wayfinder/map-068.md](./wayfinder/map-068.md), [mobile-render-debug/map-074.md](./mobile-render-debug/map-074.md)  
**Prior:** FS83 exclusivity, FS84 unfreeze (single-patron motion start)

---

## Glossary

`LANGUAGE.md` terms apply.

---

## Current failure

- Multi-spawn and exclusivity largely work.  
- **Only one** patron consistently animates walk and reaches sit.  
- Others stay stuck (spawn pose / no sit).

---

## Desired `{functionality}`

### Per-patron lifecycle (every living instance)

1. **Spawn** into `walking` at entry with a path to its exclusive seat.  
2. **Walk:** path progress `t` advances 0→1 over that patron’s walk duration; walk frames cycle.  
3. **Sit:** at `t = 1`, phase becomes `seated`, sit art, sit position; flip rules as today.  
4. Lifecycles are **independent**: patron B’s motion must not cancel, reset, or overwrite patron A’s progress or phase.

### Multi-patron concurrency

- If K patrons are walking at once (1 ≤ K ≤ seat count), **all K** advance every frame until each sits.  
- Seated patrons stay seated while others still walk.  
- FS83 rules still hold: living count ≤ seats; unique seat; unique character id.

### Future-proof requirements

- Motion must not depend on “only one rAF owner of the whole array via last write wins.”  
- Adding more seats or longer walks must not reintroduce “one winner” races.  
- A single shared motion driver (or equivalent composed updates) must scale with living count.

### Unchanged

- Auto-fill cadence and exclusivity (FS83).  
- Glass/shell/menu.  
- Walk-away / order print (still out of scope unless already present).

---

## Correct required outputs

| ID | Observable |
|----|------------|
| O1 | With 2+ free seats, at least 2 patrons eventually **sit** (not just one). |
| O2 | While two walk concurrently, **both** move along their paths (not one frozen). |
| O3 | A patron that reaches sit **stays** seated while another finishes walking. |
| O4 | FS83: no double seat, no clone id, count ≤ seats. |
| O5 | Full bar (4 unique) can fill with **four** seated (or walking-then-seated) patrons over time. |

---

## Explicit non-goals

- Coding in this document.  
- Redesigning spawn art or path geometry.  
- Full FS51 leave/receipt unless required for motion.

---

## Handoff

| Artifact | Path |
|----------|------|
| RE85 | `required_edits_85.md` |
| Context | `aaa84/` |

**DO NOT CODE** until operator authorizes after RE85 sufficiency.

# FS84 — Multi-patron walk and sit motion (unfreeze)

## Purpose

Spawned patrons must **walk** to their assigned seat and then **sit**. They must not remain frozen at the spawn position after auto-fill.

## Correct required outputs

- O1: After spawn, position advances along entry path.  
- O2: Walk frames cycle during walk.  
- O3: On path complete, phase is seated with sit sprite at seat.  
- O4: FS83 exclusivity still holds (capacity, one seat, no clones).

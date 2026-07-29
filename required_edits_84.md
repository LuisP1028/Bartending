# RE84 — Unfreeze multi-patron walk/sit

## Cause

1. `instancesRef.current = instances` on every render overwrote optimistic ref updates with stale React state.  
2. `runWalkMotion` only started after a deferred rAF check that often failed → `t` stuck at 0.

## Fix

1. Remove render-time ref overwrite; commit only via `commitInstances`.  
2. Claim on ref, then start `runWalkMotion` immediately.  
3. Drive path `t` from wall-clock rAF until seated.

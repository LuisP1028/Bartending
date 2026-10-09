# RE85 — Future-proof multi-patron walk/sit (fix one-winner freeze)

**DO NOT CODE until operator authorizes.**  
**Spec:** [functional_specification_85.md](./functional_specification_85.md)  
**Maps:** [wayfinder/map-068.md](./wayfinder/map-068.md), [mobile-render-debug/map-074.md](./mobile-render-debug/map-074.md)  
**Primary file:** `src/components/PatronLayer.tsx`

---

## 0. Goals

| ID | Check |
|----|--------|
| O1–O3 | Every living patron walks and sits; concurrent walkers all move |
| O4 | Exclusivity unchanged |
| O5 | Four seats can all complete sit |
| F1 | No per-instance full-array last-write-wins |

---

## 1. Root cause (implementer)

Current pattern (must remove):

```text
per instanceKey: rAF loop {
  prev = instancesRef.current   // snapshot
  next = copy + mutate one
  commitInstances(next)         // clobbers other in-flight updates
}
+ setInterval walk frames also commitInstances(full map)
```

Concurrent snapshots → **last writer wins** → only one patron’s `t`/`phase` sticks.

---

## 2. Target architecture

### 2.1 Per-instance motion clock (data only)

Keep a ref map, e.g.:

```ts
// instanceKey → { startMs: number; walkMs: number }
motionClockRef: Map<string, { startMs: number; walkMs: number }>
```

On successful spawn (walking claim): `motionClockRef.set(key, { startMs: performance.now(), walkMs })`.

On sit (or remove): `motionClockRef.delete(key)`.

### 2.2 Single rAF driver (required)

While **any** living patron has `phase === 'walking'` (and later `leaving`):

1. Ensure **one** looped `requestAnimationFrame` is scheduled (guard with `driverRafRef` / `driverRunningRef`).  
2. Each frame:
   - `now = performance.now()`
   - `setInstances(prev => { ... })` **functional only**:
     - For each `prev` item with `phase === 'walking'`:
       - Look up clock; if missing, skip or treat as t=0.  
       - `t = min(1, (now - startMs) / walkMs)`  
       - If `t < 1`: `{ ...p, t }` (optionally bump walkFrameIndex from time or separate field).  
       - If `t >= 1`: `{ ...p, phase: 'seated', t: 1, flipX: false, walkFrameIndex: 0 }`; collect sit-complete events.  
     - Return new array if any change; else `prev`.  
   - Sync `instancesRef.current` **inside** the functional updater when returning a new array.  
   - Fire `onSitComplete` for newly seated keys **after** updater (queue from updater via side array, then call).  
   - If any still walking, schedule next rAF; else stop driver.

**Do not** call `commitInstances([...stale])` from multiple rAF closures.

### 2.3 Spawn path

```ts
setInstances(prev => {
  // re-check capacity, free seat, free character on prev
  // append nextInst
  instancesRef.current = next;
  return next;
});
motionClockRef.set(instanceKey, { startMs: performance.now(), walkMs });
ensureMotionDriver(); // starts single loop if not running
```

Use functional spawn even if you also update a ref for exclusivity reads; exclusivity reads should prefer latest `instancesRef` updated only inside updaters, **or** derive free seats inside the functional spawn updater only (safest).

**Recommended exclusivity:** perform free-seat / free-character / append **entirely inside** one `setInstances(prev => …)` so claim is atomic w.r.t. React. Then set clock + ensure driver.

### 2.4 Walk frames

**Option A (preferred):** In the single driver, set  
`walkFrameIndex = floor((now - startMs) / frameMs) % frameCount` for walking patrons (time-based, no second writer).

**Option B:** One interval with  
`setInstances(prev => prev.map(p => p.phase==='walking' ? { ...p, walkFrameIndex: (p.walkFrameIndex+1)%n } : p))`  
and **never** copy path `t` from a stale external snapshot.

### 2.5 Remove

- `runWalkMotion` per-key rAF chains.  
- `rafByKey` multi-loop maps (optional keep only driver id).  
- `commitInstances(next)` that assigns ref from an arbitrary full array built outside functional update (replace with functional helper).

### 2.6 Edit mode / unmount

- Clear clocks, cancel driver rAF, clear instances (functional or direct empty + ref).

---

## 3. Future-proof checklist (must pass review)

| Check | Pass condition |
|-------|----------------|
| One driver | At most one rAF loop owns path progression |
| Compose | All list mutations via `setInstances(prev => …)` or single-threaded driver body |
| N walkers | N=2,3,4 all reach sit in manual test |
| No clobber | Seated patron not reverted to walking by another’s update |
| Extensible | Comment: leave phase can join same driver later |

---

## 4. Files

| File | Action |
|------|--------|
| `src/components/PatronLayer.tsx` | Replace multi-rAF commits with single driver + functional updates |
| `src/data/patronServiceConstants.ts` | Unchanged unless needed |
| `src/app/page.tsx` | Unchanged if props API stable |

---

## 5. Implementation order

1. Add `motionClockRef` + `ensureMotionDriver` / `stopMotionDriver`.  
2. Rewrite spawn to functional claim + clock + ensure driver.  
3. Delete per-key `runWalkMotion` loops.  
4. Fold walk frames into driver (Option A) or safe interval (B).  
5. Manual test O1–O5.  
6. Build.

---

## 6. Manual tests

| Step | Expect |
|------|--------|
| Load play; wait for 2+ spawns | Both walk |
| Wait walkMs | Both sit |
| Wait until 4 | Four unique seated (or last still walking then sit) |
| Watch concurrent pair | Neither freezes mid-path permanently |
| Seat ids / character ids | Unique in DOM `data-*` |

---

## 7. Out of scope

- Coding before authorize  
- Leave / receipts  
- Deploy until implement session asks  

---

## 8. Handoff

When authorized: implement **only** RE85 against FS85.

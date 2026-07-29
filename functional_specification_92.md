# FS92 — Game Boy shell navigation: B = back

## Purpose

Shell **B** (and equivalent back) must follow a **consistent Game Boy navigation contract**: **back to the previous screen**, not a hard-coded jump into play while a nested menu flow is open.

## Baseline bug

On Visual Uplink (camera), B still runs menu-root “enter play,” so the player leaves join and enters the game.

## Desired `{functionality}`

1. **B = back** relative to the active screen stack.  
2. Join stack: **Camera + B → Comm-Link**; **Comm-Link + B → main menu list** (join closed).  
3. Main menu list with no nested screen + B → existing root behavior (enter play).  
4. Abstraction: shell back is not hard-coded only for camera; host/stack decides whether B was consumed.  
5. Abort/Escape on join screens match the same back steps.  
6. A/START semantics for join unchanged except B must not force play mid-join.

## Acceptance

| ID | Result |
|----|--------|
| A1 | Camera + B → Comm-Link |
| A2 | Comm-Link + B → main menu (not play) |
| A3 | Main menu root + B → play (unchanged) |
| A4 | No join open → B still enter play |

# FS90 — Join Comm-Link & Camera fill Game Boy screen

## Purpose

When **Join the bar!** opens Comm-Link or Camera, those UIs must **fill the Game Boy glass/playfield** (same screen region as the main menu background and boot video), stretched edge-to-edge within that glass—not a centered card on the full browser window.

## Desired `{functionality}`

1. Comm-Link and Camera occupy the **full glass rectangle**.  
2. Housing (bezel, D-pad, A/B, START) remains visible outside the glass as on the main menu.  
3. Content inside scales/scrolls within the glass; still usable on mobile.  
4. FS89 join flow unchanged (Comm-Link → Camera → register).

## Acceptance

| ID | Result |
|----|--------|
| A1 | Join UI bounds match playfield glass (not full browser) |
| A2 | UI stretches to fill glass width and height |
| A3 | Menu shell chrome still visible around glass |
| A4 | Join flow still works |

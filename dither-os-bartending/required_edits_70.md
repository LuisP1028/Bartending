# RE70 — Fill playfield bands

## File: `src/app/gameboy-shell.css` (shell media only)

Add rules so `.gb-shell__playfield .pov-stage` (and host section) fill the nest:

```css
.gb-shell__playfield > .pov-shell-section {
  width: 100%;
  height: 100%;
}
.gb-shell__playfield .pov-stage {
  width: 100% !important; /* or without if specificity wins */
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: auto; /* override 1184/880 contain for shell nest only */
}
```

Keep playfield `overflow: hidden`. Do not change desktop `.pov-stage` in globals.css except via this shell-scoped override.

## Verify

Phone shell: bar fills housing glass area; no black strip under/above art; clicks work; desktop OK.

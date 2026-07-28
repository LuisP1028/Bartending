# Required Edits 58

## Edit 1 — `src/app/receipt.css` (`.receipt-system--pov`)

Raise floors:

```css
--receipt-paper-w: clamp(180px, 26cqi, 280px);
--receipt-paper-h: clamp(200px, 38cqb, 320px);
--receipt-ui-scale: clamp(0.78, calc(100cqi / 1184px), 1);
```

(Previously ~140/160 and 0.54.)

## Edit 2 — `src/app/globals.css` jigger

```css
--jigger-ui-scale: clamp(0.92, calc(100cqi / 1184px), 1);
```

Trigger:

```css
min-width: max(48px, calc(64px * var(--jigger-ui-scale, 1)));
min-height: max(48px, calc(56px * var(--jigger-ui-scale, 1)));
```

Icon/options keep readable floors.

## Edit 3 — landscape chrome compact (`globals.css`)

```css
@media (orientation: landscape) {
  .sys-header { padding-bottom: 0; margin-bottom: 0.1rem; }
  .mode-btn--obelisco, .mode-btn--classics {
    --mode-logo-box-w: clamp(3rem, 12vmin, 5.5rem);
    --mode-logo-box-h: clamp(1.25rem, 5vmin, 2.25rem);
    padding: 2px 4px;
  }
  .receipt-toolbar { margin-top: 0.1rem; }
  .receipt-toolbar .btn-8bit {
    padding: 0.3em 0.65em;
    font-size: clamp(0.7rem, 2.4vmin, 0.95rem);
  }
}
```

No orientation gate that disables fill — only compact chrome.

## Edit 4 — `docs/index.html` host shell

Slim header on short / mobile viewports (max-height or coarse pointer): smaller padding, smaller type, or hide title keep only “Open full screen” — free iframe height for landscape.

## Edit 5 — Verify FS57 liquid unchanged

Do not reintroduce foreignObject liquid.

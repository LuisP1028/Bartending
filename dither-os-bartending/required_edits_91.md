# RE91 — GH Pages iframe camera permission

## File

`docs/index.html`

## Edit

Update the game iframe `allow` attribute to include **camera** (Permissions-Policy delegation to the embedded Space).

Example:

```html
allow="fullscreen; autoplay; clipboard-write; camera"
```

Optionally also:

```html
allow="fullscreen; autoplay; clipboard-write; camera; camera 'src'"
```

Modern browsers: `camera` on the iframe is sufficient for the child origin (`*.hf.space`) to call `getUserMedia`.

## Optional

`DEPLOY.md` — note that iframe must include `camera` in `allow` for Join the bar.

## Non-edits

- `JoinBarCamera.tsx` not required for this root cause.  
- No HF Docker change required for this GH-only failure.

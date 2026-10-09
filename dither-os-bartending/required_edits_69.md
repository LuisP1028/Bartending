# RE69 — Housing-heavy shell layout

## File

**`src/app/gameboy-shell.css`** (shell media only)

## Edits

1. **`.gb-shell__screen-cont`**: Increase nest — e.g. `top: ~5–6%`, `left: ~5%`, `width: ~90%`, `height: ~54–58%` (was ~8.6% / 9.5% / 81% / 39%).  
2. **`.gb-shell__playfield`**: Keep flex-fill inside housing; reduce excessive side margins if any.  
3. **Controls**: Move below housing (`top` ≥ housing bottom + small gap); slightly smaller % sizes if needed so D-pad/A·B/SELECT·START fully on-screen under cover crop.  
4. **Optional**: Bias `.gb-shell` vertical position so visible crop prioritizes housing+controls (e.g. slight `translateY`).  
5. Keep cover fit, overlays, pass-through, de-brand.

## Verify

Phone portrait: readable receipts; all buttons visible; no black page margins; desktop OK.

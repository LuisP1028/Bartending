# RE78

In `page.tsx` outside-click `pointerdown` handler: if `target.closest('.gb-shell__controls')` (or dpad/A/B), return without `closeOverlay`. Optionally also exclude `.gb-shell` plastic chrome if needed. Keep frame and hotspot exemptions.

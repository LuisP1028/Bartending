# FS91 — GitHub Pages embed allows camera for Visual Uplink

## Purpose

When players open the game through the **GitHub Pages static shell** (iframe of the Hugging Face Space), **Join the bar! → Visual Uplink** must be able to **request camera permission** and show the live selfie feed after Allow—matching behavior on the Space opened directly.

## Baseline

- HF Space direct: camera works.  
- GH Pages shell: no permission prompt; “access denied / hardware offline.”  
- Shell iframe currently allows `fullscreen; autoplay; clipboard-write` only—**not camera**.

## Desired `{functionality}`

1. Via GH Pages embed, Visual Uplink can prompt for camera (when not already blocked by the user).  
2. After Allow, live feed works as on HF.  
3. After Deny, existing in-app error remains acceptable.  
4. HF direct behavior unchanged.  
5. Other iframe features (fullscreen, autoplay, etc.) remain.

## Acceptance

| ID | Result |
|----|--------|
| A1 | GH Pages → Join → camera: browser permission UI can appear |
| A2 | Allow → live Visual Uplink feed |
| A3 | HF direct still works |
| A4 | Deny / no device → clear error, no crash |

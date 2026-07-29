# RE89 — Required edits: Join the bar! Comm-Link → Camera → register

**Spec:** [functional_specification_89.md](./functional_specification_89.md)  
**Maps:** [wayfinder/map-072.md](./wayfinder/map-072.md), [mobile-render-debug/map-076.md](./mobile-render-debug/map-076.md)  
**Context:** `aaa88/`  
**Supersedes RE88** for this goal.  
**DO NOT CODE until operator authorizes after documentation sufficiency.**

---

## Goal

**Join the bar!** → port **joinbar** (alias + email/phone) → port **cameratest** (capture selfie) → secure store + character register/pipeline.

---

## Files to create / modify

| File | Role |
|------|------|
| `src/components/MainMenu.tsx` | Label + `onOpenJoinBar` |
| `src/components/JoinBarCommLink.tsx` (+ `.module.css`) | Port joinbar.html |
| `src/components/JoinBarCamera.tsx` (+ `.module.css`) | Port cameratest.html + capture |
| `src/app/page.tsx` | Join state machine: menu → comm → camera → submit → menu |
| `src/components/PatronSignupForm.tsx` | Optional reuse; or retire from this path if superseded |
| `src/app/api/patrons/register/route.ts` | Reuse as-is unless tiny validation tweaks needed |

**Prototypes (copy into aaa / port from):**

- `/Users/diesel/Desktop/joinbar.html`  
- `/Users/diesel/Desktop/cameratest.html`  

**Do not** load those Desktop paths at runtime.

---

## Edit 1 — Menu

**MainMenu.tsx**

1. Replace starfield item with `id: 'join-bar'`, label **Join the bar!** (or equivalent producing that on-screen string).  
2. Prop `onOpenJoinBar: () => void`.  
3. Activate row → `onOpenJoinBar()` only (not `onEnterPlay`).

---

## Edit 2 — Join state on page

**page.tsx** example states:

```ts
type JoinStage = null | 'comm' | 'camera' | 'submitting' | 'done';
```

- `onOpenJoinBar` → `joinStage = 'comm'`  
- Comm transmit success → store identity in React state → `joinStage = 'camera'`  
- Camera “use photo” → POST register with name + email|phone + photo → show result → close to menu  
- Close from any stage → stop camera tracks if any → `joinStage = null`, stay on menu phase  

Do **not** `setPhase('play')` on join success.

---

## Edit 3 — Comm-Link component (joinbar port)

**JoinBarCommLink**

### UI

Port joinbar:

- Terminal shell, scanlines, title ESTABLISH COMM-LINK  
- Alias input (`username-data` semantics)  
- Comm input (`comm-data` semantics)  
- Promo notice  
- TRANSMIT DATA button  
- Close / back control  

### Behavior

1. Both fields required.  
2. On transmit:  
   - Trim alias → `name`  
   - Parse comm: if contains `@` treat as `email`, else `phone` (document in code comment)  
   - Call `onTransmit({ name, email, phone })`  
3. Parent advances to camera.  
4. Optional: early PII-only API later — **not required** if final register after photo includes full payload (D7).

### Mobile

Large touch targets; readable labels; no hover-only submit.

---

## Edit 4 — Camera component (cameratest port)

**JoinBarCamera**

1. Port visual uplink (bounding box, HUD, scanlines, status, video).  
2. `getUserMedia({ video: { facingMode: 'user', … }, audio: false })`.  
3. `playsInline`, `muted`, `autoPlay`.  
4. **CAPTURE** shutter → canvas → JPEG/PNG `File`.  
5. Retake / Use photo.  
6. `onCapture(file: File)`; `onClose` stops all tracks.  
7. Permission error state (cameratest ERR copy).  

### Mobile (map-076)

Secure context assumed; stop tracks; overscroll isolation on overlay.

---

## Edit 5 — Register after photo

On “Use photo”:

```ts
FormData:
  name: alias
  email?: from comm parse
  phone?: from comm parse
  photo: captured File
  runPipeline?: '1' if product checkbox (default true or false — pick one; recommend default true for join path or explicit GENERATE checkbox on camera step)
```

`POST /api/patrons/register`

Show success/error string; then close join UI to menu.

If register requires email or phone and parse is wrong, show validation error before POST.

---

## Edit 6 — Overlay presentation

- Render Comm-Link and Camera as sequential overlays (or glass-slot children) while `phase === 'menu'`.  
- Prefer z-index above menu navigator.  
- Escape/B: close join or step back (Comm from Camera optional; at minimum close to menu).  

---

## Edit 7 — Verification

| Check | Expected |
|-------|----------|
| A1 | Join the bar! label |
| A2 | Comm-Link first |
| A3–A4 | Validation then camera |
| A5–A6 | Capture + register |
| A7 | Close → menu |
| A8 | Mode selection OK |
| A9 | Mobile form + camera |

---

## Implementation order

1. Menu + join state shell  
2. Comm-Link port  
3. Camera port + capture  
4. Register wiring  
5. Mobile polish  

---

## Explicit non-edits

- MODE SELECTION, boot, character roster defaults (Elder/Caesar/Trump) except register may append new characters.  
- Rewriting Imagine pipeline beyond existing register prepare flag.

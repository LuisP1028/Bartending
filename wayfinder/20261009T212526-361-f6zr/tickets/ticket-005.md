---
ticket_id: "005"
title: "Generative Pipeline Ingestion, Camera Framing & Aspect Ratio Standardization"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_107.md"
---

# Ticket 005: Generative Pipeline Ingestion, Camera Framing & Aspect Ratio Standardization

## Question
How does the patron generation pipeline (`src/components/JoinBarCamera.tsx`, `scripts/patron-pipeline/generate-patron-assets.mjs`, `scripts/patron-pipeline/lib/imagineClient.mjs`, and `src/app/api/patrons/roster/route.ts`) standardize source image capture, reference image ordering, framing prompts, and asset metadata so that newly generated patrons conform to the standardized visual scale and aspect ratio from creation?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_107.md`
  - §Desired Functionality (1): "Every patron—regardless of whether they are a built-in stock character or a dynamically registered user character—must render at an identical visual scale. Head sizes, shoulder widths, and overall silhouette volumes must be normalized so that all guests appear to belong to the same world scale and artistic perspective."
  - §Desired Functionality (4): "Character rendering must be robust against variations in sprite image aspect ratios (including 2:3 portrait, 1:1 square, and 16:9 widescreen). Variations in image resolution or canvas aspect ratio must not dictate the physical on-screen size or vertical eye-line of the character."
  - §Edge Cases & Behavioral Boundaries (1): "The active roster will simultaneously contain legacy portrait assets (Elder), square assets (Caesar/Trump), and newly generated landscape assets. Standardization must function uniformly across all three formats without requiring re-generation of existing stock assets."
  - §Edge Cases & Behavioral Boundaries (2): "If a custom sprite has substantial transparent margins around the character silhouette, the rendering system must still ensure the visible character figure aligns with the standard counterline height rather than letting transparent padding push the character downwards."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Raw Webcam Aspect Ratio Propagation
In `src/components/JoinBarCamera.tsx` (L51–L58):
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
  audio: false,
});
```
In `captureStill` (L96–L114):
```typescript
const w = video.videoWidth || 640;
const h = video.videoHeight || 640;
canvas.width = w;
canvas.height = h;
ctx.drawImage(video, 0, 0, w, h);
```
Standard laptop webcams provide a 16:9 widescreen stream (1280×720).
Capturing the uncropped video frame captures a wide field of view where the user's face occupies only a small fraction of the image center, surrounded by background room clutter.
When saved as `photo.jpg` (or sent via `POST /api/patrons/register`), the source photo is 1280×720.

### 2. Multi-Image Reference Ordering in xAI Imagine
In `scripts/patron-pipeline/lib/imagineClient.mjs` (L6–L8, L58):
```javascript
/**
 * Multi-image: xAI supports up to 3 refs; pass imagePaths: [first, second, …]
 * (first image drives default aspect ratio).
 */
```
In `scripts/patron-pipeline/generate-patron-assets.mjs` (L257–L295):
- Stage 3 (`sit`): `imageRefs: [headOn, sitMesh]`
  Because `headOn` (1280×720) is placed first in the array, xAI generates `sit.png` in 1280×720 widescreen!
  The canonical sit mesh template (`sitframetemplate.jpg`) is 832×1248 (2:3 portrait), but because it is placed second, its portrait aspect ratio is ignored by the generator.
- Stages 5 & 6 (`walk_01`, `walk_02`): `imageRefs: [profile, walkMesh]`
  Because `profile` is 1280×720, the walk frames are also generated in 1280×720 widescreen, causing the walking character figure to be only 340px wide with 470px transparent padding on either side.

### 3. Missing Aspect Ratio Metadata in Roster Records
In `src/lib/runtimePatronStore.ts` and `src/app/api/patrons/roster/route.ts`:
The active patron record stores `sit_url`, `talk_url`, `walk_01_url`, `walk_02_url`, but does not store `aspect_ratio` or canvas dimensions.
Consequently, the client-side game engine in `src/components/PatronLayer.tsx` must either guess aspect ratios based on convention or wait for asynchronous image loading.

## Architectural Decision & Solution Design

### 1. Camera Viewport Portrait/Square Crop Guide
In `src/components/JoinBarCamera.tsx`:
- Render a diegetic Game Boy portrait/square viewfinder target reticle overlay (e.g. 1:1 or 4:5 aspect ratio) guiding the user to align their face inside the framing box.
- In `captureStill()`:
  Center-crop the video frame to a standardized 1:1 square ($720\times 720$) or 2:3 portrait ($480\times 720$), focusing directly on the user's face and upper shoulders while trimming peripheral clutter.
  ```typescript
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;
  canvas.width = side;
  canvas.height = side;
  ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);
  ```

### 2. Mesh-First Reference Ordering in Pipeline Stages
In `scripts/patron-pipeline/generate-patron-assets.mjs`:
- For Stage 3 (`sit`):
  Order `imageRefs: [sitMesh, headOn]`.
  Placing `sitMesh` (`sitframetemplate.jpg`, 832×1248) first forces xAI to adopt the 2:3 portrait aspect ratio for the generated sit bust, matching the stock Elder asset format.
- For Stage 5 & 6 (`walk_01`, `walk_02`):
  Order `imageRefs: [walkMesh, profile]`.
  Placing `walkMesh` first guides the generator to render full-height walking figures without bloated horizontal margins.

### 3. Aspect Ratio Metadata Persistence
- In `scripts/patron-pipeline/lib/writeAssets.mjs`:
  When installing or uploading the ready pack to GCS, measure the native dimensions of `sit.png` using `sharp` (or image headers) and record `aspect_ratio` (width / height).
- In PostgreSQL `patrons` table & `src/lib/runtimePatronStore.ts`:
  Add optional `aspect_ratio real DEFAULT 1.0` to the `patrons` schema.
- In `src/app/api/patrons/roster/route.ts`:
  Include `aspectRatio` in the returned character JSON objects:
  ```json
  {
    "id": "cool_guy_9abf409e3dc3bafd",
    "displayName": "Cool Guy",
    "aspectRatio": 1.7778,
    "sitSrc": "https://storage.googleapis.com/..."
  }
  ```
- In `src/components/PatronLayer.tsx`:
  Directly ingest `aspectRatio` from the roster response, allowing instant, layout-shift-free rendering at the exact standardized visual scale.

## Precise Contract & Transformation Specifications

### 1. `src/components/JoinBarCamera.tsx` Center-Crop Shutter
```typescript
const captureStill = useCallback(() => {
  const video = videoRef.current;
  if (!video || !live || video.readyState < 2) return;
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 640;

  // Center-crop to 1:1 square to eliminate wide margins
  const side = Math.min(vw, vh);
  const sx = Math.floor((vw - side) / 2);
  const sy = Math.floor((vh - side) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    setStillUrl(url);
    setStillBlob(blob);
    onCapture(file);
  }, 'image/jpeg', 0.92);
}, [live, onCapture]);
```

### 2. `scripts/patron-pipeline/generate-patron-assets.mjs` Reference Ordering
```javascript
{
  id: 'sit',
  order: 3,
  skillPath: skillPath(REPO_ROOT, 'sit'),
  styleSkillPath: skillPath(REPO_ROOT, 'style'),
  // Mesh template first to drive portrait aspect ratio (832x1248)
  imageRefs: [sitMesh, headOn],
  imageRefNotes: ['sit mesh pose & aspect ratio', 'head_on likeness'],
  outputStagingName: stagingSitName(),
  outputPath: sit,
},
```

## Invariant & Verification Criteria
- **`INV-PIPE-01`**: Captured webcam stills produced by `JoinBarCamera.tsx` have aspect ratio $1.0$ (square, $side \times side$).
- **`INV-PIPE-02`**: Newly generated sit sprites created with mesh-first reference ordering conform to portrait dimensions ($832\times 1248$).
- **`INV-PIPE-03`**: `GET /api/patrons/roster` returns `aspectRatio: number` for all active patrons.

---
ticket_id: "004"
title: "Cloud Asset Synchronization & Asset Route Serving Protocol for personality.txt"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-002.md", "ticket-003.md"]
governing_specification: "functional_specification_108.md"
---

# Ticket 004: Cloud Asset Synchronization & Asset Route Serving Protocol for personality.txt

## Question
How do the cloud storage publication managers (`src/lib/gcsStorage.ts`, `scripts/patron-pipeline/lib/gcsStorage.mjs`) and the dynamic runtime asset endpoint (`src/app/api/patrons/assets/[characterId]/[file]/route.ts`) synchronize `personality.txt` to Google Cloud Storage alongside sprite PNGs and serve it with appropriate MIME typing (`text/plain; charset=utf-8`) across production environments?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_108.md`
  - §Desired Functionality (3): "Cloud Asset Synchronization: During cloud asset synchronization (GCS), the `personality.txt` file must be published alongside the sprite PNGs so cloud-backed rosters maintain persona parity across environments."
  - §Glossary: "Character Prompt File (`personality.txt`): An authoritative, durable text document (`public/assets/patrons/{characterId}/personality.txt`) storing literally and strictly what the user inputted in the 'About Me' field as the direct source of truth for that character's personality."
  - §Edge Cases (4): "Offline / Disconnected Operation: Prompt file generation must be entirely local and deterministic, requiring zero external network calls or third-party API dependencies during registration."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Missing `personality.txt` in Cloud Pack Uploaders
In `src/lib/gcsStorage.ts` (L98–L147), `uploadPatronPackToGcs` uploads only `sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`, and optional `source`:
```typescript
export async function uploadPatronPackToGcs(
  characterId: string,
  localPaths: {
    sit: string;
    talk: string;
    walk_01: string;
    walk_02: string;
    source?: string;
  }
): Promise<PatronCloudPackUrls> {
  // ... uploads images only ...
}
```
Similarly, `scripts/patron-pipeline/lib/gcsStorage.mjs` (L86–L132) does not include `personality.txt` in `uploadPatronAssetsToGcs`. Consequently, cloud deployments (e.g. Google Cloud Run) that rely on GCS asset packs miss the character's prompt file.

### 2. Asset Serving Route Rejection
In `src/app/api/patrons/assets/[characterId]/[file]/route.ts` (L14–L25):
```typescript
const ALLOWED = new Set([
  'sit.png',
  'talk.png',
  'walk_01.png',
  'walk_02.png',
  'walk_03.png',
  'walk_04.png',
  'source.jpg',
  'source.jpeg',
  'source.png',
  'source.webp',
]);
```
`personality.txt` is not included in the `ALLOWED` set. Any request made to `/api/patrons/assets/{characterId}/personality.txt` fails fast with `400 { error: 'file not allowed' }`.
Furthermore, the MIME-type resolution logic (L88–L97) only tests for PNG, JPEG, and WebP, falling back to `application/octet-stream`.

## Architectural Decisions to Lock

### 1. Cloud Storage Publication Contract
- Extend `PatronCloudPackUrls` in `src/lib/gcsStorage.ts`:
  ```typescript
  export interface PatronCloudPackUrls {
    sitUrl: string;
    talkUrl: string;
    walk01Url: string;
    walk02Url: string;
    sourceUrl?: string;
    personalityUrl?: string;
  }
  ```
- In `uploadPatronPackToGcs`:
  - Accept `personality?: string` in `localPaths` (or check if `path.join(path.dirname(localPaths.sit), 'personality.txt')` exists):
    ```typescript
    const personalityPath = localPaths.personality || path.join(path.dirname(localPaths.sit), 'personality.txt');
    let personalityUrl: string | undefined = undefined;
    if (fs.existsSync(personalityPath)) {
      personalityUrl = await uploadFileToGcs(
        personalityPath,
        `patrons/${characterId}/personality.txt`,
        'text/plain; charset=utf-8'
      );
    }
    ```
- Replicate matching behavior in `scripts/patron-pipeline/lib/gcsStorage.mjs`:
  ```javascript
  if (filePaths.personality && fs.existsSync(filePaths.personality)) {
    const personalityUrl = await uploadFileToGcs(
      filePaths.personality,
      `patrons/${characterId}/personality.txt`,
      'text/plain; charset=utf-8'
    );
    urls.personalityUrl = personalityUrl;
  }
  ```

### 2. Runtime Asset Route Whitelisting & Header Delivery
In `src/app/api/patrons/assets/[characterId]/[file]/route.ts`:
- Add `'personality.txt'` to the `ALLOWED` whitelist:
  ```typescript
  const ALLOWED = new Set([
    'sit.png',
    'talk.png',
    'walk_01.png',
    'walk_02.png',
    'walk_03.png',
    'walk_04.png',
    'source.jpg',
    'source.jpeg',
    'source.png',
    'source.webp',
    'personality.txt',
  ]);
  ```
- Update MIME type detection in `GET`:
  ```typescript
  let type = 'application/octet-stream';
  if (name === 'personality.txt') {
    type = 'text/plain; charset=utf-8';
  } else if (isPng) {
    type = 'image/png';
  } else if (isJpeg) {
    type = 'image/jpeg';
  } else if (isWebp) {
    type = 'image/webp';
  }
  ```
- For `personality.txt`, set response headers:
  ```typescript
  headers: {
    'content-type': type,
    'cache-control': 'public, max-age=3600, must-revalidate',
  }
  ```
- Ensure file resolution looks in the patron's nested directory (`public/assets/patrons/{characterId}/personality.txt`).

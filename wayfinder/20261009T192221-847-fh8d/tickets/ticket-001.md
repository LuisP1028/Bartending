---
ticket_id: "001"
title: "GCS Visual Asset Client, Autonomous Cloud Publishing & Direct Public URL Resolution"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_106.md"
---

# Ticket 001: GCS Visual Asset Client, Autonomous Cloud Publishing & Direct Public URL Resolution

## Question
How does the system configure and initialize the Google Cloud Storage client across development and production environments using environment variables (`GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_CREDENTIALS_JSON`), autonomously publish generated sprite assets (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) and the source photograph to cloud storage, configure direct permanent HTTPS access with appropriate cache headers and CORS compatibility, and fail fast if cloud upload encounters an error?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_106.md`
  - §Desired Functionality (1): "Upon completion of background removal for a generated character, the system must upload the complete ready pack (`sit.png`, `talk.png`, `walk_01.png`, `walk_02.png`) and the source photo to the configured GCS bucket (`bartending-patron-assets`). Staging artifacts must not linger on host disks as permanent single-points-of-failure."
  - §Desired Functionality (1): "Stored sprites must be resolvable via standard, permanent HTTPS URLs (e.g. `https://storage.googleapis.com/bartending-patron-assets/patrons/{id}/...`). Cross-Origin Resource Sharing (CORS) must allow any authorized web client (desktop or mobile) to fetch and render sprite images into canvas or DOM elements without authentication bottlenecks or expiring signed URLs."
  - §Edge Cases & Behavioral Boundaries (1): "If GCS is unreachable during sprite upload, the pipeline must catch the upload error, mark the database job as failed with an actionable diagnostic message, and refrain from admitting the patron to the active roster."
  - §Acceptance Criteria (AC1): "Newly generated patron assets (`sit`, `talk`, `walk_01`, `walk_02`, `source`) are uploaded to and served from GCS bucket `bartending-patron-assets`."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Local Filesystem Dependency in Asset Publishing
- In `scripts/patron-pipeline/lib/writeAssets.mjs` (L71–L185), `installPackFromStagingDir` copies files from `stagingDir` into `repoRoot/public/assets/patrons/${characterId}/`.
- In `src/app/api/patrons/assets/[characterId]/[file]/route.ts`, sprites are served by reading files from disk.
- When the application is deployed to a new container, migrated to a dedicated home server, or restarted in an ephemeral environment, all files in `public/assets/patrons/` are wiped or omitted from git.
- Serving assets directly from local disk also introduces host bandwidth bottlenecks and cross-device serving latency when accessed from mobile devices.

### 2. Missing Cloud Storage Adapter Interface
- Currently, neither `package.json` nor the scripts library includes `@google-cloud/storage`.
- In the project root `.env`, `GCS_BUCKET_NAME=bartending-patron-assets`, `GCS_PROJECT_ID=new-queries-492815`, and `GCS_CREDENTIALS_JSON` are present, but no code module parses or initializes the storage client.
- The root also contains `cors.json` specifying `GET` and `HEAD` from `*` with `Content-Type` and `Cache-Control` response headers.

## Architectural Decision & Solution Design

### 1. Storage Dependency & GCS Client Initialization
- Add `@google-cloud/storage` to `package.json` dependencies.
- Create a dedicated cloud storage adapter module at `src/lib/gcsStorage.ts` (and shared module `scripts/patron-pipeline/lib/gcsStorage.mjs` or unified ES module accessible to both pipeline scripts and Next.js server handlers).
- Client configuration resolution:
  1. Bucket Name: Read `process.env.GCS_BUCKET_NAME || 'bartending-patron-assets'`.
  2. Project ID: Read `process.env.GCS_PROJECT_ID`.
  3. Credentials:
     - If `process.env.GCS_CREDENTIALS_JSON` is defined, parse the JSON string and pass to `new Storage({ credentials: JSON.parse(process.env.GCS_CREDENTIALS_JSON), projectId })`.
     - Else if `process.env.GOOGLE_APPLICATION_CREDENTIALS` is defined, instantiate `new Storage({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, projectId })`.
     - Else instantiate `new Storage({ projectId })` utilizing standard Google Cloud application default credentials.
- Export helper function `getGcsBucket(): Bucket`.

### 2. Autonomous Cloud Publishing Function (`uploadPatronAssetsToGcs`)
- Define `uploadPatronAssetsToGcs`:
  ```typescript
  export interface PatronCloudAssets {
    sitUrl: string;
    talkUrl: string;
    walkUrls: string[];
    sourceUrl?: string;
  }

  export async function uploadPatronAssetsToGcs(
    characterId: string,
    filePaths: {
      sit: string;
      talk: string;
      walks: string[];
      source?: string;
    }
  ): Promise<PatronCloudAssets>
  ```
- Upload Rules:
  - For each asset, define destination path in bucket:
    - `patrons/${characterId}/sit.png`
    - `patrons/${characterId}/talk.png`
    - `patrons/${characterId}/walk_${padWalkFrameIndex(i)}.png`
    - `patrons/${characterId}/source${sourceExt}`
  - Upload with metadata:
    ```javascript
    {
      contentType: filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') ? 'image/jpeg' : filePath.endsWith('.webp') ? 'image/webp' : 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
    }
    ```
  - Standard permanent public URL format:
    `https://storage.googleapis.com/${bucketName}/patrons/${characterId}/${fileName}`
  - Fail-fast enforcement: If any file upload fails or returns an error, the function must immediately throw a fatal error detailing the failed file and destination URI, halting downstream readiness admission.

### 3. Pipeline Integration
- In `scripts/patron-pipeline/lib/writeAssets.mjs` / `generate-patron-assets.mjs`:
  - After background removal generates the `.nobg.png` assets, invoke `uploadPatronAssetsToGcs`.
  - Staging artifacts may remain temporarily in staging during pipeline execution for local debugging, but cloud URLs become the authoritative source of truth.
  - Return the uploaded `PatronCloudAssets` URLs for recording in the database.

## Precise Contract & Transformation Specifications

### 1. `src/lib/gcsStorage.ts` Interface Contract
```typescript
import { Storage, Bucket } from '@google-cloud/storage';

export function getGcsStorage(): Storage;
export function getGcsBucketName(): string;
export function getGcsBucket(): Bucket;

export function buildGcsPublicUrl(bucketName: string, objectPath: string): string;

export async function uploadFileToGcs(
  localFilePath: string,
  destinationPath: string,
  contentType: string
): Promise<string>;

export async function verifyGcsAssetExists(destinationPath: string): Promise<boolean>;

export async function uploadPatronPackToGcs(
  characterId: string,
  localPaths: {
    sit: string;
    talk: string;
    walk_01: string;
    walk_02: string;
    source?: string;
  }
): Promise<{
  sitUrl: string;
  talkUrl: string;
  walk01Url: string;
  walk02Url: string;
  sourceUrl?: string;
}>;
```

### 2. Error Surfacing & Boundary Contract
- If credentials cannot be parsed or initialized: Throw `Error("GCS initialization failed: invalid GCS_CREDENTIALS_JSON or missing project configuration")`.
- If an individual sprite upload fails: Throw `Error("GCS upload failed for patron ${characterId} asset ${fileName}: ${underlyingError}")`.

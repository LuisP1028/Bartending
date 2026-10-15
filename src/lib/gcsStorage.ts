import { Storage, Bucket } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

let _storage: Storage | null = null;
let _storageCacheKey: string | null = null;

export function stripSurroundingQuotes(raw: string): string {
  let val = raw.trim();
  while (
    val.length >= 2 &&
    ((val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith('"') && val.endsWith('"')))
  ) {
    val = val.slice(1, -1).trim();
  }
  return val;
}

export function parseGcsCredentialsJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const normalized = stripSurroundingQuotes(trimmed);
  let parsed: unknown;

  const tryParseCandidate = (candidate: string): unknown => {
    const val = JSON.parse(candidate);
    if (typeof val === 'string') {
      return JSON.parse(stripSurroundingQuotes(val));
    }
    return val;
  };

  try {
    parsed = tryParseCandidate(trimmed);
  } catch {
    try {
      parsed = tryParseCandidate(normalized);
    } catch (err) {
      if (normalized.includes('\\"')) {
        try {
          parsed = JSON.parse(normalized.replace(/\\"/g, '"'));
        } catch {
          throw new Error(
            `Failed to parse GCS_CREDENTIALS_JSON: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      } else {
        throw new Error(
          `Failed to parse GCS_CREDENTIALS_JSON: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Failed to parse GCS_CREDENTIALS_JSON: parsed value is not a JSON object');
  }

  const credentials = { ...(parsed as Record<string, unknown>) };
  if (
    typeof credentials.client_email !== 'string' ||
    !credentials.client_email.trim() ||
    typeof credentials.private_key !== 'string' ||
    !credentials.private_key.trim()
  ) {
    throw new Error(
      'Failed to parse GCS_CREDENTIALS_JSON: missing required service_account fields (client_email, private_key)'
    );
  }

  if (credentials.private_key.includes('\\n')) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  return credentials;
}

export function getGcsBucketName(): string {
  const raw = process.env.GCS_BUCKET_NAME;
  const cleaned = raw ? stripSurroundingQuotes(raw) : '';
  return cleaned || 'bartending-patron-assets';
}

export function getGcsStorage(): Storage {
  const rawProjectId = process.env.GCS_PROJECT_ID;
  const projectId = (rawProjectId ? stripSurroundingQuotes(rawProjectId) : '') || 'new-queries-492815';
  const credentialsJson = process.env.GCS_CREDENTIALS_JSON;
  const rawKeyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const keyFile = rawKeyFile ? stripSurroundingQuotes(rawKeyFile) : undefined;

  const cacheKey = `${projectId}::${credentialsJson ?? ''}::${keyFile ?? ''}`;
  if (_storage && _storageCacheKey === cacheKey) {
    return _storage;
  }

  if (credentialsJson && credentialsJson.trim().length > 0) {
    const credentials = parseGcsCredentialsJson(credentialsJson);
    _storage = new Storage({ projectId, credentials });
    _storageCacheKey = cacheKey;
    return _storage;
  }

  if (keyFile && fs.existsSync(keyFile)) {
    _storage = new Storage({ projectId, keyFilename: keyFile });
    _storageCacheKey = cacheKey;
    return _storage;
  }

  _storage = new Storage({ projectId });
  _storageCacheKey = cacheKey;
  return _storage;
}

export function validateGcsConfiguration(): void {
  getGcsBucket();
}

export function getGcsBucket(): Bucket {
  const storage = getGcsStorage();
  const bucketName = getGcsBucketName();
  return storage.bucket(bucketName);
}

export function buildGcsPublicUrl(bucketName: string, objectPath: string): string {
  const cleanPath = objectPath.startsWith('/') ? objectPath.slice(1) : objectPath;
  return `https://storage.googleapis.com/${bucketName}/${cleanPath}`;
}

export async function uploadFileToGcs(
  localFilePath: string,
  destinationPath: string,
  contentType: string = 'image/png'
): Promise<string> {
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Cannot upload to GCS: local file not found at ${localFilePath}`);
  }
  const stat = fs.statSync(localFilePath);
  if (stat.size <= 0) {
    throw new Error(`Cannot upload to GCS: local file is empty (0 bytes) at ${localFilePath}`);
  }

  const bucket = getGcsBucket();
  const cleanDest = destinationPath.startsWith('/') ? destinationPath.slice(1) : destinationPath;
  const file = bucket.file(cleanDest);

  await file.save(fs.readFileSync(localFilePath), {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
    },
    resumable: false,
  });

  return buildGcsPublicUrl(getGcsBucketName(), cleanDest);
}

export async function verifyGcsAssetExists(destinationPath: string): Promise<boolean> {
  try {
    const bucket = getGcsBucket();
    const cleanDest = destinationPath.startsWith('/') ? destinationPath.slice(1) : destinationPath;
    const file = bucket.file(cleanDest);
    const [exists] = await file.exists();
    if (!exists) return false;
    const [metadata] = await file.getMetadata();
    return Number(metadata.size || 0) >= 256;
  } catch {
    return false;
  }
}

export interface PatronCloudPackUrls {
  sitUrl: string;
  talkUrl: string;
  walk01Url: string;
  walk02Url: string;
  sourceUrl?: string;
  personalityUrl?: string;
}

export async function uploadPatronPackToGcs(
  characterId: string,
  localPaths: {
    sit: string;
    talk: string;
    walk_01: string;
    walk_02: string;
    source?: string;
    personality?: string;
  }
): Promise<PatronCloudPackUrls> {
  const sitUrl = await uploadFileToGcs(
    localPaths.sit,
    `patrons/${characterId}/sit.png`,
    'image/png'
  );
  const talkUrl = await uploadFileToGcs(
    localPaths.talk,
    `patrons/${characterId}/talk.png`,
    'image/png'
  );
  const walk01Url = await uploadFileToGcs(
    localPaths.walk_01,
    `patrons/${characterId}/walk_01.png`,
    'image/png'
  );
  const walk02Url = await uploadFileToGcs(
    localPaths.walk_02,
    `patrons/${characterId}/walk_02.png`,
    'image/png'
  );

  let sourceUrl: string | undefined = undefined;
  if (localPaths.source && fs.existsSync(localPaths.source)) {
    const ext = path.extname(localPaths.source).toLowerCase() || '.jpg';
    const cType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    sourceUrl = await uploadFileToGcs(
      localPaths.source,
      `patrons/${characterId}/source${ext}`,
      cType
    );
  }

  const personalityPath =
    localPaths.personality ||
    path.join(path.dirname(localPaths.sit), 'personality.txt');
  let personalityUrl: string | undefined = undefined;
  if (fs.existsSync(personalityPath)) {
    personalityUrl = await uploadFileToGcs(
      personalityPath,
      `patrons/${characterId}/personality.txt`,
      'text/plain; charset=utf-8'
    );
  }

  return {
    sitUrl,
    talkUrl,
    walk01Url,
    walk02Url,
    sourceUrl,
    personalityUrl,
  };
}

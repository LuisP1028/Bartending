import { Storage, Bucket } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

let _storage: Storage | null = null;

export function getGcsBucketName(): string {
  return process.env.GCS_BUCKET_NAME || 'bartending-patron-assets';
}

export function getGcsStorage(): Storage {
  if (_storage) return _storage;

  const projectId = process.env.GCS_PROJECT_ID || 'new-queries-492815';
  const credentialsJson = process.env.GCS_CREDENTIALS_JSON;
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson);
      _storage = new Storage({ projectId, credentials });
      return _storage;
    } catch (err) {
      throw new Error(`Failed to parse GCS_CREDENTIALS_JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (keyFile && fs.existsSync(keyFile)) {
    _storage = new Storage({ projectId, keyFilename: keyFile });
    return _storage;
  }

  _storage = new Storage({ projectId });
  return _storage;
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

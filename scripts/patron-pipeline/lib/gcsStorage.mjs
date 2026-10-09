import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

let _storage = null;

export function getGcsBucketName() {
  return process.env.GCS_BUCKET_NAME || 'bartending-patron-assets';
}

export function getGcsStorage() {
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

export function getGcsBucket() {
  const storage = getGcsStorage();
  const bucketName = getGcsBucketName();
  return storage.bucket(bucketName);
}

export function buildGcsPublicUrl(bucketName, objectPath) {
  const cleanPath = objectPath.startsWith('/') ? objectPath.slice(1) : objectPath;
  return `https://storage.googleapis.com/${bucketName}/${cleanPath}`;
}

export async function uploadFileToGcs(localFilePath, destinationPath, contentType = 'image/png') {
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

export async function verifyGcsAssetExists(destinationPath) {
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

export async function uploadPatronAssetsToGcs(characterId, filePaths) {
  const sitUrl = filePaths.sit ? await uploadFileToGcs(
    filePaths.sit,
    `patrons/${characterId}/sit.png`,
    'image/png'
  ) : null;

  const talkUrl = filePaths.talk ? await uploadFileToGcs(
    filePaths.talk,
    `patrons/${characterId}/talk.png`,
    'image/png'
  ) : null;

  const walkUrls = [];
  if (Array.isArray(filePaths.walks)) {
    for (let i = 0; i < filePaths.walks.length; i++) {
      const walkPath = filePaths.walks[i];
      if (walkPath) {
        const frameNum = String(i + 1).padStart(2, '0');
        const url = await uploadFileToGcs(
          walkPath,
          `patrons/${characterId}/walk_${frameNum}.png`,
          'image/png'
        );
        walkUrls.push(url);
      }
    }
  }

  let sourceUrl = undefined;
  if (filePaths.source && fs.existsSync(filePaths.source)) {
    const ext = path.extname(filePaths.source).toLowerCase() || '.jpg';
    const cType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    sourceUrl = await uploadFileToGcs(
      filePaths.source,
      `patrons/${characterId}/source${ext}`,
      cType
    );
  }

  return {
    sitUrl,
    talkUrl,
    walkUrls,
    sourceUrl,
  };
}

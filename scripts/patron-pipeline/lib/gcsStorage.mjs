import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

let _storage = null;
let _storageCacheKey = null;

export function stripSurroundingQuotes(raw) {
  let val = String(raw ?? '').trim();
  while (
    val.length >= 2 &&
    ((val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith('"') && val.endsWith('"')))
  ) {
    val = val.slice(1, -1).trim();
  }
  return val;
}

export function parseGcsCredentialsJson(raw) {
  const trimmed = String(raw ?? '').trim();
  const normalized = stripSurroundingQuotes(trimmed);
  let parsed;

  const tryParseCandidate = (candidate) => {
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

  const credentials = { ...parsed };
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

export function getGcsBucketName() {
  const raw = process.env.GCS_BUCKET_NAME;
  const cleaned = raw ? stripSurroundingQuotes(raw) : '';
  return cleaned || 'bartending-patron-assets';
}

export function getGcsStorage() {
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

  let personalityUrl = undefined;
  const personalityPath = filePaths.personality || (filePaths.sit ? path.join(path.dirname(filePaths.sit), 'personality.txt') : null);
  if (personalityPath && fs.existsSync(personalityPath)) {
    personalityUrl = await uploadFileToGcs(
      personalityPath,
      `patrons/${characterId}/personality.txt`,
      'text/plain; charset=utf-8'
    );
  }

  return {
    sitUrl,
    talkUrl,
    walkUrls,
    sourceUrl,
    personalityUrl,
  };
}

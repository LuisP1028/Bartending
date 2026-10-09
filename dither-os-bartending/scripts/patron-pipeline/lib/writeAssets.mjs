import fs from 'fs';
import path from 'path';

import { removeBackgroundToFile } from './backgroundRemove.mjs';
import {
  DEFAULT_NEW_PACK_WALK_FRAME_COUNT,
  padWalkFrameIndex,
  patronsDir,
  sitOutputPath,
  stagingSitName,
  stagingTalkName,
  stagingWalkName,
  talkOutputPath,
  walkOutputPath,
} from './paths.mjs';

export function ensurePatronsDir(repoRoot) {
  const dir = patronsDir(repoRoot);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * @param {string} srcPath
 * @param {string} destPath
 * @param {{ overwrite?: boolean }} [opts]
 */
export function installAsset(srcPath, destPath, opts = {}) {
  const overwrite = Boolean(opts.overwrite);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source asset missing: ${srcPath}`);
  }
  const st = fs.statSync(srcPath);
  if (!st.isFile() || st.size <= 0) {
    throw new Error(`Source asset empty or not a file: ${srcPath}`);
  }
  if (fs.existsSync(destPath) && !overwrite) {
    throw new Error(
      `Destination exists (pass --overwrite to replace): ${destPath}`
    );
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  const out = fs.statSync(destPath);
  if (out.size <= 0) {
    throw new Error(`Write failed (empty dest): ${destPath}`);
  }
  return destPath;
}

function resolveFinalSource(root, stagingName, altName) {
  let src = path.join(root, stagingName);
  if (fs.existsSync(src)) return src;
  if (altName) {
    const alt = path.join(root, altName);
    if (fs.existsSync(alt)) return alt;
  }
  return null;
}

/**
 * Install finals: imgly BG removal (atomic) then public copy.
 * Default walkFrameCount = 2 (walk_01, walk_02 only).
 *
 * @param {string} fromDir
 * @param {string} repoRoot
 * @param {string} characterId
 * @param {{ overwrite?: boolean, walkFrameCount?: number, skipBackgroundRemoval?: boolean }} [opts]
 * @returns {Promise<string[]>} public paths written
 */
export async function installPackFromStagingDir(
  fromDir,
  repoRoot,
  characterId,
  opts = {}
) {
  const count = opts.walkFrameCount ?? DEFAULT_NEW_PACK_WALK_FRAME_COUNT;
  const skipBg = opts.skipBackgroundRemoval === true;
  const root = path.resolve(fromDir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Staging dir not found: ${root}`);
  }

  /** @type {{ role: string, src: string, nobgPath: string, publicPath: string }[]} */
  const jobs = [];
  const missing = [];

  for (let i = 1; i <= count; i++) {
    const key = padWalkFrameIndex(i);
    const name = stagingWalkName(i);
    const src = resolveFinalSource(
      root,
      name,
      `${characterId}_walk_${key}.png`
    );
    if (!src) {
      missing.push(`missing ${name} (or ${characterId}_walk_${key}.png)`);
      continue;
    }
    jobs.push({
      role: name.replace(/\.png$/i, ''),
      src,
      nobgPath: path.join(root, name.replace(/\.png$/i, '.nobg.png')),
      publicPath: walkOutputPath(repoRoot, characterId, i),
    });
  }

  {
    const name = stagingSitName();
    const src = resolveFinalSource(root, name, `${characterId}_sit.png`);
    if (!src) {
      missing.push(`missing ${name} (or ${characterId}_sit.png)`);
    } else {
      jobs.push({
        role: 'sit',
        src,
        nobgPath: path.join(root, 'sit.nobg.png'),
        publicPath: sitOutputPath(repoRoot, characterId),
      });
    }
  }

  {
    const name = stagingTalkName();
    const src = resolveFinalSource(root, name, `${characterId}_talk.png`);
    if (!src) {
      missing.push(`missing ${name} (or ${characterId}_talk.png)`);
    } else {
      jobs.push({
        role: 'talk',
        src,
        nobgPath: path.join(root, 'talk.nobg.png'),
        publicPath: talkOutputPath(repoRoot, characterId),
      });
    }
  }

  if (missing.length) {
    throw new Error(
      `Cannot install — staging incomplete for "${characterId}":\n` +
        missing.map((f) => `  • ${f}`).join('\n')
    );
  }

  // Phase 1: BG removal for all (or skip) — no public writes yet
  const ready = [];
  const failures = [];

  for (const job of jobs) {
    if (skipBg) {
      console.warn(
        `  bg-remove SKIP [${job.role}] (debug skipBackgroundRemoval)`
      );
      ready.push({ job, installSrc: job.src });
      continue;
    }
    try {
      const meta = await removeBackgroundToFile(job.src, job.nobgPath);
      console.log(
        `  bg-remove OK [${job.role}] imgly → ${meta.bytes} bytes`
      );
      ready.push({ job, installSrc: job.nobgPath });
    } catch (e) {
      failures.push(`${job.role}: ${e.message || e}`);
    }
  }

  if (failures.length) {
    throw new Error(
      `HARD STOP pack — background removal failed for "${characterId}". ` +
        `Public not modified.\n` +
        failures.map((f) => `  • ${f}`).join('\n')
    );
  }

  // Phase 2: atomic public install
  ensurePatronsDir(repoRoot);
  const written = [];
  for (const { job, installSrc } of ready) {
    installAsset(installSrc, job.publicPath, opts);
    written.push(job.publicPath);
  }

  return written;
}

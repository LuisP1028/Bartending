import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { resolvePatronIdentity } from '@/lib/patronIdentity';
import { ensurePatronFolders } from '@/lib/patronFolders';
import { resolveAppRoot } from '@/lib/patronPackReady';
import { hasPiiKey } from '@/lib/patronCrypto';
import { upsertPatronPiiDb } from '@/lib/patronPiiStore';
import { uploadPatronPackToGcs, buildGcsPublicUrl, getGcsBucketName } from '@/lib/gcsStorage';
import {
  hasImagineCredentials,
  writeGenerationJobDb,
  updateGenerationJobDb,
  upsertRuntimePatronDb,
  type GenerationJobRecord,
} from '@/lib/runtimePatronStore';

export const runtime = 'nodejs';
/** Allow long-lived request setup; generation continues in background. */
export const maxDuration = 300;

function repoRoot() {
  return resolveAppRoot(process.cwd());
}

/**
 * POST multipart: name, email?, phone?, photo (file), runPipeline? ('1'|'true')
 *
 * FS94/FS95/FS106: runPipeline=true starts full generative --run in the background,
 * persists job and contact PII to PostgreSQL, and uploads ready pack to GCS.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim() || null;
    const phone = String(form.get('phone') || '').trim() || null;
    const rawAboutMe = form.get('aboutMe') ?? form.get('about_me');
    const aboutMe = typeof rawAboutMe === 'string' ? rawAboutMe.trim() : '';
    const runPipeline =
      String(form.get('runPipeline') || '') === '1' ||
      String(form.get('runPipeline') || '').toLowerCase() === 'true';
    const photo = form.get('photo');

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!email && !phone) {
      return NextResponse.json(
        { error: 'email or phone is required' },
        { status: 400 }
      );
    }
    if (!aboutMe) {
      return NextResponse.json(
        { error: 'aboutMe is required' },
        { status: 400 }
      );
    }
    if (aboutMe.length < 10) {
      return NextResponse.json(
        { error: 'aboutMe must be at least 10 characters long' },
        { status: 400 }
      );
    }
    if (aboutMe.length > 500) {
      return NextResponse.json(
        { error: 'aboutMe cannot exceed 500 characters' },
        { status: 400 }
      );
    }

    const identity = resolvePatronIdentity({ name, email, phone });
    const root = repoRoot();
    const folders = ensurePatronFolders(root, { ...identity, aboutMe });

    // Persist Contact PII to PostgreSQL
    let pii: { inserted: boolean; contactHash: string } | null = null;
    let piiError: string | null = null;
    if (hasPiiKey()) {
      try {
        pii = await upsertPatronPiiDb({
          characterId: identity.characterId,
          contactHash: identity.contactHash,
          name,
          email,
          phone,
        });
      } catch (err) {
        piiError = err instanceof Error ? err.message : String(err);
        console.warn('[register] PII storage warning:', piiError);
      }
    } else {
      piiError = 'PII_ENCRYPTION_KEY not set — contact record not persisted in DB';
    }

    let photoPath: string | null = null;
    if (photo && typeof photo === 'object' && 'arrayBuffer' in photo) {
      const file = photo as File;
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.length >= 256) {
        const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
        const isPng =
          buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
        const isWebp =
          buf.length > 12 &&
          buf.toString('ascii', 0, 4) === 'RIFF' &&
          buf.toString('ascii', 8, 12) === 'WEBP';

        if (!isJpeg && !isPng && !isWebp) {
          return NextResponse.json(
            {
              error:
                'Invalid image format. Please submit a valid JPEG, PNG, or WebP photo.',
            },
            { status: 400 }
          );
        }
        const ext = isPng ? '.png' : isWebp ? '.webp' : '.jpg';
        photoPath = path.join(folders.stagingDir, `source${ext}`);
        fs.writeFileSync(photoPath, buf);
        fs.writeFileSync(path.join(folders.publicDir, `source${ext}`), buf);
      } else {
        return NextResponse.json(
          { error: 'Photo file is empty or corrupted (under 256 bytes).' },
          { status: 400 }
        );
      }
    }

    const reg: { inserted: boolean; constName?: string } = { inserted: false };
    const bucket = getGcsBucketName();

    if (!runPipeline) {
      return NextResponse.json({
        ok: true,
        characterId: identity.characterId,
        displayName: identity.displayName,
        registered: reg,
        pii,
        piiError,
        pipeline: null,
        jobId: null,
        status: 'registered',
        generationNote: 'runPipeline not set — folder + meta only',
        sitSrc: buildGcsPublicUrl(bucket, `patrons/${identity.characterId}/sit.png`),
      });
    }

    if (!photoPath) {
      return NextResponse.json(
        {
          error: 'photo is required when generating a character',
        },
        { status: 400 }
      );
    }

    if (!hasImagineCredentials()) {
      return NextResponse.json(
        {
          error:
            'Image generation credentials missing on server. Please configure XAI_API_KEY (or XAIKEY / HF_TOKEN) in .env',
        },
        { status: 503 }
      );
    }

    const jobId = randomUUID();
    const now = new Date().toISOString();
    const job: GenerationJobRecord = {
      jobId,
      characterId: identity.characterId,
      displayName: identity.displayName,
      status: 'running',
      currentStage: 'init',
      stageIndex: 0,
      totalStages: 8,
      progressPct: 0,
      statusMessage: 'Initializing generation pipeline...',
      createdAt: now,
      updatedAt: now,
      photoPath,
    };
    await writeGenerationJobDb(job);

    const script = path.join(
      root,
      'scripts/patron-pipeline/generate-patron-assets.mjs'
    );
    const args = [
      script,
      '--run',
      '--repo-root',
      root,
      '--photo',
      photoPath,
      '--name',
      name,
      '--character-id',
      identity.characterId,
      '--no-register',
      '--about-me',
      aboutMe,
      ...(email ? ['--email', email] : []),
      ...(phone ? ['--phone', phone] : []),
    ];

    // Ensure child sees Imagine key under the name pipeline expects
    const childEnv: NodeJS.ProcessEnv = { ...process.env, REPO_ROOT: root };
    if (!childEnv.XAI_API_KEY && childEnv.XAIKEY) {
      childEnv.XAI_API_KEY = childEnv.XAIKEY;
    }
    if (!childEnv.XAI_API_KEY && childEnv.XAI_KEY) {
      childEnv.XAI_API_KEY = childEnv.XAI_KEY;
    }

    const child = spawn(process.execPath, args, {
      cwd: root,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    child.unref();

    let logBuf = '';
    let lastActivityMs = Date.now();
    let lastUpdateMs = 0;
    const WATCHDOG_MAX_MS = 10 * 60 * 1000;
    const WATCHDOG_STALL_MS = 3 * 60 * 1000;
    const startTimeMs = Date.now();

    const watchdogTimer = setInterval(() => {
      const currentTime = Date.now();
      const stalled = currentTime - lastActivityMs > WATCHDOG_STALL_MS;
      const timedOut = currentTime - startTimeMs > WATCHDOG_MAX_MS;
      if (stalled || timedOut) {
        clearInterval(watchdogTimer);
        try {
          child.kill('SIGKILL');
        } catch {
          /* process may have already exited */
        }
        const errorMsg = timedOut
          ? 'Generation timed out: upstream provider did not respond within the allocated timeframe.'
          : 'Generation stalled: no output received from generation pipeline for 3 minutes.';
        updateGenerationJobDb(jobId, {
          status: 'failed',
          error: errorMsg,
          logTail: logBuf,
        }).catch((e) => console.error('[register] watchdog update error:', e));
      }
    }, 5000);
    watchdogTimer.unref();

    const handleOutput = (chunk: Buffer) => {
      lastActivityMs = Date.now();
      const text = chunk.toString('utf8');
      logBuf = (logBuf + text).slice(-12000);
      const nowMs = Date.now();

      let patch: Partial<GenerationJobRecord> | null = null;
      if (text.includes('--- [1] head_on ---')) {
        patch = {
          currentStage: 'head_on',
          stageIndex: 1,
          totalStages: 8,
          progressPct: 12,
          statusMessage: 'Generating head-on view (1/8)...',
        };
      } else if (text.includes('--- [2] profile ---')) {
        patch = {
          currentStage: 'profile',
          stageIndex: 2,
          totalStages: 8,
          progressPct: 25,
          statusMessage: 'Generating profile view (2/8)...',
        };
      } else if (text.includes('--- [3] sit ---')) {
        patch = {
          currentStage: 'sit',
          stageIndex: 3,
          totalStages: 8,
          progressPct: 37,
          statusMessage: 'Generating sitting pose (3/8)...',
        };
      } else if (text.includes('--- [4] talk ---')) {
        patch = {
          currentStage: 'talk',
          stageIndex: 4,
          totalStages: 8,
          progressPct: 50,
          statusMessage: 'Generating talking pose (4/8)...',
        };
      } else if (text.includes('--- [5] walk_01 ---')) {
        patch = {
          currentStage: 'walk_01',
          stageIndex: 5,
          totalStages: 8,
          progressPct: 62,
          statusMessage: 'Generating walking frame 1 (5/8)...',
        };
      } else if (text.includes('--- [6] walk_02 ---')) {
        patch = {
          currentStage: 'walk_02',
          stageIndex: 6,
          totalStages: 8,
          progressPct: 75,
          statusMessage: 'Generating walking frame 2 (6/8)...',
        };
      } else if (text.includes('=== Install (imgly background removal) ===')) {
        patch = {
          currentStage: 'bg_removal',
          stageIndex: 7,
          totalStages: 8,
          progressPct: 87,
          statusMessage: 'Processing transparent sprites (7/8)...',
        };
      } else if (text.includes('=== DONE ===')) {
        patch = {
          currentStage: 'install',
          stageIndex: 8,
          totalStages: 8,
          progressPct: 98,
          statusMessage: 'Finalizing ready pack (8/8)...',
        };
      }

      if (patch || nowMs - lastUpdateMs > 1000) {
        lastUpdateMs = nowMs;
        updateGenerationJobDb(jobId, {
          ...(patch || {}),
          logTail: logBuf,
        }).catch((e) => console.error('[register] job update error:', e));
      }
    };

    child.stdout?.on('data', handleOutput);
    child.stderr?.on('data', handleOutput);

    child.on('error', (err) => {
      clearInterval(watchdogTimer);
      updateGenerationJobDb(jobId, {
        status: 'failed',
        error: err.message || String(err),
        logTail: logBuf,
      }).catch((e) => console.error('[register] job error update failed:', e));
    });

    child.on('close', async (code) => {
      clearInterval(watchdogTimer);
      if (code === 0) {
        try {
          const stagingDir = folders.stagingDir;
          const cloudUrls = await uploadPatronPackToGcs(identity.characterId, {
            sit: path.join(stagingDir, 'sit.nobg.png'),
            talk: path.join(stagingDir, 'talk.nobg.png'),
            walk_01: path.join(stagingDir, 'walk_01.nobg.png'),
            walk_02: path.join(stagingDir, 'walk_02.nobg.png'),
            source: photoPath || undefined,
            personality: path.join(stagingDir, 'personality.txt'),
          });

          await upsertRuntimePatronDb({
            id: identity.characterId,
            displayName: identity.displayName,
            personality: `${identity.characterId.replace(/^patron_/, '').replace(/[^a-z0-9]+/gi, '_')}_friendly`,
            aboutMe,
            promptReady: true,
            walkFrameCount: 2,
            walkFrameMs: 120,
            sitUrl: cloudUrls.sitUrl,
            talkUrl: cloudUrls.talkUrl,
            walk01Url: cloudUrls.walk01Url,
            walk02Url: cloudUrls.walk02Url,
            sourceUrl: cloudUrls.sourceUrl,
          });

          await updateGenerationJobDb(jobId, {
            status: 'done',
            currentStage: 'done',
            stageIndex: 8,
            totalStages: 8,
            progressPct: 100,
            statusMessage: `Assets published to GCS. Patron ${identity.displayName} admitted to database roster.`,
            logTail: logBuf,
            error: undefined,
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error('[register] Cloud upload or DB persistence failed:', msg);
          await updateGenerationJobDb(jobId, {
            status: 'failed',
            error: `Cloud upload / database persistence failed: ${msg}`,
            logTail: logBuf,
          });
        }
      } else {
        let errorMsg = `Pipeline exited with code ${code}`;
        if (logBuf.includes('IMAGINE_AUTH') || logBuf.includes('401')) {
          errorMsg =
            'Authentication failed with image provider. Verify API key in .env.';
        } else if (logBuf.includes('429')) {
          errorMsg =
            'Upstream generation rate limit reached. Please wait a moment and try again.';
        }
        await updateGenerationJobDb(jobId, {
          status: 'failed',
          error: errorMsg,
          logTail: logBuf,
        });
      }
    });

    return NextResponse.json({
      ok: true,
      characterId: identity.characterId,
      displayName: identity.displayName,
      contactHash: identity.contactHash,
      registered: reg,
      walkFrameCount: 2,
      pii,
      piiError,
      jobId,
      status: 'running',
      pipeline: {
        ok: true,
        mode: 'run-async',
      },
      generationNote:
        'Full generative --run started (cloud GCS + PostgreSQL persistence). Poll /api/patrons/generate-status?jobId=',
      sitSrc: buildGcsPublicUrl(bucket, `patrons/${identity.characterId}/sit.png`),
      storage: 'gcs-postgres',
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

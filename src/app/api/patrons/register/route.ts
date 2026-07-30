import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { resolvePatronIdentity } from '@/lib/patronIdentity';
import { ensurePatronFolders } from '@/lib/patronFolders';
import { isPatronPackReady, resolveAppRoot } from '@/lib/patronPackReady';
import {
  hasImagineCredentials,
  updateGenerationJob,
  upsertRuntimePatron,
  writeGenerationJob,
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
 * FS94/FS95: runPipeline=true starts full generative --run in the background and
 * returns jobId for polling GET /api/patrons/generate-status.
 * Helpers load via static @/lib imports (no dynamic import of pipeline .mjs).
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim() || null;
    const phone = String(form.get('phone') || '').trim() || null;
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

    const identity = resolvePatronIdentity({ name, email, phone });
    const root = repoRoot();
    const folders = ensurePatronFolders(root, identity);

    // PII via pipeline SQLite is optional; do not block generation (RE95).
    const pii: { inserted: boolean; contactHash: string } | null = null;
    let piiError: string | null =
      'PII store not wired on API path — folder + generate still proceed';
    if (!process.env.PII_ENCRYPTION_KEY) {
      piiError =
        'PII_ENCRYPTION_KEY not set — folder created but contact not stored in DB';
    }

    let photoPath: string | null = null;
    if (photo && typeof photo === 'object' && 'arrayBuffer' in photo) {
      const file = photo as File;
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.length > 0) {
        const ext =
          path.extname(file.name || '').toLowerCase() ||
          (file.type === 'image/png' ? '.png' : '.jpg');
        photoPath = path.join(folders.stagingDir, `source${ext}`);
        fs.writeFileSync(photoPath, buf);
        fs.writeFileSync(path.join(folders.publicDir, `source${ext}`), buf);
      }
    }

    // Dev convenience only — production roster uses data/runtime-patrons.json
    // (characters.ts patch skipped on API path; runtime upsert on job success).
    const reg: { inserted: boolean; constName?: string } = { inserted: false };

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
        sitSrc: `/assets/patrons/${identity.characterId}/sit.png`,
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
            'Imagine credentials missing. Set XAI_API_KEY (or XAIKEY / HF_TOKEN) on the server to generate characters.',
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
      createdAt: now,
      updatedAt: now,
      photoPath,
    };
    writeGenerationJob(root, job);

    const script = path.join(
      root,
      'scripts/patron-pipeline/generate-patron-assets.mjs'
    );
    const args = [
      script,
      '--run',
      '--photo',
      photoPath,
      '--name',
      name,
      '--character-id',
      identity.characterId,
      '--no-register',
      ...(email ? ['--email', email] : []),
      ...(phone ? ['--phone', phone] : []),
    ];

    // Ensure child sees Imagine key under the name pipeline expects
    const childEnv = { ...process.env };
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
      detached: false,
    });

    let logBuf = '';
    const appendLog = (chunk: Buffer) => {
      logBuf = (logBuf + chunk.toString('utf8')).slice(-12000);
    };
    child.stdout?.on('data', appendLog);
    child.stderr?.on('data', appendLog);

    child.on('error', (err) => {
      updateGenerationJob(root, jobId, {
        status: 'failed',
        error: err.message || String(err),
        logTail: logBuf,
      });
    });

    child.on('close', (code) => {
      // FS96 — only roster when nested ready pack is on disk (sit/talk/walk_01/walk_02)
      const packReady = isPatronPackReady(root, identity.characterId);

      if (code === 0 && packReady) {
        try {
          upsertRuntimePatron(root, {
            id: identity.characterId,
            displayName: identity.displayName,
            personality: `${identity.characterId.replace(/^patron_/, '').replace(/[^a-z0-9]+/gi, '_')}_friendly`,
            walkFrameCount: 2,
            walkFrameMs: 120,
            createdAt: new Date().toISOString(),
          });
          updateGenerationJob(root, jobId, {
            status: 'done',
            logTail: logBuf,
            error: undefined,
          });
        } catch (e: unknown) {
          updateGenerationJob(root, jobId, {
            status: 'failed',
            error: e instanceof Error ? e.message : String(e),
            logTail: logBuf,
          });
        }
      } else if (code === 0 && !packReady) {
        updateGenerationJob(root, jobId, {
          status: 'failed',
          error:
            'Pipeline exited 0 but ready pack missing (sit/talk/walk_01/walk_02 under public/assets/patrons/{id}/)',
          logTail: logBuf,
        });
      } else {
        updateGenerationJob(root, jobId, {
          status: 'failed',
          error: `Pipeline exited with code ${code}`,
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
        'Full generative --run started (runtime-only storage on host disk, not git). Poll /api/patrons/generate-status?jobId=',
      // FS98 — served from disk via API after install
      sitSrc: `/api/patrons/assets/${identity.characterId}/sit.png`,
      storage: 'runtime-only',
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

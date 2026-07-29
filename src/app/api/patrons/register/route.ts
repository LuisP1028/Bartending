import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { NextResponse } from 'next/server';
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

async function loadPipelineMod(rel: string) {
  const href = pathToFileURL(path.join(process.cwd(), rel)).href;
  return import(href);
}

function repoRoot() {
  return process.cwd();
}

/**
 * POST multipart: name, email?, phone?, photo (file), runPipeline? ('1'|'true')
 *
 * FS94: runPipeline=true starts full generative --run in the background and
 * returns jobId for polling GET /api/patrons/generate-status.
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

    const { resolvePatronIdentity } = await loadPipelineMod(
      'scripts/patron-pipeline/lib/characterId.mjs'
    );
    const { ensurePatronFolders } = await loadPipelineMod(
      'scripts/patron-pipeline/lib/patronFolder.mjs'
    );
    const { registerCharacterInSource } = await loadPipelineMod(
      'scripts/patron-pipeline/lib/registerCharacter.mjs'
    );

    const identity = resolvePatronIdentity({ name, email, phone });
    const root = repoRoot();
    const folders = ensurePatronFolders(root, identity);

    let pii: { inserted: boolean; contactHash: string } | null = null;
    let piiError: string | null = null;
    try {
      const { upsertPatronPii, hasPiiKey } = await loadPipelineMod(
        'scripts/patron-pipeline/lib/patronDb.mjs'
      );
      if (!hasPiiKey()) {
        piiError =
          'PII_ENCRYPTION_KEY not set — folder created but contact not stored in DB';
      } else {
        const saved = upsertPatronPii(root, {
          characterId: identity.characterId,
          contactHash: identity.contactHash,
          name: identity.displayName,
          email,
          phone,
        });
        pii = {
          inserted: saved.inserted,
          contactHash: saved.contactHash,
        };
      }
    } catch (pe: unknown) {
      piiError = pe instanceof Error ? pe.message : String(pe);
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
    let reg: { inserted: boolean; constName?: string } = { inserted: false };
    try {
      reg = registerCharacterInSource(root, identity.characterId, {
        displayName: identity.displayName,
      });
    } catch {
      reg = { inserted: false };
    }

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

    const child = spawn(process.execPath, args, {
      cwd: root,
      env: process.env,
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
      if (code === 0) {
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
        'Full generative --run started in background. Poll /api/patrons/generate-status?jobId=',
      sitSrc: `/assets/patrons/${identity.characterId}/sit.png`,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

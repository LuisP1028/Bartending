import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { promisify } from 'util';
import { NextResponse } from 'next/server';

const execFileAsync = promisify(execFile);

async function loadPipelineMod(rel: string) {
  const href = pathToFileURL(path.join(process.cwd(), rel)).href;
  return import(href);
}

export const runtime = 'nodejs';
export const maxDuration = 120;

function repoRoot() {
  return process.cwd();
}

/**
 * POST multipart: name, email?, phone?, photo (file), runPipeline? ('1'|'true')
 *
 * Creates patron folder + meta + optional photo save.
 * runPipeline=true runs **--prepare only** (W3 skill plan). Full image generation
 * is agent-driven (see scripts/patron-pipeline/run-via-agent.md), then --install.
 * Does not require Imagine keys or VLM for prepare success.
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

    const reg = registerCharacterInSource(root, identity.characterId, {
      displayName: identity.displayName,
    });

    let pipeline: {
      ok: boolean;
      mode?: string;
      log?: string;
      error?: string;
      planPath?: string;
      agentDoc?: string;
    } | null = null;

    if (runPipeline) {
      if (!photoPath) {
        return NextResponse.json(
          {
            error: 'photo is required when runPipeline is true (prepare needs photo)',
            identity,
            folders: {
              publicDir: folders.publicDir,
              stagingDir: folders.stagingDir,
            },
          },
          { status: 400 }
        );
      }
      const script = path.join(
        root,
        'scripts/patron-pipeline/generate-patron-assets.mjs'
      );
      const args = [
        script,
        '--prepare',
        '--photo',
        photoPath,
        '--name',
        name,
        ...(email ? ['--email', email] : []),
        ...(phone ? ['--phone', phone] : []),
      ];
      try {
        const { stdout, stderr } = await execFileAsync(process.execPath, args, {
          cwd: root,
          env: process.env,
          maxBuffer: 5 * 1024 * 1024,
          timeout: 60000,
        });
        pipeline = {
          ok: true,
          mode: 'prepare',
          planPath: 'scripts/patron-pipeline/.last-plan.json',
          agentDoc: 'scripts/patron-pipeline/run-via-agent.md',
          log: `${stdout}\n${stderr}`.slice(-8000),
        };
      } catch (e: unknown) {
        const err = e as {
          message?: string;
          stdout?: string;
          stderr?: string;
        };
        pipeline = {
          ok: false,
          mode: 'prepare',
          error: err.message || String(e),
          log: `${err.stdout || ''}\n${err.stderr || ''}`.slice(-8000),
        };
      }
    }

    return NextResponse.json({
      ok: true,
      characterId: identity.characterId,
      folderSlug: identity.folderSlug,
      displayName: identity.displayName,
      contactHash: identity.contactHash,
      publicDir: folders.publicDir,
      stagingDir: folders.stagingDir,
      metaPath: folders.metaPath,
      registered: reg,
      walkFrameCount: 2,
      pii,
      piiError,
      pipeline,
      generationNote:
        'Full image generation is agent-driven (W3). After prepare, follow run-via-agent.md then --install.',
      sitSrc: `/assets/patrons/${identity.characterId}/sit.png`,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

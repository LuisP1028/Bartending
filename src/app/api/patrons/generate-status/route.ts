import { NextResponse } from 'next/server';
import { readGenerationJob } from '@/lib/runtimePatronStore';
import { resolveAppRoot } from '@/lib/patronPackReady';

export const runtime = 'nodejs';

function repoRoot() {
  return resolveAppRoot(process.cwd());
}

/**
 * FS94 — Poll join generation job.
 * GET ?jobId=
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId')?.trim();
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }
    const job = readGenerationJob(repoRoot(), jobId);
    if (!job) {
      return NextResponse.json({ error: 'job not found' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      jobId: job.jobId,
      characterId: job.characterId,
      displayName: job.displayName,
      status: job.status,
      currentStage: job.currentStage ?? null,
      stageIndex: job.stageIndex ?? null,
      totalStages: job.totalStages ?? null,
      progressPct: job.progressPct ?? null,
      statusMessage: job.statusMessage ?? null,
      error: job.error ?? null,
      logTail: job.logTail ?? null,
      sitSrc:
        job.status === 'done'
          ? `/api/patrons/assets/${job.characterId}/sit.png`
          : null,
      updatedAt: job.updatedAt,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

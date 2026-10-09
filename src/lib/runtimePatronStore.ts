/**
 * FS94 / FS106 — Runtime patron registry & generation job store.
 * Cloud-backed persistence via PostgreSQL & Google Cloud Storage.
 */

import fs from 'fs';
import path from 'path';
import { isPatronPackReady, isPatronPackCloudReady, resolveAppRoot } from '@/lib/patronPackReady';
import { query } from './db';

export interface RuntimePatronRecord {
  id: string;
  displayName: string;
  personality: string;
  aboutMe?: string;
  promptReady?: boolean;
  walkFrameCount: number;
  walkFrameMs: number;
  sitUrl?: string;
  talkUrl?: string;
  walk01Url?: string;
  walk02Url?: string;
  sourceUrl?: string;
  isReady?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type GenerationJobStatus =
  | 'queued'
  | 'running'
  | 'done'
  | 'failed';

export interface GenerationJobRecord {
  jobId: string;
  characterId: string;
  displayName: string;
  status: GenerationJobStatus;
  currentStage?: string;
  stageIndex?: number;
  totalStages?: number;
  progressPct?: number;
  statusMessage?: string;
  error?: string;
  logTail?: string;
  createdAt: string;
  updatedAt: string;
  photoPath?: string;
}

/* ========================================================================== */
/* PostgreSQL Database Store (FS106)                                          */
/* ========================================================================== */

export async function readRuntimePatronsDb(): Promise<RuntimePatronRecord[]> {
  const res = await query<{
    id: string;
    display_name: string;
    personality: string;
    about_me: string | null;
    prompt_ready: boolean | null;
    walk_frame_count: number;
    walk_frame_ms: number;
    sit_url: string;
    talk_url: string;
    walk_01_url: string;
    walk_02_url: string;
    source_url: string | null;
    is_ready: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT * FROM patrons
     WHERE is_ready = TRUE AND is_active = TRUE
     ORDER BY created_at ASC`
  );

  return res.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    personality: row.personality,
    aboutMe: row.about_me ?? undefined,
    promptReady: row.prompt_ready ?? false,
    walkFrameCount: row.walk_frame_count,
    walkFrameMs: row.walk_frame_ms,
    sitUrl: row.sit_url,
    talkUrl: row.talk_url,
    walk01Url: row.walk_01_url,
    walk02Url: row.walk_02_url,
    sourceUrl: row.source_url ?? undefined,
    isReady: row.is_ready,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function upsertRuntimePatronDb(record: {
  id: string;
  displayName: string;
  personality: string;
  aboutMe?: string;
  promptReady?: boolean;
  walkFrameCount?: number;
  walkFrameMs?: number;
  sitUrl: string;
  talkUrl: string;
  walk01Url: string;
  walk02Url: string;
  sourceUrl?: string;
}): Promise<void> {
  const cloudReady = await isPatronPackCloudReady(record.id);
  if (!cloudReady) {
    throw new Error(`Cannot upsert patron "${record.id}": ready pack missing in GCS`);
  }

  await query(
    `INSERT INTO patrons (
      id, display_name, personality, about_me, prompt_ready, walk_frame_count, walk_frame_ms,
      sit_url, talk_url, walk_01_url, walk_02_url, source_url, is_ready, is_active, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, TRUE, NOW())
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      personality = EXCLUDED.personality,
      about_me = EXCLUDED.about_me,
      prompt_ready = EXCLUDED.prompt_ready,
      walk_frame_count = EXCLUDED.walk_frame_count,
      walk_frame_ms = EXCLUDED.walk_frame_ms,
      sit_url = EXCLUDED.sit_url,
      talk_url = EXCLUDED.talk_url,
      walk_01_url = EXCLUDED.walk_01_url,
      walk_02_url = EXCLUDED.walk_02_url,
      source_url = EXCLUDED.source_url,
      is_ready = TRUE,
      is_active = TRUE,
      updated_at = NOW()`,
    [
      record.id,
      record.displayName,
      record.personality,
      record.aboutMe || null,
      record.promptReady ?? false,
      record.walkFrameCount ?? 2,
      record.walkFrameMs ?? 120,
      record.sitUrl,
      record.talkUrl,
      record.walk01Url,
      record.walk02Url,
      record.sourceUrl || null,
    ]
  );
}

export async function writeGenerationJobDb(job: GenerationJobRecord): Promise<void> {
  await query(
    `INSERT INTO generation_jobs (
      job_id, character_id, display_name, status,
      current_stage, stage_index, total_stages, progress_pct,
      status_message, error, log_tail, photo_path, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (job_id) DO UPDATE SET
      status = EXCLUDED.status,
      current_stage = EXCLUDED.current_stage,
      stage_index = EXCLUDED.stage_index,
      total_stages = EXCLUDED.total_stages,
      progress_pct = EXCLUDED.progress_pct,
      status_message = EXCLUDED.status_message,
      error = EXCLUDED.error,
      log_tail = EXCLUDED.log_tail,
      photo_path = COALESCE(EXCLUDED.photo_path, generation_jobs.photo_path),
      updated_at = NOW()`,
    [
      job.jobId,
      job.characterId,
      job.displayName,
      job.status,
      job.currentStage || null,
      job.stageIndex ?? null,
      job.totalStages ?? null,
      job.progressPct ?? null,
      job.statusMessage || null,
      job.error || null,
      job.logTail || null,
      job.photoPath || null,
      job.createdAt,
      job.updatedAt,
    ]
  );
}

export async function readGenerationJobDb(jobId: string): Promise<GenerationJobRecord | null> {
  const res = await query<{
    job_id: string;
    character_id: string;
    display_name: string;
    status: GenerationJobStatus;
    current_stage: string | null;
    stage_index: number | null;
    total_stages: number | null;
    progress_pct: number | null;
    status_message: string | null;
    error: string | null;
    log_tail: string | null;
    photo_path: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    'SELECT * FROM generation_jobs WHERE job_id = $1',
    [jobId]
  );

  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    jobId: r.job_id,
    characterId: r.character_id,
    displayName: r.display_name,
    status: r.status,
    currentStage: r.current_stage ?? undefined,
    stageIndex: r.stage_index ?? undefined,
    totalStages: r.total_stages ?? undefined,
    progressPct: r.progress_pct ?? undefined,
    statusMessage: r.status_message ?? undefined,
    error: r.error ?? undefined,
    logTail: r.log_tail ?? undefined,
    photoPath: r.photo_path ?? undefined,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function updateGenerationJobDb(
  jobId: string,
  patch: Partial<GenerationJobRecord>
): Promise<GenerationJobRecord | null> {
  const cur = await readGenerationJobDb(jobId);
  if (!cur) return null;
  const next: GenerationJobRecord = {
    ...cur,
    ...patch,
    jobId,
    updatedAt: new Date().toISOString(),
  };
  await writeGenerationJobDb(next);
  return next;
}

/* ========================================================================== */
/* Local Filesystem Fallbacks (FS94/FS98)                                      */
/* ========================================================================== */

function dataDir(repoRoot: string): string {
  const d = path.join(resolveAppRoot(repoRoot), 'data');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function patronsPath(repoRoot: string): string {
  return path.join(dataDir(repoRoot), 'runtime-patrons.json');
}

function jobsDir(repoRoot: string): string {
  const d = path.join(dataDir(repoRoot), 'generation-jobs');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function jobPath(repoRoot: string, jobId: string): string {
  return path.join(jobsDir(repoRoot), `${jobId}.json`);
}

function readRuntimePatronsRaw(repoRoot: string): RuntimePatronRecord[] {
  const p = patronsPath(repoRoot);
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as {
      patrons?: RuntimePatronRecord[];
    };
    return Array.isArray(raw.patrons) ? raw.patrons : [];
  } catch {
    return [];
  }
}

function writeRuntimePatronsList(
  repoRoot: string,
  list: RuntimePatronRecord[]
): void {
  fs.writeFileSync(
    patronsPath(repoRoot),
    JSON.stringify({ patrons: list }, null, 2),
    'utf8'
  );
}

export function readRuntimePatrons(repoRoot: string): RuntimePatronRecord[] {
  const root = resolveAppRoot(repoRoot);
  const all = readRuntimePatronsRaw(root);
  const ready = all.filter((r) => isPatronPackReady(root, r.id));
  if (ready.length !== all.length) {
    try {
      writeRuntimePatronsList(root, ready);
    } catch {
      /* still return filtered list if prune write fails */
    }
  }
  return ready;
}

export function upsertRuntimePatron(
  repoRoot: string,
  record: RuntimePatronRecord
): void {
  const root = resolveAppRoot(repoRoot);
  if (!isPatronPackReady(root, record.id)) {
    throw new Error(
      `Cannot upsert runtime patron "${record.id}": ready pack missing (sit/talk/walk_01/walk_02)`
    );
  }
  const list = readRuntimePatronsRaw(root)
    .filter((r) => r.id !== record.id)
    .filter((r) => isPatronPackReady(root, r.id));
  list.push(record);
  writeRuntimePatronsList(root, list);
}

export function writeGenerationJob(
  repoRoot: string,
  job: GenerationJobRecord
): void {
  fs.writeFileSync(jobPath(repoRoot, job.jobId), JSON.stringify(job, null, 2), 'utf8');
}

export function readGenerationJob(
  repoRoot: string,
  jobId: string
): GenerationJobRecord | null {
  const p = jobPath(repoRoot, jobId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as GenerationJobRecord;
  } catch {
    return null;
  }
}

export function updateGenerationJob(
  repoRoot: string,
  jobId: string,
  patch: Partial<GenerationJobRecord>
): GenerationJobRecord | null {
  const cur = readGenerationJob(repoRoot, jobId);
  if (!cur) return null;
  const next: GenerationJobRecord = {
    ...cur,
    ...patch,
    jobId: cur.jobId,
    updatedAt: new Date().toISOString(),
  };
  writeGenerationJob(repoRoot, next);
  return next;
}

export function hasImagineCredentials(): boolean {
  if (!process.env.XAI_API_KEY && !process.env.XAIKEY && !process.env.HF_TOKEN) {
    try {
      // Attempt loading from repo root or parent worktrees if in node runtime
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { loadRepoEnv } = require('../../scripts/patron-pipeline/lib/loadEnv.mjs');
      loadRepoEnv();
    } catch {
      /* ignore */
    }
  }
  return !!(
    process.env.XAI_API_KEY ||
    process.env.XAIKEY ||
    process.env.HF_TOKEN
  );
}

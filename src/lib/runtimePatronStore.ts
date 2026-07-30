/**
 * FS94 — Writable runtime patron registry (production-safe).
 * Built-ins live in characters.ts; join-generated patrons append here.
 * File: data/runtime-patrons.json (ephemeral on free HF Spaces without volume).
 * FS96 — Only ready-pack ids should remain (prune incomplete on read).
 */

import fs from 'fs';
import path from 'path';
import { isPatronPackReady } from '@/lib/patronPackReady';

export type RuntimePatronRecord = {
  id: string;
  displayName: string;
  personality: string;
  walkFrameCount: number;
  walkFrameMs: number;
  createdAt: string;
};

export type GenerationJobStatus =
  | 'queued'
  | 'running'
  | 'done'
  | 'failed';

export type GenerationJobRecord = {
  jobId: string;
  characterId: string;
  displayName: string;
  status: GenerationJobStatus;
  error?: string;
  logTail?: string;
  createdAt: string;
  updatedAt: string;
  photoPath?: string;
};

function dataDir(repoRoot: string): string {
  const d = path.join(repoRoot, 'data');
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

/**
 * Runtime joiners only — drops ghost entries (missing ready pack) and
 * rewrites JSON when pruned so ephemeral hosts do not keep ghosts.
 */
export function readRuntimePatrons(repoRoot: string): RuntimePatronRecord[] {
  const all = readRuntimePatronsRaw(repoRoot);
  const ready = all.filter((r) => isPatronPackReady(repoRoot, r.id));
  if (ready.length !== all.length) {
    try {
      writeRuntimePatronsList(repoRoot, ready);
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
  if (!isPatronPackReady(repoRoot, record.id)) {
    throw new Error(
      `Cannot upsert runtime patron "${record.id}": ready pack missing (sit/talk/walk_01/walk_02)`
    );
  }
  const list = readRuntimePatronsRaw(repoRoot)
    .filter((r) => r.id !== record.id)
    .filter((r) => isPatronPackReady(repoRoot, r.id));
  list.push(record);
  writeRuntimePatronsList(repoRoot, list);
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
  return !!(
    process.env.XAI_API_KEY ||
    process.env.XAIKEY ||
    process.env.HF_TOKEN
  );
}

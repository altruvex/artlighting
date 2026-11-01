import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { dirname } from "node:path";

export type JobStatus = "queued" | "running" | "done" | "error";

export interface SkippedEntry {
  productCode: string;
  reason: string;
}

export interface JobState {
  id: string;
  status: JobStatus;
  total: number;
  completed: number;
  skipped: SkippedEntry[];
  resultPath?: string;
  error?: string;
  createdAt: number;
}

/**
 * In-memory only — matches the "download and discard, no persistence"
 * decision made for single-product generation. A job (and any progress) is
 * lost if this process restarts mid-run; not solved here, an accepted
 * trade-off for a low-traffic internal tool.
 */
const jobs = new Map<string, JobState>();

const JOB_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function createJob(total: number): JobState {
  const job: JobState = {
    id: randomUUID(),
    status: "queued",
    total,
    completed: 0,
    skipped: [],
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): JobState | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<JobState>): void {
  const job = jobs.get(id);
  if (job) Object.assign(job, patch);
}

export function incrementJobProgress(id: string): void {
  const job = jobs.get(id);
  if (job) job.completed += 1;
}

export async function deleteJob(id: string): Promise<void> {
  const job = jobs.get(id);
  if (job?.resultPath) {
    // The zip sits alone in its own mkdtemp folder (see zipFiles).
    await rm(dirname(job.resultPath), { recursive: true, force: true }).catch(() => {});
  }
  jobs.delete(id);
}

function sweepExpiredJobs(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      void deleteJob(id);
    }
  }
}

setInterval(sweepExpiredJobs, 5 * 60 * 1000).unref();

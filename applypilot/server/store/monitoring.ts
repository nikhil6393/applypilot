import { getDb } from './db.js';
import { randomUUID } from 'node:crypto';

export interface MonitorRunRecord {
  id: string;
  source: string;
  status: 'running' | 'completed' | 'failed';
  jobsFound: number;
  jobsInserted: number;
  durationMs: number;
  errorMessage?: string;
  startedAt: string;
  finishedAt?: string;
}

export function logMonitorRun(record: Omit<MonitorRunRecord, 'id'>): MonitorRunRecord {
  const db = getDb();
  const id = randomUUID();
  const startedAt = record.startedAt || new Date().toISOString();

  db.prepare(`
    INSERT INTO monitor_runs (id, source, status, jobs_found, jobs_inserted, duration_ms, error_message, started_at, finished_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    record.source,
    record.status,
    record.jobsFound,
    record.jobsInserted,
    record.durationMs,
    record.errorMessage || null,
    startedAt,
    record.finishedAt || null
  );

  return {
    id,
    ...record,
    startedAt,
  };
}

export function listRecentMonitorRuns(limit = 50): MonitorRunRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, source, status, jobs_found as jobsFound, jobs_inserted as jobsInserted,
              duration_ms as durationMs, error_message as errorMessage, started_at as startedAt, finished_at as finishedAt
       FROM monitor_runs
       ORDER BY started_at DESC
       LIMIT ?`
    )
    .all(limit) as any[];

  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    status: r.status,
    jobsFound: r.jobsFound,
    jobsInserted: r.jobsInserted,
    durationMs: r.durationMs,
    errorMessage: r.errorMessage || undefined,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt || undefined,
  }));
}

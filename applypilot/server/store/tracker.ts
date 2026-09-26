import type Database from 'better-sqlite3';
import { getDb } from './db.js';
import type { ApplicationRecord, ApplicationStatus } from '../../shared/types.js';

export function listTracker(status?: ApplicationStatus): ApplicationRecord[] {
  const db: Database.Database = getDb();
  const rows = status
    ? db.prepare('SELECT * FROM tracker WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM tracker ORDER BY created_at DESC').all();
  return (rows as unknown as RawRow[]).map(rowToRec);
}

export function getTracker(id: string): ApplicationRecord | null {
  const db: Database.Database = getDb();
  const row = db.prepare('SELECT * FROM tracker WHERE id = ?').get(id) as unknown as
    RawRow | undefined;
  return row ? rowToRec(row) : null;
}

export function addTracker(r: ApplicationRecord): ApplicationRecord {
  const db: Database.Database = getDb();
  db.prepare(
    `
    INSERT INTO tracker (id, job_id, job_title, company, apply_url, status, notes, created_at, updated_at)
    VALUES (@id, @jobId, @jobTitle, @company, @applyUrl, @status, @notes, @createdAt, @updatedAt)
  `
  ).run(r as unknown as Record<string, string | number | null>);
  return r;
}

export function updateTracker(
  id: string,
  patch: Partial<ApplicationRecord>
): ApplicationRecord | null {
  const db: Database.Database = getDb();
  const cur = getTracker(id);
  if (!cur) return null;
  const merged: ApplicationRecord = { ...cur, ...patch, id: cur.id };
  db.prepare(
    `
    UPDATE tracker SET job_id=@jobId, job_title=@jobTitle, company=@company, apply_url=@applyUrl,
      status=@status, notes=@notes, updated_at=@updatedAt
    WHERE id=@id
  `
  ).run({
    id: merged.id,
    jobId: merged.jobId,
    jobTitle: merged.jobTitle,
    company: merged.company,
    applyUrl: merged.applyUrl,
    status: merged.status,
    notes: merged.notes,
    updatedAt: merged.updatedAt,
  } as Record<string, string | number | null>);
  return merged;
}

export function deleteTracker(id: string): boolean {
  const db: Database.Database = getDb();
  const r = db.prepare('DELETE FROM tracker WHERE id = ?').run(id);
  return r.changes > 0;
}

interface RawRow {
  id: string;
  job_id: string;
  job_title: string;
  company: string;
  apply_url: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

function rowToRec(r: RawRow): ApplicationRecord {
  return {
    id: r.id,
    jobId: r.job_id,
    jobTitle: r.job_title,
    company: r.company,
    applyUrl: r.apply_url,
    status: r.status as ApplicationStatus,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

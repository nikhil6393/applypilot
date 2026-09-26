import type Database from 'better-sqlite3';
import { getDb } from './db.js';
import type { ParsedResume } from '../../shared/types.js';

export function getResume(): ParsedResume | null {
  const db: Database.Database = getDb();
  const row = db.prepare('SELECT data FROM resume WHERE id = 1').get() as
    { data: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.data) as ParsedResume;
  } catch {
    return null;
  }
}

export function setResume(r: ParsedResume): void {
  const db: Database.Database = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO resume (id, data, updated_at) VALUES (1, @data, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
  `
  ).run({ data: JSON.stringify(r), updatedAt: now });
}

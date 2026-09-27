import { getDb } from './db.js';
export function getResume() {
    const db = getDb();
    const row = db.prepare('SELECT data FROM resume WHERE id = 1').get();
    if (!row)
        return null;
    try {
        return JSON.parse(row.data);
    }
    catch {
        return null;
    }
}
export function setResume(r) {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
    INSERT INTO resume (id, data, updated_at) VALUES (1, @data, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
  `).run({ data: JSON.stringify(r), updatedAt: now });
}

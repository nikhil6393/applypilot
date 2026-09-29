import { getDb } from './db.js';
export function listTracker(status) {
    const db = getDb();
    const rows = status
        ? db.prepare('SELECT * FROM tracker WHERE status = ? ORDER BY created_at DESC').all(status)
        : db.prepare('SELECT * FROM tracker ORDER BY created_at DESC').all();
    return rows.map(rowToRec);
}
export function getTracker(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM tracker WHERE id = ?').get(id);
    return row ? rowToRec(row) : null;
}
export function addTracker(r) {
    const db = getDb();
    db.prepare(`
    INSERT INTO tracker (id, job_id, job_title, company, apply_url, status, notes, created_at, updated_at)
    VALUES (@id, @jobId, @jobTitle, @company, @applyUrl, @status, @notes, @createdAt, @updatedAt)
  `).run(r);
    return r;
}
export function updateTracker(id, patch) {
    const db = getDb();
    const cur = getTracker(id);
    if (!cur)
        return null;
    const merged = { ...cur, ...patch, id: cur.id };
    db.prepare(`
    UPDATE tracker SET job_id=@jobId, job_title=@jobTitle, company=@company, apply_url=@applyUrl,
      status=@status, notes=@notes, updated_at=@updatedAt
    WHERE id=@id
  `).run({
        id: merged.id,
        jobId: merged.jobId,
        jobTitle: merged.jobTitle,
        company: merged.company,
        applyUrl: merged.applyUrl,
        status: merged.status,
        notes: merged.notes,
        updatedAt: merged.updatedAt,
    });
    return merged;
}
export function deleteTracker(id) {
    const db = getDb();
    const r = db.prepare('DELETE FROM tracker WHERE id = ?').run(id);
    return r.changes > 0;
}
function rowToRec(r) {
    return {
        id: r.id,
        jobId: r.job_id,
        jobTitle: r.job_title,
        company: r.company,
        applyUrl: r.apply_url,
        status: r.status,
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}

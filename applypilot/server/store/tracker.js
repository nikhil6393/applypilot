import { getDb } from './db.js';
import { supabase } from './supabase.js';

export function listTracker(status, userId) {
    const db = getDb();
    if (userId) {
        const rows = status
            ? db.prepare('SELECT * FROM tracker WHERE status = ? AND user_id = ? ORDER BY created_at DESC').all(status, userId)
            : db.prepare('SELECT * FROM tracker WHERE user_id = ? ORDER BY created_at DESC').all(userId);
        return rows.map(rowToRec);
    }
    const rows = status
        ? db.prepare('SELECT * FROM tracker WHERE status = ? ORDER BY created_at DESC').all(status)
        : db.prepare('SELECT * FROM tracker ORDER BY created_at DESC').all();
    return rows.map(rowToRec);
}

export function getTracker(id, userId) {
    const db = getDb();
    const row = userId
        ? db.prepare('SELECT * FROM tracker WHERE id = ? AND user_id = ?').get(id, userId)
        : db.prepare('SELECT * FROM tracker WHERE id = ?').get(id);
    return row ? rowToRec(row) : null;
}

export function addTracker(r, userId) {
    const db = getDb();
    const targetUserId = r.userId || userId || 'default';
    const record = {
        id: r.id || `trk_${Date.now()}`,
        jobId: r.jobId,
        jobTitle: r.jobTitle || 'Untitled',
        company: r.company || 'Unknown',
        applyUrl: r.applyUrl || '',
        status: r.status || 'saved',
        notes: r.notes || null,
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
        ...r,
        userId: targetUserId
    };
    const existing = db.prepare('SELECT id, created_at FROM tracker WHERE job_id = ? AND user_id = ?').get(r.jobId, targetUserId);
    if (existing) {
        db.prepare(`
        UPDATE tracker
        SET job_title = @jobTitle, company = @company, apply_url = @applyUrl, status = @status,
            notes = CASE WHEN @notes IS NOT NULL AND @notes != '' THEN @notes ELSE notes END,
            updated_at = @updatedAt
        WHERE id = ? AND user_id = ?
      `).run({ ...record }, existing.id, targetUserId);
        const finalRec = { ...record, id: existing.id, createdAt: existing.created_at };
        if (supabase.isConfigured()) {
            supabase.from('tracker').upsert({
                id: finalRec.id,
                user_id: targetUserId,
                job_id: finalRec.jobId,
                job_title: finalRec.jobTitle,
                company: finalRec.company,
                apply_url: finalRec.applyUrl,
                status: finalRec.status,
                notes: finalRec.notes || null,
                updated_at: new Date().toISOString()
            }).catch(e => console.warn('[Supabase Tracker Upsert]:', e.message));
        }
        return finalRec;
    }
    db.prepare(`
    INSERT INTO tracker (id, user_id, job_id, job_title, company, apply_url, status, notes, created_at, updated_at)
    VALUES (@id, @userId, @jobId, @jobTitle, @company, @applyUrl, @status, @notes, @createdAt, @updatedAt)
    ON CONFLICT(user_id, job_id) DO UPDATE SET
        job_title = excluded.job_title,
        company = excluded.company,
        apply_url = excluded.apply_url,
        status = excluded.status,
        notes = CASE WHEN excluded.notes IS NOT NULL AND excluded.notes != '' THEN excluded.notes ELSE tracker.notes END,
        updated_at = excluded.updated_at
  `).run(record);

    if (supabase.isConfigured()) {
        supabase.from('tracker').upsert({
            id: String(record.id),
            user_id: targetUserId,
            job_id: String(record.jobId),
            job_title: record.jobTitle || 'Untitled',
            company: record.company || 'Unknown',
            apply_url: record.applyUrl || '',
            status: record.status || 'saved',
            notes: record.notes || null,
            created_at: record.createdAt || new Date().toISOString(),
            updated_at: record.updatedAt || new Date().toISOString()
        }).catch(e => console.warn('[Supabase Tracker Insert]:', e.message));
    }

    return record;
}

export function updateTracker(id, patch, userId) {
    const db = getDb();
    const cur = getTracker(id, userId);
    if (!cur)
        return null;
    const targetUserId = cur.userId || userId || 'default';
    const merged = { ...cur, ...patch, id: cur.id, userId: targetUserId };
    db.prepare(`
    UPDATE tracker SET job_id=@jobId, job_title=@jobTitle, company=@company, apply_url=@applyUrl,
      status=@status, notes=@notes, updated_at=@updatedAt
    WHERE id=@id AND user_id=@userId
  `).run({
        id: merged.id,
        userId: targetUserId,
        jobId: merged.jobId,
        jobTitle: merged.jobTitle,
        company: merged.company,
        applyUrl: merged.applyUrl,
        status: merged.status,
        notes: merged.notes,
        updatedAt: merged.updatedAt,
    });

    if (supabase.isConfigured()) {
        supabase.from('tracker').update({
            job_id: merged.jobId,
            job_title: merged.jobTitle,
            company: merged.company,
            apply_url: merged.applyUrl,
            status: merged.status,
            notes: merged.notes || null,
            updated_at: new Date().toISOString()
        }, `id=eq.${id}`).catch(e => console.warn('[Supabase Tracker Update]:', e.message));
    }

    return merged;
}

export function deleteTracker(id, userId) {
    const db = getDb();
    const r = userId
        ? db.prepare('DELETE FROM tracker WHERE id = ? AND user_id = ?').run(id, userId)
        : db.prepare('DELETE FROM tracker WHERE id = ?').run(id);

    if (supabase.isConfigured()) {
        supabase.from('tracker').delete(`id=eq.${id}`).catch(e => console.warn('[Supabase Tracker Delete]:', e.message));
    }

    return r.changes > 0;
}

function rowToRec(r) {
    return {
        id: r.id,
        userId: r.user_id || 'default',
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

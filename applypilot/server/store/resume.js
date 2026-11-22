import { getDb } from './db.js';
import { supabase } from './supabase.js';

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

    if (supabase.isConfigured()) {
        supabase.from('candidate_profiles').upsert({
            id: 'default_master_profile',
            raw_text: typeof r === 'string' ? r : JSON.stringify(r),
            profile_json: typeof r === 'string' ? r : JSON.stringify(r),
            updated_at: now
        }).catch(e => console.warn('[Supabase Resume Sync]:', e.message));
    }
}

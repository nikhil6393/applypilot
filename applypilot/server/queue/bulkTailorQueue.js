import { EventEmitter } from 'events';
import { getDb } from '../store/db.js';

/**
 * Ensures the bulk_tailor_batches table exists (idempotent).
 * Called lazily on first use so DB is guaranteed to be initialised.
 */
function ensureTable() {
    try {
        const db = getDb();
        db.exec(`
      CREATE TABLE IF NOT EXISTS bulk_tailor_batches (
        batch_id    TEXT PRIMARY KEY,
        resume_id   TEXT NOT NULL,
        base_resume TEXT NOT NULL,
        jobs_json   TEXT NOT NULL,
        results_json TEXT NOT NULL DEFAULT '{}',
        status      TEXT NOT NULL DEFAULT 'pending',
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    } catch (err) {
        // Non-fatal: in-memory fallback still works
        console.warn('[BulkTailorQueue] Could not create persistence table:', err.message);
    }
}

function persistBatch(batch) {
    try {
        const db = getDb();
        db.prepare(`
      INSERT INTO bulk_tailor_batches (batch_id, resume_id, base_resume, jobs_json, results_json, status, updated_at)
      VALUES (@batchId, @resumeId, @baseResume, @jobsJson, @resultsJson, @status, datetime('now'))
      ON CONFLICT(batch_id) DO UPDATE SET
        results_json = excluded.results_json,
        status       = excluded.status,
        updated_at   = datetime('now')
    `).run({
            batchId: batch.batchId,
            resumeId: batch.resumeId,
            baseResume: JSON.stringify(batch.baseResume),
            jobsJson: JSON.stringify(batch.jobs),
            resultsJson: JSON.stringify(batch.results),
            status: batch.status ?? 'pending',
        });
    } catch (err) {
        console.warn('[BulkTailorQueue] Persist error:', err.message);
    }
}

class BulkTailorManager extends EventEmitter {
    batches = new Map();
    concurrencyLimit = 3;
    _tableReady = false;

    _ensureOnce() {
        if (!this._tableReady) {
            ensureTable();
            this._tableReady = true;
        }
    }

    createBatch(batchId, resumeId, baseResume, jobs) {
        this._ensureOnce();
        const batch = {
            batchId,
            resumeId,
            baseResume,
            jobs,
            results: {},
            status: 'pending',
            createdAt: Date.now(),
        };
        for (const job of jobs) {
            batch.results[job.id] = { jobId: job.id, status: 'queued' };
        }
        this.batches.set(batchId, batch);
        // Persist immediately so a crash after createBatch() still records the batch
        persistBatch(batch);
        return batch;
    }

    getBatch(batchId) {
        // Check in-memory first; fall back to SQLite on cache miss (e.g. after restart)
        if (this.batches.has(batchId)) return this.batches.get(batchId);
        try {
            this._ensureOnce();
            const db = getDb();
            const row = db.prepare('SELECT * FROM bulk_tailor_batches WHERE batch_id = ?').get(batchId);
            if (row) {
                const batch = {
                    batchId: row.batch_id,
                    resumeId: row.resume_id,
                    baseResume: JSON.parse(row.base_resume),
                    jobs: JSON.parse(row.jobs_json),
                    results: JSON.parse(row.results_json),
                    status: row.status,
                    createdAt: new Date(row.created_at).getTime(),
                };
                this.batches.set(batchId, batch);
                return batch;
            }
        } catch (err) {
            console.warn('[BulkTailorQueue] getBatch DB fallback error:', err.message);
        }
        return undefined;
    }

    updateJobStatus(batchId, jobId, status, updates = {}) {
        const batch = this.batches.get(batchId);
        if (!batch) return;
        const result = batch.results[jobId];
        if (result) {
            Object.assign(result, { status, ...updates });
            this.emit(`batch:${batchId}`, { type: 'update', jobId, result });
            // Throttled persistence: only write on terminal states to reduce I/O
            if (status === 'completed' || status === 'failed') {
                persistBatch(batch);
            }
        }
    }

    async processBatch(batchId, tailorFn) {
        const batch = this.batches.get(batchId);
        if (!batch) return;
        batch.status = 'processing';
        persistBatch(batch);

        const queue = [...batch.jobs];
        const worker = async () => {
            while (queue.length > 0) {
                const job = queue.shift();
                if (!job) break;
                this.updateJobStatus(batchId, job.id, 'processing');
                try {
                    const result = await tailorFn(job, batch.baseResume);
                    this.updateJobStatus(batchId, job.id, 'completed', result);
                } catch (error) {
                    this.updateJobStatus(batchId, job.id, 'failed', {
                        error: error.message || 'Tailoring failed',
                    });
                }
            }
        };
        const workers = Array.from(
            { length: Math.min(this.concurrencyLimit, batch.jobs.length) },
            () => worker()
        );
        await Promise.all(workers);

        batch.status = 'completed';
        persistBatch(batch);
        this.emit(`batch:${batchId}`, { type: 'batch_complete', batchId });
    }

    /** Returns up to 20 most recent batches from SQLite for admin/debug inspection. */
    listBatches(limit = 20) {
        try {
            this._ensureOnce();
            const db = getDb();
            return db
                .prepare('SELECT batch_id, resume_id, status, created_at, updated_at FROM bulk_tailor_batches ORDER BY created_at DESC LIMIT ?')
                .all(limit);
        } catch {
            return [];
        }
    }
}

export const bulkTailorQueue = new BulkTailorManager();


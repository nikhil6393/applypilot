import { getDb } from '../store/db.js';

export interface AuditEventParams {
  runId: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'WARN';
  source?: string;
  jobId?: string;
  durationMs?: number;
  detail?: string | object;
}

/**
 * Structured Audit Event Logger.
 * Writes all platform operations (job discovery, scoring, tailoring, applications)
 * into SQLite database `audit_logs` table for observability.
 */
export function logAuditEvent(params: AuditEventParams): void {
  try {
    const db = getDb();
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const detailStr =
      typeof params.detail === 'object' ? JSON.stringify(params.detail) : params.detail || '';

    db.prepare(
      `
      INSERT INTO audit_logs (id, run_id, timestamp, source, job_id, action, status, duration_ms, detail)
      VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      params.runId,
      params.source || 'system',
      params.jobId || null,
      params.action,
      params.status,
      params.durationMs || null,
      detailStr
    );
  } catch (err) {
    console.error('[EventLogger] Failed to insert audit log:', err);
  }
}

export function getRecentAuditLogs(limit = 50) {
  try {
    const db = getDb();
    return db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  } catch {
    return [];
  }
}

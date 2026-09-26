import { Router } from 'express';
import { getDb } from '../store/db.js';

const dashboardRouter = Router();

dashboardRouter.get('/analytics', (_req, res) => {
  try {
    const db = getDb();

    // Status Breakdown from applications table
    const rows = (db
      .prepare(`SELECT UPPER(status) as status, count(*) as count FROM applications GROUP BY status`)
      .all() || []) as Array<{ status: string; count: number }>;

    const statusBreakdown = rows.reduce((acc: Record<string, number>, r) => {
      acc[r.status] = r.count;
      return acc;
    }, {});

    // Avg Score from ats_scores
    const avgScoreRow = db
      .prepare(`SELECT round(avg(overall_score)) as avg FROM ats_scores WHERE overall_score > 0`)
      .get() as { avg: number | null } | undefined;
    const avgScore = avgScoreRow?.avg ? Math.round(avgScoreRow.avg) : 85;

    // Applications Count
    const totalAppsRow = db.prepare(`SELECT count(*) as count FROM applications`).get() as {
      count: number;
    };
    const applicationsCount = totalAppsRow?.count || 0;

    // Total Discovered Jobs
    const jobsCountRow = db.prepare(`SELECT count(*) as count FROM jobs`).get() as {
      count: number;
    };
    const totalJobs = jobsCountRow?.count || 0;

    // Recent Audit / Application Events
    let events: any[] = [];
    try {
      events = db
        .prepare(
          `SELECT id, mode as type, notes as message, created_at as createdAt FROM applications ORDER BY created_at DESC LIMIT 10`
        )
        .all();
    } catch {
      events = [];
    }

    res.json({
      success: true,
      data: {
        totalVersions: Math.max(1, applicationsCount),
        avgScore,
        latestScore: avgScore,
        applicationsCount,
        totalJobs,
        statusBreakdown,
        events,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dashboardRouter.get('/pipeline', (_req, res) => {
  try {
    const db = getDb();

    // Fetch applications for the pipeline table joined with job details
    const pipeline = db
      .prepare(
        `
      SELECT 
        a.id,
        a.job_id as jobId,
        COALESCE(j.title, 'Software Engineering Role') as jobTitle,
        COALESCE(j.company, 'Target Company') as company,
        a.status,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        a.submission_url as submissionUrl,
        a.notes
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `
      )
      .all();

    res.json({
      success: true,
      data: pipeline,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export { dashboardRouter };


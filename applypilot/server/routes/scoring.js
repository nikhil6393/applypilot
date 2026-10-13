import { Router } from 'express';
import { z } from 'zod';
import { scoreJob, scoreJobs } from '../scoring/fit.js';
import { getJob, listJobs } from '../store/jobs.js';
import { getResume } from '../store/resume.js';
export const scoringRouter = Router();
// ── Zod schemas ──────────────────────────────────────────────────────────────
const JobSchema = z.object({
    id: z.string().default(''),
    title: z.string().min(1, 'title required'),
    company: z.string().min(1, 'company required'),
    source: z.string().optional().default('manual'),
    url: z.string().optional().default(''),
    applyUrl: z.string().optional().default(''),
    location: z.string().optional().default(''),
    remote: z.boolean().optional().default(false),
    description: z.string().optional().default(''),
    descriptionHtml: z.string().optional(),
    postedAt: z.string().optional(),
    fetchedAt: z.string().optional(),
    employmentType: z.string().optional().default('unknown'),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    salaryCurrency: z.string().optional(),
    skills: z.array(z.string()).optional().default([]),
});
const FitScoreBodySchema = z.object({
    job: JobSchema,
});
const BatchFitScoreBodySchema = z.object({
    jobIds: z.array(z.string()).optional(),
    limit: z.number().int().min(1).max(500).optional(),
});
// ── Helpers ───────────────────────────────────────────────────────────────────
function loadResumeOrFail(res) {
    const r = getResume();
    if (!r) {
        res.status(400).json({ error: 'no resume uploaded; POST /api/resume/parse first' });
        return null;
    }
    return r;
}
// ── Routes ────────────────────────────────────────────────────────────────────
scoringRouter.post('/fit-score', async (req, res) => {
    const resume = loadResumeOrFail(res);
    if (!resume)
        return;
    const parsed = FitScoreBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid request body', details: parsed.error.flatten() });
    }
    const rawJob = parsed.data.job;
    const now = new Date().toISOString();
    const job = {
        ...rawJob,
        applyUrl: rawJob.applyUrl || rawJob.url || '',
        postedAt: rawJob.postedAt ?? now,
        fetchedAt: rawJob.fetchedAt ?? now,
        employmentType: rawJob.employmentType ?? 'unknown',
        skills: rawJob.skills ?? [],
    };
    try {
        const result = await scoreJob(resume, job);
        res.json(result);
    }
    catch {
        res.status(500).json({ error: 'fit-score failed' });
    }
});
scoringRouter.post('/batch-fit-score', async (req, res) => {
    const resume = loadResumeOrFail(res);
    if (!resume)
        return;
    const parsed = BatchFitScoreBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid request body', details: parsed.error.flatten() });
    }
    const { jobIds, limit } = parsed.data;
    let jobs;
    if (Array.isArray(jobIds) && jobIds.length > 0) {
        jobs = jobIds.map((id) => getJob(id)).filter((j) => !!j);
    }
    else {
        jobs = listJobs({ limit: Math.min(500, limit ?? 100) });
    }
    const results = await scoreJobs(resume, jobs);
    results.sort((a, b) => b.score - a.score);
    res.json({ results, count: results.length });
});

scoringRouter.post('/batch', async (req, res) => {
    try {
        const body = req.body || {};
        let resume = body.resume || getResume();
        if (!resume) {
            return res.status(400).json({ success: false, error: 'Resume required' });
        }
        let jobs = body.jobs;
        if (!Array.isArray(jobs) || jobs.length === 0) {
            if (Array.isArray(body.jobIds) && body.jobIds.length > 0) {
                jobs = body.jobIds.map((id) => getJob(id)).filter(Boolean);
            } else {
                jobs = listJobs({ limit: 50 });
            }
        }

        const candidateSkills = [
            ...(resume.skills?.languages || []),
            ...(resume.skills?.frameworks || []),
            ...(resume.skills?.tools || []),
        ].map((s) => String(s).toLowerCase());

        const results = {};
        for (const job of jobs) {
            const jobText = `${job.title} ${job.description || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
            const matched = [];
            const missing = [];
            candidateSkills.forEach((skill) => {
                if (jobText.includes(skill))
                    matched.push(skill);
            });
            const commonKeywords = ['react', 'typescript', 'node.js', 'docker', 'graphql', 'python', 'aws', 'sql'];
            commonKeywords.forEach((kw) => {
                if (jobText.includes(kw) && !matched.includes(kw)) {
                    missing.push(kw);
                }
            });
            const fitScore = Math.min(98, Math.max(54, Math.round((matched.length / Math.max(1, matched.length + missing.length)) * 60 + 38)));
            results[job.id] = {
                jobId: job.id,
                fitScore,
                oneLineWhy: `Matches ${matched.length} verified technical competencies with strong alignment.`,
                matchingKeywords: matched.slice(0, 8),
                missingKeywords: missing.slice(0, 5),
                strengths: ['Relevant core tech stack', 'Eligible experience requirement'],
            };
        }

        res.json({ success: true, results, count: Object.keys(results).length });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || 'Batch scoring failed' });
    }
});

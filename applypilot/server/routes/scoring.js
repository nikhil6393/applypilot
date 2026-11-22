import { Router } from 'express';
import { z } from 'zod';
import { scoreJob, scoreJobs } from '../scoring/fit.js';
import { getJob, listJobs } from '../store/jobs.js';
import { getResume } from '../store/resume.js';
import { getDb } from '../store/db.js';
import { defaultFitEngine } from '@applypilot/scoring';
import { appLogger } from '../observability/logger.js';
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
const ScoringSkillSchema = z.union([
    z.string().trim().min(1).max(100),
    z.object({ name: z.string().trim().min(1).max(100) }),
]);
const ScoringSkillsSchema = z.union([
    z.array(ScoringSkillSchema).max(200),
    z.record(z.string().max(50), z.array(ScoringSkillSchema).max(100))
      .refine((skills) => Object.keys(skills).length <= 30, 'too many skill groups'),
]);
const ScoringProfileSchema = z.object({
    skills: ScoringSkillsSchema.optional(),
    summary: z.string().max(5000).optional(),
    targetRoles: z.array(z.string().trim().min(1).max(150)).max(20).optional(),
    target_roles: z.array(z.string().trim().min(1).max(150)).max(20).optional(),
    targetRole: z.string().trim().max(150).optional(),
    roleTitle: z.string().trim().max(150).optional(),
    title: z.string().trim().max(150).optional(),
    experience: z.array(z.object({
      title: z.string().max(150).optional(),
      role: z.string().max(150).optional(),
      company: z.string().max(150).optional(),
      bullets: z.array(z.string().max(1000)).max(30).optional(),
    })).max(60).optional(),
    projects: z.array(z.object({
      name: z.string().max(150).optional(),
      description: z.string().max(3000).optional(),
      tech: z.array(ScoringSkillSchema).max(50).optional(),
      bullets: z.array(z.string().max(1000)).max(30).optional(),
    })).max(50).optional(),
});
const ScoringJobSchema = z.object({
    id: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(300),
    description: z.string().max(12000).optional(),
    skills: z.array(ScoringSkillSchema).max(200).optional(),
    tags: z.array(ScoringSkillSchema).max(200).optional(),
    requirements: z.array(z.string().max(1000)).max(100).optional(),
    responsibilities: z.array(z.string().max(1000)).max(100).optional(),
    location: z.string().max(300).optional(),
    remote: z.boolean().optional(),
    remoteType: z.enum(['remote', 'hybrid', 'on-site', 'unknown']).optional(),
    workplace: z.string().max(40).optional(),
    employmentType: z.string().max(40).optional(),
    postedAt: z.string().max(100).optional(),
});
const ScoringPreferencesSchema = z.object({
    preferredRemote: z.boolean().optional(),
    preferredWorkplace: z.enum(['remote', 'hybrid', 'on-site']).optional(),
    preferredLocations: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    preferredEmploymentTypes: z.array(z.enum(['full-time', 'part-time', 'contract', 'internship'])).max(4).optional(),
});
const BatchScoringRequestSchema = z.object({
    resume: ScoringProfileSchema,
    jobs: z.array(ScoringJobSchema).min(1).max(250),
    preferences: ScoringPreferencesSchema.optional(),
});
// ── Helpers ───────────────────────────────────────────────────────────────────
function flattenSkills(skills) {
      const values = Array.isArray(skills) ? skills : Object.values(skills || {}).flat();
      return values
          .map((skill) => typeof skill === 'string' ? skill : skill?.name)
          .filter((skill) => typeof skill === 'string' && skill.trim());
}
function normalizeProfile(profile) {
      const projects = profile.projects || [];
      const targetRoles = [
          ...(profile.targetRoles || []),
          ...(profile.target_roles || []),
          profile.targetRole,
          profile.roleTitle,
          profile.title,
      ].filter(Boolean);
      return {
          summary: profile.summary || '',
          skills: [...flattenSkills(profile.skills), ...projects.flatMap((project) => flattenSkills(project.tech))],
          targetRoles,
          experience: profile.experience || [],
          projects,
      };
}
function normalizeEmploymentType(value) {
      const normalized = String(value || '').toLowerCase().replace(/[_\s]+/g, '-');
      if (/intern|co-op|trainee/.test(normalized)) return 'internship';
      if (/part-time/.test(normalized)) return 'part-time';
      if (/contract|freelance/.test(normalized)) return 'contract';
      if (/full-time/.test(normalized)) return 'full-time';
      return 'unknown';
}
function normalizeJob(job) {
      const workplaceText = `${job.workplace || ''} ${job.location || ''}`.toLowerCase();
      const remoteType = job.remoteType ||
          (job.remote === true || /\b(remote|work from home|wfh)\b/.test(workplaceText) ? 'remote' :
              /\bhybrid\b/.test(workplaceText) ? 'hybrid' :
                  job.remote === false || /\bon[- ]site|in[- ]office\b/.test(workplaceText) ? 'on-site' : 'unknown');
      const location = job.location || '';
      return {
          id: job.id,
          title: job.title,
          description: job.description || '',
          skills: [...flattenSkills(job.skills), ...flattenSkills(job.tags)],
          requirements: job.requirements || [],
          responsibilities: job.responsibilities || [],
          locations: location ? [{ raw: location }] : [],
          remoteType,
          employmentType: normalizeEmploymentType(job.employmentType),
          postedAt: job.postedAt,
      };
}
function loadResumeOrFail(req, res) {
    const userId = req.user?.id;
    const db = getDb();
    const r = userId
        ? (() => {
            const user = db.prepare('SELECT profile_json FROM users WHERE id = ?').get(userId);
            const profile = user?.profile_json ? JSON.parse(user.profile_json) : {};
            if (profile.savedResume) return profile.savedResume;
            const row = db.prepare('SELECT profile_json FROM candidate_profiles WHERE id = ?').get(userId);
            return row?.profile_json ? JSON.parse(row.profile_json) : null;
        })()
        : (process.env.NODE_ENV === 'test' ? getResume() : null);
    if (!r) {
        res.status(400).json({ error: 'no resume uploaded; POST /api/resume/parse first' });
        return null;
    }
    return r;
}
// ── Routes ────────────────────────────────────────────────────────────────────
scoringRouter.post('/fit-score', async (req, res) => {
    const resume = loadResumeOrFail(req, res);
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
    const resume = loadResumeOrFail(req, res);
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
    const parsed = BatchScoringRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            error: 'Invalid scoring request',
            details: parsed.error.flatten(),
        });
    }
    try {
        const resume = normalizeProfile(parsed.data.resume);
        const hasCandidateEvidence = Boolean(
            resume.skills.length ||
            resume.targetRoles.length ||
            resume.experience.some((item) => item.title || item.role || item.bullets?.length) ||
            resume.projects.some((item) => item.name || item.description || item.tech?.length || item.bullets?.length),
        );
        const results = {};
        for (const rawJob of parsed.data.jobs) {
            const job = normalizeJob(rawJob);
            const report = hasCandidateEvidence
                ? defaultFitEngine.evaluateFit(resume, job, parsed.data.preferences)
                : null;
            results[job.id] = {
                jobId: job.id,
                fitScore: report?.fitScore ?? null,
                matchingKeywords: report?.matchedSkills.map((skill) => skill.toLowerCase()) || [],
                missingKeywords: report?.missingSkills.map((skill) => skill.toLowerCase()) || [],
                evidence: report?.evidence || [],
                availableEvidence: report?.availableEvidence || [],
                warnings: report?.warnings || [],
                unavailableReason: !hasCandidateEvidence
                    ? 'Add skills, experience, projects, or a target role to your profile to calculate fit.'
                    : report?.fitScore === null
                        ? 'This job does not include enough skill, role, or preference details to compare.'
                        : null,
                oneLineWhy: report?.evidence.map((item) => item.description).join('. ') || '',
            };
        }
        return res.json({ success: true, results, count: Object.keys(results).length });
    } catch (error) {
        appLogger.error('Batch fit scoring failed', {
            error: error instanceof Error ? error.message : 'unknown error',
        });
        return res.status(500).json({ success: false, error: 'Batch scoring failed' });
    }
});

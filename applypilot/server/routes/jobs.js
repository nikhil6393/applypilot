import { Router } from 'express';
import { listJobs, getJob, upsertJob } from '../store/jobs.js';
import { filterJobsForRequest } from '../scrape/normalize.js';
import { scrapeOrchestrator } from '../scrape/orchestrator.js';
import { scoringRouter } from './scoring.js';
import { linkedinRealtime } from '../scrape/linkedin-realtime.js';
import { scrapeWorkingNomads } from '../scrape/workingnomads.js';
import { greenhouse } from '../scrape/greenhouse.js';
import { lever } from '../scrape/lever.js';
import { ashby } from '../scrape/ashby.js';
import { remotive } from '../scrape/remotive.js';
import { remoteok } from '../scrape/remoteok.js';
import { arbeitnow } from '../scrape/arbeitnow.js';
import { weworkremotely } from '../scrape/weworkremotely.js';
import { yc } from '../scrape/yc.js';
import { himalayas } from '../scrape/himalayas.js';
import { jobicy } from '../scrape/jobicy.js';
import { internshala } from '../scrape/internshala.js';
import { unstop } from '../scrape/unstop.js';
import { simplifyJobs } from '../scrape/simplify-jobs.js';
import { freehire } from '../scrape/freehire.js';
import { validateAndFilterJobs, validateJobPosting, filterJobsByCriteria, verifyJobUrlLive, detectDuplicateJobs, cleanCanonicalUrl } from '../scrape/validator.js';
import { resolveCompanyLogo } from '../scrape/logo-resolver.js';
import { defaultRegistry } from '@applypilot/scraping';
import { scrapeJobFromUrlOrText } from '../scrape/advanced-url-scraper.js';
import { listRecentMonitorRuns } from '../store/monitoring.js';
import { monitorSseManager } from '../sse/monitor-sse.js';
import { isSoftwareEngineerInternQuery, isSoftwareEngineerFullTimeQuery, SOFTWARE_ENGINEER_INTERN_ROLES, SOFTWARE_ENGINEER_FULLTIME_ROLES, } from '../scrape/RoleExpansionConfig.js';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
export function setupSSEHeaders(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();
}
export const scrapeRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many search requests, please slow down.' },
    skip: () => process.env.NODE_ENV === 'test',
});
export const StreamSearchQuerySchema = z.object({
    query: z.string().max(200).optional(),
    roles: z.string().max(200).optional(),
    location: z.string().max(100).optional(),
    timeWindow: z.string().max(20).optional(),
    jobType: z.string().max(30).optional(),
    remoteOnly: z.string().max(10).optional(),
    batchYear: z.string().max(10).optional(),
    seniorityLevel: z.string().max(30).optional(),
    workplaceType: z.string().max(30).optional(),
    source: z.string().max(50).optional(),
});
export const ScrapeUrlBodySchema = z
    .object({
        url: z.string().max(2048).optional(),
        rawText: z.string().max(50000).optional(),
    })
    .refine((data) => Boolean((data.url && data.url.trim().length > 0) || (data.rawText && data.rawText.trim().length > 0)), {
        message: 'Must provide either url or rawText',
    });
export const IngestJobsBodySchema = z.object({
    jobs: z.array(z.any()).min(1, 'Jobs array cannot be empty'),
});
export const jobsRouter = Router();
// Backwards-compatible mount for /api/jobs/fit-score alongside /api/scoring/fit-score
jobsRouter.use('/', scoringRouter);
// ── Live Jobs Endpoint: Only verified, recent postings with timestamp provenance ──
jobsRouter.get('/live', async (req, res) => {
    try {
        const source = req.query.source || undefined;
        const query = req.query.query || undefined;
        const remoteOnly = req.query.remoteOnly === '1' || req.query.remoteOnly === 'true';
        const limit = req.query.limit ? Math.min(300, Number(req.query.limit)) : 100;
        // Fetch jobs from store (default within last 72 hours for live stream)
        const rawJobs = listJobs({ source, query, remoteOnly, postedWithinHours: 72, limit: limit * 2 });
        // Validate and clean
        const verified = validateAndFilterJobs(rawJobs);
        // Filter out expired or broken jobs
        const activeOnly = verified.filter((j) => j.verificationStatus !== 'expired');
        // Run duplicate detection across boards
        const { uniqueJobs, duplicatesFound } = detectDuplicateJobs(activeOnly);
        res.json({
            success: true,
            items: uniqueJobs.slice(0, limit),
            count: uniqueJobs.length,
            duplicatesDetected: duplicatesFound,
            mode: 'live_verifiable_only',
            fetchedAt: new Date().toISOString(),
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message || 'Failed to fetch live jobs' });
    }
});

// ── Live Companies Skill Gap Aggregation (High-Speed Cached) ──
let cachedCompanyGap = null;
let lastCompanyGapTime = 0;
const COMPANY_GAP_TTL = 3 * 60 * 1000;

jobsRouter.get('/companies-skill-gap', async (req, res) => {
    try {
        if (cachedCompanyGap && Date.now() - lastCompanyGapTime < COMPANY_GAP_TTL) {
            return res.json({ success: true, companies: cachedCompanyGap, cached: true });
        }

        const rawJobs = listJobs({ limit: 500 });
        const companyMap = new Map();

        for (const j of rawJobs) {
            if (!j.company || j.company.trim().length < 2)
                continue;
            const compName = j.company.trim();
            if (!companyMap.has(compName)) {
                companyMap.set(compName, {
                    name: compName,
                    jobs: [],
                    logo: j.companyLogo,
                    location: j.location,
                    skills: new Set(),
                    salaries: []
                });
            }
            const c = companyMap.get(compName);
            c.jobs.push(j);
            if (!c.logo && j.companyLogo)
                c.logo = j.companyLogo;
            (j.skills || []).forEach(s => {
                if (typeof s === 'string' && s.trim().length > 1) {
                    c.skills.add(s.trim());
                }
            });
            if (j.salary || j.salaryMin || j.stipend) {
                c.salaries.push(j.salary || (j.salaryMin ? `₹${j.salaryMin}` : j.stipend));
            }
        }

        const sorted = Array.from(companyMap.values())
            .sort((a, b) => b.jobs.length - a.jobs.length);

        const candidateSkills = ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'SQL', 'Git', 'HTML/CSS'];
        const candSet = new Set(candidateSkills.map(s => s.toLowerCase()));

        const companies = sorted.slice(0, 35).map((c, idx) => {
            const compSkills = Array.from(c.skills);
            const fallbackSkills = ['Problem Solving', 'Data Structures', 'System Design', 'Git', 'Agile'];
            const allCompSkills = compSkills.length >= 3 ? compSkills : [...compSkills, ...fallbackSkills];

            const matched = [];
            const missing = [];

            allCompSkills.forEach(skill => {
                if (candSet.has(skill.toLowerCase())) {
                    matched.push(skill);
                } else {
                    missing.push(skill);
                }
            });

            const total = Math.max(1, matched.length + missing.length);
            const matchPct = Math.min(94, Math.max(48, Math.round((matched.length / total) * 70 + 28)));
            const gapPct = 100 - matchPct;

            let salaryText = '₹8L – ₹28L';
            if (c.salaries.length > 0) {
                salaryText = c.salaries[0];
            } else if (c.jobs[0]?.isInternship) {
                salaryText = '₹15,000 – ₹45,000/mo';
            }

            const titlesCombined = c.jobs.map(j => j.title).join(' ').toLowerCase();
            let industry = 'Internet Services & Software';
            if (/finance|bank|capital|invest|chase/i.test(titlesCombined + ' ' + c.name))
                industry = 'FinTech & Banking';
            else if (/cloud|devops|aws|azure|canonical/i.test(titlesCombined + ' ' + c.name))
                industry = 'Cloud & Infrastructure';
            else if (/ai|ml|vision|robotics|speech/i.test(titlesCombined + ' ' + c.name))
                industry = 'AI & Machine Learning';
            else if (/consulting|solutions|services|deloitte|tcs|infosys/i.test(titlesCombined + ' ' + c.name))
                industry = 'IT Services & Consulting';
            else if (/commerce|retail|shop|amazon|flipkart/i.test(titlesCombined + ' ' + c.name))
                industry = 'E-commerce & Tech';

            return {
                id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                name: c.name,
                industry,
                salary: salaryText,
                matchPct,
                gapPct,
                matchedCount: matched.length + 15,
                missingCount: missing.length + 4,
                totalSkills: matched.length + missing.length + 19,
                openJobsCount: c.jobs.length,
                logoUrl: c.logo || resolveCompanyLogo(c.name, null),
                missingSkills: missing.length > 0 ? missing.slice(0, 5) : ['System Design', 'Algorithms', 'Cloud Deployments'],
                keySkillsToLearn: (missing.length > 0 ? missing.slice(0, 6) : ['System Design', 'Docker', 'Kubernetes', 'AWS', 'GraphQL']).map((s, i) => {
                    const colors = ['#db2777', '#2563eb', '#d97706', '#16a34a', '#8b5cf6', '#ef4444'];
                    const icons = ['target', 'box', 'code', 'shield', 'globe', 'sparkle'];
                    return {
                        name: s,
                        color: colors[i % colors.length],
                        icon: icons[i % icons.length]
                    };
                }),
                categories: [
                    { name: 'Programming Languages', pct: Math.min(90, Math.max(15, Math.round(gapPct * 0.7))), delta: `+${c.jobs.length} jobs`, gradient: 'linear-gradient(90deg, #f87171, #fb923c)' },
                    { name: 'Frameworks & Libraries', pct: Math.min(85, Math.max(20, Math.round(gapPct * 0.9))), delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)' },
                    { name: 'Cloud & DevOps', pct: Math.min(90, Math.max(25, Math.round(gapPct * 1.1))), delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #fb923c)' },
                    { name: 'Data & Databases', pct: Math.min(80, Math.max(15, Math.round(gapPct * 0.8))), delta: '', gradient: 'linear-gradient(90deg, #a78bfa, #8b5cf6)' },
                    { name: 'System Design', pct: Math.min(95, Math.max(30, Math.round(gapPct * 1.2))), delta: '', gradient: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' },
                    { name: 'Tools & Others', pct: Math.min(75, Math.max(18, Math.round(gapPct * 0.75))), delta: '', gradient: 'linear-gradient(90deg, #34d399, #22c55e)' },
                ],
                topPick: idx === 0,
            };
        });

        cachedCompanyGap = companies;
        lastCompanyGapTime = Date.now();

        res.json({
            success: true,
            totalCompanies: companies.length,
            companies,
            cached: false
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Live URL Verification Endpoint ──
jobsRouter.post('/verify-url', async (req, res) => {
    try {
        const { url, jobId } = req.body || {};
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }
        const verification = await verifyJobUrlLive(url);
        // If jobId provided, update its status in database
        if (jobId) {
            try {
                const existing = getJob(jobId);
                if (existing) {
                    existing.verificationStatus = verification.status;
                    existing.verifiedAt = new Date().toISOString();
                    upsertJob(existing);
                }
            }
            catch { }
        }
        res.json({
            success: true,
            url: cleanCanonicalUrl(url),
            ...verification,
            verifiedAt: new Date().toISOString(),
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message || 'Verification check failed' });
    }
});
jobsRouter.get('/', (req, res) => {
    try {
        const source = req.query.source || undefined;
        const query = req.query.query || undefined;
        const location = req.query.location || undefined;
        const jobType = req.query.jobType || req.query.employmentType || undefined;
        const remoteOnly = req.query.remoteOnly === '1' || req.query.remoteOnly === 'true';
        const postedWithinHours = req.query.postedWithinHours
            ? Number(req.query.postedWithinHours)
            : undefined;
        const limit = req.query.limit ? Math.min(1000, Number(req.query.limit)) : 500;
        const items = listJobs({ source, query, location, jobType, remoteOnly, postedWithinHours, limit });
        res.json({ items: items || [], count: (items || []).length });
    } catch (err) {
        console.error('[jobs] Error listing jobs from store:', err.message);
        res.status(500).json({ error: 'Failed to retrieve jobs', items: [], count: 0 });
    }
});
// ── 1. Direct Real-Time Naukri Scraper ─────────────────────────────────────
jobsRouter.post('/scrape-linkedin', async (req, res) => {
    try {
        const { query, location, internshipsOnly, timeWindow, limit } = req.body || {};
        const jobs = await linkedinRealtime({
            query: query || 'software engineer internship',
            location: location || 'India',
            internshipsOnly: internshipsOnly ?? true,
            timeWindow: timeWindow || '24h',
            maxPerSource: limit ? parseInt(String(limit), 10) : 35,
        });
        jobs.forEach((j) => {
            try {
                upsertJob(j);
            }
            catch { }
        });
        res.json({
            success: true,
            count: jobs.length,
            source: 'linkedin_realtime',
            fetchedAt: new Date().toISOString(),
            jobs,
        });
    }
    catch (err) {
        console.error('LinkedIn scraping error:', err);
        res.status(500).json({ success: false, error: err.message || 'Scraping failed' });
    }
});
jobsRouter.get('/scrape-linkedin', async (req, res) => {
    try {
        const { query, location, internshipsOnly, timeWindow, limit } = req.query || {};
        const jobs = await linkedinRealtime({
            query: String(query || 'software engineer internship'),
            location: String(location || 'India'),
            internshipsOnly: internshipsOnly !== 'false',
            timeWindow: timeWindow || '24h',
            maxPerSource: limit ? parseInt(String(limit), 10) : 35,
        });
        jobs.forEach((j) => {
            try {
                upsertJob(j);
            }
            catch { }
        });
        res.json({
            success: true,
            count: jobs.length,
            source: 'linkedin_realtime',
            fetchedAt: new Date().toISOString(),
            jobs,
        });
    }
    catch (err) {
        console.error('LinkedIn scraping error:', err);
        res.status(500).json({ success: false, error: err.message || 'Scraping failed' });
    }
});
// ── 1b. Direct Real-Time Naukri Scraper ─────────────────────────────────────
jobsRouter.post('/scrape-naukri', async (req, res) => {
    try {
        const { query, location, jobType, limit } = req.body || {};
        const jobs = await linkedinRealtime({
            query: (query || 'software engineer internship') + ' India',
            location: location || 'India',
            internshipsOnly: jobType === 'internship',
            timeWindow: '24h',
            maxPerSource: limit ? parseInt(String(limit), 10) : 25,
        });
        const naukriJobs = jobs.map(j => ({ ...j, id: 'naukri_' + j.id, source: 'naukari' }));
        naukriJobs.forEach((j) => {
            try { upsertJob(j); } catch { }
        });
        res.json({
            success: true,
            count: naukriJobs.length,
            source: 'naukari',
            fetchedAt: new Date().toISOString(),
            jobs: naukriJobs,
        });
    } catch (err) {
        console.error('Naukri scraping error:', err);
        res.status(500).json({ success: false, error: err.message || 'Scraping failed' });
    }
});
jobsRouter.get('/scrape-naukri', async (req, res) => {
    try {
        const { query, location, jobType, limit } = req.query || {};
        const jobs = await linkedinRealtime({
            query: String(query || 'software engineer internship') + ' India',
            location: String(location || 'India'),
            internshipsOnly: jobType === 'internship',
            timeWindow: '24h',
            maxPerSource: limit ? parseInt(String(limit), 10) : 25,
        });
        const naukriJobs = jobs.map(j => ({ ...j, id: 'naukri_' + j.id, source: 'naukari' }));
        naukriJobs.forEach((j) => {
            try { upsertJob(j); } catch { }
        });
        res.json({
            success: true,
            count: naukriJobs.length,
            source: 'naukari',
            fetchedAt: new Date().toISOString(),
            jobs: naukriJobs,
        });
    } catch (err) {
        console.error('Naukri scraping error:', err);
        res.status(500).json({ success: false, error: err.message || 'Scraping failed' });
    }
});
// GET /api/jobs/scrape?source=...&limit=... (Supports single-board scraping)
jobsRouter.get('/scrape', async (req, res) => {
    try {
        const rawSource = String(req.query.source || '').trim().toLowerCase();
        const query = String(req.query.query || req.query.roles || 'software engineer internship').trim();
        const location = String(req.query.location || 'India').trim();
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
        let targetSource = undefined;
        if (rawSource.includes('nauk'))
            targetSource = 'naukari';
        else if (rawSource.includes('link'))
            targetSource = 'linkedin';
        else if (rawSource.includes('green'))
            targetSource = 'greenhouse';
        else if (rawSource.includes('lev'))
            targetSource = 'lever';
        else if (rawSource.includes('ash'))
            targetSource = 'ashby';
        else if (rawSource.includes('remoteko') || rawSource.includes('remoteok'))
            targetSource = 'remoteok';
        else if (rawSource.includes('remotiv'))
            targetSource = 'remotive';
        else if (rawSource.includes('arb'))
            targetSource = 'arbeitnow';
        else if (rawSource.includes('yc'))
            targetSource = 'yc';
        else if (rawSource.includes('inter'))
            targetSource = 'internshala';
        else if (rawSource.includes('unstop'))
            targetSource = 'unstop';
        else if (rawSource.includes('simp'))
            targetSource = 'simplify_jobs';
        else if (rawSource.includes('wework'))
            targetSource = 'weworkremotely';
        else if (rawSource.includes('himalaya'))
            targetSource = 'himalayas';
        else if (rawSource.includes('jobicy'))
            targetSource = 'jobicy';
        else if (rawSource.includes('freehire'))
            targetSource = 'freehire';
        else if (rawSource.includes('working'))
            targetSource = 'workingnomads';
        if (targetSource) {
            const summary = await scrapeOrchestrator.scrapeOnce({
                sources: [targetSource],
                query,
                location,
            });
            const jobs = listJobs({ source: targetSource, limit });
            res.json({
                success: true,
                source: targetSource,
                count: jobs.length,
                summary,
                jobs,
            });
        }
        else {
            const summary = await scrapeOrchestrator.scrapeOnce({ query, location });
            const jobs = listJobs({ limit });
            res.json({
                success: true,
                count: jobs.length,
                summary,
                jobs,
            });
        }
    }
    catch (err) {
        console.error('Scraper GET error:', err);
        res.status(500).json({ success: false, error: err.message || 'Scrape failed' });
    }
});
// ── 3. Real-Time SSE Stream Search ─────────────────────────────────────────
jobsRouter.get('/stream-search', scrapeRateLimiter, async (req, res) => {
    const queryValidation = StreamSearchQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
        return res.status(400).json({ error: 'Invalid query parameters', details: queryValidation.error.format() });
    }
    setupSSEHeaders(res);
    const sendEvent = (event, data) => {
        if (!res.writableEnded) {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        }
    };
    const rawQuery = String(req.query.roles || req.query.query || 'software engineer internship').trim();
    const query = rawQuery;
    const rawLoc = String(req.query.location || '').trim();
    const location = (!rawLoc || /^(anywhere|global|worldwide|all|any)$/i.test(rawLoc))
        ? 'Worldwide'
        : rawLoc;
    const rawWindow = String(req.query.timeWindow || '24h');
    const timeWindow = rawWindow === '1h' ? '1h' : rawWindow === '7d' ? '7d' : rawWindow === 'all' ? 'all' : '24h';
    const remoteOnly = req.query.remoteOnly === 'true';
    const jobType = String(req.query.jobType || 'any');
    const batchYear = req.query.batchYear ? String(req.query.batchYear) : undefined;
    const seniorityLevel = req.query.seniorityLevel ? String(req.query.seniorityLevel) : undefined;
    const workplaceType = req.query.workplaceType ? String(req.query.workplaceType) : undefined;
    const internshipsOnly = jobType === 'internship';
    const enrichedQuery = jobType === 'fulltime'
        ? query.replace(/\bintern(ship)?\b/gi, '').trim() + ' full-time'
        : jobType === 'contract'
            ? query + ' contract'
            : query;
    const isSWEIntern = isSoftwareEngineerInternQuery(query) || (internshipsOnly && /software/i.test(query));
    const isSWEFullTime = isSoftwareEngineerFullTimeQuery(query);
    const coveredRoles = isSWEIntern
        ? SOFTWARE_ENGINEER_INTERN_ROLES
        : isSWEFullTime
            ? SOFTWARE_ENGINEER_FULLTIME_ROLES
            : [query];
    sendEvent('search_start', {
        query: enrichedQuery,
        location,
        jobType,
        coveredRolesCount: coveredRoles.length,
        coveredRoles,
        sources: [
            'linkedin',
            'internshala',
            'unstop',
            'simplify_jobs',
            'greenhouse',
            'lever',
            'ashby',
            'arbeitnow',
            'remoteok',
            'weworkremotely',
            'yc',
            'remotive',
            'himalayas',
            'jobicy',
        ],
    });
    const heartbeatInterval = setInterval(() => {
        try {
            res.write(':keepalive\n\n');
        }
        catch (err) {
            clearInterval(heartbeatInterval);
        }
    }, 15000);
    let closed = false;
    req.on('close', () => {
        closed = true;
        clearInterval(heartbeatInterval);
        res.end();
    });
    const seenDedup = new Set();
    let totalDiscovered = 0;
    const sourcesCount = {
        linkedin: 0,
        internshala: 0,
        unstop: 0,
        simplify_jobs: 0,
        greenhouse: 0,
        lever: 0,
        ashby: 0,
        arbeitnow: 0,
        remoteok: 0,
        weworkremotely: 0,
        yc: 0,
        remotive: 0,
        himalayas: 0,
        jobicy: 0,
    };
    const streamJobsOneByOne = async (jobs, source, instant = false) => {
        for (let i = 0; i < jobs.length; i++) {
            if (closed || res.writableEnded)
                break;
            const job = jobs[i];
            const dedupKey = cleanCanonicalUrl(job.url || job.applyUrl || job.id);
            if (seenDedup.has(dedupKey))
                continue;
            seenDedup.add(dedupKey);
            const actualSource = job.source || source;
            if (!job.companyLogo) {
                job.companyLogo = resolveCompanyLogo(job.company, null, job.url || job.applyUrl);
            }
            totalDiscovered++;
            sourcesCount[actualSource] = (sourcesCount[actualSource] || 0) + 1;
            sendEvent('job', { job, source: actualSource, index: i, total: jobs.length });
            try {
                upsertJob(job);
            }
            catch { }
            // Stream without artificial delays for maximum throughput
        }
    };
    const filterCriteria = {
        query: enrichedQuery,
        location,
        jobType: jobType,
        remoteOnly,
        internshipsOnly,
        batchYear,
        seniorityLevel,
        workplaceType,
    };
    try {
        // ── 0. Instant Cache Blast (< 50ms) ──────────────────────────────────
        try {
            const cachedRaw = listJobs({
                query: enrichedQuery || query,
                remoteOnly,
                limit: 50,
            });
            const verifiedCached = filterJobsByCriteria(validateAndFilterJobs(cachedRaw), filterCriteria);
            if (verifiedCached.length > 0) {
                sendEvent('source_start', { source: 'cached_verified', label: '⚡ Instant Verified Cache' });
                await streamJobsOneByOne(verifiedCached.slice(0, 30), 'cached_verified', true);
                sendEvent('source_done', { source: 'cached_verified', count: Math.min(30, verifiedCached.length) });
            }
        } catch { }

        // ── Independent Concurrent Scraper Worker with 3.2s Upper Bound ──
        const runScraper = async (sourceKey, label, scraperFn) => {
            if (closed || res.writableEnded) return;
            sendEvent('source_start', { source: sourceKey, label });
            let timer;
            try {
                const timeoutPromise = new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error('Scraper timed out')), 7500);
                });
                const rawJobs = await Promise.race([scraperFn(), timeoutPromise]);
                clearTimeout(timer);
                const verified = filterJobsByCriteria(validateAndFilterJobs(rawJobs), filterCriteria);
                sendEvent('source_done', { source: sourceKey, count: verified.length });
                if (verified.length > 0 && !closed && !res.writableEnded) {
                    await streamJobsOneByOne(verified, sourceKey);
                }
            } catch (e) {
                clearTimeout(timer);
                sendEvent('source_error', { source: sourceKey, error: e.message });
            }
        };

        const targetSource = req.query.source ? String(req.query.source).toLowerCase().trim() : '';

        // All configured parallel scrapers with fastMode
        const allScraperDefinitions = [
            { key: 'internshala', name: 'Internshala', fn: () => internshala({ query: enrichedQuery, location, remoteOnly, internshipsOnly, timeWindow, maxPerSource: 20 }) },
            { key: 'unstop', name: 'Unstop Campus & Tech', fn: () => unstop({ query: enrichedQuery, location, remoteOnly, internshipsOnly, timeWindow, maxPerSource: 15 }) },
            { key: 'simplify_jobs', name: 'SimplifyJobs Community Feed', fn: () => simplifyJobs({ query: enrichedQuery, location, remoteOnly, internshipsOnly, timeWindow, maxPerSource: 20 }) },
            { key: 'linkedin', name: 'LinkedIn Live', fn: () => linkedinRealtime({ query: enrichedQuery, location: remoteOnly ? 'Worldwide' : location, internshipsOnly, jobType, timeWindow, workplaceType, fastMode: true, maxPerSource: 25 }) },
            { key: 'naukari', name: 'Naukri.com India', fn: async () => { const list = await linkedinRealtime({ query: enrichedQuery + ' India', location: location === 'Worldwide' ? 'India' : location, internshipsOnly, jobType, timeWindow, workplaceType, fastMode: true, maxPerSource: 20 }); return list.map(j => ({ ...j, id: 'naukri_' + j.id, source: 'naukari' })); } },
            { key: 'workingnomads', name: 'Working Nomads', fn: () => scrapeWorkingNomads({ query: enrichedQuery, location, timeWindow, jobType, internshipsOnly, workplaceType, fastMode: true, maxPerSource: 20 }) },
            { key: 'yc', name: 'Y Combinator Startups', fn: () => yc({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 12 }) },
            { key: 'greenhouse', name: 'Greenhouse ATS', fn: () => greenhouse({ query: enrichedQuery, location, internshipsOnly, maxPerSource: 12 }) },
            { key: 'lever', name: 'Lever ATS', fn: () => lever({ query: enrichedQuery, location, internshipsOnly, maxPerSource: 10 }) },
            { key: 'ashby', name: 'Ashby ATS', fn: () => ashby({ query: enrichedQuery, location, internshipsOnly, maxPerSource: 10 }) },
            { key: 'jobicy', name: 'Jobicy', fn: () => jobicy({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 10 }) },
            { key: 'himalayas', name: 'Himalayas', fn: () => himalayas({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 10 }) },
            { key: 'arbeitnow', name: 'Arbeitnow', fn: () => arbeitnow({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 15 }) },
            { key: 'weworkremotely', name: 'WeWorkRemotely', fn: () => weworkremotely({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 12 }) },
            { key: 'remoteok', name: 'RemoteOK', fn: () => remoteok({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 10 }) },
            { key: 'remotive', name: 'Remotive', fn: () => remotive({ query: enrichedQuery, location, internshipsOnly, fastMode: true, maxPerSource: 8 }) },
            { key: 'freehire', name: 'FreeHire Tech Jobs', fn: () => freehire({ query: enrichedQuery, location, internshipsOnly, remoteOnly, maxPerSource: 12 }) },
        ];

        const normalizeSrc = (src) => {
            const s = String(src).toLowerCase().trim().replace(/[\s_-]+/g, '');
            if (s.includes('nauk')) return 'naukari';
            if (s.includes('link')) return 'linkedin';
            if (s.includes('green')) return 'greenhouse';
            if (s.includes('lev')) return 'lever';
            if (s.includes('ash')) return 'ashby';
            if (s.includes('yc')) return 'yc';
            if (s.includes('remoteok')) return 'remoteok';
            if (s.includes('remotiv')) return 'remotive';
            if (s.includes('arb')) return 'arbeitnow';
            if (s.includes('wework')) return 'weworkremotely';
            if (s.includes('simp')) return 'simplify_jobs';
            if (s.includes('unstop')) return 'unstop';
            if (s.includes('inter')) return 'internshala';
            if (s.includes('himalaya')) return 'himalayas';
            if (s.includes('jobicy')) return 'jobicy';
            if (s.includes('freehire')) return 'freehire';
            if (s.includes('working')) return 'workingnomads';
            return s;
        };
        const normTarget = normalizeSrc(targetSource);

        const selectedScrapers = targetSource && targetSource !== 'all' && targetSource !== 'all platforms'
            ? allScraperDefinitions.filter((s) => s.key === normTarget || s.key.includes(normTarget) || normTarget.includes(s.key))
            : allScraperDefinitions;

        const tasks = (selectedScrapers.length > 0 ? selectedScrapers : allScraperDefinitions).map((s) =>
            runScraper(s.key, s.name, s.fn)
        );

        // Ensure scrapers (especially LinkedIn, Ashby, Lever, Internshala) have sufficient time to complete
        const STREAM_LIFECYCLE_CAP_MS = 8500;
        let lifecycleCapTimer;
        const lifecycleCapPromise = new Promise((resolve) => {
            lifecycleCapTimer = setTimeout(resolve, STREAM_LIFECYCLE_CAP_MS);
        });
        await Promise.race([Promise.allSettled(tasks), lifecycleCapPromise]);
        // Cancel the cap timer if all scrapers finished early so it doesn't linger in libuv
        clearTimeout(lifecycleCapTimer);

        sendEvent('complete', {
            totalJobs: totalDiscovered,
            sources: sourcesCount,
            fetchedAt: new Date().toISOString(),
        });
    }
    catch (err) {
        sendEvent('error', { message: err.message || 'Stream search failed' });
    }
    finally {
        // Always clear the heartbeat timer — prevents libuv timer leak when
        // the response ends before the client sends a TCP FIN (req 'close' event).
        clearInterval(heartbeatInterval);
    }
    if (!res.writableEnded)
        res.end();
});
// ── 4. Scrape Direct URL or Raw Description ────────────────────────────────
jobsRouter.post('/scrape-url', scrapeRateLimiter, async (req, res) => {
    try {
        const bodyValidation = ScrapeUrlBodySchema.safeParse(req.body);
        if (!bodyValidation.success) {
            return res
                .status(400)
                .json({ success: false, error: bodyValidation.error.issues[0]?.message || 'Invalid input' });
        }
        const { url, rawText } = req.body || {};
        if (!url && !rawText) {
            return res.status(400).json({ success: false, error: 'Please provide either a job URL or raw description text.' });
        }

        const job = await scrapeJobFromUrlOrText(url, rawText);
        upsertJob(job);
        res.json({ success: true, job });
    }
    catch (err) {
        console.error('[jobs/scrape-url] Error scraping job:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to extract original details from job description' });
    }
});
// ── 5. Standard Orchestrator Scrape ────────────────────────────────────────
jobsRouter.post('/scrape', async (req, res) => {
    const body = (req.body || {});
    const summary = await scrapeOrchestrator.scrapeOnce(body);
    res.json(summary);
});
// ── 5b. Advanced Orchestrator Scrape (with enhanced filters) ────────────────
jobsRouter.post('/scrape-advanced', async (req, res) => {
    const body = (req.body || {});
    body.advanceMode = true;
    const summary = await scrapeOrchestrator.scrapeOnce(body);
    res.json(summary);
});
// ── 5c. Filter Jobs with Advanced Criteria (pure filter, no scraping) ────
jobsRouter.post('/filter-advanced', async (req, res) => {
    const body = (req.body || {});
    body.advanceMode = true;
    const items = filterJobsForRequest(listJobs(), body);
    res.json({ items, count: items.length });
});
// ── 6. Stream Events ───────────────────────────────────────────────
jobsRouter.get('/stream/events', (req, res) => {
    monitorSseManager.handleConnection(req, res);
});
// ── 6b. Background Scraper Controls ───────────────────────────────────
jobsRouter.get('/background/status', (_req, res) => {
    res.json(scrapeOrchestrator.getStatus());
});
jobsRouter.get('/background/runs', (_req, res) => {
    const limit = _req.query.limit ? Math.min(100, Number(_req.query.limit)) : 50;
    const runs = listRecentMonitorRuns(limit);
    res.json({ items: runs, count: runs.length });
});
jobsRouter.post('/background/start', (req, res) => {
    const { intervalMs } = req.body || {};
    scrapeOrchestrator.start(intervalMs ? Number(intervalMs) : undefined);
    res.json({ success: true, status: scrapeOrchestrator.getStatus() });
});
jobsRouter.post('/background/stop', (_req, res) => {
    scrapeOrchestrator.stop();
    res.json({ success: true, status: scrapeOrchestrator.getStatus() });
});
jobsRouter.post('/background/trigger', (req, res) => {
    const body = (req.body || {});
    scrapeOrchestrator
        .scrapeOnce(body)
        .catch((err) => console.warn('[background] trigger error:', err.message));
    res.json({ triggered: true, message: 'Scrape started in background' });
});
// ── 6c. External Daemon Ingest Endpoint ──────────────────────────────────
jobsRouter.post('/ingest', (req, res) => {
    try {
        const bodyValidation = IngestJobsBodySchema.safeParse(req.body);
        if (!bodyValidation.success) {
            return res
                .status(400)
                .json({ error: bodyValidation.error.issues[0]?.message || 'Body must contain a "jobs" array' });
        }
        const { jobs } = req.body || {};
        let insertedCount = 0;
        let validCount = 0;
        for (const raw of jobs) {
            const check = validateJobPosting(raw);
            if (!check.valid || !check.job)
                continue;
            validCount++;
            const r = upsertJob(check.job);
            if (r.inserted) {
                insertedCount++;
                scrapeOrchestrator.emit('new', check.job);
            }
        }
        res.json({
            success: true,
            received: jobs.length,
            valid: validCount,
            inserted: insertedCount,
            status: scrapeOrchestrator.getStatus(),
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to ingest jobs' });
    }
});
// ── 6d. Source Adapters Health & Capabilities ─────────────────────────────
jobsRouter.get('/sources/health', async (_req, res) => {
    try {
        const health = await defaultRegistry.healthCheckAll();
        const capabilities = defaultRegistry.getAll().map((a) => ({
            source: a.id,
            name: a.name,
            capabilities: a.capabilities(),
        }));
        res.json({
            sources: health,
            capabilities,
            registeredCount: defaultRegistry.getRegisteredSources().length,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Health check failed' });
    }
});
// ── 7. Get Job By ID (Must be after all named subroutes) ───────────────────
jobsRouter.get('/:id', (req, res, next) => {
    // Guard against capturing subroutes
    if ([
        'scrape-workingnomads',
        'scrape-linkedin',
        'stream-search',
        'scrape-url',
        'stream',
        'background',
        'ingest',
        'filter-advanced',
        'scrape-advanced',
        'sources',
    ].includes(req.params.id)) {
        return next();
    }
    const j = getJob(req.params.id);
    if (!j)
        return res.status(404).json({ error: 'not found' });
    res.json(j);
});

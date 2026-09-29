import { Router } from 'express';
import { listJobs, getJob, upsertJob } from '../store/jobs.js';
import { filterJobsForRequest } from '../scrape/normalize.js';
import { scrapeOrchestrator } from '../scrape/orchestrator.js';
import { scoringRouter } from './scoring.js';
import { linkedinRealtime } from '../scrape/linkedin-realtime.js';
import { naukriAdvanced } from '../scrape/naukri-advanced.js';
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
import { validateAndFilterJobs, validateJobPosting, filterJobsByCriteria, verifyJobUrlLive, detectDuplicateJobs, cleanCanonicalUrl } from '../scrape/validator.js';
import { defaultRegistry } from '@applypilot/scraping';
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
        const remoteOnly = req.query.remoteOnly === '1' || req.query.remoteOnly === 'true';
        const postedWithinHours = req.query.postedWithinHours
            ? Number(req.query.postedWithinHours)
            : undefined;
        const limit = req.query.limit ? Math.min(500, Number(req.query.limit)) : 100;
        const items = listJobs({ source, query, remoteOnly, postedWithinHours, limit });
        res.json({ items: items || [], count: (items || []).length });
    } catch (err) {
        console.error('[jobs] Error listing jobs from store:', err.message);
        res.status(500).json({ error: 'Failed to retrieve jobs', items: [], count: 0 });
    }
});
// ── 1. Direct Real-Time Naukri Scraper ─────────────────────────────────────
jobsRouter.post('/scrape-naukri', async (req, res) => {
    try {
        const { query, location, limit } = req.body || {};
        const jobs = await naukriAdvanced({
            query: query || 'software engineer internship',
            location: location || 'India',
            maxPerSource: limit ? parseInt(String(limit), 10) : 25,
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
            source: 'naukari_realtime',
            fetchedAt: new Date().toISOString(),
            jobs,
        });
    }
    catch (err) {
        console.error('Naukri scraping error:', err);
        res.status(500).json({ success: false, error: err.message || 'Scraping failed' });
    }
});
jobsRouter.get('/scrape-naukri', async (req, res) => {
    try {
        const { query, location, limit } = req.query || {};
        const jobs = await naukriAdvanced({
            query: String(query || 'software engineer internship'),
            location: String(location || 'India'),
            maxPerSource: limit ? parseInt(String(limit), 10) : 25,
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
            source: 'naukari_realtime',
            fetchedAt: new Date().toISOString(),
            jobs,
        });
    }
    catch (err) {
        console.error('Naukri scraping error:', err);
        res.status(500).json({ success: false, error: err.message || 'Scraping failed' });
    }
});

// ── 2. Direct Real-Time LinkedIn Scraper ───────────────────────────────────
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
        else if (rawSource.includes('remot'))
            targetSource = 'remoteok';
        else if (rawSource.includes('arb'))
            targetSource = 'arbeitnow';
        else if (rawSource.includes('yc'))
            targetSource = 'yc';
        else if (rawSource.includes('inter'))
            targetSource = 'internshala';
        else if (rawSource.includes('unstop'))
            targetSource = 'unstop';
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
            'naukari',
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
        naukari: 0,
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
                    timer = setTimeout(() => reject(new Error('Scraper timed out')), 3200);
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

        // Fully decoupled parallel scrapers configured with fastMode
        const tasks = [
            // Fast API Boards (under 1.0s)
            runScraper('jobicy', 'Jobicy', () => jobicy({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 10 })),
            runScraper('himalayas', 'Himalayas', () => himalayas({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 10 })),
            runScraper('arbeitnow', 'Arbeitnow', () => arbeitnow({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 15 })),
            runScraper('weworkremotely', 'WeWorkRemotely', () => weworkremotely({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 12 })),
            runScraper('remoteok', 'RemoteOK', () => remoteok({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 10 })),
            runScraper('yc', 'Y Combinator Startups', () => yc({ query: enrichedQuery, location, internshipsOnly, timeWindow, fastMode: true, maxPerSource: 12 })),
            runScraper('remotive', 'Remotive', () => remotive({ query: enrichedQuery, location, internshipsOnly, fastMode: true, maxPerSource: 8 })),

            // Real-Time Direct Ecosystems (LinkedIn & Naukri in fastMode)
            runScraper('linkedin', 'LinkedIn Live', () => linkedinRealtime({
                query: enrichedQuery,
                location: remoteOnly ? 'Worldwide' : location,
                internshipsOnly,
                jobType,
                timeWindow,
                workplaceType,
                fastMode: true,
                maxPerSource: 25,
            })),
            runScraper('naukari', 'Naukri Live', () => naukriAdvanced({
                query: enrichedQuery,
                location,
                timeWindow,
                jobType,
                internshipsOnly,
                workplaceType,
                fastMode: true,
                allowPlaywright: false,
                maxPerSource: 20,
            })),

            // Tech Internship & ATS Boards
            runScraper('unstop', 'Unstop Campus & Tech', () => unstop({ query: enrichedQuery, location, remoteOnly, internshipsOnly, timeWindow, maxPerSource: 15 })),
            runScraper('simplify_jobs', 'SimplifyJobs Community Feed', () => simplifyJobs({ query: enrichedQuery, location, remoteOnly, internshipsOnly, timeWindow, maxPerSource: 20 })),
            runScraper('internshala', 'Internshala', () => internshala({ query: enrichedQuery, location, remoteOnly, internshipsOnly, timeWindow, maxPerSource: 20 })),
            runScraper('greenhouse', 'Greenhouse ATS', () => greenhouse({ query: enrichedQuery, location, internshipsOnly, maxPerSource: 12 })),
            runScraper('lever', 'Lever ATS', () => lever({ query: enrichedQuery, location, internshipsOnly, maxPerSource: 10 })),
            runScraper('ashby', 'Ashby ATS', () => ashby({ query: enrichedQuery, location, internshipsOnly, maxPerSource: 10 })),
        ];

        // Ensure scrapers (especially LinkedIn) have sufficient time to complete
        const STREAM_LIFECYCLE_CAP_MS = 3500;
        const lifecycleCapPromise = new Promise((resolve) => setTimeout(resolve, STREAM_LIFECYCLE_CAP_MS));
        await Promise.race([Promise.allSettled(tasks), lifecycleCapPromise]);

        sendEvent('complete', {
            totalJobs: totalDiscovered,
            sources: sourcesCount,
            fetchedAt: new Date().toISOString(),
        });
    }
    catch (err) {
        sendEvent('error', { message: err.message || 'Stream search failed' });
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
        let fetchedHtmlOrText = rawText || '';
        if (url) {
            try {
                let targetFetchUrl = url;
                if (url.includes('linkedin.com')) {
                    const idMatch = url.match(/\/view\/(\d+)/) ||
                        url.match(/currentJobId=(\d+)/) ||
                        url.match(/jobs\/(\d+)/);
                    if (idMatch && idMatch[1]) {
                        targetFetchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${idMatch[1]}`;
                    }
                }
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 6500);
                const pageRes = await fetch(targetFetchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    },
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                if (pageRes.ok) {
                    const html = await pageRes.text();
                    fetchedHtmlOrText = html
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .slice(0, 10000);
                }
            }
            catch (fetchErr) {
                console.warn('URL direct fetch error:', fetchErr.message);
            }
        }
        const prompt = `You are a precision job scraper and ATS analyzer.
Extract the exact job details from the provided job link URL or job description text.

Target URL: ${url || 'N/A'}
Content:
${fetchedHtmlOrText ? fetchedHtmlOrText.slice(0, 6000) : url}

Return strictly a JSON object with:
- "title": exact job title
- "company": company name
- "location": city, country or "Remote"
- "isRemote": boolean
- "isInternship": boolean
- "salary": string if mentioned or estimate
- "skills": array of 4-6 key technical skills
- "description": 2-3 sentence overview of the role
- "applyUrl": direct application URL or the target URL`;
        let parsedJob = null;
        try {
            const aiRes = await bestEffortComplete(prompt, { maxTokens: 500, temperature: 0.1, signal: req.signal });
            if (aiRes?.text) {
                const cleanJson = aiRes.text
                    .trim()
                    .replace(/^```(?:json)?\s*/i, '')
                    .replace(/```\s*$/i, '');
                parsedJob = JSON.parse(cleanJson);
            }
        }
        catch {
            // Fallback heuristic
        }
        if (!parsedJob) {
            parsedJob = {
                title: 'Software Engineer',
                company: url ? new URL(url).hostname.replace('www.', '').split('.')[0] : 'Tech Company',
                location: 'Remote / Hybrid',
                isRemote: true,
                isInternship: (fetchedHtmlOrText || '').toLowerCase().includes('intern'),
                skills: ['React', 'TypeScript', 'Node.js'],
                description: fetchedHtmlOrText.slice(0, 300) ||
                    'Exciting software engineering role at high-growth organization.',
                applyUrl: url || '#',
            };
        }
        const id = `manual_${Date.now()}`;
        const fullJob = {
            id,
            title: parsedJob.title || 'Software Engineer',
            company: parsedJob.company || 'Tech Company',
            source: 'manual',
            url: parsedJob.applyUrl || url || '#',
            applyUrl: parsedJob.applyUrl || url || '#',
            location: parsedJob.location || 'Remote',
            remote: Boolean(parsedJob.isRemote),
            description: parsedJob.description || '',
            postedAt: new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
            employmentType: parsedJob.isInternship ? 'internship' : 'full-time',
            skills: Array.isArray(parsedJob.skills) ? parsedJob.skills : [],
            tags: parsedJob.salary ? [parsedJob.salary] : [],
        };
        upsertJob(fullJob);
        res.json({ success: true, job: fullJob });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to scrape job' });
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
        'scrape-naukri',
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

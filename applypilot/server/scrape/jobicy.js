import { createHash } from 'node:crypto';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
function stableId(url) {
    return `jobicy_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}
export async function jobicy(req) {
    const cacheKey = scrapeCache.generateKey('jobicy', req);
    const cached = scrapeCache.get(cacheKey);
    if (cached)
        return cached;
    const max = Math.max(1, Math.min(100, req.maxPerSource ?? 25));
    const maxAllowedMinutes = req.timeWindow === '1h'
        ? 60
        : req.timeWindow === '4h'
            ? 240
            : req.timeWindow === '12h'
                ? 720
                : req.timeWindow === '24h'
                    ? 1440
                    : req.timeWindow === '7d'
                        ? 10080
                        : Infinity;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    // Jobicy API endpoint for remote engineering and dev roles
    const url = `https://jobicy.com/api/v2/remote-jobs?count=${Math.max(30, max)}&industry=engineering`;
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Accept: 'application/json',
            },
            signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok)
            throw new Error(`Jobicy responded with status ${res.status}`);
        const data = (await res.json());
        const jobs = data.jobs || [];
        const out = [];
        const queryTokens = (req.query || '').toLowerCase().split(/\s+/).filter(Boolean);
        for (const j of jobs) {
            if (!j.url || !j.jobTitle)
                continue;
            const titleLower = j.jobTitle.toLowerCase();
            const rawDesc = j.jobDescription || j.jobExcerpt || j.jobTitle;
            const descClean = rawDesc
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            const isNonTech = /\b(barista|line cook|cook|chef|dishwasher|server|waiter|waitress|bartender|cashier|janitor|cleaner|custodian|driver|courier|nurse|dentist|dental|doctor|pharmacist|receptionist|store associate|retail|clerk|attendant|sales representative|business development|marketing|recruiter)\b/i.test(titleLower);
            if (isNonTech)
                continue;
            // Check query match if query specified
            if (queryTokens.length > 0) {
                const isTech = /\b(software|developer|engineer|engineering|fullstack|full-stack|frontend|front-end|backend|back-end|web|mobile|ios|android|ai|machine\s+learning|data|cloud|devops|security|qa|testing|sde|swe|architect|programmer|systems|firmware)\b/i.test(titleLower);
                const matches = queryTokens.some((t) => titleLower.includes(t)) || isTech;
                if (!matches)
                    continue;
            }
            // Check internship requirement
            const isIntern = /intern\b|internship|trainee|co-?op/i.test(titleLower);
            if (req.internshipsOnly && !isIntern)
                continue;
            // Check time window
            let postedAt = j.pubDate ? new Date(j.pubDate).toISOString() : new Date().toISOString();
            const jobTime = Date.parse(postedAt);
            if (Number.isFinite(jobTime)) {
                const minutesAgo = Math.floor((Date.now() - jobTime) / 60000);
                if (minutesAgo > maxAllowedMinutes)
                    continue;
            }
            const meta = enrichJobMetadata(descClean, j.jobTitle);
            // Build formatted salary from API fields if available
            let salaryStr = meta.salary;
            let salaryRangeObj = meta.salaryRange;
            if (!salaryStr && j.annualSalaryMin && j.annualSalaryMax) {
                const minVal = Number(j.annualSalaryMin);
                const maxVal = Number(j.annualSalaryMax);
                const cur = j.salaryCurrency || '$';
                if (minVal > 0 && maxVal > 0) {
                    salaryStr = `${cur}${Math.round(minVal / 1000)}k–${cur}${Math.round(maxVal / 1000)}k/yr`;
                    salaryRangeObj = { min: minVal, max: maxVal, currency: cur, period: 'yearly' };
                }
            }
            out.push({
                id: stableId(j.url),
                title: j.jobTitle.trim(),
                company: (j.companyName || 'Tech Startup').trim(),
                source: 'jobicy',
                url: j.url,
                applyUrl: j.url,
                location: j.jobGeo ? `${j.jobGeo} (Remote)` : 'Worldwide Remote',
                remote: true,
                description: descClean.slice(0, 1500),
                postedAt,
                fetchedAt: new Date().toISOString(),
                employmentType: isIntern ? 'internship' : 'full-time',
                isInternship: isIntern,
                companyLogo: j.companyLogo,
                sponsorsVisa: meta.sponsorsVisa,
                eligibleBatches: meta.eligibleBatches,
                seniority: meta.seniority,
                techStack: meta.techStack,
                salary: salaryStr,
                salaryRange: salaryRangeObj,
                skills: meta.techStack || [],
                tags: [
                    'Jobicy Remote',
                    'Verified Tech',
                    isIntern ? 'Internship' : 'Full-Time',
                    ...(meta.techStack?.slice(0, 2) || []),
                ].filter(Boolean),
            });
            if (out.length >= max)
                break;
        }
        scrapeCache.set(cacheKey, out);
        return out;
    }
    catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            console.warn('[jobicy] Timeout (6.5s) — returning empty list');
            return [];
        }
        console.warn('[jobicy] fetch error:', err.message);
        return [];
    }
}

import { createHash } from 'node:crypto';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
function stableId(url) {
    return `himalayas_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}
export async function himalayas(req) {
    const cacheKey = scrapeCache.generateKey('himalayas', req);
    const cached = scrapeCache.get(cacheKey);
    if (cached)
        return cached;
    const max = Math.max(1, Math.min(100, req.maxPerSource ?? 30));
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
    const timer = setTimeout(() => controller.abort(), 1200);
    const queryParam = req.query ? `&q=${encodeURIComponent(req.query)}` : '';
    const url = `https://himalayas.app/jobs/api?limit=${max * 2}${queryParam}`;
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
            throw new Error(`Himalayas responded with status ${res.status}`);
        const data = (await res.json());
        const jobs = data.jobs || [];
        const out = [];
        const queryTokens = (req.query || '').toLowerCase().split(/\s+/).filter(Boolean);
        for (const j of jobs) {
            const apply = j.applicationLink || j.applyUrl || j.url;
            if (!apply || !j.title)
                continue;
            const titleLower = j.title.toLowerCase();
            const descClean = (j.description || j.title)
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            const isNonTech = /\b(barista|line cook|cook|chef|dishwasher|server|waiter|waitress|bartender|cashier|janitor|cleaner|custodian|driver|courier|nurse|dentist|dental|doctor|pharmacist|receptionist|store associate|retail|clerk|attendant|sales representative|business development|marketing|recruiter|clinical|regulations)\b/i.test(titleLower);
            if (isNonTech)
                continue;
            // Check query match if query provided
            if (queryTokens.length > 0) {
                const catsText = (j.categories || [])
                    .map((c) => (typeof c === 'string' ? c : c?.name || ''))
                    .join(' ')
                    .toLowerCase();
                const titleAndCategory = `${titleLower} ${catsText}`;
                const isTech = /\b(software|developer|engineer|engineering|fullstack|full-stack|frontend|front-end|backend|back-end|web|mobile|ios|android|ai|machine\s+learning|data|cloud|devops|security|qa|testing|sde|swe|architect|programmer|systems|firmware)\b/i.test(titleLower);
                const matches = queryTokens.some((t) => titleAndCategory.includes(t)) || isTech;
                if (!matches)
                    continue;
            }
            // Check internship requirement
            const isIntern = /intern\b|internship|trainee|co-?op/i.test(titleLower);
            if (req.internshipsOnly && !isIntern)
                continue;
            // Check time window
            let postedAt = new Date().toISOString();
            if (j.pubDate) {
                const epochMs = typeof j.pubDate === 'number' ? j.pubDate * 1000 : Date.parse(j.pubDate);
                if (Number.isFinite(epochMs)) {
                    postedAt = new Date(epochMs).toISOString();
                    const minutesAgo = Math.floor((Date.now() - epochMs) / 60000);
                    if (minutesAgo > maxAllowedMinutes)
                        continue;
                }
            }
            const meta = enrichJobMetadata(descClean, j.title);
            const skills = Array.isArray(j.categories)
                ? j.categories.map((c) => (typeof c === 'string' ? c : c?.name || '')).filter(Boolean)
                : [];
            if (meta.techStack) {
                for (const t of meta.techStack) {
                    if (!skills.includes(t))
                        skills.push(t);
                }
            }
            let salaryText = meta.salary;
            if (!salaryText && (j.minSalary || j.maxSalary)) {
                const curr = j.currency || 'USD';
                const symbol = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : `${curr} `;
                if (j.minSalary && j.maxSalary) {
                    salaryText = `${symbol}${Math.round(j.minSalary / 1000)}k - ${symbol}${Math.round(j.maxSalary / 1000)}k/yr`;
                }
                else if (j.minSalary) {
                    salaryText = `From ${symbol}${Math.round(j.minSalary / 1000)}k/yr`;
                }
                else if (j.maxSalary) {
                    salaryText = `Up to ${symbol}${Math.round(j.maxSalary / 1000)}k/yr`;
                }
            }
            let seniorityVal = meta.seniority;
            if (!seniorityVal && Array.isArray(j.seniority) && j.seniority.length > 0) {
                const first = j.seniority[0].toLowerCase();
                if (first.includes('senior'))
                    seniorityVal = 'senior';
                else if (first.includes('lead') || first.includes('manager') || first.includes('principal'))
                    seniorityVal = 'lead';
                else if (first.includes('entry') || first.includes('junior'))
                    seniorityVal = 'entry';
                else
                    seniorityVal = 'mid';
            }
            out.push({
                id: stableId(apply),
                title: j.title.trim(),
                company: (j.companyName || 'Unknown').trim(),
                source: 'himalayas',
                url: apply,
                applyUrl: apply,
                location: j.location || 'Worldwide Remote',
                remote: true,
                description: descClean.slice(0, 1500),
                postedAt,
                fetchedAt: new Date().toISOString(),
                employmentType: isIntern
                    ? 'internship'
                    : j.employmentType?.toLowerCase().includes('part')
                        ? 'part-time'
                        : 'full-time',
                isInternship: isIntern,
                companyLogo: j.companyLogo,
                sponsorsVisa: meta.sponsorsVisa,
                eligibleBatches: meta.eligibleBatches,
                seniority: seniorityVal,
                techStack: meta.techStack,
                salary: salaryText,
                salaryRange: meta.salaryRange,
                skills,
                tags: [
                    'Himalayas Verified',
                    'Remote',
                    isIntern ? 'Internship' : 'Full-Time',
                    ...(meta.techStack?.slice(0, 3) || []),
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
            console.warn('[himalayas] Timeout (6.5s) — returning empty list');
            return [];
        }
        console.warn('[himalayas] fetch error:', err.message);
        return [];
    }
}

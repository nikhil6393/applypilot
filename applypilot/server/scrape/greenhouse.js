import { createHash } from 'node:crypto';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { GREENHOUSE_COMPANIES } from './company-directory.js';
import { isJobLocationMatch } from './geo-resolver.js';
const GREENHOUSE_BOARDS = GREENHOUSE_COMPANIES;
function stableId(url) {
    return `greenhouse_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}
function deriveSkills(text) {
    const lower = text.toLowerCase();
    const cand = [
        'javascript',
        'typescript',
        'react',
        'next.js',
        'node.js',
        'python',
        'go',
        'rust',
        'java',
        'kotlin',
        'swift',
        'aws',
        'gcp',
        'azure',
        'kubernetes',
        'docker',
        'terraform',
        'graphql',
        'rest',
        'postgres',
        'mysql',
        'redis',
        'tensorflow',
        'pytorch',
        'spark',
        'kafka',
        'snowflake',
        'bigquery',
        'dbt',
        'jenkins',
    ];
    const found = new Set();
    for (const c of cand) {
        const re = new RegExp(`(?:^|[^a-z0-9+#.])${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z0-9+#.])`, 'i');
        if (re.test(lower))
            found.add(c);
    }
    return [...found];
}
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
export async function greenhouse(req) {
    const cacheKey = scrapeCache.generateKey('greenhouse', req);
    const cached = scrapeCache.get(cacheKey);
    if (cached)
        return cached;
    const max = Math.max(1, Math.min(100, req.maxPerSource ?? 30));
    const out = [];
    const queryLower = (req.query || '').toLowerCase();
    const requireIntern = req.internshipsOnly !== false &&
        (req.internshipsOnly || /intern|co-?op|trainee|apprentice|student/i.test(queryLower));
    // ATS postings are long-lived open positions; allow up to 45 days (64800 mins) for active openings
    const maxAllowedMinutes = requireIntern
        ? 64800
        : req.timeWindow === '1h'
            ? 1440
            : req.timeWindow === '4h'
                ? 2880
                : req.timeWindow === '12h'
                    ? 4320
                    : req.timeWindow === '7d'
                        ? 10080
                        : 43200;
    const fetchBoard = async (company) => {
        try {
            const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(url, {
                headers: { 'User-Agent': 'ApplyPilot/2.0' },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok)
                return [];
            const data = (await res.json());
            const boardJobs = [];
            for (const j of data.jobs || []) {
                const titleLower = (j.title || '').toLowerCase();
                // Comprehensive student & early-career matching
                const isIntern = /\b(intern(ship)?|co-?op|trainee|apprentice|working\s+student|student|fresher|graduate\s+engineer|fellow(ship)?|campus|early\s+career)\b/i.test(titleLower);
                const isSenior = /\b(senior|sr\.|lead|principal|staff|director|vp|head\s+of|manager)\b/i.test(titleLower);
                if (requireIntern && (!isIntern || isSenior))
                    continue;
                // Strict tech role filter: reject food/service/retail and non-tech titles
                const isTech = /\b(software|developer|engineer|engineering|fullstack|full-stack|frontend|front-end|backend|back-end|web|mobile|ios|android|ai|machine\s+learning|data|cloud|devops|security|qa|testing|sde|swe|architect|programmer|systems|firmware)\b/i.test(titleLower);
                const isNonTech = /\b(barista|line cook|cook|chef|dishwasher|server|waiter|waitress|bartender|cashier|janitor|cleaner|custodian|driver|courier|nurse|dentist|dental|doctor|pharmacist|receptionist|store associate|retail|clerk|attendant|sales representative)\b/i.test(titleLower);
                if (isNonTech || (!isTech && !isIntern))
                    continue;
                const jobLoc = (j.location?.name || '').trim();
                const remote = /remote/i.test(jobLoc) || /remote/i.test(j.title);
                // Hierarchical location resolution
                if (!isJobLocationMatch(jobLoc, remote, req.location, req.remoteOnly)) {
                    continue;
                }
                const desc = (j.content || '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                // Compute relative time
                const updatedMs = j.updated_at ? new Date(j.updated_at).getTime() : Date.now();
                const diffMin = Math.max(0, Math.floor((Date.now() - updatedMs) / 60000));
                let rel = 'Just now';
                if (diffMin < 60)
                    rel = `${diffMin}m ago`;
                else if (diffMin < 1440)
                    rel = `${Math.floor(diffMin / 60)}h ago`;
                else if (diffMin < 10080)
                    rel = `${Math.floor(diffMin / 1440)}d ago`;
                else
                    rel = 'Active Opening';
                // Guard against stale archived listings (>45d)
                if (diffMin > maxAllowedMinutes)
                    continue;
                const meta = enrichJobMetadata(desc, j.title);
                const tags = [isIntern ? 'Internship' : 'Full-Time'];
                if (remote)
                    tags.push('🌐 Remote');
                if (meta.sponsorsVisa === true)
                    tags.push('🛂 Visa Sponsor');
                if (meta.salary)
                    tags.push(`💰 ${meta.salary}`);
                if (diffMin < 60)
                    tags.push('⚡ Just Posted');
                else if (diffMin < 1440)
                    tags.push('🕒 Fresh (<24h)');
                else
                    tags.push('📅 Active Hiring');
                boardJobs.push({
                    id: stableId(j.absolute_url),
                    title: j.title,
                    company: company.replace(/(^.)|-(.)/g, (_, a, b) => (a || '').toUpperCase() + (b || '')),
                    source: 'greenhouse',
                    url: j.absolute_url,
                    applyUrl: j.absolute_url,
                    location: j.location?.name || 'Worldwide',
                    remote,
                    description: desc || j.title,
                    descriptionHtml: j.content,
                    postedAt: j.updated_at || new Date().toISOString(),
                    postedDate: j.updated_at || new Date().toISOString(),
                    postedRelative: rel,
                    fetchedAt: new Date().toISOString(),
                    employmentType: isIntern ? 'internship' : 'full-time',
                    isInternship: isIntern,
                    sponsorsVisa: meta.sponsorsVisa,
                    eligibleBatches: meta.eligibleBatches,
                    seniority: meta.seniority,
                    techStack: meta.techStack,
                    salary: meta.salary,
                    salaryRange: meta.salaryRange,
                    skills: deriveSkills(desc + ' ' + j.title),
                    tags,
                });
            }
            return boardJobs;
        }
        catch {
            return [];
        }
    };
    // High-throughput parallel execution on prioritized tech & unicorn boards
    const boardsToScan = GREENHOUSE_BOARDS.slice(0, 30);
    const batches = chunkArray(boardsToScan, 15);
    for (const batch of batches) {
        const results = await Promise.allSettled(batch.map((b) => fetchBoard(b)));
        for (const r of results) {
            if (r.status === 'fulfilled' && r.value.length > 0) {
                out.push(...r.value);
                if (out.length >= max)
                    break;
            }
        }
        if (out.length >= max)
            break;
    }
    const finalJobs = out.slice(0, max);
    scrapeCache.set(cacheKey, finalJobs);
    return finalJobs;
}

import { createHash } from 'node:crypto';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { GREENHOUSE_COMPANIES } from './company-directory.js';
import { isJobLocationMatch } from './geo-resolver.js';
import { resolveCompanyLogo } from './logo-resolver.js';
import { htmlToCleanMarkdown, extractStructuredSections } from './clean-description.js';
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
    const max = Math.max(1, Math.min(300, req.maxPerSource ?? 100));
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
            const timeout = setTimeout(() => controller.abort(), 4500);
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
                // Strict tech role filter: reject non-tech roles
                const isTech = /\b(software|developer|engineer|engineering|fullstack|full-stack|frontend|front-end|backend|back-end|web|mobile|ios|android|ai|machine\s+learning|data\s+engineer|data\s+scientist|cloud|devops|security|qa|testing|sde|swe|architect|programmer|systems|firmware)\b/i.test(titleLower);
                const isNonTech = /\b(account executive|account manager|sales|business development|bdr|sdr|marketing|recruiter|talent acquisition|barista|line cook|cook|chef|dishwasher|server|waiter|waitress|bartender|cashier|janitor|cleaner|custodian|driver|courier|nurse|dentist|dental|doctor|pharmacist|receptionist|store associate|retail|clerk|attendant|sales representative|communications|creative|hr|social media|legal|counsel)\b/i.test(titleLower);
                if (isNonTech || !isTech)
                    continue;

                const jobLoc = (j.location?.name || '').trim();
                const remote = /remote/i.test(jobLoc) || /remote/i.test(j.title);
                // Hierarchical location resolution
                if (!isJobLocationMatch(jobLoc, remote, req.location, req.remoteOnly)) {
                    continue;
                }
                const rawContent = j.content || '';
                const cleanMarkdown = htmlToCleanMarkdown(rawContent);
                const desc = cleanMarkdown || j.title;

                // Keyword relevance matching if specific terms requested
                if (queryLower) {
                    const qTerms = queryLower.split(/\s+/).filter((t) => !/^(intern|internship|jobs?|engineer|developer|role)$/i.test(t));
                    if (qTerms.length > 0) {
                        const searchTarget = `${titleLower} ${desc.toLowerCase()}`;
                        const matchesAny = qTerms.some((t) => searchTarget.includes(t));
                        if (!matchesAny) continue;
                    }
                }

                const sections = extractStructuredSections(cleanMarkdown);
                // Compute relative time
                const updatedMs = j.updated_at ? new Date(j.updated_at).getTime() : (Date.now() - 86400000 * 14);
                const diffMin = Math.max(0, Math.floor((Date.now() - updatedMs) / 60000));
                let rel = 'Active Opening';
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
                const compName = company.replace(/(^.)|-(.)/g, (_, a, b) => (a || '').toUpperCase() + (b || ''));
                boardJobs.push({
                    id: stableId(j.absolute_url),
                    title: j.title,
                    company: compName,
                    companyLogo: resolveCompanyLogo(compName, null, j.absolute_url),
                    source: 'greenhouse',
                    url: j.absolute_url,
                    applyUrl: j.absolute_url,
                    location: j.location?.name || '',
                    remote,
                    description: desc,
                    descriptionHtml: j.content,
                    sections,
                    responsibilities: sections.responsibilities,
                    requirements: sections.requirements,
                    preferred: sections.preferred,
                    benefits: sections.benefits,
                    postedAt: j.updated_at || '',
                    postedDate: j.updated_at || undefined,
                    postedRelative: rel,
                    fetchedAt: new Date().toISOString(),
                    employmentType: isIntern ? 'internship' : 'unknown',
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
    // Prioritized tech & unicorn boards — merged with full directory, deduplicated
    const prioritizedBoards = [
        'stripe', 'vercel', 'cloudflare', 'datadog', 'mongodb', 'elastic', 'gitlab', 'databricks',
        'twilio', 'figma', 'canva', 'openai', 'anthropic', 'cohere', 'scaleai', 'perplexity',
        'supabase', 'linear', 'sentry', 'retool', 'discord', 'doordash', 'reddit', 'instacart',
        'swiggy', 'zomato', 'cred', 'phonepe', 'meesho', 'groww', 'postman', 'browserstack',
        'hasura', 'yellowai', 'juspay', 'darwinbox', 'clevertap', 'chargebee', 'moengage',
        ...GREENHOUSE_BOARDS,
    ];
    const allBoards = [...new Set(prioritizedBoards)];
    // Run ALL boards in a single parallel wave — no sequential batching, no early exit
    // Promise.allSettled bounds total time to the slowest single board (~4.5s)
    const results = await Promise.allSettled(allBoards.map((b) => fetchBoard(b)));
    for (const r of results) {
        if (r.status === 'fulfilled' && r.value.length > 0) {
            out.push(...r.value);
        }
    }
    // Sort by recency — most recent first
    out.sort((a, b) => {
        const ta = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const tb = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        return tb - ta;
    });
    const finalJobs = out.slice(0, max);
    scrapeCache.set(cacheKey, finalJobs);
    return finalJobs;
}

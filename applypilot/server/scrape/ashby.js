import { createHash } from 'node:crypto';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { ASHBY_COMPANIES } from './company-directory.js';
import { isJobLocationMatch } from './geo-resolver.js';
import { resolveCompanyLogo } from './logo-resolver.js';
import { htmlToCleanMarkdown, extractStructuredSections } from './clean-description.js';
const ASHBY_BOARDS = ASHBY_COMPANIES;
function stableId(url) {
    return `ashby_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
export async function ashby(req) {
    const cacheKey = scrapeCache.generateKey('ashby', req);
    const cached = scrapeCache.get(cacheKey);
    if (cached)
        return cached;
    const max = Math.max(1, Math.min(100, req.maxPerSource ?? 25));
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
    const fetchBoard = async (c) => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${c}`, {
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
                const isIntern = /\b(intern(ship)?|co-?op|trainee|apprentice|working\s+student|student|fresher|graduate\s+engineer|fellow(ship)?|campus|early\s+career)\b/i.test(titleLower);
                const isSenior = /\b(senior|sr\.|lead|principal|staff|director|vp|head\s+of|manager)\b/i.test(titleLower);
                if (requireIntern && (!isIntern || isSenior))
                    continue;
                // Strict tech role filter: reject non-tech and verify role alignment
                const isTech = /\b(software|developer|engineer|engineering|fullstack|full-stack|frontend|front-end|backend|back-end|web|mobile|ios|android|ai|machine\s+learning|data|cloud|devops|security|qa|testing|sde|swe|architect|programmer|systems|firmware)\b/i.test(titleLower);
                const isNonTech = /\b(barista|line cook|cook|chef|dishwasher|server|waiter|waitress|bartender|cashier|janitor|cleaner|custodian|driver|courier|nurse|dentist|dental|doctor|pharmacist|receptionist|store associate|retail|clerk|attendant|sales representative|business development|marketing|recruiter)\b/i.test(titleLower);
                if (isNonTech)
                    continue;
                const qTerms = queryLower.split(/\s+/).filter((t) => !/intern(ship)?/i.test(t));
                if (qTerms.length > 0) {
                    const matched = qTerms.some((term) => titleLower.includes(term)) || isTech;
                    if (!matched)
                        continue;
                }
                const remote = !!j.isRemote || /remote/i.test(j.location || '');
                // Hierarchical location match
                if (!isJobLocationMatch(j.location || '', remote, req.location, req.remoteOnly)) {
                    continue;
                }
                const rawHtml = j.descriptionHtml || j.descriptionPlain || '';
                const cleanMarkdown = htmlToCleanMarkdown(rawHtml);
                const desc = cleanMarkdown || j.title;
                const sections = extractStructuredSections(cleanMarkdown);
                if (!j.applyUrl)
                    continue;
                const pubMs = j.publishedAt ? new Date(j.publishedAt).getTime() : Date.now();
                const diffMin = Math.max(0, Math.floor((Date.now() - pubMs) / 60000));
                let rel = 'Just now';
                if (diffMin < 60)
                    rel = `${diffMin}m ago`;
                else if (diffMin < 1440)
                    rel = `${Math.floor(diffMin / 60)}h ago`;
                else if (diffMin < 10080)
                    rel = `${Math.floor(diffMin / 1440)}d ago`;
                else
                    rel = 'Active Opening';
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
                const compName = c.charAt(0).toUpperCase() + c.slice(1);
                boardJobs.push({
                    id: stableId(j.applyUrl),
                    title: j.title,
                    company: compName,
                    companyLogo: resolveCompanyLogo(compName, null, j.applyUrl),
                    source: 'ashby',
                    url: j.applyUrl,
                    applyUrl: j.applyUrl,
                    location: j.location || 'Worldwide',
                    remote,
                    description: desc,
                    descriptionHtml: j.descriptionHtml,
                    sections,
                    responsibilities: sections.responsibilities,
                    requirements: sections.requirements,
                    preferred: sections.preferred,
                    benefits: sections.benefits,
                    postedAt: j.publishedAt || new Date().toISOString(),
                    postedDate: j.publishedAt || new Date().toISOString(),
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
                    skills: meta.techStack || [],
                    tags,
                });
            }
            return boardJobs;
        }
        catch {
            return [];
        }
    };
    // Parallel batch execution with chunk size 12
    const batches = chunkArray(ASHBY_BOARDS.slice(0, 24), 12);
    for (const batch of batches) {
        const results = await Promise.allSettled(batch.map((c) => fetchBoard(c)));
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

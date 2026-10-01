import { createHash } from 'node:crypto';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { LEVER_COMPANIES } from './company-directory.js';
import { isJobLocationMatch } from './geo-resolver.js';
import { resolveCompanyLogo } from './logo-resolver.js';
import { htmlToCleanMarkdown, extractStructuredSections } from './clean-description.js';
function stableId(url) {
    return `lever_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
export async function lever(req) {
    const cacheKey = scrapeCache.generateKey('lever', req);
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
    const fetchCompany = async (c) => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(`https://api.lever.co/v0/postings/${c}?mode=json`, {
                headers: { 'User-Agent': 'ApplyPilot/2.0' },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok)
                return [];
            const data = (await res.json());
            const companyJobs = [];
            for (const j of data) {
                const titleLower = (j.text || '').toLowerCase();
                const isIntern = /\b(intern(ship)?|co-?op|trainee|apprentice|working\s+student|student|fresher|graduate\s+engineer|fellow(ship)?|campus|early\s+career)\b/i.test(titleLower);
                const isSenior = /\b(senior|sr\.|lead|principal|staff|director|vp|head\s+of|manager)\b/i.test(titleLower);
                if (requireIntern && (!isIntern || isSenior))
                    continue;
                // Verify keyword match
                const qTerms = queryLower.split(/\s+/).filter((t) => !/intern(ship)?/i.test(t));
                if (qTerms.length > 0 && !isIntern) {
                    const matched = qTerms.some((term) => titleLower.includes(term));
                    if (!matched)
                        continue;
                }
                const remote = /remote/i.test(j.categories?.location || '') || /remote/i.test(j.text);
                // Hierarchical location match
                if (!isJobLocationMatch(j.categories?.location || '', remote, req.location, req.remoteOnly)) {
                    continue;
                }
                let combinedHtml = j.description || j.descriptionPlain || '';
                if (Array.isArray(j.lists)) {
                    for (const section of j.lists) {
                        if (section.text) {
                            combinedHtml += `\n\n<h3>${section.text}</h3>\n${section.content || ''}`;
                        } else if (section.content) {
                            combinedHtml += `\n\n${section.content}`;
                        }
                    }
                }
                const cleanMarkdown = htmlToCleanMarkdown(combinedHtml);
                const desc = cleanMarkdown || j.text;
                const sections = extractStructuredSections(cleanMarkdown);
                const apply = j.applyUrl || j.hostedUrl;
                if (!apply)
                    continue;
                const createdMs = j.createdAt ? j.createdAt : Date.now();
                const diffMin = Math.max(0, Math.floor((Date.now() - createdMs) / 60000));
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
                const meta = enrichJobMetadata(desc, j.text);
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
                companyJobs.push({
                    id: stableId(apply),
                    title: j.text,
                    company: compName,
                    companyLogo: resolveCompanyLogo(compName, null, apply),
                    source: 'lever',
                    url: apply,
                    applyUrl: apply,
                    location: j.categories?.location || 'Worldwide',
                    remote,
                    description: desc,
                    descriptionHtml: combinedHtml,
                    sections,
                    responsibilities: sections.responsibilities,
                    requirements: sections.requirements,
                    preferred: sections.preferred,
                    benefits: sections.benefits,
                    postedAt: new Date(createdMs).toISOString(),
                    postedDate: new Date(createdMs).toISOString(),
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
            return companyJobs;
        }
        catch {
            return [];
        }
    };
    // High-speed parallel batch execution
    const batches = chunkArray(LEVER_COMPANIES.slice(0, 24), 12);
    for (const batch of batches) {
        const results = await Promise.allSettled(batch.map((c) => fetchCompany(c)));
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

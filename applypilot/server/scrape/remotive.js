import { createHash } from 'node:crypto';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { resolveCompanyLogo } from './logo-resolver.js';
function stableId(url) {
    return `remotive_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}
export async function remotive(req) {
    const cacheKey = scrapeCache.generateKey('remotive', req);
    const cached = scrapeCache.get(cacheKey);
    if (cached)
        return cached;
    const query = (req.query || 'software').replace(/[^A-Za-z0-9 ]/g, '').trim();
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=50`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { headers: { 'User-Agent': 'ApplyPilot/2.0' }, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok)
        throw new Error(`remotive ${res.status}`);
    const data = (await res.json());
    const jobs = data.jobs || [];
    const out = [];
    const maxAllowedMinutes = req.timeWindow === '1h'
        ? 60
        : req.timeWindow === '4h'
            ? 240
            : req.timeWindow === '12h'
                ? 720
                : req.timeWindow === '7d'
                    ? 10080
                    : req.timeWindow === 'all'
                        ? 43200
                        : req.postedWithinHours && req.postedWithinHours > 0
                            ? req.postedWithinHours * 60
                            : 1440;
    const queryLower = (req.query || '').toLowerCase();
    const requireIntern = req.internshipsOnly !== false && (req.internshipsOnly || /intern|co-?op/i.test(queryLower));
    for (const j of jobs) {
        if (!j.url)
            continue;
        const titleLower = (j.title || '').toLowerCase();
        const isIntern = /intern(ship)?|co-?op|trainee|apprentice|student/i.test(titleLower);
        if (requireIntern && !isIntern)
            continue;
        // Verify keyword match
        const qTerms = queryLower.split(/\s+/).filter((t) => !/intern(ship)?/i.test(t));
        if (qTerms.length > 0 && !isIntern) {
            const matched = qTerms.some((term) => titleLower.includes(term));
            if (!matched)
                continue;
        }
        const pubMs = j.publication_date ? new Date(j.publication_date).getTime() : Date.now();
        const diffMin = Math.max(0, Math.floor((Date.now() - pubMs) / 60000));
        let rel = 'Just now';
        if (diffMin < 60)
            rel = `${diffMin}m ago`;
        else if (diffMin < 1440)
            rel = `${Math.floor(diffMin / 60)}h ago`;
        else
            rel = `${Math.floor(diffMin / 1440)}d ago`;
        if (diffMin > maxAllowedMinutes)
            continue;
        const cleanDesc = (j.description || j.title)
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const meta = enrichJobMetadata(cleanDesc);
        const tags = [isIntern ? 'Internship' : 'Full-Time', '🌐 Remote'];
        if (meta.sponsorsVisa === true)
            tags.push('🛂 Visa Sponsor');
        if (diffMin < 60)
            tags.push('⚡ Just Posted');
        out.push({
            id: stableId(j.url),
            title: j.title,
            company: j.company_name || 'Unknown',
            source: 'remotive',
            url: j.url,
            applyUrl: j.url,
            companyLogo: resolveCompanyLogo(j.company_name, j.company_logo || j.company_logo_url, j.url),
            location: j.candidate_required_location || 'Remote',
            remote: true,
            description: cleanDesc,
            descriptionHtml: j.description,
            postedAt: j.publication_date || new Date().toISOString(),
            postedDate: j.publication_date || new Date().toISOString(),
            postedRelative: rel,
            fetchedAt: new Date().toISOString(),
            employmentType: isIntern ? 'internship' : 'full-time',
            isInternship: isIntern,
            sponsorsVisa: meta.sponsorsVisa,
            eligibleBatches: meta.eligibleBatches,
            skills: Array.isArray(j.tags) ? j.tags : [],
            tags,
        });
    }
    scrapeCache.set(cacheKey, out);
    return out;
}

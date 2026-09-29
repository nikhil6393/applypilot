import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
function stableId(url) {
    return `wwr_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}
function deriveSkills(text) {
    const lower = text.toLowerCase();
    const cand = [
        'javascript',
        'typescript',
        'react',
        'vue',
        'next.js',
        'node.js',
        'python',
        'go',
        'rust',
        'java',
        'c++',
        'c#',
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
        'mongodb',
        'tailwind',
        'devops',
        'ci/cd',
    ];
    const found = new Set();
    for (const c of cand) {
        const re = new RegExp(`(?:^|[^a-z0-9+#.])${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z0-9+#.])`, 'i');
        if (re.test(lower))
            found.add(c);
    }
    return [...found];
}
export async function weworkremotely(req) {
    const cacheKey = scrapeCache.generateKey('weworkremotely', req);
    const cached = scrapeCache.get(cacheKey);
    if (cached)
        return cached;
    const max = Math.max(1, Math.min(50, req.maxPerSource ?? 25));
    const queryLower = (req.query || '').toLowerCase();
    const requireIntern = req.internshipsOnly !== false && (req.internshipsOnly || /intern|co-?op/i.test(queryLower));
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
    const out = [];
    const feedUrls = req.fastMode
        ? ['https://weworkremotely.com/categories/remote-programming-jobs.rss']
        : [
            'https://weworkremotely.com/categories/remote-programming-jobs.rss',
            'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
        ];
    try {
        const responses = await Promise.allSettled(feedUrls.map(async (url) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'ApplyPilot/2.0 (Job Aggregator)',
                    Accept: 'application/rss+xml, application/xml, text/xml',
                },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok)
                return '';
            return await res.text();
        }));
        const seenUrls = new Set();
        for (const r of responses) {
            if (r.status !== 'fulfilled' || !r.value)
                continue;
            const xml = r.value;
            const $ = load(xml, { xmlMode: true });
            $('item').each((_i, el) => {
                if (out.length >= max)
                    return false;
                const rawTitle = $(el).find('title').text().trim();
                const link = $(el).find('link').text().trim();
                const pubDate = $(el).find('pubDate').text().trim();
                const region = $(el).find('region').text().trim();
                const category = $(el).find('category').text().trim();
                const rawDesc = $(el).find('description').text().trim();
                if (!link || !rawTitle || seenUrls.has(link))
                    return;
                seenUrls.add(link);
                // Split "Company: Title" format
                const colonIdx = rawTitle.indexOf(':');
                let company = 'WeWorkRemotely Partner';
                let title = rawTitle;
                if (colonIdx > 0) {
                    company = rawTitle.slice(0, colonIdx).trim();
                    title = rawTitle.slice(colonIdx + 1).trim();
                }
                const titleLower = title.toLowerCase();
                const isIntern = /intern(ship)?|co-?op|trainee|junior|entry/i.test(titleLower);
                if (requireIntern && !isIntern)
                    return;
                // Query filtering if query provided
                const qTerms = queryLower.split(/\s+/).filter((t) => !/intern(ship)?/i.test(t) && t.length > 1);
                if (qTerms.length > 0 && !isIntern) {
                    const combined = `${titleLower} ${rawDesc.toLowerCase()} ${category.toLowerCase()}`;
                    const matches = qTerms.some((t) => combined.includes(t));
                    if (!matches)
                        return;
                }
                // Clean description
                const cleanDesc = rawDesc
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                // Calculate relative time
                const pubMs = pubDate ? new Date(pubDate).getTime() : Date.now();
                const diffMin = Math.max(0, Math.floor((Date.now() - pubMs) / 60000));
                let rel = 'Just now';
                if (diffMin < 60)
                    rel = `${diffMin}m ago`;
                else if (diffMin < 1440)
                    rel = `${Math.floor(diffMin / 60)}h ago`;
                else
                    rel = `${Math.floor(diffMin / 1440)}d ago`;
                if (diffMin > maxAllowedMinutes)
                    return;
                const meta = enrichJobMetadata(cleanDesc);
                const tags = [isIntern ? 'Internship' : 'Full-Time', '🌐 Remote'];
                if (category)
                    tags.push(category);
                if (meta.sponsorsVisa === true)
                    tags.push('🛂 Visa Sponsor');
                if (diffMin < 60)
                    tags.push('⚡ Just Posted');
                const isoDate = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
                out.push({
                    id: stableId(link),
                    title,
                    company,
                    source: 'weworkremotely',
                    url: link,
                    applyUrl: link,
                    location: region || 'Worldwide / Remote',
                    remote: true,
                    description: cleanDesc || title,
                    descriptionHtml: rawDesc,
                    postedAt: isoDate,
                    postedDate: isoDate,
                    postedRelative: rel,
                    fetchedAt: new Date().toISOString(),
                    employmentType: isIntern ? 'internship' : 'full-time',
                    isInternship: isIntern,
                    sponsorsVisa: meta.sponsorsVisa,
                    eligibleBatches: meta.eligibleBatches,
                    skills: deriveSkills(`${cleanDesc} ${title} ${category}`),
                    tags,
                });
            });
            if (out.length >= max)
                break;
        }
    }
    catch (err) {
        console.warn('[weworkremotely] scrape failed:', err.message);
    }
    const finalJobs = out.slice(0, max);
    scrapeCache.set(cacheKey, finalJobs);
    return finalJobs;
}

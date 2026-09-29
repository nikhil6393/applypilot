/**
 * Real-Time Search Engine Index Scraper for LinkedIn Postings (Dorking Fallback)
 * Bypasses LinkedIn authwalls, login walls, and IP 429 blocks by fetching
 * freshly indexed LinkedIn job postings via public search engine caches.
 */
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { parseRelativeTimeDetails } from './linkedin-realtime.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { isJobLocationMatch } from './geo-resolver.js';
const UA_LIST = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
];
function randomUA() {
    return UA_LIST[Math.floor(Math.random() * UA_LIST.length)];
}
function stableId(url) {
    return `linkedin_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}
export async function linkedinSearchDork(req) {
    const query = (req.query || 'software engineer internship').trim();
    const rawLoc = (req.location || 'India').trim();
    const isGlobal = !rawLoc || /^(anywhere|global|worldwide|all|any)$/i.test(rawLoc);
    const location = isGlobal ? '' : rawLoc;
    const max = Math.max(1, Math.min(50, req.maxPerSource ?? 25));
    const isInternReq = req.internshipsOnly !== false &&
        (req.internshipsOnly || /intern|co-?op|trainee/i.test(query));
    const searchTerms = [
        'site:linkedin.com/jobs/view',
        isInternReq ? `"${query}" OR "internship"` : `"${query}"`,
        location ? `"${location}"` : '',
    ]
        .filter(Boolean)
        .join(' ');
    const out = [];
    const seen = new Set();
    // ── Strategy 1: Google Fresh Web Index ──────────────────────────────────
    try {
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerms)}&tbs=qdr:w`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(googleUrl, {
            headers: {
                'User-Agent': randomUA(),
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
            const html = await res.text();
            const $ = load(html);
            $('div.g, [data-sokoban-container]').each((_, el) => {
                const titleRaw = $(el).find('h3').first().text().trim();
                const link = $(el).find('a').first().attr('href') || '';
                const snippet = $(el).find('[data-sncf], .VwiC3b, span').text().trim();
                if (!titleRaw || !link || !link.includes('linkedin.com/jobs/view'))
                    return;
                let cleanUrl = link;
                if (link.startsWith('/url?q=')) {
                    cleanUrl = decodeURIComponent(link.split('/url?q=')[1].split('&')[0]);
                }
                cleanUrl = cleanUrl.split('?')[0].replace(/\/$/, '');
                // Extract ID
                const idMatch = cleanUrl.match(/\/jobs\/view\/.*?(\d{8,12})/);
                const id = idMatch ? `linkedin_${idMatch[1]}` : stableId(cleanUrl);
                if (seen.has(id))
                    return;
                seen.add(id);
                // Title cleaning (LinkedIn titles in Google usually look like: "Software Engineer Intern - Company | LinkedIn")
                let title = titleRaw.replace(/\s*\|\s*LinkedIn.*$/i, '').replace(/\s*-\s*LinkedIn.*$/i, '');
                let company = 'Tech Company';
                const companyMatch = title.match(/\s+(?:at|@)\s+([A-Za-z0-9\s&.,-]+?)(?:\s+in|\s+·|\s+-|$)/i) ||
                    snippet.match(/\s+(?:at|@)\s+([A-Za-z0-9\s&.,-]+?)(?:\s+in|\s+·|\s+-|$)/i);
                if (companyMatch) {
                    company = companyMatch[1].trim();
                    title = title.replace(/\s+(?:at|@)\s+[A-Za-z0-9\s&.,-]+(?:\s+in.*)?$/i, '').trim();
                }
                const isIntern = isInternReq ||
                    /\b(intern(ship)?|co-?op|trainee|apprentice|student|fresher|graduate\s+engineer)\b/i.test(title + ' ' + snippet);
                const remote = /remote|wfh|work from home/i.test(title + ' ' + snippet + ' ' + (location || ''));
                const jobLoc = location || (remote ? 'Remote' : 'India');
                if (!isJobLocationMatch(jobLoc, remote, req.location, req.remoteOnly))
                    return;
                const timeInfo = parseRelativeTimeDetails(snippet);
                const meta = enrichJobMetadata(snippet, title);
                const tags = [isIntern ? 'Internship' : 'Full-Time'];
                if (remote)
                    tags.push('🌐 Remote');
                if (timeInfo.minutesAgo < 1440)
                    tags.push('🕒 Fresh (<24h)');
                else
                    tags.push('📅 Recent');
                if (meta.salary)
                    tags.push(`💰 ${meta.salary}`);
                out.push({
                    id,
                    title,
                    company,
                    source: 'linkedin_dork',
                    url: cleanUrl,
                    applyUrl: cleanUrl,
                    location: jobLoc,
                    remote,
                    description: snippet || `${title} at ${company}. Live LinkedIn listing.`,
                    postedAt: timeInfo.iso,
                    postedDate: timeInfo.iso,
                    postedRelative: timeInfo.relative,
                    fetchedAt: new Date().toISOString(),
                    employmentType: isIntern ? 'internship' : 'full-time',
                    isInternship: isIntern,
                    skills: meta.techStack && meta.techStack.length > 0 ? meta.techStack : ['JavaScript', 'Python', 'React'],
                    tags,
                });
            });
        }
    }
    catch {
        // Google dorking pass failed, try DuckDuckGo HTML
    }
    // ── Strategy 2: DuckDuckGo HTML Fallback ────────────────────────────────
    if (out.length < 5) {
        try {
            const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchTerms)}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(ddgUrl, {
                headers: {
                    'User-Agent': randomUA(),
                    Accept: 'text/html',
                },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.ok) {
                const html = await res.text();
                const $ = load(html);
                $('.result').each((_, el) => {
                    const titleRaw = $(el).find('.result__title a').first().text().trim();
                    const rawLink = $(el).find('.result__url').first().text().trim();
                    const snippet = $(el).find('.result__snippet').first().text().trim();
                    if (!titleRaw || !rawLink.includes('linkedin.com/jobs/view'))
                        return;
                    let cleanUrl = rawLink.startsWith('http') ? rawLink : `https://${rawLink}`;
                    cleanUrl = cleanUrl.split('?')[0];
                    const idMatch = cleanUrl.match(/(\d{8,12})/);
                    const id = idMatch ? `linkedin_${idMatch[1]}` : stableId(cleanUrl);
                    if (seen.has(id))
                        return;
                    seen.add(id);
                    let title = titleRaw.replace(/\s*\|\s*LinkedIn.*$/i, '');
                    let company = 'Tech Company';
                    const match = title.match(/\s+at\s+([A-Za-z0-9\s&.,-]+)/i);
                    if (match) {
                        company = match[1].trim();
                        title = title.replace(/\s+at\s+[A-Za-z0-9\s&.,-]+/i, '').trim();
                    }
                    const isIntern = isInternReq ||
                        /\b(intern(ship)?|co-?op|trainee|student)\b/i.test(title + ' ' + snippet);
                    const remote = /remote|wfh/i.test(title + ' ' + snippet);
                    const jobLoc = location || (remote ? 'Remote' : 'India');
                    if (!isJobLocationMatch(jobLoc, remote, req.location, req.remoteOnly))
                        return;
                    const timeInfo = parseRelativeTimeDetails(snippet);
                    out.push({
                        id,
                        title,
                        company,
                        source: 'linkedin_dork',
                        url: cleanUrl,
                        applyUrl: cleanUrl,
                        location: jobLoc,
                        remote,
                        description: snippet || `${title} at ${company}.`,
                        postedAt: timeInfo.iso,
                        postedDate: timeInfo.iso,
                        postedRelative: timeInfo.relative,
                        fetchedAt: new Date().toISOString(),
                        employmentType: isIntern ? 'internship' : 'full-time',
                        isInternship: isIntern,
                        skills: ['JavaScript', 'Python', 'React'],
                        tags: [isIntern ? 'Internship' : 'Full-Time', jobLoc],
                    });
                });
            }
        }
        catch {
            // ignore
        }
    }
    return out.slice(0, max);
}

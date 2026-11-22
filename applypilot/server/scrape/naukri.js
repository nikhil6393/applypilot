import { getCrawleeProxyConfig, getRandomUserAgent } from './crawlee-engine.js';
import { scrapeCache } from './cache.js';

const NAUKRI_SEARCH_URL = 'https://www.naukri.com/jobapi/v3/search';
const NAUKRI_BASE = 'https://www.naukri.com';

/**
 * @param {object} opts
 * @param {string}  [opts.query]           - Search keyword (e.g., 'software engineer intern')
 * @param {string}  [opts.location]        - Location filter (e.g., 'Bengaluru')
 * @param {number}  [opts.maxPerSource=30] - Max jobs to return
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<import('../scrape/normalize.js').NormalizedJob[]>}
 */
export async function naukri({ query = 'software engineer', location = '', maxPerSource = 30, signal } = {}) {
    const cacheKey = scrapeCache.generateKey('naukri', { query, location, maxPerSource });
    const cached = scrapeCache.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
        noOfResults: String(Math.min(maxPerSource, 50)),
        urlType: 'search_by_keyword',
        searchType: 'adv',
        keyword: query,
        pageNo: '1',
        seoKey: query.toLowerCase().replace(/\s+/g, '-') + '-jobs',
        src: 'jobsearchDesk',
        latLong: '',
    });

    if (location) {
        params.set('location', location);
        params.set('locationTypeId', '4');
    }

    const url = `${NAUKRI_SEARCH_URL}?${params.toString()}`;

    let raw;
    try {
        const headers = {
            'accept': 'application/json',
            'accept-language': 'en-IN,en;q=0.9',
            'appid': '109',
            'clientid': 'd3skt0p',
            'content-type': 'application/json',
            'systemid': 'Naukri',
            'user-agent': getRandomUserAgent(),
        };

        const res = await fetch(url, {
            headers,
            signal,
            redirect: 'follow',
        });

        if (res.ok) {
            raw = await res.json();
        } else {
            console.warn(`[naukri] Direct API returned HTTP ${res.status}. Falling back to verified Indian tech listings.`);
        }
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.warn('[naukri] Fetch failed:', err.message);
    }

    const hits = raw?.jobDetails || raw?.jobs || [];
    if (!Array.isArray(hits) || hits.length === 0) {
        try {
            const { unstop } = await import('./unstop.js');
            const fallbackJobs = await unstop({ query, location, maxPerSource });
            if (fallbackJobs.length > 0) {
                const finalFallback = fallbackJobs.map(j => ({
                    ...j,
                    id: `naukri_fb_${j.id.replace(/^unstop_/, '')}`,
                    source: j.source || 'unstop',
                    sourceUrl: j.applyUrl,
                }));
                scrapeCache.set(cacheKey, finalFallback);
                return finalFallback;
            }
        } catch {}
        return [];
    }

    return hits.map((j) => {
        const jobId = j.jobId || j.jobid || '';
        const title = j.title || j.designation || 'Untitled Role';
        const company = j.companyName || j.company || 'Unknown Company';
        const location_ = [j.placeholders?.[0]?.label, j.location].filter(Boolean).join(', ');
        const postedAt = j.footerPlaceholderLabel
            ? parseFuzzyDate(j.footerPlaceholderLabel)
            : (j.createdDate ? new Date(j.createdDate).toISOString() : '');

        // Build the real Naukri job URL
        const slug = j.jobUrl || j.staticUrl || '';
        const applyUrl = slug
            ? (slug.startsWith('http') ? slug : `${NAUKRI_BASE}${slug}`)
            : `${NAUKRI_BASE}/job-listings-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${jobId}`;

        const skills = Array.isArray(j.tagsAndSkills)
            ? j.tagsAndSkills.map((s) => (typeof s === 'string' ? s : s.label)).filter(Boolean)
            : (Array.isArray(j.skills) ? j.skills : []);

        const description = [
            j.jobDescription || '',
            j.jobSummary || '',
        ].filter(Boolean).join('\n').trim();

        return {
            id: `naukri_${jobId || Math.random().toString(36).slice(2)}`,
            source: 'naukri',
            title,
            company,
            location: location_,
            applyUrl,
            sourceUrl: applyUrl,
            canonicalUrl: applyUrl,
            postedAt,
            postedRelative: j.footerPlaceholderLabel || null,
            description,
            skills,
            remote: /remote|wfh|work from home/i.test(location_ + ' ' + description)
                ? true
                : /\b(hybrid|on[- ]?site|in[- ]office|office[- ]based)\b/i.test(location_ + ' ' + description)
                    ? false
                    : undefined,
            isInternship: /intern/i.test(title),
            salary: j.placeholders?.find(p => p?.type === 'salaryLabel')?.label || null,
            fetchedAt: new Date().toISOString(),
        };
    });
}

/**
 * Parses fuzzy date strings like "3 Days Ago", "Just Now", "1 Week Ago", "30+ Days Ago"
 * into accurate ISO timestamps.
 * @param {string} label
 * @returns {string} ISO date string
 */
function parseFuzzyDate(label) {
    const now = Date.now();
    const l = (label || '').toLowerCase();
    if (!l) return new Date(now - 86400000 * 14).toISOString();
    if (/just now|few (seconds|minutes)/i.test(l)) return new Date(now - 120000).toISOString();
    if (/today|few hours/i.test(l)) return new Date(now - 3600000 * 4).toISOString();
    if (/yesterday/i.test(l)) return new Date(now - 86400000).toISOString();
    if (/30\+\s*days?/i.test(l)) return new Date(now - 86400000 * 35).toISOString();
    const match = l.match(/(\d+)\s*(hour|hr|day|week|month)/);
    if (!match) return new Date(now - 86400000 * 7).toISOString();
    const n = parseInt(match[1], 10);
    const unit = match[2];
    const ms = {
        hour: 3600_000,
        hr: 3600_000,
        day: 86_400_000,
        week: 604_800_000,
        month: 2_592_000_000,
    }[unit] || 86_400_000;
    return new Date(now - n * ms).toISOString();
}

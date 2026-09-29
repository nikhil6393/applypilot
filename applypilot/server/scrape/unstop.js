/**
 * Unstop (formerly Dare2Compete) Campus & Tech Internship Scraper
 * Fetches verified hiring challenges, corporate internships, and fresher roles from Unstop.
 */
import { createHash } from 'node:crypto';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { isJobLocationMatch } from './geo-resolver.js';
import { resolveCompanyLogo } from './logo-resolver.js';
function stableId(url) {
    return `unstop_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}
export async function unstop(req) {
    const cacheKey = scrapeCache.generateKey('unstop', req);
    const cached = scrapeCache.get(cacheKey);
    if (cached)
        return cached;
    const max = Math.max(1, Math.min(40, req.maxPerSource ?? 20));
    const query = (req.query || 'software').trim();
    const rawLoc = (req.location || 'India').trim();
    const remoteOnly = req.remoteOnly || /remote/i.test(rawLoc);
    const out = [];
    const seen = new Set();
    try {
        const apiUrl = `https://unstop.com/api/public/opportunity/search-result?opportunity=internships&searchTerm=${encodeURIComponent(query)}&per_page=${max}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                Accept: 'application/json',
                Referer: 'https://unstop.com/',
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
            const data = (await res.json());
            const listings = data?.data?.data || [];
            if (Array.isArray(listings)) {
                for (const item of listings) {
                    const title = item.title || item.name;
                    const slug = item.seo_url || item.url || item.public_url || item.id;
                    if (!title || !slug)
                        continue;
                    const applyUrl = slug.startsWith('http') ? slug : `https://unstop.com/${slug}`;
                    const id = stableId(applyUrl);
                    if (seen.has(id))
                        continue;
                    seen.add(id);
                    const company = item.organisation?.name || item.org_name || 'Top Enterprise';
                    const cardLoc = item.locations?.[0] || item.location || (remoteOnly ? 'Remote' : 'India');
                    const remote = item.job_type === 'remote' || /remote|online/i.test(cardLoc + ' ' + title);
                    if (!isJobLocationMatch(cardLoc, remote, req.location, req.remoteOnly)) {
                        continue;
                    }
                    const stipend = item.payment_amount ? `₹${item.payment_amount}/month` : undefined;
                    const meta = enrichJobMetadata(title, title);
                    const tags = ['Internship', '🏆 Campus Drive'];
                    if (remote)
                        tags.push('🌐 Remote');
                    if (stipend)
                        tags.push(`💰 ${stipend}`);
                    tags.push('⚡ Active Hiring');
                    const rawLogo = item.organisation?.logo?.url || item.organisation?.logo_url || item.banner_mobile?.image_url;
                    const finalLogo = resolveCompanyLogo(company, rawLogo, applyUrl);
                    out.push({
                        id,
                        title,
                        company,
                        source: 'unstop',
                        url: applyUrl,
                        applyUrl,
                        companyLogo: finalLogo,
                        location: cardLoc,
                        remote,
                        description: `${title} by ${company} on Unstop. Campus and early-career hiring opportunity.`,
                        postedAt: item.created_at || new Date().toISOString(),
                        postedDate: item.created_at || new Date().toISOString(),
                        postedRelative: 'Fresh',
                        fetchedAt: new Date().toISOString(),
                        employmentType: 'internship',
                        isInternship: true,
                        salary: stipend,
                        eligibleBatches: ['2028', '2027', '2026', '2025'],
                        skills: meta.techStack && meta.techStack.length > 0 ? meta.techStack : ['Java', 'Python', 'C++', 'Data Structures'],
                        tags,
                    });
                    if (out.length >= max)
                        break;
                }
            }
        }
    }
    catch {
        // Graceful fallback
    }
    const finalJobs = out.slice(0, max);
    if (finalJobs.length > 0) {
        scrapeCache.set(cacheKey, finalJobs, 180);
    }
    return finalJobs;
}

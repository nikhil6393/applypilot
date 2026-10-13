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
                    const slug = item.seo_url || item.public_url || item.url || item.id;
                    if (!title || !slug)
                        continue;
                    // Check live registration status: discard closed or expired opportunities
                    if (item.status && item.status.toUpperCase() !== 'LIVE' && item.status.toUpperCase() !== 'OPEN') {
                        continue;
                    }
                    if (item.regn_open !== undefined && (item.regn_open === 0 || item.regn_open === false)) {
                        continue;
                    }
                    if (item.is_expired === true) {
                        continue;
                    }
                    const endDateStr = item.end_date || item.registration_end_date || item.regn_end_date;
                    if (endDateStr) {
                        const endMs = new Date(endDateStr).getTime();
                        if (!isNaN(endMs) && endMs < Date.now()) {
                            continue;
                        }
                    }

                    // Tech-only filter: exclude non-tech, sales, HR, marketing, telecaller, and irrelevant roles
                    const isTech = /software|developer|engineer|frontend|backend|fullstack|full-stack|data|devops|react|node|cloud|web|ai|ml|python|java|systems?|programmer|programming|tech|sdet|architect|platform|mobile|android|ios|machine\s+learning/i.test(title);
                    const isIrrelevant = /outreach|counselor|fundraising|graphic|catalog|tailor|clerk|cook|driver|cleaner|sales|marketing|tele|call\s*center|voice|reception|business\s*development|hr\b|human\s*resource|accountant/i.test(title);
                    if (!isTech || isIrrelevant)
                        continue;
                    const applyUrl = slug.startsWith('http') ? slug : `https://unstop.com/${slug.replace(/^\//, '')}`;
                    const id = stableId(applyUrl);
                    if (seen.has(id))
                        continue;
                    seen.add(id);
                    const company = item.organisation?.name || item.org_name || 'Top Enterprise';
                    const locObj = item.locations?.[0] || item.jobDetail?.locations?.[0];
                    const cardLoc = (typeof locObj === 'object' && locObj !== null ? (locObj.city || locObj.state || locObj.country) : locObj) || item.location || (remoteOnly ? 'Remote' : 'India');
                    const remote = item.job_type === 'remote' || item.region === 'online' || /remote|online|virtual/i.test(cardLoc + ' ' + title);
                    if (req.location && !isJobLocationMatch(cardLoc, remote, req.location, req.remoteOnly)) {
                        continue;
                    }
                    const rawStipend = item.jobDetail?.min_salary || item.payment_amount;
                    const stipend = rawStipend ? `₹${Number(rawStipend).toLocaleString('en-IN')}/month` : undefined;
                    const meta = enrichJobMetadata(title, title);
                    const tags = ['Internship', '🏆 Campus Drive'];
                    if (remote)
                        tags.push('🌐 Remote');
                    if (stipend)
                        tags.push(`💰 ${stipend}`);
                    tags.push('⚡ Active Hiring');
                    const rawLogo = item.logoUrl2 || item.organisation?.logoUrl || item.organisation?.logo?.url || item.banner_mobile?.image_url;
                    const finalLogo = resolveCompanyLogo(company, rawLogo, applyUrl);
                    const extractedSkills = Array.isArray(item.required_skills) && item.required_skills.length > 0
                        ? item.required_skills.map((s) => s.skill || s.skill_name).filter(Boolean)
                        : (meta.techStack && meta.techStack.length > 0 ? meta.techStack : ['Java', 'Python', 'C++', 'Data Structures']);
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
                        skills: extractedSkills,
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

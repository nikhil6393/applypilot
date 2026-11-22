import { createHash } from 'node:crypto';
import { scrapeCache } from './cache.js';
import { validateAndFilterJobs } from './validator.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { isJobLocationMatch } from './geo-resolver.js';
import { resolveCompanyLogo } from './logo-resolver.js';

/**
 * Curated Tech Leaders and Enterprises actively utilizing SmartRecruiters public boards
 */
export const SMARTRECRUITERS_COMPANIES = [
    { id: 'BoschGroup', name: 'Bosch Group' },
    { id: 'visa', name: 'Visa' },
    { id: 'PublicisSapient', name: 'Publicis Sapient' },
    { id: 'infor', name: 'Infor' },
    { id: 'wipro', name: 'Wipro' },
    { id: 'alstom', name: 'Alstom' },
    { id: 'skechers', name: 'Skechers' },
    { id: 'avalara', name: 'Avalara' },
    { id: 'biomerieux', name: 'bioMérieux' },
    { id: 'epicgames', name: 'Epic Games' },
    { id: 'equinix', name: 'Equinix' },
    { id: 'kone', name: 'KONE' },
    { id: 'colliers', name: 'Colliers' },
];

function stableId(url) {
    return `smartrecruiters_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}

/**
 * Scrapes live openings from SmartRecruiters' zero-auth public JSON API.
 */
export async function smartrecruiters(req = {}) {
    const cacheKey = scrapeCache.generateKey('smartrecruiters', req);
    const cached = scrapeCache.get(cacheKey);
    if (cached) return cached;

    const max = Math.max(1, Math.min(200, req.maxPerSource ?? 50));
    const out = [];
    const queryLower = (req.query || '').toLowerCase().trim();
    const requireIntern = Boolean(
        req.internshipsOnly ||
        req.jobType === 'internship' ||
        /\b(intern(ship)?|co-?op|trainee|apprentice|student|fresher)\b/i.test(queryLower)
    );

    const isTechSearch = !queryLower || /\b(software|developer|engineer|frontend|backend|fullstack|data|devops|cloud|web|ai|ml|python|java|system|tech|intern)\b/i.test(queryLower);

    const fetchCompany = async ({ id: compId, name: compName }) => {
        try {
            const url = `https://api.smartrecruiters.com/v1/companies/${compId}/postings?limit=100`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                },
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!res.ok) return [];
            const data = await res.json();
            const postings = Array.isArray(data.content) ? data.content : [];
            const matched = [];

            for (const p of postings) {
                const title = (p.name || '').trim();
                const titleLower = title.toLowerCase();

                // High-precision non-tech rejection
                const isNonTech = /\b(account\s+executive|account\s+manager|business\s+development|bdr|sdr|marketing|recruiter|talent\s+acquisition|barista|line\s+cook|cook|chef|dishwasher|server|waiter|waitress|bartender|cashier|janitor|cleaner|custodian|driver|courier|nurse|dentist|dental|doctor|pharmacist|receptionist|store\s+associate|retail|clerk|attendant|sales\s+representative|customer\s+service|customer\s+support|warehouse\s+supervisor|point\s+leader)\b/i.test(titleLower);
                if (isTechSearch && isNonTech && !titleLower.includes(queryLower)) {
                    continue;
                }

                const isIntern = /\b(intern(ship)?|co-?op|trainee|apprentice|working\s+student|student|fresher|graduate\s+engineer|fellow(ship)?|campus|early\s+career)\b/i.test(titleLower);
                const isSenior = /\b(senior|sr\.|lead|principal|staff|director|vp|head\s+of|manager)\b/i.test(titleLower);

                if (requireIntern && (!isIntern || isSenior)) {
                    continue;
                }

                const locObj = p.location || {};
                const locCity = locObj.city || '';
                const locRegion = locObj.region || '';
                const locCountry = (locObj.country || '').toUpperCase();
                const locationString = [locCity, locRegion, locCountry].filter(Boolean).join(', ') || 'Global';

                const isRemote = Boolean(locObj.remote) || /\b(remote|wfh|work from home)\b/i.test(titleLower);
                const isHybrid = Boolean(locObj.hybrid) || /\bhybrid\b/i.test(titleLower);
                const workplace = isHybrid ? 'Hybrid' : (isRemote ? 'Remote' : 'Onsite');

                // Location strict check
                if (req.location && !isJobLocationMatch(locationString, isRemote, req.location, req.remoteOnly)) {
                    continue;
                }
                if (req.remoteOnly && !isRemote) {
                    continue;
                }

                const postingId = p.id;
                const applyUrl = `https://jobs.smartrecruiters.com/${compId}/${postingId}`;
                const meta = enrichJobMetadata(`${title} ${locationString}`, title);
                const techStack = meta.techStack && meta.techStack.length > 0 ? meta.techStack : [];

                const postedDate = p.releasedDate || new Date().toISOString();

                matched.push({
                    id: `smartrecruiters_${postingId}`,
                    title,
                    company: compName,
                    companyLogo: resolveCompanyLogo(compName, null, applyUrl),
                    source: 'smartrecruiters',
                    url: applyUrl,
                    applyUrl,
                    location: locationString,
                    remote: isRemote,
                    workplace,
                    isHybrid,
                    isRemote,
                    isInternship: isIntern,
                    employmentType: isIntern ? 'internship' : (p.typeOfEmployment?.label || 'full-time'),
                    description: `${title} at ${compName}. Location: ${locationString}. Department: ${p.department?.label || 'Engineering'}. Verified official SmartRecruiters opening.`,
                    postedAt: postedDate,
                    postedDate,
                    skills: techStack,
                    techStack,
                    sponsorsVisa: meta.sponsorsVisa,
                    indianCitizenEligibility: meta.indianCitizenEligibility,
                    fetchedAt: new Date().toISOString(),
                });

                if (matched.length >= 15) break;
            }

            return matched;
        } catch {
            return [];
        }
    };

    // Parallel fetch with concurrency pool of 5
    const queue = [...SMARTRECRUITERS_COMPANIES];
    const workers = Array.from({ length: Math.min(5, queue.length) }, async () => {
        while (queue.length > 0) {
            const comp = queue.shift();
            if (!comp) break;
            const jobs = await fetchCompany(comp);
            if (jobs.length > 0) {
                out.push(...jobs);
            }
        }
    });

    await Promise.all(workers);

    const verified = validateAndFilterJobs(out).slice(0, max);
    if (verified.length > 0) {
        scrapeCache.set(cacheKey, verified, 300);
    }
    return verified;
}

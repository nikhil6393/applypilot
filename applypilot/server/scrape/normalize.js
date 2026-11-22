import { randomUUID } from 'node:crypto';
import { detectDomainFromQuery, matchesDomainJob, isSoftwareEngineerInternQuery, isSoftwareEngineerFullTimeQuery, matchesSoftwareEngineerInternRole, matchesSoftwareEngineerFullTimeRole, } from './RoleExpansionConfig.js';
import { resolveCompanyLogo } from './logo-resolver.js';
export function normalizeJobs(input) {
    return input.map((j) => ({
        ...j,
        id: j.id || randomUUID(),
        fetchedAt: j.fetchedAt || new Date().toISOString(),
        skills: Array.isArray(j.skills) ? j.skills : [],
        companyLogo: j.companyLogo || resolveCompanyLogo(j.company, null, j.url || j.applyUrl),
    }));
}
function queryTerms(query) {
    return query
        .split(',')
        .map((part) => part.toLowerCase().match(/[a-z0-9+#.]{3,}/g) || [])
        .filter((terms) => terms.length > 0)
        .map((terms) => terms.filter((term) => !['job', 'jobs', 'role', 'position', 'opening', 'the', 'and', 'for'].includes(term)));
}
export function extractSeniority(title, description = '') {
    const t = title.toLowerCase();
    if (/\b(principal|distinguished|fellow|architect)\b/i.test(t))
        return 'principal';
    if (/\b(lead|tech lead|staff|senior|sr\.?)\b/i.test(t))
        return 'senior';
    if (/\b(mid|mid-level|intermediate|level 2|engineer ii|sde 2|sde ii|swe 2|swe ii)\b/i.test(t) || /\b(ii)\b/i.test(t))
        return 'mid';
    if (/\b(junior|jr\.?|associate|intern|entry|graduate|fresher)\b/i.test(t))
        return 'entry';
    const d = description.toLowerCase();
    if (/\b(principal|distinguished|fellow|architect)\b/i.test(d))
        return 'principal';
    if (/\b(lead|tech lead|staff|senior|sr\.?)\b/i.test(d))
        return 'senior';
    if (/\b(mid|mid-level|intermediate)\b/i.test(d))
        return 'mid';
    if (/\b(junior|jr\.?|associate|intern|entry|graduate|fresher)\b/i.test(d))
        return 'entry';
    return undefined;
}
export function extractBenefits(description) {
    const benefits = [];
    const text = description.toLowerCase();
    const benefitChecks = [
        [/health (insurance|coverage|benefits)/g, 'health insurance'],
        [/dental/g, 'dental'],
        [/vision/g, 'vision'],
        [/(?:401k|401 ?k|pension|retirement plan)/g, 'retirement'],
        [/(?:equity|stock option|rsu|esop|share ownership)/g, 'equity'],
        [/(?:remote|work from home|wfh|hybrid)/g, 'remote'],
        [/flexible (?:hours|time|schedule)/g, 'flexible-hours'],
        [/unlimited (?:pto|vacation|leave)/g, 'unlimited-pto'],
        [/(?:learning|tuition|education|conference|training|certification)/g, 'learning'],
        [/(?:parental|maternity|paternity) leave/g, 'parental-leave'],
        [/(?:pet|dog|cat)/g, 'pet-friendly'],
    ];
    for (const [pattern, name] of benefitChecks) {
        let match = null;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(text)) !== null) {
            const before = text.substring(Math.max(0, match.index - 15), match.index);
            if (!/\b(no|without|not)\b/.test(before)) {
                benefits.push(name);
                break;
            }
        }
    }
    return benefits;
}
export function extractExperienceYears(description) {
    const text = `${description}`.toLowerCase();
    const patterns = [
        /(\d+)\+?\s*years?\s*(?:of)?\s*(?:experience|working|exposure)/,
        /(\d+)\s*[-–]\s*(\d+)\s*years/,
        /(\d+)\s*years?\s+(?:of )?experience/,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match)
            return parseInt(match[1], 10);
    }
    return 0;
}
export function extractSalary(description, title) {
    const text = `${title} ${description}`.toLowerCase();
    const salaryPatterns = [
        /\$?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:k|k?\-?\s*|to)\s*\$?\s*(\d{1,3}(?:,\d{3})*|\d+)?\s*(?:k)?/g,
        /\$?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:k)?\s*(?:-|–|to)\s*\$?\s*(\d{1,3}(?:,\d{3})*|\d+)?\s*(?:k)?/g,
        /\$\s*(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?\s*(?:k)?\s*(?:-|–|to)\s*\$\s*(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?\s*(?:k)?/g,
    ];
    for (const pattern of salaryPatterns) {
        const match = text.match(pattern);
        if (match) {
            const numbers = match[0].match(/\d{1,3}(?:,\d{3})*|\d+/g);
            if (numbers && numbers.length >= 1) {
                const min = parseInt(numbers[0].replace(/,/g, ''), 10) * (text.includes('k') ? 1000 : 1);
                const max = numbers.length >= 2 ? parseInt(numbers[1].replace(/,/g, ''), 10) * (text.includes('k') ? 1000 : 1) : min;
                return { min, max };
            }
        }
    }
    return {};
}
export function matchSkills(jobSkills = [], required = [], preferred = []) {
    const jobSkillsLower = (jobSkills || []).map((s) => s.toLowerCase());
    const reqList = required || [];
    const prefList = preferred || [];
    const requiredMatched = reqList.filter((s) => jobSkillsLower.includes(s.toLowerCase()) ||
        jobSkillsLower.some((js) => js.includes(s.toLowerCase())));
    const preferredMatched = prefList.filter((s) => jobSkillsLower.includes(s.toLowerCase()) ||
        jobSkillsLower.some((js) => js.includes(s.toLowerCase())));
    const requiredMatch = reqList.length === 0 || requiredMatched.length > 0;
    const score = reqList.length === 0
        ? (prefList.length === 0 ? 0 : (preferredMatched.length / prefList.length) * 100)
        : (requiredMatched.length / reqList.length) * 100 +
            (preferredMatched.length / Math.max(1, prefList.length)) * 25;
    return { requiredMatch, requiredMatched, preferredMatched, score };
}
function seniorityFromRequest(req) {
    if (!req.advanceMode || !req.seniorityLevels)
        return null;
    return req.seniorityLevels;
}
function industryFromRequest(req) {
    if (!req.advanceMode || !req.industries)
        return null;
    return req.industries;
}
function benefitsFromRequest(req) {
    if (!req.advanceMode || !req.benefits)
        return null;
    return req.benefits;
}
export function matchesSeniority(job, seniorityLevels) {
    const jobSeniority = extractSeniority(job.title, job.description);
    return jobSeniority ? seniorityLevels.includes(jobSeniority) : false;
}
export function matchesBenefits(job, requiredBenefits) {
    const jobBenefits = extractBenefits(job.description);
    return requiredBenefits.every((b) => jobBenefits.includes(b));
}
export function matchesSalary(job, min, max) {
    if (min === undefined && max === undefined)
        return true;
    const salaryInfo = extractSalary(job.description, job.title);
    const jobMin = job.salaryMin ?? salaryInfo.min;
    const jobMax = job.salaryMax ?? salaryInfo.max;
    if (min !== undefined && jobMin !== undefined && jobMin < min)
        return false;
    if (max !== undefined && jobMax !== undefined && jobMax > max)
        return false;
    return true;
}
const NON_TECH_TITLE_PATTERNS = /\b(account\s+executive|account\s+manager|business\s+development|bdr|sdr|marketing\s+manager|marketing\s+specialist|recruiter|talent\s+acquisition|barista|line\s+cook|cook|chef|dishwasher|server|waiter|waitress|bartender|cashier|janitor|cleaner|custodian|driver|courier|nurse|dentist|dental|doctor|pharmacist|receptionist|store\s+associate|retail\s+associate|clerk|attendant|sales\s+representative|customer\s+service|customer\s+support|call\s+center|telecaller|tele-sales|data\s+entry|office\s+assistant|security\s+guard)\b/i;

/** Uses only title, description and location supplied by the source; strict anti-hallucination and zero-noise gating. */
export function matchesScrapeRequest(job, req) {
    const titleLower = (job.title || '').toLowerCase();
    const queryStr = (req.query || '').trim().toLowerCase();

    // 1. Strict Anti-Hallucination & Negative Title Rejection:
    // When searching for technical roles, strictly reject obvious non-tech noise unless the query explicitly asks for it
    const queryIsTech = !queryStr || /\b(software|developer|engineer|engineering|fullstack|full-stack|frontend|front-end|backend|back-end|web|mobile|ios|android|ai|machine\s+learning|data|cloud|devops|security|qa|testing|sde|swe|architect|programmer|systems|firmware|intern|internship|tech)\b/i.test(queryStr);
    if (queryIsTech && NON_TECH_TITLE_PATTERNS.test(titleLower)) {
        const queryMentionsNonTech = NON_TECH_TITLE_PATTERNS.test(queryStr);
        if (!queryMentionsNonTech) {
            return false;
        }
    }

    // 2. Strict Workplace Mode Guard
    const wantsRemoteOnly = Boolean(req.remoteOnly || req.workplaceType === 'remote');
    if (wantsRemoteOnly) {
        if (!job.remote || job.workplace !== 'Remote' || job.isHybrid) {
            return false;
        }
    } else if (req.workplaceType === 'hybrid' && job.workplace !== 'Hybrid') {
        return false;
    } else if (req.workplaceType === 'onsite' && job.workplace !== 'Onsite') {
        return false;
    }

    // 3. Strict Seniority & Internship Isolation
    const isInternshipMode = Boolean(
        req.internshipsOnly ||
        req.jobType === 'internship' ||
        /\b(intern|internship|trainee|co-?op)\b/i.test(queryStr)
    );
    const isSeniorRole = /\b(senior|sr\.?|lead|principal|staff|director|vp|head\s+of|manager)\b/i.test(titleLower);

    if (isInternshipMode) {
        if (isSeniorRole) return false;
        const isIntern = job.employmentType === 'internship' ||
            job.isInternship === true ||
            /\bintern(ship)?\b|\bco-?op\b|\btrainee\b|\bfresher\b/i.test(`${job.title} ${job.description}`);
        if (!isIntern) {
            return false;
        }
        const exp = extractExperienceYears(job.description);
        if (exp >= 3) {
            return false;
        }
    } else if (req.seniority === 'senior' || req.seniorityLevels?.includes('senior')) {
        if (/\b(intern|internship|trainee|fresher|graduate\s+trainee)\b/i.test(titleLower)) {
            return false;
        }
    }

    // 4. Strict Indian Citizen Eligibility / Visa Sponsorship Guard
    if (req.requireIndianEligibility || req.sponsorsVisa || req.foreignRemoteOnly) {
        if (job.indianCitizenEligibility?.allowed === false ||
            job.indianCitizenEligibility?.status === 'restricted' ||
            job.indianCitizenEligibility?.status === 'ineligible_no_sponsorship') {
            return false;
        }
    }

    // 5. Geographic & City Matching
    if (req.location?.trim() && !job.remote) {
        const wanted = req.location.toLowerCase().trim();
        if (!/^(anywhere|global|worldwide|all|any)$/i.test(wanted)) {
            const jobLoc = (job.location || '').toLowerCase();
            const isIndiaAlias = (wanted.includes('bangalore') && jobLoc.includes('bengaluru')) ||
                (wanted.includes('bengaluru') && jobLoc.includes('bangalore')) ||
                (wanted.includes('delhi') && (jobLoc.includes('noida') || jobLoc.includes('gurgaon') || jobLoc.includes('gurugram')));
            if (!jobLoc.includes(wanted) && !isIndiaAlias) {
                if (!['linkedin', 'naukri', 'naukari'].includes(job.source)) {
                    return false;
                }
            }
        }
    }

    // 6. Recency filter
    if (req.postedWithinHours && req.postedWithinHours > 0) {
        const date = Date.parse(job.postedAt);
        const cutoff = Date.now() - req.postedWithinHours * 3_600_000;
        if (!Number.isFinite(date) || date < cutoff)
            return false;
    }

    if (req.advanceMode) {
        if (req.excludeKeywords?.length) {
            const haystack = `${job.title} ${job.description}`.toLowerCase();
            if (req.excludeKeywords.some((kw) => haystack.includes(kw.toLowerCase())))
                return false;
        }
        if (req.requiredSkills?.length) {
            const result = matchSkills(job.skills, req.requiredSkills, req.preferredSkills ?? []);
            if (!result.requiredMatch)
                return false;
        }
        else if (req.preferredSkills?.length) {
            const jobSkillsLower = job.skills.map((s) => s.toLowerCase());
            const hasAnyPreferred = req.preferredSkills.some((s) => jobSkillsLower.includes(s.toLowerCase()) ||
                jobSkillsLower.some((js) => js.includes(s.toLowerCase())));
            if (!hasAnyPreferred)
                return false;
        }
        const seniorityLevels = seniorityFromRequest(req);
        if (seniorityLevels && !matchesSeniority(job, seniorityLevels))
            return false;
        if (req.salaryMin !== undefined || req.salaryMax !== undefined) {
            if (!matchesSalary(job, req.salaryMin, req.salaryMax))
                return false;
        }
        if (req.benefits?.length && !matchesBenefits(job, req.benefits))
            return false;
        if (req.minExperienceYears !== undefined || req.maxExperienceYears !== undefined) {
            const exp = extractExperienceYears(job.description);
            if (req.minExperienceYears !== undefined && exp < req.minExperienceYears)
                return false;
            if (req.maxExperienceYears !== undefined && exp > req.maxExperienceYears)
                return false;
        }
    }

    const haystack = `${job.title || ''} ${job.description || ''} ${(Array.isArray(job.skills) ? job.skills : []).join(' ')}`.toLowerCase();
    // Role Expansion Check
    const detectedDomain = detectDomainFromQuery(queryStr);
    if (detectedDomain) {
        const isIntern = isInternshipMode;
        if (matchesDomainJob(detectedDomain.domainId, job.title, isIntern) ||
            matchesDomainJob(detectedDomain.domainId, haystack, isIntern)) {
            return true;
        }
    }
    if (isSoftwareEngineerInternQuery(queryStr)) {
        if (matchesSoftwareEngineerInternRole(job.title) || matchesSoftwareEngineerInternRole(haystack)) {
            return true;
        }
    }
    if (isSoftwareEngineerFullTimeQuery(queryStr)) {
        if (matchesSoftwareEngineerFullTimeRole(job.title) || matchesSoftwareEngineerFullTimeRole(haystack)) {
            return true;
        }
    }
    const clauses = queryTerms(req.query || '');
    if (clauses.length === 0)
        return true;
    return clauses.some((terms) => {
        const matches = terms.filter((term) => haystack.includes(term)).length;
        if (['linkedin', 'naukri', 'naukari'].includes(job.source)) {
            return matches >= 1;
        }
        return matches >= Math.min(2, terms.length);
    });
}
export function filterJobsForRequest(input, req) {
    const normalized = normalizeJobs(input);
    const filtered = normalized.filter((job) => matchesScrapeRequest(job, req));
    if (req.advanceMode) {
        const scored = filtered.map((job) => {
            let score = 0;
            const haystack = `${job.title || ''} ${job.description || ''} ${(Array.isArray(job.skills) ? job.skills : []).join(' ')}`.toLowerCase();
            if (req.requiredSkills?.length) {
                const result = matchSkills(job.skills, req.requiredSkills, req.preferredSkills ?? []);
                score += result.score;
            }
            if (req.preferredSkills && !req.requiredSkills?.length) {
                const jobSkillsLower = job.skills.map((s) => s.toLowerCase());
                const matched = req.preferredSkills.filter((s) => jobSkillsLower.includes(s.toLowerCase()) ||
                    req.preferredSkills.some((p) => s.toLowerCase().includes(p.toLowerCase())));
                score += (matched.length / Math.max(1, req.preferredSkills.length)) * 30;
            }
            if (req.salaryMin !== undefined && job.salaryMin !== undefined) {
                score += Math.min(20, (job.salaryMin / req.salaryMin) * 20);
            }
            if (req.salaryMax !== undefined && job.salaryMax !== undefined) {
                score += Math.min(15, (job.salaryMax / req.salaryMax) * 15);
            }
            if (req.postedWithinHours) {
                const ageMs = Date.now() - Date.parse(job.postedAt);
                score += Math.max(0, 15 - ageMs / (req.postedWithinHours * 60 * 1000 / 15));
            }
            const seniorityLevels = seniorityFromRequest(req);
            if (seniorityLevels && matchesSeniority(job, seniorityLevels))
                score += 10;
            return { job, score };
        });
        const sortBy = req.sortBy ?? 'relevance';
        if (sortBy === 'salary') {
            scored.sort((a, b) => (b.job.salaryMax ?? 0) - (a.job.salaryMax ?? 0));
        }
        else if (sortBy === 'applicants') {
            scored.sort((a, b) => {
                const countA = a.job.applicantCount;
                const countB = b.job.applicantCount;
                const knownA = typeof countA === 'number' && Number.isFinite(countA) && countA >= 0;
                const knownB = typeof countB === 'number' && Number.isFinite(countB) && countB >= 0;
                if (knownA !== knownB)
                    return knownA ? -1 : 1;
                if (knownA && countA !== countB)
                    return countA - countB;
                const postedA = Date.parse(a.job.postedAt || '');
                const postedB = Date.parse(b.job.postedAt || '');
                const timestampA = Number.isFinite(postedA) ? postedA : Number.NEGATIVE_INFINITY;
                const timestampB = Number.isFinite(postedB) ? postedB : Number.NEGATIVE_INFINITY;
                if (timestampA === timestampB)
                    return 0;
                return timestampB > timestampA ? 1 : -1;
            });
        }
        else if (sortBy === 'newest') {
            scored.sort((a, b) => Date.parse(b.job.postedAt) - Date.parse(a.job.postedAt));
        }
        else {
            scored.sort((a, b) => b.score - a.score);
        }
        return scored.map((s) => s.job);
    }
    return filtered.sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
}

import { randomUUID } from 'node:crypto';
import { detectDomainFromQuery, matchesDomainJob, isSoftwareEngineerInternQuery, isSoftwareEngineerFullTimeQuery, matchesSoftwareEngineerInternRole, matchesSoftwareEngineerFullTimeRole, } from './RoleExpansionConfig.js';
export function normalizeJobs(input) {
    return input.map((j) => ({
        ...j,
        id: j.id || randomUUID(),
        fetchedAt: j.fetchedAt || new Date().toISOString(),
        skills: Array.isArray(j.skills) ? j.skills : [],
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
/** Uses only title, description and location supplied by the source; no inferred posting dates. */
export function matchesScrapeRequest(job, req) {
    if (req.remoteOnly && !job.remote)
        return false;
    if (req.internshipsOnly) {
        const isIntern = job.employmentType === 'internship' ||
            job.isInternship === true ||
            /\bintern(ship)?\b|\bco-?op\b/i.test(`${job.title} ${job.description}`);
        if (!isIntern)
            return false;
    }
    if (req.location?.trim() && !job.remote) {
        const wanted = req.location.toLowerCase().trim();
        // If the user wants anywhere/global, do not drop jobs based on strict location strings
        if (!/anywhere|global|worldwide/i.test(wanted)) {
            const jobLoc = job.location.toLowerCase();
            const isIndiaAlias = (wanted.includes('bangalore') && jobLoc.includes('bengaluru')) ||
                (wanted.includes('bengaluru') && jobLoc.includes('bangalore'));
            if (!jobLoc.includes(wanted) && !isIndiaAlias) {
                if (!['linkedin', 'naukari'].includes(job.source)) {
                    return false;
                }
            }
        }
    }
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
            // Preferred skills still apply when requiredSkills is empty — at least one should match
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
    const haystack = `${job.title} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
    // Role Expansion Bypass: Do not drop if job matches any role in the searched domain
    const queryStr = req.query || '';
    const detectedDomain = detectDomainFromQuery(queryStr);
    if (detectedDomain) {
        const isIntern = /\b(intern|internship|trainee|co-?op)\b/i.test(queryStr) || req.jobType === 'internship';
        if (matchesDomainJob(detectedDomain.domainId, job.title, isIntern) ||
            matchesDomainJob(detectedDomain.domainId, haystack, isIntern)) {
            return true;
        }
    }
    // Specialized check for Software Engineer Intern (20 roles) & Full Time (21 roles)
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
        // If it's from a major job board (LinkedIn, Naukri), we generally trust their internal relevancy algorithm.
        // We just want to make sure it's not complete junk. 1 matching keyword is enough.
        // Specially for "intern", if the user searched "intern" and the job has "intern", it's highly relevant even if "Software Engineer" became "SDE".
        if (['linkedin', 'naukari'].includes(job.source)) {
            return matches >= 1;
        }
        // For raw scrapers, use the stricter 2-word heuristic
        return matches >= Math.min(2, terms.length);
    });
}
export function filterJobsForRequest(input, req) {
    const normalized = normalizeJobs(input);
    const filtered = normalized.filter((job) => matchesScrapeRequest(job, req));
    if (req.advanceMode) {
        const scored = filtered.map((job) => {
            let score = 0;
            const haystack = `${job.title} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
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
            scored.sort((a, b) => (b.job.applicantCount ?? 0) - (a.job.applicantCount ?? 0));
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

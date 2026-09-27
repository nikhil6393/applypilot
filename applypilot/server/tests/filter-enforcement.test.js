import { describe, it, expect } from 'vitest';
// Filter verification helpers matching the production client/server predicates
function isJobWithinTimeWindow(postedAtIso, window, referenceNowMs = Date.now()) {
    if (!postedAtIso)
        return false;
    const postedMs = new Date(postedAtIso).getTime();
    if (isNaN(postedMs))
        return false;
    const diffMinutes = Math.max(0, Math.floor((referenceNowMs - postedMs) / 60000));
    switch (window) {
        case '1h':
            return diffMinutes <= 60;
        case '4h':
            return diffMinutes <= 240;
        case '12h':
            return diffMinutes <= 720;
        case '24h':
            return diffMinutes <= 1440;
        case '7d':
            return diffMinutes <= 10080;
        default:
            return true;
    }
}
function matchesInternshipFilter(title, employmentType) {
    const lowerTitle = title.toLowerCase();
    // Must reject senior / staff / lead postings
    if (/\b(senior|sr\.?|lead|staff|principal|manager|head of|director)\b/i.test(lowerTitle)) {
        return false;
    }
    return (employmentType === 'internship' ||
        /\b(intern|internship|co-?op|trainee|apprentice)\b/i.test(lowerTitle));
}
function matchesLowCompetitionFilter(applicantCount) {
    // Finding #2 & #3: applicant count can only be trusted if it is a genuine number
    return typeof applicantCount === 'number' && applicantCount >= 0 && applicantCount < 10;
}
function deduplicateJobs(jobs) {
    const map = new Map();
    for (const j of jobs) {
        const normUrl = (j.url || '').split('?')[0].trim().toLowerCase();
        const id = j.id ? String(j.id).trim() : '';
        const source = (j.source || 'unknown').toLowerCase();
        let key;
        if (id && !id.startsWith('job-') && !id.startsWith('live-') && id.length > 3) {
            key = `${source}:${id}`;
        }
        else if (normUrl && normUrl.length > 10) {
            key = `${source}:${normUrl}`;
        }
        else {
            key = `${source}:${j.title.toLowerCase()}:${j.company.toLowerCase()}`;
        }
        map.set(key, j);
    }
    return Array.from(map.values());
}
describe('Filter Enforcement & Accuracy Standards', () => {
    const now = new Date('2026-09-16T12:00:00.000Z').getTime();
    describe('Time Window Filters', () => {
        it('accurately includes postings within 1h and rejects older postings', () => {
            const job15m = new Date(now - 15 * 60 * 1000).toISOString();
            const job59m = new Date(now - 59 * 60 * 1000).toISOString();
            const job75m = new Date(now - 75 * 60 * 1000).toISOString();
            const job3h = new Date(now - 180 * 60 * 1000).toISOString();
            expect(isJobWithinTimeWindow(job15m, '1h', now)).toBe(true);
            expect(isJobWithinTimeWindow(job59m, '1h', now)).toBe(true);
            expect(isJobWithinTimeWindow(job75m, '1h', now)).toBe(false);
            expect(isJobWithinTimeWindow(job3h, '1h', now)).toBe(false);
        });
        it('accurately enforces 4h, 12h, and 24h boundaries', () => {
            const job3h = new Date(now - 180 * 60 * 1000).toISOString();
            const job5h = new Date(now - 300 * 60 * 1000).toISOString();
            const job18h = new Date(now - 18 * 3600 * 1000).toISOString();
            const job2d = new Date(now - 48 * 3600 * 1000).toISOString();
            expect(isJobWithinTimeWindow(job3h, '4h', now)).toBe(true);
            expect(isJobWithinTimeWindow(job5h, '4h', now)).toBe(false);
            expect(isJobWithinTimeWindow(job5h, '12h', now)).toBe(true);
            expect(isJobWithinTimeWindow(job18h, '12h', now)).toBe(false);
            expect(isJobWithinTimeWindow(job18h, '24h', now)).toBe(true);
            expect(isJobWithinTimeWindow(job2d, '24h', now)).toBe(false);
        });
    });
    describe('Job Type / Internship Filtering', () => {
        it('accepts valid intern/trainee/co-op positions', () => {
            expect(matchesInternshipFilter('Software Engineer Intern')).toBe(true);
            expect(matchesInternshipFilter('Full Stack Development Co-op')).toBe(true);
            expect(matchesInternshipFilter('Graduate Trainee - Technology')).toBe(true);
            expect(matchesInternshipFilter('Frontend Developer', 'internship')).toBe(true);
        });
        it('strictly rejects Senior, Lead, Principal, and Staff roles even if containing intern keywords', () => {
            expect(matchesInternshipFilter('Senior Software Engineer Intern Mentor')).toBe(false);
            expect(matchesInternshipFilter('Lead Architect (Former Intern program)')).toBe(false);
            expect(matchesInternshipFilter('Principal Engineer')).toBe(false);
            expect(matchesInternshipFilter('Senior Full Stack Developer')).toBe(false);
        });
    });
    describe('Low Competition (< 10 Applicants) Filter', () => {
        it('accepts verified applicant counts under 10', () => {
            expect(matchesLowCompetitionFilter(0)).toBe(true);
            expect(matchesLowCompetitionFilter(4)).toBe(true);
            expect(matchesLowCompetitionFilter(9)).toBe(true);
        });
        it('rejects applicant counts of 10 or more', () => {
            expect(matchesLowCompetitionFilter(10)).toBe(false);
            expect(matchesLowCompetitionFilter(85)).toBe(false);
        });
        it('rejects undefined, null, or unknown counts — NEVER defaults to low competition', () => {
            expect(matchesLowCompetitionFilter(undefined)).toBe(false);
            expect(matchesLowCompetitionFilter(null)).toBe(false);
        });
    });
    describe('Deduplication Across Scrapers and Streams', () => {
        it('deduplicates identical postings delivered via different streams', () => {
            const incoming = [
                {
                    id: 'li-12345',
                    source: 'linkedin',
                    title: 'SDE Intern',
                    company: 'Amazon',
                    url: 'https://www.linkedin.com/jobs/view/12345?refId=abc',
                },
                {
                    id: 'li-12345',
                    source: 'linkedin',
                    title: 'SDE Intern',
                    company: 'Amazon',
                    url: 'https://www.linkedin.com/jobs/view/12345?refId=xyz', // different query param
                },
                {
                    id: 'ashby-99',
                    source: 'ashby',
                    title: 'Backend Intern',
                    company: 'Ramp',
                    url: 'https://jobs.ashbyhq.com/ramp/99',
                },
            ];
            const deduped = deduplicateJobs(incoming);
            expect(deduped).toHaveLength(2);
            expect(deduped.map((j) => j.title)).toEqual(['SDE Intern', 'Backend Intern']);
        });
    });
});

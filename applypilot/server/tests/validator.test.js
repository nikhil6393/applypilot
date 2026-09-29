import { describe, it, expect } from 'vitest';
import { validateJobPosting, validateAndFilterJobs } from '../scrape/validator.js';
describe('Data Integrity Layer: validateJobPosting', () => {
    it('rejects dummy template URLs without real numeric IDs', () => {
        const dummy = {
            title: 'Software Engineer Intern',
            company: 'Zomato Engineering',
            source: 'naukari',
            url: 'https://www.naukri.com/job-listings-software-engineer-intern-zomato',
            applyUrl: 'https://www.naukri.com/job-listings-software-engineer-intern-zomato',
        };
        const res = validateJobPosting(dummy);
        expect(res.valid).toBe(false);
        expect(res.reason).toContain('dummy/placeholder');
    });
    it('rejects empty, invalid, or placeholder URLs', () => {
        expect(validateJobPosting({ title: 'Dev', company: 'Acme', source: 'linkedin', url: '' }).valid).toBe(false);
        expect(validateJobPosting({ title: 'Dev', company: 'Acme', source: 'linkedin', url: '#' }).valid).toBe(false);
        expect(validateJobPosting({ title: 'Dev', company: 'Acme', source: 'linkedin', url: 'not-a-url' })
            .valid).toBe(false);
    });
    it('rejects placeholder company and title names', () => {
        expect(validateJobPosting({
            title: 'See listing',
            company: 'Google',
            source: 'greenhouse',
            url: 'https://boards.greenhouse.io/google/jobs/123',
        }).valid).toBe(false);
        expect(validateJobPosting({
            title: 'Frontend Engineer',
            company: 'Tech Company',
            source: 'lever',
            url: 'https://jobs.lever.co/acme/123',
        }).valid).toBe(false);
    });
    it('accepts genuine verified job postings with valid fields', () => {
        const validRaw = {
            id: 'li_12345',
            title: 'Frontend Engineering Intern',
            company: 'Sprinklr',
            source: 'linkedin',
            url: 'https://in.linkedin.com/jobs/view/frontend-intern-at-sprinklr-4467992107',
            applyUrl: 'https://in.linkedin.com/jobs/view/frontend-intern-at-sprinklr-4467992107',
            location: 'Gurgaon, Haryana, India',
            postedAt: '2026-09-16T10:00:00.000Z',
            applicantCount: 14,
        };
        const res = validateJobPosting(validRaw);
        expect(res.valid).toBe(true);
        expect(res.job?.title).toBe('Frontend Engineering Intern');
        expect(res.job?.company).toBe('Sprinklr');
        expect(res.job?.applicantCount).toBe(14);
        expect(res.job?.employmentType).toBe('internship');
    });
    it('preserves undefined applicantCount when source does not expose it', () => {
        const rawNoApps = {
            title: 'Backend Software Intern',
            company: 'Postman',
            source: 'greenhouse',
            url: 'https://boards.greenhouse.io/postman/jobs/559281',
            applyUrl: 'https://boards.greenhouse.io/postman/jobs/559281',
        };
        const res = validateJobPosting(rawNoApps);
        expect(res.valid).toBe(true);
        expect(res.job?.applicantCount).toBeUndefined();
    });
    it('validateAndFilterJobs filters out invalid candidates and keeps verified ones', () => {
        const list = [
            {
                title: 'Fake',
                company: 'Zomato',
                source: 'naukari',
                url: 'https://www.naukri.com/job-listings-software-engineer-intern-zomato',
            },
            {
                title: 'Real SDE Intern',
                company: 'Amazon',
                source: 'linkedin',
                url: 'https://www.amazon.jobs/en/jobs/281928',
            },
        ];
        const filtered = validateAndFilterJobs(list);
        expect(filtered.length).toBe(1);
        expect(filtered[0].company).toBe('Amazon');
    });
});

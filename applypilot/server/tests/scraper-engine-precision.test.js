import { describe, it, expect } from 'vitest';
import { validateJobPosting, filterJobsByCriteria } from '../scrape/validator.js';
import { matchesScrapeRequest } from '../scrape/normalize.js';
import { extractIndianCitizenEligibility, extractVisaSponsorship } from '../scrape/metadata-extractor.js';
import { smartrecruiters, SMARTRECRUITERS_COMPANIES } from '../scrape/smartrecruiters.js';

describe('Scraper Engine Precision & Strict Anti-Hallucination Guardrails', () => {
    it('Rule 1.1: Never hallucinates or fabricates salary when missing from source', () => {
        const rawJob = {
            id: 'job-nosal-1',
            title: 'Backend Software Engineer',
            company: 'Stripe',
            location: 'Bengaluru, India',
            source: 'greenhouse',
            url: 'https://boards.greenhouse.io/stripe/jobs/12345',
            description: 'We are looking for a backend engineer proficient in Go and PostgreSQL.',
        };
        const res = validateJobPosting(rawJob);
        expect(res.valid).toBe(true);
        expect(res.job.salary).toBeUndefined();
        expect(res.job.salaryRange).toBeUndefined();
    });

    it('Rule 1.2: Does not falsely tag Onsite jobs as Remote merely because of boilerplate text', () => {
        const rawJob = {
            id: 'job-onsite-hq',
            title: 'Systems Software Engineer',
            company: 'Roblox',
            location: 'San Mateo, CA',
            source: 'greenhouse',
            url: 'https://boards.greenhouse.io/roblox/jobs/555',
            description: 'This is an in-office position located at our San Mateo HQ. We support flexible work arrangements but require on-site presence.',
        };
        const res = validateJobPosting(rawJob);
        expect(res.valid).toBe(true);
        expect(res.job.workplace).toBe('Onsite');
        expect(res.job.remote).toBe(false);

        // Filter test: must be dropped when candidate asks for Remote only
        const matchesRemote = matchesScrapeRequest(res.job, { remoteOnly: true });
        expect(matchesRemote).toBe(false);
    });

    it('Rule 1.3: Hard negative exclusion for enterprise visa rejection clauses (Roblox/Meta)', () => {
        const robloxClause = 'For US based roles only, please note the Company may not be able to employ candidates for this role who have United States work authorization related to certain U.S. visa categories, or support future H-1B sponsorship at this time.';
        const eligibility = extractIndianCitizenEligibility({
            title: 'Software Engineer',
            location: 'San Mateo, CA',
            text: robloxClause,
            remote: false,
        });

        expect(eligibility.allowed).toBe(false);
        expect(eligibility.status).toBe('restricted');
        expect(eligibility.badgeText).toContain('No Visa Sponsorship');

        // Test filtering when candidate requires Indian Citizen Eligibility
        const job = {
            id: 'roblox-job',
            title: 'Software Engineer',
            indianCitizenEligibility: eligibility,
            remote: false,
            source: 'greenhouse',
        };
        const passes = matchesScrapeRequest(job, { requireIndianEligibility: true });
        expect(passes).toBe(false);
    });

    it('Rule 2.1: Semantic role matching rejects non-tech noise from software searches', () => {
        const salesJob = {
            id: 'sales-1',
            title: 'Account Executive - Enterprise Software',
            description: 'Sell cloud software solutions to enterprise clients.',
            source: 'linkedin',
            skills: ['Sales', 'CRM'],
            remote: true,
            workplace: 'Remote',
        };
        const req = { query: 'Software Engineer' };
        expect(matchesScrapeRequest(salesJob, req)).toBe(false);

        const hrJob = {
            id: 'hr-1',
            title: 'Technical Recruiter - Engineering',
            description: 'Recruit software engineers for high-growth tech teams.',
            source: 'linkedin',
            skills: ['Sourcing', 'Interviewing'],
            remote: true,
            workplace: 'Remote',
        };
        expect(matchesScrapeRequest(hrJob, req)).toBe(false);
    });

    it('Rule 2.2: Strict Seniority Isolation: Intern searches reject Senior/Lead positions', () => {
        const seniorJob = {
            id: 'senior-1',
            title: 'Senior Software Engineer / Tech Lead',
            description: 'Lead architecture for distributed systems. Minimum 6+ years experience.',
            source: 'greenhouse',
            remote: true,
            workplace: 'Remote',
            skills: ['Go', 'Kubernetes'],
        };
        const internReq = { query: 'Software Engineer Intern', internshipsOnly: true };
        expect(matchesScrapeRequest(seniorJob, internReq)).toBe(false);
    });

    it('SmartRecruiters platform integration is configured with verified company directories', () => {
        expect(SMARTRECRUITERS_COMPANIES.length).toBeGreaterThan(5);
        expect(SMARTRECRUITERS_COMPANIES.some(c => c.id === 'BoschGroup')).toBe(true);
        expect(SMARTRECRUITERS_COMPANIES.some(c => c.id === 'visa')).toBe(true);
    });
});

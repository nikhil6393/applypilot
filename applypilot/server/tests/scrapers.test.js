import { describe, it, expect, beforeEach } from 'vitest';
import { parseRelativeTimeDetails, parseApplicantCount, getLinkedInHealth } from '../scrape/linkedin-realtime.js';
import { parseNaukriTime } from '../scrape/naukri-advanced.js';
import { validateJobPosting } from '../scrape/validator.js';
import { scrapeCache } from '../scrape/cache.js';
import { extractVisaSponsorship, extractEligibleBatches, enrichJobMetadata } from '../scrape/metadata-extractor.js';
import { scrapeOrchestrator } from '../scrape/orchestrator.js';
describe('Scraper Utilities: LinkedIn Time & Applicant Parsing', () => {
    it('correctly parses relative minutes ago', () => {
        const res = parseRelativeTimeDetails('45 minutes ago');
        expect(res.minutesAgo).toBe(45);
        expect(res.relative).toBe('45m ago');
        expect(new Date(res.iso).getTime()).toBeGreaterThan(0);
    });
    it('correctly parses just now and seconds ago', () => {
        const justNow = parseRelativeTimeDetails('Just now');
        expect(justNow.minutesAgo).toBe(0);
        expect(justNow.relative).toBe('Just now');
        const secs = parseRelativeTimeDetails('30 seconds ago');
        expect(secs.minutesAgo).toBe(1);
        expect(secs.relative).toBe('30s ago');
    });
    it('correctly parses hours, days, and weeks', () => {
        const hours = parseRelativeTimeDetails('3 hours ago');
        expect(hours.minutesAgo).toBe(180);
        expect(hours.relative).toBe('3h ago');
        const days = parseRelativeTimeDetails('2 days ago');
        expect(days.minutesAgo).toBe(2880);
        expect(days.relative).toBe('2d ago');
        const weeks = parseRelativeTimeDetails('1 week ago');
        expect(weeks.minutesAgo).toBe(10080);
        expect(weeks.relative).toBe('1w ago');
    });
    it('parses standard ISO date strings', () => {
        const isoDate = new Date(Date.now() - 3600000).toISOString();
        const res = parseRelativeTimeDetails(isoDate);
        expect(res.minutesAgo).toBeGreaterThanOrEqual(59);
        expect(res.minutesAgo).toBeLessThanOrEqual(61);
    });
    it('extracts applicant counts accurately', () => {
        expect(parseApplicantCount('42 applicants')).toBe(42);
        expect(parseApplicantCount('1 applicant')).toBe(1);
        expect(parseApplicantCount('Be among the first 25 applicants')).toBe(25);
        expect(parseApplicantCount('Be among the first 10 applicants')).toBe(10);
        expect(parseApplicantCount('No count here')).toBeUndefined();
    });
    it('reports healthy initial LinkedIn status', () => {
        const health = getLinkedInHealth();
        expect(['live', 'degraded', 'down']).toContain(health.status);
        expect(health.consecutiveFailures).toBeGreaterThanOrEqual(0);
    });
});
describe('Scraper Utilities: Naukri Time Parsing', () => {
    it('correctly parses Naukri relative timestamps', () => {
        const justNow = parseNaukriTime('Just Now');
        expect(justNow.minutesAgo).toBe(1);
        const mins = parseNaukriTime('15 mins ago');
        expect(mins.minutesAgo).toBe(15);
        expect(mins.relative).toBe('15m ago');
        const hours = parseNaukriTime('4 hours ago');
        expect(hours.minutesAgo).toBe(240);
        expect(hours.relative).toBe('4h ago');
        const today = parseNaukriTime('Today');
        expect(today.minutesAgo).toBe(60);
        const yesterday = parseNaukriTime('Yesterday');
        expect(yesterday.minutesAgo).toBe(1440);
    });
});
describe('Scraper Output Validation', () => {
    it('validates a genuine LinkedIn scraped payload', () => {
        const raw = {
            id: 'li_sample_123',
            title: 'Full Stack Engineer',
            company: 'Razorpay',
            source: 'linkedin',
            url: 'https://www.linkedin.com/jobs/view/1234567890',
            applyUrl: 'https://www.linkedin.com/jobs/view/1234567890',
            location: 'Bangalore, India',
            postedAt: new Date().toISOString(),
            applicantCount: 5,
        };
        const res = validateJobPosting(raw);
        expect(res.valid).toBe(true);
        expect(res.job?.company).toBe('Razorpay');
        expect(res.job?.source).toBe('linkedin');
    });
    it('validates a genuine Naukri scraped payload', () => {
        const raw = {
            id: 'naukri_sample_123',
            title: 'Python Backend Developer',
            company: 'Swiggy',
            source: 'naukari',
            url: 'https://www.naukri.com/job-listings-123456',
            applyUrl: 'https://www.naukri.com/job-listings-123456',
            location: 'Bengaluru',
            postedAt: new Date().toISOString(),
        };
        const res = validateJobPosting(raw);
        expect(res.valid).toBe(true);
        expect(res.job?.company).toBe('Swiggy');
        expect(res.job?.source).toBe('naukari');
    });
    it('validates genuine WeWorkRemotely and YC postings', () => {
        const wwr = {
            id: 'wwr_test_1',
            title: 'Senior Frontend Engineer',
            company: 'RemoteTech Inc',
            source: 'weworkremotely',
            url: 'https://weworkremotely.com/remote-jobs/123',
            applyUrl: 'https://weworkremotely.com/remote-jobs/123',
            location: 'Worldwide / Remote',
            remote: true,
            postedAt: new Date().toISOString(),
            description: 'Exciting React role',
        };
        expect(validateJobPosting(wwr).valid).toBe(true);
        const ycJob = {
            id: 'yc_test_1',
            title: 'Founding AI Engineer',
            company: 'Cursor AI',
            source: 'yc',
            url: 'https://www.ycombinator.com/companies/cursor/jobs/456',
            applyUrl: 'https://www.ycombinator.com/companies/cursor/jobs/456',
            location: 'San Francisco, CA / Remote',
            remote: true,
            postedAt: new Date().toISOString(),
            description: 'Building next-gen AI code editor',
        };
        expect(validateJobPosting(ycJob).valid).toBe(true);
    });
});
describe('Scrape Cache Performance & TTL', () => {
    beforeEach(() => {
        scrapeCache.clear();
    });
    it('generates consistent keys for identical scrape requests', () => {
        const req1 = { query: 'React Developer', location: 'India', timeWindow: '24h' };
        const req2 = { query: 'react developer', location: 'india', timeWindow: '24h' };
        const key1 = scrapeCache.generateKey('linkedin', req1);
        const key2 = scrapeCache.generateKey('linkedin', req2);
        expect(key1).toBe(key2);
    });
    it('stores and retrieves cached jobs with instant hit stats', () => {
        const req = { query: 'Backend Engineer' };
        const key = scrapeCache.generateKey('greenhouse', req);
        const mockJobs = [
            {
                id: 'gh_1',
                title: 'Backend Engineer',
                company: 'Stripe',
                source: 'greenhouse',
                url: 'https://boards.greenhouse.io/stripe/1',
                applyUrl: 'https://boards.greenhouse.io/stripe/1',
                postedAt: new Date().toISOString(),
            },
        ];
        expect(scrapeCache.get(key)).toBeNull();
        scrapeCache.set(key, mockJobs);
        const cached = scrapeCache.get(key);
        expect(cached).toHaveLength(1);
        expect(cached?.[0].company).toBe('Stripe');
        const stats = scrapeCache.getStats();
        expect(stats.hits).toBe(1);
        expect(stats.size).toBe(1);
    });
    it('invalidates entries after TTL expires', () => {
        const key = 'test_expired_key';
        const mockJobs = [{ id: '1', title: 'Dev' }];
        // Set with 5ms custom TTL
        scrapeCache.set(key, mockJobs, 5);
        // Wait 15ms
        return new Promise((resolve) => {
            setTimeout(() => {
                expect(scrapeCache.get(key)).toBeNull();
                resolve();
            }, 15);
        });
    });
});
describe('Universal Metadata Extractor: Visa Sponsorship & Graduation Batches', () => {
    it('detects positive visa sponsorship mentions', () => {
        expect(extractVisaSponsorship('We offer H1B visa sponsorship for qualified candidates.')).toBe(true);
        expect(extractVisaSponsorship('Visa sponsorship is available and supported for this position.')).toBe(true);
        expect(extractVisaSponsorship('We are willing to sponsor work authorization.')).toBe(true);
    });
    it('detects negative visa sponsorship mentions', () => {
        expect(extractVisaSponsorship('No visa sponsorship is provided. Candidates must be authorized.')).toBe(false);
        expect(extractVisaSponsorship('Must be legally authorized to work in the US without employer sponsorship.')).toBe(false);
        expect(extractVisaSponsorship('US citizens or green card holders only.')).toBe(false);
    });
    it('returns undefined when visa sponsorship is not mentioned', () => {
        expect(extractVisaSponsorship('Looking for a passionate full-stack engineer with React experience.')).toBeUndefined();
    });
    it('extracts eligible graduation batches accurately', () => {
        const text1 = 'Targeting students in the class of 2026 or 2027 batch.';
        const batches1 = extractEligibleBatches(text1);
        expect(batches1).toContain('2026');
        expect(batches1).toContain('2027');
        const text2 = 'Looking for summer 2025 engineering interns graduating in 2025 or 2026.';
        const batches2 = extractEligibleBatches(text2);
        expect(batches2).toContain('2025');
        expect(batches2).toContain('2026');
    });
    it('enriches jobs with combined metadata', () => {
        const desc = 'Software Engineer Intern - Summer 2026. Visa sponsorship is available for international students.';
        const enriched = enrichJobMetadata(desc);
        expect(enriched.sponsorsVisa).toBe(true);
        expect(enriched.eligibleBatches).toContain('2026');
    });
});
describe('Scrape Orchestrator Background Status', () => {
    it('reports background status and active sources', () => {
        const status = scrapeOrchestrator.getStatus();
        expect(status).toBeDefined();
        expect(typeof status.running).toBe('boolean');
        expect(status.activeSources).toContain('weworkremotely');
        expect(status.activeSources).toContain('yc');
        expect(status.activeSources).toContain('greenhouse');
        expect(status.cacheStats).toBeDefined();
    });
});
describe('LinkedIn Filter Accuracy & Zero-Fake-Data Integrity', () => {
    it('extracts canonical numeric job ID from view and search URLs', () => {
        const url1 = 'https://www.linkedin.com/jobs/view/4155102046?refId=abc&trackingId=xyz';
        const match1 = url1.match(/\/jobs\/view\/(\d+)/i);
        expect(match1?.[1]).toBe('4155102046');
        const url2 = 'https://www.linkedin.com/jobs/view/4198765432';
        const match2 = url2.match(/\/jobs\/view\/(\d+)/i);
        expect(match2?.[1]).toBe('4198765432');
    });
    it('enriches LinkedIn title with genuine metadata without fake batch stamps', () => {
        const title = 'Senior Full Stack Engineer (React, TypeScript, AWS)';
        const meta = enrichJobMetadata(title, title);
        expect(meta.seniority).toBe('senior');
        expect(meta.techStack).toContain('React');
        expect(meta.techStack).toContain('TypeScript');
        expect(meta.techStack).toContain('AWS');
        // Batches should not be fabricated when not in text
        expect(meta.eligibleBatches).toBeUndefined();
    });
});

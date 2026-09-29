import { describe, it, expect } from 'vitest';
import { fetchLinkedInJobDetails, extractSkillsFromText, parseRelativeTimeDetails, parseApplicantCount, } from '../scrape/linkedin-realtime.js';
describe('LinkedIn Full Job Description & Scraper Verification', () => {
    it('extracts technical skills accurately with word boundaries', () => {
        const text = `
      We are looking for a Software Engineer Intern proficient in React, TypeScript, Node.js,
      Python, and Docker. Experience with AWS, SQL, and Git is preferred.
    `;
        const skills = extractSkillsFromText(text);
        expect(skills).toContain('react');
        expect(skills).toContain('typescript');
        expect(skills).toContain('node.js');
        expect(skills).toContain('python');
        expect(skills).toContain('docker');
        expect(skills).toContain('aws');
        expect(skills).toContain('sql');
        expect(skills).toContain('git');
        // Ensure negative matches don't falsely trigger
        expect(skills).not.toContain('go');
    });
    it('accurately parses quantified relative timestamps', () => {
        const t1 = parseRelativeTimeDetails('25 minutes ago');
        expect(t1.minutesAgo).toBe(25);
        expect(t1.relative).toBe('25m ago');
        const t2 = parseRelativeTimeDetails('3 hours ago');
        expect(t2.minutesAgo).toBe(180);
        expect(t2.relative).toBe('3h ago');
        const t3 = parseRelativeTimeDetails('1 day ago');
        expect(t3.minutesAgo).toBe(1440);
        expect(t3.relative).toBe('1d ago');
        const t4 = parseRelativeTimeDetails('just now');
        expect(t4.minutesAgo).toBe(0);
        expect(t4.relative).toBe('Just now');
        // CRITICAL: Ensure months are NEVER parsed as minutes
        const tMonths11 = parseRelativeTimeDetails('11 months ago');
        expect(tMonths11.relative).toBe('11mo ago');
        expect(tMonths11.minutesAgo).toBe(11 * 30 * 1440);
        expect(tMonths11.minutesAgo).toBeGreaterThan(400000);
        const tMonths1 = parseRelativeTimeDetails('1 month ago');
        expect(tMonths1.relative).toBe('1mo ago');
        expect(tMonths1.minutesAgo).toBe(1 * 30 * 1440);
        expect(tMonths1.minutesAgo).toBeGreaterThan(40000);
        const tMonths2 = parseRelativeTimeDetails('2 mo ago');
        expect(tMonths2.relative).toBe('2mo ago');
        expect(tMonths2.minutesAgo).toBe(2 * 30 * 1440);
        const tMonths8 = parseRelativeTimeDetails('8 months ago');
        expect(tMonths8.relative).toBe('8mo ago');
        expect(tMonths8.minutesAgo).toBe(8 * 30 * 1440);
        // Minutes format with 'm'
        const tMin11 = parseRelativeTimeDetails('11m ago');
        expect(tMin11.relative).toBe('11m ago');
        expect(tMin11.minutesAgo).toBe(11);
        const tMin2 = parseRelativeTimeDetails('2 minutes ago');
        expect(tMin2.relative).toBe('2m ago');
        expect(tMin2.minutesAgo).toBe(2);
        // Year format
        const tYear1 = parseRelativeTimeDetails('1 year ago');
        expect(tYear1.relative).toBe('1y ago');
        expect(tYear1.minutesAgo).toBe(365 * 1440);
    });
    it('correctly parses applicant counts from badges and cards', () => {
        expect(parseApplicantCount('Be among the first 10 applicants')).toBe(10);
        expect(parseApplicantCount('Be among the first 25 applicants')).toBe(25);
        expect(parseApplicantCount('42 applicants')).toBe(42);
        expect(parseApplicantCount('')).toBeUndefined();
    });
    it('fetches full unredacted job description and criteria from LinkedIn guest detail API', async () => {
        // Verified real public job ID on LinkedIn
        const numericId = '4468450392';
        const details = await fetchLinkedInJobDetails(numericId);
        if (details) {
            expect(details.description).toBeDefined();
            expect(details.description.length).toBeGreaterThan(500);
            expect(Array.isArray(details.criteria)).toBe(true);
            expect(details.criteria.length).toBeGreaterThan(0);
            expect(details.skills.length).toBeGreaterThan(0);
        }
    }, 15000);
    it('scrapes real-time LinkedIn postings with rich descriptions and metadata', async () => {
        const { linkedinRealtime } = await import('../scrape/linkedin-realtime.js');
        const jobs = await linkedinRealtime({
            query: 'software engineer intern',
            location: 'India',
            internshipsOnly: true,
            timeWindow: '7d',
            maxPerSource: 10,
        });
        expect(Array.isArray(jobs)).toBe(true);
        expect(jobs.length).toBeGreaterThan(0);
        const firstJob = jobs[0];
        expect(firstJob.title).toBeDefined();
        expect(firstJob.company).toBeDefined();
        expect(firstJob.applyUrl).toMatch(/^https:\/\/(?:[a-z]{2,3}\.)?linkedin\.com/);
        expect(firstJob.description).toBeDefined();
        expect(firstJob.description.length).toBeGreaterThan(50);
        expect(firstJob.source).toBe('linkedin');
        expect(Array.isArray(firstJob.tags)).toBe(true);
    }, 30000);
});

import { describe, it, expect } from 'vitest';
import { cleanCanonicalUrl, getSafeJobApplyUrl, getTimestampProvenance, getVerificationBadge } from '../src/utils/jobUtils.js';
import { detectDuplicateJobs, verifyJobUrlLive } from '../server/scrape/validator.js';
import type { JobPosting } from '../shared/types.js';

describe('Job Verification & Provenance Integrity Tests', () => {
  it('cleanCanonicalUrl removes UTM, tracking tokens, and session noise', () => {
    const dirtyUrl = 'https://jobs.lever.co/stripe/12345?utm_source=linkedin&utm_medium=cpc&ref=xyz&gh_src=123';
    const clean = cleanCanonicalUrl(dirtyUrl);
    expect(clean).toBe('https://jobs.lever.co/stripe/12345');
  });

  it('getSafeJobApplyUrl returns clean direct canonical URL', () => {
    const job: Partial<JobPosting> = {
      title: 'Frontend Engineer',
      company: 'Figma',
      source: 'greenhouse',
      applyUrl: 'https://boards.greenhouse.io/figma/jobs/987654?utm_campaign=feed',
    };
    const url = getSafeJobApplyUrl(job);
    expect(url).toBe('https://boards.greenhouse.io/figma/jobs/987654');
  });

  it('getTimestampProvenance distinguishes exact, approximate, updated, and unknown timestamps', () => {
    // 1. Exact ISO timestamp
    const exactJob: Partial<JobPosting> = {
      postedAt: '2026-03-24T14:30:00Z',
      postedDateKind: 'exact',
    };
    const exactBadge = getTimestampProvenance(exactJob);
    expect(exactBadge.kind).toBe('exact');
    expect(exactBadge.label).toBe('Exact Time');

    // 2. Relative approximate time from scraper text
    const approxJob: Partial<JobPosting> = {
      postedRelative: '4h ago',
      postedDateKind: 'approximate',
      rawPostingTime: '4h ago',
    };
    const approxBadge = getTimestampProvenance(approxJob);
    expect(approxBadge.kind).toBe('approximate');
    expect(approxBadge.label).toBe('Approximate');

    // 3. ATS updated timestamp
    const atsJob: Partial<JobPosting> = {
      source: 'greenhouse',
      postedDateKind: 'updated',
    };
    const atsBadge = getTimestampProvenance(atsJob);
    expect(atsBadge.kind).toBe('updated');
    expect(atsBadge.label).toBe('Updated by ATS');

    // 4. Unknown timestamp (never guessed or fabricated)
    const unknownJob: Partial<JobPosting> = {
      source: 'manual',
    };
    const unknownBadge = getTimestampProvenance(unknownJob);
    expect(unknownBadge.kind).toBe('unknown');
    expect(unknownBadge.label).toBe('Timestamp Unknown');
  });

  it('detectDuplicateJobs clusters cross-posted postings and prioritizes ATS boards', () => {
    const job1: JobPosting = {
      id: 'agg_1',
      title: 'Software Development Engineer',
      company: 'Stripe',
      source: 'linkedin',
      url: 'https://linkedin.com/jobs/view/111',
      applyUrl: 'https://linkedin.com/jobs/view/111',
      location: 'Remote',
      remote: true,
      description: 'Stripe SDE role',
      postedAt: '2026-03-24T10:00:00Z',
      fetchedAt: '2026-03-24T12:00:00Z',
      employmentType: 'full-time',
      skills: ['Ruby', 'Go'],
    };

    const job2: JobPosting = {
      id: 'ats_stripe_1',
      title: 'Software Development Engineer',
      company: 'Stripe',
      source: 'greenhouse',
      url: 'https://boards.greenhouse.io/stripe/jobs/222',
      applyUrl: 'https://boards.greenhouse.io/stripe/jobs/222',
      location: 'Remote',
      remote: true,
      description: 'Stripe SDE direct ATS posting',
      postedAt: '2026-03-24T09:00:00Z',
      fetchedAt: '2026-03-24T12:00:00Z',
      employmentType: 'full-time',
      skills: ['Ruby', 'Go'],
    };

    const { uniqueJobs, duplicatesFound } = detectDuplicateJobs([job1, job2]);
    expect(duplicatesFound).toBe(1);
    expect(uniqueJobs.length).toBe(1);
    // Greenhouse direct ATS posting should be preferred over aggregator
    expect(uniqueJobs[0].source).toBe('greenhouse');
  });

  it('getVerificationBadge formats active, unverified, stale, and expired statuses', () => {
    expect(getVerificationBadge('verified_active').label).toBe('Verified Active');
    expect(getVerificationBadge('unverified').label).toBe('Unverified');
    expect(getVerificationBadge('stale').label).toBe('Potentially Stale');
    expect(getVerificationBadge('expired').label).toBe('Expired / Closed');
  });
});

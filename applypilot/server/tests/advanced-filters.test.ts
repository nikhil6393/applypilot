import { describe, it, expect } from 'vitest';
import {
  matchesScrapeRequest,
  filterJobsForRequest,
  extractSeniority,
  extractBenefits,
  extractExperienceYears,
  extractSalary,
  matchSkills,
  matchesSeniority,
  matchesBenefits,
  matchesSalary,
} from '../scrape/normalize.js';
import type { JobPosting, ScrapeRequest } from '../../shared/types.js';

function makeJob(overrides: Partial<JobPosting>): JobPosting {
  return {
    id: 'test-job',
    title: 'Senior Software Engineer',
    company: 'TestCorp',
    source: 'naukari',
    url: 'https://example.com/job/1',
    applyUrl: 'https://example.com/apply',
    location: 'Bangalore, India',
    remote: true,
    description:
      'We need a senior developer with 5+ years experience. Benefits include health insurance, dental, and 401k. Looking for Java, Python skills.',
    postedAt: '2026-09-16T12:00:00.000Z',
    applicantCount: 15,
    employmentType: 'full-time',
    skills: ['Java', 'Python', 'Spring', 'SQL'],
    ...overrides,
  };
}

describe('Advanced Filters — matchesScrapeRequest', () => {
  it('passes through basic filters unchanged', () => {
    const job = makeJob({ remote: true });
    const req: ScrapeRequest = { remoteOnly: true };
    expect(matchesScrapeRequest(job, req)).toBe(true);
  });

  it('excludeKeywords rejects jobs containing forbidden terms', () => {
    const job = makeJob({ title: 'Senior Java Developer', description: 'Looking for a Java expert' });
    const req: ScrapeRequest = { advanceMode: true, excludeKeywords: ['Java', 'Python'] };
    expect(matchesScrapeRequest(job, req)).toBe(false);
  });

  it('excludeKeywords is case-insensitive', () => {
    const job = makeJob({ description: 'This job requires JAVA experience' });
    const req: ScrapeRequest = { advanceMode: true, excludeKeywords: ['java'] };
    expect(matchesScrapeRequest(job, req)).toBe(false);
  });

  it('excludeKeywords only applies in advanceMode', () => {
    const job = makeJob({ description: 'This job requires Java experience' });
    const req: ScrapeRequest = { excludeKeywords: ['java'] };
    expect(matchesScrapeRequest(job, req)).toBe(true);
  });

  it('requiredSkills rejects when no required skills match', () => {
    const job = makeJob({ skills: ['Go', 'Rust'] });
    const req: ScrapeRequest = { advanceMode: true, requiredSkills: ['Java', 'Python'] };
    expect(matchesScrapeRequest(job, req)).toBe(false);
  });

  it('requiredSkills accepts when all required skills present', () => {
    const job = makeJob({ skills: ['Java', 'Python', 'Go'] });
    const req: ScrapeRequest = { advanceMode: true, requiredSkills: ['Java', 'Python'] };
    expect(matchesScrapeRequest(job, req)).toBe(true);
  });

  it('preferredSkills alone still requires at least one match', () => {
    const job = makeJob({ skills: ['Go', 'Rust'] });
    const req: ScrapeRequest = { advanceMode: true, preferredSkills: ['Java', 'Python'] };
    expect(matchesScrapeRequest(job, req)).toBe(false);
  });

  it('preferredSkills passes when at least one preferred skill matches', () => {
    const job = makeJob({ skills: ['Java', 'Go'] });
    const req: ScrapeRequest = { advanceMode: true, preferredSkills: ['Java', 'Python'] };
    expect(matchesScrapeRequest(job, req)).toBe(true);
  });

  it('seniorityLevels rejects non-matching seniority', () => {
    const job = makeJob({ title: 'Junior Developer', description: 'Entry level position' });
    const req: ScrapeRequest = { advanceMode: true, seniorityLevels: ['senior', 'principal'] };
    expect(matchesScrapeRequest(job, req)).toBe(false);
  });

  it('seniorityLevels accepts matching seniority', () => {
    const job = makeJob({ title: 'Senior Developer', description: 'Lead engineer role' });
    const req: ScrapeRequest = { advanceMode: true, seniorityLevels: ['senior', 'principal'] };
    expect(matchesScrapeRequest(job, req)).toBe(true);
  });

  it('salaryMin rejects jobs below minimum salary', () => {
    const job = makeJob({ salaryMin: 50000, salaryMax: 80000 });
    const req: ScrapeRequest = { advanceMode: true, salaryMin: 70000 };
    expect(matchesScrapeRequest(job, req)).toBe(false);
  });

  it('salaryMax rejects jobs above maximum salary', () => {
    const job = makeJob({ salaryMin: 50000, salaryMax: 120000 });
    const req: ScrapeRequest = { advanceMode: true, salaryMax: 100000 };
    expect(matchesScrapeRequest(job, req)).toBe(false);
  });

  it('salary range accepts jobs within range', () => {
    const job = makeJob({ salaryMin: 60000, salaryMax: 90000 });
    const req: ScrapeRequest = { advanceMode: true, salaryMin: 50000, salaryMax: 100000 };
    expect(matchesScrapeRequest(job, req)).toBe(true);
  });

  it('benefits rejects when required benefits missing', () => {
    const job = makeJob({ description: 'Health insurance only, no dental' });
    const req: ScrapeRequest = { advanceMode: true, benefits: ['health insurance', 'dental'] };
    expect(matchesScrapeRequest(job, req)).toBe(false);
  });

  it('benefits accepts when all benefits present', () => {
    const job = makeJob({ description: 'Health insurance and dental coverage included' });
    const req: ScrapeRequest = { advanceMode: true, benefits: ['health insurance', 'dental'] };
    expect(matchesScrapeRequest(job, req)).toBe(true);
  });

  it('minExperienceYears rejects jobs with less experience', () => {
    const job = makeJob({ description: 'Only 2 years of experience needed for this role' });
    const req: ScrapeRequest = { advanceMode: true, minExperienceYears: 5 };
    expect(matchesScrapeRequest(job, req)).toBe(false);
  });

  it('maxExperienceYears rejects jobs requiring more experience', () => {
    const job = makeJob({ description: '10+ years of experience required for this senior role' });
    const req: ScrapeRequest = { advanceMode: true, maxExperienceYears: 5 };
    expect(matchesScrapeRequest(job, req)).toBe(false);
  });

  it('no advanced filters defaults to basic matching', () => {
    const job = makeJob({});
    const req: ScrapeRequest = {};
    expect(matchesScrapeRequest(job, req)).toBe(true);
  });
});

describe('Advanced Filters — filterJobsForRequest', () => {
  it('sorts by relevance in advanceMode when sortBy defaults', () => {
    const jobs = [
      makeJob({ id: '1', title: 'Senior Java Developer', skills: ['Java'] }),
      makeJob({ id: '2', title: 'Senior Python Developer', skills: ['Python'] }),
    ];
    const req: ScrapeRequest = {
      advanceMode: true,
      requiredSkills: ['Java', 'Python'],
      sortBy: 'relevance',
    };
    const result = filterJobsForRequest(jobs, req);
    // Both match both skills, so order should be preserved (same score)
    expect(result.map((j) => j.id)).toEqual(['1', '2']);
  });

  it('sorts by salary descending when sortBy is salary', () => {
    const jobs = [
      makeJob({ id: '1', salaryMin: 50000, salaryMax: 80000 }),
      makeJob({ id: '2', salaryMin: 90000, salaryMax: 120000 }),
    ];
    const req: ScrapeRequest = { advanceMode: true, sortBy: 'salary' };
    const result = filterJobsForRequest(jobs, req);
    expect(result[0].salaryMax).toBeGreaterThan(result[1].salaryMax);
  });

  it('sorts by applicants descending when sortBy is applicants', () => {
    const jobs = [
      makeJob({ id: '1', applicantCount: 5 }),
      makeJob({ id: '2', applicantCount: 100 }),
    ];
    const req: ScrapeRequest = { advanceMode: true, sortBy: 'applicants' };
    const result = filterJobsForRequest(jobs, req);
    expect(result[0].applicantCount).toBeGreaterThan(result[1].applicantCount);
  });

  it('sorts by newest when sortBy is newest', () => {
    const older = new Date('2026-09-01T12:00:00.000Z').toISOString();
    const newer = new Date('2026-09-15T12:00:00.000Z').toISOString();
    const jobs = [
      makeJob({ id: '1', postedAt: older }),
      makeJob({ id: '2', postedAt: newer }),
    ];
    const req: ScrapeRequest = { advanceMode: true, sortBy: 'newest' };
    const result = filterJobsForRequest(jobs, req);
    expect(result[0].postedAt).toBe(newer);
  });
});

describe('Helper functions', () => {
  describe('extractSeniority', () => {
    it('detects senior/lead/principal', () => {
      expect(extractSeniority('Senior Engineer', '')).toBe('senior');
      expect(extractSeniority('Lead Developer', '')).toBe('senior');
      expect(extractSeniority('Principal Architect', '')).toBe('principal');
    });
    it('detects mid-level', () => {
      expect(extractSeniority('Software Engineer II', '')).toBe('mid');
    });
    it('detects entry', () => {
      expect(extractSeniority('Junior Developer', '')).toBe('entry');
      expect(extractSeniority('Intern', '')).toBe('entry');
    });
    it('returns undefined for unknown', () => {
      expect(extractSeniority('Something Random', '')).toBeUndefined();
    });
  });

  describe('extractBenefits', () => {
    it('finds health, dental, vision', () => {
      const benefits = extractBenefits('We offer health insurance and dental coverage');
      expect(benefits).toContain('health insurance');
      expect(benefits).toContain('dental');
    });
  });

  describe('extractExperienceYears', () => {
    it('extracts years from description', () => {
      expect(extractExperienceYears('5+ years of experience required')).toBe(5);
      expect(extractExperienceYears('2 years of experience')).toBe(2);
    });
    it('returns 0 when no years found', () => {
      expect(extractExperienceYears('No experience mentioned')).toBe(0);
    });
  });

  describe('extractSalary', () => {
    it('fetches salary range from description', () => {
      const result = extractSalary('Salary: $80,000 - $120,000 per year');
      expect(result.min).toBe(80000);
      expect(result.max).toBe(120000);
    });
  });

  describe('matchSkills', () => {
    it('finds exact matches', () => {
      const result = matchSkills(['Java', 'Python'], ['Java']);
      expect(result.requiredMatch).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });
    it('reports false when required skill missing', () => {
      const result = matchSkills(['Go'], ['Java']);
      expect(result.requiredMatch).toBe(false);
    });
  });

  describe('matchesSeniority', () => {
    it('returns true when job seniority matches requested', () => {
      const job = makeJob({ title: 'Senior Engineer' });
      expect(matchesSeniority(job, ['senior', 'principal'])).toBe(true);
    });
    it('returns false for non-matching', () => {
      const job = makeJob({ title: 'Junior Developer' });
      expect(matchesSeniority(job, ['senior', 'principal'])).toBe(false);
    });
  });

  describe('matchesBenefits', () => {
    it('returns true when all benefits found', () => {
      const job = makeJob({ description: 'health insurance and dental available' });
      expect(matchesBenefits(job, ['health insurance', 'dental'])).toBe(true);
    });
    it('returns false when benefits missing', () => {
      const job = makeJob({ description: 'only basic benefits' });
      expect(matchesBenefits(job, ['health insurance', 'dental'])).toBe(false);
    });
  });

  describe('matchesSalary', () => {
    it('passes with no constraints', () => {
      const job = makeJob({});
      expect(matchesSalary(job)).toBe(true);
    });
    it('passes when salary range is within bounds', () => {
      const job = makeJob({ salaryMin: 60000, salaryMax: 90000 });
      expect(matchesSalary(job, 50000, 100000)).toBe(true);
    });
  });
});

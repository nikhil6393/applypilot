import { describe, it, expect } from 'vitest';
import type { CanonicalJob, CanonicalResume } from '@applypilot/domain';
import {
  normalizeCanonicalUrl,
  resolveSkill,
  normalizeSkillList,
  compareSkills,
  checkDuplicate,
  mergeJobs,
  diceCoefficient,
  computeDescriptionHash,
  defaultFitEngine,
} from '../src/index.js';

describe('Phase 5 — Search, Dedupe, and Fit Engine (@applypilot/scoring)', () => {
  describe('Canonical URL Normalization', () => {
    it('strips tracking parameters and standardizes formatting', () => {
      const dirtyUrl =
        'https://Jobs.Lever.co/Stripe/12345/?utm_source=linkedin&ref=job_board&trk=feed#overview';
      const cleanUrl = normalizeCanonicalUrl(dirtyUrl);
      expect(cleanUrl).toBe('https://jobs.lever.co/stripe/12345');
    });

    it('sorts non-tracking query parameters deterministically', () => {
      const urlA = 'https://example.com/job?dept=eng&team=platform';
      const urlB = 'https://example.com/job?team=platform&dept=eng';
      expect(normalizeCanonicalUrl(urlA)).toBe(normalizeCanonicalUrl(urlB));
    });

    it('strips trailing slashes from path', () => {
      expect(normalizeCanonicalUrl('https://example.com/careers/roles/')).toBe(
        'https://example.com/careers/roles'
      );
    });
  });

  describe('Skill Taxonomy & Aliases', () => {
    it('resolves known aliases to canonical skill names and categories', () => {
      expect(resolveSkill('ts')).toEqual({
        canonicalName: 'TypeScript',
        category: 'language',
        rawInput: 'ts',
      });
      expect(resolveSkill('postgres')).toEqual({
        canonicalName: 'PostgreSQL',
        category: 'database',
        rawInput: 'postgres',
      });
      expect(resolveSkill('k8s')).toEqual({
        canonicalName: 'Kubernetes',
        category: 'tooling',
        rawInput: 'k8s',
      });
    });

    it('deduplicates aliases in skill lists', () => {
      const rawList = ['React', 'react.js', 'reactjs', 'TypeScript', 'TS'];
      const normalized = normalizeSkillList(rawList);
      expect(normalized).toHaveLength(2);
      expect(normalized).toContain('React');
      expect(normalized).toContain('TypeScript');
    });

    it('compares target and candidate skills with taxonomy matching', () => {
      const target = ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'];
      const candidate = ['TS', 'Node', 'Python'];

      const result = compareSkills(target, candidate);
      expect(result.matchedSkills).toContain('TypeScript');
      expect(result.matchedSkills).toContain('Node.js');
      expect(result.missingSkills).toContain('PostgreSQL');
      expect(result.missingSkills).toContain('Docker');
      expect(result.overlapRatio).toBe(0.5);
    });
  });

  describe('7-Stage Deduplication Engine (§12)', () => {
    const baseJob: CanonicalJob = {
      id: 'job-1',
      source: 'greenhouse',
      sourceJobId: 'gh-101',
      canonicalUrl: 'https://boards.greenhouse.io/airbnb/jobs/101',
      title: 'Senior Software Engineer',
      company: { name: 'Airbnb' },
      locations: [{ raw: 'San Francisco, CA' }],
      remoteType: 'hybrid',
      employmentType: 'full_time',
      experienceLevel: ['senior'],
      description: 'Design and implement distributed booking infrastructure.',
      requirements: ['5+ years Go or Java', 'Distributed systems experience'],
      responsibilities: ['Build robust microservices'],
      skills: [{ name: 'Go' }, { name: 'Distributed Systems' }],
      discoveredAt: '2026-09-18T00:00:00Z',
      lastSeenAt: '2026-09-18T00:00:00Z',
      internship: false,
      status: 'active',
      contentHash: computeDescriptionHash('Design and implement distributed booking infrastructure.'),
      applicantCount: 42,
    };

    it('Stage 1: Matches identical source and sourceJobId', () => {
      const duplicate: CanonicalJob = {
        ...baseJob,
        id: 'job-dup-1',
        canonicalUrl: 'https://different-url.com',
      };
      const result = checkDuplicate(baseJob, duplicate);
      expect(result.matched).toBe(true);
      expect(result.stage).toBe('exact_source_key');
      expect(result.confidence).toBe(1.0);
    });

    it('Stage 2: Matches canonical URL across different sources', () => {
      const duplicate: CanonicalJob = {
        ...baseJob,
        id: 'job-dup-2',
        source: 'linkedin',
        sourceJobId: 'li-999',
        canonicalUrl: 'https://boards.greenhouse.io/airbnb/jobs/101?utm_source=linkedin',
      };
      const result = checkDuplicate(baseJob, duplicate);
      expect(result.matched).toBe(true);
      expect(result.stage).toBe('canonical_url');
      expect(result.confidence).toBe(1.0);
    });

    it('Stage 3: Matches company, title, and location compatibility', () => {
      const duplicate: CanonicalJob = {
        ...baseJob,
        id: 'job-dup-3',
        source: 'naukari',
        sourceJobId: 'nk-888',
        canonicalUrl: 'https://naukri.com/airbnb-job',
        title: 'Senior Software Engineer',
        company: { name: 'airbnb' },
        locations: [{ raw: 'San Francisco, CA' }],
      };
      const result = checkDuplicate(baseJob, duplicate);
      expect(result.matched).toBe(true);
      expect(result.stage).toBe('company_title_location');
      expect(result.confidence).toBe(0.95);
    });

    it('Invariant (§12): Never merges two jobs solely because their titles match', () => {
      const differentCompanyJob: CanonicalJob = {
        ...baseJob,
        id: 'job-different-company',
        company: { name: 'Google' },
        canonicalUrl: 'https://careers.google.com/jobs/999',
        sourceJobId: 'goog-999',
      };
      const result = checkDuplicate(baseJob, differentCompanyJob);
      expect(result.matched).toBe(false);
      expect(result.stage).toBe('none');
    });

    it('Preserves source provenance and timestamps during merging (§12)', () => {
      const secondary: CanonicalJob = {
        ...baseJob,
        id: 'job-sec',
        source: 'linkedin',
        sourceJobId: 'li-101',
        canonicalUrl: 'https://linkedin.com/jobs/view/101',
        applicantCount: 150,
        discoveredAt: '2026-09-18T01:00:00Z',
      };

      const merged = mergeJobs(baseJob, secondary);
      expect(merged.id).toBe(baseJob.id);
      expect(merged.sourceMetadata?.sources).toHaveLength(2);
      expect(merged.sourceMetadata?.sources[0].source).toBe('greenhouse');
      expect(merged.sourceMetadata?.sources[1].source).toBe('linkedin');
      expect(merged.sourceMetadata?.sources[1].applicantCount).toBe(150);
    });
  });

  describe('Deterministic Fit Engine (§13)', () => {
    const mockResume: CanonicalResume = {
      fullName: 'Jordan Coder',
      email: 'jordan@example.com',
      skills: [{ name: 'TypeScript' }, { name: 'React' }, { name: 'PostgreSQL' }],
      experience: [
        {
          company: 'TechFlow',
          title: 'Full Stack Engineer',
          bullets: ['Built real-time React web application with TypeScript and PostgreSQL.'],
        },
      ],
      education: [],
      projects: [],
      certifications: [],
    };

    const mockJob: CanonicalJob = {
      id: 'job-eval-1',
      source: 'greenhouse',
      sourceJobId: 'gh-fit-1',
      canonicalUrl: 'https://example.com/jobs/1',
      title: 'Frontend React Engineer',
      company: { name: 'Linear' },
      locations: [{ raw: 'Remote' }],
      remoteType: 'remote',
      employmentType: 'full_time',
      experienceLevel: ['mid'],
      description: 'Looking for a skilled frontend engineer to build beautiful React interfaces.',
      requirements: ['Strong React experience', 'TypeScript knowledge', 'PostgreSQL familiarity'],
      responsibilities: [],
      skills: [{ name: 'React' }, { name: 'TypeScript' }, { name: 'PostgreSQL' }],
      discoveredAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      postedAt: new Date(Date.now() - 3600_000 * 2).toISOString(), // 2 hours ago
      internship: false,
      status: 'active',
      contentHash: 'hash-1',
    };

    it('generates a reproducible deterministic score with scoringVersion', () => {
      const report1 = defaultFitEngine.evaluateFit(mockResume, mockJob);
      const report2 = defaultFitEngine.evaluateFit(mockResume, mockJob);

      expect(report1.scoringVersion).toBe('fit_engine_v1');
      expect(report1.fitScore).toBe(report2.fitScore);
      expect(report1.fitScore).toBeGreaterThanOrEqual(80);
      expect(report1.matchedSkills).toContain('React');
      expect(report1.matchedSkills).toContain('TypeScript');
      expect(report1.evidence.length).toBeGreaterThan(0);
    });

    it('penalizes missing mandatory requirements deterministically', () => {
      const jobWithMissingRequirement: CanonicalJob = {
        ...mockJob,
        requirements: ['Must have 5 years of Rust programming experience'],
        skills: [{ name: 'Rust' }, { name: 'React' }],
      };

      const report = defaultFitEngine.evaluateFit(mockResume, jobWithMissingRequirement);
      expect(report.warnings.some((w) => w.includes('Rust'))).toBe(true);
      expect(report.fitScore).toBeLessThan(80);
    });
  });
});

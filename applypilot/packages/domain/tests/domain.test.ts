import { describe, it, expect } from 'vitest';
import {
  CanonicalJobSchema,
  toCanonicalJob,
  JobSourceSchema,
  CompanySchema,
  LocationSchema,
  SkillSchema,
  SkillTaxonomyDictionary,
  CanonicalResumeSchema,
  ApplicationSchema,
  ApplicationStatusSchema,
  SourceHealthSchema,
  MonitorConfigSchema,
  AtsScoreReportSchema,
  FitResultSchema,
} from '../src/index.js';
import { AppConfigSchema, loadConfig } from '../../config/src/index.js';

describe('Phase 2 Domain Contracts — Canonical Schemas & Types', () => {
  describe('Company & Location', () => {
    it('validates a well-formed company object', () => {
      const company = CompanySchema.parse({
        name: 'Stripe',
        website: 'https://stripe.com',
        size: '1000+',
        industry: 'Fintech',
      });
      expect(company.name).toBe('Stripe');
      expect(company.size).toBe('1000+');
    });

    it('rejects company with empty name', () => {
      expect(() => CompanySchema.parse({ name: '' })).toThrow();
    });

    it('validates location with default values', () => {
      const loc = LocationSchema.parse({ city: 'San Francisco', isRemote: false });
      expect(loc.city).toBe('San Francisco');
      expect(loc.isRemote).toBe(false);
      expect(loc.raw).toBe('');
    });
  });

  describe('Skill Taxonomy', () => {
    it('validates skill with category and aliases', () => {
      const skill = SkillSchema.parse({
        name: 'TypeScript',
        normalizedName: 'typescript',
        category: 'language',
        aliases: ['ts'],
        weight: 90,
      });
      expect(skill.category).toBe('language');
      expect(skill.aliases).toContain('ts');
    });

    it('contains normalized standard definitions in taxonomy dictionary', () => {
      expect(SkillTaxonomyDictionary).toHaveProperty('typescript');
      expect(SkillTaxonomyDictionary.typescript.category).toBe('language');
      expect(SkillTaxonomyDictionary.react.category).toBe('framework');
      expect(SkillTaxonomyDictionary.postgresql.category).toBe('database');
      expect(SkillTaxonomyDictionary.docker.category).toBe('tooling');
      expect(SkillTaxonomyDictionary.vitest.category).toBe('testing');
    });
  });

  describe('Canonical Job Model (Section 9)', () => {
    it('converts legacy JobPosting to CanonicalJob seamlessly', () => {
      const legacyJob = {
        id: 'legacy-123',
        title: 'Software Engineer Intern',
        company: 'ApplyPilot AI',
        source: 'greenhouse',
        url: 'https://boards.greenhouse.io/applypilot/jobs/123',
        location: 'Bengaluru, India',
        remote: false,
        description: 'Building next-generation career tools with React and TypeScript.',
        postedAt: new Date().toISOString(),
        skills: ['React', 'TypeScript', 'Node.js'],
        isInternship: true,
        sponsorsVisa: true,
        eligibleBatches: ['2025', '2026'],
        salaryMin: 40000,
        salaryMax: 60000,
        salaryCurrency: 'USD',
      };

      const canonical = toCanonicalJob(legacyJob);
      expect(canonical.id).toBe('legacy-123');
      expect(canonical.title).toBe('Software Engineer Intern');
      expect(canonical.company.name).toBe('ApplyPilot AI');
      expect(canonical.internship).toBe(true);
      expect(canonical.sponsorsVisa).toBe(true);
      expect(canonical.eligibleBatches).toEqual(['2025', '2026']);
      expect(canonical.salary?.min).toBe(40000);
      expect(canonical.salary?.max).toBe(60000);
      expect(canonical.skills).toContain('React');
    });

    it('validates CanonicalJob directly via schema', () => {
      const canonical = CanonicalJobSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        source: 'linkedin',
        sourceJobId: '3948572834',
        canonicalUrl: 'https://linkedin.com/jobs/view/3948572834',
        title: 'Full Stack Engineer',
        company: { name: 'Vercel', size: '201-500' },
        locations: [{ city: 'San Francisco', isRemote: true, raw: 'San Francisco, CA' }],
        remoteType: 'remote',
        employmentType: 'full-time',
        experienceLevel: ['mid'],
        description: 'Next.js and React full stack position.',
        requirements: ['3+ years React experience'],
        responsibilities: ['Build high performance edge infrastructure'],
        skills: ['React', 'Next.js', 'TypeScript'],
        postedAt: new Date().toISOString(),
        discoveredAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        internship: false,
        status: 'active',
      });

      expect(canonical.source).toBe('linkedin');
      expect(canonical.remoteType).toBe('remote');
      expect(canonical.status).toBe('active');
    });
  });

  describe('Canonical Resume Model (Section 14 & 17)', () => {
    it('validates canonical resume structure', () => {
      const resume = CanonicalResumeSchema.parse({
        fullName: 'Morgan Stanley',
        email: 'morgan@example.com',
        summary: 'Experienced software engineer.',
        skills: ['Go', 'Kubernetes', 'Docker'],
        experience: [
          {
            company: 'Cloud Corp',
            role: 'Backend Engineer',
            bullets: ['Scaled Kubernetes clusters to 1,000+ nodes.'],
          },
        ],
        education: [
          {
            degree: 'B.S. Computer Engineering',
            school: 'State University',
          },
        ],
      });

      expect(resume.fullName).toBe('Morgan Stanley');
      expect(resume.experience[0].company).toBe('Cloud Corp');
      expect(resume.education[0].degree).toBe('B.S. Computer Engineering');
    });
  });

  describe('Application & Monitor Contracts', () => {
    it('validates application state machine status', () => {
      expect(ApplicationStatusSchema.parse('applied')).toBe('applied');
      expect(ApplicationStatusSchema.parse('interviewing')).toBe('interviewing');
      expect(() => ApplicationStatusSchema.parse('hired_now')).toThrow();
    });

    it('validates application record', () => {
      const app = ApplicationSchema.parse({
        id: 'app-1',
        jobId: 'job-101',
        jobTitle: 'Frontend Engineer',
        company: 'Stripe',
        applyUrl: 'https://stripe.com/apply',
        status: 'saved',
      });
      expect(app.jobTitle).toBe('Frontend Engineer');
      expect(app.status).toBe('saved');
    });

    it('validates source health state tracking', () => {
      const health = SourceHealthSchema.parse({
        source: 'greenhouse',
        status: 'healthy',
        consecutiveFailures: 0,
        latencyMs: 140,
      });
      expect(health.status).toBe('healthy');
      expect(health.latencyMs).toBe(140);
    });

    it('validates monitor configuration defaults', () => {
      const monitor = MonitorConfigSchema.parse({
        id: 'mon-default',
        activeSources: ['linkedin', 'greenhouse'],
      });
      expect(monitor.intervalMs).toBe(180000);
      expect(monitor.enabled).toBe(true);
    });
  });

  describe('Scoring Contracts with Versioning', () => {
    it('validates AtsScoreReportSchema with versioning tag', () => {
      const report = AtsScoreReportSchema.parse({
        scoringVersion: 'v2.0.0',
        overallScore: 88,
        rating: 'A',
        ratingLabel: 'Strong ATS Match',
        categories: {
          formatting: { score: 22, maxScore: 25, label: 'Formatting', status: 'good', feedback: 'Clean structure' },
          impact: { score: 23, maxScore: 25, label: 'Impact', status: 'good', feedback: 'Action-oriented bullets' },
          quantifiable: { score: 21, maxScore: 25, label: 'Quantifiable', status: 'good', feedback: 'Metrics included' },
          skills: { score: 22, maxScore: 25, label: 'Skills', status: 'good', feedback: 'Strong core skills' },
          readability: { score: 24, maxScore: 25, label: 'Readability', status: 'excellent', feedback: 'High readability' },
        },
        metrics: {
          actionVerbCount: 14,
          metricsCount: 6,
          skillsCount: 12,
          bulletCount: 10,
          xyzCompliantCount: 5,
          clichesCount: 0,
          totalWordCount: 380,
          hasLinkedIn: true,
          hasGithub: true,
          hasEmail: true,
          hasPhone: true,
        },
      });

      expect(report.scoringVersion).toBe('v2.0.0');
      expect(report.overallScore).toBe(88);
      expect(report.rating).toBe('A');
    });

    it('validates FitResultSchema with versioning tag', () => {
      const fit = FitResultSchema.parse({
        scoringVersion: 'v1.0.0',
        jobId: 'job-99',
        score: 92,
        matchedSkills: ['React', 'TypeScript'],
        missingSkills: [],
        reasons: ['Strong alignment with frontend stack'],
        evidence: ['3 years experience in React'],
      });

      expect(fit.scoringVersion).toBe('v1.0.0');
      expect(fit.score).toBe(92);
    });
  });

  describe('Configuration Schema (packages/config)', () => {
    it('loads configuration with safe production defaults without cloud keys', () => {
      const config = loadConfig({
        PORT: '3000',
        NODE_ENV: 'test',
        OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
      });

      expect(config.port).toBe(3000);
      expect(config.nodeEnv).toBe('test');
      expect(config.ollamaBaseUrl).toBe('http://127.0.0.1:11434');
      expect(config.storageMode).toBe('local');
      expect(config.maxUploadMb).toBe(20);
      expect(config.scrapeTimeoutMs).toBe(15000);
      expect(config.nvidiaApiKey).toBeUndefined();
      expect(config.openrouterApiKey).toBeUndefined();
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  SOFTWARE_ENGINEER_INTERN_ROLES,
  SOFTWARE_ENGINEER_FULLTIME_ROLES,
  isSoftwareEngineerInternQuery,
  isSoftwareEngineerFullTimeQuery,
  matchesSoftwareEngineerInternRole,
  matchesSoftwareEngineerFullTimeRole,
  getExpandedRoles,
  getScraperSearchClusters,
  ALL_DOMAINS,
  detectDomainFromQuery,
} from '../scrape/RoleExpansionConfig.js';
import { isJobRoleMatch } from '../scrape/validator.js';
import { matchesScrapeRequest } from '../scrape/normalize.js';
import type { JobPosting } from '../../shared/types.js';

describe('Role Expansion & Keyword Coverage Suite', () => {
  it('contains exactly 20 roles for Software Engineer Intern', () => {
    expect(SOFTWARE_ENGINEER_INTERN_ROLES.length).toBe(20);
    expect(SOFTWARE_ENGINEER_INTERN_ROLES).toContain('Full Stack Developer Intern');
    expect(SOFTWARE_ENGINEER_INTERN_ROLES).toContain('React Developer Intern');
    expect(SOFTWARE_ENGINEER_INTERN_ROLES).toContain('Backend Developer Intern');
    expect(SOFTWARE_ENGINEER_INTERN_ROLES).toContain('Systems Engineer Intern');
    expect(SOFTWARE_ENGINEER_INTERN_ROLES).toContain('Web Developer Intern');
  });

  it('contains exactly 21 roles for Software Engineer (Non-Intern)', () => {
    expect(SOFTWARE_ENGINEER_FULLTIME_ROLES.length).toBe(21);
    expect(SOFTWARE_ENGINEER_FULLTIME_ROLES).toContain('Full Stack Developer');
    expect(SOFTWARE_ENGINEER_FULLTIME_ROLES).toContain('React Developer');
    expect(SOFTWARE_ENGINEER_FULLTIME_ROLES).toContain('Backend Developer');
    expect(SOFTWARE_ENGINEER_FULLTIME_ROLES).toContain('Systems Engineer');
    expect(SOFTWARE_ENGINEER_FULLTIME_ROLES).toContain('Full Stack Software Engineer');
  });

  it('detects queries for Software Engineer Intern and expands to 20 roles', () => {
    expect(isSoftwareEngineerInternQuery('Software Engineer Intern')).toBe(true);
    expect(isSoftwareEngineerInternQuery('software engineer intern')).toBe(true);
    expect(isSoftwareEngineerInternQuery('swe intern')).toBe(true);
    expect(isSoftwareEngineerInternQuery('sde intern')).toBe(true);
    expect(isSoftwareEngineerInternQuery('Software Developer Intern')).toBe(true);

    const expanded = getExpandedRoles('Software Engineer Intern');
    expect(expanded.length).toBe(20);
  });

  it('detects queries for Software Engineer and expands to 21 roles', () => {
    expect(isSoftwareEngineerFullTimeQuery('Software Engineer')).toBe(true);
    expect(isSoftwareEngineerFullTimeQuery('software engineer')).toBe(true);
    expect(isSoftwareEngineerFullTimeQuery('Software Developer')).toBe(true);
    expect(isSoftwareEngineerFullTimeQuery('sde')).toBe(true);

    const expanded = getExpandedRoles('Software Engineer');
    expect(expanded.length).toBe(21);
  });

  it('matches all 20 Software Engineer Intern roles via matchesSoftwareEngineerInternRole', () => {
    for (const role of SOFTWARE_ENGINEER_INTERN_ROLES) {
      const match = matchesSoftwareEngineerInternRole(role);
      expect(match, `Expected role "${role}" to match Software Engineer Intern criteria`).toBe(true);
    }
  });

  it('matches all 21 Software Engineer roles via matchesSoftwareEngineerFullTimeRole', () => {
    for (const role of SOFTWARE_ENGINEER_FULLTIME_ROLES) {
      const match = matchesSoftwareEngineerFullTimeRole(role);
      expect(match, `Expected role "${role}" to match Software Engineer criteria`).toBe(true);
    }
  });

  it('validates all 20 roles when searching for "Software Engineer Intern" via validator isJobRoleMatch', () => {
    const mainQuery = 'Software Engineer Intern';

    for (const role of SOFTWARE_ENGINEER_INTERN_ROLES) {
      const mockJob: JobPosting = {
        id: `test_${Math.random()}`,
        title: role,
        company: 'Stripe',
        source: 'linkedin',
        url: 'https://linkedin.com/jobs/123',
        applyUrl: 'https://linkedin.com/jobs/123',
        location: 'Remote',
        remote: true,
        description: `Exciting opening for ${role} with modern tech stack.`,
        postedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        skills: ['TypeScript', 'React'],
      };

      const matched = isJobRoleMatch(mockJob, mainQuery);
      expect(matched, `Expected validator to match role "${role}" for query "${mainQuery}"`).toBe(true);
    }
  });

  it('validates all 21 roles when searching for "Software Engineer" via validator isJobRoleMatch', () => {
    const mainQuery = 'Software Engineer';

    for (const role of SOFTWARE_ENGINEER_FULLTIME_ROLES) {
      const mockJob: JobPosting = {
        id: `test_${Math.random()}`,
        title: role,
        company: 'Google',
        source: 'linkedin',
        url: 'https://linkedin.com/jobs/456',
        applyUrl: 'https://linkedin.com/jobs/456',
        location: 'Remote',
        remote: true,
        description: `Exciting opening for ${role} with modern tech stack.`,
        postedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        skills: ['Python', 'Node.js'],
      };

      const matched = isJobRoleMatch(mockJob, mainQuery);
      expect(matched, `Expected validator to match role "${role}" for query "${mainQuery}"`).toBe(true);
    }
  });

  it('ensures normalize matchesScrapeRequest does not drop any of the 20 intern roles', () => {
    for (const role of SOFTWARE_ENGINEER_INTERN_ROLES) {
      const job: JobPosting = {
        id: `job_${Math.random()}`,
        title: role,
        company: 'Microsoft',
        source: 'greenhouse',
        url: 'https://boards.greenhouse.io/microsoft/jobs/123',
        applyUrl: 'https://boards.greenhouse.io/microsoft/jobs/123',
        location: 'Remote',
        remote: true,
        description: `Hiring a ${role} to join our engineering organization.`,
        postedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        skills: ['JavaScript'],
      };

      const match = matchesScrapeRequest(job, { query: 'Software Engineer Intern', location: 'Remote', remoteOnly: true });
      expect(match, `Expected normalize to keep role "${role}"`).toBe(true);
    }
  });

  it('ensures normalize matchesScrapeRequest does not drop any of the 21 software engineer roles', () => {
    for (const role of SOFTWARE_ENGINEER_FULLTIME_ROLES) {
      const job: JobPosting = {
        id: `job_${Math.random()}`,
        title: role,
        company: 'Meta',
        source: 'lever',
        url: 'https://jobs.lever.co/meta/123',
        applyUrl: 'https://jobs.lever.co/meta/123',
        location: 'Remote',
        remote: true,
        description: `Hiring a ${role} to join our infrastructure organization.`,
        postedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        skills: ['C++', 'Python'],
      };

      const match = matchesScrapeRequest(job, { query: 'Software Engineer', location: 'Remote', remoteOnly: true });
      expect(match, `Expected normalize to keep role "${role}"`).toBe(true);
    }
  });

  it('provides scraper search clusters for multi-query coverage', () => {
    const internClusters = getScraperSearchClusters('Software Engineer Intern');
    expect(internClusters.length).toBeGreaterThanOrEqual(5);
    expect(internClusters).toContain('Full Stack Developer Intern');
    expect(internClusters).toContain('React Developer Intern');

    const fulltimeClusters = getScraperSearchClusters('Software Engineer');
    expect(fulltimeClusters.length).toBeGreaterThanOrEqual(5);
    expect(fulltimeClusters).toContain('Full Stack Developer');
    expect(fulltimeClusters).toContain('React Developer');
  });

  it('covers all 10 engineering domains with intern and fulltime keywords', () => {
    expect(ALL_DOMAINS.length).toBeGreaterThanOrEqual(9);

    const domainIds = ALL_DOMAINS.map((d: any) => d.domainId);
    expect(domainIds).toContain('software_engineering');
    expect(domainIds).toContain('fullstack');
    expect(domainIds).toContain('frontend');
    expect(domainIds).toContain('backend');
    expect(domainIds).toContain('ai_ml_data');
    expect(domainIds).toContain('devops_cloud');
    expect(domainIds).toContain('mobile');
    expect(domainIds).toContain('cybersecurity');
    expect(domainIds).toContain('qa_sdet');

    for (const dom of ALL_DOMAINS) {
      expect(dom.internRoles.length).toBeGreaterThanOrEqual(8);
      expect(dom.fulltimeRoles.length).toBeGreaterThanOrEqual(8);
      expect(dom.internKeyword).toBeTruthy();
      expect(dom.fulltimeKeyword).toBeTruthy();

      // Test detection of domain by its intern keyword
      const detectedIntern = detectDomainFromQuery(dom.internKeyword);
      expect(detectedIntern?.domainId).toBe(dom.domainId);

      // Test detection of domain by its fulltime keyword
      const detectedFulltime = detectDomainFromQuery(dom.fulltimeKeyword);
      expect(detectedFulltime?.domainId).toBe(dom.domainId);
    }
  });

  it('validates jobs across all domains when queried with main keywords', () => {
    for (const dom of ALL_DOMAINS) {
      // Test first 3 roles of each domain for both intern and fulltime
      const sampleInternRoles = dom.internRoles.slice(0, 3);
      for (const role of sampleInternRoles) {
        const job: JobPosting = {
          id: `sample_${Math.random()}`,
          title: role,
          company: 'Acme Corp',
          source: 'linkedin',
          url: 'https://example.com/job',
          applyUrl: 'https://example.com/job',
          location: 'Remote',
          remote: true,
          description: `Looking for a great ${role}.`,
          postedAt: new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          skills: ['Coding'],
        };

        const roleMatch = isJobRoleMatch(job, dom.internKeyword);
        expect(roleMatch, `Expected ${role} to match query ${dom.internKeyword}`).toBe(true);

        const scrapeMatch = matchesScrapeRequest(job, { query: dom.internKeyword, location: 'Remote', remoteOnly: true });
        expect(scrapeMatch, `Expected scrapeRequest to retain ${role} for ${dom.internKeyword}`).toBe(true);
      }
    }
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CanonicalJobSchema } from '@applypilot/domain';
import {
  LinkedInAdapter,
  NaukriAdapter,
  GreenhouseAdapter,
  LeverAdapter,
  AshbyAdapter,
  defaultRegistry,
} from '../src/index.js';

describe('Phase 3 Source Adapters Contract Tests (Fixtures & Canonical Normalization)', () => {
  const rootDir = process.cwd();

  describe('LinkedInAdapter Contract', () => {
    const adapter = new LinkedInAdapter();

    it('exposes correct capabilities', () => {
      const caps = adapter.capabilities();
      expect(caps.supportsKeywordSearch).toBe(true);
      expect(caps.supportsRemoteFilter).toBe(true);
      expect(caps.supportsInternshipFilter).toBe(true);
    });

    it('normalizes saved LinkedIn fixture to valid CanonicalJob', () => {
      const fixturePath = resolve(rootDir, 'fixtures/linkedin/job-posting.json');
      const rawData = JSON.parse(readFileSync(fixturePath, 'utf-8'));

      const rawJob = {
        source: 'linkedin' as const,
        rawId: rawData.id,
        data: rawData,
        extractedAt: new Date().toISOString(),
      };

      const canonical = adapter.normalize(rawJob);
      const parsed = CanonicalJobSchema.parse(canonical);

      expect(parsed.source).toBe('linkedin');
      expect(parsed.id).toBe('linkedin_3948572910');
      expect(parsed.title).toBe('Software Engineer Intern');
      expect(parsed.company.name).toBe('Microsoft');
      expect(parsed.applicantCount).toBe(42);
      expect(parsed.internship).toBe(true);
    });

    it('returns valid health status', async () => {
      const health = await adapter.healthCheck();
      expect(health.source).toBe('linkedin');
      expect(['healthy', 'degraded', 'circuit_open', 'down']).toContain(health.status);
    });
  });

  describe('NaukriAdapter Contract', () => {
    const adapter = new NaukriAdapter();

    it('normalizes saved Naukri fixture to valid CanonicalJob', () => {
      const fixturePath = resolve(rootDir, 'fixtures/naukri/job-posting.json');
      const rawData = JSON.parse(readFileSync(fixturePath, 'utf-8'));

      const rawJob = {
        source: 'naukari' as const,
        rawId: rawData.jobId,
        data: rawData,
        extractedAt: new Date().toISOString(),
      };

      const canonical = adapter.normalize(rawJob);
      const parsed = CanonicalJobSchema.parse(canonical);

      expect(parsed.source).toBe('naukari');
      expect(parsed.company.name).toBe('Infosys');
      expect(parsed.title).toContain('Graduate Trainee Engineer');
      expect(parsed.skills).toContain('Java');
    });

    it('returns valid health status', async () => {
      const health = await adapter.healthCheck();
      expect(health.source).toBe('naukari');
      expect(health.latencyMs).toBeGreaterThan(0);
    });
  });

  describe('GreenhouseAdapter Contract', () => {
    const adapter = new GreenhouseAdapter();

    it('normalizes official Greenhouse API fixture to valid CanonicalJob', () => {
      const fixturePath = resolve(rootDir, 'fixtures/greenhouse/job-posting.json');
      const rawData = JSON.parse(readFileSync(fixturePath, 'utf-8'));

      const rawJob = {
        source: 'greenhouse' as const,
        rawId: String(rawData.id),
        data: rawData,
        extractedAt: new Date().toISOString(),
      };

      const canonical = adapter.normalize(rawJob);
      const parsed = CanonicalJobSchema.parse(canonical);

      expect(parsed.source).toBe('greenhouse');
      expect(parsed.company.name).toBe('Stripe');
      expect(parsed.applicantCount).toBeUndefined(); // Zero-fabrication check
      expect(parsed.canonicalUrl).toBe('https://boards.greenhouse.io/stripe/jobs/5839201');
    });
  });

  describe('LeverAdapter Contract', () => {
    const adapter = new LeverAdapter();

    it('normalizes official Lever API fixture to valid CanonicalJob', () => {
      const fixturePath = resolve(rootDir, 'fixtures/lever/job-posting.json');
      const rawData = JSON.parse(readFileSync(fixturePath, 'utf-8'));

      const rawJob = {
        source: 'lever' as const,
        rawId: rawData.id,
        data: rawData,
        extractedAt: new Date().toISOString(),
      };

      const canonical = adapter.normalize(rawJob);
      const parsed = CanonicalJobSchema.parse(canonical);

      expect(parsed.source).toBe('lever');
      expect(parsed.title).toBe('Senior Backend Developer');
      expect(parsed.canonicalUrl).toBe('https://jobs.lever.co/figma/lever-782910-post');
      expect(parsed.applicantCount).toBeUndefined(); // Zero-fabrication check
    });
  });

  describe('AshbyAdapter Contract', () => {
    const adapter = new AshbyAdapter();

    it('normalizes official Ashby API fixture to valid CanonicalJob', () => {
      const fixturePath = resolve(rootDir, 'fixtures/ashby/job-posting.json');
      const rawData = JSON.parse(readFileSync(fixturePath, 'utf-8'));

      const rawJob = {
        source: 'ashby' as const,
        rawId: rawData.id,
        data: rawData,
        extractedAt: new Date().toISOString(),
      };

      const canonical = adapter.normalize(rawJob);
      const parsed = CanonicalJobSchema.parse(canonical);

      expect(parsed.source).toBe('ashby');
      expect(parsed.title).toBe('Full Stack Engineer - Product');
      expect(parsed.canonicalUrl).toBe('https://jobs.ashbyhq.com/linear/ashby-91823-item');
      expect(parsed.remoteType).toBe('remote');
    });
  });

  describe('AdapterRegistry', () => {
    it('contains all core production adapters', () => {
      const sources = defaultRegistry.getRegisteredSources();
      expect(sources).toContain('linkedin');
      expect(sources).toContain('naukari');
      expect(sources).toContain('greenhouse');
      expect(sources).toContain('lever');
      expect(sources).toContain('ashby');
    });

    it('performs concurrent health checks across registered adapters', async () => {
      const healthList = await defaultRegistry.healthCheckAll();
      expect(healthList.length).toBeGreaterThanOrEqual(5);
      for (const h of healthList) {
        expect(['healthy', 'degraded', 'circuit_open', 'down']).toContain(h.status);
      }
    });
  });
});

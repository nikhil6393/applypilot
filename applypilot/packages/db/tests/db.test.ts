import { describe, it, expect } from 'vitest';
import {
  detectDatabaseType,
  getDbStatus,
  schema,
} from '../src/index.js';
import { SqliteToPgMigrator } from '../src/migrate-sqlite-to-pg.js';

describe('Phase 4 Database Contracts — @applypilot/db', () => {
  describe('Dual-Path Database Detection', () => {
    it('defaults to sqlite when DATABASE_URL is not set', () => {
      const dbType = detectDatabaseType({});
      expect(dbType).toBe('sqlite');
    });

    it('detects postgresql when DATABASE_URL is provided', () => {
      const dbType = detectDatabaseType({
        databaseUrl: 'postgresql://postgres:secret@localhost:5432/applypilot',
      });
      expect(dbType).toBe('postgres');
    });

    it('masks password in getDbStatus for security', () => {
      const status = getDbStatus({
        databaseUrl: 'postgresql://user:super_secret_pw@127.0.0.1:5432/applypilot',
      });
      expect(status.type).toBe('postgres');
      expect(status.activePathOrUrl).toContain(':***@');
      expect(status.activePathOrUrl).not.toContain('super_secret_pw');
    });
  });

  describe('Drizzle Relational Schemas', () => {
    it('exports all Phase 4 core entity tables', () => {
      expect(schema.jobs).toBeDefined();
      expect(schema.jobSources).toBeDefined();
      expect(schema.companies).toBeDefined();
      expect(schema.locations).toBeDefined();
      expect(schema.skills).toBeDefined();
      expect(schema.jobSkills).toBeDefined();
      expect(schema.users).toBeDefined();
      expect(schema.resumes).toBeDefined();
      expect(schema.resumeVersions).toBeDefined();
      expect(schema.applications).toBeDefined();
      expect(schema.applicationEvents).toBeDefined();
      expect(schema.savedSearches).toBeDefined();
      expect(schema.monitorConfigs).toBeDefined();
      expect(schema.monitorRuns).toBeDefined();
      expect(schema.sourceHealth).toBeDefined();
      expect(schema.fitScores).toBeDefined();
      expect(schema.auditEvents).toBeDefined();
      expect(schema.notifications).toBeDefined();
      expect(schema.resumeTemplates).toBeDefined();
      expect(schema.studioProjects).toBeDefined();
    });
  });

  describe('SQLite to PostgreSQL Migration Pipeline', () => {
    const migrator = new SqliteToPgMigrator();

    it('transforms SQLite job postings to relational models with canonical fields', () => {
      const sqliteJobs = [
        {
          id: 'job-1',
          title: 'Senior Backend Engineer',
          company: 'Acme Corp',
          url: 'https://example.com/jobs/1',
          skills: '["Go", "PostgreSQL", "Docker"]',
          remote: true,
          internship: false,
          source: 'greenhouse',
          sourceJobId: 'gh-12345',
          description: 'Build high-scale distributed systems.',
          postedAt: '2026-09-15T12:00:00Z',
        },
      ];

      const transformed = migrator.transformJobs(sqliteJobs);
      expect(transformed).toHaveLength(1);
      expect(transformed[0].id).toBe('job-1');
      expect(transformed[0].title).toBe('Senior Backend Engineer');
      expect(transformed[0].companyName).toBe('Acme Corp');
      expect(transformed[0].remoteType).toBe('remote');
      expect(transformed[0].source).toBe('greenhouse');
      expect(transformed[0].sourceJobId).toBe('gh-12345');
    });

    it('migrates snapshot without error', async () => {
      const stats = await migrator.migrateSnapshot({
        jobs: [
          {
            id: 'job-2',
            title: 'Frontend Intern',
            company: 'Vercel',
            skills: ['React', 'Next.js'],
            internship: true,
          },
        ],
        profiles: [
          {
            id: 'prof-1',
            profile_json: JSON.stringify({
              fullName: 'Alex Developer',
              email: 'alex@example.com',
            }),
            created_at: '2026-09-10T10:00:00Z',
          },
        ],
      });

      expect(stats.jobsMigrated).toBe(1);
      expect(stats.profilesMigrated).toBe(1);
      expect(stats.errors).toHaveLength(0);
    });
  });
});

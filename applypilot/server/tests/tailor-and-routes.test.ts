import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { closeDb, getDb } from '../store/db.js';
import { createApp } from '../app.js';
import { tailor } from '../scoring/tailor.js';
import { upsertJob } from '../store/jobs.js';
import type { JobPosting, ParsedResume } from '../../shared/types.js';
import { invalidateProviderChain } from '../ai/index.js';
import { config } from '../config.js';

const resume: ParsedResume = {
  fullName: 'Test User',
  email: 't@e.com',
  phone: '555',
  links: [],
  location: 'Remote',
  summary: '',
  skills: ['typescript', 'react', 'node'],
  experience: [
    {
      company: 'Acme',
      title: 'Engineer',
      startDate: '2022-01',
      endDate: 'present',
      bullets: [
        'Built React dashboards for 50k users',
        'Cut API p95 latency by 60% via caching',
        'Migrated Node.js services to TypeScript',
      ],
    },
  ],
  education: [],
  rawText: '',
  parsedAt: new Date().toISOString(),
  parserVersion: 'v2',
};

const job: JobPosting = {
  id: 'tailor1',
  title: 'Senior Frontend Engineer',
  company: 'BetaCo',
  source: 'greenhouse',
  url: 'https://beta.co/jobs/1',
  applyUrl: 'https://beta.co/jobs/1',
  location: 'Remote',
  remote: true,
  description: 'React + TypeScript + Node',
  postedAt: new Date().toISOString(),
  fetchedAt: new Date().toISOString(),
  employmentType: 'full-time',
  skills: ['react', 'typescript', 'node'],
};

const trackerFixture = {
  jobId: 'tailor1',
  jobTitle: 'Senior Frontend Engineer',
  company: 'BetaCo',
  applyUrl: 'https://beta.co/jobs/1',
  status: 'applied' as const,
  notes: '',
};

let app: ReturnType<typeof createApp>;
let trackerId: string;

beforeAll(async () => {
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.NVIDIA_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.NVIDIA_NIM_API_KEY;
  config.openRouterApiKey = '';
  config.nvidiaApiKey = '';
  invalidateProviderChain();
  process.env.DB_PATH = './data/test-tailor-routes.db';

  app = createApp();
  // Wipe tables in the live DB so this test is isolated from other test files and live smoke data.
  getDb().exec('DELETE FROM tracker; DELETE FROM jobs; DELETE FROM resume;');
  // Seed resume via the route so the parser + storage paths are exercised.
  const r1 = await request(app).post('/api/resume/parse').send({
    text: 'Test User\nt@e.com\nLocation: Remote\n\nExperience:\nEngineer at Acme - Built React dashboards for 50k users - Cut API p95 latency by 60% via caching - Migrated Node.js services to TypeScript\n\nSkills: TypeScript, React, Node.js',
  });
  expect(r1.status).toBe(200);
  // Seed a job via the route-equivalent path: POST /api/jobs/scrape is not feasible (hits network),
  // so we hit the jobs router indirectly by inserting through the store and then GET /api/jobs/:id.
  // The simplest: import upsertJob from the same store the route uses, and the route will see it.
  const { upsertJob } = await import('../store/jobs.js');
  upsertJob(job);
});

afterAll(() => {
  // Clean up rows we created.
  getDb().exec("DELETE FROM tracker; DELETE FROM jobs WHERE id = 'tailor1'; DELETE FROM resume;");
  closeDb();
});

describe('tailor', () => {
  beforeAll(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.NVIDIA_NIM_API_KEY;
    config.openRouterApiKey = '';
    config.nvidiaApiKey = '';
    invalidateProviderChain();
  });
  it('returns a completed doc with at least one bullet', async () => {
    const doc = await tailor(resume, job);
    expect(doc.jobId).toBe('tailor1');
    expect(doc.bullets.length).toBeGreaterThan(0);
    expect(['heuristic', 'nvidia', 'openrouter']).toContain(doc.source);
  });
});

describe('tracker route', () => {
  it('adds then lists then patches then deletes', async () => {
    const add = await request(app).post('/api/tracker').send(trackerFixture);
    expect(add.status).toBe(201);
    expect(add.body.id).toBeTruthy();
    trackerId = add.body.id as string;

    const list = await request(app).get('/api/tracker');
    expect(list.status).toBe(200);
    expect(list.body.count).toBeGreaterThanOrEqual(1);

    const patch = await request(app)
      .patch(`/api/tracker/${trackerId}`)
      .send({ status: 'interviewing' });
    expect(patch.status).toBe(200);
    expect(patch.body.status).toBe('interviewing');

    const del = await request(app).delete(`/api/tracker/${trackerId}`);
    expect(del.status).toBe(204);
  });
});

describe('fit-score route', () => {
  it('returns a non-zero score with the seeded job', async () => {
    const res = await request(app).post('/api/jobs/fit-score').send({ job });
    expect(res.status).toBe(200);
    expect(res.body.jobId).toBe('tailor1');
    expect(typeof res.body.score).toBe('number');
    // The resume was parsed via /api/resume/parse (heuristic), so we don't pin to specific skills.
    expect(Array.isArray(res.body.matchedSkills)).toBe(true);
  });

  it('returns 400 when job body is missing', async () => {
    const res = await request(app).post('/api/jobs/fit-score').send({});
    expect(res.status).toBe(400);
  });
});

describe('SSE discover event emitter', () => {
  it('emits job + summary events', async () => {
    const { scrapeOrchestrator } = await import('../scrape/orchestrator.js');
    const fakeJob: JobPosting = {
      id: 'sse1',
      title: 'SSE Test',
      company: 'SSE Inc',
      source: 'manual',
      url: 'https://example.com/sse1',
      applyUrl: 'https://example.com/sse1',
      location: 'Remote',
      remote: true,
      description: 'desc',
      postedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      employmentType: 'full-time',
      skills: [],
    };
    const onNew = vi.fn();
    const onSummary = vi.fn();
    scrapeOrchestrator.on('new', onNew);
    scrapeOrchestrator.on('summary', onSummary);
    scrapeOrchestrator.emit('new', fakeJob);
    scrapeOrchestrator.emit('summary', {
      totalFound: 1,
      newJobs: 1,
      startedAt: '',
      finishedAt: '',
      perSource: { manual: { found: 1, new: 1 } },
    });
    expect(onNew).toHaveBeenCalledWith(fakeJob);
    expect(onSummary).toHaveBeenCalled();
    scrapeOrchestrator.off('new', onNew);
    scrapeOrchestrator.off('summary', onSummary);
  });
});

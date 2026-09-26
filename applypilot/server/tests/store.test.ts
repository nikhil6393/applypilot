import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unlinkSync, existsSync } from 'node:fs';
import { initDb, closeDb, getDb } from '../store/db.js';
import { setResume, getResume } from '../store/resume.js';
import { addTracker, listTracker, updateTracker, deleteTracker } from '../store/tracker.js';
import { upsertJob, listJobs, getJob } from '../store/jobs.js';
import type { JobPosting, ApplicationRecord, ParsedResume } from '../../shared/types.js';

const DB_PATH = './data/test-applypilot.db';

beforeAll(() => {
  process.env.DB_PATH = DB_PATH;
  if (existsSync(DB_PATH)) {
    try {
      unlinkSync(DB_PATH);
    } catch {
      /* ignore */
    }
  }
  initDb();
  getDb().exec('DELETE FROM jobs; DELETE FROM resume; DELETE FROM tracker;');
});

afterAll(() => {
  closeDb();
  for (const ext of ['', '-wal', '-shm']) {
    const p = DB_PATH + ext;
    if (existsSync(p))
      try {
        unlinkSync(p);
      } catch {
        /* ignore */
      }
  }
});

describe('store', () => {
  it('round-trips a resume', () => {
    const r: ParsedResume = {
      fullName: 'Test User',
      email: 't@e.com',
      phone: '555',
      links: [],
      location: '',
      summary: '',
      skills: ['go'],
      experience: [],
      education: [],
      rawText: '',
      parsedAt: new Date().toISOString(),
      parserVersion: 'v2',
    };
    setResume(r);
    expect(getResume()?.email).toBe('t@e.com');
  });

  it('dedupes jobs by hash and lists them', () => {
    const j: JobPosting = {
      id: 'job1',
      title: 'Software Engineer',
      company: 'Acme',
      source: 'greenhouse',
      url: 'https://acme.com/jobs/1',
      applyUrl: 'https://acme.com/jobs/1',
      location: 'Remote',
      remote: true,
      description: 'desc',
      postedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      employmentType: 'full-time',
      skills: ['go'],
    };
    expect(upsertJob(j).inserted).toBe(true);
    expect(upsertJob(j).inserted).toBe(false);
    const list = listJobs({ limit: 10 });
    expect(list.length).toBe(1);
    expect(getJob('job1')?.title).toBe('Software Engineer');
  });

  it('round-trips tracker records', () => {
    const r: ApplicationRecord = {
      id: 'tr1',
      jobId: 'job1',
      jobTitle: 'SWE',
      company: 'Acme',
      applyUrl: 'https://acme.com',
      status: 'applied',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addTracker(r);
    expect(listTracker('applied').length).toBe(1);
    const updated = updateTracker('tr1', { status: 'interviewing' });
    expect(updated?.status).toBe('interviewing');
    expect(deleteTracker('tr1')).toBe(true);
    expect(listTracker().length).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { normalizeJobs } from '../scrape/normalize.js';
import type { JobPosting } from '../../shared/types.js';

const sample: JobPosting = {
  id: 'x',
  title: 'Test',
  company: 'Co',
  source: 'greenhouse',
  url: 'https://x',
  applyUrl: 'https://x',
  location: '',
  remote: false,
  description: '',
  postedAt: new Date().toISOString(),
  fetchedAt: new Date().toISOString(),
  employmentType: 'unknown',
  skills: [],
};

describe('normalize', () => {
  it('returns input array untouched when no fields missing', () => {
    const out = normalizeJobs([sample]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('x');
  });
});

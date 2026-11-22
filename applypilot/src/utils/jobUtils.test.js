import { describe, expect, it } from 'vitest';
import { classifyJobType, compareJobsBySort, isRecommendedJob, resolveSearchRole, sortJobsByFit } from './jobUtils.js';

describe('job feed sorting and recommendations', () => {
  const sort = (jobs, sortBy) => [...jobs].sort((a, b) => compareJobsBySort(a, b, sortBy));

  it('sorts by match score before company name and keeps unknown scores last', () => {
    const jobs = [
      { id: 'unknown', company: 'Google', matchScore: null },
      { id: 'lower', company: 'Example', matchScore: 82 },
      { id: 'higher', company: 'Example', matchScore: 96 },
    ];

    expect(sort(jobs, 'Most Relevant').map((job) => job.id)).toEqual(['higher', 'lower', 'unknown']);
    expect(sort(jobs, 'Highest Match').map((job) => job.id)).toEqual(['higher', 'lower', 'unknown']);
  });

  it('sorts applicant counts numerically, including counts supplied as strings', () => {
    const jobs = [
      { id: 'many', rawJob: { applicantCount: '120' } },
      { id: 'few', rawJob: { applicantCount: '8' } },
      { id: 'unknown' },
    ];

    expect(sort(jobs, 'Fewest Applicants First').map((job) => job.id)).toEqual(['few', 'many', 'unknown']);
  });

  it('sorts scraped relative posting times newest first', () => {
    const jobs = [
      { id: 'older', postedAgo: '2 days ago' },
      { id: 'newer', postedAgo: '1 hour ago' },
    ];

    expect(sort(jobs, 'Newest First').map((job) => job.id)).toEqual(['newer', 'older']);
  });

  it('recognizes normalized scraped employment types', () => {
    expect(classifyJobType({ employmentType: 'full_time', title: 'Engineer' })).toBe('full-time');
    expect(classifyJobType({ employmentType: 'intern', title: 'Engineer' })).toBe('internship');
  });

  it('resolves the same effective role used by scraping when the search is blank', () => {
    expect(resolveSearchRole('', 'Backend Engineer')).toBe('Backend Engineer');
    expect(resolveSearchRole('   ', 'Backend Engineer')).toBe('Backend Engineer');
    expect(resolveSearchRole('   ', '')).toBe('Software Engineer Intern');
    expect(resolveSearchRole('Frontend, Backend')).toBe('Frontend');
  });

  it('puts unknown graduation years after known batches', () => {
    const jobs = [
      { id: 'unknown' },
      { id: '2026', eligibleBatches: ['2026'] },
      { id: '2028', identifiedYear: '2028' },
    ];

    expect(sort(jobs, 'Eligible Batch').map((job) => job.id)).toEqual(['2028', '2026', 'unknown']);
  });

  it('recommends every scored job without a cutoff or role-query fallback', () => {
    expect(isRecommendedJob({ matchScore: 80 })).toBe(true);
    expect(isRecommendedJob({ matchScore: 79 })).toBe(true);
    expect(isRecommendedJob({ matchScore: 79, title: 'Backend Engineer' }, 'Backend Engineer')).toBe(true);
    expect(isRecommendedJob({ matchScore: null })).toBe(false);
    expect(isRecommendedJob({ title: 'Backend Engineer' }, 'Backend Engineer')).toBe(false);
    expect(isRecommendedJob({ title: 'Cook' }, 'Backend Engineer')).toBe(false);
    expect(isRecommendedJob({})).toBe(false);
    expect([{ title: 'Backend Engineer' }].filter(isRecommendedJob)).toEqual([]);
  });

  it('ranks all jobs by fit, keeps ties stable, and puts unscored jobs last', () => {
    const jobs = [
      { id: 'tie-first', matchScore: 80 },
      { id: 'unscored', matchScore: null },
      { id: 'best', matchScore: 96 },
      { id: 'tie-second', matchScore: 80 },
    ];

    expect(sortJobsByFit(jobs).map((job) => job.id)).toEqual([
      'best',
      'tie-first',
      'tie-second',
      'unscored',
    ]);
  });
});

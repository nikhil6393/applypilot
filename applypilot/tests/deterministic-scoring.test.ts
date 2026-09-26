import { describe, it, expect } from 'vitest';
import { calculateDeterministicFitScore } from '../server/scoring/deterministic.js';
import type { ParsedResume, JobPosting } from '../src/types.js';

describe('Deterministic Fit Scoring Engine', () => {
  const mockResume: ParsedResume = {
    name: 'Jane Doe',
    summary: 'Software Engineer specializing in React, TypeScript, and Node.js.',
    contact: {
      email: 'jane@example.com',
      phone: '1234567890',
      location: 'San Francisco, CA',
    },
    education: [
      {
        id: 'edu-1',
        school: 'Stanford University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationDate: '2025',
      },
    ],
    experience: [
      {
        id: 'exp-1',
        role: 'Frontend Engineer Intern',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        dates: '2024 - Present',
        bullets: ['Built responsive UI with React and TypeScript'],
      },
    ],
    skills: {
      languages: ['TypeScript', 'JavaScript', 'Python'],
      frameworks: ['React', 'Node.js', 'Express'],
      tools: ['Git', 'Docker', 'Vite'],
      domain: ['Frontend', 'Full-stack'],
    },
    projects: [
      {
        id: 'proj-1',
        name: 'Portfolio Site',
        description: 'React portfolio built with Vite and Tailwind',
        tech: ['React', 'Tailwind', 'TypeScript'],
        bullets: [],
      },
    ],
    certifications: [],
    target_roles: ['Software Engineer', 'Frontend Engineer'],
    target_keywords: ['React', 'TypeScript', 'Node.js'],
    graduationBatch: '2025',
  };

  // 1. High match test
  const matchingJob: JobPosting = {
    id: 'job-1',
    title: 'Frontend Engineer Intern',
    company: 'Acme Inc',
    location: 'San Francisco, CA',
    isRemote: true,
    source: 'greenhouse',
    sourceUrl: 'https://example.com/jjob-1',
    applyUrl: 'https://example.com/job-1/apply',
    applyType: 'tier-a',
    description:
      'Looking for a Frontend Engineer Intern skilled in React, TypeScript, Node.js, and Git.',
    tags: ['React', 'TypeScript', 'Node.js', 'Frontend'],
    isInternship: true,
    eligibleBatches: ['2025', '2026'],
    postedDate: new Date().toISOString(),
  };

  it('high match test', () => {
    const matchResult = calculateDeterministicFitScore(mockResume, matchingJob);
    expect(matchResult.jobId).toBe('job-1');
    expect(matchResult.fitScore).toBeGreaterThanOrEqual(80);
    expect(matchResult.matchingKeywords).toContain('react');
  });

  // 2. Unrelated job test (non-fabrication)
  const unrelatedJob: JobPosting = {
    id: 'job-2',
    title: 'Senior Petroleum Drilling Engineer',
    company: 'OilCorp',
    location: 'Houston, TX',
    isRemote: false,
    source: 'lever',
    sourceUrl: 'https://example.com/job-2',
    applyUrl: 'https://example.com/job-2/apply',
    applyType: 'tier-c',
    description:
      'Minimum 10 years in offshore drilling operations, reservoir engineering, and geology.',
    tags: ['Drilling', 'Petroleum', 'Geology'],
    isInternship: false,
  };

  it('unrelated job non-fabrication test', () => {
    const unrelatedResult = calculateDeterministicFitScore(mockResume, unrelatedJob);
    expect(unrelatedResult.jobId).toBe('job-2');
    expect(unrelatedResult.fitScore).toBeLessThan(40);
    expect(unrelatedResult.matchingKeywords).toHaveLength(0);
  });
});

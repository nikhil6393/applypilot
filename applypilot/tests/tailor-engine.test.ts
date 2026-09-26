import { describe, it, expect, beforeAll } from 'vitest';
import { tailorResumeForJob } from '../server/profile/tailor-engine.js';
import type { ParsedResume, JobPosting } from '../src/types.js';

describe('Resume Tailoring Engine & Truth Validator', () => {
  beforeAll(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });
  const mockResume: ParsedResume = {
    name: 'Alex Rivera',
    summary: 'Full-stack software developer with experience in React, Node.js, and TypeScript.',
    contact: {
      email: 'alex@example.com',
      phone: '555-0199',
      location: 'Austin, TX',
    },
    education: [
      {
        id: 'edu-1',
        school: 'University of Texas',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationDate: '2024',
      },
    ],
    experience: [
      {
        id: 'exp-1',
        role: 'Software Engineer Intern',
        company: 'DevLab',
        location: 'Austin, TX',
        dates: '2023 - 2024',
        bullets: [
          'Developed RESTful APIs with Node.js and Express',
          'Created interactive frontend dashboards using React and TypeScript',
        ],
      },
    ],
    skills: {
      languages: ['JavaScript', 'TypeScript', 'Python'],
      frameworks: ['React', 'Express', 'Node.js'],
      tools: ['Git', 'Docker'],
      domain: ['Full-stack'],
    },
    projects: [],
    certifications: [],
    target_roles: ['Software Engineer'],
    target_keywords: ['React', 'TypeScript', 'Node.js'],
  };

  const targetJob: JobPosting = {
    id: 'job-tailor-1',
    title: 'Full Stack Engineer',
    company: 'Linear Tech',
    location: 'Remote',
    isRemote: true,
    source: 'ashby',
    sourceUrl: 'https://example.com/linear-job',
    applyUrl: 'https://example.com/linear-job/apply',
    applyType: 'tier-a',
    description:
      'Looking for a Full Stack Engineer experienced in React, TypeScript, and Node.js REST services.',
    tags: ['React', 'TypeScript', 'Node.js', 'Full-stack'],
  };

  it('tailors resume and validates truth', async () => {
    const result = await tailorResumeForJob(mockResume, targetJob);

    expect(result.jobId).toBe('job-tailor-1');
    expect(result.tailoredSummary.length).toBeGreaterThan(10);
    expect(result.tailoredCoverNote.length).toBeGreaterThan(20);
    expect(result.htmlResume).toContain('Alex Rivera');
    expect(result.atsScore).toBeGreaterThanOrEqual(70);

    // Truth check: Ensure no hallucinated "Harvard" or "Google" appears in output
    expect(result.htmlResume).not.toContain('Harvard');
    expect(result.htmlResume).not.toContain('Google');
  });
});

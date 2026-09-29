import { describe, it, expect } from 'vitest';
import {
  tailorResume,
  extractJobKeywords,
  extractCandidateSkills,
  matchSkills,
  canonicalizeSkill,
  areSkillsEquivalent,
} from '../index.js';

describe('Skills Taxonomy & Canonicalization', () => {
  it('maps common aliases to canonical names', () => {
    expect(canonicalizeSkill('k8s')).toBe('Kubernetes');
    expect(canonicalizeSkill('ts')).toBe('TypeScript');
    expect(canonicalizeSkill('react.js')).toBe('React');
    expect(canonicalizeSkill('postgres')).toBe('PostgreSQL');
    expect(canonicalizeSkill('dockerfile')).toBe('Docker');
    expect(canonicalizeSkill('gcp')).toBe('Google Cloud');
    expect(canonicalizeSkill('py')).toBe('Python');
  });

  it('determines skill equivalency correctly', () => {
    expect(areSkillsEquivalent('k8s', 'Kubernetes')).toBe(true);
    expect(areSkillsEquivalent('TypeScript', 'TS')).toBe(true);
    expect(areSkillsEquivalent('React', 'React.js')).toBe(true);
    expect(areSkillsEquivalent('Python', 'Java')).toBe(false);
  });
});

describe('Keyword Extractor', () => {
  it('extracts technical skills from job description text', () => {
    const job = {
      title: 'Senior Frontend Engineer',
      description: 'Looking for experience in React, TypeScript, Tailwind CSS, and Next.js with Docker deployment.',
      tags: ['Frontend', 'Web'],
    };
    const keywords = extractJobKeywords(job);
    expect(keywords).toContain('React');
    expect(keywords).toContain('TypeScript');
    expect(keywords).toContain('Next.js');
    expect(keywords).toContain('Docker');
  });

  it('extracts candidate skills from both array and categorized object shapes', () => {
    const rArray = { skills: ['React', 'TypeScript', 'Node.js'] };
    const rObj = {
      skills: {
        languages: ['Python', 'Go'],
        frameworks: ['Django', 'FastAPI'],
        tools: ['Docker', 'Git'],
      },
    };

    const kArray = extractCandidateSkills(rArray);
    expect(kArray).toContain('React');
    expect(kArray).toContain('TypeScript');

    const kObj = extractCandidateSkills(rObj);
    expect(kObj).toContain('Python');
    expect(kObj).toContain('FastAPI');
    expect(kObj).toContain('Docker');
  });
});

describe('Skill Matcher', () => {
  it('calculates matched, missing, and match percentage', () => {
    const candidateSkills = ['TypeScript', 'React', 'Node.js', 'PostgreSQL'];
    const jobKeywords = ['React', 'TypeScript', 'Kubernetes', 'AWS'];

    const result = matchSkills(candidateSkills, jobKeywords);
    expect(result.matched).toContain('React');
    expect(result.matched).toContain('TypeScript');
    expect(result.missing).toContain('Kubernetes');
    expect(result.missing).toContain('AWS');
    expect(result.matchRate).toBe(50);
  });

  it('recognizes alias matches across candidate and job', () => {
    const candidateSkills = ['TS', 'Postgres'];
    const jobKeywords = ['TypeScript', 'PostgreSQL'];

    const result = matchSkills(candidateSkills, jobKeywords);
    expect(result.matched).toHaveLength(2);
    expect(result.missing).toHaveLength(0);
    expect(result.matchRate).toBe(100);
  });
});

describe('Deterministic Tailoring Engine', () => {
  const sampleResume = {
    name: 'Devin Vance',
    summary: 'Full-stack software engineer with 3 years building web platforms.',
    contact: {
      email: 'devin@example.com',
      phone: '+1 555-0188',
      location: 'San Francisco, CA',
    },
    experience: [
      {
        id: 'exp-1',
        role: 'Software Engineer',
        company: 'CloudFlow',
        dates: '2022 - Present',
        bullets: [
          'Engineered React frontend dashboards serving 20k daily active users.',
          'Built internal tooling using Python scripts.',
          'Architected REST APIs with Node.js and TypeScript, reducing query times by 35%.',
        ],
      },
    ],
    education: [
      { school: 'UC Davis', degree: 'BS Computer Science', graduationDate: '2022' },
    ],
    skills: {
      languages: ['TypeScript', 'JavaScript', 'Python'],
      frameworks: ['React', 'Node.js', 'Express'],
      tools: ['Docker', 'Git'],
    },
  };

  const sampleJob = {
    id: 'job-swe-1',
    title: 'Senior Full Stack Engineer',
    company: 'Stripe',
    description: 'We are seeking an engineer proficient in React, TypeScript, and REST APIs.',
    tags: ['React', 'TypeScript', 'Node.js'],
  };

  it('produces complete tailored result with backward-compatible shape', () => {
    const tailored = tailorResume(sampleResume, sampleJob);

    expect(tailored.jobId).toBe('job-swe-1');
    expect(tailored.status).toBe('completed');
    expect(tailored.source).toBe('deterministic');
    expect(tailored.approved).toBe(true);

    expect(tailored.tailoredSummary).toBeTruthy();
    expect(tailored.tailoredCoverNote).toContain('Stripe');
    expect(tailored.tailoredCoverNote).toContain('Senior Full Stack Engineer');

    expect(tailored.highlightedKeywords.length).toBeGreaterThan(0);
    expect(tailored.atsScore).toBeGreaterThanOrEqual(60);
    expect(tailored.atsScoreBreakdown.overallScore).toBe(tailored.atsScore);

    expect(tailored.htmlResume).toContain('Devin Vance');
    expect(tailored.latexSource).toContain('Devin Vance');
  });

  it('ranks relevant bullets higher without changing text or fabricating facts', () => {
    const tailored = tailorResume(sampleResume, sampleJob);
    const bullets = tailored.tailoredResumeBullets[0].bullets;

    expect(bullets).toHaveLength(3);
    // The bullet with React or TypeScript and 35% metric should be ranked first
    expect(bullets[0]).toContain('TypeScript');
    // None of the bullets should be altered or invented
    for (const b of bullets) {
      expect(sampleResume.experience[0].bullets).toContain(b);
    }
  });

  it('execution is 100% deterministic (identical inputs yield identical outputs)', () => {
    const a = tailorResume(sampleResume, sampleJob);
    const b = tailorResume(sampleResume, sampleJob);

    expect(a.atsScore).toBe(b.atsScore);
    expect(a.tailoredSummary).toBe(b.tailoredSummary);
    expect(a.tailoredCoverNote).toBe(b.tailoredCoverNote);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

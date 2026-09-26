import { describe, it, expect } from 'vitest';
import { computeSkillGapReport } from '../server/scoring/skill-gap.js';
import type { ParsedResume } from '../src/types.js';

describe('Skill-Gap Analysis Engine', () => {
  const mockResume: ParsedResume = {
    name: 'Marcus Vance',
    summary: 'Backend Engineer proficient in Python, SQL, and Docker.',
    contact: {
      email: 'marcus@example.com',
      phone: '555-0188',
      location: 'Seattle, WA',
    },
    education: [
      {
        id: 'edu-1',
        school: 'University of Washington',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationDate: '2024',
      },
    ],
    experience: [
      {
        id: 'exp-1',
        role: 'Backend Intern',
        company: 'CloudSystems',
        location: 'Seattle, WA',
        dates: '2023 - 2024',
        bullets: ['Built Python microservices and optimized PostgreSQL database queries.'],
      },
    ],
    skills: {
      languages: ['Python', 'SQL'],
      frameworks: ['Django', 'FastAPI'],
      tools: ['Docker', 'Git'],
      domain: ['Backend'],
    },
    projects: [],
    certifications: [],
    target_roles: ['Backend Engineer'],
    target_keywords: ['Python', 'SQL'],
  };

  const targetJd = `
    We are seeking a Senior Backend Engineer with deep knowledge of Python, PostgreSQL, and Docker.
    The ideal candidate will also have extensive experience with Kubernetes, AWS, and Redis.
    You will collaborate cross-functionally and lead architecture reviews.
    Bachelor degree in Computer Science or equivalent required.
  `;

  it('computes skill-gap report with accurate match score and verdict', () => {
    const report = computeSkillGapReport(mockResume, targetJd, 'Backend Engineer');

    expect(report).toBeDefined();
    expect(typeof report.overallMatchScore).toBe('number');
    expect(report.overallMatchScore).toBeGreaterThanOrEqual(0);
    expect(report.overallMatchScore).toBeLessThanOrEqual(100);
    expect(['strong_match', 'partial_match', 'significant_gap']).toContain(report.verdict);
  });

  it('identifies matched skills and missing skills correctly', () => {
    const report = computeSkillGapReport(mockResume, targetJd, 'Backend Engineer');

    // Python & Docker are in both resume and JD
    const matchedNames = report.matched.map((m) => m.skill.toLowerCase());
    expect(matchedNames.some((s) => s.includes('python'))).toBe(true);

    // Kubernetes & Redis are in JD but missing from resume
    const missingNames = report.missing.map((m) => m.skill.toLowerCase());
    expect(missingNames.some((s) => s.includes('kubernetes') || s.includes('redis'))).toBe(true);
  });

  it('generates prioritized action items with impact and effort metrics', () => {
    const report = computeSkillGapReport(mockResume, targetJd, 'Backend Engineer');

    expect(Array.isArray(report.actionPlan)).toBe(true);
    if (report.actionPlan.length > 0) {
      const topAction = report.actionPlan[0];
      expect(topAction.rank).toBe(1);
      expect(topAction.gap).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(topAction.impact);
      expect(['high', 'medium', 'low']).toContain(topAction.effort);
      expect(topAction.recommendation.length).toBeGreaterThan(5);
    }
  });

  it('produces category breakdown for technical, seniority, soft skills, and education', () => {
    const report = computeSkillGapReport(mockResume, targetJd, 'Backend Engineer');

    expect(report.categoryBreakdown).toBeDefined();
    expect(report.categoryBreakdown.technical).toBeDefined();
    expect(report.categoryBreakdown.seniority).toBeDefined();
    expect(report.categoryBreakdown.softSkills).toBeDefined();
    expect(report.categoryBreakdown.education).toBeDefined();
  });
});

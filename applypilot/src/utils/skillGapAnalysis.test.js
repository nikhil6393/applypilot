import { describe, expect, it } from 'vitest';
import { createPersonalizedLearningPath, getCandidateSkills, personalizeCompanySkillGaps } from './skillGapAnalysis.js';

describe('personalized skill gap analysis', () => {
  it('uses active resume skills and evidence before falling back to profile data', () => {
    const activeSkills = getCandidateSkills(
      { skills: { frameworks: ['React'] }, projects: [{ description: 'Built an API with Node.js' }] },
      { savedResume: { skills: ['Python'] } },
    );
    const profileFallback = getCandidateSkills({}, { savedResume: { skills: ['Python'] } });

    expect(activeSkills).toEqual(expect.arrayContaining(['React', 'Node.js']));
    expect(activeSkills).not.toContain('Python');
    expect(profileFallback).toContain('Python');
  });

  it('compares advertised skills without claiming gaps when resume evidence is missing', () => {
    const companies = [{
      name: 'Example',
      advertisedSkills: [{ name: 'React', frequency: 2 }, { name: 'AWS', frequency: 1 }],
    }];

    const [personalized] = personalizeCompanySkillGaps(companies, ['React']);
    const [unscored] = personalizeCompanySkillGaps(companies, []);

    expect(personalized).toMatchObject({
      matchPct: 50,
      gapPct: 50,
      matchedSkills: ['React'],
      missingSkills: ['AWS'],
    });
    expect(unscored).toMatchObject({
      matchPct: null,
      gapPct: null,
      matchedCount: 0,
      missingCount: 0,
      missingSkills: [],
    });
  });

  it('builds a bounded learning path with official resources and estimated time', () => {
    const path = createPersonalizedLearningPath([
      { name: 'React', frequency: 4 },
      { name: 'Unlisted Skill', frequency: 1 },
      { name: 'JavaScript', frequency: 1 },
      { name: 'Python', frequency: 1 },
      { name: 'Extra', frequency: 1 },
    ]);

    expect(path).toHaveLength(4);
    expect(path[0]).toMatchObject({
      name: 'React',
      estimatedMinutes: 150,
      resourceUrl: 'https://react.dev/learn',
    });
    expect(path[0].topics).toHaveLength(3);
    expect(path[1].resourceUrl).toBeNull();
    expect(path[1].estimatedMinutes).toBe(90);
  });
});

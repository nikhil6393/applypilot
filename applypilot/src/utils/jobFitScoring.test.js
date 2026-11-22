import { describe, expect, it } from 'vitest';
import { createFitScoringPayload } from './jobFitScoring.js';

describe('createFitScoringPayload', () => {
  it('uses active resume evidence without sending contact or raw resume text', () => {
    const payload = createFitScoringPayload(
      {
        skills: { frameworks: ['React'], languages: ['TypeScript'] },
        target_roles: ['Frontend Engineer'],
        rawText: 'private unparsed resume text',
        contact: { email: 'candidate@example.com' },
        experience: [{ title: 'Developer', bullets: ['Built React apps'] }],
      },
      { roleTitle: 'Backend Engineer', skills: ['Python'] },
      [{ id: 'job-1', title: 'Frontend Engineer', description: 'React and TypeScript' }],
    );

    expect(payload.resume.skills).toEqual(['React', 'TypeScript']);
    expect(payload.resume.targetRoles).toContain('Frontend Engineer');
    expect(JSON.stringify(payload)).not.toContain('candidate@example.com');
    expect(JSON.stringify(payload)).not.toContain('private unparsed resume text');
  });

  it('falls back to profile evidence and includes explicit work preferences', () => {
    const payload = createFitScoringPayload(
      { skills: { frameworks: [] }, experience: [], projects: [] },
      {
        roleTitle: 'Data Engineer',
        skills: ['Python'],
        preferences: { location: 'Toronto', workplaceType: 'Hybrid' },
      },
      [{ id: 'job-2', title: 'Data Engineer' }],
      { jobType: 'Internship' },
    );

    expect(payload.resume.skills).toEqual(['Python']);
    expect(payload.resume.targetRoles).toContain('Data Engineer');
    expect(payload.preferences).toEqual({
      preferredLocations: ['Toronto'],
      preferredWorkplace: 'hybrid',
      preferredEmploymentTypes: ['internship'],
    });
  });
});

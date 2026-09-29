import { describe, it, expect } from 'vitest';
import { evaluateResumeWorded, POWER_VERBS, WEAK_OPENERS } from '../../src/lib/resumeWordedScorer.js';

describe('Resume Worded Scorer Engine', () => {
  it('correctly exports power verbs and weak openers', () => {
    expect(POWER_VERBS.length).toBeGreaterThan(50);
    expect(POWER_VERBS).toContain('spearheaded');
    expect(POWER_VERBS).toContain('architected');
    expect(POWER_VERBS).toContain('engineered');
    expect(WEAK_OPENERS.length).toBeGreaterThanOrEqual(4);
  });

  it('evaluates weak opener and flags critical impact issue with suggested power verb fixes', () => {
    const mockResume = {
      contact: { name: 'John Doe', email: 'john@example.com', phone: '555-0199' },
      summary: 'Experienced software engineer specializing in distributed systems.',
      skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
      education: [{ school: 'MIT', degree: 'B.S. CS', graduationDate: '2022' }],
      experience: [
        {
          company: 'Acme Corp',
          title: 'Software Engineer',
          bullets: [
            'Responsible for maintaining legacy backend APIs and databases.',
            'Engineered event-driven pipeline reducing latency by 45% across 20 services.'
          ]
        }
      ]
    };

    const result = evaluateResumeWorded(mockResume);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.pillars).toBeDefined();
    expect(result.pillars.impact).toBeDefined();
    expect(result.pillars.brevity).toBeDefined();
    expect(result.pillars.style).toBeDefined();
    expect(result.pillars.skills).toBeDefined();

    // Check that "Responsible for" was flagged
    const weakVerbIssue = result.issues.find((i) => i.id.startsWith('impact-weak-verb'));
    expect(weakVerbIssue).toBeDefined();
    expect(weakVerbIssue.severity).toBe('critical');
    expect(weakVerbIssue.why).toContain('Recruiters');
    expect(weakVerbIssue.suggestedFixes.length).toBeGreaterThanOrEqual(2);
    expect(weakVerbIssue.suggestedMetricFix).toBeDefined();
  });

  it('detects first-person pronouns in summary and flags style issue', () => {
    const mockResume = {
      contact: { name: 'Alice Smith', email: 'alice@test.dev' },
      summary: 'I am a passionate developer and my goal is to build web apps.',
      skills: ['JavaScript'],
      experience: []
    };

    const result = evaluateResumeWorded(mockResume);
    const pronounIssue = result.issues.find((i) => i.id === 'style-pronoun-summary');
    expect(pronounIssue).toBeDefined();
    expect(pronounIssue.severity).toBe('critical');
  });

  it('evaluates targeted skills matching against a job description', () => {
    const mockResume = {
      skills: ['Python', 'Docker', 'Kubernetes'],
      experience: []
    };

    const jd = 'We are seeking a Python engineer with extensive Docker and Kubernetes experience in AWS.';
    const result = evaluateResumeWorded(mockResume, jd);
    expect(result.pillars.skills).toBeGreaterThanOrEqual(60);
  });
});

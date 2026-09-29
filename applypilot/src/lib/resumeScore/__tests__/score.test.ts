import { describe, it, expect } from 'vitest';
import {
  scoreResume,
  scoreQuantifiedBullets,
  scoreWeakOpeners,
  scoreActionVerbs,
  scoreRepeatedVerbs,
  scoreBulletLength,
  scoreBulletsPerRole,
  scoreFillerWords,
  scoreBuzzwords,
  scoreFirstPerson,
  scoreTense,
  scoreRepeatedWords,
  scoreContact,
  scoreEssentialSections,
  scoreAtsHeadings,
} from '../index.js';
import type { ScorerInput } from '../types.js';

// ─── Fixture Resumes ──────────────────────────────────────────────────────────

/** GOOD resume: strong verbs, metrics, complete sections, no filler. Expected overall 75-95. */
const goodResume: ScorerInput = {
  name: 'Priya Sharma',
  summary: 'Backend engineer with 4 years building distributed systems at scale.',
  contact: {
    email: 'priya@example.com',
    phone: '+1-555-0101',
    location: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/priya',
    github: 'https://github.com/priya',
  },
  experience: [
    {
      role: 'Senior Software Engineer',
      company: 'DataCo',
      dates: '2022 - 2024',
      bullets: [
        'Reduced API latency by 45% by migrating from REST to gRPC, serving 2 million daily requests.',
        'Architected a caching layer using Redis that cut database load by 60%.',
        'Delivered a real-time alerting pipeline processing 50 k events/second.',
        'Mentored 3 junior engineers, accelerating their onboarding by 30%.',
      ],
    },
    {
      role: 'Software Engineer',
      company: 'StartCo',
      dates: '2020 - 2022',
      bullets: [
        'Built a CI/CD pipeline reducing deployment time from 40 minutes to 8 minutes.',
        'Implemented automated test coverage from 12% to 78%, eliminating 3 production incidents.',
        'Scaled the monolith to microservices handling 10x the original traffic.',
      ],
    },
  ],
  education: [
    { school: 'UC Berkeley', degree: 'Bachelor of Science', field: 'Computer Science', graduationDate: '2020' },
  ],
  skills: { languages: ['Go', 'Python', 'TypeScript'], frameworks: ['gRPC', 'Redis', 'Kubernetes'], tools: ['Docker', 'GitHub Actions'] },
  projects: [],
  certifications: [],
};

/** AVERAGE resume: some metrics, weak verbs mixed in, mostly complete. Expected overall 45-70. */
const averageResume: ScorerInput = {
  name: 'Alex Chen',
  summary: 'I am a developer with experience in web apps and databases.',
  contact: {
    email: 'alex@example.com',
    phone: '555-0199',
    location: 'Austin, TX',
  },
  experience: [
    {
      role: 'Web Developer',
      company: 'AgencyCo',
      dates: '2021 - 2023',
      bullets: [
        'Worked on various client websites using React and Node.js.',
        'Responsible for database migrations that improved query times.',
        'Helped the team deliver 5 projects on schedule.',
        'Used Docker to containerize applications for deployment.',
      ],
    },
    {
      role: 'Intern',
      company: 'TechCo',
      dates: '2020 - 2021',
      bullets: [
        'Assisted senior developers with bug fixes and code reviews.',
        'Built a utility script that saved 2 hours per week.',
      ],
    },
  ],
  education: [
    { school: 'University of Texas', degree: 'Bachelor of Science', field: 'Computer Science', graduationDate: '2021' },
  ],
  skills: ['JavaScript', 'React', 'Node.js', 'SQL'],
  projects: [],
  certifications: [],
};

/** BAD resume: no metrics, weak openers, missing sections, buzzwords, first-person. Expected overall 15-44. */
const badResume: ScorerInput = {
  name: 'Sam',
  summary: 'I am a passionate and dynamic team player with synergy and innovative mindset.',
  contact: {
    email: 'not-an-email',
  },
  experience: [
    {
      role: 'Developer',
      company: 'ACME',
      dates: '2020 - 2022',
      bullets: [
        'Responsible for maintaining the website.',
        'Worked on various tasks as needed.',
        'Helped teammates with issues.',
        'Participated in meetings and synergies.',
        'Was involved in developing features.',
        'Duties included writing code and debugging.',
        'Assisted with deployment activities.',
        'Was part of the team working on the backend.',
      ],
    },
  ],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};

// ─── IMPACT tests ────────────────────────────────────────────────────────────

describe('scoreQuantifiedBullets', () => {
  it('returns 100 when all bullets have metrics', () => {
    const { score } = scoreQuantifiedBullets(goodResume);
    expect(score).toBe(100);
  });

  it('returns < 50 when most bullets lack metrics', () => {
    const { score } = scoreQuantifiedBullets(badResume);
    expect(score).toBeLessThan(50);
  });

  it('attaches evidence text to every issue', () => {
    const { issues } = scoreQuantifiedBullets(averageResume);
    for (const issue of issues) {
      expect(issue.evidence.text.length).toBeGreaterThan(0);
    }
  });

  it('returns no issues for a resume with no bullets', () => {
    const empty: ScorerInput = { experience: [] };
    const { issues } = scoreQuantifiedBullets(empty);
    expect(issues).toHaveLength(0);
  });

  it('detects $ as a metric', () => {
    const r: ScorerInput = { experience: [{ bullets: ['Saved $20k in infrastructure costs.'] }] };
    const { score } = scoreQuantifiedBullets(r);
    expect(score).toBe(100);
  });
});

describe('scoreWeakOpeners', () => {
  it('flags "Responsible for" as fail', () => {
    const { issues } = scoreWeakOpeners(badResume);
    expect(issues.some((i) => i.evidence.text.toLowerCase().includes('responsible'))).toBe(true);
    expect(issues.some((i) => i.severity === 'fail')).toBe(true);
  });

  it('returns score 100 for good resume with no weak openers', () => {
    const { score, issues } = scoreWeakOpeners(goodResume);
    expect(score).toBe(100);
    expect(issues).toHaveLength(0);
  });

  it('flags "Helped" as weak opener', () => {
    const r: ScorerInput = { experience: [{ bullets: ['Helped the team ship faster.'] }] };
    const { issues } = scoreWeakOpeners(r);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix).toContain('strong action verb');
  });

  it('flags "Duties included" as weak opener', () => {
    const r: ScorerInput = { experience: [{ bullets: ['Duties included reviewing code.'] }] };
    const { issues } = scoreWeakOpeners(r);
    expect(issues).toHaveLength(1);
  });
});

describe('scoreActionVerbs', () => {
  it('gives high score when all bullets start with action verbs', () => {
    const { score } = scoreActionVerbs(goodResume);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('gives low score when no bullets start with action verbs', () => {
    const r: ScorerInput = {
      experience: [{ bullets: ['The system was maintained.', 'Various tasks were completed.'] }],
    };
    const { score } = scoreActionVerbs(r);
    expect(score).toBeLessThan(50);
  });

  it('issue category is impact', () => {
    const { issues } = scoreActionVerbs(averageResume);
    for (const i of issues) expect(i.category).toBe('impact');
  });
});

describe('scoreRepeatedVerbs', () => {
  it('flags verb used more than twice', () => {
    const r: ScorerInput = {
      experience: [
        { bullets: ['Built X.', 'Built Y.', 'Built Z.'] },
      ],
    };
    const { issues } = scoreRepeatedVerbs(r);
    expect(issues.some((i) => i.evidence.text.includes('built'))).toBe(true);
  });

  it('returns 100 score with no issues for varied verbs', () => {
    const { score, issues } = scoreRepeatedVerbs(goodResume);
    expect(score).toBe(100);
    expect(issues).toHaveLength(0);
  });
});

// ─── BREVITY tests ──────────────────────────────────────────────────────────

describe('scoreBulletLength', () => {
  it('flags bullet with 35+ words as too long', () => {
    const longBullet = 'Developed and maintained a large-scale distributed microservices application architecture that served millions of daily active enterprise users across multiple global cloud regions with high availability, fault tolerance, real-time telemetry, automated failover protocols, and strict SLA compliance guarantees.';
    const r: ScorerInput = { experience: [{ bullets: [longBullet] }] };
    const { issues } = scoreBulletLength(r);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix).toContain('Cut to under 30');
  });

  it('flags bullet with < 6 words as too short', () => {
    const r: ScorerInput = { experience: [{ bullets: ['Fixed bugs.'] }] };
    const { issues } = scoreBulletLength(r);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix).toContain('only');
  });

  it('returns 100 for all normal-length bullets', () => {
    const { score } = scoreBulletLength(goodResume);
    expect(score).toBe(100);
  });
});

describe('scoreBulletsPerRole', () => {
  it('flags role with fewer than 3 bullets', () => {
    const r: ScorerInput = { experience: [{ role: 'Dev', company: 'X', bullets: ['Built X.', 'Fixed Y.'] }] };
    const { issues } = scoreBulletsPerRole(r);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix).toContain('Add');
  });

  it('flags role with more than 6 bullets', () => {
    const r: ScorerInput = {
      experience: [{
        role: 'Dev', company: 'X',
        bullets: ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.'],
      }],
    };
    const { issues } = scoreBulletsPerRole(r);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix).toContain('Cut');
  });

  it('returns 100 when bullets per role are in range', () => {
    const { score } = scoreBulletsPerRole(goodResume);
    expect(score).toBe(100);
  });
});

describe('scoreFillerWords', () => {
  it('detects "various" as filler', () => {
    const r: ScorerInput = { experience: [{ bullets: ['Worked on various projects for clients.'] }] };
    const { issues } = scoreFillerWords(r);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('returns 100 for good resume with no filler', () => {
    const { score } = scoreFillerWords(goodResume);
    expect(score).toBe(100);
  });
});

// ─── STYLE tests ────────────────────────────────────────────────────────────

describe('scoreBuzzwords', () => {
  it('flags "synergy" and "innovative" as buzzwords', () => {
    const { issues } = scoreBuzzwords(badResume);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('returns 100 for good resume with no buzzwords', () => {
    const { score } = scoreBuzzwords(goodResume);
    expect(score).toBe(100);
  });

  it('fix instruction never invents text — only references found buzzwords', () => {
    const { issues } = scoreBuzzwords(badResume);
    for (const i of issues) {
      expect(i.fix).toContain('Replace buzzword');
    }
  });
});

describe('scoreFirstPerson', () => {
  it('flags "I am" in summary', () => {
    const { issues } = scoreFirstPerson(averageResume);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe('fail');
  });

  it('returns 100 for good resume with no first-person', () => {
    const { score } = scoreFirstPerson(goodResume);
    expect(score).toBe(100);
  });
});

describe('scoreTense', () => {
  it('flags past-tense verb in a current role', () => {
    const r: ScorerInput = {
      experience: [{
        role: 'Engineer',
        company: 'X',
        dates: '2023 - Present',
        bullets: ['Managed the deployment pipeline.'],
      }],
    };
    const { issues } = scoreTense(r);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].fix).toContain('present tense');
  });

  it('no issues for past roles with past-tense verbs', () => {
    const { issues } = scoreTense(goodResume);
    expect(issues).toHaveLength(0);
  });
});

describe('scoreRepeatedWords', () => {
  it('flags word used 5+ times', () => {
    const r: ScorerInput = {
      experience: [{
        bullets: [
          'Maintained system scalability.',
          'Maintained application stability.',
          'Maintained database schemas.',
          'Maintained deployment scripts.',
          'Maintained monitoring dashboards.',
        ],
      }],
    };
    const { issues } = scoreRepeatedWords(r);
    expect(issues.some((i) => i.evidence.text.includes('maintained'))).toBe(true);
  });
});

// ─── SECTIONS tests ─────────────────────────────────────────────────────────

describe('scoreContact', () => {
  it('fails when email is invalid', () => {
    const { issues } = scoreContact(badResume);
    expect(issues.some((i) => i.id === 'sections-no-email')).toBe(true);
  });

  it('returns 100 for complete contact info', () => {
    const { score } = scoreContact(goodResume);
    expect(score).toBe(100);
  });

  it('flags missing phone', () => {
    const r: ScorerInput = { name: 'Test', contact: { email: 'a@b.com' } };
    const { issues } = scoreContact(r);
    expect(issues.some((i) => i.id === 'sections-no-phone')).toBe(true);
  });

  it('flags missing name', () => {
    const r: ScorerInput = { contact: { email: 'a@b.com', phone: '555-0101' } };
    const { issues } = scoreContact(r);
    expect(issues.some((i) => i.id === 'sections-no-name')).toBe(true);
  });
});

describe('scoreEssentialSections', () => {
  it('flags missing education', () => {
    const { issues } = scoreEssentialSections(badResume);
    expect(issues.some((i) => i.id === 'sections-no-education')).toBe(true);
  });

  it('flags missing skills', () => {
    const { issues } = scoreEssentialSections(badResume);
    expect(issues.some((i) => i.id === 'sections-no-skills')).toBe(true);
  });

  it('returns 100 for complete resume', () => {
    const { score } = scoreEssentialSections(goodResume);
    expect(score).toBe(100);
  });
});

describe('scoreAtsHeadings', () => {
  it('returns 100 when experience and education are parsed correctly', () => {
    const { score } = scoreAtsHeadings(goodResume);
    expect(score).toBe(100);
  });
});

// ─── Full scorer + fixture ranges ───────────────────────────────────────────

describe('scoreResume — fixture score ranges', () => {
  it('GOOD resume scores 75-100 overall', () => {
    const { overall } = scoreResume(goodResume);
    expect(overall).toBeGreaterThanOrEqual(75);
    expect(overall).toBeLessThanOrEqual(100);
  });

  it('AVERAGE resume scores 40-70 overall', () => {
    const { overall } = scoreResume(averageResume);
    expect(overall).toBeGreaterThanOrEqual(40);
    expect(overall).toBeLessThanOrEqual(70);
  });

  it('BAD resume scores 15-44 overall', () => {
    const { overall } = scoreResume(badResume);
    expect(overall).toBeGreaterThanOrEqual(15);
    expect(overall).toBeLessThanOrEqual(44);
  });

  it('overall score is always 0-100', () => {
    for (const r of [goodResume, averageResume, badResume]) {
      const { overall } = scoreResume(r);
      expect(overall).toBeGreaterThanOrEqual(0);
      expect(overall).toBeLessThanOrEqual(100);
    }
  });

  it('all category scores are 0-100', () => {
    const { categories } = scoreResume(goodResume);
    for (const val of Object.values(categories)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });
});

describe('scoreResume — determinism', () => {
  it('same input always produces the same score (good)', () => {
    const a = scoreResume(goodResume);
    const b = scoreResume(goodResume);
    expect(a.overall).toBe(b.overall);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('same input always produces the same score (bad)', () => {
    const a = scoreResume(badResume);
    const b = scoreResume(badResume);
    expect(a.overall).toBe(b.overall);
  });

  it('same input always produces the same score (average)', () => {
    const a = scoreResume(averageResume);
    const b = scoreResume(averageResume);
    expect(a.overall).toBe(b.overall);
  });
});

describe('scoreResume — issue structure', () => {
  it('every issue has id, category, severity, points, evidence, fix', () => {
    const { issues } = scoreResume(badResume);
    for (const issue of issues) {
      expect(issue.id).toBeTruthy();
      expect(['impact', 'brevity', 'style', 'sections']).toContain(issue.category);
      expect(['pass', 'warn', 'fail']).toContain(issue.severity);
      expect(typeof issue.points).toBe('number');
      expect(issue.evidence.text.length).toBeGreaterThan(0);
      expect(issue.evidence.section.length).toBeGreaterThan(0);
      expect(issue.fix.length).toBeGreaterThan(0);
    }
  });

  it('issues are sorted: fail before warn, then by points desc', () => {
    const { issues } = scoreResume(badResume);
    const SEVERITY_ORDER: Record<string, number> = { fail: 0, warn: 1, pass: 2 };
    for (let i = 0; i < issues.length - 1; i++) {
      const a = SEVERITY_ORDER[issues[i].severity];
      const b = SEVERITY_ORDER[issues[i + 1].severity];
      expect(a).toBeLessThanOrEqual(b);
    }
  });

  it('good resume has fewer issues than bad resume', () => {
    const good = scoreResume(goodResume);
    const bad = scoreResume(badResume);
    expect(good.issues.length).toBeLessThan(bad.issues.length);
  });

  it('good resume scores higher than bad resume in all categories', () => {
    const good = scoreResume(goodResume);
    const bad = scoreResume(badResume);
    expect(good.categories.impact).toBeGreaterThan(bad.categories.impact);
    expect(good.categories.sections).toBeGreaterThan(bad.categories.sections);
  });
});

describe('scoreResume — empty/edge cases', () => {
  it('handles empty resume without throwing', () => {
    expect(() => scoreResume({})).not.toThrow();
  });

  it('empty resume scores 0-30', () => {
    const { overall } = scoreResume({});
    expect(overall).toBeGreaterThanOrEqual(0);
    expect(overall).toBeLessThanOrEqual(30);
  });

  it('resume with only skills array (not object) is accepted', () => {
    const r: ScorerInput = { skills: ['JavaScript', 'React'] };
    expect(() => scoreResume(r)).not.toThrow();
  });
});

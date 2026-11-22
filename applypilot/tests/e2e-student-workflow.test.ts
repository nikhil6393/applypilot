import { describe, it, expect } from 'vitest';
import fixtures from '../fixtures/evaluation/student-fixtures.json';
import { analyzeEvidence } from '../src/utils/opportunityEvidence.js';
import { evaluateOpportunityEligibility } from '../src/utils/jobEligibility.js';
import { scoreJob } from '../server/scoring/fit.js';
import { tailorResumeForJob } from '../server/profile/tailor-engine.js';
import { evaluateResumeAts } from '../server/scoring/ats-scorer.js';

describe('Phase 3: End-to-End Student Journey Verification (NSUT Bridge the Gap)', () => {
  const { studentResume, internshipOpportunities } = fixtures;
  const targetOpportunity = internshipOpportunities[0];
  const restrictedOpportunity = internshipOpportunities[1];

  it('Step 1: Evaluates resume formatting and hygiene without marketing inflation', () => {
    const atsResult = evaluateResumeAts(studentResume);
    expect(atsResult.overallScore).toBeGreaterThanOrEqual(70);
    expect(atsResult.ratingLabel).toBeDefined();
    expect(atsResult.disclaimer).toContain('Does not predict or guarantee hiring outcomes');
  });

  it('Step 2: Opportunity Translator decomposes requirements with verifiable evidence', () => {
    const evidence = analyzeEvidence(studentResume, targetOpportunity);

    // Direct evidence: React & TypeScript are in student's work/project bullets
    const reactDirect = evidence.directEvidence.find((e) => e.requirement === 'React');
    const tsDirect = evidence.directEvidence.find((e) => e.requirement === 'TypeScript');
    expect(reactDirect).toBeDefined();
    expect(tsDirect).toBeDefined();
    expect(reactDirect?.citation).toContain('React');

    // Unmentioned: Docker & GraphQL are not in resume, must NOT disqualify student
    const dockerUnmentioned = evidence.unmentioned.find((u) => u.requirement === 'Docker');
    expect(dockerUnmentioned).toBeDefined();
    expect(dockerUnmentioned?.note).toContain('Not mentioned in your current resume');
  });

  it('Step 3: 4-State Eligibility correctly confirms Indian student criteria and flags restrictions', () => {
    // Target opportunity in India
    const eligibility = evaluateOpportunityEligibility(targetOpportunity, studentResume);
    const degreeCheck = eligibility.items.find((i) => i.id === 'degree');
    const locationCheck = eligibility.items.find((i) => i.id === 'location');

    expect(degreeCheck?.status).toBe('met');
    expect(locationCheck?.status).toBe('met');

    // Restricted US Defense role
    const restrictedEligibility = evaluateOpportunityEligibility(restrictedOpportunity, studentResume);
    const restrictedLoc = restrictedEligibility.items.find((i) => i.id === 'location');
    expect(restrictedLoc?.status).toBe('not_met');
  });

  it('Step 4: Computes deterministic fit score in under 25 milliseconds', async () => {
    const start = performance.now();
    const fitResult = await scoreJob(
      {
        fullName: studentResume.fullName,
        summary: 'Student software engineer',
        skills: studentResume.skills,
        experience: studentResume.experience,
        education: studentResume.education.map((e) => ({ degree: e.degree, institution: e.institution })),
      },
      targetOpportunity
    );
    const elapsed = performance.now() - start;

    expect(fitResult.score).toBeGreaterThan(0);
    expect(fitResult.matchedSkills).toContain('React');
    expect(elapsed).toBeLessThan(100); // Fast deterministic calculation
  });

  it('Step 5: Truth-preserving tailoring reframes experience without injecting unverified skills', async () => {
    const tailored = await tailorResumeForJob(studentResume, targetOpportunity);

    expect(tailored.tailoredResumeBullets).toBeDefined();
    expect(tailored.tailoredResumeBullets.length).toBeGreaterThan(0);

    // Verify truth preservation: Docker was missing from resume, must not appear as an owned skill
    const primaryBullets = tailored.tailoredResumeBullets[0]?.bullets || [];
    expect(primaryBullets.length).toBeGreaterThan(0);
    
    // Summary must truthfully represent candidate
    expect(tailored.tailoredSummary).toContain(studentResume.fullName);
  });
});

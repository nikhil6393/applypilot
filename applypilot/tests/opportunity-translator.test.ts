import { describe, it, expect } from 'vitest';
import { analyzeEvidence, extractJobRequirements } from '../src/utils/opportunityEvidence.js';
import { evaluateOpportunityEligibility } from '../src/utils/jobEligibility.js';

describe('Opportunity Evidence & Translation Engine (NSUT Bridge the Gap)', () => {
  const sampleResume = {
    fullName: 'Rahul Sharma',
    skills: ['Python', 'JavaScript', 'HTML', 'CSS', 'SQL'],
    experience: [
      {
        company: 'Campus Lab',
        title: 'Software Intern',
        bullets: [
          'Engineered a real-time data ingestion dashboard using Python and Flask.',
          'Built responsive frontends with HTML, CSS, and vanilla JavaScript.',
        ],
      },
    ],
    projects: [
      {
        name: 'Distributed Scraper',
        description: 'Built a multi-worker web crawler using Python with automated retries.',
      },
    ],
    education: [
      {
        degree: 'B.Tech in Computer Science and Engineering',
        institution: 'Netaji Subhas University of Technology (NSUT)',
        year: '2026',
      },
    ],
  };

  const sampleJob = {
    id: 'job_sample_1',
    title: 'Software Development Engineering Intern',
    company: 'TechCorp India',
    location: 'Bengaluru, India',
    isInternship: true,
    skills: ['Python', 'SQL', 'Docker', 'REST APIs'],
    description: 'Looking for a Software Engineering Intern to build backend microservices with Python, REST APIs, and Docker. Bachelor degree in CS or related field required.',
  };

  it('extracts combined explicit and text-based job requirements accurately', () => {
    const reqs = extractJobRequirements(sampleJob);
    expect(reqs).toContain('Python');
    expect(reqs).toContain('Docker');
    expect(reqs).toContain('REST APIs');
  });

  it('correctly classifies direct evidence from work experience and projects', () => {
    const report = analyzeEvidence(sampleResume, sampleJob);
    
    // Python is in experience bullets -> direct evidence
    const pythonEv = report.directEvidence.find((e) => e.requirement === 'Python');
    expect(pythonEv).toBeDefined();
    expect(pythonEv?.status).toBe('direct');
    expect(pythonEv?.citation).toContain('Python');

    // SQL is in skills list but not in experience bullets -> partial evidence
    const sqlEv = report.partialEvidence.find((p) => p.requirement === 'SQL');
    expect(sqlEv).toBeDefined();
    expect(sqlEv?.status).toBe('partial');

    // Docker is in job requirements but completely absent from resume -> unmentioned
    const dockerEv = report.unmentioned.find((u) => u.requirement === 'Docker');
    expect(dockerEv).toBeDefined();
    expect(dockerEv?.status).toBe('unmentioned');
    // Rule: Unmentioned must not imply candidate does not know it
    expect(dockerEv?.note).toContain('Not mentioned in your current resume');
  });

  it('evaluates comprehensive 4-state eligibility without fabricating claims', () => {
    const eligibility = evaluateOpportunityEligibility(sampleJob, sampleResume);
    expect(eligibility.items).toHaveLength(4);

    const degreeItem = eligibility.items.find((i) => i.id === 'degree');
    expect(degreeItem?.status).toBe('met');
    expect(degreeItem?.evidence).toContain('B.Tech');

    const batchItem = eligibility.items.find((i) => i.id === 'batch');
    expect(batchItem?.status).toBe('met');

    const locationItem = eligibility.items.find((i) => i.id === 'location');
    expect(locationItem?.status).toBe('met'); // Bengaluru, India position
  });

  it('correctly flags restricted US-only jobs as not_met for Indian students', () => {
    const restrictedJob = {
      title: 'Junior Software Engineer',
      company: 'US Defense Contracting Co',
      location: 'Washington, DC, USA',
      description: 'Must be a US Citizen. No visa sponsorship provided. Requires active security clearance.',
    };

    const eligibility = evaluateOpportunityEligibility(restrictedJob, sampleResume);
    const locationItem = eligibility.items.find((i) => i.id === 'location');
    expect(locationItem?.status).toBe('not_met');
  });

  it('returns needs_confirmation when degree requirement is present but omitted from candidate resume', () => {
    const resumeNoEdu = {
      fullName: 'Anonymous Student',
      skills: ['Python'],
    };

    const eligibility = evaluateOpportunityEligibility(sampleJob, resumeNoEdu);
    const degreeItem = eligibility.items.find((i) => i.id === 'degree');
    expect(degreeItem?.status).toBe('needs_confirmation');
  });
});

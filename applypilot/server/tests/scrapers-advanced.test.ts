import { describe, it, expect } from 'vitest';
import { isJobLocationMatch, getGeoScope, normalizeLocationString } from '../scrape/geo-resolver.js';
import {
  validateJobPosting,
  isJobRoleMatch,
  isJobTypeMatch,
  filterJobsStrict,
} from '../scrape/validator.js';
import type { JobPosting } from '../../shared/types.js';

describe('Geo-Resolver: Hierarchical Multi-Location Matching', () => {
  it('matches Indian tech hubs to "India" searches', () => {
    expect(isJobLocationMatch('Bengaluru, Karnataka', 'India')).toBe(true);
    expect(isJobLocationMatch('Bangalore Urban, India', 'India')).toBe(true);
    expect(isJobLocationMatch('Hyderabad, Telangana', 'India')).toBe(true);
    expect(isJobLocationMatch('Pune, Maharashtra', 'India')).toBe(true);
    expect(isJobLocationMatch('Gurugram, Haryana', 'India')).toBe(true);
    expect(isJobLocationMatch('Noida, Uttar Pradesh', 'India')).toBe(true);
    expect(isJobLocationMatch('Chennai, Tamil Nadu', 'India')).toBe(true);
    expect(isJobLocationMatch('Mumbai, MH', 'India')).toBe(true);
  });

  it('matches specific city queries precisely', () => {
    expect(isJobLocationMatch('Bengaluru, Karnataka, India', 'Bangalore')).toBe(true);
    expect(isJobLocationMatch('Bangalore, India', 'Bengaluru')).toBe(true);
    expect(isJobLocationMatch('Hyderabad, Telangana', 'Hyderabad')).toBe(true);
    expect(isJobLocationMatch('Pune, Maharashtra', 'Pune')).toBe(true);
    expect(isJobLocationMatch('San Francisco, CA', 'San Francisco')).toBe(true);
  });

  it('does not falsely match unrelated cities or countries', () => {
    expect(isJobLocationMatch('London, UK', 'India')).toBe(false);
    expect(isJobLocationMatch('Tokyo, Japan', 'United States')).toBe(false);
    expect(isJobLocationMatch('Berlin, Germany', 'Bangalore')).toBe(false);
  });

  it('handles Remote and Worldwide scopes gracefully', () => {
    expect(isJobLocationMatch('Remote - Worldwide', 'India')).toBe(true);
    expect(isJobLocationMatch('Fully Remote', 'Worldwide')).toBe(true);
    expect(isJobLocationMatch('Bengaluru, India', 'Worldwide')).toBe(true);
    expect(isJobLocationMatch('San Francisco, CA', '')).toBe(true);
  });

  it('correctly maps US tech hubs to US queries', () => {
    expect(isJobLocationMatch('San Francisco, CA', 'United States')).toBe(true);
    expect(isJobLocationMatch('New York, NY', 'USA')).toBe(true);
    expect(isJobLocationMatch('Seattle, WA', 'US')).toBe(true);
    expect(isJobLocationMatch('Austin, Texas', 'United States')).toBe(true);
  });
});

describe('Validator: Expanded Student & Internship Role Classification', () => {
  it('identifies Graduate Engineer Trainee as an internship/early-career role', () => {
    expect(isJobTypeMatch('Graduate Engineer Trainee - Software', 'internship')).toBe(true);
  });

  it('identifies Associate SDE and Campus titles as student/early career', () => {
    expect(isJobTypeMatch('Associate SDE - Campus Hiring 2026', 'internship')).toBe(true);
    expect(isJobTypeMatch('Software Engineer Apprentice', 'internship')).toBe(true);
    expect(isJobTypeMatch('Machine Learning Fellow', 'internship')).toBe(true);
  });

  it('validates new job sources: internshala, unstop, simplify_jobs, linkedin_dork', () => {
    const internshalaJob = {
      id: 'ishala_101',
      title: 'Full Stack Web Development Intern',
      company: 'TechFlow Systems',
      source: 'internshala' as const,
      url: 'https://internshala.com/internship/detail/web-dev-intern-101',
      applyUrl: 'https://internshala.com/internship/detail/web-dev-intern-101',
      location: 'Bengaluru, India',
    };
    expect(validateJobPosting(internshalaJob).valid).toBe(true);

    const unstopJob = {
      id: 'unstop_202',
      title: 'Software Developer Intern - Campus Drive',
      company: 'Groww',
      source: 'unstop' as const,
      url: 'https://unstop.com/jobs/software-developer-intern-groww-202',
      applyUrl: 'https://unstop.com/jobs/software-developer-intern-groww-202',
      location: 'Bangalore',
    };
    expect(validateJobPosting(unstopJob).valid).toBe(true);

    const simplifyJob = {
      id: 'simp_303',
      title: 'Software Engineering Intern Summer 2026',
      company: 'Databricks',
      source: 'simplify_jobs' as const,
      url: 'https://databricks.com/company/careers/open-positions/job?gh_jid=303',
      applyUrl: 'https://databricks.com/company/careers/open-positions/job?gh_jid=303',
      location: 'San Francisco, CA',
    };
    expect(validateJobPosting(simplifyJob).valid).toBe(true);
  });

  it('multi-query comma splitting works for role matching', () => {
    expect(isJobRoleMatch('Senior React Frontend Developer', 'node, react')).toBe(true);
    expect(isJobRoleMatch('Backend Go Systems Engineer', 'frontend, golang, backend')).toBe(true);
    expect(isJobRoleMatch('Data Science Intern', 'react, vue')).toBe(false);
  });
});

describe('Strict Filtering Pipeline with Geo & Role Matching', () => {
  const sampleJobs: JobPosting[] = [
    {
      id: '1',
      title: 'Graduate Engineer Trainee',
      company: 'TCS Digital',
      location: 'Bengaluru, Karnataka',
      source: 'unstop',
      url: 'https://unstop.com/jobs/get-tcs-1',
      applyUrl: 'https://unstop.com/jobs/get-tcs-1',
      isInternship: true,
      postedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      title: 'Frontend Engineer',
      company: 'Spotify',
      location: 'London, UK',
      source: 'greenhouse',
      url: 'https://boards.greenhouse.io/spotify/jobs/2',
      applyUrl: 'https://boards.greenhouse.io/spotify/jobs/2',
      isInternship: false,
      postedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      title: 'Software Engineering Intern',
      company: 'PhonePe',
      location: 'Pune, India',
      source: 'internshala',
      url: 'https://internshala.com/internship/detail/phonepe-3',
      applyUrl: 'https://internshala.com/internship/detail/phonepe-3',
      isInternship: true,
      postedAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  it('filters by location "India" and keeps both Bengaluru and Pune jobs', () => {
    const filtered = filterJobsStrict(sampleJobs, {
      location: 'India',
    });
    expect(filtered.map((j) => j.id)).toEqual(['1', '3']);
  });

  it('filters by internship type and retains Graduate Engineer Trainee and Software Intern', () => {
    const filtered = filterJobsStrict(sampleJobs, {
      jobType: 'internship',
    });
    expect(filtered.map((j) => j.id)).toEqual(['1', '3']);
  });
});

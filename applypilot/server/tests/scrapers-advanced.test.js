import { describe, it, expect } from 'vitest';
import { isJobLocationMatch } from '../scrape/geo-resolver.js';
import { validateJobPosting, isJobRoleMatch, isJobTypeMatch, filterJobsStrict, filterJobsByCriteria, } from '../scrape/validator.js';
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
    it('matches contract roles without throwing and excludes part-time work from full-time', () => {
        expect(isJobTypeMatch({ title: 'Software Consultant', employmentType: 'contract' }, 'contract')).toBe(true);
        expect(isJobTypeMatch({ title: 'Software Engineer', employmentType: 'part-time' }, 'fulltime')).toBe(false);
    });
    it('validates new job sources: internshala, unstop, simplify_jobs, linkedin_dork', () => {
        const internshalaJob = {
            id: 'ishala_101',
            title: 'Full Stack Web Development Intern',
            company: 'TechFlow Systems',
            source: 'internshala',
            url: 'https://internshala.com/internship/detail/web-dev-intern-101',
            applyUrl: 'https://internshala.com/internship/detail/web-dev-intern-101',
            location: 'Bengaluru, India',
        };
        expect(validateJobPosting(internshalaJob).valid).toBe(true);
        const unstopJob = {
            id: 'unstop_202',
            title: 'Software Developer Intern - Campus Drive',
            company: 'Groww',
            source: 'unstop',
            url: 'https://unstop.com/jobs/software-developer-intern-groww-202',
            applyUrl: 'https://unstop.com/jobs/software-developer-intern-groww-202',
            location: 'Bangalore',
        };
        expect(validateJobPosting(unstopJob).valid).toBe(true);
        const simplifyJob = {
            id: 'simp_303',
            title: 'Software Engineering Intern Summer 2026',
            company: 'Databricks',
            source: 'simplify_jobs',
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
    const sampleJobs = [
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
        expect(filtered.map((j) => j.id)).toEqual(['1', '2', '3']);
        expect(filtered.find((j) => j.id === '2').unverifiedFilters).toContain('job type');
    });
});

describe('Filter evidence for incomplete source data', () => {
    const makeJob = (overrides = {}) => ({
        id: 'unknown-job',
        title: 'Software Engineer',
        company: 'Example Co',
        source: 'naukri',
        url: 'https://example.com/jobs/1',
        location: '',
        remote: undefined,
        employmentType: 'unknown',
        ...overrides,
    });

    it('keeps an unknown location marked while excluding a known location mismatch', () => {
        const jobs = [
            makeJob(),
            makeJob({ id: 'foreign-job', location: 'London, UK' }),
            makeJob({ id: 'generic-remote-job', location: 'Remote / Worldwide', remote: true }),
        ];

        const filtered = filterJobsByCriteria(jobs, { location: 'India' });

        expect(filtered.map((job) => job.id)).toEqual(['unknown-job', 'generic-remote-job']);
        expect(filtered[0].unverifiedFilters).toContain('location');
        expect(filtered[1].unverifiedFilters).toContain('location');
        expect(filtered[0].unverifiedFilters).toContain('posted date');
    });

    it('keeps an unknown job type marked when an internship filter is active', () => {
        const filtered = filterJobsByCriteria(
            [makeJob()],
            { jobType: 'internship' },
        );

        expect(filtered).toHaveLength(1);
        expect(filtered[0].unverifiedFilters).toContain('job type');
    });

    it('keeps an unknown workplace marked instead of assuming onsite', () => {
        const filtered = filterJobsByCriteria(
            [makeJob()],
            { workplaceType: 'remote' },
        );

        expect(filtered).toHaveLength(1);
        expect(filtered[0].unverifiedFilters).toContain('workplace');
    });

    it('keeps unknown batch and seniority data visible as unverified', () => {
        const job = makeJob({ location: 'Bengaluru, India' });
        const batchFiltered = filterJobsByCriteria([job], { batchYear: '2028' });
        const seniorityFiltered = filterJobsByCriteria([job], { seniorityLevel: 'senior' });

        expect(batchFiltered).toHaveLength(1);
        expect(batchFiltered[0].unverifiedFilters).toContain('batch');
        expect(seniorityFiltered).toHaveLength(1);
        expect(seniorityFiltered[0].unverifiedFilters).toContain('seniority');
    });

    it('preserves known filter mismatches as exclusions', () => {
        const jobs = [
            makeJob({ id: 'known-intern', title: 'Software Engineer Intern', employmentType: 'internship' }),
            makeJob({ id: 'known-batch', location: 'Bengaluru, India', eligibleBatches: ['2027'] }),
            makeJob({ id: 'known-workplace', location: 'Bengaluru, India', remote: true }),
        ];

        expect(filterJobsByCriteria([jobs[0]], { jobType: 'fulltime' })).toEqual([]);
        expect(filterJobsByCriteria(jobs.slice(1, 2), { batchYear: '2028' })).toEqual([]);
        expect(filterJobsByCriteria(jobs.slice(2), { workplaceType: 'onsite' })).toEqual([]);
    });

    it('does not convert missing location and workplace data into Remote', () => {
        const result = validateJobPosting(makeJob());

        expect(result.valid).toBe(true);
        expect(result.job.location).toBe('');
        expect(result.job.remote).toBeUndefined();
    });
});

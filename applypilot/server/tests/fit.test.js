import { describe, it, expect } from 'vitest';
import { scoreJob, scoreJobs } from '../scoring/fit.js';
const resume = {
    fullName: 'Alex Engineer',
    email: 'alex@example.com',
    phone: '555-0100',
    links: ['https://linkedin.com/in/alex-eng'],
    location: 'Remote',
    summary: 'Full-stack engineer with React and Node.js experience.',
    skills: [
        'javascript',
        'typescript',
        'react',
        'next.js',
        'node.js',
        'postgres',
        'aws',
        'docker',
        'kubernetes',
    ],
    experience: [
        {
            company: 'Acme',
            title: 'Senior Engineer',
            startDate: '2020',
            endDate: 'Present',
            bullets: ['Built React app', 'Owned AWS infra'],
        },
    ],
    education: [],
    rawText: '',
    parsedAt: new Date().toISOString(),
    parserVersion: 'v2.0.0',
};
const baseJob = {
    id: 'j1',
    title: 'Senior Full-Stack Engineer',
    company: 'Acme',
    source: 'greenhouse',
    url: 'https://acme.com/jobs/1',
    applyUrl: 'https://acme.com/jobs/1',
    location: 'Remote',
    remote: true,
    description: 'Looking for a senior engineer with React, TypeScript, Node.js, PostgreSQL, AWS, and Kubernetes experience.',
    postedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    employmentType: 'full-time',
    skills: ['react', 'typescript', 'node.js', 'postgres', 'aws', 'kubernetes'],
};
describe('fit scoring', () => {
    it('scores exact keyword overlap highly', async () => {
        const r = await scoreJob(resume, baseJob);
        expect(r.score).toBeGreaterThan(0.6);
        expect(r.matchedSkills.length).toBeGreaterThan(4);
    });
    it('gives a low score for an unrelated job', async () => {
        const off = {
            ...baseJob,
            id: 'j2',
            title: 'Pastry Chef',
            description: 'Make croissants and decorate cakes daily. No coding required.',
            skills: ['baking', 'pastry', 'customer service'],
        };
        const r = await scoreJob(resume, off);
        expect(r.score).toBeLessThan(0.3);
    });
    it('boosts recent jobs', async () => {
        const old = {
            ...baseJob,
            id: 'j3',
            postedAt: new Date(Date.now() - 30 * 24 * 3600_000).toISOString(),
        };
        const recent = { ...baseJob, id: 'j4', postedAt: new Date().toISOString() };
        const sOld = await scoreJob(resume, old);
        const sNew = await scoreJob(resume, recent);
        expect(sNew.score).toBeGreaterThan(sOld.score);
    });
    it('rankJobs returns monotonically non-increasing scores', async () => {
        const jobs = [
            { ...baseJob, id: 'a' },
            { ...baseJob, id: 'b', title: 'Junior Cook', description: 'Cook food.', skills: ['cooking'] },
            { ...baseJob, id: 'c' },
        ];
        const rs = await scoreJobs(resume, jobs);
        for (let i = 1; i < rs.length; i++)
            expect(rs[i - 1].score).toBeGreaterThanOrEqual(rs[i].score);
    });
    it('penalizes missing keywords', async () => {
        const r = await scoreJob(resume, baseJob);
        expect(r.missingSkills).not.toContain('react');
        expect(r.missingSkills).not.toContain('typescript');
    });
});

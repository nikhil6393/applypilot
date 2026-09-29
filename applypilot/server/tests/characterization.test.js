import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
let app;
beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DB_PATH = './data/test-characterization.db';
    process.env.SCRAPE_TIMEOUT_MS = '1000';
    // Ensure local deterministic mode without cloud network timeouts
    delete process.env.NVIDIA_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_API_KEY;    app = createApp();
});
describe('Characterization Tests — Existing API Endpoints Freeze (Phase 1 Baseline)', () => {
    describe('Health & Configuration', () => {
        it('GET /api/health returns 200 with status ok', async () => {
            const res = await request(app).get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body).toHaveProperty('timestamp');
        });
        it('GET /api/config returns AI provider status and fitThreshold', async () => {
            const res = await request(app).get('/api/config');
            expect(res.status).toBe(200);
            expect(typeof res.body.hasNvidiaKey).toBe('boolean');
            expect(typeof res.body.hasOpenRouterKey).toBe('boolean');
            expect(typeof res.body.fitThreshold).toBe('number');
        });
        it('GET /api/config/ai/health returns local AI availability and fallback models', async () => {
            const res = await request(app).get('/api/config/ai/health');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('available', true);
            expect(res.body).toHaveProperty('provider');
            expect(Array.isArray(res.body.models)).toBe(true);
        });
    });
    describe('Jobs Discovery & Ingestion Contract', () => {
        it('GET /api/jobs returns paginated job listing with items and count', async () => {
            const res = await request(app).get('/api/jobs');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.items)).toBe(true);
            expect(typeof res.body.count).toBe('number');
        });
        it('GET /api/jobs/background/status returns orchestrator status and active sources', async () => {
            const res = await request(app).get('/api/jobs/background/status');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('running');
            expect(res.body).toHaveProperty('activeSources');
            expect(Array.isArray(res.body.activeSources)).toBe(true);
            expect(res.body.activeSources).toContain('linkedin');
            expect(res.body.activeSources).toContain('greenhouse');
            expect(res.body.activeSources).toContain('weworkremotely');
            expect(res.body.activeSources).toContain('yc');
        });
        it('GET /api/jobs/background/runs returns job-run history and item count', async () => {
            const res = await request(app).get('/api/jobs/background/runs');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('items');
            expect(Array.isArray(res.body.items)).toBe(true);
            expect(typeof res.body.count).toBe('number');
        });
        it('GET /api/jobs/sources/health returns source health and adapter capabilities', async () => {
            const res = await request(app).get('/api/jobs/sources/health');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('sources');
            expect(Array.isArray(res.body.sources)).toBe(true);
            expect(res.body).toHaveProperty('capabilities');
            expect(Array.isArray(res.body.capabilities)).toBe(true);
            expect(res.body.registeredCount).toBeGreaterThanOrEqual(5);
            const linkedinCap = res.body.capabilities.find((c) => c.source === 'linkedin');
            expect(linkedinCap).toBeDefined();
            expect(linkedinCap.capabilities.supportsKeywordSearch).toBe(true);
        });
        it('POST /api/jobs/ingest validates payload and ingests new postings', async () => {
            const externalJob = {
                id: 'external-char-1',
                title: 'Backend Intern',
                company: 'Stripe',
                source: 'greenhouse',
                url: 'https://boards.greenhouse.io/stripe/jobs/1',
                location: 'San Francisco, CA',
                remote: false,
                description: 'Summer backend internship working with Go and distributed systems.',
                postedAt: new Date().toISOString(),
                skills: ['Go', 'Distributed Systems'],
            };
            const res = await request(app)
                .post('/api/jobs/ingest')
                .send({ jobs: [externalJob] });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(typeof res.body.received).toBe('number');
            expect(typeof res.body.valid).toBe('number');
            expect(typeof res.body.inserted).toBe('number');
        });
    });
    describe('Resume Intelligence Contract', () => {
        it('POST /api/resume/parse with text extracts and stores resume deterministically', async () => {
            const sampleText = `
Alex Morgan
alex.morgan@example.com
(555) 019-2834
github.com/alexmorgan

Summary
Passionate full stack software engineer with experience building scalable web applications.

Skills: JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, Docker, Git

Experience
Software Engineer at Acme Corp (2022 - Present)
- Architected and shipped high-performance dashboard using React, TypeScript, and Node.js.
- Reduced API response latency by 45% through Redis caching and query indexing.

Education
B.S. in Computer Science, State University (2018 - 2022)
      `.trim();
            const res = await request(app)
                .post('/api/resume/parse')
                .send({ text: sampleText });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('resume');
            expect(res.body.resume.email).toBe('alex.morgan@example.com');
            expect(res.body.resume.skills).toContain('react');
        });
        it('GET /api/resume returns currently stored resume', async () => {
            const res = await request(app).get('/api/resume');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.resume).not.toBeNull();
            expect(res.body.resume.email).toBe('alex.morgan@example.com');
        });
        it('POST /api/resume/ats evaluates resume ATS metrics deterministically', async () => {
            const sampleResume = {
                name: 'Jane Smith',
                email: 'jane@example.com',
                phone: '+1 234 567 8900',
                skills: ['Python', 'SQL', 'FastAPI', 'Docker', 'AWS'],
                experience: [
                    {
                        role: 'Data Engineer',
                        company: 'DataCo',
                        bullets: [
                            'Built ETL pipelines processing 10M+ rows daily with 99.9% uptime.',
                            'Automated reporting workflows reducing manual effort by 20 hours weekly.',
                        ],
                    },
                ],
                education: [
                    {
                        degree: 'B.S. Software Engineering',
                        school: 'Tech Institute',
                        graduationDate: '2023',
                    },
                ],
            };
            const res = await request(app)
                .post('/api/resume/ats')
                .send({ resume: sampleResume });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('report');
            expect(res.body.report).toHaveProperty('overallScore');
            expect(res.body.report.overallScore).toBeGreaterThanOrEqual(0);
            expect(res.body.report.overallScore).toBeLessThanOrEqual(100);
            expect(res.body.report).toHaveProperty('rating');
            expect(res.body.report).toHaveProperty('categories');
        });
        it('GET /api/resume/ats scores currently stored resume', async () => {
            const res = await request(app).get('/api/resume/ats');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.report.overallScore).toBeGreaterThanOrEqual(0);
        });
        it('GET /api/resume/ats-v2 evaluates stored resume with ats_score_v2 engine', async () => {
            const res = await request(app).get('/api/resume/ats-v2');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.report).toHaveProperty('scoringVersion', 'ats_score_v2');
            expect(res.body.report).toHaveProperty('grade');
            expect(res.body.report.categories).toHaveProperty('contactAndStructure');
            expect(res.body.report.categories).toHaveProperty('actionVerbsAndImpact');
            expect(res.body.report.categories).toHaveProperty('quantification');
            expect(res.body.report.categories).toHaveProperty('technicalDepth');
        });
    });
    describe('Scoring & Tailoring Contract', () => {
        it('POST /api/scoring/fit-score calculates score for a target job against stored resume', async () => {
            const testJob = {
                id: 'target-job-1',
                title: 'Full Stack React Engineer',
                company: 'Stripe',
                source: 'greenhouse',
                url: 'https://example.com/jobs/stripe-1',
                location: 'Remote',
                remote: true,
                description: 'Seeking a full stack engineer proficient in React, TypeScript, and Node.js.',
                postedAt: new Date().toISOString(),
                skills: ['React', 'TypeScript', 'Node.js'],
            };
            const res = await request(app)
                .post('/api/scoring/fit-score')
                .send({ job: testJob });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('score');
            expect(typeof res.body.score).toBe('number');
            expect(res.body).toHaveProperty('matchedSkills');
            expect(Array.isArray(res.body.matchedSkills)).toBe(true);
        });
        it('POST /api/scoring/batch-fit-score calculates fit across multiple jobs', async () => {
            const res = await request(app)
                .post('/api/scoring/batch-fit-score')
                .send({ limit: 5 });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('results');
            expect(Array.isArray(res.body.results)).toBe(true);
            expect(typeof res.body.count).toBe('number');
        });
        it('POST /api/tailor/tailor produces tailored resume artifact for target job', async () => {
            const testJob = {
                id: 'target-job-2',
                title: 'Frontend React Developer',
                company: 'Figma',
                source: 'greenhouse',
                url: 'https://example.com/jobs/figma-1',
                location: 'San Francisco, CA',
                remote: false,
                description: 'Frontend React developer building design systems.',
                postedAt: new Date().toISOString(),
                skills: ['React', 'TypeScript'],
            };
            const res = await request(app)
                .post('/api/tailor/tailor')
                .send({ job: testJob });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('jobId', 'target-job-2');
            expect(res.body).toHaveProperty('bullets');
            expect(Array.isArray(res.body.bullets)).toBe(true);
            expect(res.body).toHaveProperty('latex');
            expect(res.body).toHaveProperty('status');
        }, 15000);
    });
    describe('Application Tracker Contract', () => {
        it('GET /api/tracker returns application tracker items and count', async () => {
            const res = await request(app).get('/api/tracker');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('items');
            expect(Array.isArray(res.body.items)).toBe(true);
            expect(typeof res.body.count).toBe('number');
        });
    });
    describe('Candidate Profile Contract', () => {
        it('GET /api/profile returns candidate profile or null without crashing', async () => {
            const res = await request(app).get('/api/profile');
            expect(res.status).toBe(200);
            expect(typeof res.body).toBe('object');
            expect(res.body.success).toBe(true);
        });
    });
});

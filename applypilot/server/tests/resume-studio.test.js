import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
let app;
beforeAll(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.NVIDIA_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_API_KEY;    app = createApp();
});
const sampleResume = {
    fullName: 'Alice Developer',
    email: 'alice@example.com',
    phone: '555-0199',
    contact: {
        email: 'alice@example.com',
        phone: '555-0199',
        linkedin: 'https://linkedin.com/in/alicedev',
        github: 'https://github.com/alicedev',
    },
    summary: 'Experienced Full Stack Engineer specializing in TypeScript and Node.js.',
    skills: {
        languages: ['TypeScript', 'JavaScript', 'Python'],
        frameworks: ['React', 'Express', 'Node.js'],
        tools: ['Git', 'Docker', 'PostgreSQL'],
        domain: ['Full Stack', 'Cloud'],
    },
    experience: [
        {
            company: 'Tech Corp',
            role: 'Software Engineer',
            title: 'Software Engineer',
            dates: '2022 - Present',
            bullets: [
                'Developed REST APIs handling 50k requests/min with Node.js and Redis.',
                'Responsible for team bug fixes and maintenance.',
            ],
        },
    ],
    education: [
        {
            degree: 'B.S. Computer Science',
            institution: 'State University',
        },
    ],
};
describe('Phase 11: Resume Studio Unification (§23 & §28)', () => {
    it('POST /api/resume/score/full returns full ATS evaluation and feedback', async () => {
        const res = await request(app)
            .post('/api/resume/score/full')
            .send({ resume: sampleResume });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.report).toBeDefined();
        expect(typeof res.body.report.score).toBe('number');
        expect(Array.isArray(res.body.report.bulletFeedback)).toBe(true);
    });
    it('POST /api/resume/targeted-match calculates TF-IDF cosine relevancy and keyword gaps', async () => {
        const res = await request(app)
            .post('/api/resume/targeted-match')
            .send({
            resume: sampleResume,
            jobDescription: 'Seeking a Senior TypeScript Engineer with Docker, Node.js, and Kubernetes experience.',
            targetKeywords: ['TypeScript', 'Kubernetes'],
        });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('relevancyScore');
        expect(res.body).toHaveProperty('matchedKeywords');
        expect(res.body).toHaveProperty('missingKeywords');
        expect(typeof res.body.relevancyScore).toBe('number');
        expect(res.body.source).toBe('tfidf-cosine-v1');
        expect(res.body.matchedKeywords.some((k) => k.toLowerCase().includes('typescript'))).toBe(true);
    });
    it('POST /api/resume/magic-write produces truth-anchored bullet suggestions', async () => {
        const res = await request(app)
            .post('/api/resume/magic-write')
            .send({
            resume: sampleResume,
            bullet: 'Responsible for team bug fixes and maintenance.',
            section: 'Experience',
            keyword: 'debugging',
        });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.suggestions)).toBe(true);
        expect(res.body.suggestions.length).toBeGreaterThan(0);
        expect(res.body.guardrail).toBe('truth-anchored');
    });
    it('POST /api/resume/autofix returns action-verb rewrite diffs without mutating state', async () => {
        const res = await request(app)
            .post('/api/resume/autofix')
            .send({ resume: sampleResume });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.diff)).toBe(true);
        expect(res.body.diff.some((d) => d.before.includes('Responsible for'))).toBe(true);
        expect(res.body.warning).toContain('Never auto-applied');
    });
    it('POST /api/resume/export/latex sanitizes LaTeX while preserving hyperlinks', async () => {
        const rawLatex = `
\\documentclass{article}
\\usepackage{hyperref}
\\begin{document}
\\section{Experience}
\\href{https://github.com/alicedev}{GitHub Profile}
\\input{/etc/passwd}
\\write18{ls}
\\end{document}
    `;
        const res = await request(app)
            .post('/api/resume/export/latex')
            .send({ latex: rawLatex });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.sanitized.links).toEqual([
            { url: 'https://github.com/alicedev', label: 'GitHub Profile' },
        ]);
        expect(res.body.sanitized.plainText).toContain('GitHub Profile (https://github.com/alicedev)');
        expect(res.body.sanitized.plainText).not.toContain('/etc/passwd');
        expect(res.body.sanitized.plainText).not.toContain('write18');
    });
});

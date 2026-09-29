import { describe, it, expect } from 'vitest';
import { extractSkills, extractContact, extractName } from '../ai/resume-parser.js';
describe('resume-parser heuristics', () => {
    it('extracts common tech skills', () => {
        const text = `
      Jane Doe
      jane@example.com
      Experience with JavaScript, TypeScript, React, Next.js, Node.js and PostgreSQL.
      Built APIs with FastAPI and deployed to AWS using Docker and Kubernetes.
    `;
        const skills = extractSkills(text);
        for (const s of [
            'javascript',
            'typescript',
            'react',
            'next.js',
            'node.js',
            'postgres',
            'fastapi',
            'aws',
            'docker',
            'kubernetes',
        ]) {
            expect(skills).toContain(s);
        }
    });
    it('extracts email and phone', () => {
        const text = `John Smith\nEmail: john.smith@acme.co\nPhone: +1 (415) 555-0123`;
        const c = extractContact(text);
        expect(c.email).toBe('john.smith@acme.co');
        expect(c.phone.replace(/\D/g, '')).toContain('4155550123');
    });
    it('extracts the first plausible name', () => {
        const text = `John Q. Public\nSoftware Engineer\njohn@example.com`;
        expect(extractName(text)).toBe('John Q. Public');
    });
    it('does not hallucinate skills that are not present', () => {
        const text = `Senior barista with 5 years of latte art.`;
        const skills = extractSkills(text);
        expect(skills).not.toContain('kubernetes');
        expect(skills).not.toContain('rust');
    });

    it('extracts hyperlinks (LinkedIn, GitHub, markdown, tech domains, and portfolio)', () => {
        const text = `
          Alex Morgan
          alex@example.com
          [LinkedIn](https://linkedin.com/in/alexmorgan-dev)
          github.com/alexmorgan
          Portfolio: alexmorgan.dev
          Extra: https://alexportfolio.vercel.app
        `;
        const c = extractContact(text);
        expect(c.linkedin).toBe('https://linkedin.com/in/alexmorgan-dev');
        expect(c.github).toBe('https://github.com/alexmorgan');
        expect(c.links.some(l => l.includes('alexmorgan.dev'))).toBe(true);
        expect(c.links.some(l => l.includes('alexportfolio.vercel.app'))).toBe(true);
    });
});

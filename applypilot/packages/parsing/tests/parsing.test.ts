import { describe, it, expect } from 'vitest';
import {
  sanitizeLatex,
  isLatexDocument,
  defaultAtsScorerV2,
  normalizeResumeDocument,
  processDocumentOcr,
  isImageBuffer,
} from '../src/index.js';
import type { CanonicalResume } from '@applypilot/domain';

describe('Phase 7 — Resume Intelligence Engine (@applypilot/parsing)', () => {
  describe('LaTeX Sanitizer & Hyperlink Preservation (§14)', () => {
    const rawLatex = `
\\documentclass[letterpaper,11pt]{article}
\\begin{document}
\\section{Education}
\\textbf{University of California, Berkeley} \\hfill Berkeley, CA
\\href{https://github.com/johndoe}{github.com/johndoe} | \\url{https://johndoe.dev}

\\section{Experience}
\\begin{itemize}
  \\item Engineered real-time distributed data pipeline processing 50k requests/sec.
  \\item \\href{https://company.com/project}{Live Demo}: Deployed scalable microservices on AWS.
\\end{itemize}
\\end{document}
`;

    it('identifies LaTeX document correctly', () => {
      expect(isLatexDocument(rawLatex)).toBe(true);
      expect(isLatexDocument('Standard plain text resume')).toBe(false);
    });

    it('preserves hyperlinks and urls in clean readable text', () => {
      const sanitized = sanitizeLatex(rawLatex);
      expect(sanitized.links).toHaveLength(3);
      expect(sanitized.links.some((l) => l.url === 'https://github.com/johndoe')).toBe(true);
      expect(sanitized.links.some((l) => l.url === 'https://johndoe.dev')).toBe(true);
      expect(sanitized.links.some((l) => l.url === 'https://company.com/project')).toBe(true);

      expect(sanitized.plainText).toContain('github.com/johndoe (https://github.com/johndoe)');
      expect(sanitized.plainText).toContain('https://johndoe.dev');
    });

    it('preserves section hierarchy and bullet points', () => {
      const sanitized = sanitizeLatex(rawLatex);
      expect(sanitized.sectionHeaders).toContain('Education');
      expect(sanitized.sectionHeaders).toContain('Experience');
      expect(sanitized.plainText).toContain('=== Education ===');
      expect(sanitized.plainText).toContain('=== Experience ===');
      expect(sanitized.plainText).toContain('- Engineered real-time distributed data pipeline');
    });
  });

  describe('Deterministic ATS Score v2 Engine (§15)', () => {
    const strongResume: CanonicalResume = {
      fullName: 'Sarah Connor',
      email: 'sarah@example.com',
      phone: '+1-555-0199',
      skills: [
        { name: 'TypeScript' },
        { name: 'React' },
        { name: 'Node.js' },
        { name: 'PostgreSQL' },
        { name: 'Docker' },
        { name: 'AWS' },
        { name: 'Kubernetes' },
        { name: 'Go' },
      ],
      experience: [
        {
          company: 'Cyberdyne Systems',
          title: 'Lead Distributed Systems Engineer',
          bullets: [
            'Architected distributed microservices handling 250k requests/min with 99.99% uptime.',
            'Optimized PostgreSQL query latency by 45% through targeted indexing.',
            'Deployed Docker containers across AWS ECS, reducing infrastructure spend by $30k/yr.',
            'Led cross-functional team of 6 engineers to ship mission-critical cloud platform.',
          ],
        },
      ],
      education: [
        {
          degree: 'B.S. Computer Science',
          institution: 'Stanford University',
        },
      ],
      projects: [],
      certifications: [],
    };

    it('evaluates all 4 categories (4x25 pts) deterministically with ats_score_v2', () => {
      const report1 = defaultAtsScorerV2.evaluate(strongResume);
      const report2 = defaultAtsScorerV2.evaluate(strongResume);

      expect(report1.scoringVersion).toBe('ats_score_v2');
      expect(report1.overallScore).toBe(report2.overallScore);
      expect(report1.overallScore).toBeGreaterThanOrEqual(85);
      expect(['A', 'A+']).toContain(report1.grade);

      // Check the 4 categories
      const { contactAndStructure, actionVerbsAndImpact, quantification, technicalDepth } =
        report1.categories;

      expect(contactAndStructure.score).toBe(25);
      expect(actionVerbsAndImpact.score).toBe(25);
      expect(quantification.score).toBeGreaterThanOrEqual(20);
      expect(technicalDepth.score).toBe(25);

      expect(report1.evidence.length).toBeGreaterThanOrEqual(4);
    });

    it('provides concrete recommendations for incomplete resumes', () => {
      const weakResume: CanonicalResume = {
        fullName: 'Anonymous',
        skills: [{ name: 'JavaScript' }],
        experience: [
          {
            company: 'Startup',
            bullets: ['worked on website', 'fixed some bugs'],
          },
        ],
        education: [],
        projects: [],
        certifications: [],
      };

      const report = defaultAtsScorerV2.evaluate(weakResume);
      expect(report.overallScore).toBeLessThan(50);
      expect(report.grade).toBe('D');
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some((r) => r.includes('email'))).toBe(true);
      expect(report.recommendations.some((r) => r.includes('action verbs'))).toBe(true);
    });
  });

  describe('Document Normalizer & OCR Pipeline (§14)', () => {
    it('normalizes document with taxonomy-mapped skills', () => {
      const source = `
Alex Rivera
alex.rivera@example.com | (555) 123-4567 | linkedin.com/in/alexrivera

=== Experience ===
Stripe
- Engineered payment processing worker using TypeScript, Node, and PostgreSQL.
- Reduced API latency by 35% on high-throughput webhook pipelines.

=== Education ===
B.S. in Computer Science
MIT

=== Skills ===
Languages & Tools: TypeScript, JavaScript, Python, Docker, k8s, PostgreSQL
`;

      const result = normalizeResumeDocument(source);
      expect(result.canonical.fullName).toBe('Alex Rivera');
      expect(result.canonical.email).toBe('alex.rivera@example.com');
      expect(result.canonical.contact.linkedin).toBe('https://linkedin.com/in/alexrivera');
      expect(result.canonical.experience).toHaveLength(1);
      expect(result.canonical.experience[0].bullets).toHaveLength(2);

      const skillNames = result.canonical.skills.map((s) => (typeof s === 'string' ? s : s.name));
      expect(skillNames).toContain('TypeScript');
      expect(skillNames).toContain('PostgreSQL');
      expect(skillNames).toContain('Kubernetes');
    });

    it('handles image buffer signatures and OCR fallback', async () => {
      // PNG header: 89 50 4E 47
      const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00]);
      expect(isImageBuffer(fakePng)).toBe(true);

      const ocrResult = await processDocumentOcr(fakePng, '');
      expect(ocrResult.isScanned).toBe(true);
      expect(ocrResult.text.length).toBeGreaterThan(0);
    });
  });
});

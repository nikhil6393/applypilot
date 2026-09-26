import { describe, expect, it } from 'vitest';
import { renderTailoredLatex } from '../export/latex-resume.js';
import type { JobPosting, ParsedResume } from '../../shared/types.js';

const resume: ParsedResume = {
  fullName: 'Nikhil Singh',
  email: 'nikhil@example.com',
  phone: '+91 123',
  links: ['https://github.com/nikhil'],
  location: '',
  summary: 'Backend developer with 50% improvement.',
  skills: ['Node.js', 'C++'],
  experience: [
    {
      company: 'Amdox & Co',
      title: 'Developer',
      startDate: 'Jan 2026',
      endDate: 'Feb 2026',
      bullets: ['Built API for $50 users'],
    },
  ],
  education: [{ institution: 'Dronacharya', degree: 'B.Tech', startDate: '2024', endDate: '2028' }],
  rawText: '',
  parsedAt: '',
  parserVersion: 'test',
};

const job: JobPosting = {
  id: 'j1',
  title: 'Backend Engineer',
  company: 'Acme',
  source: 'manual',
  url: 'https://example.com',
  applyUrl: 'https://example.com',
  location: 'Remote',
  remote: true,
  description: '',
  postedAt: '',
  fetchedAt: '',
  employmentType: 'full-time',
  skills: ['node'],
};

describe('renderTailoredLatex', () => {
  it('keeps the fixed resume typography and escapes generated content', () => {
    const latex = renderTailoredLatex(resume, job, ['Improved latency by 50% for $100']);
    expect(latex).toContain('\\usepackage{lmodern}');
    expect(latex).toContain('\\fontsize{9}{11}\\selectfont');
    expect(latex).toContain('\\fontsize{11}{13}\\bfseries');
    expect(latex).toContain(
      '\\usepackage[top=0.14in,bottom=0.10in,left=0.44in,right=0.44in]{geometry}'
    );
    expect(latex).toContain('Improved latency by 50\\% for \\$100');
    expect(latex).toContain('Amdox \\& Co');
  });
});

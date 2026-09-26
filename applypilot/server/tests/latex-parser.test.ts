import { describe, expect, it, beforeAll } from 'vitest';
import { latexToPlainText, parseResumeText } from '../ai/resume-parser.js';
import { invalidateProviderChain } from '../ai/index.js';

const latex = String.raw`\documentclass{article}
\begin{document}
{\fontsize{15}{18}\bfseries Nikhil Singh}\\[3pt]
\href{mailto:nikhil@example.com}{nikhil@example.com}
\section*{EXPERIENCE}
\subheading{Amdox Technologies}{Jan 2026 -- Feb 2026}
\roleline{Backend Developer}{}
\begin{tightitemize}
\item Built REST APIs with Node.js and Express.js
\end{tightitemize}
\section*{TECHNICAL SKILLS}
\textbf{Languages:} Java, Python
\end{document}`;

describe('LaTeX resume parsing', () => {
  beforeAll(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.NVIDIA_NIM_API_KEY;
    invalidateProviderChain();
  });
  it('extracts visible LaTeX content without retaining template commands', async () => {
    const text = latexToPlainText(latex);
    expect(text).toContain('Nikhil Singh');
    expect(text).toContain('Built REST APIs with Node.js and Express.js');
    expect(text).not.toContain('\\documentclass');
    const resume = await parseResumeText(latex);
    expect(resume.fullName).toBe('Nikhil Singh');
    expect(resume.email).toBe('nikhil@example.com');
    expect(resume.skills).toEqual(expect.arrayContaining(['node.js', 'express', 'java', 'python']));
  });
});

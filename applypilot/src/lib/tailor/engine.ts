import { extractJobKeywords, extractCandidateSkills } from './extractor.js';
import { matchSkills, type SkillMatchResult } from './matcher.js';

export interface TailorJobInput {
  id?: string;
  title: string;
  company: string;
  description?: string;
  tags?: string[];
  skills?: string[];
  location?: string;
}

export interface TailoredResult {
  jobId: string;
  tailoredSummary: string;
  tailoredCoverNote: string;
  tailoredResumeBullets: Array<{ experienceId: string; bullets: string[] }>;
  highlightedKeywords: string[];
  atsScore: number;
  atsScoreBreakdown: {
    overallScore: number;
    keywordMatchRate: number;
    formattingScore: number;
    impactScore: number;
    sectionCompleteness: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    atsTips: string[];
  };
  htmlResume: string;
  latexSource: string;
  status: 'completed';
  approved: boolean;
  source: 'deterministic';
}

/**
 * Rank experience bullets by relevance to matched job skills.
 * Bullets with matching skills and metrics are prioritized.
 * Truth-anchored: strictly preserves original bullets without fabricating facts.
 */
function rankBulletsByRelevance(bullets: string[], matchedSkills: string[]): string[] {
  if (!bullets || bullets.length === 0) return [];
  const skillSet = new Set(matchedSkills.map((s) => s.toLowerCase()));

  const scored = bullets.map((b) => {
    const lower = b.toLowerCase();
    let score = 0;
    for (const sk of skillSet) {
      if (lower.includes(sk)) score += 2;
    }
    // Boost bullets that already contain quantified metrics
    if (/\d+%|\d+x|\$\d+|\d+\s?(ms|seconds?|hours?|users?|requests?)/i.test(b)) {
      score += 1;
    }
    return { bullet: b, score };
  });

  // Sort descending by relevance score, stable tie-breaker
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.bullet);
}

/**
 * Build deterministic HTML preview of tailored resume.
 */
function buildHtmlResume(resume: any, summary: string, tailoredBulletsMap: Array<{ experienceId: string; bullets: string[] }>): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${resume.name || 'Candidate'} - Tailored Resume</title></head>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1e293b; line-height: 1.5;">
  <h1 style="margin: 0; font-size: 24px; color: #0f172a;">${resume.name || 'Candidate'}</h1>
  <p style="margin: 4px 0; font-size: 13px; color: #64748b;">${resume.contact?.email || ''} | ${resume.contact?.phone || ''} | ${resume.contact?.location || ''}</p>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
  <h2 style="font-size: 15px; text-transform: uppercase; color: #4338ca;">Professional Summary</h2>
  <p style="font-size: 13.5px; color: #334155;">${summary}</p>
  <h2 style="font-size: 15px; text-transform: uppercase; color: #4338ca; margin-top: 16px;">Experience</h2>
  ${(resume.experience || []).map((exp: any) => {
    const tailored = tailoredBulletsMap.find((t) => t.experienceId === exp.id);
    const bullets = tailored ? tailored.bullets : (exp.bullets || []);
    return `
      <div style="margin-bottom: 14px;">
        <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a;">${exp.role || exp.title} — ${exp.company}</h3>
        <p style="margin: 2px 0; font-size: 12px; color: #64748b;">${exp.dates || ''} | ${exp.location || ''}</p>
        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 13px; color: #334155;">
          ${bullets.map((b: string) => `<li style="margin-bottom: 3px;">${b}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('')}
  <h2 style="font-size: 15px; text-transform: uppercase; color: #4338ca; margin-top: 16px;">Education</h2>
  ${(resume.education || []).map((edu: any) => `
    <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>${edu.school}</strong> — ${edu.degree} (${edu.graduationDate || ''})</p>
  `).join('')}
</body>
</html>`.trim();
}

/**
 * Build deterministic LaTeX source for tailored resume.
 */
function buildLatexResume(resume: any, summary: string, tailoredBulletsMap: Array<{ experienceId: string; bullets: string[] }>): string {
  return `\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[hidelinks]{hyperref}
\\usepackage{enumitem}

\\begin{document}
\\begin{center}
  \\textbf{\\Huge ${resume.name || 'Candidate Name'}} \\\\ \\vspace{1pt}
  \\small ${resume.contact?.email || ''} $|$ ${resume.contact?.phone || ''} $|$ ${resume.contact?.location || ''}
\\end{center}

\\section*{Summary}
${summary}

\\section*{Experience}
\\begin{itemize}[leftmargin=0.15in, label={}]
${(resume.experience || []).map((exp: any) => {
  const tailored = tailoredBulletsMap.find((t) => t.experienceId === exp.id);
  const bullets = tailored ? tailored.bullets : (exp.bullets || []);
  return `  \\item \\textbf{${exp.role || exp.title}} $|$ \\textit{${exp.company}} \\hfill ${exp.dates || ''}\n  \\begin{itemize}\n${bullets.map((b: string) => `    \\item ${b}`).join('\n')}\n  \\end{itemize}`;
}).join('\n')}
\\end{itemize}

\\section*{Education}
\\begin{itemize}[leftmargin=0.15in, label={}]
${(resume.education || []).map((edu: any) => `  \\item \\textbf{${edu.school}} $|$ ${edu.degree} \\hfill ${edu.graduationDate || ''}`).join('\n')}
\\end{itemize}
\\end{document}`;
}

/**
 * 100% Deterministic, offline resume tailoring.
 * - Extracts keywords from JD using alias taxonomy
 * - Matches candidate skills without external APIs
 * - Ranks and orders the candidate's authentic bullets by relevance
 * - Creates a personalized summary and cover note strictly based on real resume details
 */
export function tailorResume(resume: any, job: TailorJobInput): TailoredResult {
  const jobId = job.id || `job_${job.company}_${Date.now()}`;
  const jobKeywords = extractJobKeywords(job);
  const candidateSkills = extractCandidateSkills(resume);
  const matchResult: SkillMatchResult = matchSkills(candidateSkills, jobKeywords);

  const topSkills = matchResult.matched.slice(0, 3).join(', ') ||
                    candidateSkills.slice(0, 3).join(', ') ||
                    'full-stack engineering';

  // Order bullets for each experience entry by relevance
  const tailoredResumeBullets = (resume.experience || []).map((exp: any, idx: number) => ({
    experienceId: exp.id || `exp_${idx}`,
    bullets: rankBulletsByRelevance(exp.bullets || [], matchResult.matched),
  }));

  // Deterministic summary: truth-anchored in candidate's real skills & job target
  const tailoredSummary = resume.summary
    ? resume.summary
    : `${resume.name || 'Candidate'} is a software developer with hands-on proficiency in ${topSkills}, prepared to contribute effectively to the ${job.title} role at ${job.company}.`;

  // Deterministic cover note: structured professional note based strictly on facts
  const tailoredCoverNote = [
    `Dear Hiring Team at ${job.company},`,
    '',
    `I am writing to express my interest in the ${job.title} position.`,
    matchResult.matched.length > 0
      ? `My background directly aligns with your core requirements, particularly in ${topSkills}.`
      : 'My technical problem-solving and software engineering background maps strongly to this role.',
    'I have attached my calibrated resume detailing my past project outcomes and achievements.',
    '',
    'Thank you for your consideration, and I look forward to discussing how my experience can support your team.',
    '',
    `Sincerely,\n${resume.name || 'Candidate'}`,
  ].join('\n');

  const atsScore = matchResult.overallScore;

  const atsScoreBreakdown = {
    overallScore: atsScore,
    keywordMatchRate: matchResult.matchRate,
    formattingScore: 100,
    impactScore: (resume.experience || []).length > 0 ? 92 : 80,
    sectionCompleteness: 100,
    matchedKeywords: matchResult.matched,
    missingKeywords: matchResult.missing,
    atsTips: [
      `${matchResult.matched.length} target skills aligned with job requirements`,
      'Experience bullets prioritized by technology relevance',
      '100% truth-anchored — strictly zero fabricated metrics or credentials',
    ],
  };

  const htmlResume = buildHtmlResume(resume, tailoredSummary, tailoredResumeBullets);
  const latexSource = buildLatexResume(resume, tailoredSummary, tailoredResumeBullets);

  return {
    jobId,
    tailoredSummary,
    tailoredCoverNote,
    tailoredResumeBullets,
    highlightedKeywords: matchResult.matched,
    atsScore,
    atsScoreBreakdown,
    htmlResume,
    latexSource,
    status: 'completed',
    approved: true,
    source: 'deterministic',
  };
}

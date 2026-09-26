import { Router, type Request, type Response } from 'express';
import { getResume, setResume } from '../store/resume.js';
import { parseResumeText, parseResumePdf, parseResumeDocx } from '../ai/resume-parser.js';
import { evaluateResumeAts } from '../scoring/ats-scorer.js';
import { defaultAtsScorerV2, sanitizeLatex } from '@applypilot/parsing';
import { tokenize, inverseDocumentFrequency, vectorize, cosineSimilarity } from '../scoring/tfidf.js';
import { bestEffortComplete } from '../ai/index.js';
import type { ParsedResume } from '../../shared/types.js';
import { computeSkillGapReport } from '../scoring/skill-gap.js';

export const resumeRouter = Router();

resumeRouter.get('/', (_req: Request, res: Response) => {
  const r = getResume();
  if (!r) return res.json({ resume: null, success: true, data: null });
  res.json({ resume: r, success: true, data: r });
});

resumeRouter.get('/ats', (_req: Request, res: Response) => {
  const r = getResume();
  if (!r) return res.status(400).json({ success: false, error: 'No resume uploaded yet' });
  const report = evaluateResumeAts(r);
  res.json({ success: true, report, data: report });
});

resumeRouter.post('/ats', (req: Request, res: Response) => {
  const resume = (req.body?.resume || req.body) as ParsedResume;
  if (!resume || typeof resume !== 'object') {
    return res.status(400).json({ success: false, error: 'Valid resume object required' });
  }
  const report = evaluateResumeAts(resume);
  res.json({ success: true, report, data: report });
});

// Full scoring endpoint used by Resume Studio (§23 & ResumeBuilderSection)
resumeRouter.post('/score/full', (req: Request, res: Response) => {
  const resume = (req.body?.resume || req.body) as ParsedResume;
  if (!resume || typeof resume !== 'object') {
    return res.status(400).json({ success: false, error: 'Valid resume object required' });
  }
  const report = evaluateResumeAts(resume);
  res.json({ success: true, report, data: report });
});

resumeRouter.get('/ats-v2', (_req: Request, res: Response) => {
  const r = getResume();
  if (!r) return res.status(400).json({ success: false, error: 'No resume uploaded yet' });
  const canonical = {
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    skills: (r.skills || []).map((s) => ({ name: s })),
    experience: (r.experience || []).map((e) => ({
      company: e.company,
      title: e.title,
      bullets: e.bullets || [],
    })),
    education: (r.education || []).map((ed) => ({
      degree: ed.degree,
      institution: ed.institution || ed.school,
    })),
    projects: [],
    certifications: [],
  };
  const reportV2 = defaultAtsScorerV2.evaluate(canonical as any);
  res.json({ success: true, report: reportV2, data: reportV2 });
});

resumeRouter.post('/ats-v2', (req: Request, res: Response) => {
  const resume = (req.body?.resume || req.body) as ParsedResume;
  if (!resume || typeof resume !== 'object') {
    return res.status(400).json({ success: false, error: 'Valid resume object required' });
  }
  const canonical = {
    fullName: resume.fullName,
    email: resume.email,
    phone: resume.phone,
    skills: (resume.skills || []).map((s) => ({ name: s })),
    experience: (resume.experience || []).map((e) => ({
      company: e.company,
      title: e.title,
      bullets: e.bullets || [],
    })),
    education: (resume.education || []).map((ed) => ({
      degree: ed.degree,
      institution: ed.institution || ed.school,
    })),
    projects: [],
    certifications: [],
  };
  const reportV2 = defaultAtsScorerV2.evaluate(canonical as any);
  res.json({ success: true, report: reportV2, data: reportV2 });
});

// Targeted match comparison between resume and job description (TF-IDF + Cosine)
resumeRouter.post('/targeted-match', async (req: Request, res: Response) => {
  try {
    const { resume, jobDescription, targetKeywords } = req.body;
    if (!resume) return res.status(400).json({ error: 'resume required' });
    if (!jobDescription && (!targetKeywords || targetKeywords.length === 0)) {
      return res.status(400).json({ error: 'jobDescription or targetKeywords required' });
    }

    const jdText = [
      jobDescription || '',
      Array.isArray(targetKeywords) ? targetKeywords.join(' ') : targetKeywords || '',
    ].join(' ');

    const resumeText = [
      resume.summary || '',
      (resume.experience || []).flatMap((e: any) => e.bullets || []).join(' '),
      (resume.projects || []).flatMap((p: any) => p.bullets || []).join(' '),
      Object.values(resume.skills || {}).flat().join(' '),
      (resume.target_keywords || []).join(' '),
    ].join(' ');

    const resumeTokens = tokenize(resumeText);
    const jdTokens = tokenize(jdText);

    const idf = inverseDocumentFrequency([resumeTokens, jdTokens]);
    const resumeVec = vectorize(resumeTokens, idf);
    const jdVec = vectorize(jdTokens, idf);

    const similarity = cosineSimilarity(resumeVec, jdVec);
    const relevancyScore = Math.round(Math.min(100, similarity * 180));

    const resumeSet = new Set(resumeTokens);
    const jdSet = new Set(jdTokens);

    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];

    for (const token of jdSet) {
      if (token.length < 3) continue;
      if (resumeSet.has(token)) {
        matchedKeywords.push(token);
      } else {
        missingKeywords.push(token);
      }
    }

    const sortByLength = (a: string, b: string) => b.length - a.length;
    const topMatched = matchedKeywords.sort(sortByLength).slice(0, 20);
    const topMissing = missingKeywords.sort(sortByLength).slice(0, 15);

    res.json({
      relevancyScore,
      matchedKeywords: topMatched,
      missingKeywords: topMissing,
      breakdown: [],
      source: 'tfidf-cosine-v1',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Targeted match failed' });
  }
});

// Truth-anchored AI magic write for resume bullets
resumeRouter.post('/magic-write', async (req: Request, res: Response) => {
  try {
    const { resume, bullet, section, keyword } = req.body;
    if (!resume) return res.status(400).json({ error: 'resume required' });

    const experienceSummary = (resume.experience || [])
      .map((e: any) => {
        const bullets = (e.bullets || []).slice(0, 3).join('\n- ');
        return `${e.role || e.title} at ${e.company} (${e.dates}):\n- ${bullets}`;
      })
      .join('\n\n');

    const skills = Array.isArray(resume.skills)
      ? resume.skills.join(', ')
      : Object.values(resume.skills || {}).flat().join(', ');

    const systemPrompt = `You are a professional resume writer. You MUST only rephrase or emphasize content ALREADY PRESENT in the candidate's resume.
NEVER invent employers, titles, dates, metrics, companies, or skills that are not explicitly listed.
CANDIDATE'S RESUME:
Skills: ${skills}
Experience:\n${experienceSummary}`;

    const userPrompt = keyword
      ? `Write 2 achievement-focused resume bullet points for section "${section}" naturally incorporating keyword "${keyword}". Use candidate's real experience only.`
      : `Rewrite this resume bullet to be stronger: "${bullet}". Start with a strong action verb, include a metric if present in original, keep under 30 words.`;

    let aiText = '';
    try {
      const result = await bestEffortComplete(userPrompt, {
        system: systemPrompt,
        maxTokens: 250,
        temperature: 0.3,
      });
      aiText = result.text;
    } catch {
      aiText = keyword
        ? `Leveraged ${keyword} to ${bullet || 'deliver high-impact engineering solutions'}, contributing to team goals and measurable outcomes.`
        : bullet?.replace(/^(worked on|responsible for|assisted|helped)/i, 'Engineered') || bullet;
    }

    const rawLines = aiText
      .split(/\n+/)
      .map((l: string) => l.replace(/^[\d\.\-\*\•]+\s*/, '').trim())
      .filter((l: string) => l.length > 10);

    const suggestions = rawLines.slice(0, 2).map((text: string) => ({ text, confidence: 'high' }));
    if (suggestions.length === 0) {
      suggestions.push({ text: aiText.trim().slice(0, 200), confidence: 'medium' });
    }

    res.json({ suggestions, source: 'magic-write-v1', guardrail: 'truth-anchored' });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Magic write failed' });
  }
});

// Auto-fix diff generator (never auto-saves)
resumeRouter.post('/autofix', async (req: Request, res: Response) => {
  try {
    const { resume } = req.body;
    if (!resume) return res.status(400).json({ error: 'resume required' });

    const report = evaluateResumeAts(resume);
    const weakBullets = (report.bulletFeedback || [])
      .filter((b: any) => b.status === 'can_improve')
      .slice(0, 8);

    const diff: any[] = [];

    for (const fb of weakBullets) {
      let improved = fb.bullet;
      if (!fb.hasActionVerb) {
        improved = `Engineered ${fb.bullet.charAt(0).toLowerCase() + fb.bullet.slice(1)}`;
      }

      if (improved !== fb.bullet && improved.length > 10) {
        diff.push({
          id: `change-${diff.length}`,
          type: 'bullet',
          section: fb.section,
          before: fb.bullet,
          after: improved,
          rationale: fb.suggestion,
          accepted: false,
        });
      }
    }

    res.json({
      diff,
      totalChanges: diff.length,
      warning: 'Never auto-applied. Candidate must explicitly review and accept each diff.',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Autofix failed' });
  }
});

// Clean LaTeX export with hyperlink and hierarchy preservation (§23)
resumeRouter.post('/export/latex', (req: Request, res: Response) => {
  try {
    const { latex } = req.body;
    if (!latex || typeof latex !== 'string') {
      return res.status(400).json({ error: 'LaTeX source required' });
    }
    const sanitized = sanitizeLatex(latex);
    res.json({
      success: true,
      sanitized,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Export failed' });
  }
});

// ── Skill-Gap Analysis ────────────────────────────────────────────────────
// POST /api/resume/skill-gap
// Compares resume against job description and returns a structured gap report.
resumeRouter.post('/skill-gap', (req: Request, res: Response) => {
  try {
    const { resume, jobDescription, targetRole } = req.body;
    if (!resume || typeof resume !== 'object') {
      return res.status(400).json({ success: false, error: 'Valid resume object required' });
    }
    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 20) {
      return res.status(400).json({ success: false, error: 'jobDescription string (min 20 chars) required' });
    }
    const report = computeSkillGapReport(resume as ParsedResume, jobDescription, targetRole);
    res.json({ success: true, report });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || 'Skill gap analysis failed' });
  }
});

resumeRouter.post('/parse', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      text?: string;
      pdfBase64?: string;
      docxBase64?: string;
      fileData?: string;
      mimeType?: string;
      fileName?: string;
    };
    let parsed: ParsedResume;

    const cleanB64 = (raw?: string) => (raw || '').replace(/^data:[^;]+;base64,/, '');

    if (typeof body.text === 'string' && body.text.trim().length > 0) {
      parsed = await parseResumeText(body.text);
    } else if (
      body.pdfBase64 ||
      (body.fileData && body.mimeType?.includes('pdf')) ||
      body.fileName?.toLowerCase().endsWith('.pdf')
    ) {
      const buf = Buffer.from(cleanB64(body.pdfBase64 || body.fileData), 'base64');
      parsed = await parseResumePdf(buf);
    } else if (
      body.docxBase64 ||
      (body.fileData &&
        (body.mimeType?.includes('word') || body.fileName?.toLowerCase().endsWith('.docx')))
    ) {
      const buf = Buffer.from(cleanB64(body.docxBase64 || body.fileData), 'base64');
      parsed = await parseResumeDocx(buf);
    } else if (body.fileData) {
      const buf = Buffer.from(cleanB64(body.fileData), 'base64');
      try {
        parsed = await parseResumePdf(buf);
      } catch {
        try {
          parsed = await parseResumeDocx(buf);
        } catch {
          parsed = await parseResumeText(buf.toString('utf-8'));
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Provide one of: text (.tex supported), pdfBase64, docxBase64, or fileData',
      });
    }

    // Evaluate immediate ATS report for UI score meters
    let atsReport: any = null;
    try {
      atsReport = evaluateResumeAts(parsed);
    } catch {
      // Non-fatal if scoring fails
    }

    setResume(parsed);
    res.json({
      success: true,
      data: parsed,
      resume: parsed,
      atsReport,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message || 'Failed to parse resume',
    });
  }
});

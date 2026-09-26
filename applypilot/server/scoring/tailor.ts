import type { ParsedResume, JobPosting, TailoredDocument } from '../../shared/types.js';
import { bestEffortComplete } from '../ai/index.js';
import { renderTailoredLatex } from '../export/latex-resume.js';

function pickTopBullets(resume: ParsedResume, job: JobPosting, k = 3): string[] {
  const jSkills = new Set(job.skills.map((s) => s.toLowerCase()));
  const all = resume.experience.flatMap((e) =>
    e.bullets.map((b) => ({ bullet: b, exp: `${e.title} at ${e.company}` }))
  );
  const scored = all.map((b) => {
    const lower = b.bullet.toLowerCase();
    let s = 0;
    for (const sk of jSkills) if (lower.includes(sk)) s += 1;
    if (/\d+%|\d+x|\$\d+|\d+ (users|customers|requests|ms|seconds|hours|days)/i.test(b.bullet))
      s += 1;
    return { ...b, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, k).map((b) => b.bullet);
}

export async function tailor(resume: ParsedResume, job: JobPosting): Promise<TailoredDocument> {
  const top = pickTopBullets(resume, job, 3);
  const jobSummary = `${job.title} at ${job.company} (${job.location || 'remote'}). Skills: ${job.skills.slice(0, 10).join(', ')}.`;
  const candidateSummary = `Skills: ${resume.skills.slice(0, 20).join(', ')}. Top bullets: ${top.join(' | ')}`;

  const best = await bestEffortComplete('', { maxTokens: 1 });
  const source = (best.source as 'heuristic' | 'nvidia' | 'openrouter') || 'heuristic';
  let bullets = top;
  let cover = '';
  try {
    const [bulletsRes, coverRes] = await Promise.all([
      bestEffortComplete(
        `Rewrite 3 resume bullets to better match this job. Keep them truthful to the original; do not invent metrics. One bullet per line, no numbering.\n\nOriginal bullets:\n${top.map((b) => `- ${b}`).join('\n')}\n\nJob context:\n${jobSummary}\n\nCandidate skills: ${candidateSummary}`,
        {
          maxTokens: 360,
          temperature: 0.4,
          system: 'You rewrite resume bullets honestly to better match a target role.',
        }
      ),
      bestEffortComplete(
        `Write a 3-sentence cover note for ${resume.fullName || 'a candidate'} applying to ${job.title} at ${job.company}. Mention the top matched skill. No fluff, no "I am excited to apply".\n\nCandidate skills: ${candidateSummary}\n\nJob: ${jobSummary}`,
        { maxTokens: 220, temperature: 0.5, system: 'You write concise, specific cover notes.' }
      ),
    ]);
    if (bulletsRes.text.trim()) {
      bullets = bulletsRes.text
        .split(/\n+/)
        .map((l) => l.replace(/^\s*[•\-\*\d.\)]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 3);
      if (bullets.length === 0) bullets = top;
    }
    cover = coverRes.text.trim();
  } catch (err) {
    return {
      jobId: job.id,
      bullets: top,
      coverNote: '',
      latex: renderTailoredLatex(resume, job, top),
      source,
      status: 'failed',
      error: (err as Error).message,
      generatedAt: new Date().toISOString(),
    };
  }
  return {
    jobId: job.id,
    bullets,
    coverNote: cover,
    latex: renderTailoredLatex(resume, job, bullets),
    source,
    status: 'completed',
    generatedAt: new Date().toISOString(),
  };
}

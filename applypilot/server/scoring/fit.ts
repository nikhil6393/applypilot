import type { JobPosting, ParsedResume, FitResult } from '../../shared/types.js';
import { tokenize, inverseDocumentFrequency, vectorize, cosineSimilarity } from './tfidf.js';
import { computeSemanticSimilarity } from './semantic.js';
import { compareSkills } from '@applypilot/scoring';

function resumeText(r: ParsedResume): string {
  const exp = r.experience.flatMap((e) => [e.title, e.company, ...e.bullets]).join(' ');
  const edu = r.education.map((e) => `${e.degree} ${e.institution}`).join(' ');
  return [r.fullName, r.summary, r.skills.join(' '), exp, edu].filter(Boolean).join(' ');
}

function jobText(j: JobPosting): string {
  return [j.title, j.company, j.location, j.description, j.skills.join(' ')]
    .filter(Boolean)
    .join(' ');
}

function normalizeSkills(s: string[]): string[] {
  return s.map((x) => x.toLowerCase().trim()).filter(Boolean);
}

function extractSkillsFromJobText(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens = lower.split(/[^a-z0-9+#.-]+/g).filter(Boolean);
  const found = new Set<string>();
  for (const t of tokens) if (t.length >= 2) found.add(t);
  return [...found];
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function recencyBoost(postedAt: string, now: number): number {
  const t = Date.parse(postedAt);
  if (!Number.isFinite(t)) return 0;
  const hoursAgo = (now - t) / 3600_000;
  if (hoursAgo < 0) return 1;
  return Math.exp(-hoursAgo / 72);
}

function preferencesBoost(
  j: JobPosting,
  prefs?: { preferredSources?: string[]; preferredRemote?: boolean }
): number {
  let s = 0;
  if (prefs?.preferredSources?.length && prefs.preferredSources.includes(j.source)) s += 0.5;
  if (prefs?.preferredRemote && j.remote) s += 0.5;
  return Math.min(1, s);
}

export async function scoreJob(
  resume: ParsedResume,
  job: JobPosting,
  prefs?: { preferredSources?: string[]; preferredRemote?: boolean },
  now: number = Date.now()
): Promise<FitResult> {
  const rText = resumeText(resume);
  const jText = jobText(job);
  const rTokens = tokenize(rText);
  const jTokens = tokenize(jText);
  const idf = inverseDocumentFrequency([rTokens, jTokens]);
  const rVec = vectorize(rTokens, idf);
  const jVec = vectorize(jTokens, idf);
  const cosine = cosineSimilarity(rVec, jVec);

  const safeSkills = Array.isArray(job.skills) ? job.skills : [];
  const targetSkills = safeSkills.length > 0 ? safeSkills : extractSkillsFromJobText(job.description ?? '');
  const skillComparison = compareSkills(targetSkills, resume.skills);
  const matched = skillComparison.matchedSkills;
  const missing = skillComparison.missingSkills;
  const overlap = skillComparison.overlapRatio;

  const semantic = await computeSemanticSimilarity(resume.summary || resumeText(resume).slice(0, 500), job.description || '');

  const cosine_w = 0.35;
  const semantic_w = 0.20;
  const overlap_w = 0.3;
  const recency_w = 0.1;
  const pref_w = 0.05;
  const recency = recencyBoost(job.postedAt, now);
  const pref = preferencesBoost(job, prefs);
  const score = Math.max(
    0,
    Math.min(1, cosine_w * cosine + semantic_w * semantic + overlap_w * overlap + recency_w * recency + pref_w * pref)
  );

  const reasons: string[] = [];
  if (matched.length > 0)
    reasons.push(`Matched ${matched.length} of your skills: ${matched.slice(0, 5).join(', ')}`);
  if (missing.length > 0) reasons.push(`Missing keywords: ${missing.slice(0, 5).join(', ')}`);
  if (recency > 0.5)
    reasons.push(
      `Recently posted (~${Math.round((now - Date.parse(job.postedAt)) / 3600_000)}h ago)`
    );
  if (job.remote) reasons.push('Remote-friendly');
  if (prefs?.preferredSources?.length) reasons.push(`Source: ${job.source}`);

  return {
    jobId: job.id,
    score: Number(score.toFixed(4)),
    matchedSkills: matched,
    missingSkills: missing,
    reasons,
    scoringVersion: 'fit_engine_v1',
    computedAt: new Date().toISOString(),
  };
}

export async function scoreJobs(
  resume: ParsedResume,
  jobs: JobPosting[],
  prefs?: { preferredSources?: string[]; preferredRemote?: boolean },
  now: number = Date.now()
): Promise<FitResult[]> {
  const scored = await Promise.all(jobs.map((j) => scoreJob(resume, j, prefs, now)));
  return scored.sort((a, b) => b.score - a.score);
}

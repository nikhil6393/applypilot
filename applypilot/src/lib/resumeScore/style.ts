import type { ScoreIssue, ScorerInput } from './types.js';
import { STYLE_SUB } from './weights.js';
import buzzwordsData from '../../../data/buzzwords.json' with { type: 'json' };

const BUZZWORDS: string[] = buzzwordsData as string[];

const FIRST_PERSON_RE = /\b(i |i'|i've|i'm|i'll|i'd|my |myself\b)/i;

// Detect date formats: YYYY, Mon YYYY, MM/YYYY, Month YYYY
const DATE_FORMAT_PATTERNS = [
  /\b\d{4}\b/,                         // 2023
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\b/i, // Jan 2023
  /\b\d{1,2}\/\d{4}\b/,               // 01/2023
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i,
];

function detectDateFormat(s: string): string | null {
  for (let i = 0; i < DATE_FORMAT_PATTERNS.length; i++) {
    if (DATE_FORMAT_PATTERNS[i].test(s)) return `pattern-${i}`;
  }
  return null;
}

function allBullets(resume: ScorerInput): string[] {
  return [
    ...(resume.experience || []).flatMap((e) => e.bullets || []),
    ...(resume.projects || []).flatMap((p) => p.bullets || []),
    resume.summary || '',
  ].filter(Boolean);
}

/** STYLE rule 1: detect buzzwords/clichés. */
export function scoreBuzzwords(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  if (bullets.length === 0) return { score: 0, issues: [] };

  const issues: ScoreIssue[] = [];

  for (const bullet of bullets) {
    const lower = bullet.toLowerCase();
    const found = BUZZWORDS.filter((bz) => lower.includes(bz.toLowerCase()));
    if (found.length > 0) {
      issues.push({
        id: `style-buzzword-${bullet.slice(0, 20).replace(/\s+/g, '-')}`,
        category: 'style',
        severity: 'warn',
        points: 2,
        evidence: { text: bullet, section: 'Resume' },
        fix: `Replace buzzword(s) "${found.slice(0, 2).join('", "')}" with specific, measurable facts.`,
      });
    }
  }

  const dedupedIssues = issues.filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i).slice(0, 5);
  const score = dedupedIssues.length === 0 ? 100 : Math.max(30, 100 - dedupedIssues.length * 15);
  return { score, issues: dedupedIssues };
}

/** STYLE rule 2: first-person pronouns are unprofessional in resumes. */
export function scoreFirstPerson(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  if (bullets.length === 0) return { score: 0, issues: [] };

  const issues: ScoreIssue[] = [];

  for (const bullet of bullets) {
    const match = bullet.match(FIRST_PERSON_RE);
    if (match) {
      issues.push({
        id: `style-first-person-${bullet.slice(0, 20).replace(/\s+/g, '-')}`,
        category: 'style',
        severity: 'fail',
        points: 3,
        evidence: { text: bullet, section: 'Resume' },
        fix: `Remove "${match[0].trim()}" — resume bullets are written in implied first-person without the pronoun.`,
      });
    }
  }

  const dedupedIssues = issues.filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i).slice(0, 4);
  const score = dedupedIssues.length === 0 ? 100 : Math.max(20, 100 - dedupedIssues.length * 25);
  return { score, issues: dedupedIssues };
}

/**
 * STYLE rule 3: tense consistency.
 * Past roles → past tense. Current role (dates contain "Present" or "Current") → present tense.
 */
export function scoreTense(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const experiences = resume.experience || [];
  if (experiences.length === 0) return { score: 0, issues: [] };

  const issues: ScoreIssue[] = [];

  experiences.forEach((exp, ei) => {
    const isCurrent = /present|current|now/i.test(exp.dates || '');
    // Simple heuristic: check if bullet starts with a past-tense verb marker (-ed)
    (exp.bullets || []).forEach((b, bi) => {
      const firstWord = b.trim().split(/\s+/)[0] ?? '';
      const isPastTense = firstWord.toLowerCase().endsWith('ed');
      const isPresentTense = !isPastTense;

      if (isCurrent && isPastTense) {
        issues.push({
          id: `style-tense-current-${ei}-${bi}`,
          category: 'style',
          severity: 'warn',
          points: 2,
          evidence: { text: b, section: exp.role || 'Experience', bulletIndex: bi, experienceIndex: ei },
          fix: `Current role should use present tense. Change "${firstWord}" to present tense (e.g. "Build", "Lead", "Manage").`,
        });
      } else if (!isCurrent && isPresentTense && !firstWord.match(/^(build|lead|manage|run|own|oversee)$/i)) {
        // Only flag non-standard present openers in past roles
        // (to avoid over-flagging — many verbs are ambiguous)
      }
    });
  });

  const score = issues.length === 0 ? 100 : Math.max(50, 100 - issues.length * 10);
  return { score, issues: issues.slice(0, 4) };
}

/** STYLE rule 4: repeated significant words across all bullets. */
export function scoreRepeatedWords(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  if (bullets.length === 0) return { score: 0, issues: [] };

  const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'for', 'in', 'on', 'at', 'of', 'with', 'by', 'as', 'from', 'that', 'this', 'it', 'was', 'were', 'is', 'are', 'be', 'been', 'using', 'across', 'within']);

  const wordFreq = new Map<string, number>();
  for (const b of bullets) {
    const words = b.toLowerCase().split(/\W+/).filter((w) => w.length > 4 && !STOPWORDS.has(w));
    for (const w of words) wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
  }

  const issues: ScoreIssue[] = [];
  for (const [word, count] of wordFreq) {
    if (count >= 5) {
      issues.push({
        id: `style-repeated-word-${word}`,
        category: 'style',
        severity: 'warn',
        points: 1,
        evidence: { text: `"${word}" used ${count} times`, section: 'Resume' },
        fix: `"${word}" appears ${count} times. Vary your vocabulary to signal a broader skill set.`,
      });
    }
  }

  const score = issues.length === 0 ? 100 : Math.max(60, 100 - issues.length * 10);
  return { score, issues: issues.slice(0, 3) };
}

/**
 * Combined STYLE score (0-100).
 * Weights: buzzwords=30, firstPerson=30, tense=25, repeatedWords=15.
 */
export function scoreStyle(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  if (bullets.length === 0) {
    return {
      score: 0,
      issues: [{
        id: 'style-no-content',
        category: 'style',
        severity: 'fail',
        points: 8,
        evidence: { text: 'No resume summary or bullets found to evaluate style', section: 'Resume' },
        fix: 'Add a professional summary and bullet points to your resume.',
      }],
    };
  }

  const bz = scoreBuzzwords(resume);
  const fp = scoreFirstPerson(resume);
  const te = scoreTense(resume);
  const rw = scoreRepeatedWords(resume);

  const score = Math.round(
    (bz.score * STYLE_SUB.buzzwords +
     fp.score * STYLE_SUB.firstPerson +
     te.score * STYLE_SUB.tense +
     rw.score * STYLE_SUB.repeatedWords) / 100
  );

  return { score, issues: [...bz.issues, ...fp.issues, ...te.issues, ...rw.issues] };
}

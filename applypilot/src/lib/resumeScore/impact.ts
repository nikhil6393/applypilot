import type { ScoreIssue, ScorerInput } from './types.js';
import { IMPACT_SUB, THRESHOLDS } from './weights.js';
import actionVerbsData from '../../../data/action-verbs.json' with { type: 'json' };

/** Flat set of all action verbs (lowercase) for O(1) lookup. */
const ALL_ACTION_VERBS: Set<string> = new Set(
  Object.values(actionVerbsData as Record<string, string[]>)
    .flat()
    .map((v) => v.toLowerCase())
);

const WEAK_OPENER_RE =
  /^(responsible for|worked on|helped|assisted|duties included|participated in|involved in|tasked with|was part of)/i;

/** Regex: number, %, $, x multiplier, ms, or scale word */
const METRIC_RE = /\d+%|\d+x|\$\d+|\d+\s?(ms|seconds?|hours?|days?|weeks?|months?|users?|customers?|requests?|queries|calls?|records?|teams?|engineers?|repos?|services?|nodes?|servers?)/i;

/** Extract all bullets from experience + projects. */
function allBullets(resume: ScorerInput): Array<{ text: string; expIdx: number; bIdx: number; section: string }> {
  const out: Array<{ text: string; expIdx: number; bIdx: number; section: string }> = [];
  (resume.experience || []).forEach((exp, ei) => {
    (exp.bullets || []).forEach((b, bi) => {
      out.push({ text: b, expIdx: ei, bIdx: bi, section: exp.role || exp.title || 'Experience' });
    });
  });
  (resume.projects || []).forEach((p, pi) => {
    (p.bullets || []).forEach((b, bi) => {
      out.push({ text: b, expIdx: pi, bIdx: bi, section: 'Projects' });
    });
  });
  return out;
}

/** IMPACT rule 1: % of bullets containing a metric. */
export function scoreQuantifiedBullets(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  if (bullets.length === 0) return { score: 0, issues: [] };

  const issues: ScoreIssue[] = [];
  let quantified = 0;

  for (const b of bullets) {
    if (METRIC_RE.test(b.text)) {
      quantified++;
    } else {
      issues.push({
        id: `impact-no-metric-${b.expIdx}-${b.bIdx}`,
        category: 'impact',
        severity: 'warn',
        points: 2,
        evidence: { text: b.text, section: b.section, bulletIndex: b.bIdx, experienceIndex: b.expIdx },
        fix: 'Add a metric — e.g. "reduced load time by 40%", "served 10 k users", "completed in 2 days".',
      });
    }
  }

  const ratio = quantified / bullets.length;
  const score = ratio >= THRESHOLDS.quantifiedBulletsMinPct
    ? 100
    : Math.round((ratio / THRESHOLDS.quantifiedBulletsMinPct) * 100);

  // Only keep the worst 5 issues to avoid UI clutter
  return { score, issues: issues.slice(0, 5) };
}

/** IMPACT rule 2: bullets starting with a weak/passive opener. */
export function scoreWeakOpeners(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  if (bullets.length === 0) return { score: 0, issues: [] };

  const issues: ScoreIssue[] = [];
  for (const b of bullets) {
    const match = b.text.match(WEAK_OPENER_RE);
    if (match) {
      issues.push({
        id: `impact-weak-opener-${b.expIdx}-${b.bIdx}`,
        category: 'impact',
        severity: 'fail',
        points: 4,
        evidence: { text: b.text, section: b.section, bulletIndex: b.bIdx, experienceIndex: b.expIdx },
        fix: `Replace "${match[0]}" with a strong action verb (e.g. Engineered, Delivered, Reduced).`,
      });
    }
  }

  const badRatio = issues.length / bullets.length;
  const score = Math.round(Math.max(0, (1 - badRatio * 2)) * 100);
  return { score, issues };
}

/** IMPACT rule 3: % of bullets starting with a recognised action verb. */
export function scoreActionVerbs(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  if (bullets.length === 0) return { score: 0, issues: [] };

  const issues: ScoreIssue[] = [];
  let goodCount = 0;

  for (const b of bullets) {
    const firstWord = b.text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
    if (ALL_ACTION_VERBS.has(firstWord)) {
      goodCount++;
    } else {
      issues.push({
        id: `impact-no-verb-${b.expIdx}-${b.bIdx}`,
        category: 'impact',
        severity: 'warn',
        points: 3,
        evidence: { text: b.text, section: b.section, bulletIndex: b.bIdx, experienceIndex: b.expIdx },
        fix: `Start with an action verb. "${firstWord || b.text.slice(0, 20)}" is not a recognized action verb.`,
      });
    }
  }

  const ratio = goodCount / bullets.length;
  const score = ratio >= THRESHOLDS.actionVerbMinPct
    ? 100
    : Math.round((ratio / THRESHOLDS.actionVerbMinPct) * 100);

  return { score, issues: issues.slice(0, 4) };
}

/** IMPACT rule 4: same opening verb used more than THRESHOLD times. */
export function scoreRepeatedVerbs(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  if (bullets.length === 0) return { score: 0, issues: [] };

  const verbCount = new Map<string, number>();

  for (const b of bullets) {
    const firstWord = b.text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
    if (ALL_ACTION_VERBS.has(firstWord)) {
      verbCount.set(firstWord, (verbCount.get(firstWord) ?? 0) + 1);
    }
  }

  const issues: ScoreIssue[] = [];
  for (const [verb, count] of verbCount) {
    if (count > THRESHOLDS.repeatedVerbThreshold) {
      issues.push({
        id: `impact-repeated-verb-${verb}`,
        category: 'impact',
        severity: 'warn',
        points: 2,
        evidence: {
          text: `"${verb}" used ${count} times`,
          section: 'Experience',
        },
        fix: `"${verb}" appears ${count} times. Vary your openers — see action-verbs list for alternatives.`,
      });
    }
  }

  const score = issues.length === 0 ? 100 : Math.max(40, 100 - issues.length * 20);
  return { score, issues };
}

/**
 * Combined IMPACT score (0-100) and all impact issues.
 * Weights: quantified=40, weakOpeners=30, actionVerbs=20, repeatedVerbs=10.
 */
export function scoreImpact(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  if (bullets.length === 0) {
    return {
      score: 0,
      issues: [{
        id: 'impact-no-bullets',
        category: 'impact',
        severity: 'fail',
        points: 10,
        evidence: { text: 'No experience or project bullets found', section: 'Resume' },
        fix: 'Add experience or project bullet points demonstrating your achievements.',
      }],
    };
  }

  const q = scoreQuantifiedBullets(resume);
  const w = scoreWeakOpeners(resume);
  const a = scoreActionVerbs(resume);
  const r = scoreRepeatedVerbs(resume);

  const score = Math.round(
    (q.score * IMPACT_SUB.quantifiedBullets +
     w.score * IMPACT_SUB.weakOpeners +
     a.score * IMPACT_SUB.actionVerbs +
     r.score * IMPACT_SUB.repeatedVerbs) / 100
  );

  return {
    score,
    issues: [...q.issues, ...w.issues, ...a.issues, ...r.issues],
  };
}

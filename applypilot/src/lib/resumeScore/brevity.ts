import type { ScoreIssue, ScorerInput } from './types.js';
import { BREVITY_SUB, THRESHOLDS } from './weights.js';
import fillerWordsData from '../../../data/filler-words.json' with { type: 'json' };

const FILLER_WORDS: string[] = fillerWordsData as string[];

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

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

/** BREVITY rule 1: flag bullets that are too long (> 30 words) or too short (< 6 words). */
export function scoreBulletLength(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  if (bullets.length === 0) return { score: 0, issues: [] };

  const issues: ScoreIssue[] = [];
  for (const b of bullets) {
    const wc = wordCount(b.text);
    if (wc > THRESHOLDS.bulletMaxWords) {
      issues.push({
        id: `brevity-too-long-${b.expIdx}-${b.bIdx}`,
        category: 'brevity',
        severity: 'warn',
        points: 3,
        evidence: { text: b.text, section: b.section, bulletIndex: b.bIdx, experienceIndex: b.expIdx },
        fix: `This bullet is ${wc} words. Cut to under 30 — remove filler and split compound ideas.`,
      });
    } else if (wc < THRESHOLDS.bulletMinWords) {
      issues.push({
        id: `brevity-too-short-${b.expIdx}-${b.bIdx}`,
        category: 'brevity',
        severity: 'warn',
        points: 2,
        evidence: { text: b.text, section: b.section, bulletIndex: b.bIdx, experienceIndex: b.expIdx },
        fix: `This bullet is only ${wc} words. Add context: what you did, how, and the outcome.`,
      });
    }
  }

  const badRatio = issues.length / bullets.length;
  const score = Math.round(Math.max(0, (1 - badRatio) * 100));
  return { score, issues };
}

/** BREVITY rule 2: each role should have 3-6 bullets. */
export function scoreBulletsPerRole(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const experiences = resume.experience || [];
  if (experiences.length === 0) return { score: 0, issues: [] };

  const issues: ScoreIssue[] = [];
  for (let ei = 0; ei < experiences.length; ei++) {
    const exp = experiences[ei];
    const count = (exp.bullets || []).length;
    const role = exp.role || exp.title || `Role ${ei + 1}`;

    if (count < THRESHOLDS.bulletsPerRoleMin) {
      issues.push({
        id: `brevity-few-bullets-${ei}`,
        category: 'brevity',
        severity: 'warn',
        points: 4,
        evidence: { text: `${count} bullet(s) for ${role} at ${exp.company || ''}`, section: 'Experience', experienceIndex: ei },
        fix: `"${role}" has only ${count} bullet(s). Add ${THRESHOLDS.bulletsPerRoleMin - count} more showing impact.`,
      });
    } else if (count > THRESHOLDS.bulletsPerRoleMax) {
      issues.push({
        id: `brevity-many-bullets-${ei}`,
        category: 'brevity',
        severity: 'warn',
        points: 2,
        evidence: { text: `${count} bullets for ${role} at ${exp.company || ''}`, section: 'Experience', experienceIndex: ei },
        fix: `"${role}" has ${count} bullets. Cut to the top 6 highest-impact ones.`,
      });
    }
  }

  const badRatio = issues.length / experiences.length;
  const score = Math.round(Math.max(0, (1 - badRatio) * 100));
  return { score, issues };
}

/** BREVITY rule 3: detect filler words in bullet text. */
export function scoreFillerWords(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  if (bullets.length === 0) return { score: 0, issues: [] };

  const issues: ScoreIssue[] = [];
  for (const b of bullets) {
    const lower = b.text.toLowerCase();
    const found = FILLER_WORDS.filter((fw) => lower.includes(fw.toLowerCase()));
    if (found.length > 0) {
      issues.push({
        id: `brevity-filler-${b.expIdx}-${b.bIdx}`,
        category: 'brevity',
        severity: 'warn',
        points: 2,
        evidence: { text: b.text, section: b.section, bulletIndex: b.bIdx, experienceIndex: b.expIdx },
        fix: `Remove filler: "${found.join('", "')}" — replace with specific facts or delete.`,
      });
    }
  }

  const fillerRatio = issues.length / bullets.length;
  const score = Math.round(Math.max(0, (1 - fillerRatio) * 100));
  return { score, issues: issues.slice(0, 5) };
}

/**
 * Combined BREVITY score (0-100).
 * Weights: bulletLength=40, bulletsPerRole=30, fillerWords=30.
 */
export function scoreBrevity(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const bullets = allBullets(resume);
  const experiences = resume.experience || [];
  if (bullets.length === 0 && experiences.length === 0) {
    return {
      score: 0,
      issues: [{
        id: 'brevity-no-content',
        category: 'brevity',
        severity: 'fail',
        points: 8,
        evidence: { text: 'No experience bullets to evaluate for length or brevity', section: 'Resume' },
        fix: 'Add detailed bullet points under your work experience.',
      }],
    };
  }

  const bl = scoreBulletLength(resume);
  const bpr = scoreBulletsPerRole(resume);
  const fw = scoreFillerWords(resume);

  const score = Math.round(
    (bl.score * BREVITY_SUB.bulletLength +
     bpr.score * BREVITY_SUB.bulletsPerRole +
     fw.score * BREVITY_SUB.fillerWords) / 100
  );

  return { score, issues: [...bl.issues, ...bpr.issues, ...fw.issues] };
}

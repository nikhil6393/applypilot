/**
 * resumeScore — deterministic, offline resume scorer.
 *
 * Usage:
 *   import { scoreResume } from './lib/resumeScore/index.js';
 *   const report = scoreResume(parsedResume);
 *
 * Disclaimer: scores estimate ATS-friendliness based on rule-based heuristics.
 * They do not represent any real ATS vendor's algorithm or guarantee outcomes.
 */
import type { ScoreReport, ScorerInput } from './types.js';
import { CATEGORY_WEIGHTS } from './weights.js';
import { scoreImpact } from './impact.js';
import { scoreBrevity } from './brevity.js';
import { scoreStyle } from './style.js';
import { scoreSections } from './sections.js';

export type { ScoreReport, ScorerInput, ScoreIssue, IssueSeverity, IssueCategory, CategoryScores } from './types.js';

/**
 * Score a resume deterministically.
 * Same input ALWAYS produces the same output (no randomness, no I/O).
 */
export function scoreResume(resume: ScorerInput): ScoreReport {
  const impact  = scoreImpact(resume);
  const brevity = scoreBrevity(resume);
  const style   = scoreStyle(resume);
  const sections = scoreSections(resume);

  const overall = Math.round(
    (impact.score   * CATEGORY_WEIGHTS.impact   +
     brevity.score  * CATEGORY_WEIGHTS.brevity  +
     style.score    * CATEGORY_WEIGHTS.style    +
     sections.score * CATEGORY_WEIGHTS.sections) / 100
  );

  // Sort issues: fail first, then warn, then pass; within same severity by points desc
  const SEVERITY_ORDER: Record<string, number> = { fail: 0, warn: 1, pass: 2 };
  const allIssues = [
    ...impact.issues,
    ...brevity.issues,
    ...style.issues,
    ...sections.issues,
  ].sort((a, b) => {
    const sd = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return sd !== 0 ? sd : b.points - a.points;
  });

  return {
    overall: Math.max(0, Math.min(100, overall)),
    categories: {
      impact:   Math.max(0, Math.min(100, impact.score)),
      brevity:  Math.max(0, Math.min(100, brevity.score)),
      style:    Math.max(0, Math.min(100, style.score)),
      sections: Math.max(0, Math.min(100, sections.score)),
    },
    issues: allIssues,
  };
}

// Re-export individual scorers for granular use in UI / tests
export { scoreImpact, scoreBrevity, scoreStyle, scoreSections };
export {
  scoreQuantifiedBullets, scoreWeakOpeners, scoreActionVerbs, scoreRepeatedVerbs,
} from './impact.js';
export {
  scoreBulletLength, scoreBulletsPerRole, scoreFillerWords,
} from './brevity.js';
export {
  scoreBuzzwords, scoreFirstPerson, scoreTense, scoreRepeatedWords,
} from './style.js';
export {
  scoreContact, scoreEssentialSections, scoreAtsHeadings,
} from './sections.js';

import { canonicalizeSkill, areSkillsEquivalent } from './taxonomy.js';

export interface SkillMatchResult {
  matched: string[];
  missing: string[];
  candidateSkills: string[];
  jobKeywords: string[];
  matchRate: number; // 0 to 100 percentage
  overallScore: number;
}

/**
 * Match candidate skills against job keywords using canonical taxonomy equivalency.
 */
export function matchSkills(candidateSkills: string[], jobKeywords: string[]): SkillMatchResult {
  const normCandidate = Array.from(new Set(candidateSkills.map(canonicalizeSkill)));
  const normJob = Array.from(new Set(jobKeywords.map(canonicalizeSkill)));

  if (normJob.length === 0) {
    return {
      matched: normCandidate,
      missing: [],
      candidateSkills: normCandidate,
      jobKeywords: [],
      matchRate: 100,
      overallScore: 90,
    };
  }

  const matched: string[] = [];
  const missing: string[] = [];

  for (const jk of normJob) {
    const isMatch = normCandidate.some((cs) => areSkillsEquivalent(cs, jk));
    if (isMatch) {
      matched.push(jk);
    } else {
      missing.push(jk);
    }
  }

  const matchRate = Math.round((matched.length / normJob.length) * 100);
  // Overall score blends base score + match rate
  const overallScore = Math.min(100, Math.max(50, Math.round(60 + (matchRate * 0.4))));

  return {
    matched,
    missing,
    candidateSkills: normCandidate,
    jobKeywords: normJob,
    matchRate,
    overallScore,
  };
}

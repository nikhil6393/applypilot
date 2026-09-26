import type { CanonicalJob, CanonicalResume, FitResult } from '@applypilot/domain';
import { compareSkills, resolveSkill } from './taxonomy.js';

export interface FitEngineOptions {
  version?: 'fit_engine_v1';
  preferredRemote?: boolean;
  preferredLocations?: string[];
}

export interface FitEvaluationEvidence {
  category: 'hard_requirement' | 'skill_overlap' | 'location' | 'employment' | 'recency';
  impact: number; // positive or negative score delta
  description: string;
}

export interface DetailedFitReport {
  scoringVersion: 'fit_engine_v1';
  fitScore: number; // 0 to 100 integer
  matchedSkills: string[];
  missingSkills: string[];
  evidence: FitEvaluationEvidence[];
  warnings: string[];
  evaluatedAt: string;
}

export class DeterministicFitEngine {
  readonly version = 'fit_engine_v1' as const;

  /**
   * Deterministically evaluates candidate resume fit against a job posting
   * using the v1 weighted formula.
   */
  evaluateFit(
    resume: CanonicalResume,
    job: CanonicalJob,
    opts: FitEngineOptions = {}
  ): DetailedFitReport {
    const evidence: FitEvaluationEvidence[] = [];
    const warnings: string[] = [];

    // 1. Skill Taxonomy Comparison
    const jobSkillNames = (job.skills || []).map((s) => (typeof s === 'string' ? s : s.name));
    const resumeSkillNames = (resume.skills || []).map((s) => (typeof s === 'string' ? s : s.name));
    const skillComparison = compareSkills(jobSkillNames, resumeSkillNames);

    // Baseline points from skill overlap (up to 50 pts)
    const skillPoints = Math.round(skillComparison.overlapRatio * 50);
    evidence.push({
      category: 'skill_overlap',
      impact: skillPoints,
      description: `Matched ${skillComparison.matchedSkills.length} of ${jobSkillNames.length} key skills (${skillPoints}/50 pts)`,
    });

    // 2. Experience Evidence (up to 20 pts)
    let experiencePoints = 0;
    const resumeExpText = (resume.experience || [])
      .map((e) => `${e.title || e.role || ''} ${e.company || ''} ${e.bullets?.join(' ') || ''}`)
      .join(' ')
      .toLowerCase();

    let matchedInExperienceCount = 0;
    for (const skill of skillComparison.matchedSkills) {
      if (resumeExpText.includes(skill.toLowerCase())) {
        matchedInExperienceCount++;
      }
    }

    if (skillComparison.matchedSkills.length > 0) {
      const expRatio = matchedInExperienceCount / skillComparison.matchedSkills.length;
      experiencePoints = Math.round(expRatio * 20);
    }
    evidence.push({
      category: 'skill_overlap',
      impact: experiencePoints,
      description: `Hands-on work experience mentions for ${matchedInExperienceCount} matched skills (${experiencePoints}/20 pts)`,
    });

    // 3. Location / Remote Compatibility (up to 15 pts)
    let locationPoints = 10;
    if (job.remoteType === 'remote') {
      locationPoints = 15;
      evidence.push({
        category: 'location',
        impact: 15,
        description: 'Fully remote role matching candidate availability (+15 pts)',
      });
    } else if (opts.preferredLocations && opts.preferredLocations.length > 0) {
      const jobLoc = (job.locations[0]?.raw || '').toLowerCase();
      const matchesPref = opts.preferredLocations.some((loc) =>
        jobLoc.includes(loc.toLowerCase())
      );
      if (matchesPref) {
        locationPoints = 15;
        evidence.push({
          category: 'location',
          impact: 15,
          description: `Location aligns with preferred locations: ${job.locations[0]?.raw} (+15 pts)`,
        });
      } else {
        locationPoints = 5;
        evidence.push({
          category: 'location',
          impact: 5,
          description: `On-site/Hybrid position in ${job.locations[0]?.raw || 'specified office'} (+5 pts)`,
        });
      }
    } else {
      evidence.push({
        category: 'location',
        impact: 10,
        description: 'Location considered compatible (+10 pts)',
      });
    }

    // 4. Recency Boost (up to 15 pts)
    let recencyPoints = 5;
    if (job.postedAt) {
      const postedTime = Date.parse(job.postedAt);
      if (Number.isFinite(postedTime)) {
        const hoursAgo = (Date.now() - postedTime) / 3600_000;
        if (hoursAgo <= 24) {
          recencyPoints = 15;
          evidence.push({
            category: 'recency',
            impact: 15,
            description: `Posted within last 24h (~${Math.round(hoursAgo)}h ago) (+15 pts)`,
          });
        } else if (hoursAgo <= 72) {
          recencyPoints = 10;
          evidence.push({
            category: 'recency',
            impact: 10,
            description: `Posted within last 3 days (+10 pts)`,
          });
        } else {
          evidence.push({
            category: 'recency',
            impact: 5,
            description: `Standard posting active for >3 days (+5 pts)`,
          });
        }
      }
    } else {
      evidence.push({
        category: 'recency',
        impact: 5,
        description: 'Default recency score (+5 pts)',
      });
    }

    // 5. Hard Requirements & Missing Critical Skills Penalty
    let penalties = 0;
    if (job.requirements && job.requirements.length > 0) {
      for (const req of job.requirements) {
        const reqLower = req.toLowerCase();
        // Check if mandatory requirement requires a skill that is completely missing
        for (const missing of skillComparison.missingSkills) {
          if (reqLower.includes(missing.toLowerCase())) {
            penalties += 5;
            warnings.push(`Missing mandatory requirement: ${missing}`);
          }
        }
      }
    }

    if (penalties > 0) {
      evidence.push({
        category: 'hard_requirement',
        impact: -penalties,
        description: `Deduction for ${warnings.length} missing stated requirements (-${penalties} pts)`,
      });
    }

    // Sum and clamp to 0-100
    const rawTotal = skillPoints + experiencePoints + locationPoints + recencyPoints - penalties;
    const finalScore = Math.max(0, Math.min(100, rawTotal));

    return {
      scoringVersion: this.version,
      fitScore: finalScore,
      matchedSkills: skillComparison.matchedSkills,
      missingSkills: skillComparison.missingSkills,
      evidence,
      warnings,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export const defaultFitEngine = new DeterministicFitEngine();

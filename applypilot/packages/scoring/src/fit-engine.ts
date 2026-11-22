import type { CanonicalJob, CanonicalResume } from '@applypilot/domain';
import { compareSkills, extractKnownSkills, normalizeSkillList } from './taxonomy.js';

export interface FitEngineOptions {
  version?: 'fit_engine_v1';
  preferredRemote?: boolean;
  preferredWorkplace?: 'remote' | 'hybrid' | 'on-site';
  preferredLocations?: string[];
  preferredEmploymentTypes?: string[];
}

export interface FitEvaluationEvidence {
  category:
    | 'hard_requirement'
    | 'skill_overlap'
    | 'experience'
    | 'role_alignment'
    | 'preference'
    | 'location'
    | 'employment'
    | 'recency';
  impact: number; // positive or negative score delta
  description: string;
}

export interface DetailedFitReport {
  scoringVersion: 'fit_engine_v1';
  fitScore: number | null; // 0 to 100 integer, null when no comparable evidence exists
  matchedSkills: string[];
  missingSkills: string[];
  availableEvidence: string[];
  evidence: FitEvaluationEvidence[];
  warnings: string[];
  evaluatedAt: string;
}

function getSkillNames(skills: unknown): string[] {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((skill) => (typeof skill === 'string' ? skill : skill?.name))
    .filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0);
}

function roleTokens(value: string): Set<string> {
  const stopWords = new Set([
    'engineer',
    'developer',
    'software',
    'senior',
    'junior',
    'staff',
    'principal',
    'lead',
    'specialist',
  ]);
  return new Set(
    value
      .toLowerCase()
      .replace(/front[- ]end/g, 'frontend')
      .replace(/back[- ]end/g, 'backend')
      .match(/[a-z0-9+#.]+/g)
      ?.filter((token) => token.length > 1 && !stopWords.has(token)) || [],
  );
}

function roleOverlap(candidateRole: string, jobTitle: string): number {
  const candidateTokens = roleTokens(candidateRole);
  const jobTokens = roleTokens(jobTitle);
  if (!candidateTokens.size || !jobTokens.size) return 0;
  const overlap = [...candidateTokens].filter((token) => jobTokens.has(token)).length;
  return overlap / new Set([...candidateTokens, ...jobTokens]).size;
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
    const warnings: string[] = [];
    const jobText = [
      job.title,
      job.description,
      ...(job.requirements || []),
      ...(job.responsibilities || []),
    ].join(' ');
    const jobSkillNames = normalizeSkillList([
      ...getSkillNames(job.skills),
      ...extractKnownSkills(jobText),
    ]);
    const resumeSkillNames = normalizeSkillList(getSkillNames(resume.skills));
    const skillComparison = compareSkills(jobSkillNames, resumeSkillNames);
    const components: Array<{
      category: FitEvaluationEvidence['category'];
      weight: number;
      score: number;
      description: string;
    }> = [];

    if (jobSkillNames.length > 0 && resumeSkillNames.length > 0) {
      components.push({
        category: 'skill_overlap',
        weight: 50,
        score: skillComparison.overlapRatio,
        description: `Skills: ${skillComparison.matchedSkills.length} of ${jobSkillNames.length} matched`,
      });
    }

    const experienceText = [
      ...(resume.experience || []).map(
        (item) => `${item.title || item.role || ''} ${item.company || ''} ${(item.bullets || []).join(' ')}`,
      ),
      ...(resume.projects || []).map(
        (item) => `${item.name || ''} ${item.description || ''} ${(item.tech || []).join(' ')} ${(item.bullets || []).join(' ')}`,
      ),
    ]
      .join(' ')
      .toLowerCase();

    if (jobSkillNames.length > 0 && experienceText.trim()) {
      const evidencedSkills = jobSkillNames.filter((skill) =>
        experienceText.includes(skill.toLowerCase()),
      ).length;
      components.push({
        category: 'experience',
        weight: 20,
        score: evidencedSkills / jobSkillNames.length,
        description: `Experience/projects mention ${evidencedSkills} of ${jobSkillNames.length} listed skills`,
      });
    }

    const candidateRoles = [
      ...(resume.targetRoles || []),
      ...(resume.experience || []).map((item) => item.title || item.role || ''),
    ].filter(Boolean);
    if (candidateRoles.length > 0 && job.title) {
      const roleScore = Math.max(...candidateRoles.map((role) => roleOverlap(role, job.title)));
      components.push({
        category: 'role_alignment',
        weight: 20,
        score: roleScore,
        description: `Role alignment: ${Math.round(roleScore * 100)}%`,
      });
    }

    const preferenceMatches: number[] = [];
    if (opts.preferredWorkplace && job.remoteType !== 'unknown') {
      preferenceMatches.push(Number(job.remoteType === opts.preferredWorkplace));
    } else if (opts.preferredRemote !== undefined && job.remoteType !== 'unknown') {
      preferenceMatches.push(Number((job.remoteType === 'remote') === opts.preferredRemote));
    }
    if (opts.preferredLocations?.length && job.locations?.length) {
      const jobLocations = job.locations.map((location) => (location.raw || '').toLowerCase());
      preferenceMatches.push(
        Number(opts.preferredLocations.some((preferred) =>
          jobLocations.some((location) => location.includes(preferred.toLowerCase())),
        )),
      );
    }
    if (opts.preferredEmploymentTypes?.length && job.employmentType !== 'unknown') {
      const employmentType = job.employmentType.toLowerCase().replace(/_/g, '-');
      preferenceMatches.push(
        Number(opts.preferredEmploymentTypes.some(
          (preferred) => preferred.toLowerCase().replace(/_/g, '-') === employmentType,
        )),
      );
    }
    if (preferenceMatches.length > 0) {
      components.push({
        category: 'preference',
        weight: 10,
        score: preferenceMatches.reduce((sum, match) => sum + match, 0) / preferenceMatches.length,
        description: `Explicit preferences matched ${preferenceMatches.filter(Boolean).length} of ${preferenceMatches.length} known job details`,
      });
    }

    if (job.requirements && job.requirements.length > 0) {
      for (const req of job.requirements) {
        const reqLower = req.toLowerCase();
        for (const missing of skillComparison.missingSkills) {
          if (reqLower.includes(missing.toLowerCase())) {
            warnings.push(`Missing mandatory requirement: ${missing}`);
          }
        }
      }
    }

    const availableWeight = components.reduce((sum, component) => sum + component.weight, 0);
    const weightedScore = components.reduce(
      (sum, component) => sum + component.score * component.weight,
      0,
    );
    const evidence = components.map((component) => ({
      category: component.category,
      impact: availableWeight
        ? Math.round((component.score * component.weight * 100) / availableWeight)
        : 0,
      description: component.description,
    }));

    return {
      scoringVersion: this.version,
      fitScore: availableWeight
        ? Math.max(0, Math.min(100, Math.round((weightedScore / availableWeight) * 100)))
        : null,
      matchedSkills: skillComparison.matchedSkills,
      missingSkills: skillComparison.missingSkills,
      availableEvidence: components.map((component) => component.category),
      evidence,
      warnings,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export const defaultFitEngine = new DeterministicFitEngine();

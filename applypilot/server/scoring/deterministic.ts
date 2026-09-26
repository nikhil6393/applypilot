import type { ParsedResume, JobPosting, JobFitResult } from '../../src/types.js';

export interface ScoreBreakdown {
  skillScore: number; // 30% weight
  roleScore: number; // 20% weight
  experienceScore: number; // 15% weight
  locationScore: number; // 10% weight
  educationScore: number; // 10% weight
  projectScore: number; // 5% weight
  keywordScore: number; // 5% weight
  freshnessScore: number; // 5% weight
}

export interface DetailedFitResult extends JobFitResult {
  scoreBreakdown: ScoreBreakdown;
}

/**
 * Transparent, rules-based, non-fabricating candidate-to-job fit calculator.
 * Strictly calculates score based on actual skills, target roles, experience,
 * education, location, projects, and posting freshness. Zero artificial inflating.
 */
export function calculateDeterministicFitScore(
  resume: ParsedResume,
  job: JobPosting
): DetailedFitResult {
  // 1. Collect candidate skills
  const candidateSkills = new Set<string>();
  if (resume.skills) {
    const categories = [
      ...(resume.skills.languages || []),
      ...(resume.skills.frameworks || []),
      ...(resume.skills.tools || []),
      ...(resume.skills.domain || []),
    ];
    categories.forEach((s) => {
      if (s && typeof s === 'string') {
        candidateSkills.add(s.toLowerCase().trim());
      }
    });
  }

  // 2. Extract job skills and text tokens
  const jobTags = (job.tags || []).map((t) => t.toLowerCase().trim());
  const jobTitleLower = (job.title || '').toLowerCase();
  const jobDescLower = (job.description || '').toLowerCase();
  const jobCompanyLower = (job.company || '').toLowerCase();
  const jobLocationLower = (job.location || '').toLowerCase();

  // Combine full job text
  const fullJobText = `${jobTitleLower} ${jobCompanyLower} ${jobLocationLower} ${jobTags.join(' ')} ${jobDescLower}`;

  // -------------------------------------------------------------
  // Skill Match (30 points max)
  // -------------------------------------------------------------
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  candidateSkills.forEach((skill) => {
    if (skill.length >= 2 && fullJobText.includes(skill)) {
      matchedSkills.push(skill);
    }
  });

  jobTags.forEach((tag) => {
    if (tag.length >= 2 && !candidateSkills.has(tag)) {
      if (!missingSkills.includes(tag)) missingSkills.push(tag);
    }
  });

  const targetSkillCount = Math.max(3, Math.min(10, jobTags.length || 5));
  const skillRatio = Math.min(1.0, matchedSkills.length / targetSkillCount);
  const skillScore = Math.round(skillRatio * 30);

  // -------------------------------------------------------------
  // Role Title Match (20 points max)
  // -------------------------------------------------------------
  let roleScore = 0;
  const targetRoles = (resume.target_roles || []).map((r) => r.toLowerCase());
  const candidateExpRoles = (resume.experience || []).map((e) => (e.role || '').toLowerCase());
  const allCandidateRoles = [...targetRoles, ...candidateExpRoles];

  for (const role of allCandidateRoles) {
    if (!role) continue;
    if (jobTitleLower.includes(role) || role.includes(jobTitleLower)) {
      roleScore = 20;
      break;
    }
    const roleTokens = role.split(/\s+/).filter((t) => t.length > 2);
    const titleTokens = jobTitleLower.split(/\s+/).filter((t) => t.length > 2);
    const commonTokens = roleTokens.filter((t) => titleTokens.includes(t));
    if (commonTokens.length > 0) {
      const partialScore = Math.round(
        (commonTokens.length / Math.max(roleTokens.length, titleTokens.length)) * 20
      );
      roleScore = Math.max(roleScore, partialScore);
    }
  }

  // -------------------------------------------------------------
  // Experience / Seniority Match (15 points max)
  // -------------------------------------------------------------
  let experienceScore = 0;
  const isInternshipJob =
    job.isInternship ||
    jobTitleLower.includes('intern') ||
    jobTags.some((t) => t.includes('intern'));
  const candidateIsInternOrNewGrad = Boolean(
    resume.graduationBatch ||
    (resume.education || []).some((e) => {
      const deg = (e.degree || '').toLowerCase();
      return (
        deg.includes('bachelor') ||
        deg.includes('b.s') ||
        deg.includes('b.tech') ||
        deg.includes('student')
      );
    })
  );

  if (isInternshipJob && candidateIsInternOrNewGrad) {
    experienceScore = 15;
  } else if (!isInternshipJob) {
    const expCount = (resume.experience || []).length;
    experienceScore = Math.min(15, expCount * 5);
  } else {
    experienceScore = 10;
  }

  // -------------------------------------------------------------
  // Location & Remote Match (10 points max)
  // -------------------------------------------------------------
  let locationScore = 0;
  const candidateLocation = (resume.contact?.location || '').toLowerCase();

  if (job.isRemote) {
    locationScore = 10;
  } else if (
    candidateLocation &&
    (jobLocationLower.includes(candidateLocation) || candidateLocation.includes(jobLocationLower))
  ) {
    locationScore = 10;
  } else if (
    !jobLocationLower ||
    jobLocationLower.includes('remote') ||
    jobLocationLower.includes('anywhere')
  ) {
    locationScore = 10;
  } else {
    locationScore = 4;
  }

  // -------------------------------------------------------------
  // Education & Batch Alignment (10 points max)
  // -------------------------------------------------------------
  let educationScore = 0;
  const eduList = resume.education || [];
  if (eduList.length > 0) {
    educationScore = 7;
    if (job.eligibleBatches && job.eligibleBatches.length > 0 && resume.graduationBatch) {
      if (
        job.eligibleBatches.includes(resume.graduationBatch) ||
        job.eligibleBatches.includes('All Batches')
      ) {
        educationScore = 10;
      }
    } else {
      educationScore = 10;
    }
  }

  // -------------------------------------------------------------
  // Projects & Tech Match (5 points max)
  // -------------------------------------------------------------
  let projectScore = 0;
  const projects = resume.projects || [];
  let projectTechMatches = 0;
  projects.forEach((p) => {
    const techList = (p.tech || []).map((t) => t.toLowerCase());
    techList.forEach((t) => {
      if (fullJobText.includes(t)) projectTechMatches++;
    });
  });
  projectScore = Math.min(5, projectTechMatches > 0 ? 3 + Math.min(2, projectTechMatches) : 0);

  // -------------------------------------------------------------
  // Target Keywords Match (5 points max)
  // -------------------------------------------------------------
  let keywordScore = 0;
  const targetKeywords = (resume.target_keywords || []).map((k) => k.toLowerCase());
  let kwMatchedCount = 0;
  targetKeywords.forEach((kw) => {
    if (kw.length >= 2 && fullJobText.includes(kw)) kwMatchedCount++;
  });
  if (targetKeywords.length > 0) {
    keywordScore = Math.round(Math.min(1.0, kwMatchedCount / targetKeywords.length) * 5);
  }

  // -------------------------------------------------------------
  // Freshness Match (5 points max)
  // -------------------------------------------------------------
  let freshnessScore = 0;
  if (job.postedDate) {
    const postedMs = Date.parse(job.postedDate);
    if (!isNaN(postedMs)) {
      const hoursAgo = (Date.now() - postedMs) / (1000 * 60 * 60);
      if (hoursAgo <= 24) freshnessScore = 5;
      else if (hoursAgo <= 72) freshnessScore = 3;
      else freshnessScore = 1;
    }
  } else if (job.postedRelative && job.postedRelative.toLowerCase().includes('today')) {
    freshnessScore = 5;
  } else {
    freshnessScore = 2;
  }

  // -------------------------------------------------------------
  // Total Overall Fit Score (0-100)
  // -------------------------------------------------------------
  const totalScore = Math.min(
    100,
    Math.max(
      0,
      skillScore +
        roleScore +
        experienceScore +
        locationScore +
        educationScore +
        projectScore +
        keywordScore +
        freshnessScore
    )
  );

  // Strengths
  const strengths: string[] = [];
  if (matchedSkills.length > 0) strengths.push(`Matches ${matchedSkills.length} candidate skills`);
  if (roleScore >= 15) strengths.push('Strong target role alignment');
  if (job.isRemote) strengths.push('Remote-friendly position');
  if (freshnessScore === 5) strengths.push('Posted within last 24 hours');
  if (educationScore === 10) strengths.push('Target education/graduation batch match');

  let oneLineWhy = '';
  if (matchedSkills.length > 0) {
    oneLineWhy = `Matches candidate skills (${matchedSkills.slice(0, 3).join(', ')}) with ${totalScore}% fit.`;
  } else if (roleScore > 0) {
    oneLineWhy = `Target role alignment with ${totalScore}% deterministic match.`;
  } else {
    oneLineWhy = `Evaluated at ${totalScore}% match based on general profile overlap.`;
  }

  return {
    jobId: job.id,
    fitScore: totalScore,
    oneLineWhy,
    matchingKeywords: matchedSkills.slice(0, 5),
    missingKeywords: missingSkills.slice(0, 5),
    strengths,
    scoreBreakdown: {
      skillScore,
      roleScore,
      experienceScore,
      locationScore,
      educationScore,
      projectScore,
      keywordScore,
      freshnessScore,
    },
  };
}

export function batchCalculateDeterministicFitScores(
  resume: ParsedResume,
  jobs: JobPosting[]
): DetailedFitResult[] {
  return jobs.map((j) => calculateDeterministicFitScore(resume, j));
}

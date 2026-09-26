import type { CanonicalResume } from '@applypilot/domain';
import type { AtsScoreReportV2, AtsEvidenceItem, AtsCategoryV2 } from './types.js';

const ACTION_VERBS = new Set([
  'architected',
  'built',
  'crafted',
  'deployed',
  'designed',
  'developed',
  'engineered',
  'executed',
  'implemented',
  'improved',
  'launched',
  'led',
  'optimized',
  'reduced',
  'refactored',
  'resolved',
  'scaled',
  'shipped',
  'spearheaded',
  'streamlined',
]);

const METRIC_PATTERN =
  /\b(?:\d+(?:\.\d+)?x|\d+(?:\.\d+)?%|\$\d+(?:,\d+)*(?:\.\d+)?[kmb]?(?:\/(?:yr|year|mo|month|hr|hour))?|\d+(?:,\d+)*(?:\.\d+)?[kmb]?\+?\s*(?:\/|\s*(?:per|a)\s*)?(?:users|requests|sec|min|hr|ms|seconds|minutes|hours|days|customers|prs|queries|nodes|containers|endpoints|engineers|team members|services))\b/i;

export class AtsScorerV2 {
  readonly version = 'ats_score_v2' as const;

  evaluate(resume: CanonicalResume): AtsScoreReportV2 {
    const evidence: AtsEvidenceItem[] = [];

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Contact & Structure (25 pts)
    // ──────────────────────────────────────────────────────────────────────────
    let contactScore = 0;
    const contactEvidence: string[] = [];
    const contactRecs: string[] = [];

    if (resume.fullName && resume.fullName.trim().length > 1) {
      contactScore += 5;
      contactEvidence.push('Full candidate name present');
    } else {
      contactRecs.push('Add full candidate name to the header');
    }

    if (resume.email && resume.email.includes('@')) {
      contactScore += 6;
      contactEvidence.push(`Valid contact email present (${resume.email})`);
    } else {
      contactRecs.push('Add a professional contact email');
    }

    if (resume.phone) {
      contactScore += 4;
      contactEvidence.push('Direct phone number provided');
    } else {
      contactRecs.push('Include a phone number for recruiter outreach');
    }

    const hasExperience = resume.experience && resume.experience.length > 0;
    const hasEducation = resume.education && resume.education.length > 0;
    const hasSkills = resume.skills && resume.skills.length > 0;

    if (hasExperience) contactScore += 4;
    if (hasEducation) contactScore += 3;
    if (hasSkills) contactScore += 3;

    if (hasExperience && hasEducation && hasSkills) {
      contactEvidence.push('Clear canonical section layout (Experience, Education, Skills)');
    } else {
      if (!hasExperience) contactRecs.push('Add a dedicated Experience section');
      if (!hasEducation) contactRecs.push('Add a dedicated Education section');
      if (!hasSkills) contactRecs.push('Add a dedicated Skills section');
    }

    contactScore = Math.min(25, contactScore);
    evidence.push({
      category: 'contactAndStructure',
      rule: 'contact_and_layout',
      impact: contactScore,
      description: `Contact and layout completeness: ${contactScore}/25 pts`,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Action Verbs & Impact (25 pts)
    // ──────────────────────────────────────────────────────────────────────────
    let actionScore = 0;
    const actionEvidence: string[] = [];
    const actionRecs: string[] = [];

    const allBullets = (resume.experience || []).flatMap((e) => e.bullets || []);
    let bulletsWithActionVerb = 0;

    for (const b of allBullets) {
      const lower = b.toLowerCase();
      const firstWord = lower.trim().split(/\s+/)[0];
      if (ACTION_VERBS.has(firstWord) || Array.from(ACTION_VERBS).some((v) => lower.startsWith(v))) {
        bulletsWithActionVerb++;
      }
    }

    if (allBullets.length > 0) {
      const actionRatio = bulletsWithActionVerb / allBullets.length;
      actionScore = Math.round(actionRatio * 25);
      actionEvidence.push(
        `${bulletsWithActionVerb} of ${allBullets.length} bullet points start with strong action verbs`
      );
      if (actionRatio < 0.7) {
        actionRecs.push(
          'Start more bullet points with strong action verbs (e.g. Engineered, Architected, Optimized, Shipped)'
        );
      }
    } else {
      actionRecs.push('Add bullet points detailing specific accomplishments under experience');
    }

    actionScore = Math.min(25, actionScore);
    evidence.push({
      category: 'actionVerbsAndImpact',
      rule: 'action_verb_ratio',
      impact: actionScore,
      description: `Action verbs & outcome-oriented phrasing: ${actionScore}/25 pts`,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Quantification (25 pts)
    // ──────────────────────────────────────────────────────────────────────────
    let quantScore = 0;
    const quantEvidence: string[] = [];
    const quantRecs: string[] = [];

    let bulletsWithMetrics = 0;
    for (const b of allBullets) {
      METRIC_PATTERN.lastIndex = 0;
      if (METRIC_PATTERN.test(b)) {
        bulletsWithMetrics++;
      }
    }

    if (allBullets.length > 0) {
      // 50% of bullets with metrics yields full points
      const metricRatio = Math.min(1.0, (bulletsWithMetrics / allBullets.length) * 2);
      quantScore = Math.round(metricRatio * 25);
      quantEvidence.push(
        `${bulletsWithMetrics} bullet points include measurable outcomes (numbers, percentages, scale)`
      );
      if (bulletsWithMetrics < Math.ceil(allBullets.length * 0.4)) {
        quantRecs.push(
          'Quantify more accomplishments with concrete metrics (e.g., "reduced latency by 40%", "scaled to 50k users")'
        );
      }
    } else {
      quantRecs.push('Include measurable metrics in role bullet points');
    }

    quantScore = Math.min(25, quantScore);
    evidence.push({
      category: 'quantification',
      rule: 'metric_density',
      impact: quantScore,
      description: `Measurable outcome density: ${quantScore}/25 pts`,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Keywords & Technical Depth (25 pts)
    // ──────────────────────────────────────────────────────────────────────────
    let techScore = 0;
    const techEvidence: string[] = [];
    const techRecs: string[] = [];

    const skillCount = (resume.skills || []).length;
    if (skillCount >= 8) {
      techScore = 25;
      techEvidence.push(`Comprehensive technical depth: ${skillCount} canonical skills cataloged`);
    } else if (skillCount >= 4) {
      techScore = 18;
      techEvidence.push(`Moderate skill depth: ${skillCount} skills identified`);
      techRecs.push('Expand skills section with relevant frameworks, databases, and tooling');
    } else if (skillCount >= 1) {
      techScore = 10;
      techEvidence.push(`Basic skills present: ${skillCount} skills`);
      techRecs.push('Add core programming languages and industry tools to skills section');
    } else {
      techScore = 0;
      techRecs.push('Include a dedicated skills inventory in your resume');
    }

    evidence.push({
      category: 'technicalDepth',
      rule: 'skill_depth',
      impact: techScore,
      description: `Technical depth and industry terminology: ${techScore}/25 pts`,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Overall Calculation & Grading (§15)
    // ──────────────────────────────────────────────────────────────────────────
    const overallScore = contactScore + actionScore + quantScore + techScore;

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'D';
    if (overallScore >= 90) grade = 'A+';
    else if (overallScore >= 80) grade = 'A';
    else if (overallScore >= 70) grade = 'B';
    else if (overallScore >= 60) grade = 'C';

    const allRecommendations = [
      ...contactRecs,
      ...actionRecs,
      ...quantRecs,
      ...techRecs,
    ];

    const makeCategory = (score: number, ev: string[], recs: string[]): AtsCategoryV2 => ({
      score,
      maxScore: 25,
      percentage: Math.round((score / 25) * 100),
      evidence: ev,
      recommendations: recs,
    });

    return {
      overallScore,
      grade,
      scoringVersion: this.version,
      categories: {
        contactAndStructure: makeCategory(contactScore, contactEvidence, contactRecs),
        actionVerbsAndImpact: makeCategory(actionScore, actionEvidence, actionRecs),
        quantification: makeCategory(quantScore, quantEvidence, quantRecs),
        technicalDepth: makeCategory(techScore, techEvidence, techRecs),
      },
      evidence,
      recommendations: allRecommendations,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export const defaultAtsScorerV2 = new AtsScorerV2();

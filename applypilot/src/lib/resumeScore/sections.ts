import type { ScoreIssue, ScorerInput } from './types.js';
import { SECTIONS_SUB } from './weights.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /[\d\s\-\+\(\)]{7,}/;

const ATS_HEADINGS = new Set([
  'experience', 'work experience', 'professional experience', 'employment history',
  'education', 'academic background',
  'skills', 'technical skills', 'core competencies',
  'projects', 'personal projects', 'side projects',
  'certifications', 'certificates', 'licenses',
  'summary', 'professional summary', 'objective', 'profile',
  'publications', 'awards', 'achievements', 'volunteer',
]);

/** SECTIONS rule 1: contact information completeness. */
export function scoreContact(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const c = resume.contact || {};
  const issues: ScoreIssue[] = [];

  if (!resume.name || resume.name.trim().length < 2) {
    issues.push({
      id: 'sections-no-name',
      category: 'sections',
      severity: 'fail',
      points: 8,
      evidence: { text: 'Name missing', section: 'Contact' },
      fix: 'Add your full name at the top of the resume.',
    });
  }
  if (!c.email || !EMAIL_RE.test(c.email)) {
    issues.push({
      id: 'sections-no-email',
      category: 'sections',
      severity: 'fail',
      points: 10,
      evidence: { text: c.email ? `"${c.email}" is not a valid email` : 'Email missing', section: 'Contact' },
      fix: 'Add a valid professional email address.',
    });
  }
  if (!c.phone || !PHONE_RE.test(c.phone)) {
    issues.push({
      id: 'sections-no-phone',
      category: 'sections',
      severity: 'warn',
      points: 5,
      evidence: { text: c.phone ? `"${c.phone}"` : 'Phone missing', section: 'Contact' },
      fix: 'Add a phone number in international format (e.g. +1 555-0199).',
    });
  }
  if (!c.location) {
    issues.push({
      id: 'sections-no-location',
      category: 'sections',
      severity: 'warn',
      points: 3,
      evidence: { text: 'Location missing', section: 'Contact' },
      fix: 'Add city and state/country (e.g. "Austin, TX" or "Remote").',
    });
  }

  // LinkedIn/GitHub are bonus — no points lost for missing
  const hasLinkedIn = Boolean(c.linkedin);
  const hasGitHub = Boolean(c.github);
  if (!hasLinkedIn && !hasGitHub) {
    issues.push({
      id: 'sections-no-profile-links',
      category: 'sections',
      severity: 'warn',
      points: 2,
      evidence: { text: 'No LinkedIn or GitHub', section: 'Contact' },
      fix: 'Add your LinkedIn URL and/or GitHub profile to improve ATS and recruiter trust.',
    });
  }

  const totalPossible = 10 + 8 + 5 + 3 + 2;
  const lostPoints = issues.reduce((sum, i) => sum + i.points, 0);
  const score = Math.max(0, Math.round(((totalPossible - lostPoints) / totalPossible) * 100));
  return { score, issues };
}

/** SECTIONS rule 2: essential sections present (Experience or Projects, Education, Skills). */
export function scoreEssentialSections(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const issues: ScoreIssue[] = [];

  const hasExperience = (resume.experience || []).length > 0;
  const hasProjects = (resume.projects || []).length > 0;
  const hasEducation = (resume.education || []).length > 0;
  const hasSkills = Array.isArray(resume.skills)
    ? resume.skills.length > 0
    : Object.values(resume.skills || {}).flat().length > 0;

  if (!hasExperience && !hasProjects) {
    issues.push({
      id: 'sections-no-experience',
      category: 'sections',
      severity: 'fail',
      points: 15,
      evidence: { text: 'No Experience or Projects section found', section: 'Resume' },
      fix: 'Add an Experience or Projects section with at least one entry.',
    });
  }
  if (!hasEducation) {
    issues.push({
      id: 'sections-no-education',
      category: 'sections',
      severity: 'warn',
      points: 8,
      evidence: { text: 'No Education section found', section: 'Resume' },
      fix: 'Add an Education section with your degree, institution, and graduation year.',
    });
  }
  if (!hasSkills) {
    issues.push({
      id: 'sections-no-skills',
      category: 'sections',
      severity: 'fail',
      points: 10,
      evidence: { text: 'No Skills section found', section: 'Resume' },
      fix: 'Add a Skills section listing languages, frameworks, and tools.',
    });
  }

  const totalPossible = 15 + 8 + 10;
  const lostPoints = issues.reduce((sum, i) => sum + i.points, 0);
  const score = Math.max(0, Math.round(((totalPossible - lostPoints) / totalPossible) * 100));
  return { score, issues };
}

/** SECTIONS rule 3: detect non-standard section headings that may confuse ATS parsers. */
export function scoreAtsHeadings(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  // We infer headings from the structure of the parsed resume.
  // If all essential sections are present, headings were parseable — score 100.
  // This is a heuristic: if the parser extracted the data, headings were ATS-readable.
  const hasExperience = (resume.experience || []).length > 0;
  const hasEducation = (resume.education || []).length > 0;

  const issues: ScoreIssue[] = [];
  if (!hasExperience) {
    issues.push({
      id: 'sections-ats-heading-experience',
      category: 'sections',
      severity: 'warn',
      points: 5,
      evidence: { text: 'Experience section not detected by parser', section: 'Resume' },
      fix: 'Use standard ATS headings: "Experience", "Work Experience", or "Professional Experience".',
    });
  }
  if (!hasEducation) {
    issues.push({
      id: 'sections-ats-heading-education',
      category: 'sections',
      severity: 'warn',
      points: 3,
      evidence: { text: 'Education section not detected by parser', section: 'Resume' },
      fix: 'Use standard ATS headings: "Education" or "Academic Background".',
    });
  }

  const score = issues.length === 0 ? 100 : (hasExperience || hasEducation ? Math.max(30, 100 - issues.length * 35) : 0);
  return { score, issues };
}

/**
 * Combined SECTIONS score (0-100).
 * Weights: contact=40, essentialSections=40, atsHeadings=20.
 */
export function scoreSections(resume: ScorerInput): { score: number; issues: ScoreIssue[] } {
  const co = scoreContact(resume);
  const es = scoreEssentialSections(resume);
  const ah = scoreAtsHeadings(resume);

  const score = Math.round(
    (co.score * SECTIONS_SUB.contact +
     es.score * SECTIONS_SUB.essentialSections +
     ah.score * SECTIONS_SUB.atsHeadings) / 100
  );

  return { score, issues: [...co.issues, ...es.issues, ...ah.issues] };
}

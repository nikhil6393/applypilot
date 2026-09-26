import type { CanonicalResume, ExperienceItem, EducationItem, Skill } from '@applypilot/domain';
import { sanitizeLatex, isLatexDocument } from './latex-sanitizer.js';
import { resolveSkill } from '@applypilot/scoring';

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/;
const LINKEDIN_REGEX = /linkedin\.com\/in\/[A-Za-z0-9_.-]+/i;
const GITHUB_REGEX = /github\.com\/[A-Za-z0-9_.-]+/i;

export interface NormalizedDocumentOutput {
  canonical: CanonicalResume;
  isLatex: boolean;
  preservedLinks: Array<{ label: string; url: string }>;
  plainText: string;
}

/**
 * Normalizes any incoming resume text or LaTeX into a CanonicalResume entity.
 */
export function normalizeResumeDocument(rawSource: string): NormalizedDocumentOutput {
  const isLatex = isLatexDocument(rawSource);
  const sanitized = sanitizeLatex(rawSource);
  const plainText = sanitized.plainText;

  // 1. Contact Extraction
  const emailMatch = plainText.match(EMAIL_REGEX);
  const phoneMatch = plainText.match(PHONE_REGEX);
  const linkedinMatch = plainText.match(LINKEDIN_REGEX);
  const githubMatch = plainText.match(GITHUB_REGEX);

  const lines = plainText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Candidate name is typically on the first non-empty line
  const fullName = lines[0] ? lines[0].replace(/^===+\s*|\s*===+$/g, '').slice(0, 80) : 'Candidate';

  // 2. Section Extraction (Experience, Education, Projects)
  const experience: ExperienceItem[] = [];
  const education: EducationItem[] = [];
  const extractedSkills: Skill[] = [];

  let currentSection = 'summary';
  const sectionLines: Record<string, string[]> = {
    summary: [],
    experience: [],
    education: [],
    projects: [],
    skills: [],
  };

  for (const line of lines.slice(1)) {
    const lower = line.toLowerCase();
    if (lower.includes('experience') || lower.includes('work history') || lower.includes('employment')) {
      currentSection = 'experience';
      continue;
    } else if (lower.includes('education') || lower.includes('academic') || lower.includes('university')) {
      currentSection = 'education';
      continue;
    } else if (lower.includes('project') || lower.includes('portfolio')) {
      currentSection = 'projects';
      continue;
    } else if (lower.includes('skill') || lower.includes('technolog') || lower.includes('competenc')) {
      currentSection = 'skills';
      continue;
    }

    if (sectionLines[currentSection]) {
      sectionLines[currentSection].push(line);
    }
  }

  // Parse Experience bullets
  const expLines = sectionLines.experience;
  const expBullets: string[] = [];
  let currentCompany = 'Company';
  let currentTitle = 'Engineer';

  for (const line of expLines) {
    if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
      expBullets.push(line.replace(/^[-•*]\s*/, ''));
    } else if (line.length > 5 && !line.includes('===') && expBullets.length === 0) {
      currentCompany = line.slice(0, 60);
    }
  }

  if (expBullets.length > 0 || expLines.length > 0) {
    experience.push({
      company: currentCompany,
      title: currentTitle,
      bullets: expBullets.length > 0 ? expBullets : expLines.slice(0, 5),
      current: false,
    });
  }

  // Parse Education
  const eduLines = sectionLines.education;
  if (eduLines.length > 0) {
    education.push({
      degree: eduLines[0] || 'Degree',
      institution: eduLines[1] || 'University',
    });
  }

  // 3. Skill Extraction with Canonical Taxonomy
  const skillTokens = (sectionLines.skills.join(' ') + ' ' + plainText)
    .split(/[\s,;|/•]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const seenSkills = new Set<string>();
  for (const token of skillTokens) {
    const resolved = resolveSkill(token);
    if (resolved.category !== 'unknown' && !seenSkills.has(resolved.canonicalName)) {
      seenSkills.add(resolved.canonicalName);
      extractedSkills.push({
        name: resolved.canonicalName,
        normalizedName: resolved.canonicalName.toLowerCase(),
        category: resolved.category as any,
        aliases: [],
        weight: 50,
      });
    }
  }

  const canonical: CanonicalResume = {
    fullName,
    email: emailMatch ? emailMatch[0] : undefined,
    phone: phoneMatch ? phoneMatch[0] : undefined,
    contact: {
      fullName,
      email: emailMatch ? emailMatch[0] : undefined,
      phone: phoneMatch ? phoneMatch[0] : undefined,
      linkedin: linkedinMatch ? `https://${linkedinMatch[0]}` : undefined,
      github: githubMatch ? `https://${githubMatch[0]}` : undefined,
    },
    summary: '',
    targetRoles: [],
    targetKeywords: [],
    highlightedKeywords: [],
    skills: extractedSkills,
    experience,
    education,
    projects: [],
    certifications: [],
    rawText: plainText,
    parsedAt: new Date().toISOString(),
    parserVersion: 'v2.0.0',
    source: 'heuristic_fallback',
  };

  return {
    canonical,
    isLatex,
    preservedLinks: sanitized.links,
    plainText,
  };
}

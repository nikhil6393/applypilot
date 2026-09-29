import { TAXONOMY, canonicalizeSkill } from './taxonomy.js';

/**
 * Extract technical skills and keywords from a job posting or raw text.
 * Matches against taxonomy canonical names and aliases with boundary awareness.
 */
export function extractJobKeywords(jobOrText: string | { title?: string; description?: string; tags?: string[] }): string[] {
  let fullText = '';
  if (typeof jobOrText === 'string') {
    fullText = jobOrText;
  } else {
    fullText = [
      jobOrText.title || '',
      jobOrText.description || '',
      ...(jobOrText.tags || []),
    ].join(' ');
  }

  const lowerText = ` ${fullText.toLowerCase()} `;
  const detectedSkills = new Set<string>();

  // Check each taxonomy entry and its aliases
  for (const [, entry] of Object.entries(TAXONOMY)) {
    const candidates = [entry.canonical, ...entry.aliases];
    for (const cand of candidates) {
      const candLower = cand.toLowerCase();
      // Match with word boundary or non-alphanumeric boundary
      const escaped = candLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
      if (regex.test(lowerText)) {
        detectedSkills.add(entry.canonical);
        break;
      }
    }
  }

  // Also include explicit tags if provided
  if (typeof jobOrText !== 'string' && Array.isArray(jobOrText.tags)) {
    for (const tag of jobOrText.tags) {
      if (tag && tag.trim().length > 1) {
        detectedSkills.add(canonicalizeSkill(tag));
      }
    }
  }

  return Array.from(detectedSkills);
}

/**
 * Extract candidate skills from a resume object (array or categorized object).
 */
export function extractCandidateSkills(resume: {
  skills?: string[] | Record<string, string[]>;
  target_keywords?: string[];
}): string[] {
  const result = new Set<string>();

  if (Array.isArray(resume.skills)) {
    for (const s of resume.skills) {
      if (s) result.add(canonicalizeSkill(s));
    }
  } else if (typeof resume.skills === 'object' && resume.skills !== null) {
    for (const items of Object.values(resume.skills)) {
      if (Array.isArray(items)) {
        for (const s of items) {
          if (s) result.add(canonicalizeSkill(s));
        }
      }
    }
  }

  if (Array.isArray(resume.target_keywords)) {
    for (const k of resume.target_keywords) {
      if (k) result.add(canonicalizeSkill(k));
    }
  }

  return Array.from(result);
}

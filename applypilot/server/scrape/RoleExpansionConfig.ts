/**
 * Multi-Domain Role Expansion & Real-Time Scraper Configuration
 * Covers all major engineering domains for both Intern and Non-Intern keywords.
 * Re-exports shared domain definitions and adds server-side matching helpers.
 */

export * from '../../shared/domains.js';
import {
  ALL_DOMAINS,
  DomainDefinition,
  SOFTWARE_ENGINEER_INTERN_ROLES,
  SOFTWARE_ENGINEER_FULLTIME_ROLES,
  detectDomainFromQuery,
  matchesDomainJob,
} from '../../shared/domains.js';

/**
 * Checks if search query is Software Engineer Intern (20 roles)
 */
export function isSoftwareEngineerInternQuery(query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase().trim();
  const hasIntern = /\b(intern|internship|trainee|co-?op)\b/i.test(q);
  if (!hasIntern) return false;

  return (
    q.includes('software engineer') ||
    q.includes('software developer') ||
    q.includes('sde') ||
    q.includes('swe') ||
    SOFTWARE_ENGINEER_INTERN_ROLES.some((r) => q === r.toLowerCase())
  );
}

/**
 * Checks if search query is Software Engineer Full-Time (21 roles)
 */
export function isSoftwareEngineerFullTimeQuery(query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase().trim();
  if (/\b(intern|internship|trainee|co-?op)\b/i.test(q)) return false;

  return (
    q === 'software engineer' ||
    q === 'software developer' ||
    q === 'sde' ||
    q === 'swe' ||
    q.includes('software engineer') ||
    q.includes('software developer') ||
    SOFTWARE_ENGINEER_FULLTIME_ROLES.some((r) => q === r.toLowerCase())
  );
}

export function matchesSoftwareEngineerInternRole(titleOrText: string): boolean {
  if (!titleOrText) return false;
  const t = titleOrText.toLowerCase();

  return (
    /full[\s-]?stack\s+(developer|engineer)\s+intern/i.test(t) ||
    /mern(\s+stack)?\s+developer\s+intern/i.test(t) ||
    /(software\s+(engineer|developer)\s+intern)[^\w]*(full[\s-]?stack)/i.test(t) ||
    /(full[\s-]?stack)[^\w]*(software\s+(engineer|developer)\s+intern)/i.test(t) ||
    /react(\.?js)?\s+developer\s+intern/i.test(t) ||
    /front[\s-]?end\s+(developer|engineer)\s+intern/i.test(t) ||
    /node(\.?js)?\s+developer\s+intern/i.test(t) ||
    /back[\s-]?end\s+(developer|engineer)\s+intern/i.test(t) ||
    /java[\s-]?script\s+developer\s+intern/i.test(t) ||
    /web(\s+application|\s+app)?\s+developer\s+intern/i.test(t) ||
    /software\s+engineer\s+intern/i.test(t) ||
    /\b(sde|swe)\s+intern/i.test(t) ||
    /systems?\s+(engineer|software)\s+intern/i.test(t) ||
    /application\s+engineer\s+intern/i.test(t) ||
    /software\s+developer\s+intern/i.test(t) ||
    /systems?\s+developer\s+intern/i.test(t) ||
    (/\b(intern|internship|co-?op|trainee)\b/i.test(t) &&
      (/\b(full[\s-]?stack|mern|react(\.?js)?|frontend|front-end|backend|back-end|node(\.?js)?|javascript|js developer|web application|web developer|systems? engineer|systems? software|application engineer|software developer|systems? developer)\b/i.test(
        t
      )))
  );
}

export function matchesSoftwareEngineerFullTimeRole(titleOrText: string): boolean {
  if (!titleOrText) return false;
  const t = titleOrText.toLowerCase();

  return (
    /full[\s-]?stack\s+(developer|engineer)/i.test(t) ||
    /mern(\s+stack)?\s+developer/i.test(t) ||
    /(software\s+(engineer|developer))[^\w]*(full[\s-]?stack)/i.test(t) ||
    /(full[\s-]?stack)[^\w]*(software\s+(engineer|developer))/i.test(t) ||
    /react(\.?js)?\s+developer/i.test(t) ||
    /front[\s-]?end\s+(developer|engineer)/i.test(t) ||
    /node(\.?js)?\s+developer/i.test(t) ||
    /back[\s-]?end\s+(developer|engineer)/i.test(t) ||
    /java[\s-]?script\s+developer/i.test(t) ||
    /web(\s+application|\s+app)?\s+developer/i.test(t) ||
    /full[\s-]?stack\s+software\s+engineer/i.test(t) ||
    /software\s+engineer/i.test(t) ||
    /\b(sde|swe)\b/i.test(t) ||
    /software\s+developer/i.test(t) ||
    /systems?\s+(engineer|software\s+engineer)/i.test(t) ||
    /application\s+engineer/i.test(t) ||
    /systems?\s+developer/i.test(t)
  );
}

export const detectDomain = detectDomainFromQuery;

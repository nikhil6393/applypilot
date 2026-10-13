/**
 * Pure helpers for job eligibility checks.
 * Kept in a separate file so React Fast Refresh (HMR) works correctly
 * — component files must NOT export non-component values alongside components.
 */

/* ── Indian Citizen Work Authorization & Eligibility Helper ── */
export const getIndianCitizenEligibility = (job) => {
  if (job?.indianCitizenEligibility && job.indianCitizenEligibility.badgeText) {
    return job.indianCitizenEligibility;
  }
  if (job?.rawJob?.indianCitizenEligibility && job.rawJob.indianCitizenEligibility.badgeText) {
    return job.rawJob.indianCitizenEligibility;
  }

  const title = String(job?.title || '');
  const location = String(job?.location || '');
  const desc = String(job?.description || job?.rawJob?.description || job?.raw?.description || '');
  const combined = `${title} ${location} ${desc}`.toLowerCase();
  const sponsorsVisa = job?.sponsorsVisa ?? job?.rawJob?.sponsorsVisa;
  const remote = Boolean(job?.workplace === 'Remote' || job?.remote || job?.rawJob?.remote || /remote/i.test(location));

  const hasRestriction =
    /u\.?s\.?\s*citizens?\s*(?:or\s*green\s*card\s*holders?)?\s*(only|required)/i.test(combined) ||
    /must\s*be\s*(?:a\s*)?(?:u\.?s\.?|united\s*states)\s*citizen/i.test(combined) ||
    /only\s*(us|u\.s\.)\s*citizens/i.test(combined) ||
    /(us|u\.s\.|united\s*states)\s*citizenship\s*(is\s*)?required/i.test(combined) ||
    /security\s*clearance\s*required/i.test(combined) ||
    /must\s*be\s*legally\s*authorized\s*to\s*work\s*in\s*.*without\s*(the\s*need\s*for\s*)?sponsorship/i.test(combined) ||
    /(?:no|without|not\s*offer|unable\s*to\s*sponsor|cannot\s*sponsor)\s*(?:c2c\s*(?:or|\/)\s*)?visa\s*sponsorship/i.test(combined) ||
    /will\s*not\s*sponsor/i.test(combined) ||
    /unable\s*to\s*sponsor/i.test(combined) ||
    /cannot\s*sponsor/i.test(combined) ||
    /does\s*not\s*(offer|provide)\s*sponsorship/i.test(combined) ||
    /without\s*(company|employer)\s*sponsorship/i.test(combined) ||
    /\b(us\s*only|united\s*states\s*only|must\s*reside\s*in\s*(the\s*)?us|candidates\s*must\s*be\s*located\s*in\s*(the\s*)?us)\b/i.test(combined);

  const isIndia = /\b(india|noida|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|chennai|kolkata|ahmedabad|jaipur|indore|kochi|chandigarh|ncr)\b/i.test(location.toLowerCase());

  const isWorldwide =
    /\b(worldwide\s*remote|remote\s*worldwide|work\s*from\s*anywhere|anywhere\s*in\s*the\s*world|global\s*remote|hire\s*anywhere|international\s*remote|remote\s*-\s*global|remote\s*-\s*worldwide)\b/i.test(combined) ||
    /^(worldwide|global|anywhere|remote \/ worldwide)$/i.test(location.trim().toLowerCase());

  const hasSponsor =
    sponsorsVisa === true ||
    /visa\s*sponsorship\s*(is\s*)?(available|provided|offered|supported)/i.test(combined) ||
    /(offers?|provides?|supports?)\s+(visa|work authorization|h-?1b)\s*sponsorship/i.test(combined) ||
    /willing\s*to\s*sponsor/i.test(combined) ||
    /relocation\s*(assistance|support|package)\s*(provided|available)/i.test(combined);

  if (hasRestriction && !isIndia) {
    return {
      allowed: false,
      status: 'restricted',
      badgeText: '🇮🇳 Indian Citizens: Not Allowed',
      shortLabel: 'Not Allowed',
      badgeClass: 'citizen-restricted',
      reason: 'Requires US/local work authorization without visa sponsorship.',
    };
  }

  if (isIndia) {
    return {
      allowed: true,
      status: 'allowed',
      badgeText: '🇮🇳 Indian Citizens: Allowed (India)',
      shortLabel: 'Allowed (India)',
      badgeClass: 'citizen-allowed',
      reason: 'Position based in India or direct hiring.',
    };
  }

  if (hasSponsor) {
    return {
      allowed: true,
      status: 'allowed',
      badgeText: '🇮🇳 Indian Citizens: Allowed (Visa Sponsored)',
      shortLabel: 'Visa Sponsored',
      badgeClass: 'citizen-allowed',
      reason: 'Employer offers international visa sponsorship.',
    };
  }

  if (isWorldwide || (remote && /worldwide|global|anywhere/i.test(location))) {
    return {
      allowed: true,
      status: 'allowed',
      badgeText: '🇮🇳 Indian Citizens: Allowed (Worldwide Remote)',
      shortLabel: 'Worldwide Remote',
      badgeClass: 'citizen-allowed',
      reason: 'Global / Worldwide remote role open to international candidates.',
    };
  }

  const isForeign = /\b(united states|usa|us|uk|united kingdom|canada|germany|france|australia|singapore|netherlands|switzerland|poland|japan|ireland|california|new york|texas|london|berlin)\b/i.test(location.toLowerCase());

  if (isForeign && !remote) {
    return {
      allowed: false,
      status: 'requires_auth',
      badgeText: '⚠️ Indian Citizens: Work Visa Required',
      shortLabel: 'Visa Required',
      badgeClass: 'citizen-warning',
      reason: 'Foreign location without explicit remote or visa sponsorship.',
    };
  }

  if (remote) {
    return {
      allowed: true,
      status: 'allowed',
      badgeText: '🇮🇳 Indian Citizens: Allowed (Remote)',
      shortLabel: 'Allowed Remote',
      badgeClass: 'citizen-allowed',
      reason: 'Remote position without geographic citizenship restrictions.',
    };
  }

  return {
    allowed: true,
    status: 'allowed',
    badgeText: '🇮🇳 Indian Citizens: Allowed',
    shortLabel: 'Allowed',
    badgeClass: 'citizen-allowed',
    reason: 'Open position without stated citizenship restriction.',
  };
};

/* ── 2024-2028 Student Batch Eligibility Evaluator (5th Semester / 1.5 Years Remaining) ── */
export const checkUser2028BatchEligible = (job) => {
  const title = String(job?.title || '').toLowerCase();
  const desc = `${job?.description || ''} ${job?.rawJob?.description || ''}`.toLowerCase();
  const batches = job?.eligibleBatches || [];
  const text = String(job?.eligibleBatchText || '');

  if (batches.includes('2028') || text.includes('2028')) return true;
  if (/2028|pre-?final\s+year|penultimate\s+year|3rd\s+year|third\s+year|5th\s+sem|6th\s+sem|2024\s*[-–to/]+\s*2028/i.test(`${title} ${desc}`)) return true;
  if (job?.roleType === 'Internship' || job?.isInternship || /intern|co-?op|trainee/i.test(title)) return true;
  if (text.includes('All Batches') || text.includes('Students/Freshers')) return true;
  return false;
};

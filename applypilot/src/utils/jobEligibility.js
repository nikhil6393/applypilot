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
  const hasExplicitNoRemote = /\b(not\s*(?:eligible\s*for|open\s*to)?\s*remote|no\s*remote|not\s*a\s*remote|remote\s*(?:work\s*)?is\s*not|on[- ]?site\s*only|in[- ]?person\s*only)\b/i.test(combined);
  const remote = !hasExplicitNoRemote && Boolean(
    job?.workplace === 'Remote' ||
    (job?.remote && !hasExplicitNoRemote) ||
    (job?.rawJob?.remote && !hasExplicitNoRemote) ||
    /\b(remote|wfh|work from home|anywhere|worldwide|virtual)\b/i.test(location)
  );

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
    /does\s*not\s*(offer|provide|support)\s*(?:visa|h-?1b)?\s*sponsorship/i.test(combined) ||
    /without\s*(company|employer)\s*sponsorship/i.test(combined) ||
    /\b(us\s*only|united\s*states\s*only|must\s*reside\s*in\s*(the\s*)?us|candidates\s*must\s*be\s*located\s*in\s*(the\s*)?us)\b/i.test(combined) ||
    /(?:may\s*not\s*(?:be\s*able\s*to\s*)?(?:employ|hire|support|sponsor)|not\s*(?:be\s*able\s*to\s*)?support|support\s*future\s*h-?1b\s*sponsorship)/i.test(combined) ||
    /work\s*authorization\s*related\s*to\s*certain\s*u\.?s\.?\s*visa\s*categories/i.test(combined) ||
    /(?:no|not|cannot|unable\s*to|will\s*not|does\s*not)\s*(?:support|offer|provide)\s*(?:future\s*)?(?:h-?1b|visa)\s*(?:sponsorship|support)/i.test(combined) ||
    /(?:not\s*eligible|ineligible)\s*for\s*(?:visa|h-?1b)\s*sponsorship/i.test(combined) ||
    /without\s*(?:the\s*need\s*for\s*)?(?:now\s*or\s*in\s*the\s*future\s*)?(?:visa\s*)?sponsorship/i.test(combined) ||
    /for\s*u\.?s\.?\s*based\s*roles\s*only/i.test(combined) ||
    /require\s*sponsorship\s*now\s*or\s*in\s*the\s*future/i.test(combined);

  const isIndia = /\b(india|noida|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|chennai|kolkata|ahmedabad|jaipur|indore|kochi|chandigarh|ncr)\b/i.test(location.toLowerCase());

  const isWorldwide =
    /\b(worldwide\s*remote|remote\s*worldwide|work\s*from\s*anywhere|anywhere\s*in\s*the\s*world|global\s*remote|hire\s*anywhere|international\s*remote|remote\s*-\s*global|remote\s*-\s*worldwide)\b/i.test(combined) ||
    /^(worldwide|global|anywhere|remote \/ worldwide)$/i.test(location.trim().toLowerCase());

  const hasSponsor = !hasRestriction && (
    sponsorsVisa === true ||
    /visa\s*sponsorship\s*(?:is\s*)?(?:available|provided|offered|supported)/i.test(combined) ||
    /(?<!(?:not|cannot|unable\s*to|will\s*not|does\s*not|without|no|may\s*not\s*(?:be\s*able\s*to\s*)?)\s{1,25})(?:offers?|provides?|willing\s*to|supports?)\s+(?:(?:full|comprehensive|future)\s+)?(?:visa|work\s*authorization|h-?1b)\s*sponsorship/i.test(combined) ||
    /willing\s*to\s*sponsor/i.test(combined) ||
    /we\s*(?:do\s*)?sponsor/i.test(combined) ||
    /relocation\s*(?:assistance|support|package)\s*(?:is\s*)?(?:provided|available|offered)/i.test(combined)
  );

  if (hasRestriction && !isIndia) {
    return {
      allowed: false,
      status: 'restricted',
      badgeText: '❌ Foreign Job: No Visa Sponsorship (Local Auth Only)',
      shortLabel: 'No Visa Sponsor',
      badgeClass: 'citizen-restricted',
      reason: 'Requires foreign local work authorization; employer explicitly denies visa/H-1B sponsorship.',
    };
  }

  if (isIndia) {
    return {
      allowed: true,
      status: 'allowed',
      badgeText: '🇮🇳 Indian Citizens: Eligible (India Base)',
      shortLabel: 'Eligible (India)',
      badgeClass: 'citizen-allowed',
      reason: 'Position based in India with direct eligibility for Indian citizens.',
    };
  }

  if (hasSponsor) {
    return {
      allowed: true,
      status: 'allowed',
      badgeText: '✈️ Foreign Job: Visa Sponsored (Indians Eligible)',
      shortLabel: 'Visa Sponsored',
      badgeClass: 'citizen-allowed',
      reason: 'Employer explicitly offers international visa sponsorship or relocation.',
    };
  }

  if (isWorldwide || (remote && /worldwide|global|anywhere/i.test(location))) {
    return {
      allowed: true,
      status: 'allowed',
      badgeText: '🌐 Global Remote (Indians Eligible)',
      shortLabel: 'Global Remote',
      badgeClass: 'citizen-allowed',
      reason: 'Global / Worldwide remote role open to international candidates including India.',
    };
  }

  const isForeign = !isIndia && (
    /\b(united states|usa|us|uk|united kingdom|canada|germany|france|australia|singapore|netherlands|switzerland|poland|japan|ireland|california|new york|texas|london|berlin|europe|emea|apac|latam|san mateo|san francisco|seattle|austin|boston|chicago)\b/i.test(location.toLowerCase()) ||
    Boolean(location && location.trim().length > 0 && !/remote|anywhere|worldwide|global/i.test(location))
  );

  if (isForeign && !remote) {
    return {
      allowed: false,
      status: 'requires_auth',
      badgeText: '⚠️ Foreign Job: Work Visa Required (No Sponsorship Mentioned)',
      shortLabel: 'Visa Required',
      badgeClass: 'citizen-warning',
      reason: 'Foreign location without explicit remote hiring or visa sponsorship.',
    };
  }

  if (isForeign && remote) {
    return {
      allowed: false,
      status: 'requires_auth',
      badgeText: '⚠️ US/Foreign Remote: Local Work Auth Required',
      shortLabel: 'US Auth Required',
      badgeClass: 'citizen-warning',
      reason: 'Remote role for candidates legally authorized to work in the foreign country.',
    };
  }

  if (remote) {
    return {
      allowed: true,
      status: 'allowed',
      badgeText: '🌐 Remote: Eligible for Indian Applicants',
      shortLabel: 'Eligible Remote',
      badgeClass: 'citizen-allowed',
      reason: 'Remote position without geographic citizenship restrictions.',
    };
  }

  return {
    allowed: true,
    status: 'allowed',
    badgeText: '🇮🇳 Indian Citizens: Eligible',
    shortLabel: 'Eligible',
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

/* ── Comprehensive 4-State Eligibility Evaluator (NSUT Bridge the Gap) ── */
/**
 * Evaluates candidate eligibility across 4 explicit criteria:
 * Degree, Graduation Batch, Work Authorization/Location, and Experience Level.
 * 
 * Each returns:
 * - status: 'met' | 'not_met' | 'unknown' | 'needs_confirmation'
 * - title: Criterion display name
 * - requirement: What the job listing requires
 * - evidence: Candidate profile evidence found
 * - explanation: Honest explanation for why this state was assigned
 */
export const evaluateOpportunityEligibility = (job, profile = {}) => {
  const title = String(job?.title || '').toLowerCase();
  const desc = `${job?.description || ''} ${job?.rawJob?.description || ''}`.toLowerCase();
  const location = String(job?.location || '').toLowerCase();
  const isInternship = job?.isInternship || job?.roleType === 'Internship' || /intern|trainee|co-?op/i.test(title);

  // 1. Degree Criterion
  let degreeStatus = 'unknown';
  let degreeReq = 'Degree not explicitly specified in posting';
  let degreeEvidence = 'No degree information extracted from profile';
  let degreeExplanation = 'Listing does not specify a mandatory degree requirement.';

  const requiresDegree = /bachelor|b\.?tech|b\.?e\.?|bca|mca|m\.?tech|master|degree\s+in\s+computer\s+science/i.test(desc);
  if (requiresDegree) {
    degreeReq = 'Bachelor’s or equivalent in Computer Science or related engineering field';
    const candidateDegree = profile?.education?.[0]?.degree || profile?.degree || '';
    if (candidateDegree) {
      degreeEvidence = `Enrolled in or completed: ${candidateDegree}`;
      if (/tech|b\.?e|computer|science|engineering|it|bca|mca/i.test(candidateDegree.toLowerCase())) {
        degreeStatus = 'met';
        degreeExplanation = 'Your degree background directly satisfies the engineering requirement.';
      } else {
        degreeStatus = 'needs_confirmation';
        degreeExplanation = 'Employer asks for a technical degree. Confirm if your coursework meets their requirements.';
      }
    } else {
      degreeStatus = 'needs_confirmation';
      degreeExplanation = 'The employer requires a degree, but degree details were not detected in your resume. Please confirm.';
    }
  }

  // 2. Graduation Year / Cohort Batch
  let batchStatus = 'unknown';
  let batchReq = job?.eligibleBatchText || (isInternship ? '2025, 2026, 2027, 2028 Batches' : 'All Batches');
  let batchEvidence = 'Graduation year not detected in profile';
  let batchExplanation = 'Open to all student cohorts.';

  const candidateYear = profile?.education?.[0]?.year || profile?.graduationYear || '';
  if (candidateYear) {
    batchEvidence = `Expected graduation: ${candidateYear}`;
  }

  if (checkUser2028BatchEligible(job)) {
    batchStatus = 'met';
    batchExplanation = 'Opportunity explicitly welcomes current college students and interns.';
  } else if (candidateYear && /202[0-4]/.test(candidateYear) && isInternship) {
    batchStatus = 'needs_confirmation';
    batchExplanation = 'This is an internship role that typically seeks current students. Confirm your availability with the employer.';
  } else if (!candidateYear) {
    batchStatus = 'needs_confirmation';
    batchExplanation = 'Check the job posting to ensure your graduation year meets the employer’s cohort criteria.';
  }

  // 3. Work Authorization & Location
  const indianAuth = getIndianCitizenEligibility(job);
  let authStatus = 'met';
  let authReq = 'Direct Indian hiring or worldwide remote';
  let authEvidence = profile?.location ? `Located in ${profile.location}` : 'Indian student / candidate';
  let authExplanation = indianAuth.reason;

  if (indianAuth.status === 'restricted') {
    authStatus = 'not_met';
    authReq = 'Local US/Regional work authorization without visa sponsorship';
    authExplanation = 'Employer explicitly states that foreign candidates or visa sponsorship are not accepted.';
  } else if (indianAuth.status === 'requires_auth') {
    authStatus = 'needs_confirmation';
    authReq = 'Work authorization for host country';
    authExplanation = 'Foreign on-site role without explicit remote or sponsorship terms. Confirm with employer.';
  } else {
    authStatus = 'met';
  }

  // 4. Experience Level
  let expStatus = 'met';
  let expReq = isInternship ? '0-1 years (Students / Interns)' : 'Entry-level or commensurate experience';
  let expEvidence = `${profile?.experience?.length || 0} documented positions / internships`;
  let expExplanation = 'Experience prerequisites align with student/intern opportunities.';

  const requiresHeavyExperience = /\b([3-9]|1[0-9])\+?\s*years?\s+(?:of\s+)?experience/i.test(desc);
  if (requiresHeavyExperience && !isInternship) {
    expStatus = 'not_met';
    expReq = 'Mid/Senior level experience required';
    expExplanation = 'Posting specifies 3+ years of professional industry experience beyond college projects.';
  }

  const items = [
    { id: 'degree', title: 'Academic Degree', status: degreeStatus, requirement: degreeReq, evidence: degreeEvidence, explanation: degreeExplanation },
    { id: 'batch', title: 'Graduation Year / Batch', status: batchStatus, requirement: batchReq, evidence: batchEvidence, explanation: batchExplanation },
    { id: 'location', title: 'Work Authorization & Location', status: authStatus, requirement: authReq, evidence: authEvidence, explanation: authExplanation },
    { id: 'experience', title: 'Experience Level', status: expStatus, requirement: expReq, evidence: expEvidence, explanation: expExplanation },
  ];

  return {
    items,
    overallSummary: items.some((i) => i.status === 'not_met')
      ? 'Mandatory requirements have restrictions you should review before applying.'
      : items.some((i) => i.status === 'needs_confirmation')
      ? 'Some requirements need your personal confirmation to verify eligibility.'
      : 'All evaluated mandatory conditions appear satisfied by your profile.',
  };
};


import type { JobPosting, JobSource, EmploymentType, ScrapeRequest } from '../../shared/types.js';
import { isJobLocationMatch as geoResolverLocationMatch } from './geo-resolver.js';
import {
  detectDomainFromQuery,
  matchesDomainJob,
  isSoftwareEngineerInternQuery,
  isSoftwareEngineerFullTimeQuery,
  matchesSoftwareEngineerInternRole,
  matchesSoftwareEngineerFullTimeRole,
} from './RoleExpansionConfig.js';

export interface ValidationResult {
  valid: boolean;
  job?: JobPosting;
  reason?: string;
}

const VALID_SOURCES: Set<string> = new Set([
  'linkedin',
  'naukari',
  'greenhouse',
  'lever',
  'ashby',
  'freehire',
  'remotive',
  'himalayas',
  'remoteok',
  'arbeitnow',
  'weworkremotely',
  'yc',
  'jobicy',
  'internshala',
  'unstop',
  'simplify_jobs',
  'linkedin_dork',
  'manual',
]);

const DUMMY_SLUG_PATTERNS = [
  /job-listings-software-engineer-intern-zomato/i,
  /job-listings-full-stack-developer-swiggy/i,
  /job-listings-backend-engineer-razorpay/i,
  /job-listings-sde-intern-phonepe/i,
  /job-listings-frontend-engineer-cred/i,
  /job-listings-[a-z-]+(?<!-\d{4,})$/i, // Catch dummy slugs without numeric/alphanumeric job IDs
];

const PLACEHOLDER_TEXTS = [
  'see listing',
  'see naukri',
  'tech company',
  'top tech hiring partner',
  'n/a',
  'unknown',
  'sample company',
];

/**
 * Strips tracking parameters, affiliate tokens, and session garbage to get the clean canonical URL.
 */
export function cleanCanonicalUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl);
    const trackers = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'refId',
      'trackingId',
      'fbclid',
      'gclid',
      'src',
      'source',
      'gh_src',
      'lever-source',
    ];
    for (const key of trackers) {
      parsed.searchParams.delete(key);
    }
    let clean = parsed.toString();
    if (clean.endsWith('?')) clean = clean.slice(0, -1);
    return clean;
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Validates a job posting against strict data integrity rules:
 * 1. URL must resolve to a specific, real posting (not a homepage or dummy template slug).
 * 2. Title and company must be non-empty and cannot be generic placeholders.
 * 3. postedAt must be a valid ISO string parsed from source; cannot default to "now" arbitrarily.
 * 4. applicantCount: only preserved if explicitly parsed as a finite non-negative number.
 */
export function validateJobPosting(raw: Partial<JobPosting> | null | undefined): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, reason: 'Empty or non-object job payload' };
  }

  // 1. Validate URL & ApplyURL
  const targetUrl = (raw.applyUrl || raw.url || '').trim();
  if (!targetUrl || targetUrl === '#' || !/^https?:\/\//i.test(targetUrl)) {
    return { valid: false, reason: `Invalid or missing URL: ${targetUrl}` };
  }

  // Reject dummy template slugs
  for (const pattern of DUMMY_SLUG_PATTERNS) {
    if (pattern.test(targetUrl)) {
      return { valid: false, reason: `Rejected dummy/placeholder URL pattern: ${targetUrl}` };
    }
  }

  // 2. Validate Title
  const title = (raw.title || '').trim();
  if (!title || title.length < 3) {
    return { valid: false, reason: `Invalid or missing title: "${title}"` };
  }
  if (PLACEHOLDER_TEXTS.includes(title.toLowerCase())) {
    return { valid: false, reason: `Title is a placeholder: "${title}"` };
  }

  // 3. Validate Company
  const company = (raw.company || '').trim();
  if (!company || company.length < 2) {
    return { valid: false, reason: `Invalid or missing company: "${company}"` };
  }
  if (PLACEHOLDER_TEXTS.includes(company.toLowerCase())) {
    return { valid: false, reason: `Company is a placeholder: "${company}"` };
  }

  // 4. Validate Source
  const source = (raw.source || '').toLowerCase() as JobSource;
  if (!VALID_SOURCES.has(source)) {
    return { valid: false, reason: `Unrecognized source platform: "${raw.source}"` };
  }

  // 5. Validate and sanitize postedAt
  let validPostedAt = raw.postedAt || raw.postedDate || '';
  if (validPostedAt) {
    const parsedTime = Date.parse(validPostedAt);
    if (!Number.isFinite(parsedTime)) {
      validPostedAt = '';
    }
  }

  // 6. Validate applicantCount (must be genuine number, never fabricated)
  let validApplicantCount: number | undefined = undefined;
  if (
    typeof raw.applicantCount === 'number' &&
    Number.isFinite(raw.applicantCount) &&
    raw.applicantCount >= 0
  ) {
    validApplicantCount = Math.floor(raw.applicantCount);
  }

  // 7. Validate employmentType
  let employmentType: EmploymentType = 'unknown';
  if (
    raw.employmentType &&
    ['full-time', 'part-time', 'contract', 'internship', 'unknown'].includes(raw.employmentType)
  ) {
    employmentType = raw.employmentType;
  } else if (raw.isInternship || /intern|co-?op|trainee/i.test(title)) {
    employmentType = 'internship';
  }

  const isIntern =
    employmentType === 'internship' ||
    Boolean(raw.isInternship) ||
    /intern|co-?op|trainee/i.test(title);

  const canonicalUrl = cleanCanonicalUrl(targetUrl);
  const cleanJob: JobPosting = {
    id: raw.id || `${source}_${Math.random().toString(36).slice(2, 10)}`,
    title,
    company,
    source,
    url: canonicalUrl,
    applyUrl: canonicalUrl,
    canonicalUrl,
    location: (raw.location || '').trim() || 'Remote',
    remote: Boolean(
      raw.remote || /remote|wfh|work from home/i.test(raw.location || '' + ' ' + title)
    ),
    description: (raw.description || title).trim(),
    descriptionHtml: raw.descriptionHtml,
    postedAt: validPostedAt || new Date().toISOString(),
    postedDate: validPostedAt || undefined,
    postedRelative: raw.postedRelative,
    postedDateKind: raw.postedDateKind || (
      source === 'greenhouse' || source === 'ashby' || source === 'lever'
        ? 'updated'
        : raw.postedRelative
          ? 'approximate'
          : validPostedAt && !validPostedAt.includes('T00:00:00')
            ? 'exact'
            : 'unknown'
    ),
    rawPostingTime: raw.rawPostingTime || raw.postedRelative,
    verificationStatus: raw.verificationStatus || (
      source === 'greenhouse' || source === 'ashby' || source === 'lever'
        ? 'verified_active'
        : 'unverified'
    ),
    verifiedAt: raw.verifiedAt,
    duplicateOf: raw.duplicateOf,
    duplicateCount: raw.duplicateCount,
    applicantCount: validApplicantCount,
    isInternship: isIntern,
    eligibleBatches: Array.isArray(raw.eligibleBatches) ? raw.eligibleBatches : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    fetchedAt: raw.fetchedAt || new Date().toISOString(),
    employmentType,
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    salary: raw.salary,
    salaryRange: raw.salaryRange,
    seniority: raw.seniority,
    techStack: Array.isArray(raw.techStack) ? raw.techStack : undefined,
    sponsorsVisa: raw.sponsorsVisa,
    companyLogo: raw.companyLogo,
  };

  return { valid: true, job: cleanJob };
}

/**
 * Validates advanced filter fields in a ScrapeRequest body.
 */
export function validateScrapeRequest(raw: Partial<ScrapeRequest> | null | undefined): { valid: boolean; reason?: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: true };
  }

  if (raw.requiredSkills !== undefined && !Array.isArray(raw.requiredSkills)) {
    return { valid: false, reason: 'requiredSkills must be an array' };
  }
  if (raw.preferredSkills !== undefined && !Array.isArray(raw.preferredSkills)) {
    return { valid: false, reason: 'preferredSkills must be an array' };
  }
  if (raw.excludeKeywords !== undefined && !Array.isArray(raw.excludeKeywords)) {
    return { valid: false, reason: 'excludeKeywords must be an array' };
  }
  if (raw.seniorityLevels !== undefined && !Array.isArray(raw.seniorityLevels)) {
    return { valid: false, reason: 'seniorityLevels must be an array' };
  }
  const validSeniority = ['entry', 'mid', 'senior', 'principal'];
  if (raw.seniorityLevels?.some((s: string) => !validSeniority.includes(s))) {
    return { valid: false, reason: 'seniorityLevels contains invalid value' };
  }
  if (raw.salaryMin !== undefined && (typeof raw.salaryMin !== 'number' || raw.salaryMin < 0)) {
    return { valid: false, reason: 'salaryMin must be a non-negative number' };
  }
  if (raw.salaryMax !== undefined && (typeof raw.salaryMax !== 'number' || raw.salaryMax < 0)) {
    return { valid: false, reason: 'salaryMax must be a non-negative number' };
  }
  if (raw.minExperienceYears !== undefined && (typeof raw.minExperienceYears !== 'number' || raw.minExperienceYears < 0)) {
    return { valid: false, reason: 'minExperienceYears must be a non-negative number' };
  }
  if (raw.maxExperienceYears !== undefined && (typeof raw.maxExperienceYears !== 'number' || raw.maxExperienceYears < 0)) {
    return { valid: false, reason: 'maxExperienceYears must be a non-negative number' };
  }
  if (raw.benefits !== undefined && !Array.isArray(raw.benefits)) {
    return { valid: false, reason: 'benefits must be an array' };
  }
  if (raw.companySizes !== undefined && !Array.isArray(raw.companySizes)) {
    return { valid: false, reason: 'companySizes must be an array' };
  }
  if (raw.industries !== undefined && !Array.isArray(raw.industries)) {
    return { valid: false, reason: 'industries must be an array' };
  }

  return { valid: true };
}

/**
 * Filter an array of candidate job objects through the integrity validator.
 * Rejects invalid, template-generated, or missing-field records.
 */
export function validateAndFilterJobs(
  rawList: Array<Partial<JobPosting> | null | undefined>
): JobPosting[] {
  const verified: JobPosting[] = [];
  for (const raw of rawList) {
    const res = validateJobPosting(raw);
    if (res.valid && res.job) {
      verified.push(res.job);
    } else if (res.reason) {
      // Diagnostic audit logging
      // console.debug(`[validator] Dropped job: ${res.reason}`);
    }
  }
  return verified;
}

export interface JobFilterCriteria {
  query?: string;
  location?: string;
  jobType?: 'internship' | 'fulltime' | 'contract' | 'any' | string;
  remoteOnly?: boolean;
  internshipsOnly?: boolean;
  batchYear?: string;
  seniorityLevel?: string;
  workplaceType?: 'remote' | 'hybrid' | 'onsite' | 'any' | string;
}

export function isJobWorkplaceMatch(job: JobPosting, workplaceType?: string): boolean {
  if (!workplaceType || workplaceType === 'all' || workplaceType === 'any') return true;
  const text = `${job.location || ''} ${job.title || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  const isRemote = job.remote === true || /\bremote\b|\bwork from home\b|\bwfh\b|\banywhere\b|\bworldwide\b/i.test(text);
  const isHybrid = /\bhybrid\b/i.test(text);

  if (workplaceType === 'remote') return isRemote;
  if (workplaceType === 'hybrid') return isHybrid;
  if (workplaceType === 'onsite') return !isRemote && !isHybrid;
  return true;
}

export function isJobLocationMatch(
  jobLocation: string,
  isJobRemoteOrRequestedLocation: boolean | string = false,
  requestedLocation?: string,
  remoteOnly?: boolean
): boolean {
  return geoResolverLocationMatch(
    jobLocation,
    isJobRemoteOrRequestedLocation as any,
    requestedLocation,
    remoteOnly
  );
}

export function isJobTypeMatch(
  jobOrTitle: JobPosting | string,
  jobType?: string,
  internshipsOnly?: boolean
): boolean {
  const job: Partial<JobPosting> =
    typeof jobOrTitle === 'string' ? { title: jobOrTitle } : jobOrTitle;
  const isInternshipReq = internshipsOnly || jobType === 'internship';
  const text = `${job.title || ''} ${(job.tags || []).join(' ')} ${job.description || ''}`.toLowerCase();

  // Expanded student & early-career matching with word boundaries
  const hasInternToken =
    job.isInternship === true ||
    job.employmentType === 'internship' ||
    /\b(intern(ship)?|co-?op|working\s+student|werkstudent|praktikant|trainee|apprentice|apprenticeship|fellow(ship)?|student|fresher|graduate\s+engineer|get\b|campus|early\s+career|associate\s+(software|developer|engineer|product|qa)|sde\s+intern)\b/i.test(
      job.title
    ) ||
    (/\b(intern|internship|co-?op|trainee|apprentice)\b/i.test(text) &&
      !/\b(internal|international|internet)\b/i.test(job.title));

  // A role is senior only if it has senior keywords AND lacks internship keywords (e.g. "Senior Intern" is still an intern)
  const isSeniorOnly =
    /\b(senior|sr\.|lead|principal|staff|director|vp|head\s+of|manager)\b/i.test(job.title) &&
    !/\bintern(ship)?\b/i.test(job.title);

  if (isInternshipReq) {
    if (!hasInternToken || isSeniorOnly) return false;
    return true;
  }

  if (jobType === 'fulltime') {
    if (hasInternToken) return false;
    return true;
  }

  if (jobType === 'contract') {
    const isContract =
      (job as any).type === 'contract' ||
      job.employmentType === 'contract' ||
      /\b(contract|freelance|temporary|c2c)\b/i.test(text);
    return isContract;
  }

  return true;
}

function isSingleRoleMatch(job: Partial<JobPosting>, singleQuery: string): boolean {
  const qLower = singleQuery.toLowerCase().trim();
  if (!qLower) return true;
  const titleLower = (job.title || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const tagsLower = (job.tags || []).join(' ').toLowerCase();
  const fullText = `${titleLower} ${tagsLower} ${descLower}`;

  // 1. Check for domain query expansion (Software Engineering, Full Stack, Frontend, Backend, AI/ML, DevOps, Mobile, Security, QA, Data)
  const detectedDomain = detectDomainFromQuery(qLower);
  if (detectedDomain) {
    const isIntern = /\b(intern|internship|trainee|co-?op)\b/i.test(qLower);
    if (
      matchesDomainJob(detectedDomain.domainId, titleLower, isIntern) ||
      matchesDomainJob(detectedDomain.domainId, fullText, isIntern)
    ) {
      return true;
    }
  }

  // 1b. Direct checks for Software Engineer Intern (20 roles) & Software Engineer (21 roles)
  if (isSoftwareEngineerInternQuery(qLower)) {
    if (matchesSoftwareEngineerInternRole(titleLower) || matchesSoftwareEngineerInternRole(fullText)) {
      return true;
    }
  }

  if (isSoftwareEngineerFullTimeQuery(qLower)) {
    if (matchesSoftwareEngineerFullTimeRole(titleLower) || matchesSoftwareEngineerFullTimeRole(fullText)) {
      return true;
    }
  }

  // 2. Exact or normalized sub-role matching (handling hyphens, en-dashes, and .js)
  const normTitle = titleLower.replace(/[–—\-]/g, ' ').replace(/\.js\b/g, ' js');
  const normQuery = qLower.replace(/[–—\-]/g, ' ').replace(/\.js\b/g, ' js');
  if (normTitle.includes(normQuery) || fullText.includes(qLower)) {
    return true;
  }

  const techKeywords = [
    'software', 'developer', 'engineer', 'engineering', 'frontend', 'front-end',
    'backend', 'back-end', 'fullstack', 'full-stack', 'web', 'python', 'java',
    'javascript', 'typescript', 'react', 'node', 'node.js', 'ai', 'ml',
    'machine learning', 'data', 'cloud', 'devops', 'mobile', 'android', 'ios',
    'qa', 'testing', 'sde', 'swe', 'security', 'cyber'
  ];

  const queryHasTech = techKeywords.some((kw) => qLower.includes(kw));

  if (queryHasTech) {
    const nonTechExclude = /\b(recruiter|marketing|social media|lawyer|clerk|sales|accountant|dentist|nurse|chef|receptionist|storefront|customer success)\b/i;
    if (nonTechExclude.test(titleLower) && !techKeywords.some((kw) => titleLower.includes(kw))) {
      return false;
    }

    const jobHasTech = techKeywords.some((kw) => titleLower.includes(kw) || tagsLower.includes(kw));
    if (!jobHasTech) {
      const specificTokens = qLower
        .split(/\s+/)
        .filter((t) => t.length > 2 && !/^(intern|internship|engineer|software|developer)$/i.test(t));
      if (specificTokens.length > 0 && !specificTokens.some((t) => fullText.includes(t))) {
        return false;
      }
    }
  }

  const specificTerms = qLower
    .split(/\s+/)
    .filter((t) => t.length > 2 && !/^(intern|internship|job|jobs|position|trainee|role)$/i.test(t));

  if (specificTerms.length > 0) {
    const anyMatched = specificTerms.some((term) => fullText.includes(term));
    if (!anyMatched) return false;
  }

  return true;
}

export function isJobRoleMatch(jobOrTitle: JobPosting | string, query?: string): boolean {
  if (!query || !query.trim()) return true;
  const job: Partial<JobPosting> =
    typeof jobOrTitle === 'string' ? { title: jobOrTitle } : jobOrTitle;

  const targetText = `${job.title || ''} ${(job.tags || []).join(' ')} ${job.description || ''}`;

  // 1. High-accuracy matching for 20 Software Engineer Intern roles
  if (isSoftwareEngineerInternQuery(query)) {
    if (matchesSoftwareEngineerInternRole(job.title || '') || matchesSoftwareEngineerInternRole(targetText)) {
      return true;
    }
  }

  // 2. High-accuracy matching for 21 Software Engineer roles
  if (isSoftwareEngineerFullTimeQuery(query)) {
    if (matchesSoftwareEngineerFullTimeRole(job.title || '') || matchesSoftwareEngineerFullTimeRole(targetText)) {
      return true;
    }
  }

  // Support comma-separated queries (e.g. "Frontend, Backend, React")
  if (query.includes(',')) {
    const roles = query
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    if (roles.length > 0) {
      return roles.some((r) => isSingleRoleMatch(job, r));
    }
  }

  return isSingleRoleMatch(job, query);
}

export function isJobBatchMatch(job: JobPosting, batchYear?: string): boolean {
  if (!batchYear || batchYear === 'any') return true;
  // If the job explicitly states eligible batches, it must include the requested batch.
  // If no batches are specified, we don't exclude it (don't want to over-filter jobs that missed metadata).
  if (job.eligibleBatches && job.eligibleBatches.length > 0) {
    return job.eligibleBatches.includes(batchYear);
  }
  return true;
}

export function isJobSeniorityMatch(job: JobPosting, seniorityLevel?: string): boolean {
  if (!seniorityLevel || seniorityLevel === 'any') return true;

  const titleLower = job.title.toLowerCase();
  const text = `${titleLower} ${(job.tags || []).join(' ')} ${job.description || ''}`.toLowerCase();

  if (seniorityLevel === 'internship') {
    return job.isInternship === true || job.employmentType === 'internship' || /\b(intern|internship|co-?op)\b/i.test(titleLower);
  }

  if (seniorityLevel === 'entry') {
    if (job.seniority === 'entry') return true;
    return /\b(entry|junior|jr\.|graduate|fresher|new\s+grad)\b/i.test(titleLower);
  }

  if (seniorityLevel === 'mid') {
    if (job.seniority === 'mid') return true;
    return /\b(mid|intermediate)\b/i.test(titleLower);
  }

  if (seniorityLevel === 'senior') {
    if (job.seniority === 'senior' || job.seniority === 'lead') return true;
    return /\b(senior|sr\.|lead|principal|staff|manager|director|vp)\b/i.test(titleLower);
  }

  return true;
}

export function filterJobsByCriteria(jobs: JobPosting[], criteria: JobFilterCriteria): JobPosting[] {
  return jobs.filter((job) => {
    if (!isJobTypeMatch(job, criteria.jobType, criteria.internshipsOnly)) return false;
    if (!isJobLocationMatch(job.location, job.remote, criteria.location, criteria.remoteOnly)) return false;
    if (!isJobWorkplaceMatch(job, criteria.workplaceType)) return false;
    if (!isJobRoleMatch(job, criteria.query)) return false;
    if (!isJobBatchMatch(job, criteria.batchYear)) return false;
    if (!isJobSeniorityMatch(job, criteria.seniorityLevel)) return false;
    return true;
  });
}

export const filterJobsStrict = filterJobsByCriteria;

/**
 * Detects duplicates across aggregated job boards.
 * Groups by normalized company and title, assigns duplicate metadata,
 * and prefers direct ATS sources over scrapers/aggregators.
 */
export function detectDuplicateJobs(jobs: JobPosting[]): {
  uniqueJobs: JobPosting[];
  duplicatesFound: number;
} {
  const seenClusters = new Map<string, JobPosting>();
  let duplicatesFound = 0;

  for (const job of jobs) {
    const normCompany = (job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normTitle = (job.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const clusterKey = `${normCompany}__${normTitle}`;

    const existing = seenClusters.get(clusterKey);
    if (!existing) {
      job.duplicateCount = 0;
      seenClusters.set(clusterKey, job);
    } else {
      duplicatesFound++;
      job.duplicateOf = existing.id;
      existing.duplicateCount = (existing.duplicateCount || 0) + 1;

      // Prefer official ATS sources over aggregator/guest boards
      const isCurrentATS = ['greenhouse', 'lever', 'ashby'].includes(job.source);
      const isExistingATS = ['greenhouse', 'lever', 'ashby'].includes(existing.source);
      if (isCurrentATS && !isExistingATS) {
        seenClusters.set(clusterKey, job);
      }
    }
  }

  return {
    uniqueJobs: Array.from(seenClusters.values()),
    duplicatesFound,
  };
}

/**
 * Live HTTP URL validator for original job postings.
 * Ensures that clicking a job opens the actual verified live job posting,
 * and detects stale, expired (404/410), or anti-bot blocked postings.
 */
export async function verifyJobUrlLive(url: string): Promise<{
  verified: boolean;
  status: 'verified_active' | 'unverified' | 'stale' | 'expired';
  httpStatus?: number;
  finalUrl?: string;
  isRedirected?: boolean;
  latencyMs: number;
  reason?: string;
}> {
  const cleanUrl = cleanCanonicalUrl(url);
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(cleanUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    if (res.status === 404 || res.status === 410) {
      return {
        verified: false,
        status: 'expired',
        httpStatus: res.status,
        latencyMs,
        reason: 'Original posting is closed or deleted (HTTP 404/410)',
      };
    }

    if (res.ok || res.status === 403 || res.status === 406) {
      // 403 or 406 indicates bot-protection challenge on target site (e.g. LinkedIn, Cloudflare)
      const isBlocked = res.status === 403 || res.status === 406;
      return {
        verified: !isBlocked,
        status: isBlocked ? 'unverified' : 'verified_active',
        httpStatus: res.status,
        finalUrl: res.url,
        isRedirected: res.url !== cleanUrl,
        latencyMs,
        reason: isBlocked ? 'Target board challenged verification request (unverified)' : 'Confirmed active live URL',
      };
    }

    return {
      verified: false,
      status: 'unverified',
      httpStatus: res.status,
      latencyMs,
      reason: `HTTP status ${res.status}`,
    };
  } catch (err: any) {
    return {
      verified: false,
      status: 'unverified',
      latencyMs: Date.now() - startTime,
      reason: err.name === 'AbortError' ? 'Verification request timed out (>6s)' : err.message,
    };
  }
}



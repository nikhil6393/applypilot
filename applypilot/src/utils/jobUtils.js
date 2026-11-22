import { semanticMatchJob } from '../../shared/roleTaxonomy.js';

/**
 * Strips tracking parameters, affiliate tokens, and session garbage to get the clean canonical URL.
 */
export function cleanCanonicalUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string')
        return '#';
    try {
        const parsed = new URL(rawUrl);
        // Remove UTM and analytics trackers
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
        // Remove trailing slashes and clean hash
        let clean = parsed.toString();
        if (clean.endsWith('?'))
            clean = clean.slice(0, -1);
        return clean;
    }
    catch {
        return rawUrl.trim();
    }
}
/**
 * Returns the verified canonical job apply or posting URL.
 * Opens the actual job page so the user can verify the original source.
 */
export function getSafeJobApplyUrl(job) {
    if (!job) return '#';
    const rawUrl = (
        job.canonicalUrl ||
        job.applyUrl ||
        job.sourceUrl ||
        job.url ||
        job.rawJob?.canonicalUrl ||
        job.rawJob?.applyUrl ||
        job.rawJob?.sourceUrl ||
        job.rawJob?.url ||
        ''
    ).trim();

    if (rawUrl && rawUrl !== '#') {
        return cleanCanonicalUrl(rawUrl);
    }

    // If ID contains a LinkedIn job ID
    const jobId = String(job.id || job.rawJob?.id || '');
    const m = jobId.match(/linkedin_(\d+)/i) || jobId.match(/^(\d{8,12})$/);
    if (m && m[1]) {
        return `https://www.linkedin.com/jobs/view/${m[1]}`;
    }

    if (job.title && job.company) {
        return `https://www.google.com/search?q=${encodeURIComponent(job.title + ' ' + job.company + ' careers apply')}`;
    }

    return '#';
}
/**
 * Determines timestamp precision category and label strictly adhering to anti-hallucination rules.
 */
export function getTimestampProvenance(job) {
    const kind = job.postedDateKind || (job.source === 'greenhouse' || job.source === 'ashby' || job.source === 'lever'
        ? 'updated'
        : job.postedRelative
            ? 'approximate'
            : job.postedAt && !job.postedAt.includes('T00:00:00')
                ? 'exact'
                : 'unknown');
    switch (kind) {
        case 'exact':
            return {
                kind: 'exact',
                label: 'Exact Time',
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
                tooltip: `Exact original posting time: ${job.postedAt || job.rawPostingTime || 'Confirmed'}`,
            };
        case 'updated':
            return {
                kind: 'updated',
                label: 'Updated by ATS',
                color: 'text-blue-700 bg-blue-50 border-blue-200/80',
                tooltip: `Last updated timestamp on ATS: ${job.rawPostingTime || job.postedRelative || job.postedAt || 'Recent'}`,
            };
        case 'approximate':
            return {
                kind: 'approximate',
                label: 'Approximate',
                color: 'text-amber-700 bg-amber-50 border-amber-200/80',
                tooltip: `Approximate relative time from board: "${job.rawPostingTime || job.postedRelative || 'Recently posted'}"`,
            };
        case 'unknown':
        default:
            return {
                kind: 'unknown',
                label: 'Timestamp Unknown',
                color: 'text-slate-600 bg-slate-100 border-slate-200/80',
                tooltip: 'The original job board does not provide a reliable posting timestamp.',
            };
    }
}
/**
 * Visual badge info for JobVerificationStatus
 */
export function getVerificationBadge(status) {
    const s = status || 'unverified';
    switch (s) {
        case 'verified_active':
            return {
                status: 'verified_active',
                label: 'Verified Active',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                dotClass: 'bg-emerald-500 animate-pulse',
                description: 'Verified live on original job board/ATS. Reached HTTP 200.',
            };
        case 'stale':
            return {
                status: 'stale',
                label: 'Potentially Stale',
                badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
                dotClass: 'bg-amber-500',
                description: 'Posting is older than 30 days or has not updated recently.',
            };
        case 'expired':
            return {
                status: 'expired',
                label: 'Expired / Closed',
                badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
                dotClass: 'bg-rose-500',
                description: 'Confirmed closed or returned 404 on original board.',
            };
        case 'unverified':
        default:
            return {
                status: 'unverified',
                label: 'Unverified',
                badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                dotClass: 'bg-slate-400',
                description: 'Not yet verified against live HTTP endpoints.',
            };
    }
}

  /** Sorts lower known applicant counts first, then uses the newest posting as a tie-breaker. */
  const getFiniteSortNumber = (value) => {
    if (typeof value !== 'number' && !(typeof value === 'string' && value.trim())) return null;
    const number = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(number) ? number : null;
  };

  const compareKnownNumbers = (a, b, getValue, direction = 1) => {
    const valueA = getValue(a);
    const valueB = getValue(b);
    if (valueA === null && valueB !== null) return 1;
    if (valueA !== null && valueB === null) return -1;
    if (valueA !== null && valueB !== null && valueA !== valueB) return (valueA - valueB) * direction;
    return 0;
  };

  const getPostedAgeMinutes = (job, now) => {
    const timestamp = Date.parse(job?.postedAt || job?.postedDate || job?.rawJob?.postedAt || job?.rawJob?.postedDate || '');
    if (Number.isFinite(timestamp)) return timestamp <= now ? (now - timestamp) / 60000 : null;

    const relative = String(
      job?.postedRelative || job?.postedAgo || job?.rawJob?.postedRelative || job?.rawJob?.postedAgo || '',
    ).toLowerCase();
    if (/just now|few seconds|seconds? ago/.test(relative)) return 1;
    const minuteMatch = relative.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/);
    if (minuteMatch) return Number(minuteMatch[1]);
    const hourMatch = relative.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\b/);
    if (hourMatch) return Number(hourMatch[1]) * 60;
    if (relative.includes('yesterday')) return 1440;
    if (relative.includes('today')) return 360;
    const dayMatch = relative.match(/(\d+)\s*(?:d|day|days)\b/);
    if (dayMatch) return Number(dayMatch[1]) * 1440;
    const weekMatch = relative.match(/(\d+)\s*(?:w|wk|wks|week|weeks)\b/);
    if (weekMatch) return Number(weekMatch[1]) * 10080;
    if (relative.includes('month')) return 43200;
    return null;
  };

  const compareNewestFirst = (a, b) => {
    const now = Date.now();
    return compareKnownNumbers(a, b, (job) => getPostedAgeMinutes(job, now));
  };

  export function classifyJobType(job) {
    const rawType = String(job?.rawJob?.employmentType || job?.employmentType || '')
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-');
    if (/^(?:intern(?:ship)?|co-?op|apprentice|trainee|fellow(?:ship)?)$/.test(rawType)) return 'internship';
    if (/^(?:full-?time|permanent)$/.test(rawType)) return 'full-time';
    if (/^part-?time$/.test(rawType)) return 'part-time';
    if (/^(?:contract|freelance|consultant|temporary|c2c)$/.test(rawType)) return 'contract';

    const text = `${job?.title || ''} ${(job?.tags || []).join(' ')} ${job?.description || ''} ${job?.rawJob?.description || ''}`;
    if (/\b(intern(ship)?|co-?op|trainee|apprentice|fellow(ship)?)\b/i.test(text)) return 'internship';
    if (/\b(contract|freelance|consultant|temporary|c2c)\b/i.test(text)) return 'contract';
    if (/\bpart[- ]?time\b/i.test(text)) return 'part-time';
    if (/\bfull[- ]?time|permanent\b/i.test(text)) return 'full-time';
    return null;
  }

  export function resolveSearchRole(query, fallbackRole) {
    const defaultRole = 'Software Engineer Intern';
    const selectedRole = String(query || '').trim() || String(fallbackRole || '').trim() || defaultRole;
    const searchRoles = selectedRole
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);
    return searchRoles[0] || defaultRole;
  }

  const getApplicantCount = (job) => {
    const count = getFiniteSortNumber(job?.applicantCount ?? job?.rawJob?.applicantCount);
    return count !== null && count >= 0 ? count : null;
  };

  export function compareJobsByApplicantsAndRecency(a, b) {
    const applicantsComparison = compareKnownNumbers(
      a,
      b,
      getApplicantCount,
    );
    return applicantsComparison || compareNewestFirst(a, b);
  }

  export function compareJobsBySort(a, b, sortBy) {
    const titleA = String(a?.title || '');
    const titleB = String(b?.title || '');
    const companyA = String(a?.company || '');
    const companyB = String(b?.company || '');
    const compareText = (valueA, valueB) => valueA.localeCompare(valueB, undefined, { sensitivity: 'base' });

    if (sortBy === 'Fewest Applicants First') return compareJobsByApplicantsAndRecency(a, b);
    if (sortBy === 'A to Z (Job Title)' || sortBy === 'A to Z' || sortBy === 'A to Z (Title)') return compareText(titleA, titleB);
    if (sortBy === 'A to Z (Company)') return compareText(companyA, companyB);
    if (sortBy === 'Z to A') return compareText(titleB, titleA);
    if (sortBy === 'Eligible Batch' || sortBy === 'Eligible Batch (Graduation Year)') {
      const getBatchYear = (job) => getFiniteSortNumber(
        job?.identifiedYear ||
        job?.eligibleBatches?.find((year) => /^\d{4}$/.test(String(year))) ||
        String(job?.eligibleBatchText || '').match(/\b20\d{2}\b/)?.[0],
      );
      return compareKnownNumbers(a, b, getBatchYear, -1) || compareNewestFirst(a, b);
    }
    if (sortBy === 'Highest Match' || sortBy === 'Most Relevant') {
      return compareKnownNumbers(a, b, (job) => getFiniteSortNumber(job?.matchScore), -1) ||
        compareNewestFirst(a, b);
    }
    return compareNewestFirst(a, b);
  }

  export function isRecommendedJob(job) {
    return Number.isFinite(job?.matchScore);
  }

  export function sortJobsByFit(jobs) {
    return jobs
      .map((job, index) => ({ job, index }))
      .sort((a, b) => {
        const scoreA = Number.isFinite(a.job.matchScore) ? a.job.matchScore : -1;
        const scoreB = Number.isFinite(b.job.matchScore) ? b.job.matchScore : -1;
        return scoreB - scoreA || a.index - b.index;
      })
      .map(({ job }) => job);
  }

/**
 * Intelligent, bulletproof location matcher for job search.
 * Handles cities, regional clusters, countries, global hubs, and remote flags.
 */
export function matchesJobLocation(job, targetLocation) {
  if (!targetLocation || !targetLocation.trim()) return true;
  const rawTarget = targetLocation.toLowerCase().trim();
  if (/^(all|any|anywhere|worldwide|global|all locations|all hubs)$/i.test(rawTarget)) {
    return true;
  }

  const jobLoc = String(job.location || job.rawJob?.location || '').toLowerCase().trim();
  const isJobRemote = Boolean(
    job.remote ||
    job.rawJob?.remote ||
    job.workplace === 'Remote' ||
    job.rawJob?.workplace === 'Remote' ||
    /\b(remote|work from home|wfh|telecommute|anywhere|virtual|distributed|worldwide)\b/i.test(jobLoc)
  );

  // If search query is specifically for remote / worldwide / work from anywhere
  if (rawTarget.includes('remote') || rawTarget.includes('worldwide') || rawTarget.includes('telecommute') || rawTarget.includes('wfh')) {
    return isJobRemote || jobLoc.includes('remote') || jobLoc.includes('worldwide');
  }

  // City clusters (covers metro areas & tech hubs)
  const clusters = {
    noida: ['noida', 'greater noida', 'sector 62', 'sector 125', 'sector 135', 'delhi ncr', 'ncr', 'uttar pradesh', 'up'],
    bengaluru: ['bengaluru', 'bangalore', 'blr', 'whitefield', 'electronic city', 'koramangala', 'hsr', 'bellandur', 'karnataka'],
    gurgaon: ['gurgaon', 'gurugram', 'cyber city', 'delhi ncr', 'ncr', 'haryana'],
    delhi: ['delhi', 'new delhi', 'ncr', 'delhi ncr'],
    hyderabad: ['hyderabad', 'secunderabad', 'hitech city', 'gachibowli', 'madhapur', 'telangana'],
    pune: ['pune', 'hinjawadi', 'magarpatta', 'viman nagar', 'kharadi', 'baner', 'maharashtra'],
    mumbai: ['mumbai', 'navi mumbai', 'thane', 'andheri', 'bandra', 'powai', 'bkc', 'bombay', 'maharashtra'],
    chennai: ['chennai', 'madras', 'omr', 'guindy', 'tidel park', 'tamil nadu'],
    kolkata: ['kolkata', 'salt lake', 'new town', 'calcutta', 'west bengal'],
    ahmedabad: ['ahmedabad', 'gandhinagar', 'gujarat'],
    chandigarh: ['chandigarh', 'mohali', 'panchkula', 'punjab'],
    jaipur: ['jaipur', 'rajasthan'],
    indore: ['indore', 'madhya pradesh'],
    kochi: ['kochi', 'cochin', 'kerala', 'trivandrum', 'thiruvananthapuram'],
    us: ['united states', 'usa', 'us', 'california', 'ca', 'san francisco', 'sf', 'bay area', 'new york', 'ny', 'nyc', 'austin', 'tx', 'texas', 'seattle', 'wa', 'boston', 'ma', 'chicago', 'il', 'los angeles', 'denver'],
    uk: ['united kingdom', 'uk', 'london', 'england', 'manchester', 'cambridge', 'oxford'],
    singapore: ['singapore', 'sg', 'apac'],
    canada: ['canada', 'toronto', 'vancouver', 'montreal', 'ontario', 'bc'],
    germany: ['germany', 'berlin', 'munich', 'frankfurt', 'de']
  };

  // Find if user target matches any cluster key or aliases
  const matchedClusterKey = Object.keys(clusters).find(k => {
    if (rawTarget.includes(k)) return true;
    return clusters[k].some(alias => rawTarget.includes(alias));
  });

  if (matchedClusterKey) {
    const aliases = clusters[matchedClusterKey];
    if (aliases.some(alias => jobLoc.includes(alias))) {
      return true;
    }
    return false;
  }
  // Check Pan-India search
  if (rawTarget.includes('india') || rawTarget === 'in') {
    const isForeign = /\b(united states|usa|\bus\b|california|san francisco|seattle|new york|austin|texas|london|united kingdom|canada|toronto|germany|berlin|sydney|australia)\b/i.test(jobLoc) && !jobLoc.includes('india');
    if (isForeign) return false;

    const matchesIndian = /\b(india|bharat|pan india|remote india|india remote|noida|bengaluru|bangalore|blr|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|chennai|kolkata|ahmedabad|jaipur|indore|kochi|chandigarh|mohali|karnataka|telangana|maharashtra|haryana|uttar pradesh|tamil nadu|west bengal|gujarat|kerala)\b/i.test(jobLoc);
    return matchesIndian || (isJobRemote && !isForeign);
  }

  // Token breakdown matching for custom / ad-hoc queries
  const tokens = rawTarget.split(/[,/|\s]+/).map(t => t.trim()).filter(t => t.length > 2);
  if (tokens.length > 0) {
    return tokens.some(tok => jobLoc.includes(tok));
  }

  return jobLoc.includes(rawTarget);
}

/**
 * Intelligent role, skill, and company matcher for job search.
 */
export function matchesJobRole(job, targetRole) {
  if (!targetRole || !targetRole.trim()) return true;
  const q = targetRole.toLowerCase().trim();
  const title = String(job.title || job.rawJob?.title || '').toLowerCase();
  const company = String(job.company || job.rawJob?.company || '').toLowerCase();
  const tags = ((job.tags || []).concat(job.skills || [])).map(t => String(t).toLowerCase());

  // Direct substring in title, company, or tags
  if (title.includes(q) || company.includes(q) || tags.some(t => t.includes(q))) {
    return true;
  }

  // Synonym expansions
  const synonyms = {
    'sde': ['software engineer', 'software development', 'developer', 'programmer'],
    'swe': ['software engineer', 'software development', 'developer'],
    'frontend': ['front end', 'front-end', 'react', 'vue', 'angular', 'ui developer', 'ui engineer', 'web developer', 'javascript', 'typescript'],
    'backend': ['back end', 'back-end', 'node', 'express', 'python', 'django', 'fastapi', 'java', 'spring', 'golang', 'api developer', 'server'],
    'full stack': ['fullstack', 'full-stack', 'mern', 'mean', 'web developer', 'software engineer'],
    'fullstack': ['full stack', 'full-stack', 'mern', 'mean', 'software engineer'],
    'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'llm', 'genai', 'data scientist'],
    'ml': ['machine learning', 'ai', 'deep learning', 'data scientist'],
    'data analyst': ['business analyst', 'analytics', 'bi analyst', 'data analysis', 'sql', 'tableau'],
    'data engineer': ['etl', 'spark', 'data pipeline', 'big data', 'database developer', 'sql'],
    'ui/ux': ['ui designer', 'ux designer', 'product designer', 'design', 'figma', 'creative'],
    'product manager': ['pm', 'associate product manager', 'apm', 'product management', 'technical product manager'],
    'devops': ['sre', 'site reliability', 'cloud engineer', 'infrastructure', 'platform engineer', 'aws', 'docker', 'kubernetes'],
    'intern': ['internship', 'trainee', 'co-op', 'apprentice']
  };

  for (const [key, synList] of Object.entries(synonyms)) {
    if (q === key || q.includes(key)) {
      if (synList.some(syn => title.includes(syn) || tags.some(t => t.includes(syn)))) {
        return true;
      }
    }
  }

  // Check individual words if query is multi-word
  const words = q.split(/\s+/).filter(w => w.length > 2 && !/^(role|jobs?|position|developer|engineer|specialist)$/i.test(w));
  if (words.length > 0) {
    const allWordsPresent = words.every(w => title.includes(w) || company.includes(w) || tags.some(t => t.includes(w)));
    if (allWordsPresent) return true;
  }

  return false;
}


/**
 * Hierarchical Geographic & Location Resolver
 * Resolves cities, states, metropolitan clusters, and countries for accurate job & internship filtering.
 */

// ── 1. Comprehensive Regional Mapping ────────────────────────────────────────

export interface RegionDefinition {
  country: string;
  countryAliases: string[];
  states: Record<string, string[]>; // State name -> [abbreviations/aliases]
  cities: Record<string, string[]>; // Canonical city -> [aliases/sub-regions]
}

const INDIA_REGION: RegionDefinition = {
  country: 'India',
  countryAliases: ['india', 'in', 'bharat', 'pan india', 'across india', 'remote india', 'india remote'],
  states: {
    karnataka: ['ka', 'karnataka'],
    telangana: ['ts', 'telangana'],
    maharashtra: ['mh', 'maharashtra'],
    delhi: ['dl', 'delhi', 'new delhi', 'ncr', 'delhi ncr'],
    haryana: ['hr', 'haryana'],
    'uttar pradesh': ['up', 'uttar pradesh'],
    'tamil nadu': ['tn', 'tamil nadu'],
    'west bengal': ['wb', 'west bengal'],
    gujarat: ['gj', 'gujarat'],
    punjab: ['pb', 'punjab'],
    kerala: ['kl', 'kerala'],
    rajasthan: ['rj', 'rajasthan'],
    'madhya pradesh': ['mp', 'madhya pradesh'],
    odisha: ['od', 'odisha', 'orissa'],
    chandigarh: ['ch', 'chandigarh'],
  },
  cities: {
    bengaluru: ['bangalore', 'bengaluru', 'blr', 'whitefield', 'electronic city', 'koramangala', 'indiranagar', 'bellandur', 'outer ring road', 'hsr layout'],
    hyderabad: ['hyderabad', 'secunderabad', 'hyd', 'hitech city', 'gachibowli', 'madhapur', 'kondapur'],
    pune: ['pune', 'hinjawadi', 'magarpatta', 'viman nagar', 'kharadi', 'baner', 'wakad'],
    mumbai: ['mumbai', 'bombay', 'navi mumbai', 'thane', 'andheri', 'bandra', 'powai', 'bkc', 'goregaon'],
    'delhi ncr': ['delhi', 'new delhi', 'gurgaon', 'gurugram', 'noida', 'greater noida', 'faridabad', 'ghaziabad', 'ncr'],
    gurugram: ['gurgaon', 'gurugram', 'cyber city', 'golf course road'],
    noida: ['noida', 'greater noida', 'sector 62', 'sector 125', 'sector 135'],
    chennai: ['chennai', 'madras', 'omr', 'sholinganallur', 'guindy', 'tidel park'],
    kolkata: ['kolkata', 'calcutta', 'salt lake', 'new town', 'rajarhat'],
    ahmedabad: ['ahmedabad', 'gandhinagar', 'gift city'],
    chandigarh: ['chandigarh', 'mohali', 'panchkula'],
    kochi: ['kochi', 'cochin', 'infopark', 'kakkanad'],
    trivandrum: ['trivandrum', 'thiruvananthapuram', 'technopark'],
    coimbatore: ['coimbatore', 'saravanampatti', 'tidel park coimbatore'],
    jaipur: ['jaipur', 'sitapura'],
    indore: ['indore', 'crystal it park'],
    bhubaneswar: ['bhubaneswar', 'infocity'],
  },
};

const USA_REGION: RegionDefinition = {
  country: 'United States',
  countryAliases: ['united states', 'usa', 'us', 'u.s.', 'america', 'united states of america', 'remote us', 'us remote'],
  states: {
    california: ['ca', 'california'],
    'new york': ['ny', 'new york'],
    washington: ['wa', 'washington'],
    texas: ['tx', 'texas'],
    massachusetts: ['ma', 'massachusetts'],
    illinois: ['il', 'illinois'],
    colorado: ['co', 'colorado'],
    georgia: ['ga', 'georgia'],
    florida: ['fl', 'florida'],
    north_carolina: ['nc', 'north carolina'],
    oregon: ['or', 'oregon'],
    virginia: ['va', 'virginia'],
    new_jersey: ['nj', 'new jersey'],
    pennsylvania: ['pa', 'pennsylvania'],
  },
  cities: {
    'san francisco': ['san francisco', 'sf', 'bay area', 'san francisco bay area', 'soma', 'silicon valley'],
    'san jose': ['san jose', 'sunnyvale', 'mountain view', 'palo alto', 'santa clara', 'cupertino', 'fremont', 'menlo park', 'redwood city', 'san mateo'],
    'new york': ['new york', 'nyc', 'new york city', 'manhattan', 'brooklyn', 'queens', 'jersey city', 'hoboken'],
    seattle: ['seattle', 'bellevue', 'redmond', 'kirkland'],
    austin: ['austin'],
    boston: ['boston', 'cambridge'],
    chicago: ['chicago'],
    'los angeles': ['los angeles', 'la', 'santa monica', 'culver city', 'pasadena', 'burbank'],
    'san diego': ['san diego', 'la jolla'],
    denver: ['denver', 'boulder'],
    atlanta: ['atlanta'],
    dallas: ['dallas', 'fort worth', 'plano', 'irving'],
    houston: ['houston'],
    'washington dc': ['washington', 'washington dc', 'dc', 'arlington', 'alexandria', 'mclean', 'reston', 'tysons'],
    miami: ['miami'],
    portland: ['portland'],
    raleigh: ['raleigh', 'durham', 'chapel hill', 'research triangle'],
  },
};

const EUROPE_UK_REGION: RegionDefinition = {
  country: 'Europe / UK',
  countryAliases: ['europe', 'uk', 'united kingdom', 'great britain', 'england', 'eu', 'emea', 'remote europe', 'europe remote'],
  states: {
    england: ['england', 'uk'],
    germany: ['germany', 'de', 'deutschland'],
    france: ['france', 'fr'],
    netherlands: ['netherlands', 'nl', 'holland'],
    ireland: ['ireland', 'ie'],
    switzerland: ['switzerland', 'ch'],
    austria: ['austria', 'at'],
    sweden: ['sweden', 'se'],
    poland: ['poland', 'pl'],
    spain: ['spain', 'es'],
  },
  cities: {
    london: ['london'],
    berlin: ['berlin'],
    munich: ['munich', 'münchen'],
    amsterdam: ['amsterdam'],
    paris: ['paris'],
    dublin: ['dublin'],
    zurich: ['zurich', 'zürich'],
    vienna: ['vienna', 'wien'],
    stockholm: ['stockholm'],
    warsaw: ['warsaw'],
    barcelona: ['barcelona'],
    madrid: ['madrid'],
  },
};

const ALL_REGIONS = [INDIA_REGION, USA_REGION, EUROPE_UK_REGION];

// ── 2. Helper Match Functions ─────────────────────────────────────────────

export function isRemoteLocation(loc: string): boolean {
  if (!loc) return false;
  const l = loc.toLowerCase();
  return (
    /\bremote\b|\bwfh\b|\bwork from home\b|\banywhere\b|\bworldwide\b|\bglobal\b|\bvirtual\b|\btelecommute\b|\bdistributed\b/i.test(
      l
    )
  );
}

export function isGlobalLocation(loc?: string): boolean {
  if (!loc || !loc.trim()) return true;
  const l = loc.trim().toLowerCase();
  return /^(anywhere|global|worldwide|all|any|remote worldwide|worldwide remote)$/i.test(l);
}

/**
 * Checks whether a given text mentions any alias or city belonging to a region.
 */
function textMatchesRegion(text: string, region: RegionDefinition): boolean {
  const lower = text.toLowerCase();

  // 1. Direct country alias check
  for (const cAlias of region.countryAliases) {
    const re = new RegExp(`(?:^|[^a-z0-9])${cAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z0-9]|$)`, 'i');
    if (re.test(lower)) return true;
  }

  // 2. City check
  for (const [, aliases] of Object.entries(region.cities)) {
    for (const a of aliases) {
      const re = new RegExp(`(?:^|[^a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z0-9]|$)`, 'i');
      if (re.test(lower)) return true;
    }
  }

  // 3. State check
  for (const [, stateAliases] of Object.entries(region.states)) {
    for (const sa of stateAliases) {
      // For short 2-letter state codes, require boundary
      const re = new RegExp(`(?:^|[^a-z0-9])${sa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z0-9]|$)`, 'i');
      if (re.test(lower)) return true;
    }
  }

  return false;
}

/**
 * Checks whether a specific city or its aliases match the text.
 */
function textMatchesCity(text: string, requestedCity: string): boolean {
  const lower = text.toLowerCase();
  const reqLower = requestedCity.toLowerCase().trim();

  // Search through all regions to find city definition
  for (const region of ALL_REGIONS) {
    for (const [canonicalCity, aliases] of Object.entries(region.cities)) {
      if (canonicalCity === reqLower || aliases.includes(reqLower)) {
        // Matches canonical city or any alias in the job text
        return aliases.some((a) => {
          const re = new RegExp(`(?:^|[^a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z0-9]|$)`, 'i');
          return re.test(lower);
        });
      }
    }
  }

  // Fallback: direct substring if token length >= 3
  if (reqLower.length >= 3) {
    return lower.includes(reqLower);
  }
  return false;
}

/**
 * Primary Geographic Resolver.
 * Replaces naive substring checking with hierarchical location matching.
 */
export function isJobLocationMatch(
  jobLocation: string = '',
  isJobRemoteOrRequestedLocation: boolean | string = false,
  requestedLocation?: string,
  remoteOnlyRequested?: boolean
): boolean {
  let isJobRemote = false;
  let targetRequestedLoc = requestedLocation;

  if (typeof isJobRemoteOrRequestedLocation === 'string') {
    targetRequestedLoc = isJobRemoteOrRequestedLocation;
    isJobRemote = false;
  } else {
    isJobRemote = Boolean(isJobRemoteOrRequestedLocation);
  }

  const remote = isJobRemote || isRemoteLocation(jobLocation);

  // 1. If user strictly requested Remote Only
  if (remoteOnlyRequested) {
    return remote;
  }

  // 2. If user did not specify a location or requested Worldwide / Global
  if (isGlobalLocation(targetRequestedLoc)) {
    return true;
  }

  const reqClean = (targetRequestedLoc || '').trim().toLowerCase();

  // 3. If user requested "Remote" specifically
  if (reqClean === 'remote' || reqClean.includes('remote')) {
    return remote;
  }

  // 4. If the job is explicitly marked Global Remote / Worldwide, it is available anywhere!
  if (remote && /\b(worldwide|global|anywhere)\b/i.test(jobLocation)) {
    return true;
  }

  const jobLocLower = jobLocation.toLowerCase();

  // 5. Check if requestedLocation is a known Country
  for (const region of ALL_REGIONS) {
    const isRequestedCountry = region.countryAliases.some((alias) => reqClean === alias || reqClean.includes(alias));
    if (isRequestedCountry) {
      // If the user requested this country, does the job location belong to this region?
      if (textMatchesRegion(jobLocLower, region)) {
        return true;
      }
      // If job is remote without country restriction, or says e.g. "Remote - India"
      if (remote && (reqClean.includes('india') || reqClean.includes('us') || reqClean.includes('united states'))) {
        if (textMatchesRegion(jobLocLower, region)) return true;
      }
      // If the job is fully remote worldwide
      if (remote && (isGlobalLocation(jobLocation) || /\b(worldwide|anywhere|global)\b/i.test(jobLocLower))) {
        return true;
      }
      return false;
    }
  }

  // 6. Check if requestedLocation is a specific City or Metro area
  // Extract primary token if separated by comma/slash/pipe (e.g. "Bangalore, India" -> check both "bangalore" and "india")
  const tokens = reqClean
    .split(/[,/|]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    // If token matches city
    if (textMatchesCity(jobLocLower, token)) {
      return true;
    }
    // If token matches country
    for (const region of ALL_REGIONS) {
      if (region.countryAliases.includes(token)) {
        if (textMatchesRegion(jobLocLower, region)) return true;
      }
    }
  }

  // 7. If the job is Remote in the requested Country (e.g., job: "Remote - India", user: "Bangalore")
  if (remote) {
    for (const region of ALL_REGIONS) {
      const matchesReq = tokens.some((t) => textMatchesRegion(t, region));
      const matchesJob = textMatchesRegion(jobLocLower, region);
      if (matchesReq && matchesJob) {
        return true;
      }
    }
  }

  return false;
}

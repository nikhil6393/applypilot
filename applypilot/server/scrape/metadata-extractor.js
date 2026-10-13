/**
 * Universal Deep Metadata Extractor
 * Extracts Visa Sponsorship, Eligible Graduation Batches, Structured Salary Ranges,
 * Role Seniority, Tech Stack Tags, and Geographic Restrictions from job descriptions.
 */
const VISA_SPONSOR_POSITIVE = [
    /visa sponsorship (is )?(available|provided|offered|supported)/i,
    /(offers?|provides?|supports?)\s+(visa|work authorization|h-?1b)\s*sponsorship/i,
    /willing to sponsor/i,
    /we (do )?sponsor/i,
    /h-?1b\b.*?(sponsorship|transfer|filing)/i,
    /open to sponsor(ing)?/i,
    /provides? (visa|work authorization) sponsorship/i,
    /sponsors?\s+(visas?|work authorization|h-?1b)/i,
];
const VISA_SPONSOR_NEGATIVE = [
    /no visa sponsorship/i,
    /will not sponsor/i,
    /unable to sponsor/i,
    /cannot sponsor/i,
    /does not (offer|provide) sponsorship/i,
    /without (company|employer) sponsorship/i,
    /must be legally authorized to work in .* without (the need for )?sponsorship/i,
    /u\.?s\.? citizens? or green card holders? only/i,
    /only (us|u\.s\.) citizens/i,
    /security clearance required/i,
];
export function extractVisaSponsorship(text) {
    if (!text)
        return undefined;
    for (const neg of VISA_SPONSOR_NEGATIVE) {
        if (neg.test(text))
            return false;
    }
    for (const pos of VISA_SPONSOR_POSITIVE) {
        if (pos.test(text))
            return true;
    }
    return undefined;
}
export function extractEligibleBatches(text, title = '') {
    if (!text && !title)
        return undefined;
    const combined = `${title} ${text || ''}`.toLowerCase();
    const batches = new Set();

    // 1. Multi-year ranges and slashes: "2024/2025", "2025, 2026", "2025 - 2027", "2024-2026", "2025/2026/2027"
    const rangeMatches = combined.match(/\b(202[3-9]|2030)\s*(?:[-/|&,\s]+to\s*|[-/|&,]\s*)(202[3-9]|2030)(?:\s*[-/|&,]\s*(202[3-9]|2030))?\b/g);
    if (rangeMatches) {
        for (const rm of rangeMatches) {
            const yrs = rm.match(/\b(202[3-9]|2030)\b/g);
            if (yrs) {
                const start = parseInt(yrs[0], 10);
                const end = parseInt(yrs[yrs.length - 1], 10);
                if (end > start && end - start <= 4) {
                    for (let y = start; y <= end; y++) {
                        batches.add(String(y));
                    }
                } else {
                    yrs.forEach((y) => batches.add(y));
                }
            }
        }
    }

    // 2. Explicit graduating phrases: "class of 2025", "batch 2026", "2025 passout", "passing out year 2026", "graduation: 2025"
    const phraseMatches = combined.match(/(?:batch|class\s+of|graduat(?:ing|ion|e)s?|pass(?:ing)?\s*out|eligib(?:le|ility)|target\s+year)\s*[:\-–]?\s*(?:of\s*)?(\d{4})/gi);
    if (phraseMatches) {
        for (const pm of phraseMatches) {
            const yr = pm.match(/\b(202[3-9]|2030)\b/);
            if (yr) batches.add(yr[1]);
        }
    }

    // 3. Season + year mentions: "Summer 2025", "Summer 2026", "Fall 2025", "Winter 2026", "Spring 2026"
    const seasonMatches = combined.match(/\b(?:summer|fall|winter|spring)\s*(?:of\s*)?(202[4-9]|2030)\b/gi);
    if (seasonMatches) {
        for (const sm of seasonMatches) {
            const yr = sm.match(/\b(202[4-9]|2030)\b/);
            if (yr) batches.add(yr[1]);
        }
    }

    // 4. College academic year mentions:
    // "pre-final year" / "3rd year" / "5th sem" -> 2027, 2028
    // "final year" -> 2025, 2026
    if (/\b(pre-?final\s+year|penultimate\s+year|3rd\s+year|third\s+year|5th\s+sem(?:ester)?|6th\s+sem(?:ester)?)\b/i.test(combined)) {
        batches.add('2027');
        batches.add('2028');
    }
    if (/\bfinal\s+year\b/i.test(combined)) {
        batches.add('2025');
        batches.add('2026');
    }
    // 4b. Explicit degree batch ranges like "2024-2028" or "2024 to 2028"
    if (/\b2024\s*[-–to/]+\s*2028\b/i.test(combined)) {
        batches.add('2028');
    }

    // 5. Direct year mentions in intern / student contexts
    const isInternContext = /intern|co-?op|trainee|apprentice|student|fresher|fellow/i.test(combined);
    if (isInternContext) {
        const directYears = combined.match(/\b(2024|2025|2026|2027|2028|2029|2030)\b/g);
        if (directYears) {
            for (const y of directYears) {
                if (Number(y) >= 2024 && Number(y) <= 2030) {
                    batches.add(y);
                }
            }
        }
    }

    // If it's an internship with no specific batch mentioned, default to active college cohorts (including 2028)
    if (batches.size === 0 && isInternContext) {
        return ['2025', '2026', '2027', '2028', 'All Batches'];
    }

    if (batches.size === 0) {
        return undefined;
    }
    return Array.from(batches).sort();
}

export function formatEligibleBatchText(batches, isInternship = false, title = '', text = '') {
    const combined = `${title} ${text}`.toLowerCase();
    const explicitYears = (batches || []).filter((b) => b !== 'All Batches' && /^\d{4}$/.test(b));
    if (explicitYears.length > 0) {
        if (explicitYears.length === 1) {
            return `${explicitYears[0]} Batch`;
        }
        if (explicitYears.length <= 4) {
            return `${explicitYears.join(', ')} Batch`;
        }
        return `${explicitYears[0]}–${explicitYears[explicitYears.length - 1]} Batch`;
    }
    if (isInternship || /intern|co-?op|trainee/i.test(combined)) {
        return '2025, 2026, 2027, 2028 Batch (Students/Freshers)';
    }
    if (/fresher|graduate|entry\s*level|new\s*grad/i.test(combined)) {
        return '2024, 2025 Batch';
    }
    return 'All Batches Eligible';
}
/**
 * Parses numeric salary ranges across USD ($), INR (₹ / LPA), and EUR (€)
 */
export function extractSalaryRange(text) {
    if (!text)
        return {};
    // 1. Check Indian Rupee LPA formats: e.g. "12-25 LPA", "₹15 - 28 LPA", "10 to 18 Lakhs"
    const inrLpaMatch = text.match(/(?:(?:rs\.?|inr|₹)\s*)?(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lac|lakh|lacs)(?:\s*p\.?a\.?)?/i);
    if (inrLpaMatch) {
        const minLakh = parseFloat(inrLpaMatch[1]);
        const maxLakh = parseFloat(inrLpaMatch[2]);
        return {
            formatted: `₹${minLakh}–${maxLakh} LPA`,
            range: {
                min: minLakh * 100000,
                max: maxLakh * 100000,
                currency: '₹',
                period: 'yearly',
            },
        };
    }
    // 2. Check Indian Monthly Stipend: e.g. "₹25,000 - ₹40,000 / month", "30k/month stipend"
    const inrMonthlyMatch = text.match(/(?:(?:rs\.?|inr|₹)\s*)?(\d{1,3}(?:,\d{3})+|\d+k)\s*(?:-|–|to)\s*(?:(?:rs\.?|inr|₹)\s*)?(\d{1,3}(?:,\d{3})+|\d+k)\s*(?:\/|\s*per\s*)?(?:month|mo|stipend)/i);
    if (inrMonthlyMatch) {
        const rawMin = inrMonthlyMatch[1].replace(/,/g, '').toLowerCase();
        const rawMax = inrMonthlyMatch[2].replace(/,/g, '').toLowerCase();
        const min = rawMin.endsWith('k') ? parseFloat(rawMin) * 1000 : parseFloat(rawMin);
        const max = rawMax.endsWith('k') ? parseFloat(rawMax) * 1000 : parseFloat(rawMax);
        return {
            formatted: `₹${Math.round(min / 1000)}k–${Math.round(max / 1000)}k/mo`,
            range: { min, max, currency: '₹', period: 'monthly' },
        };
    }
    // 3. USD Yearly Range: e.g. "$120,000 - $160,000", "$120k - $170k", "USD 100,000 to 140,000"
    const usdYearlyMatch = text.match(/(?:\$|usd\s*)(\d{2,3}(?:,\d{3})+|\d{2,3}k)\s*(?:-|–|to)\s*(?:\$|usd\s*)?(\d{2,3}(?:,\d{3})+|\d{2,3}k)(?:\s*(?:per\s*year|\/yr|\/year|annually|usd))?/i);
    if (usdYearlyMatch) {
        const rawMin = usdYearlyMatch[1].replace(/,/g, '').toLowerCase();
        const rawMax = usdYearlyMatch[2].replace(/,/g, '').toLowerCase();
        const min = rawMin.endsWith('k') ? parseFloat(rawMin) * 1000 : parseFloat(rawMin);
        const max = rawMax.endsWith('k') ? parseFloat(rawMax) * 1000 : parseFloat(rawMax);
        return {
            formatted: `$${Math.round(min / 1000)}k–$${Math.round(max / 1000)}k/yr`,
            range: { min, max, currency: '$', period: 'yearly' },
        };
    }
    // 4. USD Hourly Range: e.g. "$40 - $65 / hr", "$45 to $70 an hour"
    const usdHourlyMatch = text.match(/(?:\$|usd\s*)(\d{2,3}(?:\.\d{2})?)\s*(?:-|–|to)\s*(?:\$|usd\s*)?(\d{2,3}(?:\.\d{2})?)\s*(?:\/|\s*per\s*)?(?:hr|hour)/i);
    if (usdHourlyMatch) {
        const min = parseFloat(usdHourlyMatch[1]);
        const max = parseFloat(usdHourlyMatch[2]);
        return {
            formatted: `$${min}–$${max}/hr`,
            range: { min, max, currency: '$', period: 'hourly' },
        };
    }
    // 5. EUR Yearly Range: e.g. "€60,000 - €85,000", "€60k - €90k"
    const eurMatch = text.match(/(?:€|eur\s*)(\d{2,3}(?:,\d{3})+|\d{2,3}k)\s*(?:-|–|to)\s*(?:€|eur\s*)?(\d{2,3}(?:,\d{3})+|\d{2,3}k)/i);
    if (eurMatch) {
        const rawMin = eurMatch[1].replace(/,/g, '').toLowerCase();
        const rawMax = eurMatch[2].replace(/,/g, '').toLowerCase();
        const min = rawMin.endsWith('k') ? parseFloat(rawMin) * 1000 : parseFloat(rawMin);
        const max = rawMax.endsWith('k') ? parseFloat(rawMax) * 1000 : parseFloat(rawMax);
        return {
            formatted: `€${Math.round(min / 1000)}k–€${Math.round(max / 1000)}k/yr`,
            range: { min, max, currency: '€', period: 'yearly' },
        };
    }
    return {};
}
/**
 * Classifies role seniority based on job title and job description context
 */
export function extractSeniority(title = '', text = '') {
    const t = title.toLowerCase();
    const desc = text.slice(0, 1000).toLowerCase();
    if (/intern\b|internship|trainee|co-?op|summer \d{4}/i.test(t))
        return 'internship';
    if (/lead\b|principal|staff|architect|director|head of|vp\b/i.test(t))
        return 'lead';
    if (/senior\b|sr\b|sr\.|sde-?3|level 3/i.test(t))
        return 'senior';
    if (/entry|junior|jr\b|jr\.|associate|fresher|graduate|sde-?1|level 1/i.test(t))
        return 'entry';
    // Check experience requirements in first 1000 characters
    if (/0-1\s*years?|0-2\s*years?|entry\s*level|new\s*grad/i.test(desc))
        return 'entry';
    if (/5\+\s*years?|6\+\s*years?|7\+\s*years?|8\+\s*years?/i.test(desc))
        return 'senior';
    if (/2-4\s*years?|3-5\s*years?|3\+\s*years?/i.test(desc))
        return 'mid';
    return 'entry';
}
const CANONICAL_TECH_PATTERNS = [
    [/\bpython\b/i, 'Python'],
    [/\btypescript\b/i, 'TypeScript'],
    [/\bjavascript\b/i, 'JavaScript'],
    [/\breact(?:\.js)?\b/i, 'React'],
    [/\bnext(?:\.js)?\b/i, 'Next.js'],
    [/\bnode(?:\.js)?\b/i, 'Node.js'],
    [/\bgo(?:lang)?\b/i, 'Go'],
    [/\brust\b/i, 'Rust'],
    [/\bjava\b(?!\s*script)/i, 'Java'],
    [/\bc\+\+\b/i, 'C++'],
    [/\bc#\b/i, 'C#'],
    [/\baws\b|amazon web services/i, 'AWS'],
    [/\bgcp\b|google cloud/i, 'GCP'],
    [/\bazure\b/i, 'Azure'],
    [/\bdocker\b/i, 'Docker'],
    [/\bkubernetes\b|\bk8s\b/i, 'Kubernetes'],
    [/\bpostgres(?:ql)?\b/i, 'PostgreSQL'],
    [/\bmongodb\b/i, 'MongoDB'],
    [/\bmysql\b/i, 'MySQL'],
    [/\bredis\b/i, 'Redis'],
    [/\bgraphql\b/i, 'GraphQL'],
    [/\btailwind(?:css)?\b/i, 'Tailwind'],
    [/\bflutter\b/i, 'Flutter'],
    [/\bswift\b/i, 'Swift'],
    [/\bkotlin\b/i, 'Kotlin'],
    [/\bpytorch\b/i, 'PyTorch'],
    [/\btensorflow\b/i, 'TensorFlow'],
    [/\bkafka\b/i, 'Kafka'],
    [/\bfastapi\b/i, 'FastAPI'],
    [/\bdjango\b/i, 'Django'],
    [/\bspring\s*boot\b/i, 'Spring Boot'],
];
export function extractTechStack(text) {
    if (!text)
        return [];
    const found = new Set();
    for (const [regex, canonical] of CANONICAL_TECH_PATTERNS) {
        if (regex.test(text)) {
            found.add(canonical);
        }
    }
    return Array.from(found);
}
export function extractGeoRestrictions(text) {
    if (!text)
        return undefined;
    if (/worldwide\s*(remote)?|anywhere\s*in\s*the\s*world|global\s*remote/i.test(text)) {
        return 'Worldwide';
    }
    if (/us\s*only|united\s*states\s*only|within\s*the\s*us|us\s*citizens\s*only/i.test(text)) {
        return 'US Only';
    }
    if (/india\s*(only|remote)?|based\s*in\s*india|apac\s*(region|only)?/i.test(text)) {
        return 'India / APAC';
    }
    if (/eu\s*only|europe\s*(only|remote)?|within\s*europe/i.test(text)) {
        return 'EU Only';
    }
    return undefined;
}
export function extractIndianCitizenEligibility({ text = '', title = '', location = '', sponsorsVisa = undefined, remote = false } = {}) {
    const combined = `${title} ${location} ${text || ''}`.toLowerCase();

    // 1. Explicit negative citizenship / residency / visa restrictions
    const hasCitizenshipRestriction =
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

    const isIndiaLocation =
        /\b(india|noida|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|chennai|kolkata|ahmedabad|jaipur|indore|kochi|chandigarh|ncr)\b/i.test(location.toLowerCase());

    const isExplicitWorldwideRemote =
        /\b(worldwide\s*remote|remote\s*worldwide|work\s*from\s*anywhere|anywhere\s*in\s*the\s*world|global\s*remote|hire\s*anywhere|international\s*remote|remote\s*-\s*global|remote\s*-\s*worldwide)\b/i.test(combined) ||
        /^(worldwide|global|anywhere|remote \/ worldwide)$/i.test(location.trim().toLowerCase());

    const hasExplicitVisaSponsorship =
        sponsorsVisa === true ||
        /visa\s*sponsorship\s*(is\s*)?(available|provided|offered|supported)/i.test(combined) ||
        /(offers?|provides?|supports?)\s+(visa|work authorization|h-?1b)\s*sponsorship/i.test(combined) ||
        /willing\s*to\s*sponsor/i.test(combined) ||
        /relocation\s*(assistance|support|package)\s*(provided|available)/i.test(combined);

    if (hasCitizenshipRestriction && !isIndiaLocation) {
        return {
            allowed: false,
            status: 'restricted',
            badgeText: 'Indian Citizens: Not Allowed',
            shortLabel: 'Not Allowed',
            badgeClass: 'citizen-restricted',
            reason: 'Requires US/local work authorization without visa sponsorship.',
        };
    }

    if (isIndiaLocation) {
        return {
            allowed: true,
            status: 'allowed',
            badgeText: 'Indian Citizens: Allowed (India)',
            shortLabel: 'Allowed',
            badgeClass: 'citizen-allowed',
            reason: 'Position based in India or direct hire.',
        };
    }

    if (hasExplicitVisaSponsorship) {
        return {
            allowed: true,
            status: 'allowed',
            badgeText: 'Indian Citizens: Allowed (Visa Sponsored)',
            shortLabel: 'Visa Sponsored',
            badgeClass: 'citizen-allowed',
            reason: 'Employer offers international visa sponsorship.',
        };
    }

    if (isExplicitWorldwideRemote || (remote && /worldwide|global|anywhere/i.test(location))) {
        return {
            allowed: true,
            status: 'allowed',
            badgeText: 'Indian Citizens: Allowed (Worldwide Remote)',
            shortLabel: 'Worldwide Remote',
            badgeClass: 'citizen-allowed',
            reason: 'Global / Worldwide remote role open to international candidates.',
        };
    }

    const isForeignLocation = /\b(united states|usa|us|uk|united kingdom|canada|germany|france|australia|singapore|netherlands|switzerland|poland|japan|ireland|california|new york|texas|london|berlin)\b/i.test(location.toLowerCase());

    if (isForeignLocation && !remote) {
        return {
            allowed: false,
            status: 'requires_auth',
            badgeText: 'Indian Citizens: Work Visa Required',
            shortLabel: 'Work Visa Required',
            badgeClass: 'citizen-warning',
            reason: 'Foreign location without explicit remote or visa sponsorship.',
        };
    }

    if (remote) {
        return {
            allowed: true,
            status: 'allowed',
            badgeText: 'Indian Citizens: Allowed (Remote)',
            shortLabel: 'Allowed Remote',
            badgeClass: 'citizen-allowed',
            reason: 'Remote role without geographic citizenship restrictions.',
        };
    }

    return {
        allowed: true,
        status: 'allowed',
        badgeText: 'Indian Citizens: Allowed',
        shortLabel: 'Allowed',
        badgeClass: 'citizen-allowed',
        reason: 'Open position without stated citizenship restriction.',
    };
}

export function enrichJobMetadata(text, title = '', location = '', remote = false) {
    const combined = `${title} ${text || ''}`;
    const salaryInfo = extractSalaryRange(combined);
    const eligibleBatches = extractEligibleBatches(text, title);
    const isIntern = /intern|co-?op|trainee/i.test(title) || /internship/i.test(combined);
    const eligibleBatchText = formatEligibleBatchText(eligibleBatches, isIntern, title, text);
    const sponsorsVisa = extractVisaSponsorship(combined);
    return {
        sponsorsVisa,
        eligibleBatches,
        eligibleBatchText,
        salary: salaryInfo.formatted,
        salaryRange: salaryInfo.range,
        seniority: extractSeniority(title, text),
        techStack: extractTechStack(combined),
        geoRestriction: extractGeoRestrictions(combined),
        indianCitizenEligibility: extractIndianCitizenEligibility({ text, title, location, sponsorsVisa, remote }),
    };
}

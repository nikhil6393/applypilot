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
export function extractEligibleBatches(text) {
    if (!text)
        return undefined;
    const lower = text.toLowerCase();
    const batches = new Set();
    // Check for graduating year mentions: "class of 2025", "graduating in 2026", "2024/2025 batch", "2025 or 2026 grad"
    const yearMatches = lower.match(/(?:batch|class of|graduat(?:ing|ion|e) in|graduates? of|passing out)\s*(?:of\s*)?(\d{4})/gi);
    if (yearMatches) {
        for (const ym of yearMatches) {
            const year = ym.match(/\b(202[3-9]|2030)\b/);
            if (year)
                batches.add(year[1]);
        }
    }
    // Check for direct year mentions in intern contexts
    const internYears = lower.match(/\b(2024|2025|2026|2027|2028)\b/g);
    if (internYears && /intern|graduate|student|co-?op/i.test(lower)) {
        for (const y of internYears) {
            if (Number(y) >= 2024 && Number(y) <= 2028) {
                batches.add(y);
            }
        }
    }
    if (batches.size === 0) {
        return undefined;
    }
    return Array.from(batches).sort();
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
export function enrichJobMetadata(text, title = '') {
    const combined = `${title} ${text}`;
    const salaryInfo = extractSalaryRange(combined);
    return {
        sponsorsVisa: extractVisaSponsorship(combined),
        eligibleBatches: extractEligibleBatches(combined),
        salary: salaryInfo.formatted,
        salaryRange: salaryInfo.range,
        seniority: extractSeniority(title, text),
        techStack: extractTechStack(combined),
        geoRestriction: extractGeoRestrictions(combined),
    };
}

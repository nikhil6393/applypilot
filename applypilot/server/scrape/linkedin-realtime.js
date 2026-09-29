import { createHash } from 'node:crypto';
import { load } from 'cheerio';

import { validateAndFilterJobs } from './validator.js';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { linkedinSearchDork } from './linkedin-dork.js';
import { getScraperSearchClusters, } from './RoleExpansionConfig.js';
// ── Circuit Breaker State ──────────────────────────────────────────────
const CIRCUIT_BREAKER = {
    consecutiveFailures: 0,
    maxFailures: 10,
    cooldownMs: 30 * 1000, // 30s auto-healing cooldown (reduced from 2m for high resilience)
    lastOpenedAt: 0,
    state: 'closed',
    lastError: null,
    lastSuccessAt: null,
};
export function resetLinkedInCircuitBreaker() {
    CIRCUIT_BREAKER.consecutiveFailures = 0;
    CIRCUIT_BREAKER.state = 'closed';
    CIRCUIT_BREAKER.lastError = null;
    CIRCUIT_BREAKER.lastOpenedAt = 0;
}
export function getLinkedInHealth() {
    if (CIRCUIT_BREAKER.state === 'open')
        return {
            status: 'down',
            lastError: CIRCUIT_BREAKER.lastError,
            lastSuccessAt: CIRCUIT_BREAKER.lastSuccessAt,
            consecutiveFailures: CIRCUIT_BREAKER.consecutiveFailures,
        };
    if (CIRCUIT_BREAKER.consecutiveFailures > 0)
        return {
            status: 'degraded',
            lastError: CIRCUIT_BREAKER.lastError,
            lastSuccessAt: CIRCUIT_BREAKER.lastSuccessAt,
            consecutiveFailures: CIRCUIT_BREAKER.consecutiveFailures,
        };
    return {
        status: 'live',
        lastError: null,
        lastSuccessAt: CIRCUIT_BREAKER.lastSuccessAt,
        consecutiveFailures: 0,
    };
}
function recordSuccess() {
    CIRCUIT_BREAKER.consecutiveFailures = 0;
    CIRCUIT_BREAKER.state = 'closed';
    CIRCUIT_BREAKER.lastError = null;
    CIRCUIT_BREAKER.lastSuccessAt = new Date().toISOString();
}
function recordFailure(error) {
    CIRCUIT_BREAKER.consecutiveFailures++;
    CIRCUIT_BREAKER.lastError = error;
    if (CIRCUIT_BREAKER.consecutiveFailures >= CIRCUIT_BREAKER.maxFailures) {
        CIRCUIT_BREAKER.state = 'open';
        CIRCUIT_BREAKER.lastOpenedAt = Date.now();
        console.warn(`[linkedin-realtime] Circuit breaker OPENED after ${CIRCUIT_BREAKER.consecutiveFailures} consecutive failures. Pausing direct requests for ${CIRCUIT_BREAKER.cooldownMs / 1000}s.`);
    }
}
function isCircuitOpen() {
    if (CIRCUIT_BREAKER.state !== 'open')
        return false;
    // Check if cooldown has elapsed
    if (Date.now() - CIRCUIT_BREAKER.lastOpenedAt >= CIRCUIT_BREAKER.cooldownMs) {
        CIRCUIT_BREAKER.state = 'half-open';
        console.log('[linkedin-realtime] Circuit breaker half-open — allowing probe request.');
        return false;
    }
    return true;
}
// ── LinkedIn Public Guest Endpoints (Zero-Login / Zero Authwall) ──────
const GUEST_SEARCH = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const GUEST_JOB_DETAIL = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting';
const UA_LIST = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];
function randomUA() {
    return UA_LIST[Math.floor(Math.random() * UA_LIST.length)];
}
export function getBrowserHeaders() {
    return {
        'User-Agent': randomUA(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        Referer: 'https://www.linkedin.com/jobs',
        'Cache-Control': 'no-cache',
    };
}
function stableId(url) {
    return `linkedin_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}
function formatFromMinutesAgo(diffMin, timeMs) {
    let rel = 'Just now';
    if (diffMin < 1)
        rel = 'Just now';
    else if (diffMin < 60)
        rel = `${diffMin}m ago`;
    else if (diffMin < 1440)
        rel = `${Math.floor(diffMin / 60)}h ago`;
    else if (diffMin < 10080)
        rel = `${Math.floor(diffMin / 1440)}d ago`;
    else if (diffMin < 43200)
        rel = `${Math.floor(diffMin / 10080)}w ago`;
    else if (diffMin < 525600)
        rel = `${Math.floor(diffMin / 43200)}mo ago`;
    else
        rel = `${Math.floor(diffMin / 525600)}y ago`;
    return { iso: new Date(timeMs).toISOString(), relative: rel, minutesAgo: diffMin };
}
export function parseRelativeTimeDetails(dateStr) {
    const now = Date.now();
    if (!dateStr || typeof dateStr !== 'string') {
        return { iso: new Date(now - 86400000 * 30).toISOString(), relative: 'Older', minutesAgo: 43200 };
    }
    const clean = dateStr.trim();
    // 1. Direct standard ISO or YYYY-MM-DD
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(clean)) {
        const timeMs = new Date(clean).getTime();
        if (!isNaN(timeMs)) {
            const diffMin = Math.max(0, Math.floor((now - timeMs) / 60000));
            return formatFromMinutesAgo(diffMin, timeMs);
        }
    }
    // 2. Embedded date formats like "Date Opened 10/21/2025", "10/21/2025", or "Oct 21, 2025"
    const embeddedDateMatch = clean.match(/(?:date(?:\s+opened)?|posted(?:\s+on)?|opened)?[:\s]*(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\b)/i);
    if (embeddedDateMatch && embeddedDateMatch[1]) {
        const timeMs = new Date(embeddedDateMatch[1]).getTime();
        if (!isNaN(timeMs)) {
            const diffMin = Math.max(0, Math.floor((now - timeMs) / 60000));
            return formatFromMinutesAgo(diffMin, timeMs);
        }
    }
    // 3. Unquantified immediate phrases: "just now", "few seconds ago", "moments ago"
    if (!/\d+\s*(?:seconds?|secs?|s)\b/i.test(clean) && /\b(?:just now|moments ago|few seconds|seconds ago)\b/i.test(clean)) {
        return {
            iso: new Date(now - 20000).toISOString(),
            relative: 'Just now',
            minutesAgo: 0,
        };
    }
    // 4. Quantified relative time parsing in strict hierarchical order:
    // Years -> Months -> Weeks -> Days -> Hours -> Minutes -> Seconds
    // CRITICAL: Months MUST be checked before minutes so '11 months ago' is NEVER parsed as 11 minutes!
    // Years: e.g. "1 year ago", "2y ago", "1 yr ago"
    const yearMatch = clean.match(/(\d+)\s*(?:years?|yrs?|y)\b/i);
    if (yearMatch) {
        const count = parseInt(yearMatch[1], 10);
        const minutesAgo = count * 365 * 1440;
        const ms = minutesAgo * 60 * 1000;
        return {
            iso: new Date(now - ms).toISOString(),
            relative: `${count}y ago`,
            minutesAgo,
        };
    }
    // Months: e.g. "11 months ago", "1 month ago", "2mo ago", "3 mo"
    const monthMatch = clean.match(/(\d+)\s*(?:months?|mo)\b/i);
    if (monthMatch) {
        const count = parseInt(monthMatch[1], 10);
        const minutesAgo = count * 30 * 1440;
        const ms = minutesAgo * 60 * 1000;
        return {
            iso: new Date(now - ms).toISOString(),
            relative: `${count}mo ago`,
            minutesAgo,
        };
    }
    // Weeks: e.g. "2 weeks ago", "1 week ago", "3w ago", "2 w"
    const weekMatch = clean.match(/(\d+)\s*(?:weeks?|wks?|w)\b/i);
    if (weekMatch) {
        const count = parseInt(weekMatch[1], 10);
        const minutesAgo = count * 7 * 1440;
        const ms = minutesAgo * 60 * 1000;
        return {
            iso: new Date(now - ms).toISOString(),
            relative: `${count}w ago`,
            minutesAgo,
        };
    }
    // Days: e.g. "3 days ago", "1 day ago", "2d ago", "5 d"
    const dayMatch = clean.match(/(\d+)\s*(?:days?|d)\b/i);
    if (dayMatch) {
        const count = parseInt(dayMatch[1], 10);
        const minutesAgo = count * 1440;
        const ms = minutesAgo * 60 * 1000;
        return {
            iso: new Date(now - ms).toISOString(),
            relative: `${count}d ago`,
            minutesAgo,
        };
    }
    // Hours: e.g. "4 hours ago", "1 hr ago", "3h ago", "2 h"
    const hourMatch = clean.match(/(\d+)\s*(?:hours?|hrs?|h)\b/i);
    if (hourMatch) {
        const count = parseInt(hourMatch[1], 10);
        const minutesAgo = count * 60;
        const ms = minutesAgo * 60 * 1000;
        return {
            iso: new Date(now - ms).toISOString(),
            relative: `${count}h ago`,
            minutesAgo,
        };
    }
    // Minutes: e.g. "25 minutes ago", "5 mins ago", "11m ago", "10 m"
    // Note: Word boundary \b ensures '11 months' will NOT match here
    const minMatch = clean.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i);
    if (minMatch) {
        const count = parseInt(minMatch[1], 10);
        const minutesAgo = count;
        const ms = minutesAgo * 60 * 1000;
        return {
            iso: new Date(now - ms).toISOString(),
            relative: `${count}m ago`,
            minutesAgo,
        };
    }
    // Seconds: e.g. "45 seconds ago", "30s ago"
    const secMatch = clean.match(/(\d+)\s*(?:seconds?|secs?|s)\b/i);
    if (secMatch) {
        const count = parseInt(secMatch[1], 10);
        return {
            iso: new Date(now - count * 1000).toISOString(),
            relative: `${count}s ago`,
            minutesAgo: count >= 30 ? 1 : 0,
        };
    }
    // 5. Fallback for unparseable or generic text:
    // Treat as older active posting (~30 days ago). NEVER default to 0 / 'Just now'
    // so unknown postings never displace fresh real-time jobs at the top of the feed.
    return {
        iso: new Date(now - 86400000 * 30).toISOString(),
        relative: 'Active',
        minutesAgo: 43200,
    };
}
export function parseApplicantCount(rawText) {
    if (!rawText)
        return undefined;
    const m = rawText.match(/(\d+)\s*applicant/i);
    if (m)
        return parseInt(m[1], 10);
    if (/first 10|be among first 10/i.test(rawText))
        return 10;
    if (/first 25|be among first 25/i.test(rawText))
        return 25;
    return undefined;
}
export function extractSkillsFromText(text) {
    if (!text)
        return [];
    const skills = [
        'javascript',
        'typescript',
        'react',
        'react native',
        'next.js',
        'node.js',
        'express',
        'python',
        'go',
        'golang',
        'java',
        'kotlin',
        'swift',
        'rust',
        'aws',
        'gcp',
        'azure',
        'kubernetes',
        'docker',
        'terraform',
        'graphql',
        'rest',
        'postgres',
        'postgresql',
        'mysql',
        'mongodb',
        'redis',
        'elasticsearch',
        'tensorflow',
        'pytorch',
        'c++',
        'c#',
        'vue',
        'angular',
        'svelte',
        'figma',
        'tailwind',
        'css',
        'html',
        'spark',
        'kafka',
        'airflow',
        'dbt',
        'snowflake',
        'bigquery',
        'jenkins',
        'github actions',
        'django',
        'flask',
        'fastapi',
        'git',
        'linux',
        'sql',
        'nosql',
        'data structures',
        'algorithms',
        'ci/cd',
        'microservices',
        'devops',
    ];
    const lower = text.toLowerCase();
    const found = new Set();
    for (const s of skills) {
        const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const prefix = /^\w/.test(s) ? '\\b' : '';
        const suffix = /\w$/.test(s) ? '\\b' : '(?=[\\s.,;!?)\\]]|$|$)';
        const regex = new RegExp(`${prefix}${escaped}${suffix}`, 'i');
        if (regex.test(lower))
            found.add(s);
    }
    return [...found].slice(0, 12);
}
async function fetchWithRetry(url, headers, retries = 1, fastMode = false) {
    const effectiveRetries = fastMode ? 0 : retries;
    const timeoutMs = fastMode ? 1400 : 4500;
    for (let i = 0; i <= effectiveRetries; i++) {
        try {
            if (!fastMode) {
                await new Promise((r) => setTimeout(r, 40 + Math.random() * 50));
            }
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(url, {
                headers: { ...getBrowserHeaders(), ...(headers || {}) },
                signal: controller.signal,
            });
            clearTimeout(timer);
            if (res.ok)
                return res;
            if (res.status === 429 || res.status === 403) {
                return null;
            }
            return null;
        }
        catch (err) {
            // connection abort
        }
    }
    return null;
}
const detailCache = new Map();
/**
 * Fetches the complete, unredacted 5,000–10,000 character job description, criteria,
 * and exact role metadata directly from LinkedIn's public guest jobPosting endpoint.
 */
export async function fetchLinkedInJobDetails(numericId) {
    const cached = detailCache.get(numericId);
    if (cached && Date.now() - cached.fetchedAt < 3600_000) {
        return cached;
    }
    const url = `${GUEST_JOB_DETAIL}/${numericId}`;
    try {
        const res = await fetchWithRetry(url, {
            'User-Agent': randomUA(),
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: 'https://www.linkedin.com/',
            'Cache-Control': 'no-cache',
        }, 1);
        if (!res || !res.ok)
            return null;
        const html = await res.text();
        if (!html || html.length < 300)
            return null;
        const $ = load(html);
        const descContainer = $('.show-more-less-html__markup, .description__text, .core-section-container__content');
        // Clean text preserving line breaks
        descContainer.find('br').replaceWith('\n');
        descContainer.find('p').each((_, p) => {
            $(p).append('\n\n');
        });
        descContainer.find('li').each((_, li) => {
            $(li).prepend('• ').append('\n');
        });
        const rawText = descContainer.text().trim();
        const descriptionHtml = descContainer.html()?.trim() || undefined;
        // Standardize newlines
        const descriptionText = rawText.replace(/\n{3,}/g, '\n\n').trim();
        // Criteria extraction (Seniority, Employment Type, Industries, Job Function)
        const criteria = [];
        let seniority;
        let employmentType;
        const industries = [];
        let jobFunction;
        $('.description__job-criteria-item').each((_, el) => {
            const header = $(el).find('h3').first().text().replace(/[\r\n\t]+/g, ' ').trim();
            const val = $(el).find('span').first().text().replace(/[\r\n\t]+/g, ' ').trim();
            if (!val || val.length > 50 || val.includes('\n') || /sign in|join now|cookie/i.test(val))
                return;
            criteria.push(`${header ? header + ': ' : ''}${val}`);
            const hLower = header.toLowerCase();
            if (hLower.includes('seniority'))
                seniority = val;
            else if (hLower.includes('employment'))
                employmentType = val;
            else if (hLower.includes('function'))
                jobFunction = val;
            else if (hLower.includes('industr'))
                industries.push(val);
        });
        // High-resolution company logo
        const companyLogo = $('img.artdeco-entity-image, .topcard__flavor img, .search-entity-media img').attr('data-delayed-url') ||
            $('img.artdeco-entity-image, .topcard__flavor img, .search-entity-media img').attr('src') ||
            undefined;
        // Salary / Stipend (strict clean single-line extraction)
        let salary;
        const rawSal = $('.salary, .compensation__salary, .main-job-card__salary-info, .job-search-card__salary-info')
            .first()
            .text()
            .replace(/[\r\n\t]+/g, ' ')
            .trim();
        if (rawSal && rawSal.length > 3 && rawSal.length < 40 && /[₹$€£\d]/.test(rawSal) && !/sign in|join|cookie/i.test(rawSal)) {
            salary = rawSal;
        }
        if (!salary && descriptionText) {
            const stipendMatch = descriptionText.match(/(?:stipend|salary|remuneration|compensation|pay)[:\s]*([₹$€£]\s*[\d,]+(?:\s*-\s*[₹$€£]?\s*[\d,]+)?(?:\s*\/(?:month|mo|hr|hour|yr|year|annum|pm))?)/i);
            if (stipendMatch && stipendMatch[1].length < 35) {
                salary = stipendMatch[1].trim();
            }
        }
        const skills = extractSkillsFromText(descriptionText);
        const detail = {
            description: descriptionText,
            descriptionHtml,
            criteria,
            skills,
            companyLogo,
            salary,
            seniority,
            employmentType,
            industries,
            jobFunction,
        };
        detailCache.set(numericId, { ...detail, fetchedAt: Date.now() });
        return detail;
    }
    catch {
        return null;
    }
}
/**
 * Concurrently hydrates scraped LinkedIn job cards with their full, verified descriptions.
 */
export async function hydrateJobsWithFullDetails(jobs, concurrency = 4) {
    const targetJobs = jobs.slice(0, 25).filter((j) => {
        const m = j.id.match(/^linkedin_(\d+)$/) || j.url.match(/\/(\d{8,12})/);
        return Boolean(m && m[1]);
    });
    if (targetJobs.length === 0)
        return;
    let index = 0;
    const runWorker = async () => {
        while (index < targetJobs.length) {
            const current = targetJobs[index++];
            const m = current.id.match(/^linkedin_(\d+)$/) || current.url.match(/\/(\d{8,12})/);
            if (!m || !m[1])
                continue;
            const numId = m[1];
            try {
                const details = await fetchLinkedInJobDetails(numId);
                if (details && details.description && details.description.length > 50) {
                    current.description = details.description;
                    if (details.descriptionHtml)
                        current.descriptionHtml = details.descriptionHtml;
                    if (details.companyLogo && !current.companyLogo)
                        current.companyLogo = details.companyLogo;
                    if (details.salary && !current.salary) {
                        const cleanSalary = details.salary.replace(/[\r\n\t]+/g, ' ').trim();
                        if (cleanSalary.length < 40 && !cleanSalary.includes('\n')) {
                            current.salary = cleanSalary;
                            const salTag = `💰 ${cleanSalary}`;
                            if (!current.tags?.includes(salTag)) {
                                current.tags = [...(current.tags || []), salTag];
                            }
                        }
                    }
                    if (details.skills.length > 0) {
                        current.skills = Array.from(new Set([...(current.skills || []), ...details.skills]));
                        current.techStack = Array.from(new Set([...(current.techStack || []), ...details.skills]));
                    }
                    if (details.seniority && details.seniority.length < 40 && !details.seniority.includes('\n')) {
                        if (!current.tags?.includes(details.seniority)) {
                            current.tags = [...(current.tags || []), details.seniority];
                        }
                    }
                    if (details.employmentType && details.employmentType.length < 40 && !details.employmentType.includes('\n')) {
                        if (!current.tags?.includes(details.employmentType)) {
                            current.tags = [...(current.tags || []), details.employmentType];
                        }
                    }
                }
            }
            catch {
                // preserve existing fallback description
            }
        }
    };
    const pool = Array.from({ length: Math.min(concurrency, targetJobs.length) }, () => runWorker());
    await Promise.all(pool);
}
export async function enrichJobWithML(job, headers) {
    try {
        const res = await fetchWithRetry(job.url, headers, 1);
        if (!res)
            return job;
        const html = await res.text();
        const $ = load(html);
        const descText = $('.show-more-less-html__markup, .description__text, .core-section-container__content')
            .text()
            .trim() || html.replace(/<[^>]*>?/gm, ' ').slice(0, 3000);
        if (descText.length < 100)
            return job;
        const prompt = `Analyze this job description:\n\n${descText.slice(0, 2500)}\n\nReturn valid JSON with exactly these keys:
- "true_skills": array of 4-8 strict technical skills mentioned.
- "is_remote_strictly": boolean (true ONLY if it explicitly states "Remote" or "Work from home").
- "is_internship_strictly": boolean (true ONLY if it explicitly states it is an internship, trainee, or co-op).
- "ml_summary": A crisp 2-sentence summary of the actual role and requirements.
JSON only.`;
        const aiRes = await bestEffortComplete(prompt, {
            maxTokens: 400,
            temperature: 0.1,
            system: 'You are an expert technical recruiter analyzing job descriptions. Output valid JSON only.',
        });
        if (aiRes && aiRes.text) {
            const cleanJson = aiRes.text
                .trim()
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/```\s*$/i, '');
            const parsed = JSON.parse(cleanJson);
            job.skills = Array.isArray(parsed.true_skills) ? parsed.true_skills : job.skills;
            if (typeof parsed.is_remote_strictly === 'boolean')
                job.remote = parsed.is_remote_strictly;
            if (typeof parsed.is_internship_strictly === 'boolean') {
                job.isInternship = parsed.is_internship_strictly;
                job.employmentType = parsed.is_internship_strictly ? 'internship' : 'full-time';
            }
            if (parsed.ml_summary)
                job.description = parsed.ml_summary;
            const newTags = [
                job.isInternship ? 'Internship (Verified)' : 'Full-Time',
                job.remote ? 'Remote (Verified)' : job.location,
                '✨ ML Analyzed',
            ].filter(Boolean);
            const oldTags = (job.tags || []).filter((t) => !/internship|full-time|remote/i.test(t));
            job.tags = Array.from(new Set([...newTags, ...oldTags]));
        }
    }
    catch (err) {
        console.warn(`[ML Enrich] Failed for ${job.id}: ${err.message}`);
    }
    return job;
}
export async function linkedinRealtime(req) {
    // Check circuit breaker before attempting any scrape
    if (isCircuitOpen()) {
        console.warn('[linkedin-realtime] Circuit breaker is OPEN — seamlessly falling back to Google/DDG real-time index scraper.');
        return linkedinSearchDork(req);
    }
    const cacheKey = scrapeCache.generateKey('linkedin', req);
    const cached = scrapeCache.get(cacheKey);
    if (cached)
        return cached;
    const query = (req.query || 'software engineer').trim();
    const rawLoc = (req.location || 'India').trim();
    const isGlobal = !rawLoc || /^(anywhere|global|worldwide|remote|all|any)$/i.test(rawLoc);
    // Map timeWindow to LinkedIn f_TPR (time posted range in seconds)
    const effectiveTW = req.timeWindow || '24h';
    const tprMap = {
        '1h': 'r3600',
        '4h': 'r14400',
        '12h': 'r43200',
        '24h': 'r86400',
        '7d': 'r604800',
        all: '',
    };
    const tpr = tprMap[effectiveTW] ?? 'r86400';
    const tprParam = tpr ? `&f_TPR=${tpr}` : '';
    // Max age in minutes for post-validation
    const maxAllowedMinutes = effectiveTW === '1h'
        ? 60
        : effectiveTW === '4h'
            ? 240
            : effectiveTW === '12h'
                ? 720
                : effectiveTW === '24h'
                    ? 1440
                    : effectiveTW === '7d'
                        ? 10080
                        : req.postedWithinHours && req.postedWithinHours > 0
                            ? req.postedWithinHours * 60
                            : 43200;
    // Align employmentFilter (f_E) cleanly with user search intent:
    // IMPORTANT: If query already contains "intern" or "internship", do not hardcode &f_E=1
    // because many Indian/Global recruiters label student internships as Entry-level (&f_E=2) or leave untagged!
    const queryHasIntern = /\bintern(ship)?\b|\bco-?op\b/i.test(query);
    const internshipSearch = req.jobType === 'internship' ||
        (req.internshipsOnly !== false && (req.internshipsOnly || queryHasIntern));
    let employmentFilter = '';
    if (internshipSearch) {
        if (!queryHasIntern) {
            employmentFilter = '&f_E=1';
        }
    }
    else if (req.jobType === 'fulltime' || req.employmentType === 'full-time') {
        const isEntry = req.seniority === 'entry' || req.seniorityLevels?.includes('entry');
        const isSenior = req.seniority === 'senior' ||
            req.seniority === 'lead' ||
            req.seniorityLevels?.some((s) => /senior|lead/i.test(s));
        if (isEntry) {
            employmentFilter = '&f_E=2';
        }
        else if (isSenior) {
            employmentFilter = '&f_E=4';
        }
    }
    // Workplace filter (f_WT: 1 = Onsite, 2 = Remote, 3 = Hybrid)
    let workplaceFilter = '';
    if (req.workplaceType === 'remote' || req.remoteOnly) {
        workplaceFilter = '&f_WT=2';
    }
    else if (req.workplaceType === 'hybrid') {
        workplaceFilter = '&f_WT=3';
    }
    else if (req.workplaceType === 'onsite') {
        workplaceFilter = '&f_WT=1';
    }
    else if (isGlobal) {
        workplaceFilter = '&f_WT=2';
    }
    const locationParam = isGlobal ? '' : `&location=${encodeURIComponent(rawLoc)}`;
    const encodedQuery = encodeURIComponent(query);
    const cacheBust = `&_cb=${Date.now()}`;
    const baseUrl = `${GUEST_SEARCH}?keywords=${encodedQuery}${locationParam}${tprParam}${employmentFilter}${workplaceFilter}&sortBy=DD${cacheBust}`;
    const max = Math.max(1, Math.min(75, req.maxPerSource ?? 75));
    // Targeted pagination (single page in fastMode for instant return)
    const urls = [`${baseUrl}&start=0`];
    if (!req.fastMode) {
        if (max > 25)
            urls.push(`${baseUrl}&start=25`);
        if (max > 50)
            urls.push(`${baseUrl}&start=50`);

        // Role Cluster Expansion: Query key covered role clusters
        const clusters = getScraperSearchClusters(query, internshipSearch ? 'internship' : 'fulltime');
        const extraQueries = clusters.filter((c) => c.toLowerCase() !== query.toLowerCase()).slice(0, 5);
        for (const eq of extraQueries) {
            const eqEncoded = encodeURIComponent(eq);
            urls.push(`${GUEST_SEARCH}?keywords=${eqEncoded}${locationParam}${tprParam}${employmentFilter}${workplaceFilter}&sortBy=DD${cacheBust}&start=0`);
        }

        // Regional fan-out: When searching "India", augment with top tech hubs in parallel
        const isIndia = /india|bharat/i.test(rawLoc);
        if (isIndia && urls.length < 6) {
            const hubLocs = ['Bengaluru, Karnataka, India', 'Hyderabad, Telangana, India'];
            for (const hub of hubLocs) {
                if (urls.length >= 6)
                    break;
                urls.push(`${GUEST_SEARCH}?keywords=${encodedQuery}&location=${encodeURIComponent(hub)}${tprParam}${employmentFilter}${workplaceFilter}&sortBy=DD${cacheBust}&start=0`);
            }
        }
    }
    const headers = getBrowserHeaders();
    const out = [];
    const seen = new Set();
    const responses = [];
    // Concurrency worker pool
    const queue = [...urls];
    const worker = async () => {
        while (queue.length > 0) {
            const u = queue.shift();
            if (!u)
                break;
            try {
                const res = await fetchWithRetry(u, headers, req.fastMode ? 0 : 1, Boolean(req.fastMode));
                if (res && res.ok) {
                    const text = await res.text();
                    if (text && text.length > 100) {
                        responses.push(text);
                    }
                }
            }
            catch { }
            if (!req.fastMode) {
                await new Promise((r) => setTimeout(r, 40 + Math.random() * 50));
            }
        }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    for (const html of responses) {
        const $ = load(html);
        const cards = $('.base-card, .job-search-card, [data-entity-urn*="jobPosting"], li[class*="jobs-search-results"]').toArray();
        for (const card of cards) {
            const title = $(card)
                .find('.base-search-card__title, h3, [class*="job-title"]')
                .first()
                .text()
                .trim();
            const company = $(card)
                .find('.base-search-card__subtitle, [class*="company"], h4')
                .first()
                .text()
                .trim();
            const loc = $(card)
                .find('.job-search-card__location, [class*="location"]')
                .first()
                .text()
                .trim();
            const href = $(card).find('a.base-card__full-link, a[href*="/jobs/view/"]').attr('href') || '';
            const timeEl = $(card).find('time');
            const datetimeAttr = timeEl.attr('datetime') || '';
            const timeText = timeEl.text().trim();
            const listdate = $(card)
                .find('.job-search-card__listdate, [class*="listdate"], .job-search-card__listdate--new')
                .first()
                .text()
                .trim();
            const badgeApplicantText = $(card)
                .find('.job-search-card__benefits, [class*="applicant"], .base-card__label')
                .text()
                .trim();
            // Extract Company Logo & Salary if available
            const companyLogo = $(card).find('img.artdeco-entity-image, img[class*="entity-image"], .search-entity-media img').attr('data-delayed-url') ||
                $(card).find('img').attr('src') ||
                undefined;
            const rawSalary = $(card).find('.job-search-card__salary-info, [class*="salary"]').first().text().trim();
            const salary = rawSalary || undefined;
            if (!title || !href)
                continue;
            // Drop Promoted jobs that bypass time filters
            if (/promoted/i.test($(card).text()))
                continue;
            const rawApplyUrl = href.split('?')[0].replace(/\/$/, '');
            const idMatch = href.match(/\/jobs\/view\/(?:[a-zA-Z0-9_.-]+-)?(\d+)/i) ||
                href.match(/jobPosting%3A(\d+)/i) ||
                href.match(/currentJobId=(\d+)/i) ||
                href.match(/(\d{8,12})/);
            const numericId = idMatch ? idMatch[1] : undefined;
            const id = numericId ? `linkedin_${numericId}` : stableId(rawApplyUrl);
            const applyUrl = numericId ? `https://www.linkedin.com/jobs/view/${numericId}` : rawApplyUrl;
            if (seen.has(id))
                continue;
            seen.add(id);
            // Prioritize listdate ("27 minutes ago") over datetimeAttr ("YYYY-MM-DD")
            const timeSource = listdate || timeText || datetimeAttr;
            if (!timeSource)
                continue;
            const parsedTime = parseRelativeTimeDetails(timeSource);
            // Accurate time window guard
            if (parsedTime.minutesAgo > maxAllowedMinutes)
                continue;
            if (maxAllowedMinutes <= 1440 && /week|month|year|\b[2-9]d\b|\b\d{2,}d\b/i.test(parsedTime.relative))
                continue;
            if (maxAllowedMinutes <= 10080 && /month|year|\b[2-9]w\b|\b\d{2,}w\b/i.test(parsedTime.relative))
                continue;
            const applicantCount = parseApplicantCount(badgeApplicantText || listdate);
            const isHybrid = /hybrid/i.test(loc + ' ' + title);
            const isRemote = /remote|work from home|wfh/i.test(loc + ' ' + title + ' ' + (isGlobal ? 'remote' : rawLoc));
            const isIntern = /\b(intern(ship)?|co-?op|trainee|apprentice|working\s+student|student|fresher|graduate\s+engineer|get\b|campus|early\s+career|associate\s+(software|developer|engineer)|sde\s+intern)\b/i.test(title);
            // Strict Internship Filter: if internship requested, drop non-intern or senior positions
            if (internshipSearch) {
                const isSenior = /\b(senior|sr\.|lead|principal|staff|manager|director)\b/i.test(title) &&
                    !/\bintern(ship)?\b/i.test(title);
                if (!isIntern || isSenior)
                    continue;
            }

            // High-precision exclusions: drop non-tech, hospitality, healthcare, and retail positions
            const isNonTech = /\b(barista|line cook|cook|chef|dishwasher|server|waiter|waitress|cashier|retail associate|sales associate|sales representative|customer service representative|nurse|medical assistant|dental assistant|driver|warehouse worker|forklift operator|security guard|housekeeper|cleaner|janitor|esthetician|stylist|receptionist|crew member|marketing intern|finance intern|accounting intern|hr intern|business development intern|human resources intern|legal intern)\b/i.test(title);
            if (isNonTech)
                continue;

            // Strict tech relevance when tech keywords are present in search query
            const isTechSearch = /software|developer|engineer|frontend|backend|fullstack|data|devops|react|node|cloud|web|ai|ml|python|java|system/i.test(query);
            if (isTechSearch) {
                const titleHasTech = /software|developer|engineer|frontend|backend|fullstack|full-stack|data|devops|react|node|cloud|web|ai|ml|python|java|systems?|programmer|programming|tech|it\b|qa\b|sdet|architect|platform|mobile|android|ios|machine\s+learning/i.test(title);
                if (!titleHasTech)
                    continue;
            }
            // Title formatting: convert screaming all-caps titles to clean Title Case
            const formatTitle = (raw) => {
                const trimmed = raw.trim();
                if (trimmed.length > 4 && trimmed === trimmed.toUpperCase()) {
                    const keepAcronyms = new Set([
                        'AI', 'ML', 'MERN', 'MEAN', 'AWS', 'GCP', 'SQL', 'IT', 'API', 'REST', 'UI', 'UX', 'HR', 'QA', 'SDET'
                    ]);
                    return trimmed
                        .toLowerCase()
                        .split(/\s+/)
                        .map((w) => {
                        const upper = w.toUpperCase();
                        if (keepAcronyms.has(upper))
                            return upper;
                        return w.charAt(0).toUpperCase() + w.slice(1);
                    })
                        .join(' ');
                }
                return trimmed;
            };
            const cleanTitle = formatTitle(title);
            // Deep metadata extraction
            const meta = enrichJobMetadata(`${cleanTitle} ${loc || ''} ${rawSalary || ''}`, cleanTitle);
            const resolvedSalary = meta.salary || salary || undefined;
            const seniority = internshipSearch ? 'internship' : meta.seniority;
            const techStack = meta.techStack && meta.techStack.length > 0 ? meta.techStack : extractSkillsFromText(cleanTitle);
            // Deduplicated, non-redundant tags
            const tagSet = new Set();
            const addTag = (t) => {
                if (!t)
                    return;
                const clean = t.replace(/[\r\n\t]+/g, ' ').trim();
                if (!clean || clean.length > 45 || /sign in|join now|cookie/i.test(clean))
                    return;
                const lower = clean.toLowerCase();
                for (const existing of tagSet) {
                    if (existing.toLowerCase() === lower)
                        return;
                }
                tagSet.add(clean);
            };
            addTag(isIntern ? 'Internship' : 'Full-Time');
            addTag(parsedTime.minutesAgo < 60
                ? '⚡ Just Posted'
                : parsedTime.minutesAgo < 1440
                    ? '🕒 Fresh (<24h)'
                    : '📅 Recent');
            if (isHybrid)
                addTag('⚡ Hybrid');
            else if (isRemote)
                addTag('🌐 Remote');
            if (resolvedSalary)
                addTag(`💰 ${resolvedSalary}`);
            if (applicantCount !== undefined) {
                addTag(applicantCount < 10 ? '🔥 Few Applicants' : `${applicantCount} applicants`);
            }
            if (seniority && seniority.toLowerCase() !== 'internship' && seniority.toLowerCase() !== 'full-time') {
                addTag(seniority.toUpperCase());
            }
            const tags = Array.from(tagSet);
            const skillsSnippet = techStack && techStack.length > 0 ? `Required skills: ${techStack.join(', ')}.` : '';
            const stipendSnippet = resolvedSalary ? `Compensation: ${resolvedSalary}.` : '';
            const initialDescription = `${cleanTitle} at ${company} in ${loc || rawLoc}. Verified real-time LinkedIn posting. ${stipendSnippet} ${skillsSnippet}`.trim();
            out.push({
                id,
                title: cleanTitle,
                company: company || 'Tech Company',
                companyLogo,
                salary: resolvedSalary,
                salaryRange: meta.salaryRange,
                seniority,
                techStack,
                source: 'linkedin',
                url: applyUrl,
                applyUrl,
                location: loc || rawLoc,
                remote: isRemote,
                description: initialDescription,
                postedDate: parsedTime.iso,
                postedAt: parsedTime.iso,
                postedRelative: parsedTime.relative,
                applicantCount,
                isInternship: isIntern,
                sponsorsVisa: meta.sponsorsVisa,
                eligibleBatches: meta.eligibleBatches,
                skills: techStack || extractSkillsFromText(title + ' ' + (loc || '')),
                tags,
                fetchedAt: new Date().toISOString(),
                employmentType: isIntern ? 'internship' : 'full-time',
            });
        }
    }
    // In normal mode, hydrate top jobs with full descriptions. In fastMode (stream search), skip for sub-second speed.
    if (!req.fastMode) {
        await hydrateJobsWithFullDetails(out, 5);
    }
    // If we got results, mark source as healthy
    if (out.length > 0)
        recordSuccess();
    // Validate all jobs through Data Integrity Layer
    const verifiedJobs = validateAndFilterJobs(out);
    // In deep scrape mode, if direct guest scrape was throttled or returned few jobs, seamlessly augment with search engine index dorking
    if (!req.fastMode && verifiedJobs.length < 5) {
        try {
            const dorkJobs = await linkedinSearchDork(req);
            for (const dj of dorkJobs) {
                if (!seen.has(dj.id) && verifiedJobs.length < max) {
                    seen.add(dj.id);
                    verifiedJobs.push(dj);
                }
            }
        }
        catch {
            // ignore dorking error
        }
    }
    // If we got results from direct scrape or dorking, record success
    if (verifiedJobs.length > 0) {
        recordSuccess();
    }
    // Sort strictly by newest first
    verifiedJobs.sort((a, b) => new Date(b.postedDate || b.postedAt).getTime() -
        new Date(a.postedDate || a.postedAt).getTime());
    const finalJobs = verifiedJobs.slice(0, max);
    // Cache clean results for 3 minutes
    if (finalJobs.length > 0) {
        scrapeCache.set(cacheKey, finalJobs, 180);
    }
    return finalJobs;
}

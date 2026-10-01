import { load } from 'cheerio';
import { htmlToCleanMarkdown, extractStructuredSections, decodeHtmlEntities } from './clean-description.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { resolveCompanyLogo } from './logo-resolver.js';
import { getBrowserHeaders } from './linkedin-realtime.js';

/**
 * Advanced Universal Job Description & Direct URL Scraper
 * Extracts 100% authentic, uncompressed original job details across:
 * - LinkedIn Job URLs (Guest API)
 * - Greenhouse (Full Content API)
 * - Lever (Full Content + Lists API)
 * - Ashby (JobPosting API & Schema)
 * - Workday, Indeed, SmartRecruiters, Taleo, Company Career Sites (Schema.org JSON-LD + Deep Cheerio)
 * - Raw Job Description Text
 */

function cleanText(val) {
    if (!val) return '';
    return decodeHtmlEntities(String(val))
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * 1. LinkedIn Direct Scraper
 */
async function scrapeLinkedInUrl(url) {
    const idMatch = url.match(/\/view\/(\d+)/) ||
        url.match(/currentJobId=(\d+)/) ||
        url.match(/jobs\/(\d+)/) ||
        url.match(/-(\d{8,12})(?:\?|$)/);

    if (!idMatch || !idMatch[1]) {
        return null;
    }

    const jobId = idMatch[1];
    const targetUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
        const res = await fetch(targetUrl, {
            headers: getBrowserHeaders(),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) return null;
        const html = await res.text();
        const $ = load(html);

        const title = cleanText($('.top-card-layout__title, h1.topcard__title, h2.top-card-layout__title').first().text()) || 'Software Engineer';
        const company = cleanText($('.topcard__flavor--black-link, a.topcard__flavor, .topcard__org-name-link').first().text()) || 'LinkedIn Employer';
        const location = cleanText($('.topcard__flavor--bullet, span.topcard__flavor').first().text()) || 'Remote / Hybrid';

        // Extract full raw description HTML and convert to clean markdown
        const descHtml = $('.show-more-less-html__markup, .description__text, .decorated-job-posting__details').html() || '';
        const description = htmlToCleanMarkdown(descHtml) || htmlToCleanMarkdown(html);

        // Salary
        const rawSal = cleanText($('.salary, .compensation__salary, .main-job-card__salary-info').first().text());

        // Criteria
        const criteria = [];
        $('.description__job-criteria-item').each((_, el) => {
            const h = cleanText($(el).find('h3').first().text());
            const v = cleanText($(el).find('span').first().text());
            if (h && v) criteria.push(`${h}: ${v}`);
        });

        const companyLogo = $('img.artdeco-entity-image, .topcard__flavor img').attr('data-delayed-url') ||
            $('img.artdeco-entity-image, .topcard__flavor img').attr('src') ||
            resolveCompanyLogo(company, null, url);

        return {
            title,
            company,
            location,
            isRemote: /remote/i.test(location) || /remote/i.test(title),
            isInternship: /intern|co-?op|trainee|apprentice/i.test(title),
            salary: rawSal || undefined,
            description,
            applyUrl: url,
            source: 'linkedin',
            companyLogo,
            criteria,
        };
    } catch (err) {
        clearTimeout(timeout);
        return null;
    }
}

/**
 * 2. Greenhouse Direct Scraper
 */
async function scrapeGreenhouseUrl(url) {
    const ghMatch = url.match(/(?:boards|job-boards)\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/i) ||
        url.match(/gh_jid=(\d+)/i);

    if (!ghMatch) return null;

    let boardToken = ghMatch[1];
    let jobId = ghMatch[2];

    if (!jobId && ghMatch[1]) {
        jobId = ghMatch[1];
        const u = new URL(url);
        boardToken = u.pathname.split('/')[1];
    }

    if (!boardToken || !jobId) return null;

    try {
        const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?content=true`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(apiUrl, {
            headers: { 'User-Agent': 'ApplyPilot/2.0' },
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) return null;
        const j = await res.json();

        const title = cleanText(j.title) || 'Software Engineer';
        const company = boardToken.charAt(0).toUpperCase() + boardToken.slice(1);
        const location = cleanText(j.location?.name) || 'Remote / Hybrid';
        const description = htmlToCleanMarkdown(j.content || '');

        return {
            title,
            company,
            location,
            isRemote: /remote/i.test(location) || /remote/i.test(title),
            isInternship: /intern|co-?op|trainee|apprentice/i.test(title),
            description,
            applyUrl: j.absolute_url || url,
            source: 'greenhouse',
            companyLogo: resolveCompanyLogo(company, null, url),
        };
    } catch {
        return null;
    }
}

/**
 * 3. Lever Direct Scraper
 */
async function scrapeLeverUrl(url) {
    const leverMatch = url.match(/jobs\.lever\.co\/([^/]+)\/([a-f0-9-]+)/i);
    if (!leverMatch) return null;

    const company = leverMatch[1];
    const postingId = leverMatch[2];

    try {
        const apiUrl = `https://api.lever.co/v0/postings/${company}/${postingId}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(apiUrl, {
            headers: { 'User-Agent': 'ApplyPilot/2.0' },
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) return null;
        const p = await res.json();

        const title = cleanText(p.text) || 'Software Engineer';
        const compName = company.charAt(0).toUpperCase() + company.slice(1);
        const location = cleanText(p.categories?.location) || 'Remote';

        // Combine overview + all structured lists (responsibilities, requirements, qualifications)
        let fullContent = p.descriptionPlain || htmlToCleanMarkdown(p.description) || '';

        if (Array.isArray(p.lists) && p.lists.length > 0) {
            for (const item of p.lists) {
                const sectionTitle = item.text || 'Details';
                const sectionContent = htmlToCleanMarkdown(item.content || '');
                fullContent += `\n\n### ${sectionTitle}\n${sectionContent}`;
            }
        }

        if (p.additionalPlain) {
            fullContent += `\n\n### Additional Information\n${p.additionalPlain}`;
        }

        return {
            title,
            company: compName,
            location,
            isRemote: /remote/i.test(location) || /remote/i.test(title),
            isInternship: /intern|co-?op|trainee|apprentice/i.test(title),
            description: fullContent.trim(),
            applyUrl: p.applyUrl || p.hostedUrl || url,
            source: 'lever',
            companyLogo: resolveCompanyLogo(compName, null, url),
        };
    } catch {
        return null;
    }
}

/**
 * 4. Generic Webpage Scraper (Schema.org JSON-LD + Deep HTML Parsing)
 */
async function scrapeGenericUrl(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) return null;
        const html = await res.text();
        const $ = load(html);

        let title = '';
        let company = '';
        let location = '';
        let description = '';
        let salary = '';
        let employmentType = '';

        // A. Attempt Schema.org JobPosting JSON-LD extraction
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const text = $(el).text();
                if (!text || !text.includes('JobPosting')) return;

                const parsed = JSON.parse(text);
                const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] || [])];

                for (const item of candidates) {
                    if (item && item['@type'] === 'JobPosting') {
                        if (!title && item.title) title = cleanText(item.title);
                        if (!company && item.hiringOrganization?.name) company = cleanText(item.hiringOrganization.name);
                        if (!location) {
                            const addr = item.jobLocation?.address;
                            if (typeof addr === 'string') location = cleanText(addr);
                            else if (addr && typeof addr === 'object') {
                                location = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', ');
                            }
                        }
                        if (!description && item.description) {
                            description = htmlToCleanMarkdown(item.description);
                        }
                        if (!salary && item.baseSalary?.value) {
                            const val = item.baseSalary.value;
                            salary = `${val.minValue || ''} - ${val.maxValue || val.value || ''} ${item.baseSalary.currency || ''}`.trim();
                        }
                        if (!employmentType && item.employmentType) {
                            employmentType = String(item.employmentType);
                        }
                    }
                }
            } catch {}
        });

        // B. Fallback to OpenGraph and semantic HTML selectors
        if (!title) {
            title = cleanText($('meta[property="og:title"]').attr('content')) ||
                cleanText($('[data-automation-id="jobPostingHeader"], h1').first().text()) ||
                cleanText($('title').text()).replace(/\s*[-–|].*$/, '');
        }

        if (!company) {
            company = cleanText($('meta[property="og:site_name"]').attr('content')) ||
                cleanText($('[data-automation-id="companyName"], .company-name, .employer, .company').first().text());

            if (!company) {
                try {
                    const parsedUrl = new URL(url);
                    company = parsedUrl.hostname.replace(/^(?:www\.|careers\.|jobs\.)/i, '').split('.')[0];
                    company = company.charAt(0).toUpperCase() + company.slice(1);
                } catch {
                    company = 'Verified Company';
                }
            }
        }

        if (!location) {
            location = cleanText($('[data-automation-id="jobLocation"], .job-location, .location').first().text()) || 'Remote / Hybrid';
        }

        // C. Target semantic job description container
        if (!description || description.length < 100) {
            const descEl = $('[data-automation-id="jobPostingDescription"], article, main, #job-description, .job-description, .job-details, .description, .content').first();
            if (descEl.length > 0) {
                description = htmlToCleanMarkdown(descEl.html());
            } else {
                description = htmlToCleanMarkdown(html);
            }
        }

        return {
            title: title || 'Software Engineer',
            company: company || 'Tech Company',
            location: location || 'Remote / Hybrid',
            isRemote: /remote/i.test(location) || /remote/i.test(title),
            isInternship: /intern|co-?op|trainee|apprentice/i.test(title) || /intern/i.test(employmentType),
            salary: salary || undefined,
            description,
            applyUrl: url,
            source: 'web',
            companyLogo: resolveCompanyLogo(company, null, url),
        };
    } catch (err) {
        clearTimeout(timeout);
        return null;
    }
}

/**
 * 5. Parse Raw Pasted Job Description Text
 */
export function parseRawJobText(rawText) {
    if (!rawText) return null;

    const cleanedText = htmlToCleanMarkdown(rawText);
    const lines = cleanedText.split('\n').filter((l) => l.trim().length > 0);

    let title = 'Software Engineer';
    let company = 'Engineering Team';
    let location = 'Remote / Hybrid';

    // Heuristics: examine first 6 lines for title, company, location
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
        const line = lines[i];

        // "Role: Software Engineer" or "Title: Frontend Developer"
        const roleMatch = line.match(/^(?:role|position|job title|title)[:\s]+(.+)$/i);
        if (roleMatch && roleMatch[1].length < 60) {
            title = roleMatch[1].trim();
            continue;
        }

        // "Company: Google" or "Employer: Stripe"
        const compMatch = line.match(/^(?:company|organization|employer|at)[:\s]+(.+)$/i);
        if (compMatch && compMatch[1].length < 50) {
            company = compMatch[1].trim();
            continue;
        }

        // "Location: Bangalore"
        const locMatch = line.match(/^(?:location|workplace|city)[:\s]+(.+)$/i);
        if (locMatch && locMatch[1].length < 50) {
            location = locMatch[1].trim();
            continue;
        }

        // e.g. "Senior React Developer at OpenAI"
        const combinedMatch = line.match(/^(.+?)\s+at\s+([A-Z][A-Za-z0-9\s.,]+)$/i);
        if (combinedMatch && combinedMatch[1].length < 60 && combinedMatch[2].length < 40) {
            title = combinedMatch[1].trim();
            company = combinedMatch[2].trim();
            continue;
        }

        // e.g. "Acme Corp - San Francisco, CA (Remote)" or "Stripe | Remote"
        const dashCompLocMatch = line.match(/^([A-Za-z0-9\s.,&]{2,40})\s*[-–—|]\s*([A-Za-z0-9\s.,()/-]{2,50})$/);
        if (dashCompLocMatch && !/salary|experience|requirement/i.test(line)) {
            if (company === 'Engineering Team') company = dashCompLocMatch[1].trim();
            if (location === 'Remote / Hybrid') location = dashCompLocMatch[2].trim();
            continue;
        }

        // If line is short and looks like a title
        if (i === 0 && line.length < 55 && !line.includes(':') && !line.startsWith('•')) {
            title = line.trim();
        }
    }

    return {
        title,
        company,
        location,
        isRemote: /remote/i.test(location) || /remote/i.test(cleanedText.slice(0, 500)),
        isInternship: /intern|co-?op|trainee|apprentice/i.test(title) || /internship/i.test(cleanedText.slice(0, 500)),
        description: cleanedText,
        applyUrl: '#',
        source: 'manual',
        companyLogo: resolveCompanyLogo(company, null, null),
    };
}

/**
 * Universal Scrape & Extraction Pipeline
 * Extracts full authentic description, metadata, and structured sections.
 */
export async function scrapeJobFromUrlOrText(urlOrText, rawText) {
    let inputUrl = null;
    let inputText = null;

    if (typeof urlOrText === 'string') {
        const trimmed = urlOrText.trim();
        // Check if string is a web URL
        if (/^(?:https?:\/\/|www\.)[^\s]+$/i.test(trimmed) || (!trimmed.includes('\n') && /^[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(trimmed))) {
            inputUrl = trimmed.startsWith('www.') ? `https://${trimmed}` : (trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
        } else {
            inputText = trimmed;
        }
    }

    if (rawText && typeof rawText === 'string' && rawText.trim().length > 0) {
        inputText = rawText.trim();
    }

    let baseJob = null;

    if (inputUrl) {
        if (inputUrl.includes('linkedin.com')) {
            baseJob = await scrapeLinkedInUrl(inputUrl);
        } else if (inputUrl.includes('greenhouse.io')) {
            baseJob = await scrapeGreenhouseUrl(inputUrl);
        } else if (inputUrl.includes('lever.co')) {
            baseJob = await scrapeLeverUrl(inputUrl);
        }

        // If specific platform scraper didn't fire or returned null, try generic deep scraper
        if (!baseJob) {
            baseJob = await scrapeGenericUrl(inputUrl);
        }
    }

    // Fallback to raw text parser if URL failed or inputText was supplied
    if ((!baseJob || !baseJob.description || baseJob.description.length < 50) && inputText) {
        baseJob = parseRawJobText(inputText);
    }

    if (!baseJob) {
        throw new Error('Unable to extract job details from the provided URL or text. Please verify the URL or paste the job description text.');
    }

    // Run deep metadata enrichment
    const meta = enrichJobMetadata(baseJob.description, baseJob.title);
    const sections = extractStructuredSections(baseJob.description);

    const mergedSkills = new Set([
        ...(meta.techStack || []),
        ...(baseJob.skills || []),
    ]);

    // Ensure we have at least standard technical skills
    if (mergedSkills.size === 0) {
        const common = ['React', 'TypeScript', 'Node.js', 'SQL'];
        for (const c of common) {
            if (new RegExp(`\\b${c}\\b`, 'i').test(baseJob.description)) {
                mergedSkills.add(c);
            }
        }
    }

    const tags = [
        baseJob.isInternship ? 'Internship' : 'Full-Time',
    ];
    if (baseJob.isRemote) tags.push('🌐 Remote');
    if (meta.sponsorsVisa === true) tags.push('🛂 Visa Sponsor');
    if (meta.salary || baseJob.salary) tags.push(`💰 ${meta.salary || baseJob.salary}`);
    if (meta.seniority) tags.push(meta.seniority.charAt(0).toUpperCase() + meta.seniority.slice(1));

    return {
        id: `scraped_${Date.now()}`,
        title: baseJob.title,
        company: baseJob.company,
        companyLogo: baseJob.companyLogo || resolveCompanyLogo(baseJob.company, null, baseJob.applyUrl),
        location: baseJob.location,
        remote: baseJob.isRemote,
        employmentType: baseJob.isInternship ? 'internship' : 'full-time',
        description: baseJob.description, // 100% original, fully preserved description
        responsibilities: sections.responsibilities,
        requirements: sections.requirements,
        preferredQualifications: sections.preferred,
        benefits: sections.benefits,
        summary: sections.summary,
        skills: Array.from(mergedSkills).slice(0, 15),
        salary: meta.salary || baseJob.salary || undefined,
        salaryRange: meta.salaryRange || undefined,
        sponsorsVisa: meta.sponsorsVisa,
        eligibleBatches: meta.eligibleBatches,
        seniority: meta.seniority,
        geoRestriction: meta.geoRestriction,
        url: baseJob.applyUrl,
        applyUrl: baseJob.applyUrl,
        source: baseJob.source || 'manual',
        postedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        tags,
    };
}

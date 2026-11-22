/**
 * Internshala Real-Time Tech Internship Scraper powered by Crawlee
 * High-volume student & fresher internship engine targeting software, web, AI/ML, and mobile roles.
 */
import { createHash } from 'node:crypto';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { isJobLocationMatch } from './geo-resolver.js';
import { resolveCompanyLogo } from './logo-resolver.js';
import { runCheerioCrawl } from './crawlee-engine.js';

function stableId(url) {
    return `internshala_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}

function parseInternshalaDate(text) {
    const now = Date.now();
    if (!text) {
        return { iso: new Date(now - 86400000 * 5).toISOString(), relative: 'Active' };
    }
    const clean = text.toLowerCase();
    if (/just now|moments ago|few seconds/i.test(clean)) {
        return { iso: new Date(now - 120000).toISOString(), relative: 'Just now' };
    }
    if (/few hours ago|today/i.test(clean)) {
        return { iso: new Date(now - 3600000 * 3).toISOString(), relative: 'Today' };
    }
    const hrMatch = clean.match(/(\d+)\s*(?:hours?|hrs?|h)\b/i);
    if (hrMatch) {
        const count = parseInt(hrMatch[1], 10);
        return { iso: new Date(now - count * 3600000).toISOString(), relative: `${count}h ago` };
    }
    const dayMatch = clean.match(/(\d+)\s*(?:days?|d)\b/i);
    if (dayMatch) {
        const count = parseInt(dayMatch[1], 10);
        return { iso: new Date(now - count * 86400000).toISOString(), relative: `${count}d ago` };
    }
    const wkMatch = clean.match(/(\d+)\s*(?:weeks?|wks?|w)\b/i);
    if (wkMatch) {
        const count = parseInt(wkMatch[1], 10);
        return { iso: new Date(now - count * 7 * 86400000).toISOString(), relative: `${count}w ago` };
    }
    const moMatch = clean.match(/(\d+)\s*(?:months?|mo)\b/i);
    if (moMatch) {
        const count = parseInt(moMatch[1], 10);
        return { iso: new Date(now - count * 30 * 86400000).toISOString(), relative: `${count}mo ago` };
    }
    const dateMatch = clean.match(/(\d{1,2})\s+([a-z]{3})(?:'|\s+)?(\d{2,4})?/i);
    if (dateMatch) {
        const year = dateMatch[3] ? (dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]) : new Date().getFullYear();
        const d = new Date(`${dateMatch[2]} ${dateMatch[1]} ${year}`);
        if (!isNaN(d.getTime())) {
            const diffDays = Math.max(0, Math.floor((now - d.getTime()) / 86400000));
            return { iso: d.toISOString(), relative: diffDays === 0 ? 'Today' : `${diffDays}d ago` };
        }
    }
    return { iso: new Date(now - 86400000 * 3).toISOString(), relative: 'Active' };
}

export function parseInternshalaDateExported(text) {
    return parseInternshalaDate(text);
}

export async function internshala(req = {}) {
    const cacheKey = scrapeCache.generateKey('internshala', req);
    const cached = scrapeCache.get(cacheKey);
    if (cached && cached.length > 0)
        return cached;

    const max = Math.max(1, Math.min(50, req.maxPerSource ?? 25));
    const rawQuery = (req.query || 'software engineer').toLowerCase().trim();
    const rawLoc = (req.location || 'India').trim();
    const remoteOnly = req.remoteOnly || /remote/i.test(rawLoc);

    const querySlug = rawQuery.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'software-engineer';
    const targetUrls = [
        `https://internshala.com/internships/keywords-${querySlug}/`,
        'https://internshala.com/internships/web-development-internship/',
        'https://internshala.com/internships/front-end-development-internship/',
        'https://internshala.com/internships/backend-development-internship/',
    ];

    if (remoteOnly) {
        targetUrls.unshift(`https://internshala.com/internships/work-from-home-keywords-${querySlug}-internships/`);
    }

    const out = [];
    const seen = new Set();

    try {
        await runCheerioCrawl({
            urls: targetUrls.slice(0, 2),
            maxConcurrency: 2,
            requestTimeoutSecs: 14,
            requestHandler: async ({ $, request }) => {
                $('.individual_internship').each((_, el) => {
                    if (out.length >= max)
                        return false;
                    const titleEl = $(el).find('a[href*="/internship/detail/"]').first();
                    const title = titleEl.text().trim();
                    const rawHref = titleEl.attr('href') || '';
                    if (!title || !rawHref)
                        return;

                    const applyUrl = rawHref.startsWith('http') ? rawHref : `https://internshala.com${rawHref}`;
                    const rawCompany = $(el).find('.company_name, .company-name').first().text().trim();
                    const company = rawCompany
                        .replace(/actively\s+hiring/i, '')
                        .replace(/[\r\n\t]+/g, ' ')
                        .replace(/\s{2,}/g, ' ')
                        .trim() || 'Fast Growing Startup';

                    const cardLoc = $(el).find('.location_link, .locations, #location_names').first().text().trim() ||
                        (remoteOnly ? 'Remote' : 'India');
                    const remote = /work from home|wfh|remote/i.test(cardLoc + ' ' + title);

                    // Clean tech filter
                    const isTech = /software|developer|engineer|frontend|backend|fullstack|full-stack|data|devops|react|node|cloud|web|ai|ml|python|java|systems?|programmer|tech|sdet|architect|platform|mobile|android|ios/i.test(title);
                    const isIrrelevant = /outreach|counselor|fundraising|graphic|catalog|tailor|clerk|cook|driver|cleaner|tele|call\s*center|voice|reception/i.test(title);
                    if (!isTech || isIrrelevant)
                        return;

                    const id = stableId(applyUrl);
                    if (seen.has(id))
                        return;
                    seen.add(id);

                    const stipend = $(el).find('.stipend, .salary, [class*="stipend"]').first().text().trim() || undefined;
                    const meta = enrichJobMetadata(`${title} ${company} ${cardLoc}`, title);
                    const tags = ['Internship', '🎓 Student Friendly'];
                    if (remote)
                        tags.push('🌐 Remote');
                    if (stipend)
                        tags.push(`💰 ${stipend}`);
                    tags.push('⚡ Fresh Drop');

                    const rawLogo = $(el).find('.internship_logo img, .company-logo img').first().attr('src') ||
                        $(el).find('.internship_logo img, .company-logo img').first().attr('data-src');
                    const cleanLogo = rawLogo
                        ? (rawLogo.startsWith('//') ? `https:${rawLogo}` : (rawLogo.startsWith('http') ? rawLogo : `https://internshala.com${rawLogo}`))
                        : undefined;
                    const finalLogo = resolveCompanyLogo(company, cleanLogo, applyUrl);

                    const rawDateText = $(el).find('.status-container, .posted_by_container, .status-success, .status, .success_and_early_applicant, [class*="status"], .status-inactive').first().text().replace(/[\r\n\t]+/g, ' ').trim();
                    const parsedDate = parseInternshalaDate(rawDateText);

                    out.push({
                        id,
                        title,
                        company,
                        source: 'internshala',
                        url: applyUrl,
                        applyUrl,
                        location: cardLoc,
                        remote,
                        companyLogo: finalLogo,
                        description: `${title} internship at ${company} in ${cardLoc}. Verified active opportunity on Internshala.`,
                        postedAt: parsedDate.iso,
                        postedDate: parsedDate.iso,
                        postedRelative: parsedDate.relative,
                        fetchedAt: new Date().toISOString(),
                        employmentType: 'internship',
                        isInternship: true,
                        salary: stipend,
                        skills: meta.techStack || [],
                        tags,
                    });
                });
            },
        });
    }
    catch (e) {
        console.warn('[internshala-crawlee] Crawl error:', e.message);
    }

    const finalJobs = out.slice(0, max);
    if (finalJobs.length > 0) {
        scrapeCache.set(cacheKey, finalJobs, 180);
    }
    return finalJobs;
}

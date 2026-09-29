import { createHash } from 'node:crypto';
function stableId(url) {
    return `naukri_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}
function parseNaukriTime(timeStr) {
    if (!timeStr)
        return new Date().toISOString();
    const now = Date.now();
    const lower = timeStr.toLowerCase().trim();
    if (lower.includes('just now') || lower.includes('few seconds')) {
        return new Date(now - 30000).toISOString();
    }
    if (lower.includes('today')) {
        return new Date(now - 3600000).toISOString(); // Approx 1 hour ago
    }
    if (lower.includes('yesterday')) {
        return new Date(now - 86400000).toISOString();
    }
    if (lower.includes('30+')) {
        return new Date(now - 30 * 86400000).toISOString();
    }
    const m = lower.match(/(\d+)\s*(second|sec|minute|min|hour|hr|day|week|month)/);
    if (!m)
        return new Date().toISOString();
    const n = parseInt(m[1], 10);
    const unit = m[2];
    let msMultiplier = 0;
    if (unit.startsWith('sec'))
        msMultiplier = 1000;
    else if (unit.startsWith('min'))
        msMultiplier = 60000;
    else if (unit.startsWith('hour') || unit.startsWith('hr'))
        msMultiplier = 3600000;
    else if (unit.startsWith('day'))
        msMultiplier = 86400000;
    else if (unit.startsWith('week'))
        msMultiplier = 604800000;
    else if (unit.startsWith('month'))
        msMultiplier = 2592000000;
    return new Date(now - n * msMultiplier).toISOString();
}
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
export async function naukriPlaywright(req) {
    let browser = null;
    const out = [];
    try {
        const { chromium } = await import('playwright');
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--window-size=1280,800',
            ],
        });
        const context = await browser.newContext({
            userAgent: UA,
            viewport: { width: 1280, height: 800 },
            locale: 'en-IN',
            timezoneId: 'Asia/Kolkata',
            extraHTTPHeaders: {
                'Accept-Language': 'en-IN,en;q=0.9',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
        });
        // Override navigator properties to avoid detection
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en'] });
        });
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        const query = (req.query || 'software engineer').trim();
        const location = (req.location || 'India').trim();
        const keyword = encodeURIComponent(query);
        const isGlobal = /anywhere|global|worldwide/i.test(location);
        const locParam = isGlobal ? '' : `&l=${encodeURIComponent(location)}`;
        // Naukri sort=1 means "Date" (newest first)
        const searchUrl = `https://www.naukri.com/${query.toLowerCase().replace(/\s+/g, '-')}-jobs?k=${keyword}${locParam}&sort=1&freshness=1`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        // Wait for job cards to appear
        try {
            await page.waitForSelector('[class*="jobTuple"], article.jobTuple, .job-listing-container, .list', { timeout: 10000 });
        }
        catch {
            // Try alternate selector
            await page
                .waitForSelector('[data-job-id], .job-container', { timeout: 5000 })
                .catch(() => { });
        }
        // Extract job data from page
        const jobs = await page.evaluate(() => {
            const results = [];
            // Try multiple selectors for different Naukri layouts
            const selectors = [
                'article.jobTuple',
                '[class*="jobTuple"]',
                '[data-job-id]',
                '.job-container',
                'li[data-id]',
            ];
            let cards = [];
            for (const sel of selectors) {
                cards = Array.from(document.querySelectorAll(sel));
                if (cards.length > 0)
                    break;
            }
            for (const card of cards.slice(0, 30)) {
                try {
                    const titleEl = card.querySelector('a.title, a[title], h2 a, h3 a, [class*="title"] a');
                    const title = titleEl?.textContent?.trim() || '';
                    const href = titleEl?.href || '';
                    if (!title || !href)
                        continue;
                    const company = card
                        .querySelector('[class*="company"], [class*="subTitle"], .company-info a')
                        ?.textContent?.trim() || '';
                    const location = card
                        .querySelector('[class*="location"], [class*="loc"], [class*="address"]')
                        ?.textContent?.trim() || '';
                    const time = card
                        .querySelector('[class*="freshness"], [class*="date"], time, [class*="posted"]')
                        ?.textContent?.trim() || '';
                    const salary = card.querySelector('[class*="salary"], [class*="package"]')?.textContent?.trim() || '';
                    const desc = card
                        .querySelector('[class*="job-desc"], [class*="description"]')
                        ?.textContent?.trim() || '';
                    results.push({ title, href, company, location, time, salary, desc });
                }
                catch {
                    // Skip malformed cards
                }
            }
            return results;
        });
        for (const job of jobs) {
            if (!job.title || !job.href)
                continue;
            const applyUrl = job.href.startsWith('http') ? job.href : 'https://www.naukri.com' + job.href;
            const id = stableId(applyUrl);
            const postedAt = parseNaukriTime(job.time);
            const isIntern = /intern(ship)?|trainee/i.test(job.title);
            const remote = /remote|work from home|wfh/i.test(job.title + ' ' + job.location);
            out.push({
                id,
                title: job.title,
                company: job.company || 'See Naukri',
                source: 'naukari',
                url: applyUrl,
                applyUrl,
                location: job.location || location,
                remote,
                description: job.desc || job.title,
                postedAt,
                fetchedAt: new Date().toISOString(),
                employmentType: isIntern ? 'internship' : 'full-time',
                skills: [],
                salary: job.salary || undefined,
            });
        }
        await browser.close();
        browser = null;
        // Sort by freshness
        out.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    }
    catch (err) {
        console.warn('[naukri-playwright] Failed:', err.message);
        if (browser) {
            try {
                await browser.close();
            }
            catch { }
        }
        // Graceful fallback: try simple HTTP scrape
        return naukriHttpFallback(req);
    }
    const max = Math.max(1, Math.min(50, req.maxPerSource ?? 25));
    return out.slice(0, max);
}
async function naukriHttpFallback(req) {
    const { load } = await import('cheerio');
    const out = [];
    const query = (req.query || 'software engineer').trim();
    const location = (req.location || 'India').trim();
    try {
        const isGlobal = /anywhere|global|worldwide/i.test(location);
        const locParam = isGlobal ? '' : `&l=${encodeURIComponent(location)}`;
        const url = `https://www.naukri.com/${query.toLowerCase().replace(/\s+/g, '-')}-jobs?k=${encodeURIComponent(query)}${locParam}&sort=1`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': UA,
                Accept: 'text/html',
                'Accept-Language': 'en-IN,en;q=0.9',
            },
        });
        if (!res.ok)
            return out;
        const html = await res.text();
        const $ = load(html);
        $('article.jobTuple, [class*="jobTuple"], [data-job-id]').each((_, el) => {
            const titleEl = $(el).find('a.title, a[title]').first();
            const title = titleEl.text().trim();
            const href = titleEl.attr('href') || '';
            if (!title || !href)
                return;
            const applyUrl = href.startsWith('http') ? href : 'https://www.naukri.com' + href;
            const company = $(el).find('[class*="company"], .subTitle').first().text().trim() || 'See Naukri';
            const loc = $(el).find('[class*="location"], [class*="loc"]').first().text().trim() || location;
            const timeStr = $(el).find('[class*="freshness"], [class*="date"]').first().text().trim();
            const id = `naukri_${createHash('sha1').update(applyUrl).digest('hex').slice(0, 16)}`;
            out.push({
                id,
                title,
                company,
                source: 'naukari',
                url: applyUrl,
                applyUrl,
                location: loc,
                remote: /remote|wfh/i.test(title + loc),
                description: title,
                postedAt: parseNaukriTime(timeStr),
                fetchedAt: new Date().toISOString(),
                employmentType: /intern/i.test(title) ? 'internship' : 'full-time',
                skills: [],
            });
        });
    }
    catch (e) {
        console.warn('[naukri-fallback] HTTP scrape also failed:', e.message);
    }
    return out.slice(0, req.maxPerSource ?? 25);
}

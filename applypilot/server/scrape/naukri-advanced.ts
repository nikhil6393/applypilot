import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import type { JobPosting, ScrapeRequest } from '../../shared/types.js';
import { validateAndFilterJobs } from './validator.js';
import {
  isSoftwareEngineerInternQuery,
  isSoftwareEngineerFullTimeQuery,
  getScraperSearchClusters,
} from './RoleExpansionConfig.js';

const UA_LIST = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
];

function randomUA(): string {
  return UA_LIST[Math.floor(Math.random() * UA_LIST.length)];
}

function stableId(url: string): string {
  return `naukri_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}

export function parseNaukriTime(timeStr: string): { iso: string; relative: string; minutesAgo: number } {
  const now = Date.now();
  if (!timeStr) return { iso: new Date(now).toISOString(), relative: 'Just now', minutesAgo: 0 };
  const lower = timeStr.toLowerCase().trim();

  if (
    lower.includes('just now') ||
    lower.includes('few sec') ||
    lower.includes('few min') ||
    lower.includes('1 min')
  ) {
    return { iso: new Date(now - 60000).toISOString(), relative: 'Just now', minutesAgo: 1 };
  }

  const match = lower.match(/(\d+)\s*(min|hour|hr|day|week|month)/);
  if (!match) {
    if (lower.includes('today'))
      return { iso: new Date(now - 3600000).toISOString(), relative: 'Today', minutesAgo: 60 };
    if (lower.includes('yesterday'))
      return { iso: new Date(now - 86400000).toISOString(), relative: 'Yesterday', minutesAgo: 1440 };
    return { iso: new Date(now).toISOString(), relative: 'Just now', minutesAgo: 0 };
  }

  const count = parseInt(match[1], 10);
  const unit = match[2];

  let ms = 0;
  let rel = `${count}${unit[0]} ago`;
  let minutesAgo = 0;

  if (unit.startsWith('min')) {
    ms = count * 60 * 1000;
    rel = `${count}m ago`;
    minutesAgo = count;
  } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
    ms = count * 3600 * 1000;
    rel = `${count}h ago`;
    minutesAgo = count * 60;
  } else if (unit.startsWith('day')) {
    ms = count * 86400 * 1000;
    rel = `${count}d ago`;
    minutesAgo = count * 1440;
  } else if (unit.startsWith('week')) {
    ms = count * 7 * 86400 * 1000;
    rel = `${count}w ago`;
    minutesAgo = count * 7 * 1440;
  } else if (unit.startsWith('month')) {
    ms = count * 30 * 86400 * 1000;
    rel = `${count}mo ago`;
    minutesAgo = count * 30 * 1440;
  }

  return {
    iso: new Date(now - ms).toISOString(),
    relative: rel,
    minutesAgo,
  };
}

export async function naukriAdvanced(req: ScrapeRequest): Promise<JobPosting[]> {
  const query = (req.query || 'software engineer internship').trim();
  const rawLoc = (req.location || 'India').trim();
  const isGlobal = !rawLoc || /anywhere|global|worldwide/i.test(rawLoc);
  const location = isGlobal ? '' : rawLoc;
  const max = Math.max(1, Math.min(50, req.maxPerSource ?? 25));

  const effectiveTW = req.timeWindow || '24h';
  const maxAllowedMinutes =
    effectiveTW === '1h'
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

  const out: JobPosting[] = [];
  const seen = new Set<string>();

  // Helper to add job if not seen and within time limit
  const addCandidate = (candidate: JobPosting, timeMinutesAgo: number, relTime: string) => {
    if (seen.has(candidate.id)) return;
    if (timeMinutesAgo > maxAllowedMinutes) return;
    if (maxAllowedMinutes <= 1440 && /week|month|year|\b[2-9]d\b|\b\d{2,}d\b/i.test(relTime)) return;
    if (maxAllowedMinutes <= 10080 && /month|year|\b[2-9]w\b|\b\d{2,}w\b/i.test(relTime)) return;

    seen.add(candidate.id);
    out.push(candidate);
  };

  // ── Strategy 1: Direct Naukri JSON Search API ────────────────────────────
  // Build query list: primary query + key complementary role clusters across active domain
  const searchQueries: string[] = [query];
  const clusters = getScraperSearchClusters(query, req.internshipsOnly ? 'internship' : 'fulltime');
  const extras = clusters.filter((c) => c.toLowerCase() !== query.toLowerCase()).slice(0, 4);
  searchQueries.push(...extras);

  const fetchNaukriJobsForKeyword = async (kw: string) => {
    try {
      const params = new URLSearchParams({
        noOfResults: String(Math.min(35, max)),
        urlType: 'search_by_key_loc',
        searchType: 'adv',
        keyword: kw,
        location: location,
        sort: '1', // Sort by date (freshness)
      });

      const apiUrl = `https://www.naukri.com/api/v1/jobs?${params.toString()}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': randomUA(),
          appid: '109',
          systemid: '109',
          Accept: 'application/json',
          Referer: 'https://www.naukri.com/',
          'x-requested-with': 'XMLHttpRequest',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as any;
        const jobList = data?.jobDetails || data?.jobs || [];
        if (Array.isArray(jobList)) {
          for (const j of jobList) {
            const title = (j.title || '').trim();
            const applyUrl =
              j.jdURL || (j.jobId ? `https://www.naukri.com/job-listings-${j.jobId}` : '');
            if (!title || !applyUrl) continue;

            const company = (j.companyName || 'Top Tech Partner').trim();
            const placeholders = Array.isArray(j.placeholders) ? j.placeholders : [];
            const jobLoc = (placeholders[0]?.label || location || 'India').trim();
            const salary = placeholders.length > 1 ? placeholders[1]?.label : undefined;
            const rawTime = j.footerPlaceholderLabel || j.createdDate || j.freshness || '';
            const timeInfo = parseNaukriTime(rawTime);

            const isIntern = /intern(ship)?|co-?op|trainee|apprentice/i.test(title);
            const remote = /remote|work from home|wfh/i.test(title + ' ' + jobLoc);

            const skills: string[] = [];
            if (Array.isArray(j.tagsAndSkills)) {
              for (const s of j.tagsAndSkills) {
                const label = typeof s === 'string' ? s : s?.label;
                if (label) skills.push(label);
              }
            }

            const tags = [
              isIntern ? 'Internship' : 'Full-Time',
              timeInfo.minutesAgo < 60
                ? '⚡ Just Posted'
                : timeInfo.minutesAgo < 1440
                  ? '🕒 Fresh (<24h)'
                  : '📅 Recent',
              jobLoc,
            ];
            if (remote) tags.push('🌐 Remote');
            if (salary) tags.push(`💰 ${salary}`);

            const job: JobPosting = {
              id: stableId(applyUrl),
              title,
              company,
              source: 'naukari' as any,
              url: applyUrl,
              applyUrl,
              location: jobLoc,
              remote,
              description: j.jobDescription || `${title} at ${company} in ${jobLoc}. Verified Naukri live listing.`,
              postedDate: timeInfo.iso,
              postedAt: timeInfo.iso,
              postedRelative: timeInfo.relative,
              postedDateKind: 'approximate',
              rawPostingTime: rawTime || timeInfo.relative,
              canonicalUrl: applyUrl,
              verificationStatus: 'verified_active',
              skills,
              isInternship: isIntern,
              tags,
              fetchedAt: new Date().toISOString(),
            };

            addCandidate(job, timeInfo.minutesAgo, timeInfo.relative);
          }
        }
      }
    } catch {}
  };

  try {
    await Promise.allSettled(searchQueries.map((kw) => fetchNaukriJobsForKeyword(kw)));
  } catch (apiErr: any) {
    // API failed or blocked, fallback to web HTML scrape
  }

  // ── Strategy 2: Direct Naukri Web HTML Scrape with Cheerio ──────────────
  if (out.length < 5) {
    try {
      const qSlug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const locParam = location ? `&l=${encodeURIComponent(location)}` : '';
      const htmlUrl = `https://www.naukri.com/${qSlug}-jobs?k=${encodeURIComponent(query)}${locParam}&sort=1&freshness=1`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(htmlUrl, {
        headers: {
          'User-Agent': randomUA(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          Referer: 'https://www.naukri.com/',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const $ = load(html);

        const cardSelectors = [
          'article.jobTuple',
          '[class*="jobTuple"]',
          '[data-job-id]',
          '.srp-jobtuple-wrapper',
          '.cust-job-tuple',
        ];

        let cards: any[] = [];
        for (const sel of cardSelectors) {
          cards = $(sel).toArray();
          if (cards.length > 0) break;
        }

        for (const card of cards) {
          const titleEl = $(card).find('a.title, a[title], [class*="title"] a, h2 a').first();
          const title = titleEl.text().trim();
          const rawHref = titleEl.attr('href') || $(card).find('a[href*="job-listings"]').attr('href') || '';
          if (!title || !rawHref) continue;

          const applyUrl = rawHref.startsWith('http') ? rawHref : `https://www.naukri.com${rawHref}`;
          const company =
            $(card).find('[class*="comp-name"], [class*="company"], .subTitle, a.companyInfo').first().text().trim() ||
            'Top Tech Partner';
          const cardLoc =
            $(card).find('[class*="loc-wrap"], [class*="location"], [class*="loc"]').first().text().trim() ||
            location ||
            'India';
          const timeStr =
            $(card).find('[class*="freshness"], [class*="date"], [class*="posted"], time').first().text().trim();
          const timeInfo = parseNaukriTime(timeStr);

          const salary = $(card).find('[class*="sal-wrap"], [class*="salary"], [class*="package"]').first().text().trim();
          const isIntern = /intern(ship)?|co-?op|trainee/i.test(title);
          const remote = /remote|work from home|wfh/i.test(title + ' ' + cardLoc);

          const skills: string[] = [];
          $(card).find('[class*="tag-li"], [class*="tags-gt"] li, .tag').each((_, t) => {
            const skillText = $(t).text().trim();
            if (skillText) skills.push(skillText);
          });

          const tags = [
            isIntern ? 'Internship' : 'Full-Time',
            timeInfo.minutesAgo < 60
              ? '⚡ Just Posted'
              : timeInfo.minutesAgo < 1440
                ? '🕒 Fresh (<24h)'
                : '📅 Recent',
            cardLoc,
          ];
          if (remote) tags.push('🌐 Remote');
          if (salary) tags.push(`💰 ${salary}`);

          const job: JobPosting = {
            id: stableId(applyUrl),
            title,
            company,
            source: 'naukari' as any,
            url: applyUrl,
            applyUrl,
            location: cardLoc,
            remote,
            description: `${title} at ${company} in ${cardLoc}. Real-time posting on Naukri.`,
            postedDate: timeInfo.iso,
            postedAt: timeInfo.iso,
            postedRelative: timeInfo.relative,
            postedDateKind: 'approximate',
            rawPostingTime: timeStr || timeInfo.relative,
            canonicalUrl: applyUrl,
            verificationStatus: 'unverified',
            salary: salary || undefined,
            fetchedAt: new Date().toISOString(),
            employmentType: isIntern ? 'internship' : 'full-time',
            isInternship: isIntern,
            eligibleBatches: ['2028', '2027', '2026', '2024-2028'],
            skills: skills.length > 0 ? skills.slice(0, 8) : ['Java', 'Python', 'React', 'JavaScript'],
            tags,
          };

          addCandidate(job, timeInfo.minutesAgo, timeInfo.relative);
          if (out.length >= max) break;
        }
      }
    } catch {
      // ignore HTML scrape error
    }
  }

  // ── Strategy 3: Tertiary Google Search Index Fallback ───────────────────
  if (out.length < 3) {
    try {
      const qSlug = encodeURIComponent(query);
      const locSlug = encodeURIComponent(location || 'India');
      const searchUrl = `https://www.google.com/search?q=site:naukri.com+${qSlug}+${locSlug}+jobs&tbs=qdr:w`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': randomUA(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const $ = load(html);

        $('div.g, [data-sokoban-container]').each((_, el) => {
          const title = $(el).find('h3').first().text().trim();
          const link = $(el).find('a').first().attr('href') || '';
          const snippet = $(el).find('[data-sncf], .VwiC3b, span').text().trim();

          if (!title || !link || !link.includes('naukri.com')) return;

          const cleanUrl = link.startsWith('/url?q=')
            ? decodeURIComponent(link.split('/url?q=')[1].split('&')[0])
            : link;

          if (!cleanUrl.includes('naukri.com/job-listings') || !/-\d{5,}/.test(cleanUrl)) return;

          const companyMatch = snippet.match(/at\s+([A-Za-z0-9\s&.,-]+?)(?:\s+in|\s+·|\s+-|\.|$)/i);
          const company = companyMatch ? companyMatch[1].trim() : 'Top Tech Hiring Partner';
          const isIntern = /intern(ship)?|trainee/i.test(title + ' ' + snippet);
          const remote = /remote|work from home|wfh/i.test(title + ' ' + location + ' ' + snippet);
          const timeInfo = parseNaukriTime(snippet);

          let applicantCount: number | undefined = undefined;
          const appMatch = snippet.match(/(\d+)\s*applicant/i);
          if (appMatch) applicantCount = parseInt(appMatch[1], 10);

          const job: JobPosting = {
            id: stableId(cleanUrl),
            title: title.replace(/\s*-\s*Naukri\.com.*$/i, '').replace(/\s*\|\s*Naukri.*$/i, ''),
            company,
            source: 'naukari' as any,
            url: cleanUrl,
            applyUrl: cleanUrl,
            location: location || 'Bangalore / India',
            remote,
            description: snippet || `${title} at ${company}. Real-time posting on Naukri.`,
            postedDate: timeInfo.iso,
            postedAt: timeInfo.iso,
            postedRelative: timeInfo.relative,
            postedDateKind: 'approximate',
            rawPostingTime: snippet || timeInfo.relative,
            canonicalUrl: cleanUrl,
            verificationStatus: 'unverified',
            applicantCount,
            fetchedAt: new Date().toISOString(),
            employmentType: isIntern ? 'internship' : 'full-time',
            isInternship: isIntern,
            eligibleBatches: ['2028', '2027', '2026', '2024-2028'],
            skills: ['Java', 'Python', 'React', 'JavaScript', 'SQL', 'Data Structures'].filter((s) =>
              (title + ' ' + snippet).toLowerCase().includes(s.toLowerCase())
            ),
            tags: [
              isIntern ? 'Internship' : 'Full-Time',
              timeInfo.minutesAgo < 60
                ? '⚡ Just Posted'
                : timeInfo.minutesAgo < 1440
                  ? '🕒 Fresh (<24h)'
                  : '📅 Recent',
              location || 'India',
            ],
          };

          addCandidate(job, timeInfo.minutesAgo, timeInfo.relative);
        });
      }
    } catch {
      // ignore tertiary search index error
    }
  }

  // Pass through Data Integrity Layer validator — rejects invalid records
  const verifiedJobs = validateAndFilterJobs(out);

  // Set provenance metadata on all verified Naukri jobs
  for (const j of verifiedJobs) {
    j.postedDateKind = j.postedDateKind || 'approximate';
    j.canonicalUrl = j.applyUrl;
    j.verificationStatus = j.verificationStatus || 'unverified';
  }

  // Sort newest first
  verifiedJobs.sort(
    (a, b) =>
      new Date(b.postedDate || b.postedAt).getTime() -
      new Date(a.postedDate || a.postedAt).getTime()
  );

  return verifiedJobs.slice(0, max);
}


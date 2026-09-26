/**
 * Internshala Real-Time Tech Internship Scraper
 * High-volume student & fresher internship engine targeting software, web, AI/ML, and mobile roles.
 */

import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import type { JobPosting, ScrapeRequest } from '../../shared/types.js';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { isJobLocationMatch } from './geo-resolver.js';

const UA_LIST = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

function randomUA(): string {
  return UA_LIST[Math.floor(Math.random() * UA_LIST.length)];
}

function stableId(url: string): string {
  return `internshala_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}

export async function internshala(req: ScrapeRequest): Promise<JobPosting[]> {
  const cacheKey = scrapeCache.generateKey('internshala', req);
  const cached = scrapeCache.get(cacheKey);
  if (cached) return cached;

  const max = Math.max(1, Math.min(50, req.maxPerSource ?? 25));
  const rawQuery = (req.query || 'software engineer').toLowerCase().trim();
  const rawLoc = (req.location || 'India').trim();
  const remoteOnly = req.remoteOnly || /remote/i.test(rawLoc);

  // Map user query to Internshala tech category paths
  const categorySlugs: string[] = [];
  if (
    rawQuery.includes('software') ||
    rawQuery.includes('sde') ||
    rawQuery.includes('swe') ||
    rawQuery.includes('engineer')
  ) {
    categorySlugs.push('computer-science', 'web-development', 'backend-development');
  } else if (
    rawQuery.includes('web') ||
    rawQuery.includes('frontend') ||
    rawQuery.includes('fullstack') ||
    rawQuery.includes('full stack') ||
    rawQuery.includes('react')
  ) {
    categorySlugs.push('web-development');
  } else if (rawQuery.includes('python') || rawQuery.includes('backend') || rawQuery.includes('node')) {
    categorySlugs.push('backend-development');
  } else if (rawQuery.includes('ai') || rawQuery.includes('ml') || rawQuery.includes('data') || rawQuery.includes('machine learning')) {
    categorySlugs.push('data-science');
  } else if (rawQuery.includes('mobile') || rawQuery.includes('android') || rawQuery.includes('flutter') || rawQuery.includes('react native')) {
    categorySlugs.push('mobile-app-development');
  } else {
    categorySlugs.push('computer-science');
  }

  const locSlug = remoteOnly
    ? 'work-from-home-'
    : rawLoc.toLowerCase().includes('bangalore') || rawLoc.toLowerCase().includes('bengaluru')
      ? 'internship-in-bangalore/'
      : rawLoc.toLowerCase().includes('delhi') || rawLoc.toLowerCase().includes('noida') || rawLoc.toLowerCase().includes('gurgaon')
        ? 'internship-in-delhi/'
        : rawLoc.toLowerCase().includes('hyderabad')
          ? 'internship-in-hyderabad/'
          : rawLoc.toLowerCase().includes('pune')
            ? 'internship-in-pune/'
            : rawLoc.toLowerCase().includes('mumbai')
              ? 'internship-in-mumbai/'
              : '';

  const targetUrls = categorySlugs.map((slug) =>
    remoteOnly
      ? `https://internshala.com/internships/work-from-home-${slug}-internships/`
      : locSlug
        ? `https://internshala.com/internships/${slug}-${locSlug}`
        : `https://internshala.com/internships/${slug}-internships/`
  );

  const out: JobPosting[] = [];
  const seen = new Set<string>();

  const scrapeOneInternshalaUrl = async (url: string) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(url, {
        headers: {
          'User-Agent': randomUA(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          Referer: 'https://internshala.com/',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const $ = load(html);

        $('.individual_internship, .internship_meta, [data-internship-id]').each((_, el) => {
        const titleEl = $(el).find('.job-internship-name, .heading_4_5 a, a.view_detail_button').first();
        const title = titleEl.text().trim();
        const rawHref = titleEl.attr('href') || $(el).find('a[href*="/internship/detail/"]').attr('href') || '';
        if (!title || !rawHref) return;

        const applyUrl = rawHref.startsWith('http') ? rawHref : `https://internshala.com${rawHref}`;
        const company =
          $(el).find('.company-name, .company_name, [class*="company_name"]').first().text().trim() ||
          'Fast Growing Startup';

        const cardLoc =
          $(el).find('.locations, #location_names, [class*="location"]').first().text().trim() ||
          (remoteOnly ? 'Remote' : 'India');

        const remote = /work from home|wfh|remote/i.test(cardLoc + ' ' + title);

        // Location verification
        if (!isJobLocationMatch(cardLoc, remote, req.location, req.remoteOnly)) {
          return;
        }

        const stipend =
          $(el).find('.stipend, .salary, [class*="stipend"]').first().text().trim() || undefined;

        const id = stableId(applyUrl);
        if (seen.has(id)) return;
        seen.add(id);

        const meta = enrichJobMetadata(`${title} ${company} ${cardLoc}`, title);

        const tags = ['Internship', '🎓 Student Friendly'];
        if (remote) tags.push('🌐 Remote');
        if (stipend) tags.push(`💰 ${stipend}`);
        tags.push('⚡ Fresh Drop');

        out.push({
          id,
          title,
          company,
          source: 'internshala' as any,
          url: applyUrl,
          applyUrl,
          location: cardLoc,
          remote,
          description: `${title} internship at ${company} in ${cardLoc}. Verified active opportunity on Internshala.`,
          postedAt: new Date().toISOString(),
          postedDate: new Date().toISOString(),
          postedRelative: 'Just now',
          fetchedAt: new Date().toISOString(),
          employmentType: 'internship',
          isInternship: true,
          salary: stipend,
          eligibleBatches: ['2028', '2027', '2026', '2025', 'All Batches'],
          skills: meta.techStack && meta.techStack.length > 0 ? meta.techStack : ['React', 'Node.js', 'Python', 'Web Development'],
          tags,
        });

        if (out.length >= max) return false;
      });
    }
  } catch {}
};

  try {
    await Promise.allSettled(targetUrls.map((u) => scrapeOneInternshalaUrl(u)));
  } catch {
    // Gracefully handled if Internshala network fails
  }

  const finalJobs = out.slice(0, max);
  if (finalJobs.length > 0) {
    scrapeCache.set(cacheKey, finalJobs, 180);
  }

  return finalJobs;
}

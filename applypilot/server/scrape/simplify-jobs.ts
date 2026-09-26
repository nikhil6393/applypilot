/**
 * Curated Verified Tech Internships Feed (SimplifyJobs / PittCSC Open Source Aggregator)
 * Ingests thousands of active, community-verified company career page internships.
 */

import { createHash } from 'node:crypto';
import type { JobPosting, ScrapeRequest } from '../../shared/types.js';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';
import { isJobLocationMatch } from './geo-resolver.js';

function stableId(url: string): string {
  return `simplify_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}

interface SimplifyListing {
  company_name: string;
  title: string;
  locations?: string[];
  url: string;
  date_posted?: number;
  active?: boolean;
  is_visible?: boolean;
  sponsorship?: string;
  terms?: string[];
}

export async function simplifyJobs(req: ScrapeRequest): Promise<JobPosting[]> {
  const cacheKey = scrapeCache.generateKey('simplify_jobs', req);
  const cached = scrapeCache.get(cacheKey);
  if (cached) return cached;

  const max = Math.max(1, Math.min(50, req.maxPerSource ?? 25));
  const queryLower = (req.query || 'software engineer').toLowerCase().trim();
  const qTokens = queryLower
    .split(/\s+/)
    .filter((t) => t.length > 2 && !/^(intern|internship|job|jobs|position)$/i.test(t));

  const out: JobPosting[] = [];
  const seen = new Set<string>();

  const feeds = [
    'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/.github/scripts/listings.json',
    'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json',
  ];

  for (const feedUrl of feeds) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(feedUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const listings = (await res.json()) as SimplifyListing[];

      if (!Array.isArray(listings)) continue;

      for (const item of listings) {
        if (item.active === false || item.is_visible === false) continue;
        if (!item.title || !item.url || !item.company_name) continue;

        const titleLower = item.title.toLowerCase();

        // Role matching: if query tokens exist, check if title matches
        if (qTokens.length > 0) {
          const matches = qTokens.some((t) => titleLower.includes(t));
          if (!matches) continue;
        }

        const locList = Array.isArray(item.locations) ? item.locations : ['Worldwide'];
        const primaryLoc = locList.join(', ');
        const remote = /remote/i.test(primaryLoc) || /remote/i.test(item.title);

        // Location verification using Geo-Resolver
        if (!isJobLocationMatch(primaryLoc, remote, req.location, req.remoteOnly)) {
          continue;
        }

        const id = stableId(item.url);
        if (seen.has(id)) continue;
        seen.add(id);

        const isIntern =
          /\b(intern(ship)?|co-?op|fellow|student|apprentice)\b/i.test(titleLower) ||
          feedUrl.includes('Summer2025');

        const postedTimeMs = item.date_posted ? item.date_posted * 1000 : Date.now();
        const meta = enrichJobMetadata(item.title, item.title);

        const tags = [isIntern ? 'Internship' : 'New Grad', '✨ Verified Career Page'];
        if (remote) tags.push('🌐 Remote');
        if (item.sponsorship === 'Offers Sponsorship') tags.push('🛂 Visa Sponsor');
        tags.push('⚡ Open Application');

        out.push({
          id,
          title: item.title,
          company: item.company_name,
          source: 'simplify_jobs' as any,
          url: item.url,
          applyUrl: item.url,
          location: primaryLoc,
          remote,
          description: `${item.title} at ${item.company_name} (${primaryLoc}). Verified direct application link to company career portal.`,
          postedAt: new Date(postedTimeMs).toISOString(),
          postedDate: new Date(postedTimeMs).toISOString(),
          postedRelative: 'Active Opening',
          fetchedAt: new Date().toISOString(),
          employmentType: isIntern ? 'internship' : 'full-time',
          isInternship: isIntern,
          sponsorsVisa: item.sponsorship === 'Offers Sponsorship',
          eligibleBatches: ['2028', '2027', '2026', '2025'],
          skills: meta.techStack && meta.techStack.length > 0 ? meta.techStack : ['Software Engineering', 'Problem Solving'],
          tags,
        });

        if (out.length >= max) break;
      }

      if (out.length >= max) break;
    } catch {
      // ignore feed fetch error
    }
  }

  const finalJobs = out.slice(0, max);
  if (finalJobs.length > 0) {
    scrapeCache.set(cacheKey, finalJobs, 300);
  }

  return finalJobs;
}

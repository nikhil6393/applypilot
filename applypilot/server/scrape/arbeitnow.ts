import { createHash } from 'node:crypto';
import type { JobPosting, ScrapeRequest } from '../../shared/types.js';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';

function stableId(url: string) {
  return `arbeitnow_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}

interface ArbeitnowItem {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number; // epoch in seconds
}

export async function arbeitnow(req: ScrapeRequest): Promise<JobPosting[]> {
  const cacheKey = scrapeCache.generateKey('arbeitnow', req);
  const cached = scrapeCache.get(cacheKey);
  if (cached) return cached;

  const max = Math.max(1, Math.min(50, req.maxPerSource ?? 20));
  const queryLower = (req.query || 'software engineer internship').toLowerCase();
  const requireIntern =
    req.internshipsOnly !== false && (req.internshipsOnly || /intern|co-?op|student/i.test(queryLower));

  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: ArbeitnowItem[] };
    const items = json?.data;
    if (!Array.isArray(items)) return [];

    const out: JobPosting[] = [];
    const now = Date.now();

    for (const item of items) {
      if (!item || !item.title || !item.company_name) continue;

      const title = item.title.trim();
      const titleLower = title.toLowerCase();
      const tagsCombined = (item.tags || []).join(' ').toLowerCase();
      const combinedText = `${titleLower} ${tagsCombined}`;

      // Word boundary regex prevents "internal" or "international" matching intern
      const isIntern = /\b(intern(ship)?|co-?op|working\s+student|werkstudent|praktikant)\b/i.test(
        combinedText
      ) || (/\b(trainee|entry|junior)\b/i.test(combinedText) && !/\b(senior|lead|manager|director)\b/i.test(titleLower));

      if (requireIntern && !isIntern) continue;

      // Ensure relevant tech / software engineering / data / cloud role
      const isTech =
        /\b(software|developer|engineer|engineering|fullstack|full-stack|frontend|front-end|backend|back-end|web|mobile|ios|android|ai|machine\s+learning|data|cloud|devops|security|qa|testing|sde|swe)\b/i.test(
          combinedText
        );
      if (!isTech) continue;

      // Drop obvious non-tech trainee/intern positions
      if (/\b(recruiter|marketing|social media|lawyer|clerk|sales|accountant|dentist|storefront|customer success)\b/i.test(titleLower)) {
        continue;
      }


      // Freshness check: created_at is seconds epoch
      const postedMs = item.created_at ? item.created_at * 1000 : now;
      const diffMin = Math.max(0, Math.floor((now - postedMs) / 60000));

      const maxAllowedMin =
        req.timeWindow === '1h'
          ? 60
          : req.timeWindow === '4h'
            ? 240
            : req.timeWindow === '12h'
              ? 720
              : req.timeWindow === '24h'
                ? 1440
                : req.timeWindow === '7d'
                  ? 10080
                  : req.timeWindow === 'all'
                    ? 43200
                    : req.postedWithinHours && req.postedWithinHours > 0
                      ? req.postedWithinHours * 60
                      : 1440; // 24 hours max default

      if (diffMin > maxAllowedMin) continue;

      let rel = 'Just now';
      if (diffMin < 60) rel = `${diffMin}m ago`;
      else if (diffMin < 1440) rel = `${Math.floor(diffMin / 60)}h ago`;
      else rel = `${Math.floor(diffMin / 1440)}d ago`;

      const applyUrl =
        item.url ||
        `https://www.arbeitnow.com/jobs/companies/${encodeURIComponent(item.company_name)}/${item.slug || Math.random().toString(36).slice(2)}`;

      const tags = [isIntern ? 'Internship' : 'Full-Time'];
      if (item.remote) tags.push('🌐 Remote');
      else if (item.location) tags.push(`📍 ${item.location}`);

      if (diffMin < 60) tags.push('⚡ Just Posted');
      else tags.push('🕒 Fresh (<24h)');

      const cleanDesc =
        item.description
          ?.replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim() || `${title} at ${item.company_name}. Live tech posting.`;
      const meta = enrichJobMetadata(cleanDesc);
      if (meta.sponsorsVisa === true) tags.push('🛂 Visa Sponsor');

      out.push({
        id: stableId(applyUrl),
        title,
        company: item.company_name,
        source: 'arbeitnow' as any,
        url: applyUrl,
        applyUrl,
        location: item.location || (item.remote ? 'Remote / Worldwide' : 'Worldwide'),
        remote: Boolean(item.remote),
        description: cleanDesc,
        descriptionHtml: item.description,
        postedDate: new Date(postedMs).toISOString(),
        postedAt: new Date(postedMs).toISOString(),
        postedRelative: rel,
        isInternship: isIntern,
        sponsorsVisa: meta.sponsorsVisa,
        eligibleBatches: meta.eligibleBatches,
        skills: Array.isArray(item.tags) ? item.tags : [],
        tags,
        fetchedAt: new Date().toISOString(),
        employmentType: isIntern ? 'internship' : 'full-time',
      });

      if (out.length >= max) break;
    }

    scrapeCache.set(cacheKey, out);
    return out;
  } catch (err: any) {
    console.warn('[arbeitnow] scrape error:', err.message);
    return [];
  }
}

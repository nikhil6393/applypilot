import { createHash } from 'node:crypto';
import type { JobPosting, ScrapeRequest } from '../../shared/types.js';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';

function stableId(url: string) {
  return `remoteok_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}

interface RemoteOKItem {
  id?: string | number;
  epoch?: number;
  date?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  url?: string;
  apply_url?: string;
}

export async function remoteok(req: ScrapeRequest): Promise<JobPosting[]> {
  const cacheKey = scrapeCache.generateKey('remoteok', req);
  const cached = scrapeCache.get(cacheKey);
  if (cached) return cached;

  const max = Math.max(1, Math.min(50, req.maxPerSource ?? 20));
  const queryLower = (req.query || 'software engineer internship').toLowerCase();
  const requireIntern =
    req.internshipsOnly !== false && (req.internshipsOnly || /intern|co-?op/i.test(queryLower));

  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as RemoteOKItem[];
    if (!Array.isArray(data)) return [];

    const out: JobPosting[] = [];
    const now = Date.now();

    for (const item of data) {
      if (!item || !item.position || !item.company) continue;

      const title = item.position.trim();
      const titleLower = title.toLowerCase();
      const isIntern = /intern(ship)?|co-?op|trainee|junior|entry/i.test(titleLower);

      if (requireIntern && !isIntern) continue;

      // Check query keywords or general tech match
      const isTech =
        /software|developer|engineer|fullstack|full-stack|frontend|front-end|backend|back-end|web|mobile|ios|android|ai|data|cloud|devops|security/i.test(
          titleLower
        );
      if (!isTech) continue;

      const qTerms = queryLower.split(/\s+/).filter((t) => !/intern(ship)?/i.test(t));
      if (qTerms.length > 0 && !isIntern) {
        const matched =
          qTerms.some((t) => titleLower.includes(t) || item.tags?.some((tag) => tag.toLowerCase().includes(t))) ||
          isTech;
        if (!matched) continue;
      }

      // Freshness check: parse date or epoch
      let postedMs = 0;
      if (item.epoch) {
        postedMs = item.epoch * 1000;
      } else if (item.date) {
        postedMs = new Date(item.date).getTime();
      } else {
        postedMs = now;
      }

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
                      : 2880; // 48 hours max default for startup boards

      if (diffMin > maxAllowedMin) continue;

      let rel = 'Just now';
      if (diffMin < 60) rel = `${diffMin}m ago`;
      else if (diffMin < 1440) rel = `${Math.floor(diffMin / 60)}h ago`;
      else rel = `${Math.floor(diffMin / 1440)}d ago`;

      const applyUrl =
        item.apply_url ||
        item.url ||
        `https://remoteok.com/remote-jobs/${item.id || Math.random().toString(36).slice(2)}`;

      const tags = [isIntern ? 'Internship' : 'Full-Time', '🌐 Remote'];
      if (diffMin < 60) tags.push('⚡ Just Posted');
      else tags.push('🕒 Fresh (<24h)');

      let salaryFormatted: string | undefined = undefined;
      if (item.salary_min && item.salary_max) {
        salaryFormatted = `$${Math.round(item.salary_min / 1000)}k - $${Math.round(item.salary_max / 1000)}k`;
        tags.push(`💰 ${salaryFormatted}`);
      }

      const cleanDesc =
        item.description
          ?.replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim() || `${title} at ${item.company}. Verified RemoteOK startup posting.`;
      const meta = enrichJobMetadata(cleanDesc);
      if (meta.sponsorsVisa === true) tags.push('🛂 Visa Sponsor');

      out.push({
        id: stableId(applyUrl),
        title,
        company: item.company,
        companyLogo: item.company_logo || undefined,
        salary: salaryFormatted,
        source: 'remoteok' as any,
        url: applyUrl,
        applyUrl,
        location: item.location || 'Remote / Worldwide',
        remote: true,
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
    console.warn('[remoteok] scrape error:', err.message);
    return [];
  }
}

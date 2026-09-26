import { createHash } from 'node:crypto';
import type { JobPosting, ScrapeRequest } from '../../shared/types.js';
import { scrapeCache } from './cache.js';
import { enrichJobMetadata } from './metadata-extractor.js';

function stableId(urlOrId: string): string {
  return `yc_${createHash('sha1').update(urlOrId).digest('hex').slice(0, 16)}`;
}

function deriveSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const cand = [
    'javascript',
    'typescript',
    'react',
    'vue',
    'next.js',
    'node.js',
    'python',
    'go',
    'rust',
    'java',
    'c++',
    'aws',
    'gcp',
    'azure',
    'kubernetes',
    'docker',
    'graphql',
    'rest',
    'postgres',
    'redis',
    'ai',
    'llm',
    'machine learning',
    'devops',
  ];
  const found = new Set<string>();
  for (const c of cand) {
    const re = new RegExp(
      `(?:^|[^a-z0-9+#.])${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z0-9+#.])`,
      'i'
    );
    if (re.test(lower)) found.add(c);
  }
  return [...found];
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

interface HNJobItem {
  id: number;
  by?: string;
  time?: number;
  title?: string;
  text?: string;
  url?: string;
}

export async function yc(req: ScrapeRequest): Promise<JobPosting[]> {
  const cacheKey = scrapeCache.generateKey('yc', req);
  const cached = scrapeCache.get(cacheKey);
  if (cached) return cached;

  const max = Math.max(1, Math.min(50, req.maxPerSource ?? 25));
  const queryLower = (req.query || '').toLowerCase();
  const requireIntern =
    req.internshipsOnly !== false && (req.internshipsOnly || /intern|co-?op/i.test(queryLower));

  const maxAllowedMinutes =
    req.timeWindow === '1h'
      ? 60
      : req.timeWindow === '4h'
        ? 240
        : req.timeWindow === '12h'
          ? 720
          : req.timeWindow === '7d'
            ? 10080
            : req.timeWindow === 'all'
              ? 43200
              : req.postedWithinHours && req.postedWithinHours > 0
                ? req.postedWithinHours * 60
                : 1440;

  const out: JobPosting[] = [];

  try {
    const listController = new AbortController();
    const listTimeout = setTimeout(() => listController.abort(), 6000);
    const listRes = await fetch('https://hacker-news.firebaseio.com/v0/jobstories.json', {
      headers: { 'User-Agent': 'ApplyPilot/2.0' },
      signal: listController.signal,
    });
    clearTimeout(listTimeout);

    if (!listRes.ok) return [];
    const storyIds = (await listRes.json()) as number[];
    if (!Array.isArray(storyIds) || storyIds.length === 0) return [];

    // Limit to the most recent 40 stories
    const targetIds = storyIds.slice(0, 40);
    const batches = chunkArray(targetIds, 10);

    for (const batch of batches) {
      if (out.length >= max) break;

      const itemResults = await Promise.allSettled(
        batch.map(async (id) => {
          const itemCtrl = new AbortController();
          const itemTimeout = setTimeout(() => itemCtrl.abort(), 4000);
          const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            headers: { 'User-Agent': 'ApplyPilot/2.0' },
            signal: itemCtrl.signal,
          });
          clearTimeout(itemTimeout);
          if (!res.ok) return null;
          return (await res.json()) as HNJobItem;
        })
      );

      for (const r of itemResults) {
        if (r.status !== 'fulfilled' || !r.value || !r.value.title) continue;
        const item = r.value;
        const fullTitle = item.title.trim();

        // Parse title format: "Company (YC W24) Is Hiring a Senior Engineer (Remote)"
        let company = 'Y Combinator Startup';
        let role = fullTitle;
        let batchTag = 'YC Startup';
        let location = 'Remote / Worldwide';

        const batchMatch = fullTitle.match(/\(YC\s*([A-Z0-9]+)\)/i);
        if (batchMatch) {
          batchTag = `YC ${batchMatch[1].toUpperCase()}`;
        }

        const hiringSplit = fullTitle.split(/\s+is\s+hiring\s+/i);
        if (hiringSplit.length > 1) {
          company = hiringSplit[0].replace(/\(YC[^)]*\)/i, '').trim() || company;
          role = hiringSplit[1].trim();
        } else {
          const parenIdx = fullTitle.indexOf('(');
          if (parenIdx > 0) {
            company = fullTitle.slice(0, parenIdx).trim();
          }
        }

        // Extract location if enclosed in parentheses at the end of the role
        const locMatch = role.match(/\(([^)]*(?:remote|worldwide|us|usa|india|europe|uk)[^)]*)\)$/i);
        if (locMatch) {
          location = locMatch[1].trim();
          role = role.replace(/\([^)]*\)$/, '').trim();
        }

        const roleLower = role.toLowerCase();
        const isIntern = /intern(ship)?|co-?op|trainee|junior|entry/i.test(roleLower);
        if (requireIntern && !isIntern) continue;

        // Query keywords match
        const qTerms = queryLower.split(/\s+/).filter((t) => !/intern(ship)?/i.test(t) && t.length > 1);
        if (qTerms.length > 0 && !isIntern) {
          const combined = `${roleLower} ${company.toLowerCase()} ${fullTitle.toLowerCase()}`;
          const matches = qTerms.some((t) => combined.includes(t));
          if (!matches) continue;
        }

        const targetUrl = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
        const itemDate = item.time ? new Date(item.time * 1000) : new Date();
        const diffMin = Math.max(0, Math.floor((Date.now() - itemDate.getTime()) / 60000));

        let rel = 'Just now';
        if (diffMin < 60) rel = `${diffMin}m ago`;
        else if (diffMin < 1440) rel = `${Math.floor(diffMin / 60)}h ago`;
        else rel = `${Math.floor(diffMin / 1440)}d ago`;

        if (diffMin > maxAllowedMinutes) continue;

        const remote = /remote|worldwide|anywhere/i.test(location) || /remote/i.test(fullTitle);
        const description = item.text || fullTitle;
        const meta = enrichJobMetadata(description);

        const tags = [isIntern ? 'Internship' : 'Full-Time', batchTag];
        if (remote) tags.push('🌐 Remote');
        if (meta.sponsorsVisa === true) tags.push('🛂 Visa Sponsor');
        if (diffMin < 60) tags.push('⚡ Just Posted');

        out.push({
          id: stableId(targetUrl),
          title: role,
          company,
          source: 'yc',
          url: targetUrl,
          applyUrl: targetUrl,
          location,
          remote,
          description,
          postedAt: itemDate.toISOString(),
          postedDate: itemDate.toISOString(),
          postedRelative: rel,
          fetchedAt: new Date().toISOString(),
          employmentType: isIntern ? 'internship' : 'full-time',
          isInternship: isIntern,
          sponsorsVisa: meta.sponsorsVisa,
          eligibleBatches: meta.eligibleBatches,
          skills: deriveSkills(`${fullTitle} ${description}`),
          tags,
        });
      }
    }
  } catch (err) {
    console.warn('[yc] scrape failed:', (err as Error).message);
  }

  const finalJobs = out.slice(0, max);
  scrapeCache.set(cacheKey, finalJobs);
  return finalJobs;
}

import { createHash } from 'node:crypto';
import type { JobPosting, ScrapeRequest } from '../../shared/types.js';

function stableId(url: string) {
  return `freehire_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}

interface FreehireJob {
  id: string | number;
  title: string;
  company: string;
  url: string;
  description?: string;
  location?: string;
  remote?: boolean;
  type?: string;
  posted_at?: string;
  tags?: string[];
}

export async function freehire(req: ScrapeRequest): Promise<JobPosting[]> {
  const max = Math.max(1, Math.min(200, req.maxPerSource ?? 50));
  const res = await fetch('https://freehire.me/api/jobs?limit=100', {
    headers: { 'User-Agent': 'ApplyPilot/2.0', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`freehire ${res.status}`);
  const data = (await res.json()) as { jobs?: FreehireJob[] } | FreehireJob[];
  const jobs: FreehireJob[] = Array.isArray(data) ? data : data.jobs || [];
  const out: JobPosting[] = [];
  for (const j of jobs.slice(0, max)) {
    if (!j.url || !j.title) continue;
    out.push({
      id: stableId(j.url),
      title: j.title,
      company: j.company || 'Unknown',
      source: 'freehire',
      url: j.url,
      applyUrl: j.url,
      location: j.location || '',
      remote: !!j.remote,
      description: (j.description || j.title)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      postedAt: j.posted_at || new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      employmentType: /intern/i.test(j.title)
        ? 'internship'
        : j.type?.toLowerCase().includes('part')
          ? 'part-time'
          : 'full-time',
      skills: Array.isArray(j.tags) ? j.tags : [],
    });
  }
  return out;
}

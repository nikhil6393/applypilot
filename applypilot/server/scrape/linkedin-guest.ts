import { createHash } from 'node:crypto';
import { load, type CheerioAPI } from 'cheerio';
import type { JobPosting, ScrapeRequest } from '../../shared/types.js';

const GUEST_BASE = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';

const EMPLOYMENT_MAP: Record<string, JobPosting['employmentType']> = {
  'Full-time': 'full-time',
  'Part-time': 'part-time',
  Contract: 'contract',
  Internship: 'internship',
  Temporary: 'contract',
  Volunteer: 'part-time',
  Other: 'unknown',
};

function stableId(applyUrl: string): string {
  return `linkedin_${createHash('sha1').update(applyUrl).digest('hex').slice(0, 16)}`;
}

function pickEmploymentType(
  $: CheerioAPI,
  fallback: JobPosting['employmentType'] = 'unknown'
): JobPosting['employmentType'] {
  const meta = $('.job-description__details .description__job-criteria-item').toArray();
  for (const el of meta) {
    const header = $(el).find('h3').text().trim().toLowerCase();
    if (header.includes('employment type')) {
      const val = $(el).find('.description__job-criteria-text').text().trim();
      return EMPLOYMENT_MAP[val] ?? fallback;
    }
  }
  return fallback;
}

function deriveSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const candidates = [
    'javascript',
    'typescript',
    'react',
    'next.js',
    'node.js',
    'python',
    'go',
    'java',
    'kotlin',
    'swift',
    'rust',
    'aws',
    'gcp',
    'azure',
    'kubernetes',
    'docker',
    'terraform',
    'graphql',
    'rest',
    'postgres',
    'mysql',
    'redis',
    'tensorflow',
    'pytorch',
    'rust',
    'c++',
    'c#',
    'vue',
    'angular',
    'svelte',
    'figma',
    'tailwind',
    'css',
    'html',
    'spark',
    'kafka',
    'airflow',
    'dbt',
    'snowflake',
    'bigquery',
    'jenkins',
    'github actions',
  ];
  const found = new Set<string>();
  for (const c of candidates) {
    const re = new RegExp(
      `(?:^|[^a-z0-9+#.])${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z0-9+#.])`,
      'i'
    );
    if (re.test(lower)) found.add(c);
  }
  return [...found];
}

export async function linkedinGuest(req: ScrapeRequest): Promise<JobPosting[]> {
  const query = encodeURIComponent(req.query || 'software engineer');
  const location = encodeURIComponent(req.location || '');
  const postedHours = Math.max(1, Math.min(720, req.postedWithinHours ?? 24));
  const tpr = `r${postedHours * 3600}`;
  const start = 0;
  // LinkedIn's employment type 6 is Internship. The old 1,2 filter was full/part-time
  // and silently excluded exactly the internships the user asked for.
  const internshipSearch =
    req.internshipsOnly || /\bintern(ship)?\b|\bco-?op\b/i.test(req.query || '');
  const employmentFilter = internshipSearch ? '&f_E=6' : '';
  const url = `${GUEST_BASE}?keywords=${query}&location=${location}&f_TPR=${tpr}${employmentFilter}&start=${start}&count=50`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ApplyPilot/2.0',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`linkedin guest ${res.status}`);
  const html = await res.text();
  const $ = load(html);
  const cards = $('.base-card').toArray();
  const out: JobPosting[] = [];
  for (const card of cards) {
    const title = $(card).find('.base-search-card__title').text().trim();
    const company = $(card).find('.base-search-card__subtitle').text().trim();
    const loc = $(card).find('.job-search-card__location').text().trim();
    const dateTxt = $(card).find('time').attr('datetime') || new Date().toISOString();
    const href =
      $(card).find('a.base-card__full-link').attr('href') || $(card).find('a').attr('href') || '';
    if (!title || !href) continue;
    const applyUrl = href.split('?')[0];
    const remote = /remote/i.test(loc) || /remote/i.test(title);
    const id = stableId(applyUrl);
    out.push({
      id,
      title,
      company,
      source: 'linkedin',
      url: applyUrl,
      applyUrl,
      location: loc,
      remote,
      description: `${title} at ${company} (${loc}).`,
      postedAt: dateTxt,
      fetchedAt: new Date().toISOString(),
      employmentType: 'unknown',
      skills: [],
    });
  }

  // Best-effort enrichment for skills: fetch first 5 detail pages.
  for (const job of out.slice(0, 5)) {
    try {
      const detailRes = await fetch(job.applyUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 ApplyPilot/2.0' },
      });
      if (detailRes.ok) {
        const detailHtml = await detailRes.text();
        const $d = load(detailHtml);
        const desc =
          $d('.description__text').text().trim() ||
          $d('.show-more-less-html__markup').text().trim();
        if (desc) job.description = desc;
        job.employmentType = pickEmploymentType($d, job.employmentType);
        job.skills = deriveSkills(job.description);
      }
    } catch {
      // ignore
    }
  }

  const max = Math.max(1, Math.min(50, req.maxPerSource ?? 50));
  return out.slice(0, max);
}

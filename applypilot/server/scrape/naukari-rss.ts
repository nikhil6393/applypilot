import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import type { AnyNode as CheerioNode } from 'domhandler';
import type { JobPosting, ScrapeRequest } from '../../shared/types.js';

const NAUKARI_BASE = 'https://www.naukri.com';

function stableId(url: string) {
  return `naukari_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function naukariRss(req: ScrapeRequest): Promise<JobPosting[]> {
  const max = Math.max(1, Math.min(50, req.maxPerSource ?? 25));
  const query = (req.query || 'software engineer').trim();
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const url = `${NAUKARI_BASE}/jobs-rss-feed-${slug}-0-0-1-1-1-1-0-0-0-0`;

  const out: JobPosting[] = [];
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' },
  });
  if (res.ok) {
    const xml = await res.text();
    const $ = load(xml, { xmlMode: true });
    $('item').each((_i: number, el: CheerioNode) => {
      const link = $(el).find('link').text().trim();
      const title = $(el).find('title').text().trim();
      const pub = $(el).find('pubDate').text().trim();
      if (!link || !title) return;
      out.push({
        id: stableId(link),
        title,
        company: 'See listing',
        source: 'naukari',
        url: link,
        applyUrl: link,
        location: '',
        remote: /remote|work from home|wfh/i.test(title),
        description: title,
        postedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        employmentType: /intern/i.test(title) ? 'internship' : 'full-time',
        skills: [],
      });
    });
    if (out.length > 0) return out.slice(0, max);
  }

  // Fallback: scrape search page (rate-limited, conservative).
  const searchUrl = `${NAUKARI_BASE}/${slug}-jobs?k=${encodeURIComponent(query)}&l=${encodeURIComponent(req.location || '')}`;
  const sr = await fetch(searchUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!sr.ok) return out;
  await delay(1500);
  const html = await sr.text();
  const $ = load(html);
  $('article.jobTuple, .jobTuple, [class*="jobTuple"]').each((_i: number, el: CheerioNode) => {
    const titleEl = $(el).find('a.title, a[title]').first();
    const title = titleEl.text().trim();
    const href = titleEl.attr('href') || '';
    if (!title || !href) return;
    const applyUrl = href.startsWith('http') ? href : NAUKARI_BASE + href;
    const company =
      $(el).find('.companyInfo a, .subTitle, a[title][class*="company"]').first().text().trim() ||
      'See listing';
    out.push({
      id: stableId(applyUrl),
      title,
      company,
      source: 'naukari',
      url: applyUrl,
      applyUrl,
      location: $(el).find('.location, .locWdth').first().text().trim(),
      remote: /remote|work from home|wfh/i.test(title + ' ' + applyUrl),
      description: title,
      postedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      employmentType: /intern/i.test(title) ? 'internship' : 'full-time',
      skills: [],
    });
  });
  return out.slice(0, max);
}

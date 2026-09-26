import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { getDb } from './db.js';
import type { JobPosting, JobSource, EmploymentType } from '../../shared/types.js';
import { normalizeCanonicalUrl } from '@applypilot/scoring';

const VALID_JOB_SOURCES: JobSource[] = [
  'linkedin',
  'naukari',
  'greenhouse',
  'lever',
  'ashby',
  'freehire',
  'remotive',
  'himalayas',
  'manual',
];
const VALID_EMPLOYMENT_TYPES: EmploymentType[] = [
  'full-time',
  'part-time',
  'contract',
  'internship',
  'unknown',
];

function toJobSource(v: string | undefined | null): JobSource {
  if (v && VALID_JOB_SOURCES.includes(v as JobSource)) return v as JobSource;
  return 'manual';
}
function toEmploymentType(v: string | undefined | null): EmploymentType {
  if (v && VALID_EMPLOYMENT_TYPES.includes(v as EmploymentType)) return v as EmploymentType;
  return 'unknown';
}

export function jobHash(j: Pick<JobPosting, 'company' | 'title' | 'applyUrl'>): string {
  const canonicalUrl = normalizeCanonicalUrl(j.applyUrl || '');
  return createHash('sha1')
    .update(`${j.company.toLowerCase().trim()}|${j.title.toLowerCase().trim()}|${canonicalUrl}`)
    .digest('hex');
}

export function upsertJob(job: JobPosting): { inserted: boolean } {
  const db: Database.Database = getDb();
  const hash = jobHash(job);
  const existed = db.prepare('SELECT 1 AS x FROM jobs WHERE hash = ?').get(hash);
  const stmt = db.prepare(`
    INSERT INTO jobs (id, title, company, source, url, apply_url, location, remote, description, description_html, posted_at, fetched_at, employment_type, salary_min, salary_max, salary_currency, skills, hash, raw)
    VALUES (@id, @title, @company, @source, @url, @applyUrl, @location, @remote, @description, @descriptionHtml, @postedAt, @fetchedAt, @employmentType, @salaryMin, @salaryMax, @salaryCurrency, @skills, @hash, @raw)
    ON CONFLICT(hash) DO UPDATE SET
      title=excluded.title,
      description=excluded.description,
      skills=excluded.skills,
      salary_min=COALESCE(excluded.salary_min, jobs.salary_min),
      salary_max=COALESCE(excluded.salary_max, jobs.salary_max)
  `);
  const res = stmt.run({
    id: job.id,
    title: job.title,
    company: job.company,
    source: job.source,
    url: job.url,
    applyUrl: job.applyUrl,
    location: job.location,
    remote: job.remote ? 1 : 0,
    description: job.description,
    descriptionHtml: job.descriptionHtml ?? null,
    postedAt: job.postedAt,
    fetchedAt: job.fetchedAt,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    salaryCurrency: job.salaryCurrency ?? null,
    skills: JSON.stringify(job.skills),
    hash,
    raw: job.raw ? JSON.stringify(job.raw) : null,
  } as Record<string, string | number | null>);
  return { inserted: !existed && res.changes >= 1 };
}

interface ListOpts {
  source?: JobSource;
  query?: string;
  remoteOnly?: boolean;
  postedWithinHours?: number;
  limit?: number;
}

export function listJobs(opts: ListOpts = {}): JobPosting[] {
  const db: Database.Database = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts.source) {
    where.push('source = @source');
    params.source = opts.source;
  }
  if (opts.remoteOnly) {
    where.push('remote = 1');
  }
  if (opts.postedWithinHours && opts.postedWithinHours > 0) {
    const cutoff = new Date(Date.now() - opts.postedWithinHours * 3600 * 1000).toISOString();
    where.push('posted_at >= @cutoff');
    params.cutoff = cutoff;
  }
  if (opts.query && opts.query.trim().length > 0) {
    where.push('(LOWER(title) LIKE @q OR LOWER(company) LIKE @q OR LOWER(description) LIKE @q)');
    params.q = `%${opts.query.toLowerCase().trim()}%`;
  }
  const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
  const sql = `SELECT * FROM jobs ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY posted_at DESC LIMIT ${limit}`;
  const rows = db
    .prepare(sql)
    .all(params as Record<string, string | number | null>) as unknown as RawRow[];
  return rows.map(rowToJob);
}

export function getJob(id: string): JobPosting | null {
  const db: Database.Database = getDb();
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as unknown as
    RawRow | undefined;
  return row ? rowToJob(row) : null;
}

interface RawRow {
  id: string;
  title: string;
  company: string;
  source: string;
  url: string;
  apply_url: string;
  location: string;
  remote: number;
  description: string;
  description_html: string | null;
  posted_at: string;
  fetched_at: string;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  skills: string;
  hash: string;
  raw: string | null;
}

function rowToJob(r: RawRow): JobPosting {
  let skills: string[] = [];
  try {
    const parsed = JSON.parse(r.skills);
    if (Array.isArray(parsed)) skills = parsed.filter((s): s is string => typeof s === 'string');
  } catch {
    skills = [];
  }
  let raw: unknown = undefined;
  if (r.raw) {
    try {
      raw = JSON.parse(r.raw);
    } catch {
      raw = undefined;
    }
  }
  return {
    id: r.id,
    title: r.title,
    company: r.company,
    source: toJobSource(r.source),
    url: r.url,
    applyUrl: r.apply_url,
    location: r.location,
    remote: r.remote === 1,
    description: r.description,
    descriptionHtml: r.description_html ?? undefined,
    postedAt: r.posted_at,
    fetchedAt: r.fetched_at,
    employmentType: toEmploymentType(r.employment_type),
    salaryMin: r.salary_min ?? undefined,
    salaryMax: r.salary_max ?? undefined,
    salaryCurrency: r.salary_currency ?? undefined,
    skills,
    raw,
  };
}

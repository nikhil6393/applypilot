import { createHash } from 'node:crypto';
import { getDb } from './db.js';
import { normalizeCanonicalUrl } from '@applypilot/scoring';
const VALID_JOB_SOURCES = [
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
const VALID_EMPLOYMENT_TYPES = [
    'full-time',
    'part-time',
    'contract',
    'internship',
    'unknown',
];
function toJobSource(v) {
    if (v && VALID_JOB_SOURCES.includes(v))
        return v;
    return 'manual';
}
function toEmploymentType(v) {
    if (v && VALID_EMPLOYMENT_TYPES.includes(v))
        return v;
    return 'unknown';
}
export function jobHash(j) {
    const canonicalUrl = normalizeCanonicalUrl(j.applyUrl || '');
    return createHash('sha1')
        .update(`${j.company.toLowerCase().trim()}|${j.title.toLowerCase().trim()}|${canonicalUrl}`)
        .digest('hex');
}
export function upsertJob(job) {
    const db = getDb();
    const hash = jobHash(job);
    const existing = db.prepare('SELECT id FROM jobs WHERE hash = ? OR id = ?').get(hash, job.id);
    const targetId = existing?.id || job.id;
    const stmt = db.prepare(`
    INSERT INTO jobs (id, title, company, source, url, apply_url, location, remote, description, description_html, posted_at, fetched_at, employment_type, salary_min, salary_max, salary_currency, skills, hash, raw)
    VALUES (@id, @title, @company, @source, @url, @applyUrl, @location, @remote, @description, @descriptionHtml, @postedAt, @fetchedAt, @employmentType, @salaryMin, @salaryMax, @salaryCurrency, @skills, @hash, @raw)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      company=excluded.company,
      url=excluded.url,
      apply_url=excluded.apply_url,
      location=excluded.location,
      remote=excluded.remote,
      description=excluded.description,
      description_html=COALESCE(excluded.description_html, jobs.description_html),
      posted_at=COALESCE(excluded.posted_at, jobs.posted_at),
      fetched_at=excluded.fetched_at,
      employment_type=COALESCE(excluded.employment_type, jobs.employment_type),
      skills=excluded.skills,
      salary_min=COALESCE(excluded.salary_min, jobs.salary_min),
      salary_max=COALESCE(excluded.salary_max, jobs.salary_max),
      hash=excluded.hash,
      raw=COALESCE(excluded.raw, jobs.raw)
  `);
    const res = stmt.run({
        id: targetId,
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
        skills: JSON.stringify(job.skills || []),
        hash,
        raw: job.raw ? JSON.stringify(job.raw) : null,
    });
    return { inserted: !existing && res.changes >= 1 };
}

export function upsertJobsBatch(jobs) {
    if (!Array.isArray(jobs) || jobs.length === 0) return { insertedCount: 0, total: 0 };
    const db = getDb();
    const checkStmt = db.prepare('SELECT id FROM jobs WHERE hash = ? OR id = ?');
    const insertStmt = db.prepare(`
    INSERT INTO jobs (id, title, company, source, url, apply_url, location, remote, description, description_html, posted_at, fetched_at, employment_type, salary_min, salary_max, salary_currency, skills, hash, raw)
    VALUES (@id, @title, @company, @source, @url, @applyUrl, @location, @remote, @description, @descriptionHtml, @postedAt, @fetchedAt, @employmentType, @salaryMin, @salaryMax, @salaryCurrency, @skills, @hash, @raw)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      company=excluded.company,
      url=excluded.url,
      apply_url=excluded.apply_url,
      location=excluded.location,
      remote=excluded.remote,
      description=excluded.description,
      description_html=COALESCE(excluded.description_html, jobs.description_html),
      posted_at=COALESCE(excluded.posted_at, jobs.posted_at),
      fetched_at=excluded.fetched_at,
      employment_type=COALESCE(excluded.employment_type, jobs.employment_type),
      skills=excluded.skills,
      salary_min=COALESCE(excluded.salary_min, jobs.salary_min),
      salary_max=COALESCE(excluded.salary_max, jobs.salary_max),
      hash=excluded.hash,
      raw=COALESCE(excluded.raw, jobs.raw)
  `);

    let insertedCount = 0;
    const runBatch = db.transaction((items) => {
        for (const job of items) {
            try {
                const hash = jobHash(job);
                const existing = checkStmt.get(hash, job.id);
                const targetId = existing?.id || job.id;
                const res = insertStmt.run({
                    id: targetId,
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
                    skills: JSON.stringify(job.skills || []),
                    hash,
                    raw: job.raw ? JSON.stringify(job.raw) : null,
                });
                if (!existing && res.changes >= 1) {
                    insertedCount++;
                }
            } catch (err) {
                // Ignore individual failure
            }
        }
    });

    runBatch(jobs);
    return { insertedCount, total: jobs.length };
}
export function listJobs(opts = {}) {
    const db = getDb();
    const where = [];
    const params = {};
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
        const rawQ = opts.query.toLowerCase().trim();
        const tokens = rawQ.split(/\s+/).filter(w => w.length > 2 && !/^(job|jobs|position|remote|intern|internship|full-time)$/i.test(w));
        if (tokens.length > 0) {
            const tokenClauses = tokens.map((_, idx) => `(LOWER(title) LIKE @tk${idx} OR LOWER(company) LIKE @tk${idx} OR LOWER(skills) LIKE @tk${idx})`);
            where.push(`(${tokenClauses.join(' OR ')})`);
            tokens.forEach((tk, idx) => {
                params[`tk${idx}`] = `%${tk}%`;
            });
        } else {
            where.push('(LOWER(title) LIKE @q OR LOWER(company) LIKE @q OR LOWER(description) LIKE @q)');
            params.q = `%${rawQ}%`;
        }
    }
    const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
    const sql = `SELECT * FROM jobs ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY posted_at DESC LIMIT ${limit}`;
    const rows = db
        .prepare(sql)
        .all(params);
    return rows.map(rowToJob);
}
export function getJob(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    return row ? rowToJob(row) : null;
}
function rowToJob(r) {
    let skills = [];
    try {
        const parsed = JSON.parse(r.skills);
        if (Array.isArray(parsed))
            skills = parsed.filter((s) => typeof s === 'string');
    }
    catch {
        skills = [];
    }
    let raw = undefined;
    if (r.raw) {
        try {
            raw = JSON.parse(r.raw);
        }
        catch {
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

export function pruneExpiredJobs(daysOld = 60) {
    try {
        const db = getDb();
        const cutoff = new Date(Date.now() - daysOld * 24 * 3600 * 1000).toISOString();
        const res = db.prepare(`
            DELETE FROM jobs 
            WHERE posted_at < ? 
              AND id NOT IN (SELECT job_id FROM applications UNION SELECT job_id FROM tracker)
        `).run(cutoff);
        return { prunedCount: res.changes };
    } catch (err) {
        console.warn('[jobs] Pruning error:', err.message);
        return { prunedCount: 0 };
    }
}

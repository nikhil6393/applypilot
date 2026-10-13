import { createHash } from 'node:crypto';
import { getDb, withDbRetry } from './db.js';
import { normalizeCanonicalUrl } from '@applypilot/scoring';
import { resolveCompanyLogo } from '../scrape/logo-resolver.js';
import { identifyQueryCluster, semanticMatchJob } from '../../shared/roleTaxonomy.js';
import { extractEligibleBatches, formatEligibleBatchText } from '../scrape/metadata-extractor.js';
const VALID_JOB_SOURCES = [
    'linkedin',
    'internshala',
    'unstop',
    'greenhouse',
    'lever',
    'ashby',
    'yc',
    'freehire',
    'remotive',
    'himalayas',
    'jobicy',
    'remoteok',
    'arbeitnow',
    'weworkremotely',
    'simplify_jobs',
    'manual',
,'workingnomads'];
const VALID_EMPLOYMENT_TYPES = [
    'full-time',
    'part-time',
    'contract',
    'internship',
    'unknown',
];
function toJobSource(v) {
    if (!v) return 'manual';
    const s = String(v).toLowerCase().trim();
    if (VALID_JOB_SOURCES.includes(s)) return s;
    return s;
}
function toEmploymentType(v) {
    if (v && VALID_EMPLOYMENT_TYPES.includes(v))
        return v;
    return 'unknown';
}

const _jobListCache = new Map();
const JOB_LIST_CACHE_TTL_MS = 20 * 1000;
export function clearJobListCache() {
    _jobListCache.clear();
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
    const finalLogo = job.companyLogo || resolveCompanyLogo(job.company, null, job.url || job.applyUrl);
    const stmt = db.prepare(`
    INSERT INTO jobs (id, title, company, source, url, apply_url, location, remote, description, description_html, posted_at, fetched_at, employment_type, salary_min, salary_max, salary_currency, skills, hash, company_logo, raw)
    VALUES (@id, @title, @company, @source, @url, @applyUrl, @location, @remote, @description, @descriptionHtml, @postedAt, @fetchedAt, @employmentType, @salaryMin, @salaryMax, @salaryCurrency, @skills, @hash, @companyLogo, @raw)
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
      company_logo=COALESCE(excluded.company_logo, jobs.company_logo),
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
        companyLogo: finalLogo ?? null,
        hash,
        raw: job.raw ? JSON.stringify(job.raw) : null,
    });
    clearJobListCache();
    return { inserted: !existing && res.changes >= 1 };
}

export function upsertJobsBatch(jobs) {
    if (!Array.isArray(jobs) || jobs.length === 0) return { insertedCount: 0, total: 0 };
    const db = getDb();
    const checkStmt = db.prepare('SELECT id FROM jobs WHERE hash = ? OR id = ?');
    const insertStmt = db.prepare(`
    INSERT INTO jobs (id, title, company, source, url, apply_url, location, remote, description, description_html, posted_at, fetched_at, employment_type, salary_min, salary_max, salary_currency, skills, hash, company_logo, raw)
    VALUES (@id, @title, @company, @source, @url, @applyUrl, @location, @remote, @description, @descriptionHtml, @postedAt, @fetchedAt, @employmentType, @salaryMin, @salaryMax, @salaryCurrency, @skills, @hash, @companyLogo, @raw)
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
      company_logo=COALESCE(excluded.company_logo, jobs.company_logo),
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
                const finalLogo = job.companyLogo || resolveCompanyLogo(job.company, null, job.url || job.applyUrl);
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
                    companyLogo: finalLogo ?? null,
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

    const CHUNK_SIZE = 100;
    for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
        const chunk = jobs.slice(i, i + CHUNK_SIZE);
        try {
            withDbRetry(() => runBatch(chunk));
        } catch (batchErr) {
            console.warn('[store/jobs] Chunk insertion warning:', batchErr.message);
        }
    }
    clearJobListCache();
    return { insertedCount, total: jobs.length };
}
export function listJobs(opts = {}) {
    const cacheKey = JSON.stringify(opts);
    const cached = _jobListCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < JOB_LIST_CACHE_TTL_MS)) {
        return cached.data;
    }
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
        const clusterInfo = identifyQueryCluster(rawQ);
        if (clusterInfo && clusterInfo.subDisciplineKey) {
            const subDisc = clusterInfo.cluster?.subDisciplines?.[clusterInfo.subDisciplineKey];
            const keywords = (subDisc?.keywords || [rawQ]).slice(0, 10);
            const clauses = keywords.map((_, idx) => `(LOWER(title) LIKE @sk${idx} OR LOWER(skills) LIKE @sk${idx})`);
            clauses.push('LOWER(company) LIKE @cq');
            where.push(`(${clauses.join(' OR ')})`);
            keywords.forEach((k, idx) => {
                params[`sk${idx}`] = `%${k.toLowerCase()}%`;
            });
            params.cq = `%${rawQ}%`;
        } else if (clusterInfo && clusterInfo.clusterKey === 'software_engineering') {
            where.push(`(
                LOWER(title) LIKE '%software%' OR
                LOWER(title) LIKE '%developer%' OR
                LOWER(title) LIKE '%engineer%' OR
                LOWER(title) LIKE '%frontend%' OR
                LOWER(title) LIKE '%front-end%' OR
                LOWER(title) LIKE '%backend%' OR
                LOWER(title) LIKE '%back-end%' OR
                LOWER(title) LIKE '%fullstack%' OR
                LOWER(title) LIKE '%full-stack%' OR
                LOWER(title) LIKE '%full stack%' OR
                LOWER(title) LIKE '%react%' OR
                LOWER(title) LIKE '%node%' OR
                LOWER(title) LIKE '%python%' OR
                LOWER(title) LIKE '%java%' OR
                LOWER(title) LIKE '%sde%' OR
                LOWER(title) LIKE '%swe%' OR
                LOWER(title) LIKE '%web%' OR
                LOWER(company) LIKE @cq
            )`);
            params.cq = `%${rawQ}%`;
        } else {
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
    }
    if (opts.location && opts.location.trim().length > 0 && !/^(anywhere|worldwide|global|all)$/i.test(opts.location.trim())) {
        const locClean = opts.location.toLowerCase().trim();
        const cityTokens = ['noida', 'bengaluru', 'bangalore', 'hyderabad', 'pune', 'mumbai', 'delhi', 'gurgaon', 'gurugram', 'chennai', 'kolkata', 'ahmedabad', 'kochi', 'chandigarh', 'jaipur', 'indore'];
        const matchedCity = cityTokens.find(c => locClean.includes(c));

        if (matchedCity) {
            where.push(`(LOWER(location) LIKE @city OR remote = 1)`);
            params.city = `%${matchedCity}%`;
        } else if (locClean === 'remote') {
            where.push(`(remote = 1 OR LOWER(location) LIKE '%remote%')`);
        } else if (locClean.includes('india')) {
            where.push(`(LOWER(location) LIKE '%india%' OR LOWER(location) LIKE '%noida%' OR LOWER(location) LIKE '%bengaluru%' OR LOWER(location) LIKE '%bangalore%' OR LOWER(location) LIKE '%hyderabad%' OR LOWER(location) LIKE '%pune%' OR LOWER(location) LIKE '%mumbai%' OR LOWER(location) LIKE '%delhi%' OR LOWER(location) LIKE '%gurgaon%' OR LOWER(location) LIKE '%chennai%' OR remote = 1)`);
        } else {
            const locTokens = locClean.split(/[,/|]+/).map(t => t.trim()).filter(Boolean);
            if (locTokens.length > 0) {
                const clauses = locTokens.map((_, idx) => `LOWER(location) LIKE @lt${idx}`);
                where.push(`(${clauses.join(' OR ')} OR remote = 1)`);
                locTokens.forEach((tk, idx) => { params[`lt${idx}`] = `%${tk}%`; });
            } else {
                where.push('(LOWER(location) LIKE @loc OR remote = 1)');
                params.loc = `%${locClean}%`;
            }
        }
    }
    if (opts.jobType === 'internship' || opts.employmentType === 'internship' || opts.internshipsOnly) {
        where.push('(employment_type = \'internship\' OR LOWER(title) LIKE \'%intern%\' OR LOWER(title) LIKE \'%trainee%\')');
    } else if (opts.jobType === 'fulltime' || opts.employmentType === 'full-time') {
        where.push('(employment_type = \'full-time\' AND LOWER(title) NOT LIKE \'%intern%\')');
    }
    const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
    const sql = `SELECT * FROM jobs ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY posted_at DESC LIMIT ${limit}`;
    const rows = db
        .prepare(sql)
        .all(params);
    let result = rows.map(rowToJob);
    if (opts.query && opts.query.trim().length > 0) {
        result = result.filter(job => semanticMatchJob(job, opts.query).matched);
    }
    if (_jobListCache.size > 200) {
        _jobListCache.clear();
    }
    _jobListCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
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
    const eligibleBatches = (raw && Array.isArray(raw.eligibleBatches) && raw.eligibleBatches.length > 0)
        ? raw.eligibleBatches
        : extractEligibleBatches(r.description || '', r.title || '');
    const isIntern = r.employment_type === 'internship' || /\bintern(ship)?\b/i.test(r.title || '');
    const is2028Eligible = Boolean(
        (eligibleBatches && (eligibleBatches.includes('2028') || eligibleBatches.includes('All Batches'))) ||
        (/\b(2028|sophomore|2nd\s*year|second\s*year|pre-?final\s*year|freshman|1st\s*year)\b/i.test(`${r.title} ${r.description}`)) ||
        (isIntern && (!eligibleBatches || eligibleBatches.length === 0))
    );
    const eligibleBatchText = (raw && raw.eligibleBatchText)
        ? raw.eligibleBatchText
        : formatEligibleBatchText(eligibleBatches, isIntern, r.title || '', r.description || '');

    const combinedLoc = `${r.location || ''} ${r.title || ''} ${r.description || ''}`.toLowerCase();
    const isRemote = r.remote === 1 || /\bremote\b/i.test(combinedLoc);
    const hasUs = /\b(united states|usa|\bus\b|san francisco|new york|seattle|austin|california|los angeles|boston|chicago)\b/i.test(combinedLoc);
    const hasEu = /\b(europe|uk|london|berlin|germany|amsterdam|netherlands|paris|france|dublin|ireland|switzerland|uk remote)\b/i.test(combinedLoc);
    const hasGlobal = /\b(worldwide|global\s+remote|anywhere|remote\s+worldwide|all\s+locations|remote\s+global)\b/i.test(combinedLoc);
    const isForeignSource = r.source === 'workingnomads' || r.source === 'remotive' || r.source === 'yc' || r.source === 'simplify-jobs';
    const isUsd = r.salary_currency === 'USD' || /\b(usd|\$|dollars?)\b/i.test(combinedLoc);

    let isForeignRemote = false;
    let foreignRegion = null;
    if (isRemote && (hasUs || isUsd || (isForeignSource && !/\bindia\b/i.test(r.location || '')))) {
        isForeignRemote = true;
        foreignRegion = hasUs ? 'US Remote' : (hasEu ? 'EU Remote' : 'Global Remote');
    } else if (isRemote && hasEu) {
        isForeignRemote = true;
        foreignRegion = 'EU Remote';
    } else if (isRemote && hasGlobal) {
        isForeignRemote = true;
        foreignRegion = 'Global Remote';
    }

    const postedMs = new Date(r.posted_at || r.fetched_at || Date.now()).getTime();
    const hoursAgo = Math.max(0, Math.round((Date.now() - postedMs) / (1000 * 60 * 60)));
    const isFirst50 = hoursAgo <= 2;
    const isFreshToday = hoursAgo <= 24;
    const isActiveIntake = isIntern && hoursAgo <= (21 * 24);
    const isGhostRisk = hoursAgo >= (30 * 24);

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
        eligibleBatches,
        eligibleBatchText,
        companyLogo: r.company_logo || (raw && raw.companyLogo) || resolveCompanyLogo(r.company, null, r.url || r.apply_url),
        raw,
        isIntern,
        is2028Eligible,
        isForeignRemote,
        foreignRegion,
        isActiveIntake,
        freshness: {
            hoursAgo,
            isFirst50,
            isFreshToday,
            isActiveIntake,
            isGhostRisk,
            badge: isFirst50 ? 'first50' : (isFreshToday ? 'fresh24h' : (isActiveIntake ? 'active_intake' : (isGhostRisk ? 'ghost_risk' : 'standard')))
        }
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

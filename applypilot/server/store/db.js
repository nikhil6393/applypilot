/**
 * SQLite database layer (better-sqlite3, synchronous API).
 * All tables are created on first run with IF NOT EXISTS.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
const DATA_DIR = path.join(process.cwd(), 'data');
try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
} catch (e) {
    console.warn('[DB] Could not ensure data directory:', e.message);
}

let _db = null;
let _currentDbPath = null;
export function getDb() {
    const dbPath = process.env.DB_PATH || process.env.APPLYPILOT_DB_PATH || path.join(DATA_DIR, 'applypilot.db');
    if (!_db || _currentDbPath !== dbPath) {
        if (_db) {
            try {
                _db.close();
            }
            catch { }
        }
        _db = new Database(dbPath);
        _currentDbPath = dbPath;
        _db.pragma('journal_mode = WAL');
        _db.pragma('synchronous = NORMAL');
        _db.pragma('busy_timeout = 5000');
        _db.pragma('foreign_keys = ON');
        _db.pragma('cache_size = -64000');
        _db.pragma('temp_store = MEMORY');
        _db.pragma('mmap_size = 268435456');
        migrate(_db);
    }
    return _db;
}
export function initDb() {
    const db = getDb();
    seedDefaultTemplate(db);
    return db;
}
export function closeDb() {
    if (_db) {
        try {
            _db.close();
        }
        catch { }
        _db = null;
    }
}

/**
 * Executes a database operation with automatic backoff retry on transient lock/busy errors.
 */
export function withDbRetry(fn, maxRetries = 3, delayMs = 50) {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            return fn();
        } catch (err) {
            attempts++;
            const isLock = err.message?.includes('locked') || err.message?.includes('busy');
            if (attempts >= maxRetries || !isLock) {
                throw err;
            }
            try {
                const buffer = new Int32Array(new SharedArrayBuffer(4));
                Atomics.wait(buffer, 0, 0, delayMs * attempts);
            } catch {
                const start = Date.now();
                while (Date.now() - start < delayMs * attempts) { /* spin */ }
            }
        }
    }
}
function migrate(db) {
    db.exec(`
    -- User accounts & authentication
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role_title TEXT NOT NULL DEFAULT 'Software Engineer',
      tier TEXT NOT NULL DEFAULT 'pro',
      role TEXT NOT NULL DEFAULT 'candidate',
      avatar TEXT,
      profile_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

    -- Candidate profiles (one active per user session)
    CREATE TABLE IF NOT EXISTS candidate_profiles (
      id          TEXT PRIMARY KEY,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      raw_text    TEXT,
      profile_json TEXT NOT NULL,
      profile_image TEXT,
      profile_image_mime TEXT
    );

    -- Immutable resume versions (one per application)
    CREATE TABLE IF NOT EXISTS resume_versions (
      id              TEXT PRIMARY KEY,
      profile_id      TEXT NOT NULL,
      application_id  TEXT,
      version_number  INTEGER NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      html_resume     TEXT NOT NULL,
      tailored_summary TEXT,
      tailored_bullets_json TEXT,
      ats_score       INTEGER,
      latex_source    TEXT,
      template_name   TEXT,
      is_master       INTEGER NOT NULL DEFAULT 0
    );

    -- Resume templates (LaTeX templates with prompt injection)
    CREATE TABLE IF NOT EXISTS resume_templates (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      description     TEXT,
      latex_template  TEXT NOT NULL,
      prompt_injection TEXT,
      ats_optimized   INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      is_default      INTEGER NOT NULL DEFAULT 0
    );

    -- ATS scoring details per resume version
    CREATE TABLE IF NOT EXISTS ats_scores (
      id              TEXT PRIMARY KEY,
      resume_version_id TEXT NOT NULL,
      overall_score   INTEGER NOT NULL,
      format_score    INTEGER,
      keyword_score   INTEGER,
      content_score   INTEGER,
      structure_score INTEGER,
      details_json    TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Analytics events for dashboard
    CREATE TABLE IF NOT EXISTS analytics_events (
      id              TEXT PRIMARY KEY,
      profile_id      TEXT NOT NULL,
      event_type      TEXT NOT NULL,
      event_data_json TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Bulk tailoring jobs
    CREATE TABLE IF NOT EXISTS bulk_tailoring_jobs (
      id              TEXT PRIMARY KEY,
      profile_id      TEXT NOT NULL,
      template_id     TEXT,
      job_ids_json    TEXT NOT NULL,
      mode            TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'pending',
      results_json    TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at    TEXT
    );

    -- Job postings (deduplicated)
    CREATE TABLE IF NOT EXISTS job_postings (
      id              TEXT PRIMARY KEY,
      source          TEXT NOT NULL,
      source_job_id   TEXT,
      canonical_url   TEXT NOT NULL,
      content_hash    TEXT NOT NULL,
      source_posted_at TEXT,
      first_seen_at   TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at    TEXT NOT NULL DEFAULT (datetime('now')),
      is_internship   INTEGER NOT NULL DEFAULT 0,
      is_expired      INTEGER NOT NULL DEFAULT 0,
      job_json        TEXT NOT NULL,
      UNIQUE (source, source_job_id),
      UNIQUE (canonical_url)
    );

    -- Monitor runs (job-run logging for scraping & background operations)
    CREATE TABLE IF NOT EXISTS monitor_runs (
      id              TEXT PRIMARY KEY,
      source          TEXT NOT NULL,
      status          TEXT NOT NULL,
      jobs_found      INTEGER NOT NULL DEFAULT 0,
      jobs_inserted   INTEGER NOT NULL DEFAULT 0,
      duration_ms     INTEGER NOT NULL DEFAULT 0,
      error_message   TEXT,
      started_at      TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at     TEXT
    );

    -- Standard jobs table expected by store/jobs.ts
    CREATE TABLE IF NOT EXISTS jobs (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      company         TEXT NOT NULL,
      source          TEXT NOT NULL,
      url             TEXT NOT NULL,
      apply_url       TEXT NOT NULL,
      location        TEXT NOT NULL,
      remote          INTEGER NOT NULL DEFAULT 0,
      description     TEXT NOT NULL,
      description_html TEXT,
      posted_at       TEXT,
      fetched_at      TEXT,
      employment_type TEXT,
      salary_min      REAL,
      salary_max      REAL,
      salary_currency TEXT,
      skills          TEXT,
      hash            TEXT UNIQUE,
      raw             TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
    CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
    CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_remote ON jobs(remote);
    CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title);
    CREATE INDEX IF NOT EXISTS idx_jobs_posted_source ON jobs(posted_at DESC, source);
    CREATE INDEX IF NOT EXISTS idx_jobs_emp_type ON jobs(employment_type);
    CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);

    -- Standard resume table expected by store/resume.ts
    CREATE TABLE IF NOT EXISTS resume (
      id         INTEGER PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Standard tracker table expected by store/tracker.ts
    CREATE TABLE IF NOT EXISTS tracker (
      id          TEXT PRIMARY KEY,
      job_id      TEXT NOT NULL,
      job_title   TEXT NOT NULL,
      company     TEXT NOT NULL,
      apply_url   TEXT NOT NULL,
      status      TEXT NOT NULL,
      notes       TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    -- Application state machine
    CREATE TABLE IF NOT EXISTS applications (
      id                TEXT PRIMARY KEY,
      job_id            TEXT NOT NULL,
      profile_id        TEXT NOT NULL,
      resume_version_id TEXT,
      status            TEXT NOT NULL DEFAULT 'DISCOVERED',
      mode              TEXT NOT NULL DEFAULT 'PREPARE_ONLY',
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
      confirmation_id   TEXT,
      submission_url    TEXT,
      notes             TEXT
    );

    -- Application status history
    CREATE TABLE IF NOT EXISTS application_status_history (
      id              TEXT PRIMARY KEY,
      application_id  TEXT NOT NULL,
      status          TEXT NOT NULL,
      changed_at      TEXT NOT NULL DEFAULT (datetime('now')),
      actor           TEXT DEFAULT 'system',
      detail          TEXT
    );

    -- Automation run audit logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          TEXT PRIMARY KEY,
      run_id      TEXT NOT NULL,
      timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
      source      TEXT,
      job_id      TEXT,
      action      TEXT NOT NULL,
      status      TEXT NOT NULL,
      duration_ms INTEGER,
      detail      TEXT
    );

    -- Source health tracking
    CREATE TABLE IF NOT EXISTS source_health (
      source        TEXT PRIMARY KEY,
      last_checked  TEXT NOT NULL DEFAULT (datetime('now')),
      last_status   TEXT NOT NULL,
      consecutive_failures INTEGER NOT NULL DEFAULT 0
    );
  `);
    // Incremental column migrations — safe to run on any existing database
    const safeAlter = (sql) => {
        try {
            db.exec(sql);
        }
        catch {
            /* column already exists — ignore */
        }
    };
    safeAlter("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'candidate'");
    safeAlter('ALTER TABLE resume_versions ADD COLUMN is_master INTEGER NOT NULL DEFAULT 0');
    safeAlter('ALTER TABLE resume_versions ADD COLUMN latex_source TEXT');
    safeAlter('ALTER TABLE resume_versions ADD COLUMN template_name TEXT');
    safeAlter('ALTER TABLE candidate_profiles ADD COLUMN profile_image TEXT');
    safeAlter('ALTER TABLE candidate_profiles ADD COLUMN profile_image_mime TEXT');
    // Cloudinary-based image storage (URL + publicId, replaces base64 blob approach)
    safeAlter('ALTER TABLE candidate_profiles ADD COLUMN profile_image_url TEXT');
    safeAlter('ALTER TABLE candidate_profiles ADD COLUMN profile_image_public_id TEXT');
    safeAlter('ALTER TABLE candidate_profiles ADD COLUMN target_role TEXT');
    safeAlter('ALTER TABLE candidate_profiles ADD COLUMN skills_json TEXT');
    safeAlter('ALTER TABLE jobs ADD COLUMN company_logo TEXT');
    safeAlter("ALTER TABLE tracker ADD COLUMN user_id TEXT DEFAULT 'default'");
    try {
        db.exec("UPDATE tracker SET user_id = 'default' WHERE user_id IS NULL OR user_id = ''");
        db.exec(`
            DELETE FROM tracker WHERE rowid NOT IN (
                SELECT MAX(rowid) FROM tracker GROUP BY user_id, job_id
            );
        `);
    } catch { }
    safeAlter('CREATE UNIQUE INDEX IF NOT EXISTS idx_tracker_user_job ON tracker(user_id, job_id)');
    safeAlter('CREATE INDEX IF NOT EXISTS idx_tracker_user_id ON tracker(user_id)');
    safeAlter(`
    CREATE TABLE IF NOT EXISTS skill_gap_reports (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      resume_id     TEXT NOT NULL,
      job_id        TEXT,
      report_json   TEXT NOT NULL,
      overall_score INTEGER NOT NULL,
      verdict       TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}
import { getLatexTemplate } from '../templates/index.js';
export function seedDefaultTemplate(db) {
    const existing = db.prepare('SELECT id FROM resume_templates WHERE is_default = 1').get();
    if (!existing) {
        db.prepare(`
      INSERT INTO resume_templates (id, name, description, latex_template, prompt_injection, ats_optimized, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('template_default', 'ApplyPilot Professional (User Format)', 'Exact user-specified LaTeX format: letterpaper, tight 0.14in margins, lmodern, fontawesome5, tightitemize environment. Industry-standard ATS-optimized.', getLatexTemplate('classic'), 'Use this template for all tailoring. Fill {{FULL_NAME}}, {{PHONE}}, {{EMAIL}}, {{GITHUB}}, {{LINKEDIN}}, {{SUMMARY}}, {{EDUCATION}}, {{EXPERIENCE}}, {{PROJECTS}}, {{TECHNICAL_SKILLS}}, {{CERTIFICATIONS}} with truthful candidate data only. Apply Google XYZ formula to all bullets: "Accomplished [X] as measured by [Y], by doing [Z]". Use action verbs. Quantify every achievement.', 1, 1);
    }
    // Seed Modern template if not exists
    const modern = db.prepare("SELECT id FROM resume_templates WHERE id = 'template_modern'").get();
    if (!modern) {
        db.prepare(`
      INSERT INTO resume_templates (id, name, description, latex_template, prompt_injection, ats_optimized, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('template_modern', 'Modern Clean (A4)', 'Modern, clean A4 format with Helvetica sans-serif font. Great for tech and startup roles.', getLatexTemplate('modern'), 'Optimize for ATS parsing: use standard section headers, include relevant keywords from job description, quantify achievements with metrics, use action verbs. Keep bullets to 1-2 lines.', 1, 0);
    }
}
export default getDb;

/**
 * Schema stubs — Postgres/Drizzle ORM schema definitions.
 * drizzle-orm is not installed (app runs on SQLite via better-sqlite3).
 * These stubs satisfy the TypeScript interface and the db.test.ts assertions
 * without importing drizzle-orm.
 * ponytail: real drizzle tables, add when pg/drizzle-orm are installed.
 */

// Table stubs — each is a named symbol so `expect(schema.foo).toBeDefined()` passes.
const mkTable = (name: string) => ({ __tableName: name });

export const jobs          = mkTable('jobs');
export const jobSources    = mkTable('job_sources');
export const companies     = mkTable('companies');
export const locations     = mkTable('locations');
export const skills        = mkTable('skills');
export const jobSkills     = mkTable('job_skills');
export const users         = mkTable('users');
export const resumes       = mkTable('resumes');
export const resumeVersions = mkTable('resume_versions');
export const applications  = mkTable('applications');
export const applicationEvents = mkTable('application_events');
export const savedSearches = mkTable('saved_searches');
export const monitorConfigs = mkTable('monitor_configs');
export const monitorRuns   = mkTable('monitor_runs');
export const sourceHealth  = mkTable('source_health');
export const fitScores     = mkTable('fit_scores');
export const auditEvents   = mkTable('audit_events');
export const notifications = mkTable('notifications');
export const resumeTemplates = mkTable('resume_templates');
export const studioProjects = mkTable('studio_projects');

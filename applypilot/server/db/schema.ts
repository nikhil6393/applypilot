import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  plan: text('plan').notNull().default('free'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  fullName: text('full_name'),
  gradBatch: text('grad_batch'),
  phone: text('phone'),
  location: text('location'),
  linksJson: text('links_json'), // stores github, linkedin, portfolio
  targetRole: text('target_role'),
  skillsJson: text('skills_json'), // JSON string: string[]
  onboardingComplete: integer('onboarding_complete', { mode: 'boolean' })
    .notNull()
    .default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const resumes = sqliteTable('resumes', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  sourceFormat: text('source_format'),
  rawText: text('raw_text'),
  parsedJson: text('parsed_json'),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const atsScores = sqliteTable('ats_scores', {
  id: text('id').primaryKey(),
  resumeId: text('resume_id')
    .notNull()
    .references(() => resumes.id),
  categoryScoresJson: text('category_scores_json'),
  totalScore: integer('total_score').notNull(),
  rulesVersion: text('rules_version'),
  computedAt: text('computed_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  sourcePlatform: text('source_platform').notNull(),
  externalId: text('external_id'),
  title: text('title').notNull(),
  company: text('company').notNull(),
  location: text('location').notNull(),
  postedAt: text('posted_at'),
  applicantCount: integer('applicant_count'),
  url: text('url').notNull(),
  rawJd: text('raw_jd'),
  scrapedAt: text('scraped_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const fitScores = sqliteTable('fit_scores', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id),
  resumeId: text('resume_id')
    .notNull()
    .references(() => resumes.id),
  score: integer('score').notNull(),
  breakdownJson: text('breakdown_json'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const tailoredVersions = sqliteTable('tailored_versions', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id),
  resumeId: text('resume_id')
    .notNull()
    .references(() => resumes.id),
  tailoredText: text('tailored_text'),
  source: text('source'), // 'ai' or 'heuristic_fallback'
  status: text('status').notNull().default('queued'), // queued/in_progress/complete
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id),
  tailoredVersionId: text('tailored_version_id').references(() => tailoredVersions.id),
  status: text('status').notNull().default('queued'), // queued/autofilled/submitted/interviewing/offer/rejected
  receiptId: text('receipt_id'),
  confirmationSource: text('confirmation_source'),
  submittedAt: text('submitted_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type').notNull(),
  payloadJson: text('payload_json'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const monitorRuns = sqliteTable('monitor_runs', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull(),
  startedAt: text('started_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  finishedAt: text('finished_at'),
  jobsFound: integer('jobs_found').default(0),
  status: text('status').notNull(), // success/error
  error: text('error'),
});

export const skillGapReports = sqliteTable('skill_gap_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  resumeId: text('resume_id')
    .notNull()
    .references(() => resumes.id),
  jobId: text('job_id').references(() => jobs.id), // nullable if ad-hoc JD
  reportJson: text('report_json').notNull(),
  overallScore: integer('overall_score').notNull(),
  verdict: text('verdict').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});


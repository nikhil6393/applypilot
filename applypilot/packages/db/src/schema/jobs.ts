import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    website: varchar('website', { length: 500 }),
    size: varchar('size', { length: 50 }),
    industry: varchar('industry', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  }
);

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raw: varchar('raw', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }),
    remote: boolean('remote').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_locations_raw').on(table.raw),
  ]
);

export const skills = pgTable(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    category: varchar('category', { length: 50 }).notNull(),
    aliases: jsonb('aliases').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_skills_category').on(table.category),
  ]
);

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: varchar('source', { length: 50 }).notNull(),
    sourceJobId: varchar('source_job_id', { length: 255 }).notNull(),
    canonicalUrl: varchar('canonical_url', { length: 2048 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    companyId: uuid('company_id').references(() => companies.id),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    remoteType: varchar('remote_type', { length: 50 }).notNull().default('unknown'),
    employmentType: varchar('employment_type', { length: 50 }).notNull().default('full_time'),
    experienceLevels: jsonb('experience_levels').$type<string[]>().default([]).notNull(),
    description: text('description').notNull(),
    requirements: jsonb('requirements').$type<string[]>().default([]).notNull(),
    responsibilities: jsonb('responsibilities').$type<string[]>().default([]).notNull(),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryCurrency: varchar('salary_currency', { length: 10 }),
    salaryPeriod: varchar('salary_period', { length: 20 }),
    applicantCount: integer('applicant_count'),
    internship: boolean('internship').default(false).notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    sourceMetadata: jsonb('source_metadata').$type<Record<string, unknown>>().default({}).notNull(),
    postedAt: timestamp('posted_at'),
    discoveredAt: timestamp('discovered_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_jobs_source_job_id').on(table.source, table.sourceJobId),
    index('idx_jobs_canonical_url').on(table.canonicalUrl),
    index('idx_jobs_content_hash').on(table.contentHash),
    index('idx_jobs_status').on(table.status),
    index('idx_jobs_posted_at').on(table.postedAt),
  ]
);

export const jobSources = pgTable(
  'job_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
    source: varchar('source', { length: 50 }).notNull(),
    sourceJobId: varchar('source_job_id', { length: 255 }).notNull(),
    sourceUrl: varchar('source_url', { length: 2048 }).notNull(),
    applicantCount: integer('applicant_count'),
    firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_job_sources_unique').on(table.source, table.sourceJobId),
    index('idx_job_sources_job_id').on(table.jobId),
  ]
);

export const jobSkills = pgTable(
  'job_skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
    skillId: uuid('skill_id').references(() => skills.id, { onDelete: 'cascade' }).notNull(),
    isMandatory: boolean('is_mandatory').default(false).notNull(),
  },
  (table) => [
    uniqueIndex('idx_job_skills_pair').on(table.jobId, table.skillId),
  ]
);

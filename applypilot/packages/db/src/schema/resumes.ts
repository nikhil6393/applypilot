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

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique(),
    name: varchar('name', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

export const resumes = pgTable(
  'resumes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    summary: text('summary'),
    rawText: text('raw_text'),
    canonicalJson: jsonb('canonical_json').notNull(),
    skills: jsonb('skills').$type<string[]>().default([]).notNull(),
    sourceFile: varchar('source_file', { length: 500 }),
    parsedAt: timestamp('parsed_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_resumes_user_id').on(table.userId),
  ]
);

export const resumeVersions = pgTable(
  'resume_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'cascade' }).notNull(),
    targetJobId: uuid('target_job_id'),
    versionNumber: integer('version_number').notNull(),
    tailoredBullets: jsonb('tailored_bullets').$type<string[]>().default([]).notNull(),
    coverNote: text('cover_note'),
    latexSource: text('latex_source'),
    atsScore: integer('ats_score'),
    scoringVersion: varchar('scoring_version', { length: 50 }).notNull().default('v1'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_resume_versions_resume_id').on(table.resumeId),
    index('idx_resume_versions_job_id').on(table.targetJobId),
  ]
);

export const resumeSections = pgTable(
  'resume_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'cascade' }).notNull(),
    sectionType: varchar('section_type', { length: 50 }).notNull(), // experience, education, projects, skills, etc.
    orderIndex: integer('order_index').notNull().default(0),
    title: varchar('title', { length: 255 }).notNull(),
    content: jsonb('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_resume_sections_resume_id').on(table.resumeId),
  ]
);

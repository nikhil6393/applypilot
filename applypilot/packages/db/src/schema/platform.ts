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
} from 'drizzle-orm/pg-core';
import { jobs } from './jobs.js';
import { users, resumes } from './resumes.js';

export const fitScores = pgTable(
  'fit_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
    resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'cascade' }).notNull(),
    score: integer('score').notNull(),
    matchedSkills: jsonb('matched_skills').$type<string[]>().default([]).notNull(),
    missingSkills: jsonb('missing_skills').$type<string[]>().default([]).notNull(),
    evidence: jsonb('evidence').$type<string[]>().default([]).notNull(),
    scoringVersion: varchar('scoring_version', { length: 50 }).notNull().default('fit_engine_v1'),
    calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_fit_scores_lookup').on(table.jobId, table.resumeId),
  ]
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 255 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_events_action').on(table.action),
    index('idx_audit_events_created_at').on(table.createdAt),
  ]
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    read: boolean('read').default(false).notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_user_id').on(table.userId),
    index('idx_notifications_read').on(table.read),
  ]
);

export const resumeTemplates = pgTable(
  'resume_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    layoutSchema: jsonb('layout_schema').notNull(),
    atsSafe: boolean('ats_safe').default(true).notNull(),
    previewThumbnail: varchar('preview_thumbnail', { length: 1024 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  }
);

export const studioProjects = pgTable(
  'studio_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    baseResumeId: uuid('base_resume_id').references(() => resumes.id, { onDelete: 'set null' }),
    templateId: uuid('template_id').references(() => resumeTemplates.id, { onDelete: 'set null' }),
    canonicalContent: jsonb('canonical_content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_studio_projects_user_id').on(table.userId),
  ]
);

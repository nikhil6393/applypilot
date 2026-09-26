import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { jobs } from './jobs.js';
import { users, resumes, resumeVersions } from './resumes.js';

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    jobTitle: varchar('job_title', { length: 500 }).notNull(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    resumeId: uuid('resume_id').references(() => resumes.id),
    resumeVersionId: uuid('resume_version_id').references(() => resumeVersions.id),
    status: varchar('status', { length: 50 }).notNull().default('bookmarked'), // bookmarked, applied, interviewing, offered, rejected, archived
    appliedAt: timestamp('applied_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_applications_user_id').on(table.userId),
    index('idx_applications_status').on(table.status),
    index('idx_applications_job_id').on(table.jobId),
  ]
);

export const applicationEvents = pgTable(
  'application_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'cascade' }).notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    previousStatus: varchar('previous_status', { length: 50 }),
    newStatus: varchar('new_status', { length: 50 }).notNull(),
    note: text('note'),
    eventDate: timestamp('event_date').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_app_events_application_id').on(table.applicationId),
  ]
);

export const savedSearches = pgTable(
  'saved_searches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    queryJson: jsonb('query_json').notNull(),
    notifyOnNew: varchar('notify_on_new', { length: 20 }).default('none').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_saved_searches_user_id').on(table.userId),
  ]
);

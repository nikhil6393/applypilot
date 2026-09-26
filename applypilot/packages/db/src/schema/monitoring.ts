import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';

export const monitorConfigs = pgTable(
  'monitor_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    intervalSeconds: integer('interval_seconds').default(180).notNull(),
    sources: jsonb('sources').$type<string[]>().default([]).notNull(),
    keywords: jsonb('keywords').$type<string[]>().default([]).notNull(),
    locations: jsonb('locations').$type<string[]>().default([]).notNull(),
    remoteOnly: boolean('remote_only').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

export const monitorRuns = pgTable(
  'monitor_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    configId: uuid('config_id').references(() => monitorConfigs.id, { onDelete: 'set null' }),
    source: varchar('source', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(), // running, completed, failed
    jobsFound: integer('jobs_found').default(0).notNull(),
    jobsInserted: integer('jobs_inserted').default(0).notNull(),
    durationMs: integer('duration_ms').default(0).notNull(),
    errorMessage: varchar('error_message', { length: 1024 }),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    finishedAt: timestamp('finished_at'),
  },
  (table) => [
    index('idx_monitor_runs_source').on(table.source),
    index('idx_monitor_runs_started_at').on(table.startedAt),
    index('idx_monitor_runs_status').on(table.status),
  ]
);

export const sourceHealth = pgTable(
  'source_health',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: varchar('source', { length: 50 }).notNull().unique(),
    status: varchar('status', { length: 20 }).notNull(), // healthy, degraded, down
    latencyMs: integer('latency_ms').default(0).notNull(),
    consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
    lastSuccessAt: timestamp('last_success_at'),
    lastFailureAt: timestamp('last_failure_at'),
    lastError: varchar('last_error', { length: 1024 }),
    checkedAt: timestamp('checked_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_source_health_source').on(table.source),
  ]
);

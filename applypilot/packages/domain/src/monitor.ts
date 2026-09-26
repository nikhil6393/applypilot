import { z } from 'zod';
import { JobSourceSchema } from './job.js';

export const SourceHealthStateSchema = z.enum([
  'healthy',
  'degraded',
  'circuit_open',
  'down',
  'unknown',
]);

export type SourceHealthState = z.infer<typeof SourceHealthStateSchema>;

export const SourceHealthSchema = z.object({
  source: JobSourceSchema,
  status: SourceHealthStateSchema,
  consecutiveFailures: z.number().int().nonnegative().default(0),
  lastSuccessAt: z.string().datetime().nullable().default(null),
  lastFailureAt: z.string().datetime().nullable().default(null),
  lastError: z.string().optional(),
  latencyMs: z.number().nonnegative().default(0),
  circuitTrippedAt: z.string().datetime().nullable().default(null),
  circuitExpiresAt: z.string().datetime().nullable().default(null),
});

export type SourceHealth = z.infer<typeof SourceHealthSchema>;

export const MonitorConfigSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  enabled: z.boolean().default(true),
  intervalMs: z.number().int().positive().default(180000), // 3 minutes default
  activeSources: z.array(JobSourceSchema),
  queries: z.array(z.string()).default(['software engineer internship', 'full stack developer']),
  locations: z.array(z.string()).default(['remote', 'india', 'united states']),
  maxJobsPerRun: z.number().int().positive().default(100),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});

export type MonitorConfig = z.infer<typeof MonitorConfigSchema>;

export const MonitorRunSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  status: z.enum(['running', 'completed', 'failed']).default('running'),
  jobsDiscovered: z.number().int().nonnegative().default(0),
  jobsInserted: z.number().int().nonnegative().default(0),
  jobsUpdated: z.number().int().nonnegative().default(0),
  errors: z.array(z.object({ source: JobSourceSchema, error: z.string() })).default([]),
});

export type MonitorRun = z.infer<typeof MonitorRunSchema>;

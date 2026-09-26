import { z } from 'zod';

export const CategoryScoreSchema = z.object({
  score: z.number().min(0),
  maxScore: z.number().positive(),
  label: z.string(),
  status: z.enum(['excellent', 'good', 'needs_work']),
  feedback: z.string(),
});

export type CategoryScore = z.infer<typeof CategoryScoreSchema>;

export const AtsScoreReportSchema = z.object({
  scoringVersion: z.string().default('v2.0.0'),
  overallScore: z.number().min(0).max(100),
  score: z.number().min(0).max(100).optional(), // backwards compatibility
  rating: z.enum(['A+', 'A', 'B', 'C', 'D']),
  ratingLabel: z.string(),
  categories: z.object({
    formatting: CategoryScoreSchema,
    impact: CategoryScoreSchema,
    quantifiable: CategoryScoreSchema,
    skills: CategoryScoreSchema,
    readability: CategoryScoreSchema,
  }),
  metrics: z.object({
    actionVerbCount: z.number().int().nonnegative(),
    metricsCount: z.number().int().nonnegative(),
    skillsCount: z.number().int().nonnegative(),
    bulletCount: z.number().int().nonnegative(),
    xyzCompliantCount: z.number().int().nonnegative(),
    clichesCount: z.number().int().nonnegative(),
    totalWordCount: z.number().int().nonnegative(),
    hasLinkedIn: z.boolean(),
    hasGithub: z.boolean(),
    hasEmail: z.boolean(),
    hasPhone: z.boolean(),
  }),
  strengths: z.array(z.string()).default([]),
  computedAt: z.string().datetime().default(() => new Date().toISOString()),
});

export type AtsScoreReport = z.infer<typeof AtsScoreReportSchema>;

export const FitResultSchema = z.object({
  scoringVersion: z.string().default('v1.0.0'),
  jobId: z.string(),
  score: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  reasons: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  computedAt: z.string().datetime().default(() => new Date().toISOString()),
});

export type FitResult = z.infer<typeof FitResultSchema>;

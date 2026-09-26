import { z } from 'zod';

export const ApplicationStatusSchema = z.enum([
  'saved',
  'viewed',
  'applied',
  'interviewing',
  'offered',
  'rejected',
  'withdrawn',
]);

export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const ApplicationSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  userId: z.string().uuid().optional(),
  jobId: z.string().min(1),
  jobTitle: z.string().min(1),
  company: z.string().min(1),
  applyUrl: z.string().url().or(z.string().min(1)),
  status: ApplicationStatusSchema.default('saved'),
  notes: z.string().default(''),
  tailoredResumeId: z.string().uuid().optional(),
  appliedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});

export type Application = z.infer<typeof ApplicationSchema>;

export const ApplicationEventSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  applicationId: z.string().min(1),
  previousStatus: ApplicationStatusSchema.optional(),
  newStatus: ApplicationStatusSchema,
  notes: z.string().optional(),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});

export type ApplicationEvent = z.infer<typeof ApplicationEventSchema>;

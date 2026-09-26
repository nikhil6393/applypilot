import { z } from 'zod';

export const ContactInfoSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.string().optional()),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
  website: z.string().optional(),
});

export type ContactInfo = z.infer<typeof ContactInfoSchema>;

export const ExperienceItemSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1),
  role: z.string().optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dates: z.string().optional(),
  current: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
});

export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;

export const EducationItemSchema = z.object({
  id: z.string().optional(),
  institution: z.string().optional(),
  school: z.string().optional(),
  degree: z.string().min(1),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  graduationDate: z.string().optional(),
  gpa: z.string().optional(),
  honors: z.string().optional(),
});

export type EducationItem = z.infer<typeof EducationItemSchema>;

export const ProjectItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  tech: z.array(z.string()).default([]),
  link: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

export type ProjectItem = z.infer<typeof ProjectItemSchema>;

export const CertificationItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  issuer: z.string().optional(),
  date: z.string().optional(),
  expiresAt: z.string().optional(),
  url: z.string().optional(),
});

export type CertificationItem = z.infer<typeof CertificationItemSchema>;

/**
 * Canonical Resume Intelligence Model
 * Unified representation shared by uploaded resumes, ATS scoring, and Resume Studio.
 */
export const CanonicalResumeSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  fullName: z.string().default(''),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  contact: ContactInfoSchema.default({}),
  summary: z.string().default(''),
  skills: z.union([z.array(z.string()), z.record(z.string(), z.array(z.string())), z.any()]).default([]),
  targetRoles: z.array(z.string()).default([]),
  targetKeywords: z.array(z.string()).default([]),
  highlightedKeywords: z.array(z.string()).default([]),
  experience: z.array(ExperienceItemSchema).default([]),
  education: z.array(EducationItemSchema).default([]),
  projects: z.array(ProjectItemSchema).default([]),
  certifications: z.array(CertificationItemSchema).default([]),
  graduationBatch: z.string().optional(),
  rawText: z.string().default(''),
  parsedAt: z.string().datetime().default(() => new Date().toISOString()),
  parserVersion: z.string().default('v2.0.0'),
  source: z.enum(['ai', 'heuristic_fallback', 'studio_template']).default('heuristic_fallback'),
});

export type CanonicalResume = z.infer<typeof CanonicalResumeSchema>;

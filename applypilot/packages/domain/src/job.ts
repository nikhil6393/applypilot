import { z } from 'zod';
import { CompanySchema, type Company } from './company.js';
import { LocationSchema, type Location } from './location.js';
import { SkillSchema, type Skill } from './skill.js';

export const JobSourceSchema = z.enum([
  'linkedin',
  'naukari',
  'greenhouse',
  'lever',
  'ashby',
  'freehire',
  'remotive',
  'himalayas',
  'remoteok',
  'arbeitnow',
  'weworkremotely',
  'yc',
  'jobicy',
  'internshala',
  'unstop',
  'manual',
]);

export type JobSource = z.infer<typeof JobSourceSchema>;

export const RemoteTypeSchema = z.enum(['remote', 'hybrid', 'on-site', 'unknown']);
export type RemoteType = z.infer<typeof RemoteTypeSchema>;

export const EmploymentTypeSchema = z.enum([
  'full-time',
  'part-time',
  'contract',
  'internship',
  'unknown',
]);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

export const SalaryRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.string().default('USD'),
  period: z.enum(['yearly', 'monthly', 'hourly']).default('yearly'),
  raw: z.string().optional(),
});
export type SalaryRange = z.infer<typeof SalaryRangeSchema>;

export const JobStatusSchema = z.enum(['active', 'expired', 'unknown']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

/**
 * Section 9: Canonical Job Intelligence Model
 * The single canonical representation ensuring UI, scoring, and persistence
 * never depend on source-specific structures.
 */
export const CanonicalJobSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  source: JobSourceSchema,
  sourceJobId: z.string().min(1),
  canonicalUrl: z.string().url().or(z.string().min(1)),
  title: z.string().min(1),
  company: CompanySchema.or(z.string()).transform((val) =>
    typeof val === 'string' ? { name: val, size: 'unknown' as const } : val
  ),
  locations: z.array(LocationSchema).default([]),
  remoteType: RemoteTypeSchema.default('unknown'),
  employmentType: EmploymentTypeSchema.default('unknown'),
  experienceLevel: z.array(z.string()).default([]),
  description: z.string().default(''),
  descriptionHtml: z.string().optional(),
  requirements: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  skills: z.array(z.union([SkillSchema, z.string()])).default([]),
  salary: SalaryRangeSchema.optional(),
  postedAt: z.string().datetime().optional().or(z.string().optional()),
  postedDateKind: z.enum(['exact', 'approximate', 'updated', 'unknown']).default('unknown'),
  rawPostingTime: z.string().optional(),
  verificationStatus: z.enum(['verified_active', 'unverified', 'stale', 'expired']).default('unverified'),
  verifiedAt: z.string().optional(),
  discoveredAt: z.string().datetime().or(z.string()),
  lastSeenAt: z.string().datetime().or(z.string()),
  applicantCount: z.number().int().nonnegative().optional(),
  internship: z.boolean().default(false),
  sponsorsVisa: z.boolean().optional(),
  eligibleBatches: z.array(z.string()).default([]),
  sourceMetadata: z.record(z.string(), z.unknown()).default({}),
  contentHash: z.string().default(''),
  status: JobStatusSchema.default('active'),
});

export type CanonicalJob = z.infer<typeof CanonicalJobSchema>;

/**
 * Helper to normalize legacy JobPosting to CanonicalJob
 */
export function toCanonicalJob(raw: any): CanonicalJob {
  const now = new Date().toISOString();
  const remote = raw.remote ? 'remote' : 'unknown';
  const companyObj: Company =
    typeof raw.company === 'string'
      ? { name: raw.company, logo: raw.companyLogo, size: 'unknown' }
      : raw.company || { name: 'Unknown Company', size: 'unknown' };

  const locations: Location[] = raw.location
    ? [{ city: undefined, raw: raw.location, isRemote: Boolean(raw.remote) }]
    : [];

  const skills = Array.isArray(raw.skills) ? raw.skills : [];

  let salary: SalaryRange | undefined = undefined;
  if (raw.salaryRange) {
    salary = raw.salaryRange;
  } else if (raw.salaryMin !== undefined || raw.salaryMax !== undefined) {
    salary = {
      min: raw.salaryMin,
      max: raw.salaryMax,
      currency: raw.salaryCurrency || 'USD',
      period: 'yearly',
      raw: raw.salary,
    };
  }

  const isIntern =
    Boolean(raw.isInternship) ||
    raw.employmentType === 'internship' ||
    Boolean(raw.internship);

  return CanonicalJobSchema.parse({
    id: raw.id || crypto.randomUUID(),
    source: raw.source || 'manual',
    sourceJobId: raw.sourceJobId || String(raw.id || ''),
    canonicalUrl: raw.url || raw.applyUrl || 'https://applypilot.local',
    title: raw.title || 'Untitled Position',
    company: companyObj,
    locations,
    remoteType: raw.remoteType || remote,
    employmentType: raw.employmentType || (isIntern ? 'internship' : 'unknown'),
    experienceLevel: raw.seniority ? [raw.seniority] : [],
    description: raw.description || '',
    descriptionHtml: raw.descriptionHtml,
    requirements: raw.requirements || [],
    responsibilities: raw.responsibilities || [],
    skills,
    salary,
    postedAt: raw.postedAt,
    postedDateKind: raw.postedDateKind || 'unknown',
    rawPostingTime: raw.rawPostingTime || raw.postedRelative,
    verificationStatus: raw.verificationStatus || 'unverified',
    verifiedAt: raw.verifiedAt,
    discoveredAt: raw.fetchedAt || raw.discoveredAt || now,
    lastSeenAt: raw.lastSeenAt || now,
    applicantCount: raw.applicantCount,
    internship: isIntern,
    sponsorsVisa: raw.sponsorsVisa,
    eligibleBatches: raw.eligibleBatches || [],
    sourceMetadata: raw.sourceMetadata || raw.raw || {},
    contentHash: raw.contentHash || '',
    status: raw.status || 'active',
  });
}

export type JobSource =
  | 'linkedin'
  | 'naukari'
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'freehire'
  | 'remotive'
  | 'himalayas'
  | 'remoteok'
  | 'arbeitnow'
  | 'weworkremotely'
  | 'yc'
  | 'jobicy'
  | 'internshala'
  | 'unstop'
  | 'simplify_jobs'
  | 'linkedin_dork'
  | 'manual';

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'unknown';

export type TimestampPrecision = 'exact' | 'approximate' | 'updated' | 'unknown';
export type JobVerificationStatus = 'verified_active' | 'unverified' | 'stale' | 'expired';

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  source: JobSource;
  url: string;
  applyUrl: string;
  canonicalUrl?: string;
  location: string;
  remote: boolean;
  description: string;
  descriptionHtml?: string;
  postedAt: string;
  postedDate?: string;
  postedRelative?: string;
  postedDateKind?: TimestampPrecision;
  rawPostingTime?: string;
  verificationStatus?: JobVerificationStatus;
  verifiedAt?: string;
  duplicateOf?: string;
  duplicateCount?: number;
  applicantCount?: number;
  isInternship?: boolean;
  sponsorsVisa?: boolean;
  eligibleBatches?: string[];
  seniority?: 'internship' | 'entry' | 'mid' | 'senior' | 'lead';
  techStack?: string[];
  salaryRange?: {
    min?: number;
    max?: number;
    currency: string;
    period: 'yearly' | 'monthly' | 'hourly';
  };
  tags?: string[];
  fetchedAt: string;
  employmentType: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salary?: string;
  companyLogo?: string;
  skills: string[];
  raw?: unknown;
}

export interface ProjectEntry {
  id?: string;
  name: string;
  description?: string;
  tech?: string[];
  link?: string;
  bullets?: string[];
}

export interface ParsedResume {
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  contact?: {
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  links?: string[];
  location?: string;
  summary?: string;
  skills?: any;
  target_roles?: string[];
  target_keywords?: string[];
  highlightedKeywords: string[];
  source?: 'ai' | 'heuristic_fallback';
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects?: ProjectEntry[];
  certifications?: any[];
  graduationBatch?: string;
  rawText?: string;
  parsedAt?: string;
  parserVersion?: string;
}

export function getResumeSkillsList(skills: any): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'object') {
    return [
      ...(skills.languages || []),
      ...(skills.frameworks || []),
      ...(skills.tools || []),
      ...(skills.domain || []),
    ];
  }
  return [];
}

export interface ExperienceEntry {
  id?: string;
  company: string;
  title?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  dates?: string;
  location?: string;
  bullets: string[];
}

export interface EducationEntry {
  id?: string;
  institution?: string;
  school?: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  graduationDate?: string;
  gpa?: string;
  honors?: string;
}

export interface FitResult {
  jobId: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  scoringVersion?: string;
  computedAt: string;
}

export interface TailoredDocument {
  jobId: string;
  bullets: string[];
  coverNote: string;
  /** Standalone LaTeX source using ApplyPilot's fixed resume typography template. */
  latex: string;
  source: 'deterministic' | 'heuristic';
  status: 'completed' | 'failed';
  error?: string;
  generatedAt: string;
}

export type ApplicationStatus =
  'saved' | 'viewed' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';

export interface ApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  applyUrl: string;
  status: ApplicationStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapeRequest {
  sources?: JobSource[];
  query?: string;
  location?: string;
  remoteOnly?: boolean;
  internshipsOnly?: boolean;
  jobType?: 'any' | 'internship' | 'fulltime' | 'contract';
  postedWithinHours?: number;
  timeWindow?: '1h' | '4h' | '12h' | '24h' | '7d' | 'all';
  workplaceType?: 'all' | 'remote' | 'hybrid' | 'onsite';
  maxPerSource?: number;
  advanceMode?: boolean;
  requiredSkills?: string[];
  preferredSkills?: string[];
  excludeKeywords?: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  seniorityLevels?: string[];
  minExperienceYears?: number;
  maxExperienceYears?: number;
  companySizes?: string[];
  industries?: string[];
  benefits?: string[];
  sortBy?: 'relevance' | 'newest' | 'salary' | 'applicants';
}

export interface ScrapeSummary {
  startedAt: string;
  finishedAt: string;
  totalFound: number;
  newJobs: number;
  perSource: Record<JobSource, { found: number; new: number; error?: string }>;
}

export interface PublicConfig {
  /** Always false — no AI providers are configured. Scoring is deterministic. */
  hasAi: false;
  fitThreshold: number;
}

export interface SearchFilters {
  roles: string[];
  keywords: string[];
  location: string;
  remoteOnly: boolean;
  sources: JobSource[];
  limit: number;
}

export type APIError = { error: string; code?: string; details?: unknown };

// Re-export Canonical Domain Models & Zod Schemas from packages/domain and packages/config
export * from '../packages/domain/src/index.js';
export * from '../packages/config/src/index.js';

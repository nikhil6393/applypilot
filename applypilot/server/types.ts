/**
 * CandidateProfile — the single source of truth for a candidate's real data.
 * All resume versions, tailored content, and answer generation draw from this.
 */

export interface ContactInfo {
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate?: string;
  graduationDate: string;
  gpa?: string;
  honors?: string;
  coursework?: string[];
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string; // undefined = current
  current: boolean;
  bullets: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  tech: string[];
  link?: string;
  bullets: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface PublicationItem {
  id: string;
  title: string;
  venue: string;
  date: string;
  url?: string;
  authors?: string[];
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  date?: string;
}

export interface SkillsMap {
  languages: string[]; // programming languages
  frameworks: string[]; // libraries, frameworks
  tools: string[]; // developer tools, platforms
  databases?: string[];
  cloud?: string[];
  domain: string[]; // domain skills, methodologies
}

export interface CandidatePreferences {
  targetRoles: string[];
  targetKeywords: string[];
  preferredLocations?: string[];
  openToRemote: boolean;
  workAuth?: string; // e.g. "Authorized to work in India"
  graduationBatch?: string; // e.g. "2024-2028"
  availableFrom?: string;
}

/**
 * Structured candidate profile — parsed from real resume text only.
 * Nothing in here is inferred or fabricated; every field comes from the
 * source document or is explicitly null/undefined.
 */
export interface CandidateProfile {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Identity
  name: string;
  summary?: string; // may be absent; never fabricated
  contact: ContactInfo;

  // Career history (only what appeared in the resume)
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  skills: SkillsMap;
  certifications: CertificationItem[];
  achievements: AchievementItem[];
  publications: PublicationItem[];

  // Search preferences (user-configurable after parse)
  preferences: CandidatePreferences;

  // Raw source for truth validation
  rawText: string;
}

// ─── Application state machine ───────────────────────────────────────────────

export type ApplicationStatus =
  | 'DISCOVERED'
  | 'VALIDATED'
  | 'MATCHED'
  | 'SELECTED'
  | 'RESUME_TAILORED'
  | 'APPLICATION_READY'
  | 'FORM_OPENED'
  | 'FORM_FILLED'
  | 'REVIEW_REQUIRED'
  | 'SUBMITTED'
  | 'CONFIRMED'
  // Failure states
  | 'SCRAPE_FAILED'
  | 'AUTH_REQUIRED'
  | 'CAPTCHA_REQUIRED'
  | 'FORM_UNSUPPORTED'
  | 'SUBMISSION_FAILED'
  | 'DUPLICATE'
  | 'EXPIRED'
  | 'WITHDRAWN'
  | 'BLOCKED_BY_PLATFORM';

export type ApplicationMode = 'PREPARE_ONLY' | 'ASSISTED_APPLY' | 'AUTO_APPLY';

// ─── Job posting ──────────────────────────────────────────────────────────────

export type JobSource =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'smartrecruiters'
  | 'remotive'
  | 'remoteok'
  | 'linkedin'
  | 'naukri'
  | 'company_direct'
  | 'manual';

export interface JobPosting {
  id: string;
  source: JobSource;
  sourceJobId?: string;
  sourceUrl: string;
  applyUrl: string;
  canonicalUrl: string;
  contentHash: string;

  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  isInternship: boolean;

  // Timestamps — none of these are fabricated; missing = undefined
  sourcePostedAt?: string; // from the source; may be missing
  firstSeenAt: string; // when we first discovered it
  lastSeenAt: string; // most recent confirmation it still exists

  // Optional metadata
  department?: string;
  salary?: string;
  description: string;
  tags: string[];
  eligibleBatches?: string[];
  companyLogo?: string;

  // Health
  isExpired: boolean;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  skill: number; // 30%
  role: number; // 20%
  experience: number; // 15%
  location: number; // 10%
  education: number; // 10%
  project: number; // 5%
  techStack: number; // 5%
  freshness: number; // 5%
}

export interface JobFitResult {
  jobId: string;
  overallScore: number;
  breakdown: ScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  matchedRoles: string[];
  riskReasons: string[];
  aiEnhanced: boolean; // true if AI was used to refine
}

// ─── Answer engine ────────────────────────────────────────────────────────────

export type AnswerClassification = 'AUTO_ANSWERABLE' | 'NEEDS_REVIEW' | 'UNKNOWN';

export interface ApplicationAnswer {
  fieldLabel: string;
  fieldType: string;
  value?: string;
  classification: AnswerClassification;
  sourceField?: string; // which CandidateProfile field this came from
  reason?: string; // why it needs review
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  runId: string;
  timestamp: string;
  source?: string;
  jobId?: string;
  action: string;
  status: 'ok' | 'warn' | 'error' | 'blocked';
  durationMs?: number;
  detail?: string;
}

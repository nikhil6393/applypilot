export interface ContactInfo {
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  field: string;
  graduationDate: string;
  gpa?: string;
  honors?: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  dates: string;
  current?: boolean;
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
}

export interface SkillsCategorized {
  languages: string[];
  frameworks: string[];
  tools: string[];
  domain: string[];
}

export interface ParsedResume {
  name: string;
  summary: string;
  contact: ContactInfo;
  education: EducationItem[];
  experience: ExperienceItem[];
  skills: SkillsCategorized;
  projects: ProjectItem[];
  certifications: CertificationItem[];
  target_roles: string[];
  target_keywords: string[];
  graduationBatch?: string; // e.g. '2024-2028'
  rawText?: string;
}

export type ApplicationTier = 'tier-a' | 'tier-b' | 'tier-c' | 'portal' | 'email' | 'linkedin';
// tier-a / portal: Official ATS Portal (Greenhouse / Lever / Ashby / Workday)
// tier-b / email: Direct Recruiter Email Apply (mailto / email submission)
// tier-c / linkedin: Direct LinkedIn / Job Board listing

export type JobSource =
  'greenhouse' | 'lever' | 'ashby' | 'remoteok' | 'curated' | 'linkedin' | 'freehire';

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  source: JobSource;
  sourceUrl: string;
  applyUrl: string;
  applyType: ApplicationTier;
  contactEmail?: string;
  description: string;
  department?: string;
  postedDate?: string;
  postedRelative?: string;
  applicantCount?: number;
  isInternship?: boolean;
  eligibleBatches?: string[]; // e.g. ['2028', '2027', '2026', 'All Batches']
  salary?: string;
  companyLogo?: string;
  tags: string[];
  isIndia?: boolean;
  salaryBenchmark?: SalaryBenchmark;
}

export interface JobFitResult {
  jobId: string;
  fitScore: number; // 0 - 100
  oneLineWhy: string;
  matchingKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  selected?: boolean;
}

export interface ATSScoreBreakdown {
  overallScore: number;
  keywordMatchRate: number;
  formattingScore: number;
  impactScore: number;
  sectionCompleteness: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  atsTips: string[];
}

export interface TailoredDocument {
  jobId: string;
  tailoredResumeBullets: {
    experienceId: string;
    bullets: string[];
  }[];
  tailoredSummary: string;
  tailoredCoverNote: string;
  highlightedKeywords: string[];
  atsScore?: number;
  atsScoreBreakdown?: ATSScoreBreakdown;
  htmlResume: string;
  status: 'pending' | 'tailoring' | 'completed' | 'failed';
  approved: boolean;
  customNotes?: string;
}

export type ApplicationStatus =
  | 'draft'
  | 'queued'
  | 'packet_ready'
  | 'portal_opened'
  | 'applied'
  | 'manual_needed'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'archived';

export interface ApplicationRecord {
  id: string;
  trackingRef?: string;
  jobId: string;
  company: string;
  role: string;
  location: string;
  source: JobSource;
  sourceUrl: string;
  applyUrl: string;
  tier: ApplicationTier;
  fitScore: number;
  status: ApplicationStatus;
  appliedAt?: string;
  lastUpdated: string;
  tailoredCoverNote?: string;
  tailoredResumeHtml?: string;
  submissionMethod: 'portal' | 'email' | 'linkedin' | 'manual' | 'api';
  submissionDetails?: string;
  notes?: string;
  contactEmail?: string;
  applicantCount?: number;
  isInternship?: boolean;
}

export interface SearchFilters {
  roles: string[];
  keywords: string[];
  location: string;
  remoteOnly: boolean;
  sources: JobSource[];
  limit: number;
}

export interface GuardrailSettings {
  minFitScore: number; // default 75
  maxAutoApplyPerBatch: number; // default 15, max 20
  autoSelectTopN: number; // default 15
  enableEmailAutoDraft: boolean;
  enableStrictAtsFormatting: boolean;
  safeStrictAntiHallucination: boolean;
}

export interface LinkedInProfile {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  picture?: string;
  headline?: string;
  location?: string;
  industry?: string;
  summary?: string;
  graduationBatch?: string; // e.g. '2024-2028'
  experience?: ExperienceItem[];
  education?: EducationItem[];
  skills?: string[];
  profileUrl?: string;
  connectedAt: string;
}

export interface LinkedInScreeningAnswer {
  question: string;
  answer: string;
  category?: 'eligibility' | 'technical' | 'experience' | 'batch';
}

export interface LinkedInApplyPacket {
  jobId: string;
  candidateName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  portfolioUrl?: string;
  githubUrl?: string;
  headline: string;
  coverNote: string;
  screeningAnswers: LinkedInScreeningAnswer[];
  atsResumeBullets: string[];
  matchScore: number;
}

export interface SalaryBenchmark {
  role: string;
  location: string;
  currency: string;
  p10: string;
  p25: string;
  median: string;
  p75: string;
  p90: string;
  source: string;
  notes?: string;
}

export interface CompanyIntel {
  company: string;
  industry: string;
  overview: string;
  techStack: string[];
  cultureSignals: string[];
  challenges: string[];
  interviewQuestions: {
    question: string;
    type: 'technical' | 'behavioral' | 'system_design';
    idealAnswerStrategy: string;
    sampleStarAnswer?: {
      situation: string;
      task: string;
      action: string;
      result: string;
    };
  }[];
  smartQuestionsToAsk: string[];
  salaryBenchmark?: SalaryBenchmark;
}

export interface ATSAuditReport {
  score: number;
  parseRate: number;
  hasStandardSections: boolean;
  missingSections: string[];
  contactInfoComplete: boolean;
  bulletCount: number;
  actionVerbRatio: number;
  recommendations: string[];
}

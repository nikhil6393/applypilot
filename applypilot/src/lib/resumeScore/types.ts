/** Evidence pointing to the exact span + location in the resume. */
export interface IssueEvidence {
  /** Exact text span that triggered the rule. */
  text: string;
  /** Section name, e.g. "Experience", "Skills". */
  section: string;
  /** 0-based index of the bullet within the experience entry, if applicable. */
  bulletIndex?: number;
  /** 0-based index of the experience entry, if applicable. */
  experienceIndex?: number;
}

export type IssueSeverity = 'pass' | 'warn' | 'fail';
export type IssueCategory = 'impact' | 'brevity' | 'style' | 'sections';

export interface ScoreIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  /** Points recovered if this issue is fixed (0 = already passing). */
  points: number;
  evidence: IssueEvidence;
  /** Short, actionable instruction shown to the user. */
  fix: string;
}

export interface CategoryScores {
  impact: number;
  brevity: number;
  style: number;
  sections: number;
}

export interface ScoreReport {
  overall: number;       // 0-100
  categories: CategoryScores;
  issues: ScoreIssue[];
}

/** Minimal resume shape the scorer requires. */
export interface ScorerInput {
  name?: string;
  summary?: string;
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
  experience?: Array<{
    role?: string;
    title?: string;
    company?: string;
    dates?: string;
    bullets?: string[];
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    field?: string;
    graduationDate?: string;
  }>;
  skills?: string[] | Record<string, string[]>;
  projects?: Array<{ bullets?: string[] }>;
  certifications?: unknown[];
}

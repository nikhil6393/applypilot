/**
 * Scoring weights — one source of truth.
 * All weights within a group must sum to 100.
 * Edit this file to tune the scoring model; every change is auditable.
 */

/** Category weights — how much each dimension contributes to overall score. */
export const CATEGORY_WEIGHTS = {
  impact:   35, // Strong, quantified bullets drive interview callbacks
  brevity:  25, // Concise bullets parse cleanly through ATS parsers
  style:    20, // Professional tone, consistency, no clichés
  sections: 20, // Complete structure enables correct ATS field extraction
} as const;

/** Sub-weights within IMPACT (must sum to 100). */
export const IMPACT_SUB = {
  quantifiedBullets: 40, // Most direct signal of measurable contribution
  weakOpeners:       30, // Passive openers bury impact and confuse ATS
  actionVerbs:       20, // ATS looks for action-first bullet structure
  repeatedVerbs:     10, // Verb variety signals depth of contribution
} as const;

/** Sub-weights within BREVITY (must sum to 100). */
export const BREVITY_SUB = {
  bulletLength:   40, // Bullets over 30 words wrap and lose scannability
  bulletsPerRole: 30, // 3-6 bullets per role is the ATS sweet spot
  fillerWords:    30, // Filler dilutes signal-to-noise ratio
} as const;

/** Sub-weights within STYLE (must sum to 100). */
export const STYLE_SUB = {
  buzzwords:      30, // Buzzwords increase keyword noise, not relevance
  firstPerson:    30, // "I" pronouns are unprofessional in resumes
  tense:          25, // Inconsistent tense signals careless proofreading
  repeatedWords:  15, // Lexical variety signals communication skill
} as const;

/** Sub-weights within SECTIONS (must sum to 100). */
export const SECTIONS_SUB = {
  contact:           40, // Missing contact = zero callbacks
  essentialSections: 40, // Missing experience or education = parser failure
  atsHeadings:       20, // Non-standard headings confuse ATS field mapping
} as const;

/** Thresholds used across rules. */
export const THRESHOLDS = {
  quantifiedBulletsMinPct: 0.50,  // >= 50 % of bullets should have a metric
  actionVerbMinPct:        0.70,  // >= 70 % of bullets should start with an action verb
  bulletMaxWords:          30,    // Bullets > 30 words are too long
  bulletMinWords:          6,     // Bullets < 6 words are too short
  bulletsPerRoleMin:       3,     // Fewer bullets = underselling the role
  bulletsPerRoleMax:       6,     // More bullets = ATS noise
  repeatedVerbThreshold:   2,     // Same verb used > 2 times = flag
} as const;

export { tailorResume } from './engine.js';
export type { TailorJobInput, TailoredResult } from './engine.js';

export { extractJobKeywords, extractCandidateSkills } from './extractor.js';
export { matchSkills } from './matcher.js';
export type { SkillMatchResult } from './matcher.js';

export { canonicalizeSkill, areSkillsEquivalent, TAXONOMY } from './taxonomy.js';
export type { TaxonomyEntry, SkillsTaxonomy } from './taxonomy.js';

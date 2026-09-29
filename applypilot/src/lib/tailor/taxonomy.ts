import taxonomyData from '../../../data/skills-taxonomy.json' with { type: 'json' };

export interface TaxonomyEntry {
  canonical: string;
  aliases: string[];
  category: string;
}

export type SkillsTaxonomy = Record<string, TaxonomyEntry>;

export const TAXONOMY: SkillsTaxonomy = taxonomyData as SkillsTaxonomy;

/** Inverted map: lowercase alias / canonical -> canonical name */
const ALIAS_LOOKUP: Map<string, string> = new Map();

for (const [, entry] of Object.entries(TAXONOMY)) {
  ALIAS_LOOKUP.set(entry.canonical.toLowerCase(), entry.canonical);
  for (const alias of entry.aliases) {
    ALIAS_LOOKUP.set(alias.toLowerCase(), entry.canonical);
  }
}

/**
 * Resolve any raw skill or keyword alias to its canonical display name.
 * e.g. "k8s" -> "Kubernetes", "ts" -> "TypeScript", "postgres" -> "PostgreSQL".
 * If not in taxonomy, returns the trimmed original string with Title Casing.
 */
export function canonicalizeSkill(rawSkill: string): string {
  const trimmed = rawSkill.trim();
  const lower = trimmed.toLowerCase();
  const found = ALIAS_LOOKUP.get(lower);
  if (found) return found;

  // Title case fallback if not mapped
  return trimmed.length > 2
    ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    : trimmed.toUpperCase();
}

/**
 * Check if two skill strings represent the same canonical skill.
 * e.g. areSkillsEquivalent("k8s", "Kubernetes") -> true
 * e.g. areSkillsEquivalent("React.js", "React") -> true
 */
export function areSkillsEquivalent(a: string, b: string): boolean {
  return canonicalizeSkill(a).toLowerCase() === canonicalizeSkill(b).toLowerCase();
}

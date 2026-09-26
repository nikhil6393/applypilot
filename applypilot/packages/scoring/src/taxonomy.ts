import { SkillTaxonomyDictionary } from '@applypilot/domain';

export interface NormalizedSkillMatch {
  canonicalName: string;
  category: string;
  rawInput: string;
}

export interface SkillMatchResult {
  matchedSkills: string[];
  missingSkills: string[];
  overlapRatio: number;
}

const ALIAS_MAP = new Map<string, { canonical: string; category: string }>();

const CANONICAL_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  golang: 'Go',
  rust: 'Rust',
  cpp: 'C++',
  csharp: 'C#',
  react: 'React',
  nextjs: 'Next.js',
  vue: 'Vue.js',
  angular: 'Angular',
  nodejs: 'Node.js',
  express: 'Express',
  fastapi: 'FastAPI',
  django: 'Django',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  redis: 'Redis',
  sqlite: 'SQLite',
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  git: 'Git',
  vitest: 'Vitest',
  jest: 'Jest',
  playwright: 'Playwright',
  cypress: 'Cypress',
};

// Populate fast-lookup alias map from SkillTaxonomyDictionary
for (const [key, entry] of Object.entries(SkillTaxonomyDictionary)) {
  const canonical = CANONICAL_NAMES[key.toLowerCase()] || (key.charAt(0).toUpperCase() + key.slice(1));
  const meta = { canonical, category: entry.category };
  ALIAS_MAP.set(key.toLowerCase(), meta);
  for (const alias of entry.aliases) {
    ALIAS_MAP.set(alias.toLowerCase(), meta);
  }
}

// Add common aliases
const EXTRA_ALIASES: Record<string, { canonical: string; category: string }> = {
  js: { canonical: 'JavaScript', category: 'language' },
  ts: { canonical: 'TypeScript', category: 'language' },
  py: { canonical: 'Python', category: 'language' },
  postgres: { canonical: 'PostgreSQL', category: 'database' },
  psql: { canonical: 'PostgreSQL', category: 'database' },
  k8s: { canonical: 'Kubernetes', category: 'tooling' },
  gql: { canonical: 'GraphQL', category: 'framework' },
  gh: { canonical: 'GitHub', category: 'tooling' },
  mongo: { canonical: 'MongoDB', category: 'database' },
  tf: { canonical: 'Terraform', category: 'tooling' },
};

for (const [alias, meta] of Object.entries(EXTRA_ALIASES)) {
  if (!ALIAS_MAP.has(alias)) {
    ALIAS_MAP.set(alias, meta);
  }
}

/**
 * Resolves any skill string or alias to its canonical representation.
 */
export function resolveSkill(raw: string): NormalizedSkillMatch {
  const cleaned = raw.trim().toLowerCase().replace(/^#/, '');
  const match = ALIAS_MAP.get(cleaned);

  if (match) {
    return {
      canonicalName: match.canonical,
      category: match.category,
      rawInput: raw,
    };
  }

  // Capitalize first letter if unknown
  const fallbackName = raw.trim().length > 0 ? raw.trim()[0].toUpperCase() + raw.trim().slice(1) : raw;
  return {
    canonicalName: fallbackName,
    category: 'unknown',
    rawInput: raw,
  };
}

/**
 * Normalizes a list of skills, deduplicating by canonical name.
 */
export function normalizeSkillList(skills: string[]): string[] {
  const canonicalSet = new Set<string>();
  for (const s of skills) {
    if (!s || typeof s !== 'string') continue;
    const resolved = resolveSkill(s);
    canonicalSet.add(resolved.canonicalName);
  }
  return Array.from(canonicalSet);
}

/**
 * Compares two skill lists using canonical taxonomy resolution.
 */
export function compareSkills(
  targetSkills: string[],
  candidateSkills: string[]
): SkillMatchResult {
  const targetResolved = new Set(normalizeSkillList(targetSkills));
  const candidateResolved = new Set(normalizeSkillList(candidateSkills));

  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of targetResolved) {
    if (candidateResolved.has(skill)) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const overlapRatio =
    targetResolved.size > 0 ? matched.length / targetResolved.size : 1;

  return {
    matchedSkills: matched,
    missingSkills: missing,
    overlapRatio,
  };
}

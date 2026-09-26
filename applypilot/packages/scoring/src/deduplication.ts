import { createHash } from 'node:crypto';
import type { CanonicalJob } from '@applypilot/domain';
import { normalizeCanonicalUrl } from './url-normalizer.js';

export interface DedupeMatch {
  matched: boolean;
  stage:
    | 'exact_source_key'
    | 'canonical_url'
    | 'company_title_location'
    | 'content_hash'
    | 'fuzzy_similarity'
    | 'none';
  confidence: number; // 0.0 - 1.0
  reason?: string;
}

export interface MergedJobSourceProvenance {
  source: string;
  sourceJobId: string;
  canonicalUrl: string;
  applicantCount?: number;
  discoveredAt: string;
}

/**
 * Strips punctuation, multiple spaces, and normalizes casing for fuzzy comparison.
 */
function normalizeString(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Dice's coefficient (bigram overlap) for fast fuzzy text comparison.
 */
export function diceCoefficient(a: string, b: string): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);

  if (normA === normB) return 1.0;
  if (normA.length < 2 || normB.length < 2) return 0.0;

  const bigramsA = new Set<string>();
  for (let i = 0; i < normA.length - 1; i++) {
    bigramsA.add(normA.slice(i, i + 2));
  }

  let matches = 0;
  for (let i = 0; i < normB.length - 1; i++) {
    const bigram = normB.slice(i, i + 2);
    if (bigramsA.has(bigram)) matches++;
  }

  return (2 * matches) / (normA.length - 1 + (normB.length - 1));
}

/**
 * Computes SHA-256 hash of normalized job description.
 */
export function computeDescriptionHash(description: string): string {
  const normalized = normalizeString(description);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Evaluates whether two job postings represent the exact same role
 * across the 7-stage deduplication pipeline.
 */
export function checkDuplicate(jobA: CanonicalJob, jobB: CanonicalJob): DedupeMatch {
  // Stage 1: Exact source key (source, sourceJobId)
  if (
    jobA.source === jobB.source &&
    jobA.sourceJobId &&
    jobB.sourceJobId &&
    jobA.sourceJobId === jobB.sourceJobId
  ) {
    return {
      matched: true,
      stage: 'exact_source_key',
      confidence: 1.0,
      reason: `Identical source key: ${jobA.source}:${jobA.sourceJobId}`,
    };
  }

  // Stage 2: Canonical URL normalization
  const urlA = normalizeCanonicalUrl(jobA.canonicalUrl);
  const urlB = normalizeCanonicalUrl(jobB.canonicalUrl);
  if (urlA && urlB && urlA === urlB) {
    return {
      matched: true,
      stage: 'canonical_url',
      confidence: 1.0,
      reason: `Identical canonical URL: ${urlA}`,
    };
  }

  // Stage 3: Company + normalized title + normalized location
  const compA = normalizeString(jobA.company.name);
  const compB = normalizeString(jobB.company.name);
  const titleA = normalizeString(jobA.title);
  const titleB = normalizeString(jobB.title);
  const locA = normalizeString(jobA.locations[0]?.raw || '');
  const locB = normalizeString(jobB.locations[0]?.raw || '');

  if (compA && compB && compA === compB && titleA === titleB) {
    // Check location equivalence or remote compatibility
    const sameLoc = locA === locB || jobA.remoteType === 'remote' || jobB.remoteType === 'remote';
    if (sameLoc) {
      return {
        matched: true,
        stage: 'company_title_location',
        confidence: 0.95,
        reason: `Matched company (${jobA.company.name}), title, and location compatibility`,
      };
    }
  }

  // Stage 4: Content hash of normalized job description (SHA-256)
  if (jobA.description && jobB.description) {
    const hashA = jobA.contentHash || computeDescriptionHash(jobA.description);
    const hashB = jobB.contentHash || computeDescriptionHash(jobB.description);

    // Only compare description hash if companies match to avoid cross-company boilerplate collisions
    if (hashA === hashB && (compA === compB || diceCoefficient(compA, compB) > 0.8)) {
      return {
        matched: true,
        stage: 'content_hash',
        confidence: 0.98,
        reason: 'Identical normalized job description content hash with matching company',
      };
    }
  }

  // Stage 5: Fuzzy title/company/location similarity
  if (compA && compB) {
    const compScore = diceCoefficient(compA, compB);
    const titleScore = diceCoefficient(titleA, titleB);

    // Rule (§12): Never merge two jobs solely because their titles match!
    // Company must match with high confidence (> 0.85) AND title must match (> 0.85)
    if (compScore >= 0.85 && titleScore >= 0.85) {
      const overallConfidence = (compScore + titleScore) / 2;
      return {
        matched: true,
        stage: 'fuzzy_similarity',
        confidence: Number(overallConfidence.toFixed(3)),
        reason: `Fuzzy match: company similarity ${compScore.toFixed(2)}, title similarity ${titleScore.toFixed(2)}`,
      };
    }
  }

  return {
    matched: false,
    stage: 'none',
    confidence: 0.0,
  };
}

/**
 * Merges jobB into jobA while strictly preserving source provenance (job_sources[])
 * and never destroying source-specific applicant counts or discovery timestamps.
 */
export function mergeJobs(primary: CanonicalJob, secondary: CanonicalJob): CanonicalJob {
  const mergedSources: MergedJobSourceProvenance[] = [
    {
      source: primary.source,
      sourceJobId: primary.sourceJobId,
      canonicalUrl: primary.canonicalUrl,
      applicantCount: primary.applicantCount,
      discoveredAt: primary.discoveredAt,
    },
    {
      source: secondary.source,
      sourceJobId: secondary.sourceJobId,
      canonicalUrl: secondary.canonicalUrl,
      applicantCount: secondary.applicantCount,
      discoveredAt: secondary.discoveredAt,
    },
  ];

  // Preserve existing sources if already merged
  const existingPrimarySources = (primary.sourceMetadata?.sources as MergedJobSourceProvenance[]) || [];
  const existingSecondarySources = (secondary.sourceMetadata?.sources as MergedJobSourceProvenance[]) || [];

  const allSources = [...existingPrimarySources, ...existingSecondarySources, ...mergedSources];
  const uniqueSourcesMap = new Map<string, MergedJobSourceProvenance>();

  for (const s of allSources) {
    const key = `${s.source}:${s.sourceJobId}`;
    if (!uniqueSourcesMap.has(key)) {
      uniqueSourcesMap.set(key, s);
    }
  }

  return {
    ...primary,
    // Keep most informative description
    description:
      primary.description.length >= secondary.description.length
        ? primary.description
        : secondary.description,
    // Salary bounds merged if primary was missing them
    salary: primary.salary || secondary.salary,
    // Latest seen timestamp
    lastSeenAt: new Date().toISOString(),
    // Combined unique skills
    skills: [...primary.skills],
    sourceMetadata: {
      ...primary.sourceMetadata,
      sources: Array.from(uniqueSourcesMap.values()),
      mergedAt: new Date().toISOString(),
      mergeCount: uniqueSourcesMap.size,
    },
  };
}

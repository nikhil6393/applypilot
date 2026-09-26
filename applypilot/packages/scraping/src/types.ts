import type { CanonicalJob, JobSource } from '@applypilot/domain';

export interface SourceCapabilities {
  supportsKeywordSearch: boolean;
  supportsLocationFilter: boolean;
  supportsRemoteFilter: boolean;
  supportsInternshipFilter: boolean;
  supportsTimeWindowFilter: boolean;
  supportsPagination: boolean;
  rateLimitRequestsPerMinute: number;
}

export interface SearchQuery {
  query?: string;
  location?: string;
  remoteOnly?: boolean;
  internshipsOnly?: boolean;
  timeWindow?: '1h' | '4h' | '12h' | '24h' | '7d' | 'all';
  limit?: number;
}

export interface FetchJobInput {
  jobId?: string;
  url?: string;
  sourceJobId?: string;
}

export interface RawJob {
  source: JobSource;
  rawId: string;
  data: Record<string, any>;
  extractedAt: string;
}

export interface HealthStatus {
  source: JobSource;
  status: 'healthy' | 'degraded' | 'circuit_open' | 'down';
  latencyMs: number;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError?: string;
  checkedAt: string;
}

/**
 * Section 10: Source Adapter Architecture
 */
export interface JobSourceAdapter {
  readonly id: JobSource;
  readonly name: string;
  capabilities(): SourceCapabilities;
  search(query: SearchQuery): Promise<RawJob[]>;
  fetchJob(input: FetchJobInput): Promise<RawJob | null>;
  verifyJobUrl?(url: string): Promise<{ verified: boolean; status: string; httpStatus?: number; reason?: string }>;
  normalize(raw: RawJob): CanonicalJob;
  healthCheck(): Promise<HealthStatus>;
}

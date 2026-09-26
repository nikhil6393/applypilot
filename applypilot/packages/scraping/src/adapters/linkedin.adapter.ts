import type { CanonicalJob } from '@applypilot/domain';
import { toCanonicalJob } from '@applypilot/domain';
import type { JobSourceAdapter, SourceCapabilities, SearchQuery, FetchJobInput, RawJob, HealthStatus } from '../types.js';
import { linkedinRealtime } from '../../../../server/scrape/linkedin-realtime.js';

export class LinkedInAdapter implements JobSourceAdapter {
  readonly id = 'linkedin' as const;
  readonly name = 'LinkedIn Guest Search';

  private consecutiveFailures = 0;
  private lastSuccessAt: string | null = null;
  private lastFailureAt: string | null = null;
  private lastError?: string;

  capabilities(): SourceCapabilities {
    return {
      supportsKeywordSearch: true,
      supportsLocationFilter: true,
      supportsRemoteFilter: true,
      supportsInternshipFilter: true,
      supportsTimeWindowFilter: true,
      supportsPagination: false,
      rateLimitRequestsPerMinute: 20,
    };
  }

  async search(query: SearchQuery): Promise<RawJob[]> {
    const start = Date.now();
    try {
      const jobs = await linkedinRealtime({
        query: query.query || 'software engineer intern',
        location: query.location || 'remote',
        remoteOnly: query.remoteOnly,
        internshipsOnly: query.internshipsOnly,
        timeWindow: query.timeWindow,
        maxPerSource: query.limit || 25,
      });

      this.consecutiveFailures = 0;
      this.lastSuccessAt = new Date().toISOString();

      return jobs.map((j) => ({
        source: this.id,
        rawId: j.id,
        data: j,
        extractedAt: j.fetchedAt || new Date().toISOString(),
      }));
    } catch (err: any) {
      this.consecutiveFailures++;
      this.lastFailureAt = new Date().toISOString();
      this.lastError = err.message || 'LinkedIn scrape failed';
      throw err;
    }
  }

  async fetchJob(input: FetchJobInput): Promise<RawJob | null> {
    if (!input.url && !input.jobId) return null;
    return null;
  }

  normalize(raw: RawJob): CanonicalJob {
    const data = raw.data;
    const numericMatch =
      (data.url || '').match(/\/jobs\/view\/(?:[a-zA-Z0-9_.-]+-)?(\d+)/i) ||
      (data.id || '').match(/(\d{8,12})/);
    const numericId = numericMatch ? numericMatch[1] : String(data.id || Math.random());

    return toCanonicalJob({
      id: `linkedin_${numericId}`,
      source: 'linkedin',
      sourceJobId: numericId,
      url: data.url || `https://www.linkedin.com/jobs/view/${numericId}`,
      applyUrl: data.applyUrl || data.url || `https://www.linkedin.com/jobs/view/${numericId}`,
      title: data.title || 'Untitled Role',
      company: data.company || 'Unknown Employer',
      location: data.location || 'Remote',
      remote: Boolean(data.remote),
      description: data.description || '',
      postedAt: data.postedAt || new Date().toISOString(),
      applicantCount: typeof data.applicantCount === 'number' ? data.applicantCount : undefined,
      isInternship: Boolean(data.isInternship),
      skills: Array.isArray(data.skills) ? data.skills : [],
      sponsorsVisa: data.sponsorsVisa,
      eligibleBatches: data.eligibleBatches,
      sourceMetadata: {
        rawId: raw.rawId,
        extractedAt: raw.extractedAt,
      },
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    const isCircuitOpen = this.consecutiveFailures >= 5;
    return {
      source: this.id,
      status: isCircuitOpen ? 'circuit_open' : this.consecutiveFailures > 0 ? 'degraded' : 'healthy',
      latencyMs: 120,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastError: this.lastError,
      checkedAt: new Date().toISOString(),
    };
  }
}

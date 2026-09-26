import type { CanonicalJob } from '@applypilot/domain';
import { toCanonicalJob } from '@applypilot/domain';
import type { JobSourceAdapter, SourceCapabilities, SearchQuery, FetchJobInput, RawJob, HealthStatus } from '../types.js';
import { greenhouse } from '../../../../server/scrape/greenhouse.js';

export class GreenhouseAdapter implements JobSourceAdapter {
  readonly id = 'greenhouse' as const;
  readonly name = 'Greenhouse Official Board API';

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
      supportsTimeWindowFilter: false,
      supportsPagination: false,
      rateLimitRequestsPerMinute: 60,
    };
  }

  async search(query: SearchQuery): Promise<RawJob[]> {
    try {
      const jobs = await greenhouse({
        query: query.query,
        location: query.location,
        remoteOnly: query.remoteOnly,
        internshipsOnly: query.internshipsOnly,
        maxPerSource: query.limit || 50,
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
      this.lastError = err.message || 'Greenhouse fetch failed';
      throw err;
    }
  }

  async fetchJob(input: FetchJobInput): Promise<RawJob | null> {
    return null;
  }

  normalize(raw: RawJob): CanonicalJob {
    const data = raw.data;
    const rawId = data.id || `gh_${Math.random()}`;

    return toCanonicalJob({
      id: String(rawId).startsWith('gh_') ? rawId : `gh_${rawId}`,
      source: 'greenhouse',
      sourceJobId: String(rawId),
      url: data.url || data.absolute_url || `https://boards.greenhouse.io/job/${rawId}`,
      applyUrl: data.applyUrl || data.url || data.absolute_url || '',
      title: data.title || 'Untitled Role',
      company: data.company || 'Unknown Employer',
      location: typeof data.location === 'object' ? data.location.name : data.location || 'Remote',
      remote: Boolean(data.remote) || /remote/i.test(typeof data.location === 'object' ? data.location.name : data.location || ''),
      description: data.description || data.content || '',
      postedAt: data.postedAt || data.updated_at || new Date().toISOString(),
      applicantCount: undefined, // Never fabricated
      isInternship: Boolean(data.isInternship) || /intern/i.test(data.title || ''),
      skills: Array.isArray(data.skills) ? data.skills : [],
      sponsorsVisa: data.sponsorsVisa,
      eligibleBatches: data.eligibleBatches,
      sourceMetadata: {
        rawId: raw.rawId,
        departments: data.departments,
        offices: data.offices,
      },
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      source: this.id,
      status: this.consecutiveFailures >= 5 ? 'circuit_open' : this.consecutiveFailures > 0 ? 'degraded' : 'healthy',
      latencyMs: 90,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastError: this.lastError,
      checkedAt: new Date().toISOString(),
    };
  }
}

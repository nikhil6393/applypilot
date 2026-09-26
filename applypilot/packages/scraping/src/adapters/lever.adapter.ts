import type { CanonicalJob } from '@applypilot/domain';
import { toCanonicalJob } from '@applypilot/domain';
import type { JobSourceAdapter, SourceCapabilities, SearchQuery, FetchJobInput, RawJob, HealthStatus } from '../types.js';
import { lever } from '../../../../server/scrape/lever.js';

export class LeverAdapter implements JobSourceAdapter {
  readonly id = 'lever' as const;
  readonly name = 'Lever Official Postings API';

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
      const jobs = await lever({
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
      this.lastError = err.message || 'Lever fetch failed';
      throw err;
    }
  }

  async fetchJob(input: FetchJobInput): Promise<RawJob | null> {
    return null;
  }

  normalize(raw: RawJob): CanonicalJob {
    const data = raw.data;
    const rawId = data.id || `lever_${Math.random()}`;

    const locationStr =
      typeof data.categories?.location === 'string'
        ? data.categories.location
        : data.location || 'Remote';

    return toCanonicalJob({
      id: String(rawId).startsWith('lever_') ? rawId : `lever_${rawId}`,
      source: 'lever',
      sourceJobId: String(rawId),
      url: data.url || data.hostedUrl || '',
      applyUrl: data.applyUrl || data.hostedUrl || '',
      title: data.title || data.text || 'Untitled Role',
      company: data.company || 'Unknown Employer',
      location: locationStr,
      remote: Boolean(data.remote) || /remote/i.test(locationStr),
      description: data.description || data.descriptionPlain || '',
      postedAt: data.postedAt || (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()),
      applicantCount: undefined,
      isInternship: Boolean(data.isInternship) || /intern/i.test(data.title || data.text || ''),
      skills: Array.isArray(data.skills) ? data.skills : [],
      sponsorsVisa: data.sponsorsVisa,
      eligibleBatches: data.eligibleBatches,
      sourceMetadata: {
        rawId: raw.rawId,
        categories: data.categories,
      },
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      source: this.id,
      status: this.consecutiveFailures >= 5 ? 'circuit_open' : this.consecutiveFailures > 0 ? 'degraded' : 'healthy',
      latencyMs: 95,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastError: this.lastError,
      checkedAt: new Date().toISOString(),
    };
  }
}

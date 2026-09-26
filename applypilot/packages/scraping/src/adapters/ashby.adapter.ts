import type { CanonicalJob } from '@applypilot/domain';
import { toCanonicalJob } from '@applypilot/domain';
import type { JobSourceAdapter, SourceCapabilities, SearchQuery, FetchJobInput, RawJob, HealthStatus } from '../types.js';
import { ashby } from '../../../../server/scrape/ashby.js';

export class AshbyAdapter implements JobSourceAdapter {
  readonly id = 'ashby' as const;
  readonly name = 'Ashby Official Posting API';

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
      const jobs = await ashby({
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
      this.lastError = err.message || 'Ashby fetch failed';
      throw err;
    }
  }

  async fetchJob(input: FetchJobInput): Promise<RawJob | null> {
    return null;
  }

  normalize(raw: RawJob): CanonicalJob {
    const data = raw.data;
    const rawId = data.id || `ashby_${Math.random()}`;

    return toCanonicalJob({
      id: String(rawId).startsWith('ashby_') ? rawId : `ashby_${rawId}`,
      source: 'ashby',
      sourceJobId: String(rawId),
      url: data.url || data.jobUrl || '',
      applyUrl: data.applyUrl || data.url || data.jobUrl || '',
      title: data.title || 'Untitled Role',
      company: data.company || 'Unknown Employer',
      location: data.location || 'Remote',
      remote: Boolean(data.remote) || Boolean(data.isRemote) || /remote/i.test(data.location || ''),
      description: data.description || data.descriptionHtml || '',
      descriptionHtml: data.descriptionHtml,
      postedAt: data.postedAt || data.publishedAt || new Date().toISOString(),
      applicantCount: undefined,
      isInternship: Boolean(data.isInternship) || /intern/i.test(data.title || ''),
      skills: Array.isArray(data.skills) ? data.skills : [],
      sponsorsVisa: data.sponsorsVisa,
      eligibleBatches: data.eligibleBatches,
      sourceMetadata: {
        rawId: raw.rawId,
        department: data.department,
        employmentType: data.employmentType,
      },
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      source: this.id,
      status: this.consecutiveFailures >= 5 ? 'circuit_open' : this.consecutiveFailures > 0 ? 'degraded' : 'healthy',
      latencyMs: 110,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastError: this.lastError,
      checkedAt: new Date().toISOString(),
    };
  }
}

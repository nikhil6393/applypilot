import type { CanonicalJob } from '@applypilot/domain';
import { toCanonicalJob } from '@applypilot/domain';
import type { JobSourceAdapter, SourceCapabilities, SearchQuery, FetchJobInput, RawJob, HealthStatus } from '../types.js';
import { remoteok } from '../../../../server/scrape/remoteok.js';
import { verifyJobUrlLive } from '../../../../server/scrape/validator.js';

export class RemoteOKAdapter implements JobSourceAdapter {
  readonly id = 'remoteok' as const;
  readonly name = 'RemoteOK Public API';

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
      rateLimitRequestsPerMinute: 30,
    };
  }

  async search(query: SearchQuery): Promise<RawJob[]> {
    try {
      const jobs = await remoteok({
        query: query.query,
        location: query.location,
        remoteOnly: query.remoteOnly,
        internshipsOnly: query.internshipsOnly,
        maxPerSource: query.limit || 30,
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
      this.lastError = err.message || 'RemoteOK fetch failed';
      throw err;
    }
  }

  async fetchJob(input: FetchJobInput): Promise<RawJob | null> {
    return null;
  }

  async verifyJobUrl(url: string) {
    return verifyJobUrlLive(url);
  }

  normalize(raw: RawJob): CanonicalJob {
    const data = raw.data;
    const rawId = data.id || `remoteok_${Math.random()}`;

    return toCanonicalJob({
      id: String(rawId).startsWith('remoteok_') ? rawId : `remoteok_${rawId}`,
      source: 'remoteok',
      sourceJobId: String(rawId),
      url: data.url || data.applyUrl || '',
      applyUrl: data.applyUrl || data.url || '',
      canonicalUrl: data.canonicalUrl || data.applyUrl || data.url || '',
      title: data.title || 'Untitled Role',
      company: data.company || 'Unknown Company',
      location: data.location || 'Remote',
      remote: true,
      description: data.description || '',
      postedAt: data.postedAt || data.postedDate || new Date().toISOString(),
      applicantCount: undefined,
      isInternship: Boolean(data.isInternship) || /intern/i.test(data.title || ''),
      skills: Array.isArray(data.skills) ? data.skills : [],
      sourceMetadata: {
        rawId: raw.rawId,
      },
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      source: this.id,
      status: this.consecutiveFailures >= 5 ? 'circuit_open' : this.consecutiveFailures > 0 ? 'degraded' : 'healthy',
      latencyMs: 120,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastError: this.lastError,
      checkedAt: new Date().toISOString(),
    };
  }
}

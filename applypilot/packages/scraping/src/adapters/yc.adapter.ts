import type { CanonicalJob } from '@applypilot/domain';
import { toCanonicalJob } from '@applypilot/domain';
import type { JobSourceAdapter, SourceCapabilities, SearchQuery, FetchJobInput, RawJob, HealthStatus } from '../types.js';
import { yc } from '../../../../server/scrape/yc.js';
import { verifyJobUrlLive } from '../../../../server/scrape/validator.js';

export class YCAdapter implements JobSourceAdapter {
  readonly id = 'yc' as const;
  readonly name = 'Y Combinator / HN Official Feed';

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
      rateLimitRequestsPerMinute: 60,
    };
  }

  async search(query: SearchQuery): Promise<RawJob[]> {
    try {
      const jobs = await yc({
        query: query.query,
        location: query.location,
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
      this.lastError = err.message || 'YC fetch failed';
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
    const rawId = data.id || `yc_${Math.random()}`;

    return toCanonicalJob({
      id: String(rawId).startsWith('yc_') ? rawId : `yc_${rawId}`,
      source: 'yc',
      sourceJobId: String(rawId),
      url: data.url || data.applyUrl || '',
      applyUrl: data.applyUrl || data.url || '',
      canonicalUrl: data.canonicalUrl || data.applyUrl || data.url || '',
      title: data.title || 'Untitled Role',
      company: data.company || 'Y Combinator Company',
      location: data.location || 'Remote',
      remote: Boolean(data.remote),
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
      latencyMs: 80,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastError: this.lastError,
      checkedAt: new Date().toISOString(),
    };
  }
}

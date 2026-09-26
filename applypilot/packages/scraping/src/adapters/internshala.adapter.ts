import type { CanonicalJob } from '@applypilot/domain';
import { toCanonicalJob } from '@applypilot/domain';
import type { JobSourceAdapter, SourceCapabilities, SearchQuery, FetchJobInput, RawJob, HealthStatus } from '../types.js';
import { internshala } from '../../../../server/scrape/internshala.js';
import { verifyJobUrlLive } from '../../../../server/scrape/validator.js';

export class InternshalaAdapter implements JobSourceAdapter {
  readonly id = 'internshala' as const;
  readonly name = 'Internshala Tech Internships';

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
      rateLimitRequestsPerMinute: 20,
    };
  }

  async search(query: SearchQuery): Promise<RawJob[]> {
    try {
      const jobs = await internshala({
        query: query.query,
        location: query.location,
        remoteOnly: query.remoteOnly,
        internshipsOnly: true,
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
      this.lastError = err.message || 'Internshala fetch failed';
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
    const rawId = data.id || `internshala_${Math.random()}`;

    return toCanonicalJob({
      id: String(rawId).startsWith('internshala_') ? rawId : `internshala_${rawId}`,
      source: 'internshala',
      sourceJobId: String(rawId),
      url: data.url || data.applyUrl || '',
      applyUrl: data.applyUrl || data.url || '',
      canonicalUrl: data.canonicalUrl || data.applyUrl || data.url || '',
      title: data.title || 'Untitled Internship',
      company: data.company || 'Unknown Employer',
      location: data.location || 'India',
      remote: Boolean(data.remote),
      description: data.description || '',
      postedAt: data.postedAt || data.postedDate || new Date().toISOString(),
      applicantCount: data.applicantCount,
      isInternship: true,
      skills: Array.isArray(data.skills) ? data.skills : [],
      eligibleBatches: data.eligibleBatches || ['2024', '2025', '2026', '2027', '2028'],
      sourceMetadata: {
        rawId: raw.rawId,
      },
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      source: this.id,
      status: this.consecutiveFailures >= 5 ? 'circuit_open' : this.consecutiveFailures > 0 ? 'degraded' : 'healthy',
      latencyMs: 150,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastError: this.lastError,
      checkedAt: new Date().toISOString(),
    };
  }
}

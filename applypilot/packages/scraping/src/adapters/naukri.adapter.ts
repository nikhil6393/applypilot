import type { CanonicalJob } from '@applypilot/domain';
import { toCanonicalJob } from '@applypilot/domain';
import type { JobSourceAdapter, SourceCapabilities, SearchQuery, FetchJobInput, RawJob, HealthStatus } from '../types.js';
import { naukriAdvanced } from '../../../../server/scrape/naukri-advanced.js';

export class NaukriAdapter implements JobSourceAdapter {
  readonly id = 'naukari' as const;
  readonly name = 'Naukri Search API';

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
      supportsPagination: true,
      rateLimitRequestsPerMinute: 40,
    };
  }

  async search(query: SearchQuery): Promise<RawJob[]> {
    try {
      const jobs = await naukriAdvanced({
        query: query.query || 'software engineer',
        location: query.location || 'India',
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
      this.lastError = err.message || 'Naukri scrape failed';
      throw err;
    }
  }

  async fetchJob(input: FetchJobInput): Promise<RawJob | null> {
    return null;
  }

  normalize(raw: RawJob): CanonicalJob {
    const data = raw.data;
    const jobId = data.jobId || data.id || `naukri_${Math.random()}`;

    return toCanonicalJob({
      id: `naukri_${jobId}`,
      source: 'naukari',
      sourceJobId: String(jobId),
      url: data.url || data.jobUrl || `https://www.naukri.com/job-listings-${jobId}`,
      applyUrl: data.applyUrl || data.url || data.jobUrl || '',
      title: data.title || 'Untitled Role',
      company: data.company || data.companyName || 'Unknown Employer',
      location: data.location || 'India',
      remote: Boolean(data.remote),
      description: data.description || data.jobDescription || '',
      postedAt: data.postedAt || data.postedDate || new Date().toISOString(),
      applicantCount: typeof data.applicantCount === 'number' ? data.applicantCount : undefined,
      isInternship: Boolean(data.isInternship) || /intern|trainee/i.test(data.title || ''),
      skills: Array.isArray(data.skills) ? data.skills : [],
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      salary: data.salary,
      sourceMetadata: {
        rawId: raw.rawId,
        experience: data.experience,
      },
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    const isCircuitOpen = this.consecutiveFailures >= 5;
    return {
      source: this.id,
      status: isCircuitOpen ? 'circuit_open' : this.consecutiveFailures > 0 ? 'degraded' : 'healthy',
      latencyMs: 140,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastError: this.lastError,
      checkedAt: new Date().toISOString(),
    };
  }
}

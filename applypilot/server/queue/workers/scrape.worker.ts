import { defaultRegistry } from '@applypilot/scraping';
import type { JobSource } from '@applypilot/domain';
import { upsertJob } from '../../store/jobs.js';
import { logMonitorRun } from '../../store/monitoring.js';
import type { QueueJob } from '../types.js';

export interface ScrapeJobData {
  source: JobSource;
  query?: {
    keywords?: string;
    location?: string;
    remoteOnly?: boolean;
    internshipOnly?: boolean;
    limit?: number;
  };
}

export interface ScrapeJobResult {
  source: JobSource;
  jobsFound: number;
  jobsInserted: number;
  durationMs: number;
}

export async function processScrapeJob(
  job: QueueJob<ScrapeJobData>
): Promise<ScrapeJobResult> {
  const { source, query = {} } = job.data;
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const adapter = defaultRegistry.get(source);
  if (!adapter) {
    const durationMs = Date.now() - startTime;
    logMonitorRun({
      source,
      status: 'failed',
      jobsFound: 0,
      jobsInserted: 0,
      durationMs,
      errorMessage: `No adapter registered for source: ${source}`,
      startedAt,
      finishedAt: new Date().toISOString(),
    });
    throw new Error(`No adapter registered for source: ${source}`);
  }

  try {
    const rawJobs = await adapter.search({
      query: query.keywords,
      location: query.location,
      remoteOnly: query.remoteOnly,
      internshipsOnly: query.internshipOnly,
      limit: query.limit ?? 25,
    });

    let jobsInserted = 0;
    for (const raw of rawJobs) {
      const canonical = adapter.normalize(raw);
      // Legacy JobPosting conversion for storage
      const r = upsertJob({
        id: canonical.id,
        title: canonical.title,
        company: canonical.company.name,
        source: canonical.source,
        url: canonical.canonicalUrl,
        applyUrl: canonical.canonicalUrl,
        location: canonical.locations[0]?.raw || '',
        remote: canonical.remoteType === 'remote',
        description: canonical.description,
        postedAt: canonical.postedAt || new Date().toISOString(),
        fetchedAt: canonical.discoveredAt,
        employmentType: canonical.employmentType,
        isInternship: canonical.internship,
        skills: canonical.skills.map((s) => (typeof s === 'string' ? s : s.name)),
        salary: canonical.salary
          ? `${canonical.salary.min ?? ''} - ${canonical.salary.max ?? ''} ${canonical.salary.currency ?? ''}`
          : undefined,
        applicantCount: canonical.applicantCount,
      });
      if (r.inserted) jobsInserted++;
    }

    const durationMs = Date.now() - startTime;
    logMonitorRun({
      source,
      status: 'completed',
      jobsFound: rawJobs.length,
      jobsInserted,
      durationMs,
      startedAt,
      finishedAt: new Date().toISOString(),
    });

    return {
      source,
      jobsFound: rawJobs.length,
      jobsInserted,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    logMonitorRun({
      source,
      status: 'failed',
      jobsFound: 0,
      jobsInserted: 0,
      durationMs,
      errorMessage: err.message || 'Scrape worker failed',
      startedAt,
      finishedAt: new Date().toISOString(),
    });
    throw err;
  }
}

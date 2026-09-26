import { EventEmitter } from 'node:events';
import { linkedinRealtime } from '../scrape/linkedin-realtime.js';
import { naukriAdvanced } from '../scrape/naukri-advanced.js';
import { validateAndFilterJobs } from '../scrape/validator.js';
import type { JobPosting } from '../../shared/types.js';
import { getDb } from '../db/db.js';
import { jobs } from '../db/schema.js';
import { desc } from 'drizzle-orm';

export interface PlatformHealth {
  status: 'live' | 'degraded' | 'down' | 'idle';
  lastPollAt: string | null;
  lastError: string | null;
  jobsFoundLastPoll: number;
}

export interface MonitorStatus {
  isRunning: boolean;
  pollIntervalSec: number;
  lastPolledAt: string | null;
  totalMonitoredJobs: number;
  newJobsInLastHour: number;
  activeKeywords: string[];
  activeLocations: string[];
  platformHealth: Record<string, PlatformHealth>;
}

class RealtimeJobMonitor extends EventEmitter {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private pollIntervalSec = 60; // 60s background loop
  private lastPolledAt: string | null = null;
  private newJobsInLastHour = 0;

  private activeKeywords = [
    'software engineer internship',
    'react developer',
    'full stack developer',
  ];
  private activeLocations = ['India', 'Remote', 'Bangalore'];

  private platformHealth: Record<string, PlatformHealth> = {
    linkedin: { status: 'idle', lastPollAt: null, lastError: null, jobsFoundLastPoll: 0 },
    naukri: { status: 'idle', lastPollAt: null, lastError: null, jobsFoundLastPoll: 0 },
  };

  constructor() {
    super();
  }

  public setKeywords(keywords: string[]) {
    if (Array.isArray(keywords) && keywords.length > 0) {
      this.activeKeywords = keywords.slice(0, 5);
    }
  }

  public setLocations(locations: string[]) {
    if (Array.isArray(locations) && locations.length > 0) {
      this.activeLocations = locations.slice(0, 5);
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[realtime-monitor] Background monitoring started (poll every 60s)');

    // Initial run
    this.pollCycle().catch((e) =>
      console.warn('[realtime-monitor] initial poll error:', e.message)
    );

    this.timer = setInterval(() => {
      this.pollCycle().catch((e) => console.warn('[realtime-monitor] poll error:', e.message));
    }, this.pollIntervalSec * 1000);
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.isRunning = false;
    console.log('[realtime-monitor] Background monitoring stopped');
  }

  public async triggerNow(): Promise<{ newCount: number; totalCount: number }> {
    return this.pollCycle();
  }

  public getCachedJobs(): any[] {
    const db = getDb();
    return db.select().from(jobs).orderBy(desc(jobs.scrapedAt)).limit(150).all();
  }

  public getStatus(): MonitorStatus {
    return {
      isRunning: this.isRunning,
      pollIntervalSec: this.pollIntervalSec,
      lastPolledAt: this.lastPolledAt,
      totalMonitoredJobs: this.getCachedJobs().length, // temporary approximation
      newJobsInLastHour: this.newJobsInLastHour,
      activeKeywords: this.activeKeywords,
      activeLocations: this.activeLocations,
      platformHealth: { ...this.platformHealth },
    };
  }

  private async pollCycle(): Promise<{ newCount: number; totalCount: number }> {
    this.lastPolledAt = new Date().toISOString();
    const query = this.activeKeywords[0] || 'software engineer internship';
    const loc = this.activeLocations[0] || 'India';

    const newlyDiscovered: JobPosting[] = [];

    try {
      // Scrape LinkedIn & Naukri concurrently
      const [liJobs, nkJobs] = await Promise.allSettled([
        linkedinRealtime({ query, location: loc, timeWindow: '1h', maxPerSource: 20 }),
        naukriAdvanced({ query, location: loc, maxPerSource: 15 }),
      ]);

      const freshBatch: JobPosting[] = [];
      if (liJobs.status === 'fulfilled' && Array.isArray(liJobs.value)) {
        freshBatch.push(...liJobs.value);
        this.platformHealth.linkedin = {
          status: liJobs.value.length > 0 ? 'live' : 'degraded',
          lastPollAt: this.lastPolledAt,
          lastError: null,
          jobsFoundLastPoll: liJobs.value.length,
        };
      } else {
        const errMsg =
          liJobs.status === 'rejected' ? liJobs.reason?.message || 'Unknown error' : 'No results';
        this.platformHealth.linkedin = {
          status: 'down',
          lastPollAt: this.lastPolledAt,
          lastError: errMsg,
          jobsFoundLastPoll: 0,
        };
      }
      if (nkJobs.status === 'fulfilled' && Array.isArray(nkJobs.value)) {
        freshBatch.push(...nkJobs.value);
        this.platformHealth.naukri = {
          status: nkJobs.value.length > 0 ? 'live' : 'degraded',
          lastPollAt: this.lastPolledAt,
          lastError: null,
          jobsFoundLastPoll: nkJobs.value.length,
        };
      } else {
        const errMsg =
          nkJobs.status === 'rejected' ? nkJobs.reason?.message || 'Unknown error' : 'No results';
        this.platformHealth.naukri = {
          status: 'down',
          lastPollAt: this.lastPolledAt,
          lastError: errMsg,
          jobsFoundLastPoll: 0,
        };
      }

      const verifiedBatch = validateAndFilterJobs(freshBatch);
      const db = getDb();
      for (const job of verifiedBatch) {
        try {
          db.insert(jobs)
            .values({
              id: job.id,
              sourcePlatform: job.source,
              externalId: job.id,
              title: job.title || '',
              company: job.company || '',
              location: job.location || '',
              postedAt: job.postedDate || job.postedAt,
              applicantCount: typeof job.applicantCount === 'number' ? job.applicantCount : null,
              url: job.url || '',
              rawJd: typeof job.description === 'string' ? job.description : null,
            })
            .run();
          newlyDiscovered.push(job);
        } catch (err: any) {
          // Unique constraint error expected if job already seen
        }
      }

      if (newlyDiscovered.length > 0) {
        this.newJobsInLastHour += newlyDiscovered.length;

        // Emit real-time notification
        this.emit('new_jobs', {
          count: newlyDiscovered.length,
          timestamp: this.lastPolledAt,
          jobs: newlyDiscovered,
          message: `⚡ ${newlyDiscovered.length} new postings detected in real-time (${query} in ${loc})!`,
        });
      }
    } catch (err: any) {
      console.warn('[realtime-monitor] error during poll cycle:', err.message);
    }

    return {
      newCount: newlyDiscovered.length,
      totalCount: this.getCachedJobs().length,
    };
  }
}

export const realtimeMonitor = new RealtimeJobMonitor();

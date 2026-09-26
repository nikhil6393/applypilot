import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { upsertJob } from '../store/jobs.js';
import type { JobPosting, JobSource, ScrapeRequest, ScrapeSummary } from '../../shared/types.js';
import { linkedinRealtime } from './linkedin-realtime.js';
import { naukriAdvanced } from './naukri-advanced.js';
import { greenhouse } from './greenhouse.js';
import { lever } from './lever.js';
import { ashby } from './ashby.js';
import { freehire } from './freehire.js';
import { remotive } from './remotive.js';
import { himalayas } from './himalayas.js';
import { jobicy } from './jobicy.js';
import { remoteok } from './remoteok.js';
import { arbeitnow } from './arbeitnow.js';
import { weworkremotely } from './weworkremotely.js';
import { yc } from './yc.js';
import { internshala } from './internshala.js';
import { unstop } from './unstop.js';
import { simplifyJobs } from './simplify-jobs.js';
import { linkedinSearchDork } from './linkedin-dork.js';
import { config } from '../config.js';
import { filterJobsForRequest } from './normalize.js';
import { scrapeCache } from './cache.js';

type ScraperFn = (req: ScrapeRequest) => Promise<JobPosting[]>;

const ALL_SCRAPERS: Record<JobSource, ScraperFn> = {
  linkedin: linkedinRealtime,
  naukari: naukriAdvanced,
  greenhouse,
  lever,
  ashby,
  freehire,
  remotive,
  himalayas,
  jobicy,
  remoteok,
  arbeitnow,
  weworkremotely,
  yc,
  internshala,
  unstop,
  simplify_jobs: simplifyJobs,
  linkedin_dork: linkedinSearchDork,
  manual: async () => [],
};

const DEFAULT_SOURCES: JobSource[] = [
  'arbeitnow',
  'linkedin',
  'internshala',
  'unstop',
  'simplify_jobs',
  'remoteok',
  'weworkremotely',
  'yc',
  'greenhouse',
  'lever',
  'ashby',
  'freehire',
  'remotive',
  'himalayas',
  'jobicy',
  'naukari',
];

export interface BackgroundScraperStatus {
  running: boolean;
  backgroundActive: boolean;
  intervalMs: number;
  lastRunAt: string | null;
  totalRuns: number;
  totalDiscovered: number;
  activeSources: JobSource[];
  cacheStats: { size: number; hits: number; misses: number; hitRate: number };
}

class ScrapeOrchestrator extends EventEmitter {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private currentIntervalMs = 3 * 60 * 1000; // 3 minute background cycle
  private lastRunAt: string | null = null;
  private totalRuns = 0;
  private totalDiscovered = 0;

  start(intervalMs?: number) {
    if (intervalMs && intervalMs > 10000) {
      this.currentIntervalMs = intervalMs;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Schedule periodic background scraper
    this.timer = setInterval(
      () => {
        this.scrapeOnce({})
          .then((summary) => {
            this.emit('background_cycle', summary);
          })
          .catch((e) => console.warn('[scrape] background interval failed:', e.message));
      },
      this.currentIntervalMs
    );
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  isRunning() {
    return this.running;
  }

  getStatus(): BackgroundScraperStatus {
    return {
      running: this.running,
      backgroundActive: this.timer !== null,
      intervalMs: this.currentIntervalMs,
      lastRunAt: this.lastRunAt,
      totalRuns: this.totalRuns,
      totalDiscovered: this.totalDiscovered,
      activeSources: DEFAULT_SOURCES,
      cacheStats: scrapeCache.getStats(),
    };
  }

  async scrapeOnce(req: ScrapeRequest): Promise<ScrapeSummary> {
    if (this.running) {
      return {
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        totalFound: 0,
        newJobs: 0,
        perSource: {} as ScrapeSummary['perSource'],
      };
    }
    this.running = true;
    this.lastRunAt = new Date().toISOString();
    this.totalRuns++;

    const startedAt = this.lastRunAt;
    const sources = (req.sources && req.sources.length > 0 ? req.sources : DEFAULT_SOURCES).filter(
      (s) => s !== 'manual'
    );
    const perSource: ScrapeSummary['perSource'] = {} as ScrapeSummary['perSource'];
    let totalFound = 0;
    let newJobs = 0;

    const queue = sources.slice();
    const workers: Array<Promise<void>> = [];
    // Enhanced concurrency up to 10 for 2x faster multi-source collection
    const concurrency = Math.max(1, Math.min(10, config.scrapeConcurrency || 8));

    const runOne = async (source: JobSource) => {
      const fn = ALL_SCRAPERS[source];
      if (!fn) return;

      const stat: { found: number; new: number; error?: string } = { found: 0, new: 0 };
      const cacheKey = scrapeCache.generateKey(source, req);

      try {
        // Fast path: Check in-memory TTL cache first
        const cached = scrapeCache.get(cacheKey);
        let jobs: JobPosting[];

        if (cached && cached.length > 0) {
          jobs = cached;
        } else {
          const timeoutMs = Math.max(45000, config.scrapeTimeoutMs || 30000);
          jobs = await Promise.race([
            fn(req),
            new Promise<JobPosting[]>((_, rej) =>
              setTimeout(() => rej(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs)
            ),
          ]);
          if (Array.isArray(jobs) && jobs.length > 0) {
            scrapeCache.set(cacheKey, jobs);
          }
        }

        const matchingJobs = filterJobsForRequest(jobs, req);
        stat.found = matchingJobs.length;

        for (const j of matchingJobs) {
          if (!j.id) j.id = randomUUID();
          if (!j.fetchedAt) j.fetchedAt = new Date().toISOString();
          const r = upsertJob(j);
          if (r.inserted) {
            stat.new += 1;
            this.totalDiscovered++;
            this.emit('new', j);
          }
        }
      } catch (err) {
        stat.error = (err as Error).message;
      } finally {
        perSource[source] = stat;
      }
    };

    for (let i = 0; i < concurrency; i++) {
      workers.push(
        (async () => {
          while (queue.length > 0) {
            const s = queue.shift()!;
            await runOne(s);
          }
        })()
      );
    }
    await Promise.all(workers);

    for (const s of sources) totalFound += perSource[s]?.found ?? 0;
    for (const s of sources) newJobs += perSource[s]?.new ?? 0;

    const summary: ScrapeSummary = {
      startedAt,
      finishedAt: new Date().toISOString(),
      totalFound,
      newJobs,
      perSource,
    };
    this.emit('summary', summary);
    this.running = false;
    return summary;
  }
}

export const scrapeOrchestrator = new ScrapeOrchestrator();

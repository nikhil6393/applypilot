import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { JobQueue, QueueJob, JobOptions, WorkerHandler, QueueMetrics } from './types.js';

export class MemoryJobQueue extends EventEmitter implements JobQueue {
  readonly name: string;
  private jobs: Map<string, QueueJob> = new Map();
  private idempotencyKeys: Map<string, string> = new Map(); // key -> jobId
  private waitingQueue: string[] = [];
  private handlers: Map<string, { concurrency: number; activeCount: number; handler: WorkerHandler }> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private isClosed = false;

  constructor(name: string) {
    super();
    this.name = name;
    this.processingInterval = setInterval(() => {
      this.tick();
    }, 50);
  }

  async enqueue<T = any>(jobName: string, data: T, opts: JobOptions = {}): Promise<QueueJob<T>> {
    if (this.isClosed) {
      throw new Error(`Queue ${this.name} is closed`);
    }

    const defaultOpts: Required<JobOptions> = {
      attempts: opts.attempts ?? 3,
      backoffMs: opts.backoffMs ?? 200,
      maxBackoffMs: opts.maxBackoffMs ?? 5000,
      jitter: opts.jitter ?? true,
      priority: opts.priority ?? 0,
      idempotencyKey: opts.idempotencyKey ?? '',
    };

    if (defaultOpts.idempotencyKey) {
      const existingJobId = this.idempotencyKeys.get(defaultOpts.idempotencyKey);
      if (existingJobId) {
        const existingJob = this.jobs.get(existingJobId);
        if (existingJob && (existingJob.status === 'waiting' || existingJob.status === 'active')) {
          return existingJob as QueueJob<T>;
        }
      }
    }

    const job: QueueJob<T> = {
      id: randomUUID(),
      name: jobName,
      data,
      opts: defaultOpts,
      attemptsMade: 0,
      status: 'waiting',
      createdAt: Date.now(),
    };

    this.jobs.set(job.id, job);
    if (defaultOpts.idempotencyKey) {
      this.idempotencyKeys.set(defaultOpts.idempotencyKey, job.id);
    }
    this.waitingQueue.push(job.id);

    return job;
  }

  process<T = any, R = any>(jobName: string, concurrency: number, handler: WorkerHandler<T, R>): void {
    this.handlers.set(jobName, {
      concurrency: Math.max(1, concurrency),
      activeCount: 0,
      handler,
    });
  }

  private tick(): void {
    if (this.isClosed || this.waitingQueue.length === 0) return;

    for (let i = 0; i < this.waitingQueue.length; i++) {
      const jobId = this.waitingQueue[i];
      const job = this.jobs.get(jobId);
      if (!job || job.status !== 'waiting') {
        this.waitingQueue.splice(i, 1);
        i--;
        continue;
      }

      const registered = this.handlers.get(job.name);
      if (!registered) continue;

      if (registered.activeCount < registered.concurrency) {
        this.waitingQueue.splice(i, 1);
        i--;
        this.runJob(job, registered);
      }
    }
  }

  private async runJob(
    job: QueueJob,
    registered: { concurrency: number; activeCount: number; handler: WorkerHandler }
  ): Promise<void> {
    registered.activeCount++;
    job.status = 'active';
    job.attemptsMade++;
    job.processedAt = Date.now();

    try {
      const result = await registered.handler(job);
      job.status = 'completed';
      job.finishedAt = Date.now();
      this.emit('completed', job, result);
    } catch (err: any) {
      job.error = err.message || 'Worker failure';

      if (job.attemptsMade < job.opts.attempts) {
        let delay = job.opts.backoffMs * Math.pow(2, job.attemptsMade - 1);
        if (job.opts.jitter) {
          delay = Math.round(delay * (0.5 + Math.random() * 0.5));
        }
        delay = Math.min(delay, job.opts.maxBackoffMs);

        job.status = 'waiting';
        this.emit('retrying', job, delay);

        setTimeout(() => {
          if (!this.isClosed && job.status === 'waiting') {
            this.waitingQueue.push(job.id);
          }
        }, delay);
      } else {
        job.status = 'failed';
        job.finishedAt = Date.now();
        this.emit('failed', job, err);
      }
    } finally {
      registered.activeCount = Math.max(0, registered.activeCount - 1);
    }
  }

  async getMetrics(): Promise<QueueMetrics> {
    let waiting = 0;
    let active = 0;
    let completed = 0;
    let failed = 0;

    for (const j of this.jobs.values()) {
      if (j.status === 'waiting') waiting++;
      else if (j.status === 'active') active++;
      else if (j.status === 'completed') completed++;
      else if (j.status === 'failed') failed++;
    }

    return { waiting, active, completed, failed };
  }

  async clear(): Promise<void> {
    this.waitingQueue = [];
    this.jobs.clear();
    this.idempotencyKeys.clear();
  }

  async close(): Promise<void> {
    this.isClosed = true;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

import { EventEmitter } from 'events';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface TailoredVersionResult {
  jobId: string;
  status: JobStatus;
  atsScore?: number;
  matchScore?: number;
  tailoredResume?: any;
  error?: string;
}

export interface BulkTailorBatch {
  batchId: string;
  resumeId: string;
  baseResume: any;
  jobs: any[]; // The target jobs
  results: Record<string, TailoredVersionResult>;
  createdAt: number;
}

class BulkTailorManager extends EventEmitter {
  private batches: Map<string, BulkTailorBatch> = new Map();
  private concurrencyLimit = 3;

  createBatch(batchId: string, resumeId: string, baseResume: any, jobs: any[]): BulkTailorBatch {
    const batch: BulkTailorBatch = {
      batchId,
      resumeId,
      baseResume,
      jobs,
      results: {},
      createdAt: Date.now(),
    };

    for (const job of jobs) {
      batch.results[job.id] = {
        jobId: job.id,
        status: 'queued',
      };
    }

    this.batches.set(batchId, batch);
    return batch;
  }

  getBatch(batchId: string): BulkTailorBatch | undefined {
    return this.batches.get(batchId);
  }

  updateJobStatus(
    batchId: string,
    jobId: string,
    status: JobStatus,
    updates: Partial<TailoredVersionResult> = {}
  ) {
    const batch = this.batches.get(batchId);
    if (!batch) return;

    const result = batch.results[jobId];
    if (result) {
      Object.assign(result, { status, ...updates });
      this.emit(`batch:${batchId}`, { type: 'update', jobId, result });
    }
  }

  async processBatch(batchId: string, tailorFn: (job: any, baseResume: any) => Promise<any>) {
    const batch = this.batches.get(batchId);
    if (!batch) return;

    const queue = [...batch.jobs];

    // In-memory concurrency bounded worker
    const worker = async () => {
      while (queue.length > 0) {
        const job = queue.shift();
        if (!job) break;

        this.updateJobStatus(batchId, job.id, 'processing');
        try {
          // Process job using the provided tailoring function
          const result = await tailorFn(job, batch.baseResume);
          this.updateJobStatus(batchId, job.id, 'completed', result);
        } catch (error: any) {
          this.updateJobStatus(batchId, job.id, 'failed', {
            error: error.message || 'Tailoring failed',
          });
        }
      }
    };

    const workers = Array.from({ length: Math.min(this.concurrencyLimit, batch.jobs.length) }, () =>
      worker()
    );
    await Promise.all(workers);
    this.emit(`batch:${batchId}`, { type: 'batch_complete', batchId });
  }
}

export const bulkTailorQueue = new BulkTailorManager();

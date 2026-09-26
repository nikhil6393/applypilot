export interface JobOptions {
  attempts?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  jitter?: boolean;
  priority?: number;
  idempotencyKey?: string;
}

export interface QueueJob<T = any> {
  id: string;
  name: string;
  data: T;
  opts: Required<JobOptions>;
  attemptsMade: number;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  error?: string;
  createdAt: number;
  processedAt?: number;
  finishedAt?: number;
}

export type WorkerHandler<T = any, R = any> = (job: QueueJob<T>) => Promise<R>;

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface JobQueue {
  name: string;
  enqueue<T = any>(jobName: string, data: T, opts?: JobOptions): Promise<QueueJob<T>>;
  process<T = any, R = any>(jobName: string, concurrency: number, handler: WorkerHandler<T, R>): void;
  getMetrics(): Promise<QueueMetrics>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

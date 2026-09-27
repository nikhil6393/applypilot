import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryJobQueue } from '../queue/memory-queue.js';
import { logMonitorRun, listRecentMonitorRuns } from '../store/monitoring.js';
describe('Phase 4 Queue & Worker Architecture', () => {
    let queue;
    beforeEach(() => {
        queue = new MemoryJobQueue('test-queue');
    });
    afterEach(async () => {
        await queue.close();
    });
    describe('Job Enqueue & Processing', () => {
        it('enqueues and executes a job with worker handler', async () => {
            let executed = false;
            queue.process('sample:job', 1, async (job) => {
                expect(job.data.msg).toBe('hello world');
                executed = true;
                return { success: true };
            });
            const job = await queue.enqueue('sample:job', { msg: 'hello world' });
            expect(job.status).toBe('waiting');
            // Wait for tick
            await new Promise((r) => setTimeout(r, 120));
            expect(executed).toBe(true);
            const metrics = await queue.getMetrics();
            expect(metrics.completed).toBe(1);
            expect(metrics.failed).toBe(0);
        });
        it('deduplicates identical jobs using idempotencyKey', async () => {
            let callCount = 0;
            queue.process('dedupe:job', 1, async () => {
                callCount++;
                await new Promise((r) => setTimeout(r, 100));
                return 'done';
            });
            const job1 = await queue.enqueue('dedupe:job', { id: 1 }, { idempotencyKey: 'idemp-123' });
            const job2 = await queue.enqueue('dedupe:job', { id: 1 }, { idempotencyKey: 'idemp-123' });
            expect(job1.id).toBe(job2.id);
            await new Promise((r) => setTimeout(r, 200));
            expect(callCount).toBe(1);
        });
        it('retries failing jobs up to configured attempts with exponential backoff and jitter', async () => {
            let attempts = 0;
            const retryDelays = [];
            queue.on('retrying', (_job, delay) => {
                retryDelays.push(delay);
            });
            queue.process('failing:job', 1, async () => {
                attempts++;
                if (attempts < 3) {
                    throw new Error(`Attempt ${attempts} failed`);
                }
                return 'success on attempt 3';
            });
            await queue.enqueue('failing:job', {}, { attempts: 3, backoffMs: 50, maxBackoffMs: 500, jitter: true });
            // Wait for 3 attempts with backoff (poll up to 1200ms)
            for (let i = 0; i < 24; i++) {
                if (attempts >= 3)
                    break;
                await new Promise((r) => setTimeout(r, 50));
            }
            expect(attempts).toBe(3);
            expect(retryDelays.length).toBe(2);
            const metrics = await queue.getMetrics();
            expect(metrics.completed).toBe(1);
        });
        it('marks job as failed when attempts are exhausted', async () => {
            queue.process('always:fail', 1, async () => {
                throw new Error('Fatal failure');
            });
            await queue.enqueue('always:fail', {}, { attempts: 2, backoffMs: 20 });
            for (let i = 0; i < 15; i++) {
                const m = await queue.getMetrics();
                if (m.failed >= 1)
                    break;
                await new Promise((r) => setTimeout(r, 50));
            }
            const metrics = await queue.getMetrics();
            expect(metrics.failed).toBe(1);
        });
    });
    describe('Job-Run Logging & Audit (monitor_runs)', () => {
        it('records and lists monitor runs in durable storage', () => {
            const run = logMonitorRun({
                source: 'greenhouse',
                status: 'completed',
                jobsFound: 15,
                jobsInserted: 3,
                durationMs: 450,
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
            });
            expect(run.id).toBeDefined();
            expect(run.source).toBe('greenhouse');
            const recent = listRecentMonitorRuns(10);
            expect(recent.length).toBeGreaterThanOrEqual(1);
            const found = recent.find((r) => r.id === run.id);
            expect(found).toBeDefined();
            expect(found?.jobsFound).toBe(15);
            expect(found?.jobsInserted).toBe(3);
            expect(found?.durationMs).toBe(450);
        });
    });
});

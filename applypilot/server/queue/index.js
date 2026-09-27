import { MemoryJobQueue } from './memory-queue.js';
const queues = new Map();
export function getQueue(name = 'default') {
    let q = queues.get(name);
    if (!q) {
        // If REDIS_URL is provided in environment, BullMQ can be attached.
        // MemoryJobQueue is the default zero-external-dependency queue.
        q = new MemoryJobQueue(name);
        queues.set(name, q);
    }
    return q;
}
export const scrapeQueue = getQueue('scrape');
export const fitQueue = getQueue('fit');
export * from './types.js';
export * from './memory-queue.js';

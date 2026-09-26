import { createHash } from 'node:crypto';
import type { JobPosting, ScrapeRequest } from '../../shared/types.js';

interface CacheEntry {
  data: JobPosting[];
  expiresAt: number;
  cachedAt: number;
}

class ScrapeCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTtlMs: number = 3 * 60 * 1000; // 3 minutes TTL default
  private maxEntries: number = 250;
  private hits: number = 0;
  private misses: number = 0;

  constructor(ttlMs?: number) {
    if (ttlMs && ttlMs > 0) {
      this.defaultTtlMs = ttlMs;
    }
  }

  generateKey(source: string, req: ScrapeRequest): string {
    const raw = [
      source.toLowerCase(),
      (req.query || '').trim().toLowerCase(),
      (req.location || '').trim().toLowerCase(),
      req.timeWindow || '24h',
      req.postedWithinHours || 0,
      req.remoteOnly ? 'remote' : 'all',
      req.internshipsOnly ? 'intern' : 'all',
      req.jobType || 'any',
      req.maxPerSource || 25,
    ].join('::');

    return `scrape_${createHash('sha1').update(raw).digest('hex').slice(0, 20)}`;
  }

  get(key: string): JobPosting[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  set(key: string, jobs: JobPosting[], customTtlMs?: number): void {
    if (!Array.isArray(jobs) || jobs.length === 0) return;

    // Prune if exceeded max entries
    if (this.cache.size >= this.maxEntries) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (v.expiresAt <= now) {
          this.cache.delete(k);
        }
      }
      // If still full, remove oldest
      if (this.cache.size >= this.maxEntries) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
    }

    const ttl = customTtlMs ?? this.defaultTtlMs;
    const now = Date.now();
    this.cache.set(key, {
      data: jobs,
      expiresAt: now + ttl,
      cachedAt: now,
    });
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? Math.round((this.hits / total) * 100) / 100 : 0;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }
}

export const scrapeCache = new ScrapeCache();

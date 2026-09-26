import type { JobSource } from '@applypilot/domain';
import type { JobSourceAdapter, HealthStatus, SearchQuery, RawJob } from './types.js';

export class AdapterRegistry {
  private adapters: Map<JobSource, JobSourceAdapter> = new Map();

  register(adapter: JobSourceAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(source: JobSource): JobSourceAdapter | undefined {
    return this.adapters.get(source);
  }

  getAll(): JobSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  getRegisteredSources(): JobSource[] {
    return Array.from(this.adapters.keys());
  }

  async healthCheckAll(): Promise<HealthStatus[]> {
    const results = await Promise.allSettled(
      this.getAll().map((a) => a.healthCheck())
    );

    return results.map((res, index) => {
      if (res.status === 'fulfilled') return res.value;
      const adapter = this.getAll()[index];
      return {
        source: adapter.id,
        status: 'down',
        latencyMs: 0,
        consecutiveFailures: 5,
        lastSuccessAt: null,
        lastFailureAt: new Date().toISOString(),
        lastError: res.reason?.message || 'Health check error',
        checkedAt: new Date().toISOString(),
      };
    });
  }
}

export const defaultRegistry = new AdapterRegistry();

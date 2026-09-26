import { z } from 'zod';
import type { LocalAIProvider, LocalAIHealth, LocalAIOptions, LocalAIChatMessage } from './types.js';
import { OllamaLocalAIProvider, type OllamaConfig } from './ollama.provider.js';
import { HeuristicLocalAIProvider } from './heuristic.provider.js';

export class LocalAIClient implements LocalAIProvider {
  readonly name = 'local-ai-client';
  private ollama: OllamaLocalAIProvider;
  private heuristic: HeuristicLocalAIProvider;
  private cachedHealth: LocalAIHealth | null = null;
  private lastHealthCheckTime = 0;

  constructor(config: OllamaConfig = {}) {
    this.ollama = new OllamaLocalAIProvider(config);
    this.heuristic = new HeuristicLocalAIProvider();
  }

  async checkHealth(forceRefresh = false): Promise<LocalAIHealth> {
    const now = Date.now();
    // Cache health check for 10 seconds to avoid spamming the daemon
    if (!forceRefresh && this.cachedHealth && now - this.lastHealthCheckTime < 10000) {
      return this.cachedHealth;
    }

    const health = await this.ollama.checkHealth();
    if (health.available) {
      this.cachedHealth = health;
    } else {
      this.cachedHealth = {
        available: true, // System is still fully functional via heuristic fallback
        provider: 'heuristic',
        models: ['deterministic-fallback'],
        latencyMs: health.latencyMs,
        error: health.error,
      };
    }
    this.lastHealthCheckTime = now;
    return this.cachedHealth;
  }

  private async getActiveProvider(): Promise<LocalAIProvider> {
    const health = await this.checkHealth();
    if (health.provider === 'ollama') {
      return this.ollama;
    }
    return this.heuristic;
  }

  async complete(prompt: string, opts?: LocalAIOptions): Promise<string> {
    const provider = await this.getActiveProvider();
    try {
      return await provider.complete(prompt, opts);
    } catch {
      // Fallback to heuristic on failure
      return this.heuristic.complete(prompt, opts);
    }
  }

  async chat(messages: LocalAIChatMessage[], opts?: LocalAIOptions): Promise<string> {
    const provider = await this.getActiveProvider();
    try {
      return await provider.chat(messages, opts);
    } catch {
      return this.heuristic.chat(messages, opts);
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    opts?: LocalAIOptions
  ): Promise<T> {
    const provider = await this.getActiveProvider();
    try {
      return await provider.generateStructured(prompt, schema, opts);
    } catch {
      return this.heuristic.generateStructured(prompt, schema, opts);
    }
  }
}

export const defaultLocalAI = new LocalAIClient();

import { z } from 'zod';
import type { LocalAIProvider, LocalAIHealth, LocalAIOptions, LocalAIChatMessage } from './types.js';

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export class OllamaLocalAIProvider implements LocalAIProvider {
  readonly name = 'ollama';
  private baseUrl: string;
  private defaultModel: string;
  private defaultTimeoutMs: number;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    this.defaultModel = config.model || process.env.OLLAMA_MODEL || 'llama3.2:latest';
    this.defaultTimeoutMs = config.timeoutMs || 15000;
  }

  async checkHealth(): Promise<LocalAIHealth> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500); // Quick 1.5s check

    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        return {
          available: false,
          provider: 'ollama',
          models: [],
          latencyMs,
          error: `Ollama returned status ${res.status}`,
        };
      }

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = (data.models || []).map((m) => m.name);

      return {
        available: true,
        provider: 'ollama',
        models,
        selectedModel: this.defaultModel,
        latencyMs,
      };
    } catch (err: any) {
      clearTimeout(timer);
      return {
        available: false,
        provider: 'ollama',
        models: [],
        latencyMs: Date.now() - startTime,
        error: err.name === 'AbortError' ? 'Ollama connection timed out (is Ollama running?)' : err.message,
      };
    }
  }

  async complete(prompt: string, opts: LocalAIOptions = {}): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs || this.defaultTimeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.defaultModel,
          prompt,
          system: opts.system,
          stream: false,
          options: {
            temperature: opts.temperature ?? 0.3,
            num_predict: opts.maxTokens ?? 512,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`Ollama generation failed: HTTP ${res.status}`);
      }

      const data = (await res.json()) as { response?: string };
      return data.response?.trim() || '';
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Ollama completion error: ${err.message}`);
    }
  }

  async chat(messages: LocalAIChatMessage[], opts: LocalAIOptions = {}): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs || this.defaultTimeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.defaultModel,
          messages,
          stream: false,
          options: {
            temperature: opts.temperature ?? 0.3,
            num_predict: opts.maxTokens ?? 512,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`Ollama chat failed: HTTP ${res.status}`);
      }

      const data = (await res.json()) as { message?: { content?: string } };
      return data.message?.content?.trim() || '';
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Ollama chat error: ${err.message}`);
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    opts: LocalAIOptions = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs || this.defaultTimeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.defaultModel,
          prompt,
          system: (opts.system ? opts.system + '\n' : '') + 'Respond in valid JSON only.',
          format: 'json',
          stream: false,
          options: {
            temperature: opts.temperature ?? 0.2,
            num_predict: opts.maxTokens ?? 512,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`Ollama structured generation failed: HTTP ${res.status}`);
      }

      const data = (await res.json()) as { response?: string };
      const rawText = data.response?.trim() || '{}';
      const parsed = JSON.parse(rawText);
      return schema.parse(parsed);
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Ollama structured validation failed: ${err.message}`);
    }
  }
}

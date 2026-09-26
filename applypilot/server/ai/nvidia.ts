import { config } from '../config.js';
import type { AIProvider } from './provider.js';

const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_DEFAULT_MODEL = 'meta/llama-3.3-70b-instruct';

export class NvidiaProvider implements AIProvider {
  name = 'nvidia' as const;
  private model: string;

  constructor(model = NVIDIA_DEFAULT_MODEL) {
    this.model = model;
  }

  get available(): boolean {
    return this.isConfigured();
  }

  isConfigured() {
    const key = process.env.NVIDIA_API_KEY !== undefined ? process.env.NVIDIA_API_KEY : config.nvidiaApiKey;
    return Boolean(key && key.trim().length > 0);
  }

  async complete(
    prompt: string,
    opts: { maxTokens?: number; temperature?: number; system?: string } = {}
  ): Promise<string> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({ role: 'user', content: prompt });
    return (await this.chat(messages, opts)) ?? '';
  }

  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    opts: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string | null> {
    if (!this.isConfigured()) return null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(NVIDIA_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.nvidiaApiKey.trim()}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: opts.maxTokens ?? 1024,
          temperature: opts.temperature ?? 0.4,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[nvidia] API error (${res.status}): ${await res.text()}`);
        return null;
      }

      const data = await res.json();
      return data?.choices?.[0]?.message?.content ?? null;
    } catch (err) {
      console.warn('[nvidia] chat failed:', (err as Error).message);
      return null;
    }
  }
}

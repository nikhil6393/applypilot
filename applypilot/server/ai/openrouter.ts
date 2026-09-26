import { config } from '../config.js';
import type { AIProvider } from './provider.js';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 6000; // 6s fast timeout with immediate fallback

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter' as const;
  private model: string;

  constructor(model?: string) {
    // Read from config at construction time — config reads from dotenv
    this.model = model || config.openRouterModel || 'meta-llama/llama-3.3-70b-instruct';
  }

  get available(): boolean {
    return this.isConfigured();
  }

  isConfigured() {
    const key = process.env.OPENROUTER_API_KEY !== undefined ? process.env.OPENROUTER_API_KEY : config.openRouterApiKey;
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
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(OPENROUTER_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openRouterApiKey.trim()}`,
          'HTTP-Referer': 'https://applypilot.local',
          'X-Title': 'ApplyPilot',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: opts.maxTokens ?? 1024,
          temperature: opts.temperature ?? 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[openrouter] API error (${res.status}): ${errText}`);
        return null;
      }

      const data = await res.json();
      return data?.choices?.[0]?.message?.content ?? null;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn('[openrouter] Request timed out after 30s');
      } else {
        console.warn('[openrouter] chat failed:', err.message);
      }
      return null;
    }
  }
}

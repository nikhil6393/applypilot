import type { AIProvider } from './provider.js';
import { HeuristicProvider } from './heuristic.js';
import { NvidiaProvider } from './nvidia.js';
import { OpenRouterProvider } from './openrouter.js';
import { config } from '../config.js';
import { defaultLocalAI } from '@applypilot/ai-local';

export class LocalOllamaProvider implements AIProvider {
  name = 'ollama' as const;
  get available(): boolean {
    return true;
  }
  async complete(
    prompt: string,
    opts: { maxTokens?: number; temperature?: number; system?: string } = {}
  ): Promise<string> {
    const health = await defaultLocalAI.checkHealth();
    if (health.provider !== 'ollama') {
      throw new Error('Local Ollama instance not active, cascading to next AI provider');
    }
    return defaultLocalAI.complete(prompt, opts);
  }
  async chat(
    messages: Array<{ role: string; content: string }>,
    opts: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string | null> {
    const health = await defaultLocalAI.checkHealth();
    if (health.provider !== 'ollama') {
      throw new Error('Local Ollama instance not active, cascading to next AI provider');
    }
    return defaultLocalAI.chat(messages as any, opts);
  }
}

let cachedChain: AIProvider[] | null = null;

export function getProviderChain(): AIProvider[] {
  if (cachedChain && cachedChain.length > 0) {
    return cachedChain;
  }
  const chain: AIProvider[] = [];
  const openRouterKey = process.env.OPENROUTER_API_KEY ?? (process.env.NODE_ENV === 'test' ? '' : config.openRouterApiKey);
  const nvidiaKey = process.env.NVIDIA_API_KEY ?? (process.env.NODE_ENV === 'test' ? '' : config.nvidiaApiKey);

  // Local AI (Ollama) is available when not in test mode, or if OLLAMA_BASE_URL is explicitly set
  if (process.env.NODE_ENV !== 'test' || process.env.OLLAMA_BASE_URL) {
    chain.push(new LocalOllamaProvider());
  }

  if (openRouterKey && openRouterKey.trim().length > 0) chain.push(new OpenRouterProvider());
  if (nvidiaKey && nvidiaKey.trim().length > 0) chain.push(new NvidiaProvider());
  chain.push(new HeuristicProvider());
  cachedChain = chain;
  return cachedChain;
}

export function checkLocalAIHealth() {
  return defaultLocalAI.checkHealth();
}

export function invalidateProviderChain(): void {
  cachedChain = null;
}

// Alias for backwards compatibility
export function resetProviderChain(): void {
  invalidateProviderChain();
}

export async function bestEffortComplete(
  prompt: string,
  opts: { maxTokens?: number; temperature?: number; system?: string } = {}
): Promise<{ source: AIProvider['name']; text: string }> {
  for (const p of getProviderChain()) {
    try {
      const text = await p.complete(prompt, opts);
      if (text && text.trim().length > 0) return { source: p.name, text };
    } catch (err) {
      console.warn(`[ai] ${p.name} failed:`, (err as Error).message);
    }
  }
  return { source: 'heuristic', text: '' };
}

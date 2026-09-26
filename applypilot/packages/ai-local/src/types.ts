import { z } from 'zod';

export interface LocalAIHealth {
  available: boolean;
  provider: 'ollama' | 'llamacpp' | 'heuristic';
  models: string[];
  selectedModel?: string;
  latencyMs: number;
  error?: string;
}

export interface LocalAIOptions {
  temperature?: number;
  maxTokens?: number;
  system?: string;
  timeoutMs?: number;
}

export interface LocalAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LocalAIProvider {
  readonly name: string;
  checkHealth(): Promise<LocalAIHealth>;
  complete(prompt: string, opts?: LocalAIOptions): Promise<string>;
  chat(messages: LocalAIChatMessage[], opts?: LocalAIOptions): Promise<string>;
  generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    opts?: LocalAIOptions
  ): Promise<T>;
}

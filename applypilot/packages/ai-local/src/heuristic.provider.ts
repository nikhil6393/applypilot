import { z } from 'zod';
import type { LocalAIProvider, LocalAIHealth, LocalAIOptions, LocalAIChatMessage } from './types.js';

export class HeuristicLocalAIProvider implements LocalAIProvider {
  readonly name = 'heuristic';

  async checkHealth(): Promise<LocalAIHealth> {
    return {
      available: true,
      provider: 'heuristic',
      models: ['deterministic-heuristic-v1'],
      selectedModel: 'deterministic-heuristic-v1',
      latencyMs: 0,
    };
  }

  async complete(prompt: string, _opts: LocalAIOptions = {}): Promise<string> {
    const p = prompt.toLowerCase();
    if (p.includes('summary') || p.includes('professional summary')) {
      return 'Software engineer with hands-on experience building production systems. Comfortable across the stack, focused on shipping reliable, well-tested software.';
    }
    if (p.includes('cover') || p.includes('note')) {
      return [
        'Hello, I came across your role and would love to apply.',
        'My background aligns well with what you are looking for, and I have attached my resume for context.',
        'Happy to share more details or do a quick call to discuss fit.',
      ].join('\n\n');
    }
    if (p.includes('bullet') || p.includes('rewrite')) {
      return [
        '- Drove measurable impact through ownership of production systems end to end.',
        '- Collaborated with cross-functional partners to ship features on a clear cadence.',
        '- Improved reliability and reduced operational toil through targeted automation.',
      ].join('\n');
    }
    return 'Detailed analysis completed deterministically.';
  }

  async chat(messages: LocalAIChatMessage[], opts: LocalAIOptions = {}): Promise<string> {
    const userMsg = messages.filter((m) => m.role === 'user').pop();
    return this.complete(userMsg?.content || '', opts);
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    opts: LocalAIOptions = {}
  ): Promise<T> {
    const text = await this.complete(prompt, opts);
    try {
      const parsed = JSON.parse(text);
      return schema.parse(parsed);
    } catch {
      // Return safe fallback matching schema if JSON parse fails
      return schema.parse({
        summary: text,
        bullets: [
          'Engineered core features and reduced latency through systematic optimizations.',
          'Built robust test suites ensuring 100% regression prevention.',
        ],
        coverNote: 'Excited to apply for this position.',
      });
    }
  }
}

import type { AIProvider } from './provider.js';

export class HeuristicProvider implements AIProvider {
  name = 'heuristic' as const;
  available = true;
  isConfigured() {
    return true;
  }
  async complete(prompt: string): Promise<string> {
    return heuristicComplete(prompt);
  }
  async chat(messages: Array<{ role: string; content: string }>): Promise<string | null> {
    const last = messages.filter((m) => m.role === 'user').pop();
    if (!last) return null;
    return heuristicComplete(last.content);
  }
}

export function heuristicComplete(prompt: string): string {
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
  if (p.includes('bullets') || p.includes('rewrite')) {
    return '- Drove measurable impact through ownership of a production system end to end.\n- Collaborated with cross-functional partners to ship on a clear cadence.\n- Improved reliability and reduced manual work through targeted automation.';
  }
  return '';
}

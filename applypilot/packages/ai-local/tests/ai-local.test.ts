import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  HeuristicLocalAIProvider,
  OllamaLocalAIProvider,
  LocalAIClient,
  defaultLocalAI,
} from '../src/index.js';

describe('Phase 6 — Local AI Engine (@applypilot/ai-local)', () => {
  describe('HeuristicLocalAIProvider (Zero-Dependency Offline Baseline)', () => {
    const provider = new HeuristicLocalAIProvider();

    it('reports health as 100% available with zero latency', async () => {
      const health = await provider.checkHealth();
      expect(health.available).toBe(true);
      expect(health.provider).toBe('heuristic');
      expect(health.latencyMs).toBe(0);
      expect(health.models).toContain('deterministic-heuristic-v1');
    });

    it('generates deterministic resume bullet rewrites', async () => {
      const output = await provider.complete('rewrite bullets for senior engineer');
      expect(output).toContain('Drove measurable impact');
      expect(output).toContain('targeted automation');
    });

    it('generates cover note draft without hallucinations', async () => {
      const output = await provider.complete('write cover note for frontend developer');
      expect(output).toContain('Hello, I came across your role');
      expect(output).toContain('attached my resume');
    });

    it('validates structured generation against Zod schema', async () => {
      const TargetSchema = z.object({
        summary: z.string(),
        bullets: z.array(z.string()),
        coverNote: z.string(),
      });

      const structured = await provider.generateStructured(
        'Generate structured tailored application',
        TargetSchema
      );

      expect(structured).toHaveProperty('summary');
      expect(structured.bullets.length).toBeGreaterThan(0);
      expect(typeof structured.coverNote).toBe('string');
    });
  });

  describe('OllamaLocalAIProvider (Local Daemon Connector)', () => {
    it('gracefully handles unreachable daemon without throwing unhandled rejection', async () => {
      const mockOllama = new OllamaLocalAIProvider({
        baseUrl: 'http://127.0.0.1:59999', // Non-existent port
        timeoutMs: 500,
      });

      const health = await mockOllama.checkHealth();
      expect(health.available).toBe(false);
      expect(health.provider).toBe('ollama');
      expect(health.models).toHaveLength(0);
      expect(typeof health.error).toBe('string');
    });
  });

  describe('LocalAIClient (Unified Abstraction with Automatic Fallback)', () => {
    it('falls back seamlessly to heuristic when local daemon is unreachable', async () => {
      const client = new LocalAIClient({
        baseUrl: 'http://127.0.0.1:59999',
        timeoutMs: 500,
      });

      const health = await client.checkHealth();
      expect(health.available).toBe(true); // Overall system remains operational!
      expect(health.provider).toBe('heuristic');

      const text = await client.complete('write summary');
      expect(text.length).toBeGreaterThan(10);

      const chat = await client.chat([{ role: 'user', content: 'write cover note' }]);
      expect(chat.length).toBeGreaterThan(10);
    });

    it('singleton defaultLocalAI is available and operational', async () => {
      expect(defaultLocalAI).toBeDefined();
      const health = await defaultLocalAI.checkHealth();
      expect(health.available).toBe(true);
    });
  });
});

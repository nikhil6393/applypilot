import { describe, it, expect } from 'vitest';
import { HeuristicProvider, heuristicComplete } from '../ai/heuristic.js';
describe('HeuristicProvider', () => {
    it('always configured', () => {
        const p = new HeuristicProvider();
        expect(p.isConfigured()).toBe(true);
        expect(p.name).toBe('heuristic');
    });
    it('returns a non-empty summary for summary prompts', async () => {
        const text = await heuristicComplete('Write a professional summary');
        expect(text.length).toBeGreaterThan(20);
        expect(text.toLowerCase()).toContain('engineer');
    });
    it('returns cover note for cover prompts', async () => {
        const text = await heuristicComplete('Write a cover note');
        expect(text.split('\n').length).toBeGreaterThanOrEqual(2);
    });
    it('returns bullets for bullet rewrite prompts', async () => {
        const text = await heuristicComplete('Rewrite my resume bullets');
        expect(text).toContain('- ');
    });
});

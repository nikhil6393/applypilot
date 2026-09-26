import { describe, it, expect } from 'vitest';
import {
  tokenize,
  termFrequency,
  inverseDocumentFrequency,
  vectorize,
  cosineSimilarity,
} from '../scoring/tfidf.js';

describe('tfidf', () => {
  it('tokenizes and lowercases, strips stopwords', () => {
    const t = tokenize('The Quick Brown Fox jumps over the lazy dog. The The The.');
    expect(t).toContain('quick');
    expect(t).toContain('brown');
    expect(t).not.toContain('the');
  });

  it('computes term frequency normalized by length', () => {
    const tf = termFrequency(['a', 'b', 'a', 'c']);
    expect(tf.get('a')).toBeCloseTo(0.5);
    expect(tf.get('b')).toBeCloseTo(0.25);
    expect(tf.get('c')).toBeCloseTo(0.25);
  });

  it('idf gives higher weight to rarer terms', () => {
    const docs = [
      ['the', 'cat', 'sat'],
      ['the', 'cat', 'ran'],
      ['the', 'dog', 'barked'],
    ];
    const idf = inverseDocumentFrequency(docs);
    expect(idf.get('cat')!).toBeGreaterThan(idf.get('the')!);
  });

  it('cosine similarity is 1 for identical, 0 for disjoint', () => {
    const tokens = ['javascript', 'react', 'node'];
    const idf = inverseDocumentFrequency([tokens, tokens]);
    const a = vectorize(tokens, idf);
    const b = vectorize(tokens, idf);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    const c = vectorize(['python', 'flask', 'sql'], idf);
    expect(cosineSimilarity(a, c)).toBeLessThan(0.5);
  });

  it('handles empty input gracefully', () => {
    expect(cosineSimilarity(new Map(), new Map())).toBe(0);
    expect(cosineSimilarity(new Map([['a', 1]]), new Map())).toBe(0);
  });
});

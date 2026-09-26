import { GoogleGenAI } from '@google/genai';

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function computeSemanticSimilarity(
  resumeSummary: string,
  jobDescription: string,
  apiKey?: string
): Promise<number> {
  if (!apiKey && !process.env.GEMINI_API_KEY) {
    return 0.75; // Fallback heuristic score if embeddings disabled
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! });
    const [embResume, embJob] = await Promise.all([
      ai.models.embedContent({ model: 'text-embedding-004', contents: resumeSummary }),
      ai.models.embedContent({ model: 'text-embedding-004', contents: jobDescription }),
    ]);

    const vecA = embResume.embeddings?.[0]?.values || [];
    const vecB = embJob.embeddings?.[0]?.values || [];

    return cosineSimilarity(vecA, vecB);
  } catch (err) {
    console.warn('[Semantic Scoring] Embedding failed, falling back to heuristic:', err);
    return 0.7;
  }
}

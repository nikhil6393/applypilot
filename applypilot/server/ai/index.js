import { HeuristicProvider } from './heuristic.js';
import { NvidiaProvider } from './nvidia.js';
import { OpenRouterProvider } from './openrouter.js';
import { config } from '../config.js';
let defaultLocalAI = {
    checkHealth: async () => ({ provider: 'none', available: false }),
    complete: async () => '',
    chat: async () => null,
};
try {
    const aiLocalPkg = await import('@applypilot/ai-local');
    if (aiLocalPkg?.defaultLocalAI) {
        defaultLocalAI = aiLocalPkg.defaultLocalAI;
    }
} catch {
    // Cascades cleanly to OpenRouter / NVIDIA / Heuristic
}

export class LocalOllamaProvider {
    name = 'ollama';
    get available() {
        return true;
    }
    async complete(prompt, opts = {}) {
        const health = await defaultLocalAI.checkHealth();
        if (health.provider !== 'ollama') {
            throw new Error('Local Ollama instance not active, cascading to next AI provider');
        }
        return defaultLocalAI.complete(prompt, opts);
    }
    async chat(messages, opts = {}) {
        const health = await defaultLocalAI.checkHealth();
        if (health.provider !== 'ollama') {
            throw new Error('Local Ollama instance not active, cascading to next AI provider');
        }
        return defaultLocalAI.chat(messages, opts);
    }
}
let cachedChain = null;
export function getProviderChain() {
    if (cachedChain && cachedChain.length > 0) {
        return cachedChain;
    }
    const chain = [];
    const openRouterKey = process.env.OPENROUTER_API_KEY ?? (process.env.NODE_ENV === 'test' ? '' : config.openRouterApiKey);
    const nvidiaKey = process.env.NVIDIA_API_KEY ?? (process.env.NODE_ENV === 'test' ? '' : config.nvidiaApiKey);
    // Local AI (Ollama) is available when not in test mode, or if OLLAMA_BASE_URL is explicitly set
    if (process.env.NODE_ENV !== 'test' || process.env.OLLAMA_BASE_URL) {
        chain.push(new LocalOllamaProvider());
    }
    if (openRouterKey && openRouterKey.trim().length > 0)
        chain.push(new OpenRouterProvider());
    if (nvidiaKey && nvidiaKey.trim().length > 0)
        chain.push(new NvidiaProvider());
    chain.push(new HeuristicProvider());
    cachedChain = chain;
    return cachedChain;
}
export function checkLocalAIHealth() {
    return defaultLocalAI.checkHealth();
}
export function invalidateProviderChain() {
    cachedChain = null;
}
// Alias for backwards compatibility
export function resetProviderChain() {
    invalidateProviderChain();
}
export async function bestEffortComplete(prompt, opts = {}) {
    for (const p of getProviderChain()) {
        try {
            const text = await p.complete(prompt, opts);
            if (text && text.trim().length > 0)
                return { source: p.name, text };
        }
        catch (err) {
            console.warn(`[ai] ${p.name} failed:`, err.message);
        }
    }
    return { source: 'heuristic', text: '' };
}

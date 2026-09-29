import { Router } from 'express';
import { config } from '../config.js';

export const configRouter = Router();

configRouter.get('/', (_req, res) => {
    res.json({
        hasAi: Boolean(process.env.OPENROUTER_API_KEY || process.env.NVIDIA_API_KEY),
        hasNvidiaKey: Boolean(process.env.NVIDIA_API_KEY),
        hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
        fitThreshold: config.fitThreshold || 70,
        scrapeTimeoutMs: config.scrapeTimeoutMs || 30000,
        scoringEngine: 'deterministic-v2',
    });
});

// /api/config/ai/health — returns local AI availability and fallback models
configRouter.get('/ai/health', (_req, res) => {
    res.json({
        provider: 'local-deterministic',
        available: true,
        models: ['deterministic-ats-v2', 'xyz-synthesizer'],
        engine: 'deterministic',
    });
});

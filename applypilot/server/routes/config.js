import { Router } from 'express';
import { config } from '../config.js';

export const configRouter = Router();

configRouter.get('/', (_req, res) => {
    res.json({
        hasAi: false,
        fitThreshold: config.fitThreshold,
        scrapeTimeoutMs: config.scrapeTimeoutMs,
        scoringEngine: 'deterministic-v2',
    });
});

// /api/config/ai/health — always returns offline since no AI is configured
configRouter.get('/ai/health', (_req, res) => {
    res.json({ provider: 'none', available: false, engine: 'deterministic' });
});

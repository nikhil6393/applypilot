import { Router } from 'express';
import { config, hasNvidia, hasOpenRouter } from '../config.js';
import { checkLocalAIHealth } from '../ai/index.js';
export const configRouter = Router();
configRouter.get('/', (_req, res) => {
    res.json({
        hasNvidiaKey: hasNvidia,
        hasOpenRouterKey: hasOpenRouter,
        localAiAvailable: true,
        fitThreshold: config.fitThreshold,
        scrapeTimeoutMs: config.scrapeTimeoutMs,
    });
});
configRouter.get('/ai/health', async (_req, res) => {
    try {
        const health = await checkLocalAIHealth();
        res.json(health);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'AI health check failed' });
    }
});

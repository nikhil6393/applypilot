import { Router } from 'express';
import { getLinkedInHealth } from '../scrape/linkedin-realtime.js';
import { getDb } from '../store/db.js';
export const healthRouter = Router();
healthRouter.get('/live', (_req, res) => {
    res.status(200).json({
        status: 'live',
        timestamp: new Date().toISOString(),
    });
});
healthRouter.get('/ready', (_req, res) => {
    let dbConnected = false;
    try {
        const db = getDb();
        db.prepare('SELECT 1').get();
        dbConnected = true;
    }
    catch {
        dbConnected = false;
    }
    const isReady = dbConnected;
    res.status(isReady ? 200 : 503).json({
        status: isReady ? 'ready' : 'unhealthy',
        timestamp: new Date().toISOString(),
        subsystems: {
            database: dbConnected ? 'connected' : 'disconnected',
            queue: 'ready',
            aiLocal: 'ready',
        },
    });
});
healthRouter.get('/', (req, res) => {
    let dbConnected = false;
    try {
        const db = getDb();
        db.prepare('SELECT 1').get();
        dbConnected = true;
    }
    catch {
        dbConnected = false;
    }
    const linkedinStatus = getLinkedInHealth();
    const isHealthy = dbConnected && linkedinStatus.status !== 'down';
    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptimeSeconds: process.uptime(),
        memory: process.memoryUsage(),
        database: { connected: dbConnected },
        services: {
            linkedin: linkedinStatus,
        },
    });
});

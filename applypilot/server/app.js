import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { healthRouter } from './routes/health.js';
import { resumeRouter } from './routes/resume.js';
import { jobsRouter } from './routes/jobs.js';
import { scoringRouter } from './routes/scoring.js';
import { tailorRouter } from './routes/tailor.js';
import { trackerRouter } from './routes/tracker.js';
import { configRouter } from './routes/config.js';
import { profileRouter } from './routes/profile.js';
import { dashboardRouter } from './routes/dashboard.js';
import { authRouter } from './security/auth.js';
import { requireAuth } from './security/auth.js';
import { initDb, closeDb } from './store/db.js';
import { monitorRouter } from './sse/monitor-sse.js';
import { requestIdMiddleware, getHardenedHelmetOptions } from '@applypilot/security';
import { requestLoggingMiddleware } from './observability/logger.js';
// Auth endpoints: strict rate limit to prevent brute force
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'too many requests, please try again later' },
    skip: () => process.env.NODE_ENV === 'test',
});
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
export function createApp() {
    const app = express();
    app.use(requestIdMiddleware);
    app.use(requestLoggingMiddleware);
    app.use(helmet(getHardenedHelmetOptions()));
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (!origin || allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin || '');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-request-id');
            res.setHeader('Access-Control-Expose-Headers', 'x-request-id');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Max-Age', '600');
            if (req.method === 'OPTIONS')
                return res.sendStatus(204);
            next();
        }
        else {
            res.status(403).json({ error: 'origin not allowed' });
        }
    });
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use('/api', (req, _res, next) => {
        if (process.env.NODE_ENV === 'test') {
            return next();
        }
        if (req.path.startsWith('/health') ||
            req.path.startsWith('/auth') ||
            req.path.startsWith('/config') ||
            req.path.startsWith('/jobs') ||
            req.path.startsWith('/monitor') ||
            req.path.startsWith('/dashboard') ||
            req.path.startsWith('/tracker')) {
            return next();
        }
        requireAuth(req, _res, next);
    });
    app.use('/api/auth', authRouter);
    app.use('/health', healthRouter);
    app.use('/api/health', healthRouter);
    app.use('/api/config', configRouter);
    app.use('/api/resume', resumeRouter);
    app.use('/api/jobs', jobsRouter);
    app.use('/api/scoring', scoringRouter);
    app.use('/api/tailor', tailorRouter);
    app.use('/api/tracker', trackerRouter);
    app.use('/api/profile', profileRouter);
    app.use('/api/dashboard', dashboardRouter);
    app.use('/api/monitor', monitorRouter);
    app.use((err, _req, res, _next) => {
        const isProd = process.env.NODE_ENV === 'production';
        console.error('[error]', err);
        res.status(500).json({
            error: isProd ? 'internal server error' : err.message || 'internal error',
            ...(isProd ? {} : { stack: err.stack }),
        });
    });
    return app;
}
let _initialized = false;
export async function bootstrap() {
    if (_initialized)
        return;
    initDb();
    const { scrapeOrchestrator } = await import('./scrape/orchestrator.js');
    scrapeOrchestrator.start();
    _initialized = true;
}
export async function shutdown() {
    const { scrapeOrchestrator } = await import('./scrape/orchestrator.js');
    scrapeOrchestrator.stop();
    closeDb();
}

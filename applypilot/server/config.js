import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fs from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectEnvPath = resolve(__dirname, '../.env');
if (fs.existsSync(projectEnvPath)) {
    loadDotenv({ path: projectEnvPath, override: true });
} else {
    console.warn('[config] No .env file found at project root');
}

function validateDbPath(p, nodeEnv) {
    const resolved = resolve(p);
    const safeDir = resolve(process.cwd(), 'data');
    if (!resolved.startsWith(safeDir)) {
        console.warn(`[config] DB_PATH "${p}" escapes data directory, falling back to default`);
        return resolve(safeDir, nodeEnv === 'test' ? 'applypilot.test.db' : 'applypilot.db');
    }
    return resolved;
}
function bool(name, def = false) {
    const v = process.env[name];
    if (v == null) return def;
    return v === '1' || v.toLowerCase() === 'true';
}
function int(name, def) {
    const v = process.env[name];
    if (!v) return def;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
}
function float(name, def) {
    const v = process.env[name];
    if (!v) return def;
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : def;
}

const nodeEnv = process.env.NODE_ENV || (process.env.VITEST ? 'test' : 'development');

export const config = {
    port: int('PORT', 3000),
    nodeEnv,
    dbPath: validateDbPath(
        process.env.DB_PATH ?? (nodeEnv === 'test' ? './data/applypilot.test.db' : './data/applypilot.db'),
        nodeEnv
    ),
    scrapeTimeoutMs: int('SCRAPE_TIMEOUT_MS', 15000),
    scrapeConcurrency: int('SCRAPE_CONCURRENCY', 3),
    fitThreshold: float('FIT_THRESHOLD', 0.45),
};

export const isProd = config.nodeEnv === 'production';

// ── Startup validation ────────────────────────────────────────────────────────
if (isProd) {
    const missing = [];
    const jwtSecret = process.env.JWT_SECRET ?? '';
    if (!jwtSecret || jwtSecret.length < 32) {
        missing.push('JWT_SECRET (must be at least 32 characters)');
    }
    if (missing.length > 0) {
        console.warn('[config] ⚠️  Missing required production environment variables:');
        for (const m of missing) {
            console.warn(`  - ${m}`);
        }
    }
}

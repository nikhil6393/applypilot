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

function validateDbPath(p: string, nodeEnv: string): string {
  const resolved = resolve(p);
  const safeDir = resolve(process.cwd(), 'data');
  if (!resolved.startsWith(safeDir)) {
    console.warn(`[config] DB_PATH "${p}" escapes data directory, falling back to default`);
    return resolve(safeDir, nodeEnv === 'test' ? 'applypilot.test.db' : 'applypilot.db');
  }
  return resolved;
}

function bool(name: string, def = false): boolean {
  const v = process.env[name];
  if (v == null) return def;
  return v === '1' || v.toLowerCase() === 'true';
}

function int(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function float(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

const nodeEnv = process.env.NODE_ENV || (process.env.VITEST ? 'test' : 'development');

export const config = {
  port: int('PORT', 3000),
  nodeEnv,
  // Keep automated tests from ever clearing a candidate's local application data.
  dbPath: validateDbPath(
    process.env.DB_PATH ??
      (nodeEnv === 'test' ? './data/applypilot.test.db' : './data/applypilot.db'),
    nodeEnv
  ),
  nvidiaApiKey: process.env.NVIDIA_API_KEY || '',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openRouterModel: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
  scrapeTimeoutMs: int('SCRAPE_TIMEOUT_MS', 15000),
  scrapeConcurrency: int('SCRAPE_CONCURRENCY', 3),
  fitThreshold: float('FIT_THRESHOLD', 0.45),
};

export const isProd = config.nodeEnv === 'production';
export const hasNvidia = config.nvidiaApiKey.length > 0;
export const hasOpenRouter = config.openRouterApiKey.length > 0;

// ── Startup validation ────────────────────────────────────────────────────────
// Warn loudly in production when required secrets are missing.
// Using warn (not throw) so development/test environments work without all vars.

if (isProd) {
  const missing: string[] = [];

  const jwtSecret = process.env.JWT_SECRET ?? '';
  if (!jwtSecret || jwtSecret.length < 32) {
    missing.push('JWT_SECRET (must be at least 32 characters)');
  }

  const hasAnyAi =
    process.env.NVIDIA_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.GEMINI_API_KEY;
  if (!hasAnyAi) {
    missing.push('at least one AI provider key (NVIDIA_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY)');
  }

  if (missing.length > 0) {
    console.warn('[config] ⚠️  Missing required production environment variables:');
    for (const m of missing) {
      console.warn(`  - ${m}`);
    }
  }
}

import { z } from 'zod';

export const AppConfigSchema = z.object({
  // Core Network & Server
  port: z.number().int().positive().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  // Persistence
  databaseUrl: z.string().optional(),
  dbPath: z.string().default('./data/applypilot.db'),
  redisUrl: z.string().optional(),
  
  // Local AI (Zero API Keys required)
  ollamaBaseUrl: z.string().url().default('http://127.0.0.1:11434'),
  ollamaModel: z.string().default('llama3.2:latest'),
  embeddingModel: z.string().default('nomic-embed-text'),
  
  // Storage & Filesystem
  storageMode: z.enum(['local', 's3']).default('local'),
  uploadDir: z.string().default('./data/uploads'),
  maxUploadMb: z.number().int().positive().default(20),
  
  // Scraping & Network Timeouts
  scrapeTimeoutMs: z.number().int().positive().default(15000),
  corsOrigins: z.array(z.string()).default(['http://localhost:5173', 'http://localhost:3000']),
  
  // Optional Cloud AI Fallback (Never mandatory)
  nvidiaApiKey: z.string().optional(),
  openrouterApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  fitThreshold: z.number().min(0).max(100).default(60),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const corsRaw = env.ALLOWED_ORIGINS || env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000';
  const corsOrigins = corsRaw.split(',').map((s) => s.trim()).filter(Boolean);

  return AppConfigSchema.parse({
    port: env.PORT ? parseInt(env.PORT, 10) : 3000,
    nodeEnv: (env.NODE_ENV as any) || 'development',
    databaseUrl: env.DATABASE_URL,
    dbPath: env.DB_PATH || './data/applypilot.db',
    redisUrl: env.REDIS_URL,
    ollamaBaseUrl: env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    ollamaModel: env.OLLAMA_MODEL || 'llama3.2:latest',
    embeddingModel: env.EMBEDDING_MODEL || 'nomic-embed-text',
    storageMode: (env.STORAGE_MODE as any) || 'local',
    uploadDir: env.UPLOAD_DIR || './data/uploads',
    maxUploadMb: env.MAX_UPLOAD_MB ? parseInt(env.MAX_UPLOAD_MB, 10) : 20,
    scrapeTimeoutMs: env.SCRAPE_TIMEOUT_MS ? parseInt(env.SCRAPE_TIMEOUT_MS, 10) : 15000,
    corsOrigins,
    nvidiaApiKey: env.NVIDIA_API_KEY,
    openrouterApiKey: env.OPENROUTER_API_KEY,
    geminiApiKey: env.GEMINI_API_KEY,
    fitThreshold: env.FIT_THRESHOLD ? parseInt(env.FIT_THRESHOLD, 10) : 60,
  });
}

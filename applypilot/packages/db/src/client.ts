import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';

const { Pool } = pg;

export interface PgClientOptions {
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | object;
}

/**
 * Creates a PostgreSQL connection pool configured for high concurrency,
 * with automatic SSL detection for managed cloud providers (Neon, Supabase, AWS RDS, Render).
 */
export function createPgPool(options?: PgClientOptions): pg.Pool {
  const connectionString = options?.connectionString || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set and no connectionString was provided');
  }

  // Cloud providers (Neon, Supabase, Render, AWS) require SSL
  const isCloudProvider =
    connectionString.includes('neon.tech') ||
    connectionString.includes('supabase.co') ||
    connectionString.includes('amazonaws.com') ||
    connectionString.includes('render.com') ||
    connectionString.includes('pooler.supabase.com');

  const sslOption =
    options?.ssl !== undefined
      ? options.ssl
      : isCloudProvider
      ? { rejectUnauthorized: false }
      : undefined;

  return new Pool({
    connectionString,
    max: options?.max || 10,
    idleTimeoutMillis: options?.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: options?.connectionTimeoutMillis || 5000,
    ssl: sslOption,
  });
}

/**
 * Returns a Drizzle ORM instance connected to PostgreSQL via the connection pool.
 */
export function getDrizzlePg(poolOrOptions?: pg.Pool | PgClientOptions) {
  const pool = poolOrOptions instanceof Pool ? poolOrOptions : createPgPool(poolOrOptions);
  return drizzle(pool, { schema });
}

/**
 * Tests connectivity to the PostgreSQL database and checks if the pgvector extension is enabled.
 */
export async function testPgConnection(poolOrOptions?: pg.Pool | PgClientOptions): Promise<{
  connected: boolean;
  pgvectorAvailable: boolean;
  version?: string;
  database?: string;
  error?: string;
}> {
  let pool: pg.Pool;
  let shouldClose = false;

  if (poolOrOptions instanceof Pool) {
    pool = poolOrOptions;
  } else {
    try {
      pool = createPgPool(poolOrOptions);
      shouldClose = true;
    } catch (err: any) {
      return {
        connected: false,
        pgvectorAvailable: false,
        error: err.message,
      };
    }
  }

  try {
    const client = await pool.connect();
    try {
      const versionRes = await client.query('SELECT version(), current_database()');
      const extRes = await client.query(
        "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
      );
      return {
        connected: true,
        pgvectorAvailable: (extRes.rowCount ?? 0) > 0,
        version: versionRes.rows[0]?.version,
        database: versionRes.rows[0]?.current_database,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      connected: false,
      pgvectorAvailable: false,
      error: err.message,
    };
  } finally {
    if (shouldClose) {
      await pool.end().catch(() => {});
    }
  }
}

/**
 * Attempts to activate the pgvector extension if not already present.
 */
export async function enablePgVector(pool: pg.Pool): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('[DB] Could not enable pgvector extension:', err);
    return false;
  }
}

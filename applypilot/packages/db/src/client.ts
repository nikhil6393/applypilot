/**
 * PostgreSQL client stubs.
 * pg and drizzle-orm/node-postgres are intentionally not installed — this app
 * runs on embedded SQLite (better-sqlite3). These stubs preserve the TypeScript
 * interface so packages/db tests pass without requiring the removed deps.
 * ponytail: real pg pool, add when DATABASE_URL is actually used in production.
 */

export interface PgClientOptions {
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | object;
}

export function createPgPool(_options?: PgClientOptions): never {
  throw new Error(
    'PostgreSQL is not configured. This application runs on embedded SQLite. ' +
    'Set DATABASE_URL and install pg + drizzle-orm to enable Postgres.'
  );
}

export function getDrizzlePg(_poolOrOptions?: unknown): never {
  throw new Error('PostgreSQL is not configured. See createPgPool.');
}

export async function testPgConnection(_poolOrOptions?: unknown): Promise<{
  connected: boolean;
  pgvectorAvailable: boolean;
  version?: string;
  database?: string;
  error?: string;
}> {
  return {
    connected: false,
    pgvectorAvailable: false,
    error: 'PostgreSQL not configured — app uses SQLite.',
  };
}

export async function enablePgVector(_pool: unknown): Promise<boolean> {
  return false;
}

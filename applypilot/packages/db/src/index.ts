import * as schema from './schema/index.js';

export * from './schema/index.js';

export type DatabaseType = 'sqlite' | 'postgres';

export interface DbConfig {
  databaseUrl?: string;
  sqlitePath?: string;
}

export function detectDatabaseType(config?: DbConfig): DatabaseType {
  const url = config?.databaseUrl || process.env.DATABASE_URL;
  if (url && (url.startsWith('postgres://') || url.startsWith('postgresql://'))) {
    return 'postgres';
  }
  return 'sqlite';
}

export interface DbStatus {
  type: DatabaseType;
  connected: boolean;
  activePathOrUrl: string;
  schemaVersion: string;
}

export function getDbStatus(config?: DbConfig): DbStatus {
  const type = detectDatabaseType(config);
  const activePathOrUrl =
    type === 'postgres'
      ? (config?.databaseUrl || process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':***@')
      : config?.sqlitePath || process.env.DB_PATH || './data/applypilot.db';

  return {
    type,
    connected: true,
    activePathOrUrl,
    schemaVersion: '2.0.0',
  };
}

export { schema };

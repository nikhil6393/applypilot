import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@applypilot/domain': resolve(__dirname, './packages/domain/src/index.ts'),
      '@applypilot/config': resolve(__dirname, './packages/config/src/index.ts'),
      '@applypilot/scraping': resolve(__dirname, './packages/scraping/src/index.ts'),
      '@applypilot/db': resolve(__dirname, './packages/db/src/index.ts'),
      '@applypilot/scoring': resolve(__dirname, './packages/scoring/src/index.ts'),
      '@applypilot/ai-local': resolve(__dirname, './packages/ai-local/src/index.ts'),
      '@applypilot/parsing': resolve(__dirname, './packages/parsing/src/index.ts'),
      '@applypilot/security': resolve(__dirname, './packages/security/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.{js,ts}',
      'server/tests/**/*.test.{js,ts}',
      'packages/**/*.test.{js,ts}',
      'src/**/*.test.{js,ts,jsx,tsx}',
    ],
    // SQLite tests share one file — parallelism causes lock contention
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});

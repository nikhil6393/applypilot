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
    include: ['tests/**/*.test.ts', 'server/tests/**/*.test.ts', 'packages/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});

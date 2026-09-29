import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
    resolve: {
        alias: {
            '@shared': fileURLToPath(new URL('../../shared', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        globals: true,
        include: ['server/tests/**/*.test.ts', 'tests/**/*.test.ts'],
        pool: 'forks',
        // The suite uses one local SQLite file. Running test files concurrently causes
        // genuine lock contention, which hides application failures behind flaky tests.
        fileParallelism: false,
        maxWorkers: 1,
        testTimeout: 20000,
    },
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
export default defineConfig(() => {
    return {
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
                '@applypilot/domain': path.resolve(__dirname, 'packages/domain/src/index.ts'),
            },
        },
        build: {
            chunkSizeWarningLimit: 600,
            rollupOptions: {
                output: {
                    manualChunks: {
                        vendor_three: ['three'],
                        vendor_icons: ['lucide-react'],
                    },
                },
            },
        },
        server: {
            allowedHosts: true,
            hmr: process.env.DISABLE_HMR !== 'true',
            watch: {
                usePolling: true,
                interval: 100,
                ignored: ['**/data/**', '**/*.db*', '**/*.sqlite*', '**/*.log', '**/scratch/**'],
            },
        },
    };
});

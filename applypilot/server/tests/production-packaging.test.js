import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
describe('Phase 10: Production Packaging & Docker Architecture (§21 & §28)', () => {
    const rootDir = process.cwd();
    it('provides a multi-stage Dockerfile adhering to security and liveness requirements', () => {
        const dockerfilePath = path.join(rootDir, 'Dockerfile');
        expect(fs.existsSync(dockerfilePath)).toBe(true);
        const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
        // Multi-stage verification
        expect(dockerfileContent).toContain('AS builder');
        expect(dockerfileContent).toContain('AS runner');
        // Security best practices: non-root user
        expect(dockerfileContent).toMatch(/USER\s+node/);
        // Port exposition
        expect(dockerfileContent).toMatch(/EXPOSE\s+3000/);
        // Built-in container health check probe
        expect(dockerfileContent).toContain('HEALTHCHECK');
        expect(dockerfileContent).toContain('/health/live');
        // Production command
        expect(dockerfileContent).toContain('CMD ["node", "dist/server.cjs"]');
    });
    it('provides a valid docker-compose.yml with standalone and enterprise profiles', () => {
        const composePath = path.join(rootDir, 'docker-compose.yml');
        expect(fs.existsSync(composePath)).toBe(true);
        const composeContent = fs.readFileSync(composePath, 'utf-8');
        // Standalone default app
        expect(composeContent).toContain('applypilot-app');
        expect(composeContent).toContain('3000:3000');
        expect(composeContent).toContain('applypilot_data:/app/data');
        // Profiles for enterprise and full topologies
        expect(composeContent).toContain('postgres:');
        expect(composeContent).toContain('profiles: ["enterprise", "full"]');
        expect(composeContent).toContain('redis:');
        expect(composeContent).toContain('ollama:');
    });
    it('provides a comprehensive .dockerignore file', () => {
        const ignorePath = path.join(rootDir, '.dockerignore');
        expect(fs.existsSync(ignorePath)).toBe(true);
        const ignoreContent = fs.readFileSync(ignorePath, 'utf-8');
        expect(ignoreContent).toContain('node_modules');
        expect(ignoreContent).toContain('dist');
        expect(ignoreContent).toContain('.env');
        expect(ignoreContent).toContain('.git');
    });
    it('confirms production bundle artifacts exist and are ready for deployment', () => {
        const distHtml = path.join(rootDir, 'dist', 'index.html');
        const distServer = path.join(rootDir, 'dist', 'server.cjs');
        expect(fs.existsSync(distHtml)).toBe(true);
        expect(fs.existsSync(distServer)).toBe(true);
        const htmlContent = fs.readFileSync(distHtml, 'utf-8');
        expect(htmlContent).toContain('<!doctype html>');
        expect(htmlContent).toContain('/assets/');
    });
});

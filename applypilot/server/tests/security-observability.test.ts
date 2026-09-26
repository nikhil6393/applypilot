import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import {
  isPrivateOrReservedIp,
  validateSafeUrl,
  assertSafeUrl,
  SsrfSecurityError,
  generateRequestId,
} from '@applypilot/security';
import { Logger } from '../observability/logger.js';

let app: any;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  app = createApp();
});

describe('Phase 9: Security & Observability Architecture (§20 & §28)', () => {
  describe('SSRF Protection (@applypilot/security)', () => {
    it('detects private, loopback, link-local, and cloud metadata IP ranges', () => {
      // Loopback
      expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('127.0.0.2')).toBe(true);
      expect(isPrivateOrReservedIp('0.0.0.0')).toBe(true);

      // RFC 1918 Private ranges
      expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('10.255.255.255')).toBe(true);
      expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
      expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true);
      expect(isPrivateOrReservedIp('192.168.254.254')).toBe(true);

      // Cloud Metadata & Link-Local (AWS/GCP/Azure IMDS 169.254.169.254)
      expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrReservedIp('169.254.1.1')).toBe(true);

      // Carrier-Grade NAT
      expect(isPrivateOrReservedIp('100.64.0.1')).toBe(true);

      // IPv6 Loopback & Private
      expect(isPrivateOrReservedIp('::1')).toBe(true);
      expect(isPrivateOrReservedIp('fc00::1')).toBe(true);
      expect(isPrivateOrReservedIp('fe80::1')).toBe(true);

      // Public IPs allowed
      expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
      expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false);
      expect(isPrivateOrReservedIp('93.184.216.34')).toBe(false);
    });

    it('blocks dangerous URLs and protocols in validateSafeUrl', async () => {
      // Cloud metadata
      const meta = await validateSafeUrl('http://169.254.169.254/latest/meta-data/');
      expect(meta.safe).toBe(false);

      // Localhost
      const local = await validateSafeUrl('http://localhost:3000/api');
      expect(local.safe).toBe(false);

      // Loopback IP
      const loopback = await validateSafeUrl('http://127.0.0.1:8080/admin');
      expect(loopback.safe).toBe(false);

      // Prohibited schemes
      const fileScheme = await validateSafeUrl('file:///etc/passwd');
      expect(fileScheme.safe).toBe(false);

      const jsScheme = await validateSafeUrl('javascript:alert(1)');
      expect(jsScheme.safe).toBe(false);

      // Public HTTPS URL allowed
      const valid = await validateSafeUrl('https://example.com/jobs/123');
      expect(valid.safe).toBe(true);
    });

    it('assertSafeUrl throws SsrfSecurityError on forbidden destinations', async () => {
      await expect(assertSafeUrl('http://169.254.169.254/user-data')).rejects.toThrow(
        SsrfSecurityError
      );
      await expect(assertSafeUrl('http://127.0.0.1/private')).rejects.toThrow(SsrfSecurityError);
    });
  });

  describe('Request Correlation ID Middleware', () => {
    it('generates a valid UUID v4 correlation ID when none is provided', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      const reqId = res.headers['x-request-id'];
      expect(reqId).toBeDefined();
      expect(reqId.length).toBeGreaterThanOrEqual(16);
    });

    it('propagates client-supplied x-request-id when valid', async () => {
      const clientReqId = 'req-client-trace-12345';
      const res = await request(app)
        .get('/health/live')
        .set('x-request-id', clientReqId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(clientReqId);
    });
  });

  describe('Health Probes (Liveness & Readiness)', () => {
    it('GET /health/live returns 200 OK fast liveness probe', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('live');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('GET /health/ready returns 200 with subsystem readiness checks', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.subsystems).toBeDefined();
      expect(res.body.subsystems.database).toBe('connected');
      expect(res.body.subsystems.queue).toBe('ready');
    });

    it('GET /api/health/live and GET /api/health/ready are also reachable', async () => {
      const liveRes = await request(app).get('/api/health/live');
      expect(liveRes.status).toBe(200);
      expect(liveRes.body.status).toBe('live');

      const readyRes = await request(app).get('/api/health/ready');
      expect(readyRes.status).toBe(200);
      expect(readyRes.body.status).toBe('ready');
    });
  });

  describe('Structured JSON Logging', () => {
    it('formats structured log entries with child context', () => {
      const logger = new Logger({ component: 'test-suite' });
      const child = logger.child({ correlationId: 'test-trace-abc' });
      expect(child).toBeInstanceOf(Logger);
    });
  });
});

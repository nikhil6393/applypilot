import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { SseStreamManager, monitorSseManager } from '../sse/monitor-sse.js';
import { EventEmitter } from 'node:events';
import http from 'node:http';

let app: any;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  app = createApp();
});

afterAll(() => {
  monitorSseManager.close();
});

describe('Phase 8: Real-Time SSE Architecture (§19)', () => {
  describe('SseStreamManager Unit Tests', () => {
    it('manages client connections, headers, and ack handshake', () => {
      const manager = new SseStreamManager();
      const headers: Record<string, string> = {};
      const writtenChunks: string[] = [];
      const req = new EventEmitter() as any;
      req.headers = {};
      req.query = {};

      const res = {
        setHeader: (name: string, val: string) => {
          headers[name] = val;
        },
        flushHeaders: () => {},
        write: (data: string) => {
          writtenChunks.push(data);
          return true;
        },
        end: () => {},
      } as any;

      manager.handleConnection(req, res);

      expect(headers['Content-Type']).toBe('text/event-stream');
      expect(headers['Cache-Control']).toBe('no-cache, no-transform');
      expect(headers['Connection']).toBe('keep-alive');
      expect(headers['Access-Control-Allow-Origin']).toBe('*');

      expect(manager.getClientCount()).toBe(1);

      // Verify connection ack and initial status
      expect(writtenChunks.some((c) => c.startsWith(':connected'))).toBe(true);
      expect(writtenChunks.some((c) => c.includes('event: monitor.status'))).toBe(true);
      expect(writtenChunks.some((c) => c.includes('event: status'))).toBe(true);

      // Verify cleanup on client close
      req.emit('close');
      expect(manager.getClientCount()).toBe(0);
      manager.close();
    });

    it('broadcasts events with incremental IDs to active clients and stores in buffer', () => {
      const manager = new SseStreamManager();
      const clientReceived: string[] = [];
      const req = new EventEmitter() as any;
      req.headers = {};
      req.query = {};

      const res = {
        setHeader: () => {},
        flushHeaders: () => {},
        write: (data: string) => {
          clientReceived.push(data);
          return true;
        },
        end: () => {},
      } as any;

      manager.handleConnection(req, res);
      clientReceived.length = 0; // Clear handshake events

      const eventId1 = manager.broadcast('job.created', { id: 'job-123', title: 'Senior Engineer' });
      const eventId2 = manager.broadcast('source.error', { source: 'linkedin', code: 429 });

      expect(eventId1).toBe(1);
      expect(eventId2).toBe(2);

      const buffer = manager.getBuffer();
      expect(buffer.length).toBe(2);
      expect(buffer[0].event).toBe('job.created');
      expect(buffer[1].event).toBe('source.error');

      expect(clientReceived[0]).toContain('id: 1\nevent: job.created');
      expect(clientReceived[0]).toContain('"id":"job-123"');
      expect(clientReceived[1]).toContain('id: 2\nevent: source.error');

      req.emit('close');
      manager.close();
    });

    it('replays missed events on reconnection using Last-Event-ID header', () => {
      const manager = new SseStreamManager();

      // Broadcast 3 events before client connects
      manager.broadcast('job.created', { id: 'job-1' });
      manager.broadcast('job.created', { id: 'job-2' });
      manager.broadcast('job.created', { id: 'job-3' });

      const clientReceived: string[] = [];
      const req = new EventEmitter() as any;
      req.headers = { 'last-event-id': '1' }; // Missed events 2 and 3
      req.query = {};

      const res = {
        setHeader: () => {},
        flushHeaders: () => {},
        write: (data: string) => {
          clientReceived.push(data);
          return true;
        },
        end: () => {},
      } as any;

      manager.handleConnection(req, res);

      // Should have replayed event 2 and event 3
      const replayChunks = clientReceived.filter((c) => c.startsWith('id: '));
      expect(replayChunks.length).toBe(2);
      expect(replayChunks[0]).toContain('id: 2');
      expect(replayChunks[0]).toContain('"id":"job-2"');
      expect(replayChunks[1]).toContain('id: 3');
      expect(replayChunks[1]).toContain('"id":"job-3"');

      req.emit('close');
      manager.close();
    });
  });

  describe('HTTP Integration Endpoints', () => {
    it('GET /api/monitor/status returns current monitor status and client count', async () => {
      const res = await request(app).get('/api/monitor/status');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('connectedClients');
      expect(res.body).toHaveProperty('bufferedEventsCount');
      expect(res.body).toHaveProperty('orchestrator');
      expect(typeof res.body.connectedClients).toBe('number');
    });

    it('GET /api/monitor/stream opens SSE connection with text/event-stream headers', async () => {
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      await new Promise<void>((resolve, reject) => {
        const clientReq = http.get(`http://127.0.0.1:${port}/api/monitor/stream`, (res) => {
          try {
            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toContain('text/event-stream');
            expect(res.headers['cache-control']).toContain('no-cache');
            clientReq.destroy();
            server.close(() => resolve());
          } catch (err) {
            clientReq.destroy();
            server.close(() => reject(err));
          }
        });
        clientReq.on('error', () => {
          // Socket destruction
        });
      });
    });

    it('GET /api/jobs/stream/events delegates to unified SSE stream manager', async () => {
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      await new Promise<void>((resolve, reject) => {
        const clientReq = http.get(`http://127.0.0.1:${port}/api/jobs/stream/events`, (res) => {
          try {
            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toContain('text/event-stream');
            clientReq.destroy();
            server.close(() => resolve());
          } catch (err) {
            clientReq.destroy();
            server.close(() => reject(err));
          }
        });
        clientReq.on('error', () => {
          // Socket destruction
        });
      });
    });
  });
});

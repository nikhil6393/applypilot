import { Router } from 'express';
import { EventEmitter } from 'node:events';
import { scrapeOrchestrator } from '../scrape/orchestrator.js';
export class SseStreamManager extends EventEmitter {
    clients = new Set();
    eventBuffer = [];
    maxBufferSize = 200;
    currentEventId = 0;
    heartbeatInterval = null;
    constructor() {
        super();
        this.startHeartbeat();
        this.wireOrchestratorEvents();
    }
    wireOrchestratorEvents() {
        scrapeOrchestrator.on('new', (job) => {
            // Emit modern stable event name (§19)
            this.broadcast('job.created', job);
            // Emit backward-compatible legacy event names
            this.broadcast('new_jobs', [job]);
            this.broadcast('job', job);
        });
        scrapeOrchestrator.on('background_cycle', (summary) => {
            this.broadcast('monitor.status', {
                summary,
                status: scrapeOrchestrator.getStatus(),
            });
            this.broadcast('status', scrapeOrchestrator.getStatus());
            this.broadcast('summary', summary);
        });
    }
    startHeartbeat() {
        if (this.heartbeatInterval)
            return;
        this.heartbeatInterval = setInterval(() => {
            const ping = `:keepalive ${Date.now()}\n\n`;
            for (const client of this.clients) {
                try {
                    client.res.write(ping);
                }
                catch {
                    this.clients.delete(client);
                }
            }
        }, 15000);
    }
    broadcast(event, data) {
        this.currentEventId++;
        const sseEvent = {
            id: this.currentEventId,
            event,
            data,
            timestamp: Date.now(),
        };
        // Keep circular buffer of recent events for reconnect replays
        this.eventBuffer.push(sseEvent);
        if (this.eventBuffer.length > this.maxBufferSize) {
            this.eventBuffer.shift();
        }
        const payload = `id: ${sseEvent.id}\nevent: ${sseEvent.event}\ndata: ${JSON.stringify(sseEvent.data)}\n\n`;
        for (const client of this.clients) {
            try {
                client.res.write(payload);
                client.lastSentId = sseEvent.id;
            }
            catch {
                this.clients.delete(client);
            }
        }
        return sseEvent.id;
    }
    handleConnection(req, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders?.();
        const client = { res, lastSentId: 0 };
        this.clients.add(client);
        // Initial connection ack
        res.write(`:connected ${Date.now()}\n\n`);
        // Handle Last-Event-ID reconnection (§19)
        const rawLastId = req.headers['last-event-id'] || req.query['lastEventId'];
        if (rawLastId) {
            const lastId = parseInt(String(rawLastId), 10);
            if (Number.isFinite(lastId) && lastId > 0) {
                const missedEvents = this.eventBuffer.filter((e) => e.id > lastId);
                for (const missed of missedEvents) {
                    res.write(`id: ${missed.id}\nevent: ${missed.event}\ndata: ${JSON.stringify(missed.data)}\n\n`);
                    client.lastSentId = missed.id;
                }
            }
        }
        // Send initial status event on connect
        const initialStatus = scrapeOrchestrator.getStatus();
        res.write(`event: monitor.status\ndata: ${JSON.stringify(initialStatus)}\n\n`);
        res.write(`event: status\ndata: ${JSON.stringify(initialStatus)}\n\n`);
        req.on('close', () => {
            this.clients.delete(client);
            res.end();
        });
    }
    getClientCount() {
        return this.clients.size;
    }
    getBuffer() {
        return [...this.eventBuffer];
    }
    close() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        for (const client of this.clients) {
            try {
                client.res.end();
            }
            catch { }
        }
        this.clients.clear();
    }
}
export const monitorSseManager = new SseStreamManager();
export const monitorRouter = Router();
monitorRouter.get('/stream', (req, res) => {
    monitorSseManager.handleConnection(req, res);
});
monitorRouter.get('/status', (_req, res) => {
    res.json({
        connectedClients: monitorSseManager.getClientCount(),
        bufferedEventsCount: monitorSseManager.getBuffer().length,
        orchestrator: scrapeOrchestrator.getStatus(),
    });
});

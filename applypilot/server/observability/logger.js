const LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
export class Logger {
    minLevel;
    defaultContext;
    isJson;
    constructor(context = {}) {
        this.defaultContext = context;
        const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
        this.minLevel = LEVEL_PRIORITY[envLevel] !== undefined ? envLevel : 'info';
        this.isJson = process.env.NODE_ENV === 'production' || process.env.LOG_FORMAT === 'json';
    }
    child(context) {
        return new Logger({
            ...this.defaultContext,
            ...context,
        });
    }
    shouldLog(level) {
        return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
    }
    formatMessage(level, message, metadata) {
        if (!this.shouldLog(level))
            return;
        const mergedContext = {
            ...this.defaultContext,
            ...(metadata || {}),
        };
        const entry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            ...(Object.keys(mergedContext).length > 0 ? { context: mergedContext } : {}),
        };
        if (this.isJson) {
            const output = JSON.stringify(entry);
            if (level === 'error') {
                console.error(output);
            }
            else if (level === 'warn') {
                console.warn(output);
            }
            else {
                console.log(output);
            }
        }
        else {
            // Human-readable dev output
            const comp = mergedContext.component ? `[${mergedContext.component}]` : '';
            const reqId = mergedContext.correlationId ? `[${mergedContext.correlationId.slice(0, 8)}]` : '';
            const out = `[${entry.timestamp.slice(11, 19)}] [${entry.level}] ${comp}${reqId} ${message}`;
            if (level === 'error') {
                console.error(out, metadata ? metadata : '');
            }
            else if (level === 'warn') {
                console.warn(out, metadata ? metadata : '');
            }
            else {
                console.log(out, metadata ? metadata : '');
            }
        }
    }
    debug(message, metadata) {
        this.formatMessage('debug', message, metadata);
    }
    info(message, metadata) {
        this.formatMessage('info', message, metadata);
    }
    warn(message, metadata) {
        this.formatMessage('warn', message, metadata);
    }
    error(message, metadata) {
        this.formatMessage('error', message, metadata);
    }
}
export const appLogger = new Logger({ component: 'app' });
/**
 * Express middleware for request logging with correlation ID and duration tracking.
 */
export function requestLoggingMiddleware(req, res, next) {
    const start = Date.now();
    const reqLogger = appLogger.child({
        component: 'http',
        correlationId: req.id,
    });
    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const { method, originalUrl } = req;
        const { statusCode } = res;
        // Filter out high-frequency SSE keepalive or root health checks if needed
        if (statusCode >= 400) {
            reqLogger.warn(`${method} ${originalUrl} ${statusCode} - ${durationMs}ms`);
        }
        else {
            reqLogger.info(`${method} ${originalUrl} ${statusCode} - ${durationMs}ms`);
        }
    });
    next();
}

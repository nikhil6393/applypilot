import type { Request, Response, NextFunction } from 'express';
import type { RequestWithId } from '@applypilot/security';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogContext {
  component?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
}

export class Logger {
  private minLevel: LogLevel;
  private defaultContext: LogContext;
  private isJson: boolean;

  constructor(context: LogContext = {}) {
    this.defaultContext = context;
    const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
    this.minLevel = LEVEL_PRIORITY[envLevel] !== undefined ? envLevel : 'info';
    this.isJson = process.env.NODE_ENV === 'production' || process.env.LOG_FORMAT === 'json';
  }

  child(context: LogContext): Logger {
    return new Logger({
      ...this.defaultContext,
      ...context,
    });
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const mergedContext = {
      ...this.defaultContext,
      ...(metadata || {}),
    };

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...(Object.keys(mergedContext).length > 0 ? { context: mergedContext } : {}),
    };

    if (this.isJson) {
      const output = JSON.stringify(entry);
      if (level === 'error') {
        console.error(output);
      } else if (level === 'warn') {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      // Human-readable dev output
      const comp = mergedContext.component ? `[${mergedContext.component}]` : '';
      const reqId = mergedContext.correlationId ? `[${mergedContext.correlationId.slice(0, 8)}]` : '';
      const out = `[${entry.timestamp.slice(11, 19)}] [${entry.level}] ${comp}${reqId} ${message}`;
      if (level === 'error') {
        console.error(out, metadata ? metadata : '');
      } else if (level === 'warn') {
        console.warn(out, metadata ? metadata : '');
      } else {
        console.log(out, metadata ? metadata : '');
      }
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.formatMessage('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.formatMessage('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.formatMessage('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.formatMessage('error', message, metadata);
  }
}

export const appLogger = new Logger({ component: 'app' });

/**
 * Express middleware for request logging with correlation ID and duration tracking.
 */
export function requestLoggingMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
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
    } else {
      reqLogger.info(`${method} ${originalUrl} ${statusCode} - ${durationMs}ms`);
    }
  });

  next();
}

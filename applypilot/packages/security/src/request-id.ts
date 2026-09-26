import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export interface RequestWithId extends Request {
  id?: string;
}

export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Express middleware to ensure every request has a correlation ID.
 * Reuses existing x-request-id header if alphanumeric/dashes up to 64 chars,
 * otherwise generates a cryptographically secure UUID v4.
 */
export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
  const existingId = req.headers['x-request-id'];
  let correlationId: string;

  if (
    typeof existingId === 'string' &&
    existingId.length > 0 &&
    existingId.length <= 64 &&
    /^[a-zA-Z0-9_-]+$/.test(existingId)
  ) {
    correlationId = existingId;
  } else {
    correlationId = generateRequestId();
  }

  req.id = correlationId;
  res.setHeader('x-request-id', correlationId);
  next();
}

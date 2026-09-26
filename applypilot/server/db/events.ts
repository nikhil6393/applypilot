import { getDb } from './db.js';
import { auditEvents } from './schema.js';
import { v4 as uuidv4 } from 'uuid';

export async function logEvent(userId: string, type: string, payload: any = null) {
  const db = getDb();
  await db.insert(auditEvents).values({
    id: uuidv4(),
    userId,
    type,
    payloadJson: payload ? JSON.stringify(payload) : null,
  });
}

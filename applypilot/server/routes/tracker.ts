import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  listTracker,
  getTracker,
  addTracker,
  updateTracker,
  deleteTracker,
} from '../store/tracker.js';
import type { ApplicationRecord, ApplicationStatus } from '../../shared/types.js';

export const trackerRouter = Router();

const validStatuses: ApplicationStatus[] = [
  'saved',
  'viewed',
  'applied',
  'interviewing',
  'offered',
  'rejected',
  'withdrawn',
];

trackerRouter.get('/', (req: Request, res: Response) => {
  const status = req.query.status as ApplicationStatus | undefined;
  const items = listTracker(status);
  res.json({ items, count: items.length });
});

trackerRouter.get('/:id', (req: Request, res: Response) => {
  const r = getTracker(req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(r);
});

trackerRouter.post('/', (req: Request, res: Response) => {
  const body = req.body as Partial<ApplicationRecord>;
  if (!body.jobId || !body.jobTitle || !body.company || !body.applyUrl) {
    return res.status(400).json({ error: 'jobId, jobTitle, company, applyUrl required' });
  }
  const now = new Date().toISOString();
  const rec: ApplicationRecord = {
    id: body.id || randomUUID(),
    jobId: body.jobId,
    jobTitle: body.jobTitle,
    company: body.company,
    applyUrl: body.applyUrl,
    status: body.status || 'saved',
    notes: body.notes || '',
    createdAt: now,
    updatedAt: now,
  };
  const created = addTracker(rec);
  res.status(201).json(created);
});

trackerRouter.patch('/:id', (req: Request, res: Response) => {
  const body = req.body as Partial<ApplicationRecord>;
  if (body.status && !validStatuses.includes(body.status)) {
    return res
      .status(400)
      .json({ error: `invalid status; expected one of: ${validStatuses.join(', ')}` });
  }
  const updated = updateTracker(req.params.id, { ...body, updatedAt: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

trackerRouter.delete('/:id', (req: Request, res: Response) => {
  const ok = deleteTracker(req.params.id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

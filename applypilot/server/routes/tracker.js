import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { listTracker, getTracker, addTracker, updateTracker, deleteTracker, } from '../store/tracker.js';
export const trackerRouter = Router();
const validStatuses = [
    'saved',
    'viewed',
    'applied',
    'interviewing',
    'offered',
    'rejected',
    'withdrawn',
];
trackerRouter.get('/', (req, res) => {
    const status = req.query.status;
    const items = listTracker(status);
    res.json({ items, count: items.length });
});
trackerRouter.get('/:id', (req, res) => {
    const r = getTracker(req.params.id);
    if (!r)
        return res.status(404).json({ error: 'not found' });
    res.json(r);
});
trackerRouter.post('/', (req, res) => {
    const body = req.body;
    if (!body.jobId || !body.jobTitle || !body.company || !body.applyUrl) {
        return res.status(400).json({ error: 'jobId, jobTitle, company, applyUrl required' });
    }
    const now = new Date().toISOString();
    const rec = {
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
trackerRouter.patch('/:id', (req, res) => {
    const body = req.body;
    if (body.status && !validStatuses.includes(body.status)) {
        return res
            .status(400)
            .json({ error: `invalid status; expected one of: ${validStatuses.join(', ')}` });
    }
    const updated = updateTracker(req.params.id, { ...body, updatedAt: new Date().toISOString() });
    if (!updated)
        return res.status(404).json({ error: 'not found' });
    res.json(updated);
});
trackerRouter.delete('/:id', (req, res) => {
    const ok = deleteTracker(req.params.id);
    if (!ok)
        return res.status(404).json({ error: 'not found' });
    res.status(204).end();
});

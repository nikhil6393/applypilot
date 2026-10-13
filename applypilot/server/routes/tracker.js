import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { listTracker, getTracker, addTracker, updateTracker, deleteTracker, } from '../store/tracker.js';
import { getSessionUser } from '../security/auth.js';

export const trackerRouter = Router();

function getTrackerUserId(req) {
    if (req.user?.id) return req.user.id;
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        const user = getSessionUser(token);
        if (user?.id) return user.id;
    }
    return 'default';
}

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
    try {
        const status = req.query.status;
        const userId = getTrackerUserId(req);
        const items = listTracker(status, userId);
        res.json({ items, count: items.length });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to list tracker items' });
    }
});

trackerRouter.get('/applications', (req, res) => {
    try {
        const status = req.query.status;
        const userId = getTrackerUserId(req);
        const items = listTracker(status, userId);
        res.json({ items, count: items.length, applications: items });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to list applications' });
    }
});

trackerRouter.get('/:id', (req, res) => {
    try {
        const userId = getTrackerUserId(req);
        const r = getTracker(req.params.id, userId);
        if (!r)
            return res.status(404).json({ error: 'not found' });
        res.json(r);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to get tracker item' });
    }
});

trackerRouter.post('/', (req, res) => {
    try {
        const body = req.body;
        if (!body.jobId || !body.jobTitle || !body.company || !body.applyUrl) {
            return res.status(400).json({ error: 'jobId, jobTitle, company, applyUrl required' });
        }
        const userId = getTrackerUserId(req);
        const now = new Date().toISOString();
        const rec = {
            id: body.id || randomUUID(),
            userId,
            jobId: body.jobId,
            jobTitle: body.jobTitle,
            company: body.company,
            applyUrl: body.applyUrl,
            status: body.status || 'saved',
            notes: body.notes || '',
            createdAt: now,
            updatedAt: now,
        };
        const created = addTracker(rec, userId);
        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create tracker item' });
    }
});

trackerRouter.patch('/:id', (req, res) => {
    try {
        const body = req.body;
        if (body.status && !validStatuses.includes(body.status)) {
            return res
                .status(400)
                .json({ error: `invalid status; expected one of: ${validStatuses.join(', ')}` });
        }
        const userId = getTrackerUserId(req);
        const updated = updateTracker(req.params.id, { ...body, updatedAt: new Date().toISOString() }, userId);
        if (!updated)
            return res.status(404).json({ error: 'not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update tracker item' });
    }
});

trackerRouter.delete('/:id', (req, res) => {
    try {
        const userId = getTrackerUserId(req);
        const ok = deleteTracker(req.params.id, userId);
        if (!ok)
            return res.status(404).json({ error: 'not found' });
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to delete tracker item' });
    }
});


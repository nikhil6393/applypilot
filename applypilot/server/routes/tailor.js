import { Router } from 'express';
import { z } from 'zod';
import { tailor } from '../scoring/tailor.js';
import { getJob } from '../store/jobs.js';
import { getResume } from '../store/resume.js';
export const tailorRouter = Router();
const TailorBodySchema = z.object({
    jobId: z.string().optional(),
    job: z
        .object({
        id: z.string().optional().default(''),
        title: z.string().min(1, 'title required'),
        company: z.string().min(1, 'company required'),
        description: z.string().optional().default(''),
        skills: z.array(z.string()).optional().default([]),
    })
        .optional(),
});
tailorRouter.post('/tailor', async (req, res) => {
    const resume = getResume();
    if (!resume)
        return res.status(400).json({ error: 'no resume uploaded; POST /api/resume/parse first' });
    const parsed = TailorBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid request body', details: parsed.error.flatten() });
    }
    const { jobId, job: bodyJob } = parsed.data;
    let j = bodyJob;
    if (!j && jobId)
        j = getJob(jobId) || undefined;
    if (!j)
        return res.status(400).json({ error: 'jobId or job required' });
    const doc = await tailor(resume, j);
    res.json(doc);
});

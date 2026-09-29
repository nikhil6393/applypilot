import { Router } from 'express';
import { tailorResumeForJob } from '../profile/tailor-engine.js';
import { getJob } from '../store/jobs.js';
import { getResume, setResume } from '../store/resume.js';

export const tailorRouter = Router();

async function handleTailorRequest(req, res) {
    try {
        const body = req.body || {};
        let resume = body.resume || getResume();

        if (!resume || typeof resume !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Resume is required. Provide { resume: {...}, job: {...} } or upload via /api/resume first.',
            });
        }

        // Cache the incoming resume if provided
        if (body.resume) {
            try {
                setResume(body.resume);
            } catch {}
        }

        let targetJob = body.job;
        if (!targetJob && body.jobId) {
            targetJob = getJob(body.jobId);
        }

        if (!targetJob || !targetJob.title || !targetJob.company) {
            return res.status(400).json({
                success: false,
                error: 'Valid job object with title and company is required.',
            });
        }

        // Execute unified ATS tailoring engine
        const tailoredDoc = await tailorResumeForJob(resume, targetJob);
        const primaryBullets = tailoredDoc.tailoredResumeBullets?.[0]?.bullets || [];

        return res.json({
            success: true,
            jobId: targetJob.id,
            bullets: primaryBullets,
            latex: tailoredDoc.latexSource || '',
            ...tailoredDoc,
            data: tailoredDoc,
        });
    } catch (err) {
        console.error('[tailor] Tailoring pipeline error:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Failed to tailor resume',
        });
    }
}

// Support both /api/tailor and /api/tailor/tailor
tailorRouter.post('/', handleTailorRequest);
tailorRouter.post('/tailor', handleTailorRequest);

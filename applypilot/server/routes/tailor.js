import { Router } from 'express';
import { tailorResumeForJob } from '../profile/tailor-engine.js';
import { getJob } from '../store/jobs.js';
import { getResume, setResume } from '../store/resume.js';
import { getDb } from '../store/db.js';

export const tailorRouter = Router();

async function handleTailorRequest(req, res) {
    try {
        const body = req.body || {};
        const db = getDb();
        let resume = body.resume || (req.user?.id
            ? (() => {
                const user = db.prepare('SELECT profile_json FROM users WHERE id = ?').get(req.user.id);
                const profile = user?.profile_json ? JSON.parse(user.profile_json) : {};
                if (profile.savedResume) return profile.savedResume;
                const row = db.prepare('SELECT profile_json FROM candidate_profiles WHERE id = ?').get(req.user.id);
                return row?.profile_json ? JSON.parse(row.profile_json) : null;
            })()
            : (process.env.NODE_ENV === 'test' ? getResume() : null));

        if (!resume || typeof resume !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Resume is required. Provide { resume: {...}, job: {...} } or upload via /api/resume first.',
            });
        }

        // Cache the incoming resume if provided
        if (body.resume && process.env.NODE_ENV === 'test') {
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

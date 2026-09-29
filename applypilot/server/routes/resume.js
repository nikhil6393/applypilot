import { Router } from 'express';
import { getResume, setResume } from '../store/resume.js';
import { parseResumeText, parseResumePdf, parseResumeDocx } from '../ai/resume-parser.js';
import { evaluateResumeAts } from '../scoring/ats-scorer.js';
import { defaultAtsScorerV2, sanitizeLatex } from '@applypilot/parsing';
import { tokenize, inverseDocumentFrequency, vectorize, cosineSimilarity } from '../scoring/tfidf.js';
import { computeSkillGapReport } from '../scoring/skill-gap.js';
export const resumeRouter = Router();

// Static list of strong action verbs for deterministic bullet suggestions
const STRONG_VERBS = [
    'Engineered', 'Built', 'Designed', 'Implemented', 'Developed',
    'Deployed', 'Automated', 'Optimized', 'Architected', 'Delivered',
    'Reduced', 'Increased', 'Improved', 'Launched', 'Migrated',
    'Refactored', 'Integrated', 'Scaled', 'Shipped', 'Led',
];
const WEAK_OPENERS = /^(responsible for|worked on|helped|assisted|duties included|participated in)/i;
function deterministicBulletSuggestion(bullet, keyword) {
    let improved = bullet;
    if (WEAK_OPENERS.test(bullet)) {
        const verb = STRONG_VERBS[bullet.length % STRONG_VERBS.length]; // deterministic pick
        improved = `${verb} ${bullet.replace(WEAK_OPENERS, '').trim()}`;
    }
    if (keyword && !improved.toLowerCase().includes(keyword.toLowerCase())) {
        improved = improved.replace(/\.$/, '') + ` using ${keyword}.`;
    }
    return improved.trim();
}
import { getDb } from '../store/db.js';
import { getSessionUser } from '../security/auth.js';

function syncResumeToProfile(resume, authHeader) {
    if (!resume) return;
    try {
        const db = getDb();
        const now = new Date().toISOString();
        let userId = 'default';
        if (authHeader) {
            const token = authHeader.replace(/^Bearer\s+/i, '').trim();
            const sessionUser = getSessionUser(token);
            if (sessionUser?.id) {
                userId = sessionUser.id;
                // Update user profile_json
                const row = db.prepare('SELECT profile_json FROM users WHERE id = ?').get(userId);
                if (row) {
                    const uProfile = JSON.parse(row.profile_json);
                    uProfile.savedResume = resume;
                    if (resume.name && resume.name !== 'Candidate') uProfile.name = resume.name;
                    if (resume.title) uProfile.roleTitle = resume.title;
                    if (resume.contact?.phone) uProfile.phone = resume.contact.phone;
                    if (resume.contact?.location) uProfile.location = resume.contact.location;
                    if (resume.contact?.linkedin) uProfile.linkedin = resume.contact.linkedin;
                    if (resume.contact?.github) uProfile.github = resume.contact.github;
                    if (resume.contact?.portfolio) uProfile.portfolio = resume.contact.portfolio;
                    db.prepare('UPDATE users SET profile_json = ? WHERE id = ?').run(JSON.stringify(uProfile), userId);
                }
            }
        }
        // Sync candidate_profiles table
        const candidateRow = db.prepare('SELECT id, profile_json FROM candidate_profiles WHERE id = ?').get(userId);
        if (candidateRow) {
            let pJson = {};
            try { pJson = JSON.parse(candidateRow.profile_json); } catch {}
            const merged = { ...pJson, ...resume, hasResume: true, targetRole: resume.title || pJson.targetRole || 'Software Engineer' };
            db.prepare('UPDATE candidate_profiles SET profile_json = ?, raw_text = ?, updated_at = ? WHERE id = ?')
              .run(JSON.stringify(merged), resume.rawText || '', now, userId);
        } else {
            db.prepare('INSERT INTO candidate_profiles (id, profile_json, raw_text, target_role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
              .run(userId, JSON.stringify({ ...resume, hasResume: true }), resume.rawText || '', resume.title || 'Software Engineer', now, now);
        }
    } catch (e) {
        console.warn('[resume-sync] Warning syncing resume to profile:', e.message);
    }
}

resumeRouter.get('/', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.replace(/^Bearer\s+/i, '').trim();
            const sessionUser = getSessionUser(token);
            if (sessionUser?.id) {
                const db = getDb();
                const row = db.prepare('SELECT profile_json FROM users WHERE id = ?').get(sessionUser.id);
                if (row) {
                    const uProfile = JSON.parse(row.profile_json);
                    if (uProfile?.savedResume) {
                        return res.json({ resume: uProfile.savedResume, success: true, data: uProfile.savedResume });
                    }
                }
            }
        }
    } catch {}
    const r = getResume();
    if (!r)
        return res.json({ resume: null, success: true, data: null });
    res.json({ resume: r, success: true, data: r });
});

resumeRouter.post('/', (req, res) => {
    const r = req.body?.resume || req.body;
    if (!r || typeof r !== 'object') {
        return res.status(400).json({ success: false, error: 'Valid resume object required' });
    }
    setResume(r);
    syncResumeToProfile(r, req.headers.authorization);
    res.json({ success: true, resume: r, data: r });
});

resumeRouter.put('/', (req, res) => {
    const r = req.body?.resume || req.body;
    if (!r || typeof r !== 'object') {
        return res.status(400).json({ success: false, error: 'Valid resume object required' });
    }
    setResume(r);
    syncResumeToProfile(r, req.headers.authorization);
    res.json({ success: true, resume: r, data: r });
});
resumeRouter.get('/ats', (_req, res) => {
    const r = getResume();
    if (!r)
        return res.status(400).json({ success: false, error: 'No resume uploaded yet' });
    const report = evaluateResumeAts(r);
    res.json({ success: true, report, data: report });
});
resumeRouter.post('/ats', (req, res) => {
    const resume = (req.body?.resume || req.body);
    if (!resume || typeof resume !== 'object') {
        return res.status(400).json({ success: false, error: 'Valid resume object required' });
    }
    const report = evaluateResumeAts(resume);
    res.json({ success: true, report, data: report });
});
// Full scoring endpoint used by Resume Studio (§23 & ResumeBuilderSection)
resumeRouter.post('/score/full', (req, res) => {
    const resume = (req.body?.resume || req.body);
    if (!resume || typeof resume !== 'object') {
        return res.status(400).json({ success: false, error: 'Valid resume object required' });
    }
    const report = evaluateResumeAts(resume);
    res.json({ success: true, report, data: report });
});
resumeRouter.get('/ats-v2', (_req, res) => {
    const r = getResume();
    if (!r)
        return res.status(400).json({ success: false, error: 'No resume uploaded yet' });
    const canonical = {
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        skills: (r.skills || []).map((s) => ({ name: s })),
        experience: (r.experience || []).map((e) => ({
            company: e.company,
            title: e.title,
            bullets: e.bullets || [],
        })),
        education: (r.education || []).map((ed) => ({
            degree: ed.degree,
            institution: ed.institution || ed.school,
        })),
        projects: [],
        certifications: [],
    };
    const reportV2 = defaultAtsScorerV2.evaluate(canonical);
    res.json({ success: true, report: reportV2, data: reportV2 });
});
resumeRouter.post('/ats-v2', (req, res) => {
    const resume = (req.body?.resume || req.body);
    if (!resume || typeof resume !== 'object') {
        return res.status(400).json({ success: false, error: 'Valid resume object required' });
    }
    const canonical = {
        fullName: resume.fullName,
        email: resume.email,
        phone: resume.phone,
        skills: (resume.skills || []).map((s) => ({ name: s })),
        experience: (resume.experience || []).map((e) => ({
            company: e.company,
            title: e.title,
            bullets: e.bullets || [],
        })),
        education: (resume.education || []).map((ed) => ({
            degree: ed.degree,
            institution: ed.institution || ed.school,
        })),
        projects: [],
        certifications: [],
    };
    const reportV2 = defaultAtsScorerV2.evaluate(canonical);
    res.json({ success: true, report: reportV2, data: reportV2 });
});
// Targeted match comparison between resume and job description (TF-IDF + Cosine)
resumeRouter.post('/targeted-match', async (req, res) => {
    try {
        const { resume, jobDescription, targetKeywords } = req.body;
        if (!resume)
            return res.status(400).json({ error: 'resume required' });
        if (!jobDescription && (!targetKeywords || targetKeywords.length === 0)) {
            return res.status(400).json({ error: 'jobDescription or targetKeywords required' });
        }
        const jdText = [
            jobDescription || '',
            Array.isArray(targetKeywords) ? targetKeywords.join(' ') : targetKeywords || '',
        ].join(' ');
        const resumeText = [
            resume.summary || '',
            (resume.experience || []).flatMap((e) => e.bullets || []).join(' '),
            (resume.projects || []).flatMap((p) => p.bullets || []).join(' '),
            Object.values(resume.skills || {}).flat().join(' '),
            (resume.target_keywords || []).join(' '),
        ].join(' ');
        const resumeTokens = tokenize(resumeText);
        const jdTokens = tokenize(jdText);
        const idf = inverseDocumentFrequency([resumeTokens, jdTokens]);
        const resumeVec = vectorize(resumeTokens, idf);
        const jdVec = vectorize(jdTokens, idf);
        const similarity = cosineSimilarity(resumeVec, jdVec);
        const relevancyScore = Math.round(Math.min(100, similarity * 180));
        const resumeSet = new Set(resumeTokens);
        const jdSet = new Set(jdTokens);
        const matchedKeywords = [];
        const missingKeywords = [];
        for (const token of jdSet) {
            if (token.length < 3)
                continue;
            if (resumeSet.has(token)) {
                matchedKeywords.push(token);
            }
            else {
                missingKeywords.push(token);
            }
        }
        const sortByLength = (a, b) => b.length - a.length;
        const topMatched = matchedKeywords.sort(sortByLength).slice(0, 20);
        const topMissing = missingKeywords.sort(sortByLength).slice(0, 15);
        res.json({
            relevancyScore,
            matchedKeywords: topMatched,
            missingKeywords: topMissing,
            breakdown: [],
            source: 'tfidf-cosine-v1',
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'Targeted match failed' });
    }
});
// Truth-anchored AI magic write for resume bullets
resumeRouter.post('/magic-write', async (req, res) => {
    try {
        const { resume, bullet, keyword } = req.body;
        if (!resume)
            return res.status(400).json({ error: 'resume required' });
        if (!bullet || typeof bullet !== 'string')
            return res.status(400).json({ error: 'bullet string required' });
        const improved = deterministicBulletSuggestion(bullet, keyword);
        const suggestions = [{ text: improved, confidence: 'rule-based' }];
        // If the original had no metric, prompt the user to add one (never fabricate)
        const hints = [];
        if (!/\d/.test(bullet)) {
            hints.push('Add a metric to strengthen this bullet — e.g. "reduced load time by 40%", "served 10k users", "cut errors by 3x".');
        }
        res.json({ suggestions, source: 'deterministic-v2', guardrail: 'truth-anchored', hints });
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'Bullet improvement failed' });
    }
});
// Auto-fix diff generator (never auto-saves)
resumeRouter.post('/autofix', async (req, res) => {
    try {
        const { resume } = req.body;
        if (!resume)
            return res.status(400).json({ error: 'resume required' });
        const report = evaluateResumeAts(resume);
        const weakBullets = (report.bulletFeedback || [])
            .filter((b) => b.status === 'can_improve')
            .slice(0, 8);
        const diff = [];
        for (const fb of weakBullets) {
            let improved = fb.bullet;
            if (!fb.hasActionVerb) {
                improved = `Engineered ${fb.bullet.charAt(0).toLowerCase() + fb.bullet.slice(1)}`;
            }
            if (improved !== fb.bullet && improved.length > 10) {
                diff.push({
                    id: `change-${diff.length}`,
                    type: 'bullet',
                    section: fb.section,
                    before: fb.bullet,
                    after: improved,
                    rationale: fb.suggestion,
                    accepted: false,
                });
            }
        }
        res.json({
            diff,
            totalChanges: diff.length,
            warning: 'Never auto-applied. Candidate must explicitly review and accept each diff.',
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'Autofix failed' });
    }
});
// Clean LaTeX export with hyperlink and hierarchy preservation (§23)
resumeRouter.post('/export/latex', (req, res) => {
    try {
        const { latex } = req.body;
        if (!latex || typeof latex !== 'string') {
            return res.status(400).json({ error: 'LaTeX source required' });
        }
        const sanitized = sanitizeLatex(latex);
        res.json({
            success: true,
            sanitized,
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'Export failed' });
    }
});
// ── Skill-Gap Analysis ────────────────────────────────────────────────────
// POST /api/resume/skill-gap
// Compares resume against job description and returns a structured gap report.
resumeRouter.post('/skill-gap', (req, res) => {
    try {
        const { resume, jobDescription, targetRole } = req.body;
        if (!resume || typeof resume !== 'object') {
            return res.status(400).json({ success: false, error: 'Valid resume object required' });
        }
        if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 20) {
            return res.status(400).json({ success: false, error: 'jobDescription string (min 20 chars) required' });
        }
        const report = computeSkillGapReport(resume, jobDescription, targetRole);
        res.json({ success: true, report });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message || 'Skill gap analysis failed' });
    }
});

import rateLimit from 'express-rate-limit';

const parseRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many resume parse requests. Please wait a moment before trying again.' },
    skip: () => process.env.NODE_ENV === 'test',
});

resumeRouter.post('/parse', parseRateLimiter, async (req, res) => {
    try {
        const body = req.body;
        let parsed;
        const cleanB64 = (raw) => (raw || '').replace(/^data:[^;]+;base64,/, '');
        if (typeof body.text === 'string' && body.text.trim().length > 0) {
            parsed = await parseResumeText(body.text);
        }
        else if (body.pdfBase64 ||
            (body.fileData && body.mimeType?.includes('pdf')) ||
            body.fileName?.toLowerCase().endsWith('.pdf')) {
            const buf = Buffer.from(cleanB64(body.pdfBase64 || body.fileData), 'base64');
            parsed = await parseResumePdf(buf);
        }
        else if (body.docxBase64 ||
            (body.fileData &&
                (body.mimeType?.includes('word') || body.fileName?.toLowerCase().endsWith('.docx')))) {
            const buf = Buffer.from(cleanB64(body.docxBase64 || body.fileData), 'base64');
            parsed = await parseResumeDocx(buf);
        }
        else if (body.fileData) {
            const buf = Buffer.from(cleanB64(body.fileData), 'base64');
            try {
                parsed = await parseResumePdf(buf);
            }
            catch {
                try {
                    parsed = await parseResumeDocx(buf);
                }
                catch {
                    parsed = await parseResumeText(buf.toString('utf-8'));
                }
            }
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'Provide one of: text (.tex supported), pdfBase64, docxBase64, or fileData',
            });
        }
        // Evaluate immediate ATS report for UI score meters
        let atsReport = null;
        try {
            atsReport = evaluateResumeAts(parsed);
        }
        catch {
            // Non-fatal if scoring fails
        }
        setResume(parsed);
        syncResumeToProfile(parsed, req.headers.authorization);
        res.json({
            success: true,
            data: parsed,
            resume: parsed,
            atsReport,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || 'Failed to parse resume',
        });
    }
});

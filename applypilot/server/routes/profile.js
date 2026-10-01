import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../store/db.js';
import { parseResumeText, parseResumePdf, parseResumeDocx } from '../ai/resume-parser.js';
import { evaluateResumeAts } from '../scoring/ats-scorer.js';
import { buildLatexResume } from '../export/latex-resume.js';
import { tailorResumeForJob } from '../profile/tailor-engine.js';
import { getSessionUser } from '../security/auth.js';
import multer from 'multer';
import {
    isCloudinaryConfigured,
    uploadProfileImageToCloudinary,
    deleteProfileImageFromCloudinary,
} from '../storage/cloudinary.js';

// Multer: 5 MB limit for resumes; 3 MB limit for profile images
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });

export const profileRouter = Router();
function getProfileId(req) {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    if (token) {
        try {
            const user = getSessionUser(token);
            if (user && user.id) {
                return user.id;
            }
        }
        catch { }
    }
    return req.headers['x-profile-id'] || 'default';
}
profileRouter.get('/', (req, res) => {
    const db = getDb();
    const profile = db
        .prepare('SELECT * FROM candidate_profiles WHERE id = ?')
        .get(getProfileId(req));
    if (!profile)
        return res.json({ profile: null, success: true, data: null });
    const parsed = {
        ...profile,
        profile_json: JSON.parse(profile.profile_json),
        ats_scores: db
            .prepare('SELECT * FROM ats_scores WHERE resume_version_id IN (SELECT id FROM resume_versions WHERE profile_id = ?)')
            .all(profile.id),
        resume_versions: db
            .prepare('SELECT * FROM resume_versions WHERE profile_id = ? ORDER BY version_number DESC')
            .all(profile.id),
    };
    res.json({ profile: parsed, success: true, data: parsed });
});

import { setResume } from '../store/resume.js';

// Phase 1: Resume Upload Endpoint (Any Format)
profileRouter.post('/upload', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        
        const mimeType = req.file.mimetype || '';
        const buffer = req.file.buffer;
        const fileName = (req.file.originalname || '').toLowerCase();
        let parsed;

        if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
            parsed = await parseResumePdf(buffer);
        } else if (
            mimeType.includes('word') || 
            mimeType.includes('officedocument') || 
            fileName.endsWith('.docx') || 
            fileName.endsWith('.doc')
        ) {
            parsed = await parseResumeDocx(buffer);
        } else {
            parsed = await parseResumeText(buffer.toString('utf-8'));
        }

        const rawText = parsed.rawText || '';
        const db = getDb();
        const profileId = getProfileId(req);
        const now = new Date().toISOString();

        // Sync with candidate_profiles table
        const existing = db.prepare('SELECT id, profile_json FROM candidate_profiles WHERE id = ?').get(profileId);
        if (existing) {
            let pJson = {};
            try { pJson = JSON.parse(existing.profile_json); } catch {}
            const merged = { ...pJson, ...parsed, hasResume: true, targetRole: parsed.title || pJson.targetRole || 'Software Engineer' };
            db.prepare('UPDATE candidate_profiles SET raw_text = ?, profile_json = ?, target_role = ?, updated_at = ? WHERE id = ?')
              .run(rawText, JSON.stringify(merged), parsed.title || 'Software Engineer', now, profileId);
        } else {
            db.prepare('INSERT INTO candidate_profiles (id, created_at, updated_at, raw_text, profile_json, target_role) VALUES (?, ?, ?, ?, ?, ?)')
              .run(profileId, now, now, rawText, JSON.stringify({ ...parsed, hasResume: true }), parsed.title || 'Software Engineer');
        }

        // Also sync into session user if authenticated
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.replace(/^Bearer\s+/i, '').trim();
            const sessionUser = getSessionUser(token);
            if (sessionUser?.id) {
                const row = db.prepare('SELECT profile_json FROM users WHERE id = ?').get(sessionUser.id);
                if (row) {
                    const uProfile = JSON.parse(row.profile_json);
                    uProfile.savedResume = parsed;
                    if (parsed.name && parsed.name !== 'Candidate') uProfile.name = parsed.name;
                    if (parsed.title) uProfile.roleTitle = parsed.title;
                    if (parsed.contact?.phone) uProfile.phone = parsed.contact.phone;
                    if (parsed.contact?.location) uProfile.location = parsed.contact.location;
                    if (parsed.contact?.linkedin) uProfile.linkedin = parsed.contact.linkedin;
                    if (parsed.contact?.github) uProfile.github = parsed.contact.github;
                    if (parsed.contact?.portfolio) uProfile.portfolio = parsed.contact.portfolio;
                    db.prepare('UPDATE users SET profile_json = ? WHERE id = ?').run(JSON.stringify(uProfile), sessionUser.id);
                }
            }
        }

        // Set master in resumeStore for immediate Resume Studio sync
        setResume(parsed);

        // Save it to resume_versions as the master version
        const versionId = uuidv4();
        const versionCount = db.prepare('SELECT COUNT(*) as count FROM resume_versions WHERE profile_id = ?').get(profileId).count;
        
        try {
            db.prepare(`
                INSERT INTO resume_versions (id, profile_id, version_number, html_resume, latex_source, is_master)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(versionId, profileId, versionCount + 1, `<div>${rawText.slice(0, 500)}...</div>`, '', 1);
        } catch {}

        res.json({
            success: true,
            message: 'Resume uploaded and parsed successfully!',
            profile: parsed,
            resume: parsed,
            data: parsed,
            profileId
        });
    } catch (err) {
        console.error('Error in /api/profile/upload:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to upload resume' });
    }
});
profileRouter.get('/completeness', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req);
    const profile = db
        .prepare('SELECT * FROM candidate_profiles WHERE id = ?')
        .get(profileId);
    let profileJson = {};
    if (profile && profile.profile_json) {
        try {
            profileJson = JSON.parse(profile.profile_json);
        }
        catch { }
    }
    const resume = db
        .prepare('SELECT id FROM resume_versions WHERE profile_id = ?')
        .get(profileId);
    const hasName = Boolean(profileJson.fullName || profileJson.name || profile?.fullName);
    const hasTargetRole = Boolean(profileJson.targetRole || profile?.target_role);
    const hasLocation = Boolean(profileJson.location || profile?.location);
    const hasResume = Boolean(resume || profile?.raw_text || (profileJson.experience && profileJson.experience.length > 0));
    const hasSkills = Boolean(profileJson.skillsJson ||
        profile?.skills_json ||
        (Array.isArray(profileJson.skills) && profileJson.skills.length > 0) ||
        (profileJson.skills && typeof profileJson.skills === 'object' && Object.keys(profileJson.skills).length > 0));
    const flags = {
        hasName,
        hasTargetRole,
        hasLocation,
        hasResume,
        hasSkills,
    };
    const score = Object.values(flags).filter(Boolean).length;
    const onboardingComplete = Boolean(profileJson.onboardingComplete || profile?.onboarding_complete);
    res.json({
        success: true,
        completeness: {
            ...flags,
            completionPct: Math.round((score / 5) * 100),
            isComplete: onboardingComplete || score >= 4,
        },
    });
});
profileRouter.post('/', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req) !== 'default' ? getProfileId(req) : uuidv4();
    const now = new Date().toISOString();
    const profileData = req.body || {};
    const existing = db
        .prepare('SELECT * FROM candidate_profiles WHERE id = ?')
        .get(profileId);
    const targetRole = profileData.targetRole || null;
    const skillsJson = typeof profileData.skillsJson === 'string'
        ? profileData.skillsJson
        : profileData.skills
            ? JSON.stringify(profileData.skills)
            : null;
    const onboardingComplete = profileData.onboardingComplete ? 1 : 0;
    if (existing) {
        let existingJson = {};
        try {
            existingJson = JSON.parse(existing.profile_json);
        }
        catch { }
        const effectiveRole = targetRole || existingJson.roleTitle || existingJson.targetRole;
        const merged = {
            ...existingJson,
            ...profileData,
            roleTitle: effectiveRole,
            targetRole: effectiveRole
        };
        db.prepare(`
      UPDATE candidate_profiles
      SET profile_json = ?, raw_text = COALESCE(?, raw_text), target_role = COALESCE(?, target_role),
          skills_json = COALESCE(?, skills_json), onboarding_complete = COALESCE(?, onboarding_complete),
          updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(merged), profileData.rawText || null, effectiveRole, skillsJson, onboardingComplete, now, profileId);
        // Sync to users table if profileId is an authenticated user ID
        try {
            if (profileId.startsWith('usr_')) {
                db.prepare(`
          UPDATE users
          SET role_title = COALESCE(?, role_title), profile_json = ?
          WHERE id = ?
        `).run(effectiveRole, JSON.stringify(merged), profileId);
            }
        }
        catch { }
        return res.json({ success: true, data: { id: profileId, ...merged } });
    }
    db.prepare(`
    INSERT INTO candidate_profiles (id, profile_json, raw_text, target_role, skills_json, onboarding_complete, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(profileId, JSON.stringify(profileData), profileData.rawText || '', targetRole, skillsJson, onboardingComplete, now, now);
    // Sync to users table if profileId is an authenticated user ID
    try {
        if (profileId.startsWith('usr_')) {
            db.prepare(`
        UPDATE users
        SET role_title = COALESCE(?, role_title), profile_json = ?
        WHERE id = ?
      `).run(targetRole, JSON.stringify(profileData), profileId);
        }
    }
    catch { }
    res.json({ success: true, data: { id: profileId, ...profileData } });
});
profileRouter.post('/complete', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req);
    const now = new Date().toISOString();
    const profileData = req.body || {};
    const existing = db
        .prepare('SELECT * FROM candidate_profiles WHERE id = ?')
        .get(profileId);
    const targetRole = profileData.targetRole || null;
    const skillsJson = typeof profileData.skillsJson === 'string'
        ? profileData.skillsJson
        : profileData.skills
            ? JSON.stringify(profileData.skills)
            : null;
    if (existing) {
        let existingJson = {};
        try {
            existingJson = JSON.parse(existing.profile_json);
        }
        catch { }
        const merged = { ...existingJson, ...profileData, onboardingComplete: true };
        db.prepare(`
      UPDATE candidate_profiles
      SET profile_json = ?, raw_text = COALESCE(?, raw_text), target_role = COALESCE(?, target_role),
          skills_json = COALESCE(?, skills_json), onboarding_complete = 1, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(merged), profileData.rawText || null, targetRole, skillsJson, now, profileId);
        return res.json({ success: true, isComplete: true, data: { id: profileId, ...merged } });
    }
    db.prepare(`
    INSERT INTO candidate_profiles (id, profile_json, raw_text, target_role, skills_json, onboarding_complete, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(profileId, JSON.stringify({ ...profileData, onboardingComplete: true }), profileData.rawText || '', targetRole, skillsJson, now, now);
    res.json({ success: true, isComplete: true, data: { id: profileId, ...profileData } });
});
profileRouter.patch('/', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req);
    const updates = req.body;
    const now = new Date().toISOString();
    const existing = db
        .prepare('SELECT * FROM candidate_profiles WHERE id = ?')
        .get(profileId);
    if (!existing) {
        return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    const merged = { ...JSON.parse(existing.profile_json), ...updates };
    db.prepare(`
    UPDATE candidate_profiles 
    SET profile_json = ?, updated_at = ?, raw_text = COALESCE(?, raw_text)
    WHERE id = ?
  `).run(JSON.stringify(merged), now, updates.rawText, profileId);
    res.json({ success: true, data: { id: profileId, ...merged } });
});
// POST /api/profile/image  — upload profile photo (multipart file OR base64 JSON body)
profileRouter.post('/image', uploadImage.single('image'), async (req, res) => {
    try {
        const db = getDb();
        const profileId = getProfileId(req);

        const existing = db
            .prepare('SELECT * FROM candidate_profiles WHERE id = ?')
            .get(profileId);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Profile not found' });
        }

        // --- Resolve image buffer from multipart file OR JSON base64 body ---
        let imageBuffer;
        if (req.file?.buffer) {
            imageBuffer = req.file.buffer;
        } else if (req.body?.imageBase64) {
            const clean = req.body.imageBase64.replace(/^data:[^;]+;base64,/, '');
            imageBuffer = Buffer.from(clean, 'base64');
        } else {
            return res.status(400).json({
                success: false,
                error: 'Provide image as multipart field "image" or JSON field "imageBase64"',
            });
        }

        // --- Upload to Cloudinary if configured, otherwise fall back to base64 ---
        if (isCloudinaryConfigured()) {
            // Delete old Cloudinary image if present
            const pJson = JSON.parse(existing.profile_json || '{}');
            if (pJson.profileImagePublicId) {
                await deleteProfileImageFromCloudinary(pJson.profileImagePublicId);
            }

            const { url, publicId, thumbnailUrl } = await uploadProfileImageToCloudinary(
                imageBuffer,
                profileId
            );

            // Store URL (not base64) + publicId in profile_json for later deletion
            const merged = {
                ...pJson,
                profileImageUrl: url,
                profileImagePublicId: publicId,
                profileImageThumbnailUrl: thumbnailUrl,
                // Clear any legacy base64 blob
                profileImageBase64: undefined,
            };

            db.prepare(`
                UPDATE candidate_profiles
                SET profile_json = ?, profile_image = NULL, profile_image_mime = NULL, updated_at = ?
                WHERE id = ?
            `).run(JSON.stringify(merged), new Date().toISOString(), profileId);

            return res.json({
                success: true,
                data: { profileId, imageSet: true, imageUrl: url, thumbnailUrl },
            });
        }

        // --- Fallback: store as base64 (no Cloudinary configured) ---
        const mimeType = req.file?.mimetype || req.body?.mimeType || 'image/jpeg';
        const imageBase64 = imageBuffer.toString('base64');
        db.prepare(`
            UPDATE candidate_profiles
            SET profile_image = ?, profile_image_mime = ?, updated_at = ?
            WHERE id = ?
        `).run(imageBase64, mimeType, new Date().toISOString(), profileId);

        return res.json({ success: true, data: { profileId, imageSet: true } });
    } catch (err) {
        console.error('[profile/image] Upload error:', err);
        res.status(500).json({ success: false, error: err.message || 'Image upload failed' });
    }
});

// DELETE /api/profile/image — remove profile photo
profileRouter.delete('/image', async (req, res) => {
    try {
        const db = getDb();
        const profileId = getProfileId(req);

        const existing = db
            .prepare('SELECT profile_json FROM candidate_profiles WHERE id = ?')
            .get(profileId);

        // Delete from Cloudinary if we stored a publicId
        if (existing?.profile_json) {
            const pJson = JSON.parse(existing.profile_json);
            if (pJson.profileImagePublicId) {
                await deleteProfileImageFromCloudinary(pJson.profileImagePublicId);
            }
            // Clear Cloudinary refs from profile_json
            delete pJson.profileImageUrl;
            delete pJson.profileImagePublicId;
            delete pJson.profileImageThumbnailUrl;
            delete pJson.profileImageBase64;
            db.prepare(`
                UPDATE candidate_profiles
                SET profile_json = ?, profile_image = NULL, profile_image_mime = NULL, updated_at = ?
                WHERE id = ?
            `).run(JSON.stringify(pJson), new Date().toISOString(), profileId);
        } else {
            db.prepare(`
                UPDATE candidate_profiles
                SET profile_image = NULL, profile_image_mime = NULL, updated_at = ?
                WHERE id = ?
            `).run(new Date().toISOString(), profileId);
        }

        res.json({ success: true, data: { profileId, imageRemoved: true } });
    } catch (err) {
        console.error('[profile/image] Delete error:', err);
        res.status(500).json({ success: false, error: err.message || 'Image delete failed' });
    }
});
profileRouter.post('/parse-resume', async (req, res) => {
    try {
        const db = getDb();
        const profileId = getProfileId(req);
        const body = req.body;
        let parsed;
        if (typeof body.text === 'string' && body.text.trim().length > 0) {
            parsed = await parseResumeText(body.text);
        }
        else if (body.pdfBase64 ||
            (body.fileData && body.mimeType?.includes('pdf')) ||
            body.fileName?.toLowerCase().endsWith('.pdf')) {
            const b64 = body.pdfBase64 || body.fileData || '';
            const buf = Buffer.from(b64, 'base64');
            parsed = await parseResumePdf(buf);
        }
        else if (body.docxBase64 ||
            (body.fileData &&
                (body.mimeType?.includes('word') || body.fileName?.toLowerCase().endsWith('.docx')))) {
            const b64 = body.docxBase64 || body.fileData || '';
            const buf = Buffer.from(b64, 'base64');
            parsed = await parseResumeDocx(buf);
        }
        else if (body.fileData) {
            const buf = Buffer.from(body.fileData, 'base64');
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
                error: 'Provide one of: text, pdfBase64, docxBase64, or fileData',
            });
        }
        const now = new Date().toISOString();
        const existing = db
            .prepare('SELECT * FROM candidate_profiles WHERE id = ?')
            .get(profileId);
        if (existing) {
            const merged = { ...JSON.parse(existing.profile_json), ...parsed };
            db.prepare(`
        UPDATE candidate_profiles 
        SET profile_json = ?, raw_text = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(merged), parsed.rawText || '', now, profileId);
        }
        else {
            db.prepare(`
        INSERT INTO candidate_profiles (id, profile_json, raw_text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(profileId, JSON.stringify(parsed), parsed.rawText || '', now, now);
        }
        // Create master resume version
        const htmlResume = buildLatexResume(parsed); // This will need to return HTML
        const versionNumber = 1;
        const versionId = uuidv4();
        db.prepare(`
      INSERT INTO resume_versions (id, profile_id, version_number, html_resume, created_at, is_master)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(versionId, profileId, versionNumber, htmlResume, now, 1);
        // Score the resume
        const atsReport = evaluateResumeAts(parsed);
        const scoreId = uuidv4();
        db.prepare(`
      INSERT INTO ats_scores (id, resume_version_id, overall_score, format_score, keyword_score, content_score, structure_score, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(scoreId, versionId, atsReport.overallScore, atsReport.categories?.formatting?.score ?? atsReport.format ?? 0, atsReport.categories?.skills?.score ?? atsReport.keywords ?? 0, atsReport.categories?.quantifiable?.score ?? atsReport.content ?? 0, atsReport.categories?.impact?.score ?? atsReport.structure ?? 0, JSON.stringify(atsReport), now);
        // Log analytics event
        const eventId = uuidv4();
        db.prepare(`
      INSERT INTO analytics_events (id, profile_id, event_type, event_data_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(eventId, profileId, 'resume_parsed', JSON.stringify({ versionId, score: atsReport.score }), now);
        // Set master in resumeStore for immediate Resume Studio sync
        setResume(parsed);
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.replace(/^Bearer\s+/i, '').trim();
            const sessionUser = getSessionUser(token);
            if (sessionUser?.id) {
                const row = db.prepare('SELECT profile_json FROM users WHERE id = ?').get(sessionUser.id);
                if (row) {
                    const uProfile = JSON.parse(row.profile_json);
                    uProfile.savedResume = parsed;
                    if (parsed.name && parsed.name !== 'Candidate') uProfile.name = parsed.name;
                    if (parsed.title) uProfile.roleTitle = parsed.title;
                    if (parsed.contact?.phone) uProfile.phone = parsed.contact.phone;
                    if (parsed.contact?.location) uProfile.location = parsed.contact.location;
                    if (parsed.contact?.linkedin) uProfile.linkedin = parsed.contact.linkedin;
                    if (parsed.contact?.github) uProfile.github = parsed.contact.github;
                    if (parsed.contact?.portfolio) uProfile.portfolio = parsed.contact.portfolio;
                    db.prepare('UPDATE users SET profile_json = ? WHERE id = ?').run(JSON.stringify(uProfile), sessionUser.id);
                }
            }
        }
        res.json({
            success: true,
            data: { ...parsed, profileId, versionId, atsScore: atsReport.score || atsReport.overallScore || 0 },
            resume: parsed,
            profile: parsed,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || 'Failed to parse resume',
        });
    }
});
profileRouter.get('/templates', (req, res) => {
    const db = getDb();
    const templates = db
        .prepare('SELECT * FROM resume_templates ORDER BY is_default DESC, created_at DESC')
        .all();
    res.json({ success: true, data: templates });
});
profileRouter.post('/templates', (req, res) => {
    const db = getDb();
    const { name, description, latexTemplate, promptInjection, atsOptimized } = req.body;
    if (!name || !latexTemplate) {
        return res.status(400).json({ success: false, error: 'name and latexTemplate required' });
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
    INSERT INTO resume_templates (id, name, description, latex_template, prompt_injection, ats_optimized, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, description || '', latexTemplate, promptInjection || '', atsOptimized ? 1 : 0, now);
    res.json({
        success: true,
        data: { id, name, description, latexTemplate, promptInjection, atsOptimized },
    });
});
profileRouter.patch('/templates/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { name, description, latexTemplate, promptInjection, atsOptimized, isDefault } = req.body;
    const updates = [];
    const values = [];
    if (name) {
        updates.push('name = ?');
        values.push(name);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }
    if (latexTemplate) {
        updates.push('latex_template = ?');
        values.push(latexTemplate);
    }
    if (promptInjection !== undefined) {
        updates.push('prompt_injection = ?');
        values.push(promptInjection);
    }
    if (atsOptimized !== undefined) {
        updates.push('ats_optimized = ?');
        values.push(atsOptimized ? 1 : 0);
    }
    if (isDefault !== undefined) {
        updates.push('is_default = ?');
        values.push(isDefault ? 1 : 0);
        // If setting as default, unset others
        if (isDefault) {
            db.prepare('UPDATE resume_templates SET is_default = 0').run();
        }
    }
    if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No valid updates provided' });
    }
    values.push(id);
    db.prepare(`UPDATE resume_templates SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json({ success: true, data: { id } });
});
profileRouter.delete('/templates/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const template = db.prepare('SELECT * FROM resume_templates WHERE id = ?').get(id);
    if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
    }
    if (template.is_default) {
        return res.status(400).json({ success: false, error: 'Cannot delete default template' });
    }
    db.prepare('DELETE FROM resume_templates WHERE id = ?').run(id);
    res.json({ success: true, data: { id, deleted: true } });
});
profileRouter.get('/resume-versions', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req);
    const versions = db
        .prepare('SELECT * FROM resume_versions WHERE profile_id = ? ORDER BY version_number DESC')
        .all(profileId);
    // Attach ATS scores
    const versionsWithScores = versions.map((v) => {
        const score = db.prepare('SELECT * FROM ats_scores WHERE resume_version_id = ?').get(v.id);
        return { ...v, ats_score: score };
    });
    res.json({ success: true, data: versionsWithScores });
});
profileRouter.post('/resume-versions', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req);
    const { htmlResume, tailoredSummary, tailoredBullets, latexSource, templateName, isMaster } = req.body;
    if (!htmlResume) {
        return res.status(400).json({ success: false, error: 'htmlResume required' });
    }
    const existingVersions = db
        .prepare('SELECT MAX(version_number) as max FROM resume_versions WHERE profile_id = ?')
        .get(profileId);
    const versionNumber = (existingVersions?.max || 0) + 1;
    const versionId = uuidv4();
    const now = new Date().toISOString();
    // If this is master, unset other masters
    if (isMaster) {
        db.prepare('UPDATE resume_versions SET is_master = 0 WHERE profile_id = ?').run(profileId);
    }
    db.prepare(`
    INSERT INTO resume_versions (id, profile_id, version_number, html_resume, tailored_summary, tailored_bullets_json, latex_source, template_name, is_master, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(versionId, profileId, versionNumber, htmlResume, tailoredSummary || '', JSON.stringify(tailoredBullets || []), latexSource || '', templateName || '', isMaster ? 1 : 0, now);
    // Log analytics event
    const eventId = uuidv4();
    db.prepare(`
    INSERT INTO analytics_events (id, profile_id, event_type, event_data_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(eventId, profileId, 'resume_version_created', JSON.stringify({ versionId, versionNumber, isMaster }), now);
    res.json({ success: true, data: { id: versionId, versionNumber, profileId } });
});
profileRouter.get('/analytics', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req);
    const events = db
        .prepare('SELECT * FROM analytics_events WHERE profile_id = ? ORDER BY created_at DESC LIMIT 100')
        .all(profileId);
    const versions = db
        .prepare('SELECT * FROM resume_versions WHERE profile_id = ? ORDER BY version_number DESC')
        .all(profileId);
    const scores = db
        .prepare('SELECT * FROM ats_scores WHERE resume_version_id IN (SELECT id FROM resume_versions WHERE profile_id = ?)')
        .all(profileId);
    const applications = db
        .prepare('SELECT * FROM applications WHERE profile_id = ? ORDER BY created_at DESC')
        .all(profileId);
    // Calculate metrics
    const totalVersions = versions.length;
    const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + Number(b.overall_score || 0), 0) / scores.length)
        : 0;
    const latestScore = scores.length > 0 ? Number(scores[0].overall_score || 0) : 0;
    const applicationsCount = applications.length;
    const statusBreakdown = applications.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
    }, {});
    res.json({
        success: true,
        data: {
            totalVersions,
            avgScore,
            latestScore,
            applicationsCount,
            statusBreakdown,
            events: events.slice(0, 20),
            scoreHistory: scores
                .map((s) => ({ score: s.overall_score, date: s.created_at }))
                .reverse(),
        },
    });
});
profileRouter.post('/bulk-tailor', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req);
    const { jobIds, templateId, mode } = req.body; // mode: 'standard' | 'unrejectable'
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({ success: false, error: 'jobIds array required' });
    }
    const jobId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
    INSERT INTO bulk_tailoring_jobs (id, profile_id, template_id, job_ids_json, mode, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(jobId, profileId, templateId || 'template_default', JSON.stringify(jobIds), mode || 'standard', 'processing', now);
    // Log analytics event
    const eventId = uuidv4();
    db.prepare(`
    INSERT INTO analytics_events (id, profile_id, event_type, event_data_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(eventId, profileId, 'bulk_tailor_started', JSON.stringify({ jobId, count: jobIds.length, mode }), now);
    // Trigger background batch processing
    setTimeout(async () => {
        try {
            const profileRow = db
                .prepare('SELECT * FROM candidate_profiles WHERE id = ?')
                .get(profileId);
            const parsedResume = profileRow ? JSON.parse(profileRow.profile_json) : null;
            if (!parsedResume)
                return;
            const results = [];
            for (const jId of jobIds) {
                let jobData = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jId);
                if (!jobData) {
                    const jp = db.prepare('SELECT * FROM job_postings WHERE id = ?').get(jId);
                    if (jp && jp.job_json) {
                        jobData = JSON.parse(jp.job_json);
                    }
                }
                if (!jobData) {
                    jobData = {
                        id: jId,
                        title: 'Software Engineer',
                        company: 'Tech Enterprise',
                        description: 'Engineering role requiring TypeScript, React, APIs, and scalable systems.',
                        tags: ['React', 'TypeScript', 'Node.js'],
                    };
                }
                const tailored = await tailorResumeForJob(parsedResume, jobData, {
                    mode: mode || 'standard',
                    templateId,
                });
                results.push({
                    jobId: jId,
                    company: jobData.company,
                    title: jobData.title,
                    atsScore: tailored.atsScore,
                    tailoredSummary: tailored.tailoredSummary,
                    latexSource: tailored.latexSource,
                    status: 'completed',
                });
            }
            db.prepare(`
        UPDATE bulk_tailoring_jobs 
        SET status = 'completed', results_json = ?, completed_at = ?
        WHERE id = ?
      `).run(JSON.stringify(results), new Date().toISOString(), jobId);
            const doneEventId = uuidv4();
            db.prepare(`
        INSERT INTO analytics_events (id, profile_id, event_type, event_data_json, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(doneEventId, profileId, 'bulk_tailor_completed', JSON.stringify({ jobId, processed: results.length }), new Date().toISOString());
        }
        catch (batchErr) {
            console.error('[BulkTailor] Error processing batch:', batchErr);
            db.prepare(`UPDATE bulk_tailoring_jobs SET status = 'failed' WHERE id = ?`).run(jobId);
        }
    }, 50);
    res.json({ success: true, data: { jobId, status: 'processing' } });
});
profileRouter.get('/bulk-tailor/:jobId', (req, res) => {
    const db = getDb();
    const { jobId } = req.params;
    const job = db.prepare('SELECT * FROM bulk_tailoring_jobs WHERE id = ?').get(jobId);
    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.json({
        success: true,
        data: {
            ...job,
            jobIds: JSON.parse(job.job_ids_json),
            results: job.results_json ? JSON.parse(job.results_json) : null,
        },
    });
});
profileRouter.get('/bulk-tailor', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req);
    const jobs = db
        .prepare('SELECT * FROM bulk_tailoring_jobs WHERE profile_id = ? ORDER BY created_at DESC')
        .all(profileId);
    res.json({
        success: true,
        data: jobs.map((j) => ({
            ...j,
            jobIds: JSON.parse(j.job_ids_json),
            results: j.results_json ? JSON.parse(j.results_json) : null,
        })),
    });
});
profileRouter.get('/export/latex/:versionId', (req, res) => {
    const db = getDb();
    const { versionId } = req.params;
    const version = db.prepare('SELECT * FROM resume_versions WHERE id = ?').get(versionId);
    if (!version || !version.latex_source) {
        return res
            .status(404)
            .json({ success: false, error: 'LaTeX source not found for this version' });
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="resume_${version.version_number || 'version'}.tex"`);
    res.send(version.latex_source);
});
profileRouter.get('/export/html/:versionId', (req, res) => {
    const db = getDb();
    const { versionId } = req.params;
    const version = db.prepare('SELECT * FROM resume_versions WHERE id = ?').get(versionId);
    if (!version || !version.html_resume) {
        return res
            .status(404)
            .json({ success: false, error: 'HTML resume not found for this version' });
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(version.html_resume);
});

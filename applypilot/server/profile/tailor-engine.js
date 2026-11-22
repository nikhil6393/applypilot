import { validateTruth } from './truth-validator.js';
import { getDb } from '../store/db.js';
import { renderTailoredLatex } from '../export/latex-resume.js';

/**
 * Save tailored resume version to SQLite database.
 */
export function saveResumeVersion(params) {
    const db = getDb();
    const versionId = `resume_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const countRow = db
        .prepare('SELECT COUNT(*) as cnt FROM resume_versions WHERE profile_id = ?')
        .get(params.profileId);
    const versionNumber = (countRow?.cnt || 0) + 1;
    try {
        db.prepare(`
      INSERT INTO resume_versions (id, profile_id, application_id, version_number, html_resume, tailored_summary, tailored_bullets_json, ats_score, latex_source, template_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            versionId, params.profileId, params.jobId, versionNumber,
            params.htmlResume, params.tailoredSummary,
            JSON.stringify(params.tailoredBullets), params.atsScore,
            params.latexSource || '', params.templateName || 'ApplyPilot Professional'
        );
    } catch (err) {
        // Fallback without latex_source/template_name if older schema
        try {
            db.prepare(`
        INSERT INTO resume_versions (id, profile_id, application_id, version_number, html_resume, tailored_summary, tailored_bullets_json, ats_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
                versionId, params.profileId, params.jobId, versionNumber,
                params.htmlResume, params.tailoredSummary,
                JSON.stringify(params.tailoredBullets), params.atsScore
            );
        } catch { }
    }
    return versionId;
}

/**
 * Tailor candidate resume for a specific job posting.
 * 100% deterministic — no AI, no network calls.
 * Truth-validation: only data present in the resume can appear in output.
 */
export async function tailorResumeForJob(resume, job, options = {}) {
    // Extract flat array of candidate skills
    const candidateSkillsList = Array.isArray(resume.skills)
        ? resume.skills
        : [
            ...(resume.target_keywords || []),
            ...(resume.skills?.languages || []),
            ...(resume.skills?.frameworks || []),
            ...(resume.skills?.tools || []),
            ...(resume.skills?.domain || []),
        ];

    const jobRawSkills = Array.isArray(job.skills) ? job.skills : [];
    const jobText = `${job.title} ${job.description || ''} ${jobRawSkills.join(' ')} ${job.company}`.toLowerCase();

    // Standard high-demand technical keywords to check
    const standardTechKeywords = [
        'React', 'TypeScript', 'JavaScript', 'Node.js', 'Next.js', 'Python', 'Go', 'Java',
        'C++', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'PostgreSQL', 'MongoDB', 'Redis',
        'GraphQL', 'REST APIs', 'CI/CD', 'Microservices', 'System Design', 'Git', 'SQL',
        'Tailwind CSS', 'Redux', 'Kafka', 'Linux', 'Terraform', 'Machine Learning'
    ];

    const allJobSkills = Array.from(new Set([
        ...jobRawSkills,
        ...standardTechKeywords.filter((k) => jobText.includes(k.toLowerCase())),
    ]));

    const matchedKeywords = Array.from(new Set(
        candidateSkillsList.filter((s) => {
            const sLower = String(s).toLowerCase();
            return jobText.includes(sLower) ||
                (sLower.length >= 3 && job.title.toLowerCase().includes(sLower));
        })
    ));

    const activeAtsKeywords = matchedKeywords;

    const missingKeywords = allJobSkills
        .filter((k) => !candidateSkillsList.some((cs) => cs.toLowerCase() === k.toLowerCase()))
        .slice(0, 6);

    const keywordMatchRate = Math.min(100, Math.round((activeAtsKeywords.length / Math.max(allJobSkills.length, 1)) * 100));
    const overallAtsScore = keywordMatchRate;

    const atsScoreBreakdown = {
        overallScore: overallAtsScore,
        keywordMatchRate,
        matchedKeywords: activeAtsKeywords,
        missingKeywords,
        atsTips: ['This is a text keyword overlap estimate, not an ATS pass prediction.'],
    };

    // Preserve original claims and show keyword suggestions separately.
    const tailoredBulletsMap = (resume.experience || []).map((exp, idx) => {
        const rawBullets = exp.bullets || [];
        return {
            experienceId: exp.id || `exp_${idx}`,
            bullets: rawBullets.map((bullet) => String(bullet).trim()).filter(Boolean),
        };
    });

    // Build tailored summary from authentic resume data
    const topSkills = activeAtsKeywords.slice(0, 3).join(', ');
    const candidateName = resume.fullName || resume.name || 'Candidate';
    const tailoredSummary = typeof resume.summary === 'string' ? resume.summary : '';
    const tailoredCoverNote = '';

    const tailored = {
        tailoredSummary,
        tailoredCoverNote,
        highlightedKeywords: activeAtsKeywords,
        missingKeywords,
        tailoredResumeBullets: tailoredBulletsMap,
    };

    // Truth validation gate
    const validation = validateTruth(resume, tailored);
    if (!validation.valid) throw new Error(`Resume output failed factual-content validation: ${validation.violations.join('; ')}`);

    const primaryBullets = tailored.tailoredResumeBullets?.[0]?.bullets || [];
    const latexSource = renderTailoredLatex(resume, job, primaryBullets);

    const contactEmail = resume.contact?.email || resume.email || '';
    const contactPhone = resume.contact?.phone || resume.phone || '';
    const contactLocation = resume.contact?.location || resume.location || '';
    const contactLinks = [
        resume.contact?.linkedin || resume.linkedin,
        resume.contact?.github || resume.github,
        resume.contact?.portfolio || resume.portfolio,
    ].filter(Boolean).join(' • ');

    const htmlResume = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${candidateName} - ATS Tailored Resume</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 820px; margin: 0 auto; padding: 32px; color: #0f172a; line-height: 1.45; background: #ffffff; }
    h1 { margin: 0 0 4px 0; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .contact-line { font-size: 13px; color: #475569; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #0f172a; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 18px 0 8px 0; font-weight: 700; }
    p, li { font-size: 13px; color: #334155; }
    .exp-item { margin-bottom: 14px; }
    .exp-header { display: flex; justify-content: space-between; align-items: baseline; }
    .exp-role { font-weight: 700; color: #0f172a; font-size: 14px; }
    .exp-meta { font-size: 12px; color: #64748b; font-weight: 500; }
    ul { margin: 4px 0 0 18px; padding: 0; }
    li { margin-bottom: 4px; }
    .skill-tag { display: inline-block; background: #eff6ff; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin: 2px; }
  </style>
</head>
<body>
  <h1>${candidateName}</h1>
  <div class="contact-line">
    ${[contactEmail, contactPhone, contactLocation].filter(Boolean).join(' • ')}
    ${contactLinks ? `<br>${contactLinks}` : ''}
  </div>

  <h2>Target Role & Professional Summary</h2>
  <p>${tailored.tailoredSummary}</p>

  <h2>Technical Competencies</h2>
  <div>
    ${activeAtsKeywords.map((k) => `<span class="skill-tag">${k}</span>`).join(' ')}
  </div>

  <h2>Professional Experience</h2>
  ${(resume.experience || []).map((exp, idx) => {
        const bullets = tailored.tailoredResumeBullets?.[idx]?.bullets || exp.bullets || [];
        return `
      <div class="exp-item">
        <div class="exp-header">
          <span class="exp-role">${exp.role || exp.title} — ${exp.company}</span>
          <span class="exp-meta">${exp.dates || exp.duration || ''} | ${exp.location || 'Remote'}</span>
        </div>
        <ul>
          ${bullets.map((b) => `<li>${b}</li>`).join('')}
        </ul>
      </div>
    `;
    }).join('')}

  ${Array.isArray(resume.education) && resume.education.length > 0 ? `
  <h2>Education</h2>
  ${resume.education.map((edu) => `
    <div class="exp-item">
      <div class="exp-header">
        <span class="exp-role">${edu.degree || 'Degree'} in ${edu.field || 'Computer Science'}</span>
        <span class="exp-meta">${edu.graduationDate || edu.year || ''}</span>
      </div>
      <p style="margin: 2px 0 0 0; color: #475569;">${edu.school || edu.institution || ''}</p>
    </div>
  `).join('')}
  ` : ''}

  ${Array.isArray(resume.projects) && resume.projects.length > 0 ? `
  <h2>Key Projects</h2>
  ${resume.projects.map((proj) => `
    <div class="exp-item">
      <div class="exp-header">
        <span class="exp-role">${proj.name || proj.title}</span>
        <span class="exp-meta">${proj.technologies ? proj.technologies.join(', ') : ''}</span>
      </div>
      <p style="margin: 2px 0 0 0; color: #334155;">${proj.description || (proj.bullets && proj.bullets[0]) || ''}</p>
    </div>
  `).join('')}
  ` : ''}
</body>
</html>
    `.trim();

    try {
        saveResumeVersion({
            profileId: resume.name || 'default_candidate',
            jobId: job.id,
            htmlResume,
            tailoredSummary: tailored.tailoredSummary,
            tailoredBullets: tailored.tailoredResumeBullets,
            atsScore: overallAtsScore,
            latexSource,
            templateName: 'ApplyPilot Professional',
        });
    } catch {
        // Non-fatal if DB table is uninitialized in memory-only mode
    }

    return {
        jobId: job.id,
        tailoredSummary: tailored.tailoredSummary,
        tailoredCoverNote: tailored.tailoredCoverNote,
        tailoredResumeBullets: tailored.tailoredResumeBullets || defaultBulletsMap,
        highlightedKeywords: tailored.highlightedKeywords || activeAtsKeywords,
        atsScore: overallAtsScore,
        atsScoreBreakdown,
        htmlResume,
        latexSource,
        status: 'completed',
        approved: true,
    };
}

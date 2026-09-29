import { renderTailoredLatex } from '../export/latex-resume.js';

/**
 * Rank bullets by relevance to job skills (deterministic, no network).
 * Score = #skill matches + 1 if bullet contains a metric (number/%)
 */
function pickTopBullets(resume, job, k = 3) {
    const jSkills = new Set((job.skills || []).map((s) => s.toLowerCase()));
    const all = (resume.experience || []).flatMap((e) =>
        (e.bullets || []).map((b) => ({ bullet: b, exp: `${e.title || e.role} at ${e.company}` }))
    );
    const scored = all.map((b) => {
        const lower = b.bullet.toLowerCase();
        let s = 0;
        for (const sk of jSkills) if (lower.includes(sk)) s += 1;
        if (/\d+%|\d+x|\$\d+|\d+ (users|customers|requests|ms|seconds|hours|days)/i.test(b.bullet))
            s += 1;
        return { ...b, s };
    });
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, k).map((b) => b.bullet);
}

/**
 * Generate a deterministic cover note from resume + job data.
 * Never invents facts — only uses data present in resume/job objects.
 */
function buildCoverNote(resume, job, matchedSkills) {
    const name = resume.fullName || resume.name || 'the candidate';
    const topSkills = matchedSkills.slice(0, 3).join(', ') || (Array.isArray(resume.skills)
        ? resume.skills.slice(0, 3).join(', ')
        : Object.values(resume.skills || {}).flat().slice(0, 3).join(', '));

    return [
        `I am applying for the ${job.title} role at ${job.company}.`,
        topSkills
            ? `My experience with ${topSkills} maps directly to what you are looking for.`
            : 'My background aligns with the technical requirements of this role.',
        'I have attached my resume and would welcome the opportunity to discuss further.',
    ].join(' ');
}

export async function tailor(resume, job) {
    const bullets = pickTopBullets(resume, job, 3);

    // Skill match for cover note
    const jSkills = (job.skills || []).map((s) => s.toLowerCase());
    const resumeSkills = Array.isArray(resume.skills)
        ? resume.skills
        : Object.values(resume.skills || {}).flat();
    const matchedSkills = resumeSkills.filter((s) =>
        jSkills.some((jk) => s.toLowerCase().includes(jk) || jk.includes(s.toLowerCase()))
    );

    const cover = buildCoverNote(resume, job, matchedSkills);

    return {
        jobId: job.id,
        bullets,
        coverNote: cover,
        latex: renderTailoredLatex(resume, job, bullets),
        source: 'deterministic',
        status: 'completed',
        generatedAt: new Date().toISOString(),
    };
}

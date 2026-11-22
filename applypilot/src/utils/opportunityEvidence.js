/**
 * Opportunity Evidence & Translation Engine
 * 
 * Compares student resume evidence against job requirements with honest classifications:
 * - Direct Evidence: Explicitly demonstrated in work experience, projects, or coursework
 * - Partial Evidence: Mentioned only in a raw skills list without project context
 * - Unmentioned in Resume: Not detected in document (with explicit prompt to verify)
 * 
 * Pure functional utility — 0 dependencies, fast, 100% deterministic, testable.
 */

export function extractJobRequirements(job) {
  const reqs = new Set();
  
  // 1. Explicit skills from job object
  if (Array.isArray(job?.skills)) {
    for (const s of job.skills) {
      if (typeof s === 'string' && s.trim()) reqs.add(s.trim());
      else if (s?.name && typeof s.name === 'string') reqs.add(s.name.trim());
    }
  }

  // 2. High-signal keywords in title and description
  const combinedText = `${job?.title || ''} ${job?.description || ''} ${(job?.tags || []).join(' ')}`.toLowerCase();
  
  const techKeywords = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Docker', 'Kubernetes',
    'AWS', 'Git', 'REST APIs', 'GraphQL', 'Data Analysis', 'C++', 'Java',
    'Machine Learning', 'Linux', 'Tailwind CSS', 'Next.js', 'Django', 'FastAPI'
  ];

  for (const kw of techKeywords) {
    const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(combinedText)) {
      reqs.add(kw);
    }
  }

  return Array.from(reqs);
}

export function analyzeEvidence(resume, job) {
  const requirements = extractJobRequirements(job);
  
  // Extract student text sections defensively
  const rawSkills = resume?.skills;
  const skillList = Array.isArray(rawSkills)
    ? rawSkills
    : typeof rawSkills === 'object' && rawSkills !== null
      ? Object.values(rawSkills).flat()
      : [];
  const normalizedSkillList = skillList.map((s) => (typeof s === 'string' ? s.toLowerCase() : s?.name?.toLowerCase() || ''));

  // Extract work experience & projects text for direct evidence
  const experiences = Array.isArray(resume?.experience) ? resume.experience : [];
  const projects = Array.isArray(resume?.projects) ? resume.projects : [];

  const directEvidence = [];
  const partialEvidence = [];
  const unmentioned = [];

  for (const req of requirements) {
    const reqLower = req.toLowerCase();
    let foundInExp = false;
    let foundInProj = false;
    let expCitation = '';
    let projCitation = '';

    // Check Experience bullets for direct demonstration
    for (const exp of experiences) {
      const expText = `${exp?.title || ''} ${exp?.role || ''} ${exp?.company || ''} ${(exp?.bullets || []).join(' ')}`.toLowerCase();
      if (expText.includes(reqLower)) {
        foundInExp = true;
        const matchingBullet = (exp?.bullets || []).find((b) => b.toLowerCase().includes(reqLower));
        expCitation = matchingBullet ? `Used at ${exp?.company || 'work'}: "${matchingBullet.slice(0, 80)}..."` : `Referenced under ${exp?.company || 'Experience'}`;
        break;
      }
    }

    // Check Projects for direct demonstration
    if (!foundInExp) {
      for (const proj of projects) {
        const projText = `${proj?.name || proj?.title || ''} ${(proj?.bullets || []).join(' ')} ${proj?.description || ''}`.toLowerCase();
        if (projText.includes(reqLower)) {
          foundInProj = true;
          projCitation = `Demonstrated in project "${proj?.name || proj?.title || 'Project'}": ${(proj?.description || proj?.bullets?.[0] || '').slice(0, 80)}...`;
          break;
        }
      }
    }

    if (foundInExp || foundInProj) {
      directEvidence.push({
        requirement: req,
        status: 'direct',
        source: foundInExp ? 'work_experience' : 'project',
        citation: expCitation || projCitation || `Demonstrated in your background.`,
      });
    } else if (normalizedSkillList.some((s) => s.includes(reqLower) || reqLower.includes(s))) {
      partialEvidence.push({
        requirement: req,
        status: 'partial',
        citation: 'Listed in your skills summary, but not explicitly connected to a project or experience bullet.',
      });
    } else {
      unmentioned.push({
        requirement: req,
        status: 'unmentioned',
        note: 'Not mentioned in your current resume. If you have coursework, personal projects, or hands-on practice with this, consider verifying your experience.',
      });
    }
  }

  // Next steps logic tailored to student
  const nextSteps = [];
  if (unmentioned.length > 0) {
    nextSteps.push({
      action: 'Confirm Unmentioned Skills',
      description: `Review requirements like ${unmentioned.slice(0, 3).map((u) => u.requirement).join(', ')}. Do not fabricate experience, but add them if you have completed coursework or personal projects.`,
    });
  }
  if (partialEvidence.length > 0) {
    nextSteps.push({
      action: 'Elaborate on Partial Skills',
      description: `You have ${partialEvidence.slice(0, 2).map((p) => p.requirement).join(', ')} listed in skills. Consider highlighting an example bullet in your Projects section to prove hands-on proficiency.`,
    });
  }
  nextSteps.push({
    action: 'Review Job Listing Before Applying',
    description: 'Always cross-check the official employer portal for application deadlines and unique instructions.',
  });

  return {
    totalRequirements: requirements.length,
    directEvidence,
    partialEvidence,
    unmentioned,
    nextSteps,
  };
}

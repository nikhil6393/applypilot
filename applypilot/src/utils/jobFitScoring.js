const MAX_SCORED_JOBS = 250;

function strings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];
}

function skillNames(value) {
  const skills = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.values(value).flat()
      : [];
  return skills
    .map((skill) => typeof skill === 'string' ? skill : skill?.name)
    .filter((skill) => typeof skill === 'string' && skill.trim());
}

function normalizeExperience(items) {
  return (Array.isArray(items) ? items : []).slice(0, 60).map((item) => ({
    title: typeof item.title === 'string' ? item.title.slice(0, 150) : '',
    role: typeof item.role === 'string' ? item.role.slice(0, 150) : '',
    company: typeof item.company === 'string' ? item.company.slice(0, 150) : '',
    bullets: strings(item.bullets).slice(0, 30).map((bullet) => bullet.slice(0, 1000)),
  }));
}

function normalizeProjects(items) {
  return (Array.isArray(items) ? items : []).slice(0, 50).map((project) => ({
    name: typeof project.name === 'string' ? project.name.slice(0, 150) : '',
    description: typeof project.description === 'string' ? project.description.slice(0, 3000) : '',
    tech: skillNames(project.tech).slice(0, 50),
    bullets: strings(project.bullets).slice(0, 30).map((bullet) => bullet.slice(0, 1000)),
  }));
}

function asWorkplace(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'remote') return 'remote';
  if (normalized === 'hybrid') return 'hybrid';
  if (normalized === 'onsite' || normalized === 'on-site') return 'on-site';
  return undefined;
}

export function createFitScoringPayload(resume, user, jobs, filters = {}) {
  const activeSkills = skillNames(resume?.skills);
  const activeExperience = normalizeExperience(resume?.experience);
  const activeProjects = normalizeProjects(resume?.projects);
  const activeRoles = [
    ...strings(resume?.targetRoles),
    ...strings(resume?.target_roles),
    resume?.targetRole,
    resume?.roleTitle,
    resume?.title,
  ].filter((role) => typeof role === 'string' && role.trim());
  const hasActiveResumeEvidence = Boolean(
    activeSkills.length ||
    activeRoles.length ||
    activeExperience.some((item) => item.title || item.role || item.bullets.length) ||
    activeProjects.some((item) => item.name || item.description || item.tech.length || item.bullets.length),
  );
  const profile = user?.savedResume || user?.profile || user || {};
  const fallbackProjects = normalizeProjects(profile.projects);
  const candidateSkills = hasActiveResumeEvidence
    ? [...activeSkills, ...activeProjects.flatMap((project) => project.tech)]
    : [...skillNames(profile.skills), ...fallbackProjects.flatMap((project) => project.tech)];
  const candidateRoles = [
    ...activeRoles,
    ...strings(profile.targetRoles),
    ...strings(profile.target_roles),
    profile.targetRole,
    profile.roleTitle,
    user?.roleTitle,
  ].filter((role) => typeof role === 'string' && role.trim());
  const candidateProfile = {
    skills: [...new Set(candidateSkills)],
    targetRoles: [...new Set(candidateRoles)],
    experience: hasActiveResumeEvidence ? activeExperience : normalizeExperience(profile.experience),
    projects: hasActiveResumeEvidence ? activeProjects : fallbackProjects,
  };
  const locations = [
    ...strings(user?.preferences?.locations),
    user?.preferences?.location,
    filters.location,
  ].filter((location) => typeof location === 'string' && location.trim());
  const workplace = asWorkplace(filters.workplace || user?.preferences?.workplaceType);
  const preferredEmploymentTypes = filters.jobType === 'Internship'
    ? ['internship']
    : filters.jobType === 'Full Time'
      ? ['full-time']
      : [];

  const preferences = {};
  if (locations.length) preferences.preferredLocations = [...new Set(locations)];
  if (workplace) preferences.preferredWorkplace = workplace;
  if (preferredEmploymentTypes.length) preferences.preferredEmploymentTypes = preferredEmploymentTypes;

  return {
    resume: candidateProfile,
    jobs: (Array.isArray(jobs) ? jobs : []).slice(0, MAX_SCORED_JOBS).map((job, index) => ({
      id: String(job.id || `real-job-${index}`),
      title: String(job.title || '').slice(0, 300),
      description: String(job.description || '').slice(0, 12000),
      skills: skillNames(job.skills).slice(0, 200),
      tags: skillNames(job.tags).slice(0, 200),
      requirements: strings(job.requirements).slice(0, 100).map((item) => item.slice(0, 1000)),
      responsibilities: strings(job.responsibilities).slice(0, 100).map((item) => item.slice(0, 1000)),
      location: String(job.location || '').slice(0, 300),
      remote: typeof job.remote === 'boolean' ? job.remote : undefined,
      remoteType: ['remote', 'hybrid', 'on-site', 'unknown'].includes(job.remoteType) ? job.remoteType : undefined,
      workplace: String(job.workplace || '').slice(0, 40),
      employmentType: String(job.employmentType || '').slice(0, 40),
      postedAt: String(job.postedAt || job.postedDate || '').slice(0, 100),
    })),
    preferences,
  };
}

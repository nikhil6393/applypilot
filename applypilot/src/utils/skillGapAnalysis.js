import { extractKnownSkills, normalizeSkillList } from '../../packages/scoring/src/taxonomy.ts';
import { createFitScoringPayload } from './jobFitScoring.js';

const LEARNING_GUIDES = {
  aws: { url: 'https://docs.aws.amazon.com/training/', minutes: 180, topics: ['Core cloud concepts', 'IAM and secure access', 'Deploy a small cloud service'] },
  azure: { url: 'https://learn.microsoft.com/en-us/training/azure/', minutes: 180, topics: ['Core Azure services', 'Identity and access', 'Deploy a small cloud service'] },
  csharp: { url: 'https://learn.microsoft.com/en-us/dotnet/csharp/', minutes: 180, topics: ['C# language fundamentals', 'Types, collections, and async code', 'Build a small .NET application'] },
  docker: { url: 'https://docs.docker.com/get-started/', minutes: 120, topics: ['Images and containers', 'Build and run an image', 'Persist data and configure networking'] },
  django: { url: 'https://docs.djangoproject.com/en/stable/intro/tutorial01/', minutes: 150, topics: ['Models and the admin', 'Views and URL routing', 'Build and test a small web app'] },
  express: { url: 'https://expressjs.com/en/starter/hello-world.html', minutes: 120, topics: ['Routes and middleware', 'Request validation and error handling', 'Build a small REST endpoint'] },
  fastapi: { url: 'https://fastapi.tiangolo.com/tutorial/', minutes: 150, topics: ['Path operations and validation', 'Dependencies and errors', 'Build and test an API'] },
  gcp: { url: 'https://cloud.google.com/docs/training', minutes: 180, topics: ['Core cloud concepts', 'Identity and permissions', 'Deploy a small cloud service'] },
  git: { url: 'https://git-scm.com/docs/gittutorial', minutes: 90, topics: ['Track changes and commits', 'Branch and merge safely', 'Resolve a practice conflict'] },
  go: { url: 'https://go.dev/tour/', minutes: 150, topics: ['Types, functions, and control flow', 'Packages and error handling', 'Build a small concurrent service'] },
  html: { url: 'https://developer.mozilla.org/en-US/docs/Learn/HTML', minutes: 90, topics: ['Semantic document structure', 'Forms and accessible labels', 'Build a small responsive page'] },
  java: { url: 'https://dev.java/learn/', minutes: 180, topics: ['Java syntax and collections', 'Object-oriented design', 'Build and test a small application'] },
  javascript: { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', minutes: 150, topics: ['Language fundamentals', 'Asynchronous code and promises', 'Build a small browser feature'] },
  kubernetes: { url: 'https://kubernetes.io/docs/tutorials/', minutes: 180, topics: ['Pods and deployments', 'Services and configuration', 'Deploy and inspect an application'] },
  mongodb: { url: 'https://www.mongodb.com/docs/manual/tutorial/', minutes: 120, topics: ['Documents and collections', 'Queries and indexes', 'Model data for an application'] },
  nodejs: { url: 'https://nodejs.org/en/learn', minutes: 150, topics: ['Runtime and modules', 'Build an HTTP endpoint', 'Handle asynchronous work'] },
  nextjs: { url: 'https://nextjs.org/learn', minutes: 180, topics: ['Routing and layouts', 'Data fetching and rendering', 'Build a small full-stack page'] },
  mysql: { url: 'https://dev.mysql.com/doc/mysql-tutorial-excerpt/8.0/en/', minutes: 120, topics: ['Tables and SQL queries', 'Joins and transactions', 'Indexes and query efficiency'] },
  postgresql: { url: 'https://www.postgresql.org/docs/current/tutorial.html', minutes: 150, topics: ['Relational modeling and SQL', 'Joins and transactions', 'Indexes and query plans'] },
  python: { url: 'https://docs.python.org/3/tutorial/', minutes: 150, topics: ['Core syntax and data structures', 'Functions, modules, and exceptions', 'Build a small command-line tool'] },
  redis: { url: 'https://redis.io/docs/latest/develop/get-started/', minutes: 120, topics: ['Data structures and commands', 'Expiration and caching patterns', 'Use Redis in a small application'] },
  react: { url: 'https://react.dev/learn', minutes: 150, topics: ['Components and JSX', 'State and user interactions', 'Compose a small accessible interface'] },
  sql: { url: 'https://www.postgresql.org/docs/current/tutorial.html', minutes: 150, topics: ['Filtering and joining data', 'Aggregations and subqueries', 'Practice queries against a sample schema'] },
  'spring boot': { url: 'https://spring.io/guides', minutes: 180, topics: ['Create a Spring Boot application', 'Build REST endpoints', 'Add persistence and tests'] },
  typescript: { url: 'https://www.typescriptlang.org/docs/', minutes: 150, topics: ['Types and inference', 'Unions and narrowing', 'Type a small application feature'] },
};

function getLearningGuide(skillName) {
  const normalized = skillName.toLowerCase();
  const aliases = { 'c#': 'csharp', 'c++': 'cpp' };
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  return LEARNING_GUIDES[aliases[normalized] || normalized] || LEARNING_GUIDES[compact];
}

function profileText(profile) {
  return [
    ...(profile.experience || []).flatMap((item) => [item.title, item.role, ...(item.bullets || [])]),
    ...(profile.projects || []).flatMap((item) => [item.name, item.description, ...(item.bullets || [])]),
  ].filter(Boolean).join('\n');
}

export function getCandidateSkills(resume, user) {
  const profile = createFitScoringPayload(resume, user, []).resume;
  return normalizeSkillList([
    ...profile.skills,
    ...profile.projects.flatMap((project) => project.tech),
    ...extractKnownSkills(profileText(profile)),
  ]);
}

export function personalizeCompanySkillGaps(companies, candidateSkills) {
  const candidateSet = new Set(normalizeSkillList(candidateSkills).map((skill) => skill.toLowerCase()));
  const hasCandidateSkills = candidateSet.size > 0;

  return companies.map((company) => {
    const advertisedSkills = (company.advertisedSkills || [])
      .map((skill) => typeof skill === 'string' ? { name: skill, frequency: 1 } : skill)
      .filter((skill) => typeof skill?.name === 'string' && skill.name.trim())
      .map((skill) => ({ name: skill.name.trim(), frequency: Number.isFinite(skill.frequency) ? skill.frequency : 1 }));
    const matchedSkills = hasCandidateSkills
      ? advertisedSkills.filter((skill) => candidateSet.has(normalizeSkillList([skill.name])[0]?.toLowerCase()))
      : [];
    const missingSkillDetails = hasCandidateSkills
      ? advertisedSkills.filter((skill) => !candidateSet.has(normalizeSkillList([skill.name])[0]?.toLowerCase()))
      : [];
    const totalSkills = advertisedSkills.length;
    const matchPct = hasCandidateSkills && totalSkills
      ? Math.round((matchedSkills.length / totalSkills) * 100)
      : null;

    return {
      ...company,
      advertisedSkills,
      matchedSkills: matchedSkills.map((skill) => skill.name),
      missingSkillDetails,
      missingSkills: missingSkillDetails.map((skill) => skill.name),
      matchedCount: matchedSkills.length,
      missingCount: missingSkillDetails.length,
      totalSkills,
      matchPct,
      gapPct: matchPct === null ? null : 100 - matchPct,
      keySkillsToLearn: (hasCandidateSkills ? missingSkillDetails : advertisedSkills).slice(0, 6).map((skill, index) => ({
        name: skill.name,
        color: ['#db2777', '#2563eb', '#d97706', '#16a34a', '#8b5cf6', '#ef4444'][index],
        icon: ['target', 'box', 'code', 'shield', 'globe', 'sparkle'][index],
      })),
    };
  });
}

export function createPersonalizedLearningPath(skills) {
  return skills.slice(0, 4).map((skill) => {
    const guide = getLearningGuide(skill.name);
    return {
      name: skill.name,
      frequency: skill.frequency,
      estimatedMinutes: guide?.minutes || 90,
      resourceUrl: guide?.url || null,
      topics: guide?.topics || [
        `Learn the core concepts of ${skill.name}`,
        `Practice ${skill.name} with a small, focused exercise`,
        `Apply ${skill.name} to a project related to your target roles`,
      ],
    };
  });
}

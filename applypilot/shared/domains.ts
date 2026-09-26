/**
 * Shared Multi-Domain Role Expansion Configuration
 * Supports all major tech domains with exact Intern & Non-Intern keywords and covered sub-roles.
 */

export interface DomainDefinition {
  domainId: string;
  domainName: string;
  shortName: string;
  icon: string;
  internKeyword: string;
  internRoles: string[];
  internClusters: string[];
  fulltimeKeyword: string;
  fulltimeRoles: string[];
  fulltimeClusters: string[];
  description: string;
}

// ── 1. Software Engineering & Systems (Exact 20 Intern & 21 Fulltime Roles) ──
export const SOFTWARE_ENGINEER_INTERN_ROLES: string[] = [
  'Full Stack Developer Intern',
  'Full Stack Engineer Intern',
  'MERN Stack Developer Intern',
  'Software Engineer Intern – Full Stack',
  'Software Developer Intern – Full Stack',
  'React Developer Intern',
  'React.js Developer Intern',
  'Frontend Developer Intern',
  'Node.js Developer Intern',
  'Backend Developer Intern',
  'Backend Engineer Intern',
  'JavaScript Developer Intern',
  'Web Application Developer Intern',
  'Web Developer Intern',
  'Software Engineer Intern',
  'Systems Engineer Intern',
  'Systems Software Intern',
  'Application Engineer Intern',
  'Software Developer Intern',
  'Systems Developer Intern',
];

export const SOFTWARE_ENGINEER_FULLTIME_ROLES: string[] = [
  'Full Stack Developer',
  'Full Stack Engineer',
  'MERN Stack Developer',
  'Software Engineer – Full Stack',
  'Software Developer – Full Stack',
  'React Developer',
  'React.js Developer',
  'Frontend Developer',
  'Node.js Developer',
  'Backend Developer',
  'Backend Engineer',
  'JavaScript Developer',
  'Web Application Developer',
  'Web Developer',
  'Full Stack Software Engineer',
  'Software Engineer',
  'Software Developer',
  'Systems Engineer',
  'Systems Software Engineer',
  'Application Engineer',
  'Systems Developer',
];

// ── 2. Full Stack & MERN Development ─────────────────────────────────────────
export const FULLSTACK_INTERN_ROLES: string[] = [
  'Full Stack Developer Intern',
  'Full Stack Engineer Intern',
  'MERN Stack Developer Intern',
  'MEAN Stack Developer Intern',
  'PERN Stack Developer Intern',
  'Full Stack Web Developer Intern',
  'Full Stack Software Engineer Intern',
  'JavaScript Full Stack Intern',
  'Python Full Stack Intern',
  'Java Full Stack Intern',
  'Web Application Developer Intern',
  'Software Engineer Intern – Full Stack',
  'Software Developer Intern – Full Stack',
  'Junior Full Stack Developer Intern',
  'Full Stack UI/API Intern',
];

export const FULLSTACK_FULLTIME_ROLES: string[] = [
  'Full Stack Developer',
  'Full Stack Engineer',
  'MERN Stack Developer',
  'MEAN Stack Developer',
  'PERN Stack Developer',
  'Full Stack Web Developer',
  'Full Stack Software Engineer',
  'Senior Full Stack Engineer',
  'Staff Full Stack Engineer',
  'Python Full Stack Developer',
  'Java Full Stack Developer',
  'Web Application Developer',
  'Software Engineer – Full Stack',
  'Software Developer – Full Stack',
  'Lead Full Stack Developer',
];

// ── 3. Frontend & UI Engineering ─────────────────────────────────────────────
export const FRONTEND_INTERN_ROLES: string[] = [
  'Frontend Developer Intern',
  'Frontend Engineer Intern',
  'React Developer Intern',
  'React.js Developer Intern',
  'Next.js Developer Intern',
  'Vue.js Developer Intern',
  'Angular Developer Intern',
  'JavaScript Developer Intern',
  'TypeScript Developer Intern',
  'UI Developer Intern',
  'UI Engineer Intern',
  'Web Developer Intern',
  'Web Application Developer Intern',
  'Frontend Software Engineer Intern',
  'Client-Side Engineer Intern',
];

export const FRONTEND_FULLTIME_ROLES: string[] = [
  'Frontend Developer',
  'Frontend Engineer',
  'React Developer',
  'React.js Developer',
  'Next.js Developer',
  'Vue.js Developer',
  'Angular Developer',
  'JavaScript Developer',
  'TypeScript Developer',
  'UI Developer',
  'UI Engineer',
  'Web Developer',
  'Web Application Developer',
  'Senior Frontend Engineer',
  'Frontend Software Engineer',
];

// ── 4. Backend & API Engineering ─────────────────────────────────────────────
export const BACKEND_INTERN_ROLES: string[] = [
  'Backend Developer Intern',
  'Backend Engineer Intern',
  'Node.js Developer Intern',
  'Python Developer Intern',
  'Java Developer Intern',
  'Spring Boot Developer Intern',
  'Golang Developer Intern',
  'API Developer Intern',
  'Microservices Engineer Intern',
  'Database Engineer Intern',
  'Distributed Systems Intern',
  'Server-Side Developer Intern',
  'Backend Software Engineer Intern',
];

export const BACKEND_FULLTIME_ROLES: string[] = [
  'Backend Developer',
  'Backend Engineer',
  'Node.js Developer',
  'Python Developer',
  'Java Developer',
  'Spring Boot Developer',
  'Golang Developer',
  'API Engineer',
  'Microservices Engineer',
  'Database Engineer',
  'Senior Backend Engineer',
  'Staff Backend Engineer',
  'Distributed Systems Engineer',
  'Backend Software Engineer',
];

// ── 5. AI, Machine Learning & Data Science ───────────────────────────────────
export const AI_DATA_INTERN_ROLES: string[] = [
  'AI Engineer Intern',
  'Artificial Intelligence Intern',
  'Machine Learning Intern',
  'ML Engineer Intern',
  'Data Science Intern',
  'Data Scientist Intern',
  'Deep Learning Intern',
  'NLP Engineer Intern',
  'Computer Vision Intern',
  'LLM Engineer Intern',
  'Generative AI Intern',
  'Data Analyst Intern',
  'MLOps Intern',
];

export const AI_DATA_FULLTIME_ROLES: string[] = [
  'AI Engineer',
  'Artificial Intelligence Engineer',
  'Machine Learning Engineer',
  'ML Engineer',
  'Data Scientist',
  'Senior Data Scientist',
  'Deep Learning Engineer',
  'NLP Engineer',
  'Computer Vision Engineer',
  'LLM Engineer',
  'Generative AI Engineer',
  'Data Analyst',
  'MLOps Engineer',
  'AI Research Scientist',
];

// ── 6. Cloud, DevOps & Site Reliability Engineering (SRE) ────────────────────
export const DEVOPS_INTERN_ROLES: string[] = [
  'DevOps Engineer Intern',
  'DevOps Intern',
  'Cloud Engineer Intern',
  'Cloud Infrastructure Intern',
  'Site Reliability Engineer Intern',
  'SRE Intern',
  'Platform Engineer Intern',
  'Kubernetes Engineer Intern',
  'Infrastructure Engineer Intern',
  'AWS Cloud Intern',
  'Azure Cloud Intern',
  'Build & Release Intern',
];

export const DEVOPS_FULLTIME_ROLES: string[] = [
  'DevOps Engineer',
  'Senior DevOps Engineer',
  'Cloud Engineer',
  'Cloud Solutions Architect',
  'Site Reliability Engineer',
  'SRE',
  'Platform Engineer',
  'Kubernetes Engineer',
  'Infrastructure Engineer',
  'Systems Reliability Engineer',
  'Cloud Infrastructure Engineer',
  'Release Engineer',
];

// ── 7. Mobile App Development ────────────────────────────────────────────────
export const MOBILE_INTERN_ROLES: string[] = [
  'Mobile Developer Intern',
  'Mobile App Developer Intern',
  'iOS Developer Intern',
  'Android Developer Intern',
  'React Native Developer Intern',
  'Flutter Developer Intern',
  'Swift Developer Intern',
  'Kotlin Developer Intern',
  'Mobile Software Engineer Intern',
  'Cross-Platform Mobile Intern',
];

export const MOBILE_FULLTIME_ROLES: string[] = [
  'Mobile Developer',
  'Mobile App Developer',
  'iOS Developer',
  'Android Developer',
  'React Native Developer',
  'Flutter Developer',
  'Swift Developer',
  'Kotlin Developer',
  'Senior Mobile Engineer',
  'Mobile Software Engineer',
];

// ── 8. Cybersecurity & Information Security ─────────────────────────────────
export const CYBERSECURITY_INTERN_ROLES: string[] = [
  'Cybersecurity Intern',
  'Security Engineer Intern',
  'Information Security Intern',
  'InfoSec Intern',
  'Application Security Intern',
  'AppSec Intern',
  'Penetration Tester Intern',
  'Ethical Hacker Intern',
  'SOC Analyst Intern',
  'Cyber Defense Intern',
  'Network Security Intern',
  'Cloud Security Intern',
];

export const CYBERSECURITY_FULLTIME_ROLES: string[] = [
  'Cybersecurity Engineer',
  'Security Engineer',
  'Information Security Analyst',
  'InfoSec Engineer',
  'Application Security Engineer',
  'AppSec Engineer',
  'Penetration Tester',
  'Ethical Hacker',
  'SOC Analyst',
  'Senior Security Engineer',
  'Cloud Security Engineer',
  'Network Security Engineer',
];

// ── 9. QA, SDET & Automated Testing ──────────────────────────────────────────
export const QA_INTERN_ROLES: string[] = [
  'QA Intern',
  'Quality Assurance Intern',
  'SDET Intern',
  'Software Development Engineer in Test Intern',
  'Automation Test Engineer Intern',
  'QA Automation Intern',
  'Manual Test Intern',
  'Software Test Engineer Intern',
  'Performance Test Intern',
  'Test Automation Intern',
];

export const QA_FULLTIME_ROLES: string[] = [
  'QA Engineer',
  'Quality Assurance Engineer',
  'SDET',
  'Software Development Engineer in Test',
  'Automation Test Engineer',
  'QA Automation Engineer',
  'Senior QA Engineer',
  'Manual QA Tester',
  'Software Test Engineer',
  'Performance Test Engineer',
];

// ── 10. Data Engineering & Analytics ─────────────────────────────────────────
export const DATA_ENG_INTERN_ROLES: string[] = [
  'Data Engineer Intern',
  'Big Data Intern',
  'Data Platform Intern',
  'ETL Developer Intern',
  'Data Pipeline Intern',
  'Analytics Engineer Intern',
  'BI Developer Intern',
  'SQL Developer Intern',
];

export const DATA_ENG_FULLTIME_ROLES: string[] = [
  'Data Engineer',
  'Senior Data Engineer',
  'Big Data Engineer',
  'Data Platform Engineer',
  'ETL Developer',
  'Data Pipeline Engineer',
  'Analytics Engineer',
  'Business Intelligence Developer',
];

// ── Complete Domain Definitions Table ────────────────────────────────────────
export const ALL_DOMAINS: DomainDefinition[] = [
  {
    domainId: 'software_engineering',
    domainName: 'Software & Systems',
    shortName: 'Software',
    icon: '💻',
    description: 'Core SWE, Full Stack, Systems & Application development roles',
    internKeyword: 'Software Engineer Intern',
    internRoles: SOFTWARE_ENGINEER_INTERN_ROLES,
    internClusters: [
      'Software Engineer Intern',
      'Full Stack Developer Intern',
      'Frontend Developer Intern',
      'Backend Developer Intern',
      'React Developer Intern',
      'Node.js Developer Intern',
      'MERN Stack Developer Intern',
      'Systems Engineer Intern',
      'Web Developer Intern',
      'Software Developer Intern',
    ],
    fulltimeKeyword: 'Software Engineer',
    fulltimeRoles: SOFTWARE_ENGINEER_FULLTIME_ROLES,
    fulltimeClusters: [
      'Software Engineer',
      'Full Stack Developer',
      'Frontend Developer',
      'Backend Developer',
      'React Developer',
      'Node.js Developer',
      'MERN Stack Developer',
      'Systems Engineer',
      'Web Developer',
      'Software Developer',
    ],
  },
  {
    domainId: 'fullstack',
    domainName: 'Full Stack & MERN',
    shortName: 'Full Stack',
    icon: '⚡',
    description: 'End-to-end web apps, MERN/MEAN stack, and full-stack software',
    internKeyword: 'Full Stack Developer Intern',
    internRoles: FULLSTACK_INTERN_ROLES,
    internClusters: [
      'Full Stack Developer Intern',
      'MERN Stack Developer Intern',
      'Full Stack Engineer Intern',
      'JavaScript Full Stack Intern',
      'Web Application Developer Intern',
    ],
    fulltimeKeyword: 'Full Stack Developer',
    fulltimeRoles: FULLSTACK_FULLTIME_ROLES,
    fulltimeClusters: [
      'Full Stack Developer',
      'Full Stack Engineer',
      'MERN Stack Developer',
      'Full Stack Software Engineer',
      'Web Application Developer',
    ],
  },
  {
    domainId: 'frontend',
    domainName: 'Frontend & React',
    shortName: 'Frontend',
    icon: '🎨',
    description: 'React, Next.js, TypeScript, Vue, and modern UI engineering',
    internKeyword: 'Frontend Developer Intern',
    internRoles: FRONTEND_INTERN_ROLES,
    internClusters: [
      'Frontend Developer Intern',
      'React Developer Intern',
      'Next.js Developer Intern',
      'JavaScript Developer Intern',
      'UI Engineer Intern',
    ],
    fulltimeKeyword: 'Frontend Developer',
    fulltimeRoles: FRONTEND_FULLTIME_ROLES,
    fulltimeClusters: [
      'Frontend Developer',
      'React Developer',
      'Next.js Developer',
      'Frontend Engineer',
      'JavaScript Developer',
    ],
  },
  {
    domainId: 'backend',
    domainName: 'Backend & APIs',
    shortName: 'Backend',
    icon: '⚙️',
    description: 'Node.js, Python, Java, Spring Boot, microservices, and databases',
    internKeyword: 'Backend Developer Intern',
    internRoles: BACKEND_INTERN_ROLES,
    internClusters: [
      'Backend Developer Intern',
      'Node.js Developer Intern',
      'Python Developer Intern',
      'Java Developer Intern',
      'API Engineer Intern',
    ],
    fulltimeKeyword: 'Backend Developer',
    fulltimeRoles: BACKEND_FULLTIME_ROLES,
    fulltimeClusters: [
      'Backend Developer',
      'Backend Engineer',
      'Node.js Developer',
      'Python Developer',
      'Java Developer',
    ],
  },
  {
    domainId: 'ai_ml_data',
    domainName: 'AI, ML & Data Science',
    shortName: 'AI & Data',
    icon: '🤖',
    description: 'Machine learning, deep learning, LLMs, NLP, and data science',
    internKeyword: 'AI Engineer Intern',
    internRoles: AI_DATA_INTERN_ROLES,
    internClusters: [
      'AI Engineer Intern',
      'Machine Learning Intern',
      'Data Science Intern',
      'Data Scientist Intern',
      'LLM Engineer Intern',
    ],
    fulltimeKeyword: 'AI Engineer',
    fulltimeRoles: AI_DATA_FULLTIME_ROLES,
    fulltimeClusters: [
      'AI Engineer',
      'Machine Learning Engineer',
      'Data Scientist',
      'ML Engineer',
      'LLM Engineer',
    ],
  },
  {
    domainId: 'devops_cloud',
    domainName: 'Cloud & DevOps',
    shortName: 'DevOps',
    icon: '☁️',
    description: 'AWS, Azure, Docker, Kubernetes, CI/CD, and Site Reliability',
    internKeyword: 'DevOps Engineer Intern',
    internRoles: DEVOPS_INTERN_ROLES,
    internClusters: [
      'DevOps Engineer Intern',
      'Cloud Engineer Intern',
      'Site Reliability Engineer Intern',
      'Platform Engineer Intern',
    ],
    fulltimeKeyword: 'DevOps Engineer',
    fulltimeRoles: DEVOPS_FULLTIME_ROLES,
    fulltimeClusters: [
      'DevOps Engineer',
      'Cloud Engineer',
      'Site Reliability Engineer',
      'Platform Engineer',
    ],
  },
  {
    domainId: 'mobile',
    domainName: 'Mobile App',
    shortName: 'Mobile',
    icon: '📱',
    description: 'iOS, Android, React Native, Flutter, Swift, and Kotlin',
    internKeyword: 'Mobile Developer Intern',
    internRoles: MOBILE_INTERN_ROLES,
    internClusters: [
      'Mobile Developer Intern',
      'React Native Developer Intern',
      'iOS Developer Intern',
      'Android Developer Intern',
      'Flutter Developer Intern',
    ],
    fulltimeKeyword: 'Mobile Developer',
    fulltimeRoles: MOBILE_FULLTIME_ROLES,
    fulltimeClusters: [
      'Mobile Developer',
      'React Native Developer',
      'iOS Developer',
      'Android Developer',
      'Flutter Developer',
    ],
  },
  {
    domainId: 'cybersecurity',
    domainName: 'Cybersecurity',
    shortName: 'Security',
    icon: '🛡️',
    description: 'InfoSec, application security, penetration testing, and SOC',
    internKeyword: 'Cybersecurity Intern',
    internRoles: CYBERSECURITY_INTERN_ROLES,
    internClusters: [
      'Cybersecurity Intern',
      'Security Analyst Intern',
      'Application Security Intern',
      'Penetration Tester Intern',
    ],
    fulltimeKeyword: 'Cybersecurity Engineer',
    fulltimeRoles: CYBERSECURITY_FULLTIME_ROLES,
    fulltimeClusters: [
      'Cybersecurity Engineer',
      'Security Engineer',
      'Application Security Engineer',
      'Penetration Tester',
    ],
  },
  {
    domainId: 'qa_sdet',
    domainName: 'QA & Testing',
    shortName: 'QA / SDET',
    icon: '🧪',
    description: 'SDET, automated testing, Cypress, Playwright, and quality assurance',
    internKeyword: 'QA Intern',
    internRoles: QA_INTERN_ROLES,
    internClusters: [
      'QA Intern',
      'SDET Intern',
      'Automation Test Engineer Intern',
      'Quality Assurance Intern',
    ],
    fulltimeKeyword: 'QA Engineer',
    fulltimeRoles: QA_FULLTIME_ROLES,
    fulltimeClusters: [
      'QA Engineer',
      'SDET',
      'Automation Test Engineer',
      'Quality Assurance Engineer',
    ],
  },
  {
    domainId: 'data_engineering',
    domainName: 'Data Engineering',
    shortName: 'Data Eng',
    icon: '📊',
    description: 'Data pipelines, ETL, Snowflake, Spark, BigQuery, and SQL architecture',
    internKeyword: 'Data Engineer Intern',
    internRoles: DATA_ENG_INTERN_ROLES,
    internClusters: [
      'Data Engineer Intern',
      'Big Data Intern',
      'ETL Developer Intern',
      'Analytics Engineer Intern',
    ],
    fulltimeKeyword: 'Data Engineer',
    fulltimeRoles: DATA_ENG_FULLTIME_ROLES,
    fulltimeClusters: [
      'Data Engineer',
      'Big Data Engineer',
      'ETL Developer',
      'Analytics Engineer',
    ],
  },
];

/**
 * Detects domain definition from query string
 */
export function detectDomainFromQuery(query: string): DomainDefinition | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();

  // 1. Direct main keyword match
  for (const dom of ALL_DOMAINS) {
    if (
      q === dom.internKeyword.toLowerCase() ||
      q === dom.fulltimeKeyword.toLowerCase() ||
      q.includes(dom.internKeyword.toLowerCase()) ||
      q.includes(dom.fulltimeKeyword.toLowerCase())
    ) {
      return dom;
    }
  }

  // 2. Keyword tokens match
  if (/\b(mern|full[\s-]?stack|fullstack)\b/i.test(q)) {
    return ALL_DOMAINS.find((d) => d.domainId === 'fullstack')!;
  }
  if (/\b(react|frontend|front[\s-]?end|ui developer|next\.?js|vue|angular)\b/i.test(q)) {
    return ALL_DOMAINS.find((d) => d.domainId === 'frontend')!;
  }
  if (/\b(backend|back[\s-]?end|node\.?js|nodejs|python developer|java developer|golang|spring boot)\b/i.test(q)) {
    return ALL_DOMAINS.find((d) => d.domainId === 'backend')!;
  }
  if (/\b(ai|artificial intelligence|machine learning|data science|data scientist|mlops|llm|deep learning)\b/i.test(q)) {
    return ALL_DOMAINS.find((d) => d.domainId === 'ai_ml_data')!;
  }
  if (/\b(devops|cloud engineer|sre|site reliability|kubernetes|platform engineer|infrastructure engineer)\b/i.test(q)) {
    return ALL_DOMAINS.find((d) => d.domainId === 'devops_cloud')!;
  }
  if (/\b(mobile|android|ios|react native|flutter|swift|kotlin)\b/i.test(q)) {
    return ALL_DOMAINS.find((d) => d.domainId === 'mobile')!;
  }
  if (/\b(security|cyber|cybersecurity|infosec|penetration tester|soc analyst|appsec)\b/i.test(q)) {
    return ALL_DOMAINS.find((d) => d.domainId === 'cybersecurity')!;
  }
  if (/\b(qa|sdet|quality assurance|automation test|test engineer)\b/i.test(q)) {
    return ALL_DOMAINS.find((d) => d.domainId === 'qa_sdet')!;
  }
  if (/\b(data engineer|big data|etl|data pipeline|snowflake|spark)\b/i.test(q)) {
    return ALL_DOMAINS.find((d) => d.domainId === 'data_engineering')!;
  }
  if (/\b(software engineer|software developer|sde|swe|systems engineer|systems developer)\b/i.test(q)) {
    return ALL_DOMAINS.find((d) => d.domainId === 'software_engineering')!;
  }

  // 3. Match any individual role
  for (const dom of ALL_DOMAINS) {
    if (
      dom.internRoles.some((r) => q === r.toLowerCase() || q.includes(r.toLowerCase())) ||
      dom.fulltimeRoles.some((r) => q === r.toLowerCase() || q.includes(r.toLowerCase()))
    ) {
      return dom;
    }
  }

  return null;
}

/**
 * Checks whether a job matches any role in the detected domain
 */
export function matchesDomainJob(domainId: string, titleOrText: string, isIntern: boolean): boolean {
  if (!titleOrText) return false;
  const t = titleOrText.toLowerCase().replace(/[–—\-]/g, ' ');
  const dom = ALL_DOMAINS.find((d) => d.domainId === domainId);
  if (!dom) return false;

  const roles = isIntern ? dom.internRoles : dom.fulltimeRoles;
  return roles.some((role) => {
    const rLower = role.toLowerCase().replace(/[–—\-]/g, ' ');
    if (t.includes(rLower)) return true;
    const tokens = rLower
      .split(/\s+/)
      .filter((tok) => tok.length > 2 && !['intern', 'developer', 'engineer', 'stack'].includes(tok));
    return tokens.length > 0 && tokens.every((tok) => t.includes(tok));
  });
}

/**
 * Get expanded roles for a query / domain
 */
export function getExpandedRoles(query: string, jobType?: string): string[] {
  const normalizedQuery = (query || '').toLowerCase().trim();
  const isIntern = jobType === 'internship' || /\b(intern|internship|trainee|co-?op)\b/i.test(normalizedQuery);

  const dom = detectDomainFromQuery(normalizedQuery);
  if (dom) {
    return isIntern ? dom.internRoles : dom.fulltimeRoles;
  }

  return isIntern ? SOFTWARE_ENGINEER_INTERN_ROLES : SOFTWARE_ENGINEER_FULLTIME_ROLES;
}

/**
 * Get search clusters for multi-cluster scraping
 */
export function getScraperSearchClusters(query: string, jobType?: string): string[] {
  const normalizedQuery = (query || '').toLowerCase().trim();
  const isIntern = jobType === 'internship' || /\b(intern|internship|trainee|co-?op)\b/i.test(normalizedQuery);

  const dom = detectDomainFromQuery(normalizedQuery);
  if (dom) {
    return isIntern ? dom.internClusters : dom.fulltimeClusters;
  }

  return isIntern ? ALL_DOMAINS[0].internClusters : ALL_DOMAINS[0].fulltimeClusters;
}

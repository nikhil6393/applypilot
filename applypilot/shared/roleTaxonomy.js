/**
 * LinkedIn-Grade Semantic Role Taxonomy & Synonym Expansion Engine
 * 
 * Maps search queries to canonical role clusters, expands aliases and sub-disciplines,
 * and performs multi-tiered relevance matching across job title, company, skills, and tags.
 */

// ── 1. CANONICAL CLUSTERS & SUB-DISCIPLINES ──────────────────────────────────

export const ROLE_CLUSTERS = {
  software_engineering: {
    id: 'software_engineering',
    label: 'Software Engineering',
    umbrellaKeywords: [
      'software engineer',
      'software engineering',
      'software developer',
      'software development',
      'sde',
      'swe',
      'programmer',
      'systems engineer',
      'application engineer',
      'applications engineer',
      'coding',
      'developer',
      'engineer',
    ],
    subDisciplines: {
      fullstack: {
        label: 'Full Stack',
        badge: 'Full Stack',
        keywords: [
          'full stack',
          'fullstack',
          'full-stack',
          'mern',
          'mean',
          'web application',
          'web developer',
          'web engineer',
        ],
      },
      frontend: {
        label: 'Frontend',
        badge: 'Frontend',
        keywords: [
          'frontend',
          'front-end',
          'front end',
          'react',
          'reactjs',
          'react.js',
          'nextjs',
          'next.js',
          'vue',
          'vuejs',
          'vue.js',
          'angular',
          'javascript',
          'typescript',
          'ui developer',
          'ui engineer',
          'client engineer',
          'web ui',
        ],
      },
      backend: {
        label: 'Backend',
        badge: 'Backend',
        keywords: [
          'backend',
          'back-end',
          'back end',
          'node',
          'nodejs',
          'node.js',
          'express',
          'expressjs',
          'python',
          'django',
          'fastapi',
          'flask',
          'java',
          'spring',
          'spring boot',
          'golang',
          'go developer',
          'go engineer',
          'c++',
          'cpp',
          'c#',
          '.net',
          'dotnet',
          'api developer',
          'api engineer',
          'server engineer',
          'microservices',
        ],
      },
      mobile: {
        label: 'Mobile',
        badge: 'Mobile',
        keywords: [
          'mobile',
          'android',
          'ios',
          'flutter',
          'react native',
          'react-native',
          'swift',
          'kotlin',
          'app developer',
        ],
      },
      systems_cloud: {
        label: 'Systems & Cloud',
        badge: 'Systems',
        keywords: [
          'systems software',
          'systems developer',
          'embedded',
          'firmware',
          'distributed systems',
          'platform engineer',
          'infrastructure engineer',
        ],
      },
    },
  },

  data_analytics: {
    id: 'data_analytics',
    label: 'Data Science & Analytics',
    umbrellaKeywords: [
      'data',
      'data analytics',
      'analytics',
      'data science',
      'data scientist',
      'business intelligence',
      'bi',
    ],
    subDisciplines: {
      data_analyst: {
        label: 'Data Analyst',
        badge: 'Analytics',
        keywords: ['data analyst', 'business analyst', 'bi analyst', 'analytics engineer', 'sql analyst', 'tableau', 'power bi'],
      },
      data_scientist: {
        label: 'Data Scientist',
        badge: 'Data Science',
        keywords: ['data scientist', 'statistical analyst', 'quantitative', 'statistician'],
      },
      data_engineer: {
        label: 'Data Engineer',
        badge: 'Data Eng',
        keywords: ['data engineer', 'etl', 'spark', 'data pipeline', 'big data', 'database developer', 'sql developer'],
      },
    },
  },

  ai_ml: {
    id: 'ai_ml',
    label: 'AI & Machine Learning',
    umbrellaKeywords: [
      'ai',
      'artificial intelligence',
      'ml',
      'machine learning',
      'deep learning',
      'genai',
      'generative ai',
      'llm',
      'nlp',
      'computer vision',
    ],
    subDisciplines: {
      ml_engineer: {
        label: 'ML Engineer',
        badge: 'AI / ML',
        keywords: ['machine learning engineer', 'ml engineer', 'applied ai', 'deep learning engineer'],
      },
      ai_research: {
        label: 'AI Research & NLP',
        badge: 'AI / LLM',
        keywords: ['nlp engineer', 'computer vision', 'prompt engineer', 'generative ai engineer', 'ai developer'],
      },
    },
  },

  cloud_devops: {
    id: 'cloud_devops',
    label: 'Cloud & DevOps',
    umbrellaKeywords: [
      'cloud',
      'devops',
      'sre',
      'site reliability',
      'infrastructure',
      'platform',
    ],
    subDisciplines: {
      devops: {
        label: 'DevOps & SRE',
        badge: 'DevOps / SRE',
        keywords: ['devops', 'site reliability', 'sre', 'ci/cd', 'kubernetes', 'docker', 'terraform'],
      },
      cloud_eng: {
        label: 'Cloud Engineer',
        badge: 'Cloud',
        keywords: ['cloud engineer', 'cloud architect', 'aws', 'azure', 'gcp'],
      },
    },
  },

  qa_testing: {
    id: 'qa_testing',
    label: 'Quality Assurance & Testing',
    umbrellaKeywords: [
      'qa',
      'quality assurance',
      'tester',
      'testing',
      'sdet',
      'test engineer',
    ],
    subDisciplines: {
      sdet: {
        label: 'SDET & Automation',
        badge: 'SDET',
        keywords: ['sdet', 'automation test', 'automation engineer', 'selenium', 'cypress', 'playwright', 'test automation'],
      },
      qa_manual: {
        label: 'QA Engineer',
        badge: 'QA Testing',
        keywords: ['qa engineer', 'software tester', 'quality analyst', 'test engineer'],
      },
    },
  },

  cybersecurity: {
    id: 'cybersecurity',
    label: 'Cybersecurity',
    umbrellaKeywords: [
      'cyber',
      'cybersecurity',
      'security',
      'infosec',
      'information security',
    ],
    subDisciplines: {
      sec_eng: {
        label: 'Security Engineer',
        badge: 'Cybersecurity',
        keywords: ['security engineer', 'application security', 'appsec', 'soc analyst', 'penetration tester', 'ethical hacker'],
      },
    },
  },

  product_design: {
    id: 'product_design',
    label: 'Product Management & Design',
    umbrellaKeywords: [
      'product',
      'product manager',
      'design',
      'designer',
      'ui',
      'ux',
      'ui/ux',
    ],
    subDisciplines: {
      product_management: {
        label: 'Product Management',
        badge: 'Product',
        keywords: ['product manager', 'associate product manager', 'apm', 'technical product manager', 'product owner', 'product lead'],
      },
      product_design: {
        label: 'UI/UX & Product Design',
        badge: 'Design',
        keywords: ['ui designer', 'ux designer', 'ui/ux', 'product designer', 'visual designer', 'interaction designer', 'graphic designer', 'figma'],
      },
    },
  },

  marketing_growth: {
    id: 'marketing_growth',
    label: 'Marketing & Growth',
    umbrellaKeywords: [
      'marketing',
      'growth',
      'digital marketing',
      'seo',
      'content',
    ],
    subDisciplines: {
      growth_marketing: {
        label: 'Growth & Digital Marketing',
        badge: 'Marketing',
        keywords: ['digital marketer', 'growth marketer', 'growth associate', 'seo specialist', 'performance marketer', 'social media manager', 'content strategist', 'copywriter'],
      },
    },
  },

  business_sales: {
    id: 'business_sales',
    label: 'Business Development & Sales',
    umbrellaKeywords: [
      'business development',
      'sales',
      'account executive',
      'bdr',
      'sdr',
    ],
    subDisciplines: {
      sales_bdr: {
        label: 'Business Development & Sales',
        badge: 'Sales / BD',
        keywords: ['business development', 'bde', 'bdr', 'sdr', 'account executive', 'sales associate', 'inside sales', 'client relations'],
      },
    },
  },

  operations_hr: {
    id: 'operations_hr',
    label: 'Operations, HR & Project Management',
    umbrellaKeywords: [
      'operations',
      'hr',
      'human resources',
      'project manager',
      'scrum master',
      'finance',
    ],
    subDisciplines: {
      management_ops: {
        label: 'Operations & Management',
        badge: 'Operations',
        keywords: ['operations associate', 'operations manager', 'project manager', 'program manager', 'scrum master', 'agile coach', 'hr recruiter', 'talent acquisition', 'financial analyst'],
      },
    },
  },
};

// Non-tech exclusion pattern (spam, bpo, telemarketing, manual service, non-tech sales, hr recruiter)
export const STRICT_NON_TECH_REGEX = /\b(telecaller|telesales|bpo|call\s+center|barista|cook|chef|cashier|driver|courier|delivery\s+(?:boy|partner|driver)|waiter|waitress|security\s+guard|housekeeping|plumber|electrician|sales\s+executive|sales\s+representative|account\s+executive|recruiter|talent\s+acquisition|marketing\s+manager|digital\s+marketing)\b/i;

// Tech title whitelist: only bypass non-tech regex if the candidate title is explicitly an engineering or architecture role
export const TECH_TOKEN_WHITELIST = /\b(support\s+engineer|sales\s+engineer|solutions\s+architect|cloud\s+architect|qa\s+engineer|automation\s+engineer|devops\s+engineer|security\s+engineer|software\s+architect)\b/i;

// ── 2. NORMALIZATION HELPER ──────────────────────────────────────────────────

export function normalizeQuery(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[–—\-_/\\|]/g, ' ')
    .replace(/\.js\b/g, ' js')
    .replace(/\bengineering\b/g, 'engineer')
    .replace(/\bdevelopers\b/g, 'developer')
    .replace(/\bengineers\b/g, 'engineer')
    .replace(/\bprogrammers\b/g, 'programmer')
    .replace(/\bapplications\b/g, 'application')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── 3. QUERY CLUSTER DETECTOR ────────────────────────────────────────────────

/**
 * Detects which primary cluster a user query corresponds to.
 * Returns { cluster: ROLE_CLUSTERS[...], subDisciplineKey: string | null } or null.
 */
export function identifyQueryCluster(rawQuery) {
  const q = normalizeQuery(rawQuery);
  if (!q) return null;

  for (const [clusterKey, cluster] of Object.entries(ROLE_CLUSTERS)) {
    // 1. Check sub-discipline keywords first (most specific, e.g. frontend, backend, react, ui/ux)
    for (const [subKey, sub] of Object.entries(cluster.subDisciplines)) {
      for (const kw of sub.keywords) {
        const normKw = normalizeQuery(kw);
        if (q === normKw || q.includes(normKw)) {
          return { clusterKey, cluster, subDisciplineKey: subKey };
        }
      }
    }

    // 2. Check umbrella keywords (broad, e.g. software engineer, developer)
    for (const uk of cluster.umbrellaKeywords) {
      const normUk = normalizeQuery(uk);
      if (q === normUk || q.includes(normUk) || normUk.includes(q)) {
        return { clusterKey, cluster, subDisciplineKey: null };
      }
    }
  }

  return null;
}

// ── 4. LINKEDIN-STYLE SEMANTIC MATCHER ───────────────────────────────────────

/**
 * Evaluates whether a job posting matches the candidate's search query using
 * LinkedIn-style semantic taxonomy expansion.
 * 
 * @param {object} job - Job object ({ title, company, location, tags, skills, description })
 * @param {string} rawQuery - Candidate's search input (e.g. "Software Engineer", "React", "Frontend")
 * @returns {{ matched: boolean, score: number, tier: string, badge?: string, reason?: string }}
 */
export function semanticMatchJob(job, rawQuery) {
  if (!rawQuery || !rawQuery.trim()) {
    return { matched: true, score: 90, tier: 'all' };
  }

  const titleRaw = (job.title || '').trim();
  const titleNorm = normalizeQuery(titleRaw);
  const compNorm = normalizeQuery(job.company || '');
  const locNorm = normalizeQuery(job.location || '');
  const tagsNorm = ((job.tags || []).concat(job.skills || [])).map(t => normalizeQuery(String(t))).join(' ');
  const qNorm = normalizeQuery(rawQuery);

  // Check company match first
  if (compNorm && (compNorm === qNorm || compNorm.includes(qNorm))) {
    return { matched: true, score: 95, tier: 'company', badge: 'Company Match' };
  }

  // Strict non-tech exclusion (guard against non-engineering roles)
  if (STRICT_NON_TECH_REGEX.test(titleRaw) && !TECH_TOKEN_WHITELIST.test(titleRaw)) {
    return { matched: false, score: 0, tier: 'non_tech' };
  }

  // 1. Exact or contiguous substring match in title
  if (titleNorm.includes(qNorm) || qNorm.includes(titleNorm)) {
    return { matched: true, score: 100, tier: 'exact', badge: 'Exact Match' };
  }

  // 2. Identify search cluster
  const queryClusterInfo = identifyQueryCluster(qNorm);

  if (queryClusterInfo) {
    const { cluster, subDisciplineKey } = queryClusterInfo;

    // Check if job title matches any sub-discipline in this cluster
    for (const [subKey, sub] of Object.entries(cluster.subDisciplines)) {
      // If user searched a SPECIFIC sub-discipline (e.g. frontend, backend), do not match opposing sub-disciplines
      if (subDisciplineKey && subDisciplineKey !== subKey) {
        if (subDisciplineKey !== 'fullstack' && subKey !== 'fullstack') {
          continue;
        }
      }
      for (const kw of sub.keywords) {
        const normKw = normalizeQuery(kw);
        if (titleNorm.includes(normKw)) {
          // If the user searched a broad umbrella (e.g. "Software Engineer"),
          // all sub-disciplines (Frontend, Backend, Full Stack) are 90+ tier matches
          const isExactSub = subDisciplineKey === subKey;
          const score = isExactSub ? 95 : 88;
          return {
            matched: true,
            score,
            tier: isExactSub ? 'subdiscipline_exact' : 'cluster_expansion',
            badge: sub.badge,
            reason: `Matched via ${cluster.label} (${sub.label})`,
          };
        }
      }
    }

    // Also check if any umbrella keyword matches (only for broad cluster queries without a specific sub-discipline)
    if (!subDisciplineKey || subDisciplineKey === 'fullstack') {
      for (const uk of cluster.umbrellaKeywords) {
        const normUk = normalizeQuery(uk);
        if (titleNorm.includes(normUk)) {
          return {
            matched: true,
            score: 85,
            tier: 'umbrella_match',
            badge: cluster.label,
            reason: `Matched ${cluster.label}`,
          };
        }
      }
    }

    // Check skills/tags against matching sub-discipline keywords
    for (const [subKey, sub] of Object.entries(cluster.subDisciplines)) {
      if (subDisciplineKey && subDisciplineKey !== subKey && subDisciplineKey !== 'fullstack' && subKey !== 'fullstack') {
        continue;
      }
      for (const kw of sub.keywords) {
        const normKw = normalizeQuery(kw);
        if (tagsNorm.includes(normKw)) {
          return {
            matched: true,
            score: 78,
            tier: 'skill_match',
            badge: sub.badge,
            reason: `Skill alignment: ${sub.label}`,
          };
        }
      }
    }
  }

  // 3. Token-based matching (e.g., multi-word queries like "React Native Developer")
  const qTokens = qNorm.split(/\s+/).filter(t => t.length > 2 && !['intern', 'job', 'engineer', 'developer', 'role'].includes(t));
  if (qTokens.length > 0) {
    const matchedTokens = qTokens.filter(tok => titleNorm.includes(tok) || tagsNorm.includes(tok));
    if (matchedTokens.length === qTokens.length) {
      return { matched: true, score: 82, tier: 'token_complete', badge: 'Keyword Match' };
    }
    if (matchedTokens.length > 0 && matchedTokens.length >= Math.ceil(qTokens.length * 0.5)) {
      return { matched: true, score: 70, tier: 'token_partial', badge: 'Related' };
    }
  }

  // 4. Fallback check for location search
  if (locNorm.includes(qNorm)) {
    return { matched: true, score: 65, tier: 'location', badge: 'Location Match' };
  }

  return { matched: false, score: 0, tier: 'none' };
}

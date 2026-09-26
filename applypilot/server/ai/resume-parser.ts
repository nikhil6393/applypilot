import { createRequire } from 'node:module';
import mammoth from 'mammoth';
import type { ParsedResume, ExperienceEntry, EducationEntry } from '../../shared/types.js';
import { bestEffortComplete } from './index.js';

const PARSER_VERSION = 'v2.0.0';

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s,()<>"]+/gi;
const LINKEDIN_RE = /linkedin\.com\/in\/[A-Za-z0-9_.-]+/i;
const GITHUB_RE = /github\.com\/[A-Za-z0-9_.-]+/i;
const DEGREE_RE = /\b(B\.?Tech|B\.?E\.?|M\.?Tech|M\.?S\.?|MBA|Ph\.?D|Bachelor|Master|Doctor)\b/i;
const INSTITUTION_RE = /(University|Institute|College|IIT|NIT|BITS|IIIT|School)/i;
const DATE_RANGE_RE =
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})[\w\s.-]*?(?:\d{4}|Present|Current)\b/i;
const BULLET_PREFIX_RE = /^[\s•\-\*]+/;

/** Convert the safe, human-visible parts of a LaTeX resume into parser-friendly text. */
export function latexToPlainText(source: string): string {
  if (!/\\documentclass|\\begin\{document\}|\\section|\\textbf|\\item/i.test(source)) return source;
  return source
    .replace(/%.*$/gm, '') // Remove TeX comments
    .replace(/\\href\{([^{}]*)\}\{([^{}]*)\}/g, '$2 ($1)') // Preserve href as "Text (URL)"
    .replace(/\\url\{([^{}]*)\}/g, '$1') // Preserve URLs
    .replace(
      /\\(?:subheading|roleline|resumeItem|resumeSubItem)\{([^{}]*)\}\{([^{}]*)\}/g,
      '\n$1\n$2\n'
    )
    .replace(/\\(?:section|subsection|subsubsection)\*?\{([^{}]*)\}/g, '\n\n=== $1 ===\n')
    .replace(/\\item\s*/g, '\n- ')
    .replace(/\\begin\{(?:itemize|enumerate|description)\}/g, '\n')
    .replace(/\\end\{(?:itemize|enumerate|description)\}/g, '\n')
    .replace(/\\begin\{[^{}]*\}/g, '')
    .replace(/\\end\{[^{}]*\}/g, '')
    .replace(/\\(?:textbf|textit|textrm|texttt|emph|underline|scshape|textsf)\{([^{}]*)\}/g, '$1')
    .replace(/\\fontsize\{[^{}]*\}\{[^{}]*\}/g, '')
    .replace(
      /\\(?:fa[A-Za-z]+|quad|qquad|textbar|cdot|bullet|vspace\*?\{[^{}]*\}|hspace\*?\{[^{}]*\})/g,
      ' '
    )
    .replace(/\\\\(?:\[[^\]]*\])?/g, '\n')
    .replace(/\\([#$%&_{}~^\\])/g, '$1')
    .replace(/\\[A-Za-z]+(?:\[[^\]]*\])?(?:\{[^{}]*\})?/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

const SKILL_DICT = [
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'c++',
  'c#',
  'ruby',
  'php',
  'kotlin',
  'swift',
  'scala',
  'react',
  'next.js',
  'nextjs',
  'vue',
  'svelte',
  'angular',
  'redux',
  'tailwind',
  'css',
  'html',
  'sass',
  'webpack',
  'vite',
  'node',
  'node.js',
  'nodejs',
  'express',
  'fastify',
  'nestjs',
  'django',
  'flask',
  'fastapi',
  'spring',
  'rails',
  'laravel',
  'postgres',
  'postgresql',
  'mysql',
  'mariadb',
  'sqlite',
  'mongodb',
  'redis',
  'memcached',
  'dynamodb',
  'cassandra',
  'elasticsearch',
  'aws',
  'azure',
  'gcp',
  'cloudflare',
  'vercel',
  'netlify',
  'heroku',
  'fly.io',
  'digitalocean',
  'kubernetes',
  'k8s',
  'docker',
  'terraform',
  'ansible',
  'helm',
  'git',
  'github',
  'gitlab',
  'bitbucket',
  'linux',
  'bash',
  'powershell',
  'nginx',
  'caddy',
  'haproxy',
  'tensorflow',
  'pytorch',
  'sklearn',
  'scikit-learn',
  'pandas',
  'numpy',
  'langchain',
  'llamaindex',
  'huggingface',
  'transformers',
  'ollama',
  'vllm',
  'graphql',
  'rest',
  'grpc',
  'websocket',
  'kafka',
  'rabbitmq',
  'sqs',
  'sns',
  'pulsar',
  'nats',
  'jest',
  'vitest',
  'mocha',
  'chai',
  'playwright',
  'cypress',
  'selenium',
  'puppeteer',
  'pytest',
  'junit',
  'rspec',
  'go-test',
  'ci/cd',
  'github actions',
  'jenkins',
  'circleci',
  'argo',
  'argo cd',
  'flux',
  'figma',
  'sketch',
  'photoshop',
  'illustrator',
  'spark',
  'hadoop',
  'airflow',
  'dbt',
  'dagster',
  'prefect',
  'snowflake',
  'bigquery',
  'redshift',
  'databricks',
  'react native',
  'flutter',
  'swiftui',
  'jetpack compose',
  'xamarin',
];

const SKILL_NORMALIZE: Record<string, string> = {
  nextjs: 'next.js',
  nodejs: 'node.js',
  k8s: 'kubernetes',
  ts: 'typescript',
  js: 'javascript',
  py: 'python',
  'github actions': 'github actions',
  'ci/cd': 'ci/cd',
  sklearn: 'scikit-learn',
  postgresql: 'postgres',
  'express.js': 'express',
  expressjs: 'express',
  'rest api': 'rest',
  'rest apis': 'rest',
  restful: 'rest',
};

const requireCJS = createRequire(import.meta.url);
type PdfParseFn = (buf: Buffer) => Promise<{ text: string }>;
const pdfParse = (() => {
  try {
    return requireCJS('pdf-parse/lib/pdf-parse.js') as PdfParseFn;
  } catch {
    return requireCJS('pdf-parse') as PdfParseFn;
  }
})();

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const s of SKILL_DICT) {
    const escaped = escapeRe(s);
    const re = new RegExp(`(^|\\W|_)${escaped}(?=\\W|_|$)`, 'i');
    if (re.test(lower)) {
      const norm = SKILL_NORMALIZE[s] || s;
      found.add(norm);
    }
  }
  return [...found].sort();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractContact(text: string): {
  email: string;
  phone: string;
  links: string[];
  linkedin?: string;
  github?: string;
} {
  const email = (text.match(EMAIL_RE)?.[0] || '').trim();
  let phone = '';
  const lines = text.split(/\n+/);
  for (const ln of lines) {
    const m = ln.match(PHONE_RE);
    if (m && m[0].replace(/\D/g, '').length >= 7) {
      phone = m[0].trim();
      break;
    }
  }
  const links = Array.from(
    new Set((text.match(URL_RE) || []).map((u) => u.replace(/[.,;)]+$/, '')))
  );
  const linkedin = text.match(LINKEDIN_RE)?.[0];
  const github = text.match(GITHUB_RE)?.[0];
  return { email, phone, links, linkedin, github };
}

export function extractName(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const l = lines[i];
    if (EMAIL_RE.test(l) || URL_RE.test(l) || l.length > 60) continue;
    if (/^[A-Z][A-Za-z'`-]+(\s+[A-Z][A-Za-z'`.-]+){1,3}$/.test(l)) return l;
  }
  return lines[0] || '';
}

export function extractEducation(text: string): EducationEntry[] {
  const blocks = text.split(/\n\s*\n/);
  const out: EducationEntry[] = [];
  for (const block of blocks) {
    if (DEGREE_RE.test(block) || INSTITUTION_RE.test(block)) {
      // Strip phone numbers, email addresses, and url links from block before matching degrees
      const cleanBlock = block
        .replace(EMAIL_RE, '')
        .replace(PHONE_RE, '')
        .replace(URL_RE, '')
        .replace(/\+?\d[\d\s-]{6,}\d/g, '')
        .replace(/\b\d{10}\b/g, '');

      const inst = (
        cleanBlock.match(
          new RegExp(`([A-Z][A-Za-z.&'\\- ]*\\b(?:${INSTITUTION_RE.source})[A-Za-z.&'\\- ]*)`)
        )?.[0] || ''
      ).trim();
      const degMatch =
        cleanBlock.match(
          new RegExp(
            `(?:${DEGREE_RE.source})[\\w\\s.,&'\\-()]*?(?=\\n|\\||$|\\bin\\b|\\bmajor\\b|\\bminor\\b)`,
            'i'
          )
        )?.[0] ||
        cleanBlock.match(DEGREE_RE)?.[0] ||
        '';
      let deg = degMatch.replace(/\s+/g, ' ').trim();
      // Ensure no trailing symbols or numbers
      deg = deg.replace(/[\s+•\-–|]+$/, '').trim();

      const dateMatch = cleanBlock.match(DATE_RANGE_RE)?.[0] || '';
      if (inst || deg) {
        out.push({
          institution: inst || 'University',
          degree: deg || 'Bachelor of Science',
          startDate: '',
          endDate: dateMatch,
        });
      }
    }
  }
  return out;
}

export function extractExperience(text: string): ExperienceEntry[] {
  const blocks = text.split(/\n\s*\n/);
  const out: ExperienceEntry[] = [];
  for (const block of blocks) {
    const lines = block
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const hasBullet = /^\s*[•\-\*]/m.test(block);
    let headerLines: string[] = [];
    let bulletLines: string[] = [];

    if (hasBullet) {
      headerLines = lines.filter((l) => !/^[•\-\*]/.test(l));
      bulletLines = lines
        .filter((l) => /^[•\-\*]/.test(l))
        .map((l) => l.replace(BULLET_PREFIX_RE, '').trim());
    } else {
      // If no bullet glyphs, assume first line is title/company, rest are bullets/descriptions
      headerLines = [lines[0]];
      bulletLines = lines.slice(1);
    }

    const header = headerLines[0] || '';
    if (/^===\s*Experience/i.test(header) || /^Experience\b/i.test(header)) {
      continue;
    }

    const titleCompany = header.split(/\s+(?:at|@|,|-|--|\|)\s+/i);
    const title = titleCompany[0]?.trim() || header;
    const company = titleCompany[1]?.trim() || headerLines[1]?.trim() || 'Engineering';
    const dateMatch =
      block.match(DATE_RANGE_RE)?.[0] ||
      block.match(
        /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})[\w\s.-]*?(?:\d{4}|Present|Current)\b/i
      )?.[0] ||
      '';
    const [startDate, endDate] = dateMatch.split(/\s*[-–—to]+\s*/i);
    const validBullets = bulletLines.filter((l) => l.length > 5);

    if (title && (validBullets.length > 0 || header.length > 3)) {
      out.push({
        title,
        company,
        startDate: startDate || '',
        endDate: endDate || '',
        bullets: validBullets.length > 0 ? validBullets : [header],
      });
    }
  }
  return out;
}

function buildBase(text: string): any {
  const contact = extractContact(text);
  const name = extractName(text);
  const skills = extractSkills(text);
  const experience = extractExperience(text);
  const education = extractEducation(text);
  return {
    fullName: name,
    email: contact.email,
    phone: contact.phone,
    links: [contact.linkedin, contact.github, ...contact.links].filter(Boolean) as string[],
    location: '',
    summary: '',
    skills,
    experience,
    education,
    projects: [],
    certifications: [],
    rawText: text,
    parsedAt: new Date().toISOString(),
    parserVersion: PARSER_VERSION,
  };
}

async function enrichSummary(base: ParsedResume): Promise<string> {
  if (base.experience.length === 0 && base.skills.length === 0) return '';
  const summaryInput = [
    `Name: ${base.fullName || 'unknown'}`,
    `Skills: ${base.skills.slice(0, 30).join(', ')}`,
    `Most recent role: ${base.experience[0]?.title || 'n/a'} at ${base.experience[0]?.company || 'n/a'}`,
    `Recent bullets: ${(base.experience[0]?.bullets || []).slice(0, 3).join(' | ')}`,
  ].join('\n');
  const { text } = await bestEffortComplete(
    `Write a 2-sentence professional summary for this candidate. No fluff, no quotes.\n\n${summaryInput}`,
    { maxTokens: 180, temperature: 0.3, system: 'You write concise resume summaries.' }
  );
  return text.trim().split(/\n+/)[0] || '';
}

export async function parseResumeText(text: string): Promise<any> {
  const cleaned = latexToPlainText(text)
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();

  if (
    process.env.NODE_ENV === 'test' &&
    !process.env.NVIDIA_API_KEY &&
    !process.env.OPENROUTER_API_KEY &&
    !process.env.GEMINI_API_KEY
  ) {
    return buildBase(cleaned);
  }

  // Use AI to extract structured JSON from the text instead of regex
  const prompt = `Extract the following details from this resume text into a raw JSON object. Do not wrap it in markdown block quotes. The JSON must exactly match this TypeScript interface:
{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "links": ["string"],
  "location": "string",
  "summary": "string",
  "skills": ["string"],
  "experience": [{ "title": "string", "company": "string", "startDate": "string", "endDate": "string", "bullets": ["string"] }],
  "education": [{ "institution": "string", "degree": "string", "startDate": "string", "endDate": "string" }],
  "projects": [{ "name": "string", "description": "string", "tech": ["string"], "link": "string", "bullets": ["string"] }],
  "certifications": [{ "name": "string", "issuer": "string", "date": "string" }]
}

If a field is missing, leave it as an empty string or empty array.
If skills are listed, extract as many technical and soft skills as possible.
For links, look for GitHub, LinkedIn, portfolios, or any other URLs.
If projects are present, extract their names, links, tech stack, and description bullets.

Resume Text:
${cleaned.substring(0, 15000)}

Output only valid JSON:`;

  try {
    const { text: jsonText } = await bestEffortComplete(prompt, {
      maxTokens: 3500,
      temperature: 0.1,
      system:
        'You are an expert ATS parsing system that outputs valid JSON only. Never output markdown formatting or explanations.',
    });

    const jsonStr = (jsonText || '')
      .replace(/^```(json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
    const base = buildBase(cleaned);

    let parsed: any = {};
    if (jsonStr) {
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.warn('Failed to parse AI JSON:', parseErr);
        parsed = {};
      }
    }

    const normalizedSkills =
      Array.isArray(parsed.skills) && parsed.skills.length > 0
        ? parsed.skills.map((s) => SKILL_NORMALIZE[s.toLowerCase()] || s.toLowerCase())
        : base.skills;

    // Ensure all fields exist with heuristic fallbacks
    return {
      fullName: parsed.fullName || base.fullName || '',
      email: parsed.email || base.email || '',
      phone: parsed.phone || base.phone || '',
      links: Array.isArray(parsed.links) && parsed.links.length > 0 ? parsed.links : base.links,
      location: parsed.location || base.location || '',
      summary: parsed.summary || base.summary || '',
      skills: normalizedSkills,
      experience:
        Array.isArray(parsed.experience) && parsed.experience.length > 0
          ? parsed.experience
          : base.experience,
      education:
        Array.isArray(parsed.education) && parsed.education.length > 0
          ? parsed.education
          : base.education,
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      rawText: cleaned,
      parsedAt: new Date().toISOString(),
      parserVersion: PARSER_VERSION,
    };
  } catch (err) {
    console.error('AI Extraction error:', err);
    const base = buildBase(cleaned);
    return base;
  }
}

export async function parseResumePdf(buf: Buffer): Promise<ParsedResume> {
  const { text } = await pdfParse(buf);
  return parseResumeText(text || '');
}

export async function parseResumeDocx(buf: Buffer): Promise<ParsedResume> {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return parseResumeText(value || '');
}

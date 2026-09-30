import { createRequire } from 'node:module';
import mammoth from 'mammoth';
import dotenv from 'dotenv';

dotenv.config();

const requireCJS = typeof require !== 'undefined' ? require : (import.meta && import.meta.url ? createRequire(import.meta.url) : () => ({}));
const PARSER_VERSION = 'v3.0.0-ai-enhanced';

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s,()<>"]+/gi;
const LINKEDIN_RE = /linkedin\.com\/in\/[A-Za-z0-9_.-]+/i;
const GITHUB_RE = /github\.com\/[A-Za-z0-9_.-]+/i;
const DEGREE_RE = /\b(B\.?Tech|B\.?E\.?|M\.?Tech|M\.?S\.?|B\.?S\.?|M\.?B\.?A\.?|Ph\.?D|Bachelor(?:'s)?|Master(?:'s)?|Doctor(?:ate)?|Associate(?:'s)?)\b/i;
const INSTITUTION_RE = /(University|Institute|College|Academy|Polytechnic|IIT|NIT|BITS|IIIT|School)/i;
const DATE_RANGE_RE = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{4})[\w\s.-]*?(?:\d{4}|Present|Current)\b/i;
const BULLET_PREFIX_RE = /^[\s•\-\*▪–—\u2022\u25E6\u25AA\u25CF\u2013\u2014]+/;

/** Convert safe LaTeX resume text into clean plain text */
export function latexToPlainText(source) {
    if (!/\\documentclass|\\begin\{document\}|\\section|\\textbf|\\item/i.test(source))
        return source;
    return source
        .replace(/%.*$/gm, '')
        .replace(/\\href\{mailto:([^{}]*)\}\{([^{}]*)\}/g, '$1')
        .replace(/\\href\{([^{}]*)\}\{([^{}]*)\}/g, '$2 ($1)')
        .replace(/\\url\{([^{}]*)\}/g, '$1')
        .replace(/\\(?:subheading|roleline|resumeItem|resumeSubItem)\{([^{}]*)\}\{([^{}]*)\}/g, '\n$1\n$2\n')
        .replace(/\\(?:section|subsection|subsubsection)\*?\{([^{}]*)\}/g, '\n\n=== $1 ===\n')
        .replace(/\\item\s*/g, '\n- ')
        .replace(/\\begin\{(?:itemize|enumerate|description|tightitemize)\}/g, '\n')
        .replace(/\\end\{(?:itemize|enumerate|description|tightitemize)\}/g, '\n')
        .replace(/\\begin\{[^{}]*\}/g, '')
        .replace(/\\end\{[^{}]*\}/g, '')
        .replace(/\\(?:textbf|textit|textrm|texttt|emph|underline|scshape|textsf)\{([^{}]*)\}/g, '$1')
        .replace(/\\fontsize\{[^{}]*\}\{[^{}]*\}/g, '')
        .replace(/\\(?:fa[A-Za-z]+|quad|qquad|textbar|cdot|bullet|vspace\*?\{[^{}]*\}|hspace\*?\{[^{}]*\})/g, ' ')
        .replace(/\\\\(?:\[[^\]]*\])?/g, '\n')
        .replace(/\\([#$%&_{}~^\\])/g, '$1')
        .replace(/\\[A-Za-z]+(?:\[[^\]]*\])?(?:\{[^{}]*\})?/g, ' ')
        .replace(/[{}]/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();
}

/** Comprehensive Hyperlink Extractor (URLs, profiles, tech domains, markdown, and LaTeX) */
export function extractHyperlinks(text = '', extraLinks = []) {
    const links = new Set();
    if (Array.isArray(extraLinks)) {
        extraLinks.forEach(l => {
            if (typeof l === 'string' && l.trim()) links.add(l.trim());
        });
    }
    if (!text || typeof text !== 'string') return Array.from(links);

    // 1. Explicit http/https URLs
    const explicit = text.match(/\bhttps?:\/\/[^\s,()<>"]+/gi) || [];
    explicit.forEach(u => links.add(u.replace(/[.,;)]+$/, '')));

    // 2. www URLs
    const www = text.match(/\bwww\.[^\s,()<>"]+/gi) || [];
    www.forEach(u => links.add(`https://${u.replace(/[.,;)]+$/, '')}`));

    // 3. Markdown links: [Label](URL)
    const mdRe = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
    let mdMatch;
    while ((mdMatch = mdRe.exec(text)) !== null) {
        links.add(mdMatch[2].trim());
    }

    // 4. Social & Developer URLs (linkedin, github, gitlab, twitter, x.com)
    const socialRe = /\b(?:linkedin\.com\/in|github\.com|gitlab\.com|twitter\.com|x\.com)\/[A-Za-z0-9_.-]+/gi;
    const socials = text.match(socialRe) || [];
    socials.forEach(s => links.add(`https://${s.replace(/[.,;)]+$/, '')}`));

    // 5. Tech domains (.dev, .me, .io, .ai, .app, .tech, .page, .vercel.app, .github.io, .netlify.app)
    const domainRe = /\b([a-zA-Z0-9-]+\.(?:dev|me|io|ai|app|tech|page|vercel\.app|github\.io|netlify\.app)(?:\/[^\s,()<>"]*)?)/gi;
    let domMatch;
    while ((domMatch = domainRe.exec(text)) !== null) {
        const d = domMatch[1].replace(/[.,;)]+$/, '');
        const idx = domMatch.index;
        if (idx > 0 && text[idx - 1] === '@') continue; // Skip email domains
        links.add(`https://${d}`);
    }

    return Array.from(links);
}

/** Extract embedded hyperlinks directly from PDF annotations and streams */
export function extractPdfLinks(buf) {
    if (!buf || buf.length === 0) return [];
    const links = new Set();
    try {
        const raw = buf.toString('latin1');
        const uriMatches = raw.match(/\/URI\s*\(([^)]+)\)/gi) || [];
        for (const m of uriMatches) {
            const uri = m.replace(/^\/URI\s*\(/i, '').replace(/\)$/, '').trim();
            if (/^https?:\/\//i.test(uri)) links.add(uri);
        }
        const hexMatches = raw.match(/\/URI\s*<([0-9a-fA-F]+)>/gi) || [];
        for (const m of hexMatches) {
            const hex = m.replace(/^\/URI\s*</i, '').replace(/>$/, '').trim();
            try {
                const decoded = Buffer.from(hex, 'hex').toString('utf-8');
                if (/^https?:\/\//i.test(decoded)) links.add(decoded.trim());
            } catch {}
        }
    } catch {}
    return Array.from(links);
}

/** Extract embedded hyperlinks from DOCX relationships and HTML */
export async function extractDocxLinks(buf) {
    if (!buf || buf.length === 0) return [];
    const links = new Set();
    try {
        const { value: html } = await mammoth.convertToHtml({ buffer: buf });
        const hrefMatches = html.match(/href="([^"]+)"/gi) || [];
        for (const h of hrefMatches) {
            const href = h.replace(/^href="/i, '').replace(/"$/, '').trim();
            if (/^https?:\/\//i.test(href)) links.add(href);
        }
    } catch {}
    try {
        const raw = buf.toString('utf-8');
        const targetMatches = raw.match(/Target="(https?:\/\/[^"]+)"/gi) || [];
        for (const t of targetMatches) {
            const target = t.replace(/^Target="/i, '').replace(/"$/, '').trim();
            links.add(target);
        }
    } catch {}
    return Array.from(links);
}

/** Robust PDF text extraction compatible with pdf-parse v1, v2 and class-based API */
export async function extractPdfText(buf) {
    if (!buf || buf.length === 0) return '';
    try {
        const pdfModule = requireCJS('pdf-parse');
        // Check for v2 class PDFParse
        if (pdfModule.PDFParse && typeof pdfModule.PDFParse === 'function') {
            const parser = new pdfModule.PDFParse({ data: buf });
            try {
                await parser.load();
                const res = await parser.getText();
                if (res && typeof res.text === 'string' && res.text.trim().length > 0) {
                    return res.text;
                }
                if (typeof res === 'string' && res.trim().length > 0) {
                    return res;
                }
            } finally {
                try { await parser.destroy(); } catch {}
            }
        }
        // Check for default function or standard function export
        if (typeof pdfModule === 'function') {
            const res = await pdfModule(buf);
            return res?.text || '';
        }
        if (typeof pdfModule.default === 'function') {
            const res = await pdfModule.default(buf);
            return res?.text || '';
        }
    } catch (err) {
        console.warn('[resume-parser] PDF extraction warning:', err.message);
    }
    // Fallback: extract plain text strings from buffer if text objects exist
    try {
        const textStr = buf.toString('utf-8');
        const matches = textStr.match(/\(([^()]{3,})\)T[jd]/g);
        if (matches && matches.length > 5) {
            return matches.map(m => m.replace(/^\(|\)T[jd]$/g, '')).join(' ');
        }
    } catch {}
    return '';
}

/** Robust DOCX text extraction */
export async function extractDocxText(buf) {
    if (!buf || buf.length === 0) return '';
    try {
        const { value } = await mammoth.extractRawText({ buffer: buf });
        return value || '';
    } catch (err) {
        console.warn('[resume-parser] DOCX extraction error:', err.message);
        return '';
    }
}

const SKILL_DICT = [
    'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'c++', 'c#', 'ruby',
    'php', 'kotlin', 'swift', 'scala', 'sql', 'nosql', 'r', 'dart', 'html', 'css', 'sass',
    'react', 'react.js', 'next.js', 'nextjs', 'vue', 'vue.js', 'svelte', 'angular', 'redux',
    'tailwind', 'tailwindcss', 'bootstrap', 'material ui', 'webpack', 'vite', 'node', 'node.js',
    'express', 'express.js', 'fastify', 'nestjs', 'django', 'flask', 'fastapi', 'spring boot',
    'rails', 'laravel', 'postgres', 'postgresql', 'mysql', 'mariadb', 'sqlite', 'mongodb',
    'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'aws', 'azure', 'gcp', 'google cloud',
    'cloudflare', 'vercel', 'netlify', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
    'git', 'github', 'gitlab', 'ci/cd', 'github actions', 'linux', 'bash', 'powershell',
    'nginx', 'graphql', 'rest', 'rest api', 'grpc', 'websocket', 'kafka', 'rabbitmq',
    'jest', 'vitest', 'mocha', 'playwright', 'cypress', 'selenium', 'pytest', 'junit',
    'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'langchain', 'llamaindex',
    'huggingface', 'transformers', 'ollama', 'llm', 'nlp', 'machine learning', 'deep learning',
    'figma', 'postman', 'swagger', 'jira', 'agile', 'scrum', 'microservices'
];

const SKILL_NORMALIZE = {
    nextjs: 'Next.js',
    'next.js': 'Next.js',
    nodejs: 'Node.js',
    'node.js': 'Node.js',
    node: 'Node.js',
    k8s: 'Kubernetes',
    ts: 'TypeScript',
    js: 'JavaScript',
    py: 'Python',
    'github actions': 'GitHub Actions',
    'ci/cd': 'CI/CD',
    sklearn: 'Scikit-Learn',
    postgresql: 'PostgreSQL',
    postgres: 'PostgreSQL',
    'express.js': 'Express.js',
    expressjs: 'Express.js',
    express: 'Express',
    'rest api': 'REST APIs',
    golang: 'Go',
    reactjs: 'React',
    'react.js': 'React',
    vuejs: 'Vue.js',
    'vue.js': 'Vue.js',
    tailwindcss: 'Tailwind CSS',
    aws: 'AWS',
    gcp: 'GCP',
    graphql: 'GraphQL',
    sql: 'SQL',
    nosql: 'NoSQL',
    mongodb: 'MongoDB',
    docker: 'Docker',
    kubernetes: 'Kubernetes',
    git: 'Git',
    linux: 'Linux',
    redis: 'Redis',
};

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractSkills(text) {
    const lower = text.toLowerCase();
    const found = new Set();
    for (const s of SKILL_DICT) {
        const escaped = escapeRe(s);
        const re = new RegExp(`(^|[\\W_])${escaped}(?=[\\W_]|$)`, 'i');
        if (re.test(lower)) {
            found.add(s.toLowerCase());
            if (s === 'postgresql' || s === 'postgres') {
                found.add('postgres');
                found.add('postgresql');
            }
            if (s === 'node.js' || s === 'nodejs') {
                found.add('node.js');
                found.add('node');
            }
            if (s === 'next.js' || s === 'nextjs') {
                found.add('next.js');
            }
            if (s === 'react.js' || s === 'reactjs') {
                found.add('react');
            }
        }
    }
    return [...found].sort();
}

export function extractContact(text, extraLinks = []) {
    const email = (text.match(EMAIL_RE)?.[0] || '').trim();
    let phone = '';
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    for (const ln of lines) {
        const m = ln.match(PHONE_RE);
        if (m && m[0].replace(/\D/g, '').length >= 7) {
            phone = m[0].trim();
            break;
        }
    }

    const allExtractedLinks = extractHyperlinks(text, extraLinks);

    let linkedin = text.match(LINKEDIN_RE)?.[0] || '';
    if (linkedin && !linkedin.startsWith('http')) {
        linkedin = `https://${linkedin}`;
    }
    if (!linkedin) {
        const found = allExtractedLinks.find(l => /linkedin\.com\/in\//i.test(l));
        if (found) linkedin = found;
    }

    let github = text.match(GITHUB_RE)?.[0] || '';
    if (github && !github.startsWith('http')) {
        github = `https://${github}`;
    }
    if (!github) {
        const found = allExtractedLinks.find(l => /github\.com\//i.test(l));
        if (found) github = found;
    }

    const filteredOtherLinks = allExtractedLinks.filter(
        (u) => !u.includes('mailto:') && !/linkedin\.com\/in\//i.test(u) && !/github\.com\//i.test(u)
    );

    const portfolio = filteredOtherLinks[0] || '';
    const combinedUnique = Array.from(new Set([
        linkedin,
        github,
        portfolio,
        ...allExtractedLinks,
        ...extraLinks
    ].filter(Boolean)));

    let location = '';
    const labelMatch = text.match(/(?:Location|Address|City|Based in)[\s:]+([^\n|,•]+)/i);
    if (labelMatch && labelMatch[1].trim().length > 2 && labelMatch[1].trim().length < 50) {
        location = labelMatch[1].trim();
    } else {
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const ln = lines[i];
            const parts = ln.split(/[|•·\t]/).map((p) => p.trim());
            for (const part of parts) {
                if (EMAIL_RE.test(part) || PHONE_RE.test(part) || URL_RE.test(part) || LINKEDIN_RE.test(part) || GITHUB_RE.test(part)) {
                    continue;
                }
                if (/\b(?:Remote|Hybrid)\b/i.test(part) && part.length < 30) {
                    location = part;
                    break;
                }
                if (/^[A-Za-z\s.-]+,\s*(?:[A-Za-z\s.-]+)$/.test(part) && part.length >= 3 && part.length <= 40) {
                    if (!/experience|education|skills|projects|summary|objective/i.test(part)) {
                        location = part;
                        break;
                    }
                }
            }
            if (location) break;
        }
    }

    return {
        email,
        phone,
        location,
        links: combinedUnique,
        linkedin,
        github,
        portfolio,
    };
}

export function extractName(text) {
    const lines = text
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
    for (let i = 0; i < Math.min(8, lines.length); i++) {
        const l = lines[i];
        if (EMAIL_RE.test(l) || URL_RE.test(l) || /linkedin\.com|github\.com/i.test(l) || l.length > 50 || l.length < 2)
            continue;
        if (/^(curriculum vitae|resume|cv|contact|profile|personal info|candidate)$/i.test(l))
            continue;
        if (/^[A-Za-z'`.-]+(\s+[A-Za-z'`.-]+){1,3}$/.test(l)) {
            if (!/\d/.test(l) && !/[!@#$%^&*()_+=\[\]{};:"\\|<>/?]/.test(l)) {
                return l;
            }
        }
    }
    return lines[0] || 'Candidate';
}

export function extractSummary(text) {
    const match = text.match(/(?:^|\n)(?:===\s*)?(?:PROFESSIONAL SUMMARY|SUMMARY|PROFILE|OBJECTIVE|ABOUT ME)(?:\s*===)?\s*\n+([\s\S]*?)(?=\n(?:===|[A-Z\s]{4,}:|\n[A-Z\s]{4,}\b|$))/i);
    if (match && match[1]) {
        const cleaned = match[1].replace(/\n+/g, ' ').trim();
        if (cleaned.length > 15 && cleaned.length < 1500) {
            return cleaned;
        }
    }
    return '';
}

export function extractProjects(text, extraLinks = []) {
    const match = text.match(/(?:^|\n)(?:===\s*)?(?:PROJECTS|PERSONAL PROJECTS|ACADEMIC PROJECTS|KEY PROJECTS)(?:\s*===)?\s*\n+([\s\S]*?)(?=\n(?:===|[A-Z\s]{4,}:|\n[A-Z\s]{4,}\b|$))/i);
    if (!match || !match[1]) return [];
    
    const projText = match[1].trim();
    const blocks = projText.split(/\n\s*\n/).filter(Boolean);
    const projects = [];

    for (const block of blocks) {
        const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;
        const header = lines[0];
        const bullets = lines.slice(1).map((l) => l.replace(BULLET_PREFIX_RE, '').trim()).filter((l) => l.length > 5);
        const nameTech = header.split(/\s+(?:\||–|-|--)\s+/);
        const name = nameTech[0] || header;
        const tech = nameTech.slice(1).join(' ').split(/[,|]/).map((t) => t.trim()).filter(Boolean);
        const blockLinks = extractHyperlinks(block);
        let linkMatch = blockLinks[0] || '';
        if (!linkMatch && Array.isArray(extraLinks)) {
            const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const matchingExtra = extraLinks.find(l => l.toLowerCase().replace(/[^a-z0-9]/g, '').includes(slug));
            if (matchingExtra) linkMatch = matchingExtra;
        }

        projects.push({
            name,
            tech,
            link: linkMatch,
            description: bullets.join(' '),
            bullets: bullets.length > 0 ? bullets : [header],
        });
    }

    return projects;
}

export function extractEducation(text) {
    const blocks = text.split(/\n\s*\n/);
    const out = [];
    for (const block of blocks) {
        if (DEGREE_RE.test(block) || INSTITUTION_RE.test(block)) {
            const cleanBlock = block
                .replace(EMAIL_RE, '')
                .replace(PHONE_RE, '')
                .replace(URL_RE, '')
                .replace(/\+?\d[\d\s-]{6,}\d/g, '')
                .replace(/\b\d{10}\b/g, '');
            const inst = (cleanBlock.match(new RegExp(`([A-Z][A-Za-z.&'\\- ]*\\b(?:${INSTITUTION_RE.source})[A-Za-z.&'\\- ]*)`))?.[0] || '').trim();
            const degMatch = cleanBlock.match(new RegExp(`(?:${DEGREE_RE.source})[\\w\\s.,&'\\-()]*?(?=\\n|\\||$|\\bin\\b|\\bmajor\\b|\\bminor\\b)`, 'i'))?.[0] ||
                cleanBlock.match(DEGREE_RE)?.[0] ||
                '';
            let deg = degMatch.replace(/\s+/g, ' ').trim();
            deg = deg.replace(/[\s+•\-–|]+$/, '').trim();
            const dateMatch = cleanBlock.match(DATE_RANGE_RE)?.[0] || '';
            if (inst || deg) {
                out.push({
                    institution: inst || 'University',
                    school: inst || 'University',
                    degree: deg || 'Bachelor of Science',
                    field: deg || 'Computer Science',
                    startDate: '',
                    endDate: dateMatch,
                    graduationDate: dateMatch,
                });
            }
        }
    }
    return out;
}

export function extractExperience(text) {
    const blocks = text.split(/\n\s*\n/);
    const out = [];
    for (const block of blocks) {
        const lines = block
            .split(/\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        if (lines.length === 0)
            continue;
        const hasBullet = /^\s*[•\-\*▪–—]/m.test(block);
        let headerLines = [];
        let bulletLines = [];
        if (hasBullet) {
            headerLines = lines.filter((l) => !/^[•\-\*▪–—]/.test(l));
            bulletLines = lines
                .filter((l) => /^[•\-\*▪–—]/.test(l))
                .map((l) => l.replace(BULLET_PREFIX_RE, '').trim());
        }
        else {
            headerLines = [lines[0]];
            bulletLines = lines.slice(1);
        }
        const header = headerLines[0] || '';
        if (/^(?:===|\b(?:experience|work experience|employment history)\b)/i.test(header)) {
            continue;
        }
        const titleCompany = header.split(/\s+(?:at|@|,|-|--|\|)\s+/i);
        const title = titleCompany[0]?.trim() || header;
        const company = titleCompany[1]?.trim() || headerLines[1]?.trim() || 'Tech Company';
        const dateMatch = block.match(DATE_RANGE_RE)?.[0] || '';
        const [startDate, endDate] = dateMatch ? dateMatch.split(/\s*[-–—to]+\s*/i) : ['', ''];
        const validBullets = bulletLines.filter((l) => l.length > 5);
        if (title && (validBullets.length > 0 || header.length > 3)) {
            out.push({
                role: title,
                title,
                company,
                dates: startDate && endDate ? `${startDate} - ${endDate}` : (startDate || endDate || dateMatch),
                startDate: startDate || '',
                endDate: endDate || '',
                bullets: validBullets.length > 0 ? validBullets : [header],
            });
        }
    }
    return out;
}

/** Fallback Deterministic Builder */
function buildDeterministic(text, extraLinks = []) {
    const contact = extractContact(text, extraLinks);
    const name = extractName(text);
    const skillsList = extractSkills(text);
    const experience = extractExperience(text);
    const education = extractEducation(text);
    const projects = extractProjects(text, extraLinks);
    const summary = extractSummary(text);

    // Build structured categorized skills using normalized display names
    const displaySkills = skillsList.map(s => SKILL_NORMALIZE[s] || (s.charAt(0).toUpperCase() + s.slice(1)));
    const categorized = {
        languages: displaySkills.filter(s => ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Kotlin', 'Swift', 'SQL'].includes(s)),
        frameworks: displaySkills.filter(s => ['React', 'Next.js', 'Node.js', 'Express', 'Vue.js', 'Angular', 'Tailwind CSS', 'Django', 'FastAPI', 'Spring Boot'].includes(s)),
        tools: displaySkills.filter(s => ['Git', 'Docker', 'Kubernetes', 'CI/CD', 'GitHub Actions', 'Linux', 'Vite', 'Webpack'].includes(s)),
        databases: displaySkills.filter(s => ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Elasticsearch'].includes(s)),
        cloud: displaySkills.filter(s => ['AWS', 'GCP', 'Azure', 'Cloudflare', 'Vercel'].includes(s)),
        soft: ['Communication', 'Team Leadership', 'Problem Solving', 'Agile/Scrum'],
    };

    // Make skills array backwards-compatible with array methods while supporting properties and lowercase assertions
    const skillsArray = [...new Set([...skillsList, ...displaySkills])];
    Object.assign(skillsArray, categorized);

    const allResolvedLinks = Array.from(new Set([
        contact.linkedin,
        contact.github,
        contact.portfolio,
        ...contact.links,
        ...extraLinks,
    ].filter(Boolean)));

    const hyperlinks = allResolvedLinks.map(url => ({
        url,
        label: url.replace(/^https?:\/\/(?:www\.)?/, '').replace(/\/$/, '')
    }));

    return {
        name,
        fullName: name,
        title: experience[0]?.title || 'Software Engineer',
        roleTitle: experience[0]?.title || 'Software Engineer',
        email: contact.email || '',
        phone: contact.phone || '',
        location: contact.location || '',
        links: allResolvedLinks,
        hyperlinks,
        contact,
        summary: summary || '',
        skills: skillsArray,
        allSkills: skillsList,
        skillsCategorized: categorized,
        experience,
        education,
        projects,
        certifications: [],
        rawText: text,
        parsedAt: new Date().toISOString(),
        parserVersion: PARSER_VERSION,
        extractionMethod: 'deterministic',
    };
}

/** AI-Powered Extraction via OpenRouter LLM (meta-llama/llama-3.3-70b-instruct) */
async function extractWithAi(rawText) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return null;

    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct';
    const sampleText = rawText.slice(0, 10000); // Pass up to 10k characters

    const prompt = `You are a high-precision Resume Information Extraction Engine.
Extract the candidate's complete profile from this resume into valid JSON matching this schema:
{
  "name": "Full Name",
  "title": "Professional Title / Headline",
  "email": "email@domain.com",
  "phone": "+1 555...",
  "location": "City, State/Country",
  "linkedin": "https://linkedin.com/in/...",
  "github": "https://github.com/...",
  "portfolio": "https://...",
  "summary": "Professional summary or bio paragraph",
  "skills": {
    "languages": ["JavaScript", "Python"],
    "frameworks": ["React", "Express"],
    "tools": ["Docker", "Git"],
    "databases": ["PostgreSQL", "Redis"],
    "cloud": ["AWS"],
    "soft": ["Team Collaboration", "Agile"]
  },
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "title": "Job Title",
      "location": "Location",
      "dates": "Start - End",
      "bullets": ["Achievement 1 with metrics...", "Achievement 2..."]
    }
  ],
  "education": [
    {
      "school": "University/College Name",
      "institution": "University/College Name",
      "degree": "Degree",
      "field": "Major / Field",
      "graduationDate": "Year or Range",
      "gpa": "GPA or null"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "tech": ["React", "Node.js"],
      "link": "https://github.com/...",
      "bullets": ["Engineered...", "Built..."]
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Org",
      "date": "Year"
    }
  ]
}

OUTPUT RULES:
- Output ONLY pure, valid JSON.
- Never wrap with markdown or conversational text.
- Preserve all factual metrics (%, numbers, TPS, latency, scale) in bullet points exactly as written.

Resume Text:
${sampleText}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 14000); // 14s timeout

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'ApplyPilot Resume Studio',
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 3000,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn('[resume-parser] OpenRouter returned status:', response.status);
            return null;
        }

        const data = await response.json();
        const rawContent = data?.choices?.[0]?.message?.content || '';
        const cleaned = rawContent
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/, '')
            .replace(/```\s*$/, '')
            .trim();

        const json = JSON.parse(cleaned);

        // Sanitize and normalize parsed output
        const allSkillsList = [
            ...(json.skills?.languages || []),
            ...(json.skills?.frameworks || []),
            ...(json.skills?.tools || []),
            ...(json.skills?.databases || []),
            ...(json.skills?.cloud || []),
            ...(json.skills?.soft || []),
        ];

        const skillsArray = [...new Set([...allSkillsList, ...allSkillsList.map(s => String(s).toLowerCase())])];
        Object.assign(skillsArray, json.skills || {});

        const contact = {
            email: json.email || '',
            phone: json.phone || '',
            location: json.location || '',
            linkedin: json.linkedin || '',
            github: json.github || '',
            portfolio: json.portfolio || '',
            links: [json.linkedin, json.github, json.portfolio].filter(Boolean),
        };

        return {
            name: json.name || 'Candidate',
            fullName: json.name || 'Candidate',
            title: json.title || 'Software Engineer',
            roleTitle: json.title || 'Software Engineer',
            email: json.email || '',
            phone: json.phone || '',
            location: json.location || '',
            links: contact.links,
            contact,
            summary: json.summary || '',
            skills: skillsArray,
            allSkills: allSkillsList,
            skillsCategorized: json.skills || {},
            experience: (json.experience || []).map(exp => ({
                company: exp.company || 'Company',
                role: exp.role || exp.title || 'Engineer',
                title: exp.title || exp.role || 'Engineer',
                location: exp.location || '',
                dates: exp.dates || '',
                startDate: exp.startDate || '',
                endDate: exp.endDate || '',
                bullets: Array.isArray(exp.bullets) ? exp.bullets : [exp.bullets || ''],
            })),
            education: (json.education || []).map(edu => ({
                school: edu.school || edu.institution || 'University',
                institution: edu.institution || edu.school || 'University',
                degree: edu.degree || 'Degree',
                field: edu.field || '',
                graduationDate: edu.graduationDate || '',
                gpa: edu.gpa || '',
            })),
            projects: (json.projects || []).map(p => ({
                name: p.name || 'Project',
                tech: Array.isArray(p.tech) ? p.tech : [],
                link: p.link || '',
                description: Array.isArray(p.bullets) ? p.bullets.join(' ') : p.description || '',
                bullets: Array.isArray(p.bullets) ? p.bullets : [p.description || ''],
            })),
            certifications: Array.isArray(json.certifications) ? json.certifications : [],
            rawText,
            parsedAt: new Date().toISOString(),
            parserVersion: PARSER_VERSION,
            extractionMethod: 'ai-openrouter',
        };
    } catch (err) {
        console.warn('[resume-parser] AI extraction failed or timed out:', err.message);
        return null;
    }
}

/** Unified Master Parser */
export async function parseResumeText(text, options = {}) {
    const extraLinks = options?.extraLinks || [];
    const cleaned = latexToPlainText(text)
        .replace(/\r/g, '')
        .replace(/\u00a0/g, ' ')
        .trim();

    if (!cleaned) {
        return buildDeterministic('', extraLinks);
    }

    // Try AI-powered deep extraction first if key exists
    try {
        const aiResult = await extractWithAi(cleaned);
        if (aiResult && aiResult.name && (aiResult.experience?.length > 0 || aiResult.skills?.length > 0)) {
            if (extraLinks.length > 0) {
                aiResult.links = Array.from(new Set([...(aiResult.links || []), ...extraLinks]));
                aiResult.contact = aiResult.contact || {};
                aiResult.contact.links = aiResult.links;
                if (!aiResult.contact.linkedin) {
                    aiResult.contact.linkedin = extraLinks.find(l => /linkedin\.com\/in\//i.test(l)) || '';
                }
                if (!aiResult.contact.github) {
                    aiResult.contact.github = extraLinks.find(l => /github\.com\//i.test(l)) || '';
                }
                aiResult.hyperlinks = aiResult.links.map(url => ({
                    url,
                    label: url.replace(/^https?:\/\/(?:www\.)?/, '').replace(/\/$/, '')
                }));
            }
            return aiResult;
        }
    } catch {}

    // Fall back to robust deterministic parser
    return buildDeterministic(cleaned, extraLinks);
}

export async function parseResumePdf(buf) {
    const text = await extractPdfText(buf);
    const extraLinks = extractPdfLinks(buf);
    return parseResumeText(text || '', { extraLinks });
}

export async function parseResumeDocx(buf) {
    const text = await extractDocxText(buf);
    const extraLinks = await extractDocxLinks(buf);
    return parseResumeText(text || '', { extraLinks });
}

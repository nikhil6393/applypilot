/**
 * AIProvider abstraction — system runs fully without any AI provider.
 * OpenAI is the primary; HeuristicProvider is the always-available fallback.
 */
// ─── Registry ─────────────────────────────────────────────────────────────────
let _primaryProvider = null;
export function registerProvider(provider) {
    _primaryProvider = provider;
    console.log(`[AI] Provider registered: ${provider.name}`);
}
export function getProvider() {
    if (_primaryProvider && _primaryProvider.available) {
        return _primaryProvider;
    }
    return getHeuristicProvider();
}
// ─── Heuristic provider (always available, zero deps) ─────────────────────────
export function getHeuristicProvider() {
    return {
        name: 'heuristic',
        available: true,
        parseResume: parseResumeHeuristically,
        scoreSemanticFit: null,
        tailorResume: null,
    };
}
// ─── Heuristic resume parser (truth-anchored, no fabrication) ─────────────────
async function parseResumeHeuristically(rawText) {
    const lines = rawText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    // --- Contact extraction ---
    const emailMatch = rawText.match(/[\w.+'-]+@[\w.-]+\.\w{2,}/);
    const phoneMatch = rawText.match(/(\+?\d[\d\s\-().]{7,})/);
    const linkedinMatch = rawText.match(/linkedin\.com\/in\/([\w-]+)/i);
    const githubMatch = rawText.match(/github\.com\/([\w-]+)/i);
    const portfolioMatch = rawText.match(/https?:\/\/(?!linkedin|github|twitter|facebook)[\w.-]+\.[\w.-]+/i);
    // --- Name heuristic: first non-email, non-url line < 50 chars ---
    const nameLine = lines.find((l) => l.length < 50 &&
        !l.includes('@') &&
        !l.includes('http') &&
        !l.toLowerCase().startsWith('summary') &&
        !l.toLowerCase().startsWith('objective') &&
        /^[A-Z]/.test(l));
    // --- Section-based extraction ---
    const sections = splitIntoSections(rawText);
    // Education
    const education = extractEducation(sections.education || '');
    // Experience
    const experience = extractExperience(sections.experience || '');
    // Projects
    const projects = extractProjects(sections.projects || '');
    // Skills
    const skills = extractSkills(sections.skills || rawText);
    // Certifications
    const certifications = extractCertifications(sections.certifications || rawText);
    // Summary / Objective
    const summary = sections.summary
        ? sections.summary.replace(/\n/g, ' ').slice(0, 500).trim()
        : undefined;
    // Derive target roles from titles found
    const allTitles = experience.map((e) => e.role);
    const targetRoles = deriveTargetRoles(allTitles, skills);
    const targetKeywords = deriveKeywords(skills, rawText);
    const profile = {
        name: nameLine || 'Candidate',
        summary: summary || undefined,
        contact: {
            email: emailMatch ? emailMatch[0] : '',
            phone: phoneMatch ? phoneMatch[0].trim() : '',
            location: extractLocation(rawText),
            linkedin: linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : undefined,
            github: githubMatch ? `https://github.com/${githubMatch[1]}` : undefined,
            portfolio: portfolioMatch ? portfolioMatch[0] : undefined,
        },
        education,
        experience,
        projects,
        skills,
        certifications,
        achievements: [],
        publications: [],
        preferences: {
            targetRoles,
            targetKeywords,
            openToRemote: rawText.toLowerCase().includes('remote'),
        },
        rawText,
    };
    const confidence = education.length > 0 && experience.length > 0
        ? 'high'
        : education.length > 0 || experience.length > 0
            ? 'medium'
            : 'low';
    return { profile, method: 'heuristic', confidence };
}
// ─── Section splitter ─────────────────────────────────────────────────────────
function splitIntoSections(text) {
    const sectionHeaders = {
        summary: /^\s*(summary|objective|profile|about me)\s*$/im,
        education: /^\s*(education|academic|qualifications|schooling)\s*$/im,
        experience: /^\s*(experience|work\s*experience|employment|professional\s*experience|internship|leadership)\s*$/im,
        projects: /^\s*(projects?|personal\s*projects?|academic\s*projects?|side\s*projects?)\s*$/im,
        skills: /^\s*(skills?|technical\s*skills?|core\s*competencies|technologies)\s*$/im,
        certifications: /^\s*(certifications?|certificates?|awards?|achievements?|honors?)\s*$/im,
    };
    const sections = {};
    const lines = text.split('\n');
    let currentSection = 'header';
    let buffer = [];
    for (const line of lines) {
        let matched = false;
        for (const [sectionName, pattern] of Object.entries(sectionHeaders)) {
            if (pattern.test(line)) {
                sections[currentSection] = buffer.join('\n');
                currentSection = sectionName;
                buffer = [];
                matched = true;
                break;
            }
        }
        if (!matched) {
            buffer.push(line);
        }
    }
    sections[currentSection] = buffer.join('\n');
    return sections;
}
// ─── Education extractor ──────────────────────────────────────────────────────
function extractEducation(text) {
    if (!text.trim())
        return [];
    const results = [];
    const blocks = text.split(/\n{2,}/);
    for (const block of blocks) {
        if (!block.trim())
            continue;
        const degreeMatch = block.match(/\b(bachelor|b\.?tech|b\.?e\.?|b\.?sc?|master|m\.?tech|m\.?sc?|m\.?s\.?|phd|ph\.?d|doctor|associate|diploma|mba|bca|mca)\b/i);
        const yearMatch = block.match(/\b(20\d{2})\b/g);
        const gpaMatch = block.match(/\b(\d+\.?\d*)\s*\/\s*10|\bgpa\s*:?\s*(\d+\.?\d*)/i);
        if (degreeMatch || (yearMatch && yearMatch.length >= 1)) {
            const lines = block.split('\n').filter(Boolean);
            results.push({
                id: `edu-${results.length + 1}`,
                school: lines[0] || '',
                degree: degreeMatch ? degreeMatch[0] : '',
                field: extractField(block),
                graduationDate: yearMatch ? yearMatch[yearMatch.length - 1] : '',
                startDate: yearMatch && yearMatch.length > 1 ? yearMatch[0] : undefined,
                gpa: gpaMatch ? gpaMatch[1] || gpaMatch[2] : undefined,
                honors: extractHonors(block),
            });
        }
    }
    return results;
}
function extractField(text) {
    const match = text.match(/\b(computer science|electrical engineering|mechanical|civil|information technology|software engineering|data science|mathematics|physics|electronics|communications|business administration)\b/i);
    return match ? match[0] : '';
}
function extractHonors(text) {
    const match = text.match(/\b(dean.?s list|honor|gold medal|distinction|merit|summa|magna|cum laude|rank \d+|top \d+|scholarship|fellowship)\b/gi);
    return match ? match.join(', ') : undefined;
}
// ─── Experience extractor ─────────────────────────────────────────────────────
function extractExperience(text) {
    if (!text.trim())
        return [];
    const results = [];
    const blocks = text.split(/\n{2,}/);
    for (const block of blocks) {
        if (!block.trim() || block.length < 20)
            continue;
        const lines = block.split('\n').filter(Boolean);
        const titleLine = lines[0] || '';
        const dateLine = lines.find((l) => /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|20\d{2}|present|current)\b/i.test(l)) || '';
        const bullets = lines
            .filter((l) => l.match(/^[\s]*[•\-–*▪►]\s+/) || l.match(/^[\s]*\d+\.\s+/))
            .map((l) => l.replace(/^[\s]*[•\-–*▪►\d.]+\s+/, '').trim())
            .filter(Boolean);
        // Only include blocks that have title + (bullets or date)
        if (titleLine && (bullets.length > 0 || dateLine)) {
            const { role, company } = parseRoleCompany(titleLine);
            const { startDate, endDate, current } = parseDateRange(dateLine);
            results.push({
                id: `exp-${results.length + 1}`,
                role,
                company,
                location: extractLocation(block),
                startDate: startDate || '',
                endDate: endDate || undefined,
                current,
                bullets: bullets.length > 0 ? bullets : [],
            });
        }
    }
    return results;
}
function parseRoleCompany(line) {
    // Patterns: "Role at Company", "Role | Company", "Role — Company"
    const atMatch = line.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    if (atMatch)
        return { role: atMatch[1].trim(), company: atMatch[2].trim() };
    const pipeMatch = line.match(/^(.+?)\s+[|–—]\s+(.+)$/);
    if (pipeMatch)
        return { role: pipeMatch[1].trim(), company: pipeMatch[2].trim() };
    return { role: line.trim(), company: '' };
}
function parseDateRange(line) {
    const current = /\b(present|current|now|ongoing)\b/i.test(line);
    const months = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
    const pattern = new RegExp(`${months}\\s+(20\\d{2})`, 'gi');
    const dates = [];
    let m;
    while ((m = pattern.exec(line)) !== null) {
        dates.push(`${m[1]} ${m[2]}`);
    }
    return {
        startDate: dates[0] || '',
        endDate: current ? undefined : dates[1],
        current,
    };
}
// ─── Project extractor ────────────────────────────────────────────────────────
function extractProjects(text) {
    if (!text.trim())
        return [];
    const results = [];
    const blocks = text.split(/\n{2,}/);
    for (const block of blocks) {
        if (!block.trim() || block.length < 15)
            continue;
        const lines = block.split('\n').filter(Boolean);
        const nameLine = lines[0] || '';
        const bullets = lines
            .filter((l) => /^[\s]*[•\-–*▪►]\s+/.test(l) || /^[\s]*\d+\.\s+/.test(l))
            .map((l) => l.replace(/^[\s]*[•\-–*▪►\d.]+\s+/, '').trim())
            .filter(Boolean);
        if (nameLine && nameLine.length < 100) {
            const techLine = lines.find((l) => /\b(react|node|python|typescript|javascript|java|go|rust|django|flask|spring|aws|docker|kubernetes|postgresql|mongodb|redis)\b/i.test(l));
            const techTags = techLine ? extractTechTags(techLine) : extractTechTags(block);
            const linkMatch = block.match(/https?:\/\/[\w./%-]+/);
            results.push({
                id: `proj-${results.length + 1}`,
                name: nameLine.replace(/[•\-–*▪►]/g, '').trim(),
                description: bullets[0] || '',
                tech: techTags,
                link: linkMatch ? linkMatch[0] : undefined,
                bullets,
            });
        }
    }
    return results;
}
// ─── Skills extractor ─────────────────────────────────────────────────────────
const KNOWN_LANGUAGES = [
    'python',
    'java',
    'javascript',
    'typescript',
    'c++',
    'c#',
    'c',
    'go',
    'rust',
    'ruby',
    'kotlin',
    'swift',
    'r',
    'scala',
    'php',
    'bash',
    'sql',
    'html',
    'css',
    'dart',
    'matlab',
    'perl',
    'haskell',
    'lua',
    'julia',
];
const KNOWN_FRAMEWORKS = [
    'react',
    'next.js',
    'vue',
    'angular',
    'express',
    'node.js',
    'django',
    'flask',
    'fastapi',
    'spring',
    'spring boot',
    'rails',
    'laravel',
    'tailwind',
    'bootstrap',
    'svelte',
    'redux',
    'graphql',
    'rest api',
    'grpc',
    'webrtc',
    'tensorflow',
    'pytorch',
    'keras',
    'scikit-learn',
    'pandas',
    'numpy',
];
const KNOWN_TOOLS = [
    'git',
    'github',
    'gitlab',
    'docker',
    'kubernetes',
    'aws',
    'gcp',
    'azure',
    'linux',
    'nginx',
    'jenkins',
    'ci/cd',
    'jira',
    'postman',
    'figma',
    'vscode',
    'webpack',
    'vite',
    'jest',
    'pytest',
    'playwright',
    'selenium',
    'terraform',
    'ansible',
];
const KNOWN_DB = [
    'postgresql',
    'mysql',
    'sqlite',
    'mongodb',
    'redis',
    'elasticsearch',
    'cassandra',
    'dynamodb',
    'firestore',
    'neo4j',
    'prisma',
    'sequelize',
    'sqlalchemy',
];
function extractSkills(text) {
    const lower = text.toLowerCase();
    return {
        languages: KNOWN_LANGUAGES.filter((l) => new RegExp(`\\b${l.replace('.', '\\.')}\\b`, 'i').test(lower)).map(capitalize),
        frameworks: KNOWN_FRAMEWORKS.filter((f) => new RegExp(`\\b${f.replace(/[.+]/g, '\\$&')}\\b`, 'i').test(lower)).map(capitalize),
        tools: KNOWN_TOOLS.filter((t) => new RegExp(`\\b${t.replace('/', '\\/')}\\b`, 'i').test(lower)).map(capitalize),
        databases: KNOWN_DB.filter((d) => new RegExp(`\\b${d.replace('.', '\\.')}\\b`, 'i').test(lower)).map(capitalize),
        domain: extractDomainSkills(lower),
    };
}
function extractDomainSkills(lower) {
    const domains = [
        'data structures',
        'algorithms',
        'system design',
        'distributed systems',
        'machine learning',
        'deep learning',
        'nlp',
        'computer vision',
        'full stack',
        'backend',
        'frontend',
        'devops',
        'cloud computing',
        'agile',
        'scrum',
        'microservices',
        'object-oriented',
        'functional programming',
        'api design',
        'database design',
        'networking',
        'security',
        'embedded systems',
    ];
    return domains
        .filter((d) => lower.includes(d))
        .map((d) => d.split(' ').map(capitalize).join(' '));
}
// ─── Certifications extractor ─────────────────────────────────────────────────
function extractCertifications(text) {
    const results = [];
    const certPatterns = [
        /\b(aws\s+certified[\w\s]+)\b/gi,
        /\b(google\s+cloud[\w\s]+certification[\w\s]*)\b/gi,
        /\b(azure[\w\s]+certification[\w\s]*)\b/gi,
        /\b(oracle[\w\s]+certified[\w\s]+)\b/gi,
        /\b(cisco[\w\s]+certification[\w\s]*)\b/gi,
        /\b(certified\s+[\w\s]+)\b/gi,
    ];
    const seen = new Set();
    for (const pattern of certPatterns) {
        let m;
        while ((m = pattern.exec(text)) !== null) {
            const name = m[0].trim();
            if (!seen.has(name.toLowerCase()) && name.length > 5) {
                seen.add(name.toLowerCase());
                const yearMatch = text.slice(m.index, m.index + 100).match(/\b(20\d{2})\b/);
                results.push({
                    id: `cert-${results.length + 1}`,
                    name,
                    issuer: inferIssuer(name),
                    date: yearMatch ? yearMatch[1] : '',
                });
            }
        }
    }
    return results;
}
function inferIssuer(certName) {
    const lower = certName.toLowerCase();
    if (lower.includes('aws'))
        return 'Amazon Web Services';
    if (lower.includes('google cloud'))
        return 'Google';
    if (lower.includes('azure'))
        return 'Microsoft';
    if (lower.includes('oracle'))
        return 'Oracle';
    if (lower.includes('cisco'))
        return 'Cisco';
    return '';
}
// ─── Location extractor ───────────────────────────────────────────────────────
function extractLocation(text) {
    const pattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s+([A-Z]{2}|[A-Za-z]+)\b/;
    const m = text.match(pattern);
    if (m)
        return m[0];
    if (/\bremote\b/i.test(text))
        return 'Remote';
    return '';
}
// ─── Tech tag extractor ───────────────────────────────────────────────────────
function extractTechTags(text) {
    const allTech = [...KNOWN_LANGUAGES, ...KNOWN_FRAMEWORKS, ...KNOWN_TOOLS, ...KNOWN_DB];
    return allTech
        .filter((t) => new RegExp(`\\b${t.replace(/[.+/]/g, '\\$&')}\\b`, 'i').test(text))
        .map(capitalize)
        .slice(0, 8);
}
// ─── Target roles / keywords derivation ──────────────────────────────────────
function deriveTargetRoles(titles, skills) {
    const roles = new Set();
    for (const title of titles) {
        if (/intern/i.test(title))
            roles.add('Software Engineering Intern');
        if (/full.?stack/i.test(title))
            roles.add('Full Stack Developer');
        if (/backend|back.end/i.test(title))
            roles.add('Backend Engineer');
        if (/frontend|front.end/i.test(title))
            roles.add('Frontend Engineer');
        if (/data\s*(scientist|engineer|analyst)/i.test(title))
            roles.add(title.trim());
        if (/ml|machine\s*learning|ai\s*engineer/i.test(title))
            roles.add('ML Engineer');
        if (/software\s*(engineer|developer)/i.test(title))
            roles.add('Software Engineer');
        if (/devops|platform\s*engineer|sre/i.test(title))
            roles.add('DevOps Engineer');
    }
    if (roles.size === 0) {
        roles.add('Software Engineer');
    }
    return Array.from(roles).slice(0, 6);
}
function deriveKeywords(skills, rawText) {
    return [
        ...skills.languages.slice(0, 4),
        ...skills.frameworks.slice(0, 4),
        ...skills.tools.slice(0, 3),
        ...(skills.databases || []).slice(0, 2),
    ]
        .filter(Boolean)
        .slice(0, 12);
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Skill-Gap Analysis Engine
 * Extends the existing tfidf.ts pipeline with:
 *  - Keyword taxonomy classification (Technical / Seniority / Soft / Education)
 *  - Exact + synonym-based semantic matching
 *  - Priority scoring (critical / preferred / bonus)
 *  - Cosine similarity 0-100 score
 *  - Top-5 action plan by impact × effort matrix
 *
 * Pure function — no I/O, no side effects, fully testable.
 */
import { tokenize, inverseDocumentFrequency, vectorize, cosineSimilarity, } from './tfidf.js';
// ── Keyword Taxonomy ───────────────────────────────────────────────────────
const TECHNICAL_KEYWORDS = new Set([
    'python', 'typescript', 'javascript', 'golang', 'go', 'rust', 'java', 'kotlin',
    'swift', 'scala', 'ruby', 'php', 'cpp', 'csharp', 'dart', 'elixir',
    'react', 'nextjs', 'vue', 'angular', 'svelte', 'tailwind', 'css', 'html',
    'redux', 'zustand', 'graphql', 'webpack', 'vite',
    'nodejs', 'express', 'fastapi', 'django', 'flask', 'spring', 'nestjs',
    'rails', 'laravel', 'gin', 'fiber', 'actix', 'grpc', 'rest', 'api',
    'pytorch', 'tensorflow', 'keras', 'sklearn', 'pandas', 'numpy', 'jupyter',
    'langchain', 'rag', 'embeddings', 'llm', 'openai', 'huggingface', 'mlflow',
    'xgboost', 'spark', 'airflow', 'dbt', 'kafka',
    'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'ci', 'cd',
    'github', 'gitlab', 'jenkins', 'aws', 'gcp', 'azure', 'linux',
    'nginx', 'redis', 'rabbitmq', 'elasticsearch',
    'postgres', 'postgresql', 'mysql', 'mongodb', 'sqlite', 'dynamodb',
    'cassandra', 'neo4j', 'snowflake', 'bigquery',
    'reactnative', 'flutter', 'ios', 'android', 'expo',
    'jest', 'vitest', 'playwright', 'cypress', 'pytest', 'junit',
]);
const SENIORITY_KEYWORDS = new Set([
    'lead', 'senior', 'principal', 'staff', 'architect', 'manager', 'director',
    'vp', 'head', 'owner', 'mentor', 'ownership',
    'design', 'system', 'scalable', 'distributed', 'microservices',
    'performance', 'latency', 'throughput', 'reliability', 'sla', 'incident',
]);
const SOFT_KEYWORDS = new Set([
    'collaborate', 'collaboration', 'communicate', 'communication', 'mentor',
    'mentorship', 'cross-functional', 'stakeholder', 'agile', 'scrum',
    'product', 'ownership', 'initiative', 'problem-solving', 'analytical',
    'detail-oriented', 'fast-paced',
]);
const EDUCATION_KEYWORDS = new Set([
    'bachelor', 'master', 'phd', 'btech', 'mtech', 'mba', 'degree',
    'computer', 'science', 'engineering', 'mathematics', 'statistics',
    'certified', 'certification', 'aws-certified', 'cka', 'gcp-certified',
]);
// ── Synonym Map ────────────────────────────────────────────────────────────
const SYNONYM_MAP = {
    javascript: ['js', 'ecmascript', 'es6'],
    typescript: ['ts'],
    python: ['py'],
    golang: ['go'],
    nodejs: ['node', 'node.js'],
    kubernetes: ['k8s'],
    postgresql: ['postgres', 'pg'],
    reactnative: ['react-native', 'rn'],
    aws: ['amazon web services'],
    gcp: ['google cloud', 'google cloud platform'],
    azure: ['microsoft azure'],
};
const ALIAS_TO_CANONICAL = new Map();
for (const [canonical, aliases] of Object.entries(SYNONYM_MAP)) {
    for (const alias of aliases) {
        ALIAS_TO_CANONICAL.set(alias, canonical);
    }
}
// ── Helpers ────────────────────────────────────────────────────────────────
function estimateEffort(skill) {
    const highEffort = ['aws', 'kubernetes', 'gcp', 'azure', 'certified', 'certification',
        'cka', 'phd', 'master', 'spark', 'kafka', 'tensorflow', 'pytorch'];
    const lowEffort = ['react', 'typescript', 'css', 'html', 'git', 'docker',
        'postgres', 'redis', 'python', 'jest', 'vitest'];
    const s = skill.toLowerCase();
    if (highEffort.some(h => s.includes(h)))
        return 'high';
    if (lowEffort.some(l => s.includes(l)))
        return 'low';
    return 'medium';
}
function generateFix(skill, category) {
    if (category === 'education')
        return `Pursue ${skill} certification or highlight equivalent coursework`;
    if (category === 'seniority')
        return `Quantify leadership impact in Experience bullets using "${skill}"`;
    if (category === 'soft')
        return `Add "${skill}" to your Professional Summary with a concrete example`;
    const effort = estimateEffort(skill);
    if (effort === 'low')
        return `Add "${skill}" to your Skills section and reference it in a project bullet`;
    if (effort === 'high')
        return `Build a hands-on project with "${skill}" and add it under Projects`;
    return `Add "${skill}" to Skills and incorporate it in at least one Experience bullet`;
}
function resolveCanonical(token) {
    return ALIAS_TO_CANONICAL.get(token) || token;
}
function classifyToken(token) {
    const c = resolveCanonical(token);
    if (TECHNICAL_KEYWORDS.has(c) || TECHNICAL_KEYWORDS.has(token))
        return 'technical';
    if (SENIORITY_KEYWORDS.has(token))
        return 'seniority';
    if (SOFT_KEYWORDS.has(token))
        return 'soft';
    if (EDUCATION_KEYWORDS.has(token))
        return 'education';
    return null;
}
function buildResumeCorpusSections(resume) {
    const sections = new Map();
    sections.set('summary', resume.summary || '');
    const skillsFlat = [
        ...(resume.skills?.languages || []),
        ...(resume.skills?.frameworks || []),
        ...(resume.skills?.tools || []),
        ...(resume.skills?.domain || []),
    ].join(' ');
    sections.set('skills', skillsFlat);
    const expBullets = (resume.experience || []).flatMap(e => e.bullets || []).join(' ');
    sections.set('experience_bullets', expBullets);
    const projectBullets = (resume.projects || [])
        .flatMap(p => [...(p.bullets || []), p.description || ''])
        .join(' ');
    sections.set('projects', projectBullets);
    const education = (resume.education || [])
        .map(e => `${e.degree} ${e.field} ${e.school}`)
        .join(' ');
    sections.set('education', education);
    return sections;
}
// ── Main Export ────────────────────────────────────────────────────────────
export function computeSkillGapReport(resume, jobDescription, _targetRole) {
    const generatedAt = new Date().toISOString();
    // STAGE 1: Build corpus
    const sections = buildResumeCorpusSections(resume);
    const fullResumeText = [...sections.values()].join(' ');
    // STAGE 2: Tokenize both corpora
    const resumeTokens = tokenize(fullResumeText);
    const jdTokens = tokenize(jobDescription);
    const resumeTokenSet = new Set(resumeTokens.map(resolveCanonical));
    const resumeRawSet = new Set(resumeTokens);
    const sectionSets = new Map();
    for (const [sec, text] of sections) {
        sectionSets.set(sec, new Set(tokenize(text).map(resolveCanonical)));
    }
    // STAGE 3: JD frequency map
    const jdFrequencyMap = new Map();
    for (const t of jdTokens) {
        jdFrequencyMap.set(t, (jdFrequencyMap.get(t) || 0) + 1);
    }
    const jdTokenSet = new Set(jdTokens.map(resolveCanonical));
    // STAGE 4 + 5: Gap identification + priority
    const matched = [];
    const missing = [];
    const processedSkills = new Set();
    const catMatched = { technical: [], seniority: [], soft: [], education: [] };
    const catMissing = { technical: [], seniority: [], soft: [], education: [] };
    const bonus = [];
    for (const [rawToken, freq] of jdFrequencyMap) {
        if (rawToken.length < 3)
            continue;
        const canonical = resolveCanonical(rawToken);
        if (processedSkills.has(canonical))
            continue;
        processedSkills.add(canonical);
        const category = classifyToken(canonical) || classifyToken(rawToken);
        const isExact = resumeTokenSet.has(canonical) || resumeRawSet.has(rawToken);
        const isSemantic = !isExact && ALIAS_TO_CANONICAL.has(rawToken) &&
            resumeTokenSet.has(ALIAS_TO_CANONICAL.get(rawToken));
        if (isExact || isSemantic) {
            let foundIn = 'skills';
            for (const [sec, secSet] of sectionSets) {
                if (secSet.has(canonical)) {
                    foundIn = sec;
                    break;
                }
            }
            matched.push({ skill: canonical, foundIn, confidence: isExact ? 'exact' : 'semantic' });
            if (category)
                catMatched[category].push(canonical);
        }
        else {
            const bucketWeights = {
                technical: 0.55, seniority: 0.25, soft: 0.10, education: 0.10,
            };
            const bw = category ? bucketWeights[category] : 0.05;
            let priority;
            if (freq >= 3 && bw >= 0.25) {
                priority = 'critical';
            }
            else if (freq >= 2 || bw >= 0.25) {
                priority = 'preferred';
            }
            else {
                priority = 'bonus';
            }
            missing.push({
                skill: canonical, priority, jdFrequency: freq,
                category: category || 'technical',
                suggestedFix: generateFix(canonical, category || 'technical'),
            });
            if (category)
                catMissing[category].push(canonical);
        }
    }
    // Collect bonus skills
    for (const t of resumeTokens) {
        const c = resolveCanonical(t);
        if (!jdTokenSet.has(c) && TECHNICAL_KEYWORDS.has(c) && !processedSkills.has(c)) {
            bonus.push(c);
        }
    }
    // STAGE 6: Cosine similarity score
    const idf = inverseDocumentFrequency([resumeTokens, jdTokens]);
    const resumeVec = vectorize(resumeTokens, idf);
    const jdVec = vectorize(jdTokens, idf);
    const similarity = cosineSimilarity(resumeVec, jdVec);
    const overallMatchScore = Math.round(Math.min(100, similarity * 180));
    const verdict = overallMatchScore >= 75 ? 'strong_match' :
        overallMatchScore >= 50 ? 'partial_match' : 'significant_gap';
    // STAGE 7: Action plan — top 5
    const priorityOrder = { critical: 0, preferred: 1, bonus: 2 };
    const sortedMissing = [...missing].sort((a, b) => {
        const po = priorityOrder[a.priority] - priorityOrder[b.priority];
        return po !== 0 ? po : b.jdFrequency - a.jdFrequency;
    });
    const actionPlan = sortedMissing.slice(0, 5).map((m, i) => ({
        rank: i + 1,
        gap: m.skill,
        impact: m.priority === 'critical' ? 'high' : m.priority === 'preferred' ? 'medium' : 'low',
        effort: estimateEffort(m.skill),
        recommendation: m.suggestedFix,
    }));
    const catScore = (cat) => {
        const m = catMatched[cat] || [];
        const miss = catMissing[cat] || [];
        const total = m.length + miss.length;
        return { score: total === 0 ? 100 : Math.round((m.length / total) * 100), matched: m.slice(0, 15), missing: miss.slice(0, 10) };
    };
    return {
        overallMatchScore, verdict,
        matched: matched.slice(0, 25),
        missing: sortedMissing.slice(0, 20),
        bonus: [...new Set(bonus)].slice(0, 10),
        categoryBreakdown: {
            technical: catScore('technical'),
            seniority: catScore('seniority'),
            softSkills: catScore('soft'),
            education: catScore('education'),
        },
        actionPlan,
        generatedAt,
    };
}

/**
 * OpenAI provider implementation using native fetch.
 * Falls back to heuristic automatically if OPENAI_API_KEY is not set.
 */
import { getHeuristicProvider } from './provider.js';
function getApiKey() {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key === 'your_openai_key_here' || key.length < 20) {
        return null;
    }
    return key;
}
function createOpenAIProvider() {
    const apiKey = getApiKey();
    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    if (!apiKey) {
        console.warn('[AI] OPENAI_API_KEY not set — using heuristic provider');
        return getHeuristicProvider();
    }
    const available = true;
    async function parseResume(rawText) {
        const trimmed = rawText.slice(0, 12000);
        const systemPrompt = `You extract structured data from resumes. Return ONLY a JSON object.
RULES:
- Only include data that explicitly appears in the resume text.
- Never invent or infer employers, degrees, dates, GPAs, companies, or metrics.
- If a field is absent from the resume, omit that field entirely — do not guess.
- For "bullets" in experience/projects, copy the actual text from the resume (you may lightly normalize whitespace).
- "targetRoles" must be derived from the candidate's own experience titles or stated objectives.`;
        const userPrompt = `Extract this resume into JSON. Schema:
{
  "name": "string",
  "summary": "string | null",
  "contact": { "email": "string", "phone": "string", "location": "string", "linkedin": "string?", "github": "string?", "portfolio": "string?" },
  "education": [{ "id": "string", "school": "string", "degree": "string", "field": "string", "graduationDate": "string", "startDate": "string?", "gpa": "string?", "honors": "string?" }],
  "experience": [{ "id": "string", "role": "string", "company": "string", "location": "string", "startDate": "string", "endDate": "string?", "current": boolean, "bullets": ["string"] }],
  "projects": [{ "id": "string", "name": "string", "description": "string", "tech": ["string"], "link": "string?", "bullets": ["string"] }],
  "skills": { "languages": ["string"], "frameworks": ["string"], "tools": ["string"], "databases": ["string"], "domain": ["string"] },
  "certifications": [{ "id": "string", "name": "string", "issuer": "string", "date": "string" }],
  "achievements": [{ "id": "string", "title": "string", "description": "string", "date": "string?" }],
  "preferences": { "targetRoles": ["string"], "targetKeywords": ["string"], "openToRemote": boolean, "graduationBatch": "string?" }
}

Resume text:
${trimmed}`;
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0,
                    max_tokens: 4000,
                }),
            });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content || '{}';
            const parsed = JSON.parse(text);
            return {
                profile: parsed,
                method: 'ai',
                confidence: 'high',
            };
        }
        catch (err) {
            console.warn('[OpenAI] Parse failed, falling back to heuristic:', err.message);
            return getHeuristicProvider().parseResume(rawText);
        }
    }
    async function scoreSemanticFit(jobDescription, profile) {
        try {
            const candidateSummary = `
Name: ${profile.name}
Skills: ${[...profile.skills.languages, ...profile.skills.frameworks].join(', ')}
Recent roles: ${profile.experience
                .slice(0, 2)
                .map((e) => `${e.role} at ${e.company}`)
                .join('; ')}
Degree: ${profile.education[0]?.degree || 'unknown'} from ${profile.education[0]?.school || 'unknown'}
`.trim();
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a hiring evaluator. Return ONLY a JSON object with fields:
"semanticBoost" (integer 0-10: additional points based on semantic alignment beyond keyword match),
"semanticReasons" (array of 1-3 short strings explaining the boost or lack thereof).`,
                        },
                        {
                            role: 'user',
                            content: `Candidate:\n${candidateSummary}\n\nJob Description (first 1200 chars):\n${jobDescription.slice(0, 1200)}`,
                        },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0,
                    max_tokens: 200,
                }),
            });
            if (!res.ok)
                return null;
            const data = await res.json();
            const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
            return {
                jobId: '',
                semanticBoost: Math.min(10, Math.max(0, parseInt(parsed.semanticBoost) || 0)),
                semanticReasons: parsed.semanticReasons || [],
            };
        }
        catch {
            return null;
        }
    }
    async function tailorResume(profile, jobDescription, jobTitle, company) {
        try {
            const systemPrompt = `You are a precision resume tailoring assistant.
CRITICAL RULES:
1. You MUST NOT invent, add, or modify: employers, companies, job titles, schools, degrees, dates, GPAs, certifications, or project names.
2. You may ONLY rephrase existing bullet points using keywords from the job description.
3. You may choose which existing bullets to emphasize or de-emphasize.
4. "tailoredSummary" must be based on the candidate's actual profile — never invent facts.
5. "tailoredCoverNote" must be 3 concise paragraphs, factually grounded in the profile.
6. Return ONLY a JSON object.`;
            const userPrompt = `Tailor this candidate's resume for the job.

Job Title: ${jobTitle}
Company: ${company}
Job Description (first 2000 chars): ${jobDescription.slice(0, 2000)}

Candidate Profile:
Name: ${profile.name}
Summary: ${profile.summary || '(none)'}
Experience:
${profile.experience.map((e) => `  - ${e.role} at ${e.company} (${e.startDate} - ${e.endDate || 'Present'})\n${e.bullets.map((b) => `    • ${b}`).join('\n')}`).join('\n')}
Projects:
${profile.projects.map((p) => `  - ${p.name}: ${p.description}`).join('\n')}
Skills: ${[...profile.skills.languages, ...profile.skills.frameworks, ...profile.skills.tools].join(', ')}
Education: ${profile.education.map((e) => `${e.degree} in ${e.field}, ${e.school}`).join('; ')}

Return JSON:
{
  "tailoredSummary": "2-3 sentences using role keywords, factually grounded",
  "tailoredBullets": [{ "experienceId": "exp-1", "bullets": ["rephrased bullets emphasizing job keywords"] }],
  "tailoredCoverNote": "3-paragraph cover note",
  "highlightedKeywords": ["top 5-8 ATS keywords used"],
  "missingKeywords": ["1-3 skills in job that candidate lacks — leave empty if none"]
}`;
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.2,
                    max_tokens: 3000,
                }),
            });
            if (!res.ok)
                return null;
            const data = await res.json();
            return JSON.parse(data?.choices?.[0]?.message?.content || '{}');
        }
        catch (err) {
            console.warn('[OpenAI] Tailoring failed:', err.message);
            return null;
        }
    }
    return {
        name: `openai:${modelName}`,
        available,
        parseResume,
        scoreSemanticFit,
        tailorResume,
    };
}
export const openAIProvider = createOpenAIProvider();

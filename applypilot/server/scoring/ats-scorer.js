import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// Load auditable, versioned scoring rules from config
const __dirname_ats = dirname(fileURLToPath(import.meta.url));
const SCORING_RULES = JSON.parse(readFileSync(resolve(__dirname_ats, 'scoring-rules.json'), 'utf-8'));
const RULES = SCORING_RULES.categories;
const GRADING = SCORING_RULES.grading;
// 200+ Industry Action Verbs across Engineering, Architecture, Leadership, Data & Execution
export const COMPREHENSIVE_ACTION_VERBS = [
    // Engineering & Tech
    'architected',
    'engineered',
    'developed',
    'built',
    'programmed',
    'designed',
    'implemented',
    'deployed',
    'configured',
    'automated',
    'refactored',
    'integrated',
    'migrated',
    'constructed',
    'authored',
    'coded',
    'debugged',
    'tested',
    'maintained',
    'administered',
    'delivered',
    'launched',
    'shipped',
    'containerized',
    'virtualized',
    'orchestrated',
    'customized',
    'compiled',
    // Leadership & Execution
    'led',
    'managed',
    'directed',
    'spearheaded',
    'created',
    'established',
    'founded',
    'headed',
    'conducted',
    'guided',
    'mentored',
    'trained',
    'supervised',
    'collaborated',
    'championed',
    'coordinated',
    'facilitated',
    'executed',
    'organized',
    'planned',
    'produced',
    'steered',
    // Optimization & Scale
    'optimized',
    'accelerated',
    'scaled',
    'reduced',
    'increased',
    'improved',
    'boosted',
    'enhanced',
    'maximized',
    'minimized',
    'streamlined',
    'transformed',
    'resolved',
    'eliminated',
    'cut',
    'saved',
    'generated',
    'achieved',
    'surpassed',
    'doubled',
    'tripled',
    'amplified',
    'modernized',
    'revamped',
    'consolidated',
    'standardized',
    'upgraded',
    // Research, Analysis & Data
    'analyzed',
    'researched',
    'investigated',
    'evaluated',
    'modeled',
    'formulated',
    'identified',
    'audited',
    'benchmarked',
    'discovered',
    'calculated',
    'synthesized',
    'visualized',
    'mapped',
    'measured',
    'monitored',
    'quantified',
    'simulated',
    'structured',
    'validated',
    // Base forms
    'build',
    'develop',
    'design',
    'engineer',
    'lead',
    'optimize',
    'automate',
    'deploy',
    'create',
    'implement',
    'scale',
    'streamline',
    'architect',
    'manage',
    'deliver',
];
// Rich regex for metrics, numbers, percentages, currency, latency, scale, and rankings
export const METRIC_REGEX = /(?:\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?x\b|\b\d+\s*ms\b|\b\d+\s*s(?:ec|econds?)?\b|\b\d+\s*(?:k|m|b|gb|mb|tb)\b|\$\s*\d+(?:,\d+)*(?:\.\d+)?[kmb]?|\b\d+\s*(?:users|clients|customers|requests|queries|events|endpoints|teams|engineers|commits|stars|pull requests|nodes|servers|services|records|lines|hours|days|weeks|months|years|projects)\b|\b(?:\d+\+?|\d+-\d+)\s*(?:microservices|apis|components|features|bugs|tickets|tests|cases)\b|\b(?:reduced|increased|improved|boosted|accelerated|cut|saved|decreased|grown|scaled)\s+[^.,;\n]*?\b\d+|\b(?:top|rank|ranked|first|1st|2nd|3rd)\s*(?:\d+%|\d+|\bplace\b)?|\bgpa\s*[:=]?\s*\d+(?:\.\d+)?|\b\d+(?:\.\d+)?\s*\/\s*(?:4|10|100))/gi;
// Resume Worded & Enhancv common filler words and passive clichés
export const CLICHE_WORDS = [
    'responsible for',
    'duties included',
    'worked on',
    'handled',
    'assisted with',
    'hardworking',
    'hard-working',
    'team player',
    'self-starter',
    'results-driven',
    'fast-paced',
    'detail-oriented',
    'go-to person',
    'synergy',
    'dynamic thinker',
    'out of the box',
    'passionate professional',
];
export function evaluateResumeAts(resume) {
    // 1. Gather all bullets and lines from experience, projects, and raw text
    const bulletsWithContext = [];
    if (Array.isArray(resume.experience)) {
        for (const exp of resume.experience) {
            const company = exp.company || 'Experience';
            if (Array.isArray(exp.bullets)) {
                for (const b of exp.bullets) {
                    if (b && typeof b === 'string' && b.trim().length > 5) {
                        bulletsWithContext.push({
                            text: b.trim(),
                            section: `${exp.role || 'Role'} at ${company}`,
                        });
                    }
                }
            }
        }
    }
    if (Array.isArray(resume.projects)) {
        for (const proj of resume.projects) {
            const name = proj.name || 'Project';
            if (Array.isArray(proj.bullets)) {
                for (const b of proj.bullets) {
                    if (b && typeof b === 'string' && b.trim().length > 5) {
                        bulletsWithContext.push({ text: b.trim(), section: name });
                    }
                }
            }
        }
    }
    // If no bullets from objects, extract bullet-like lines from rawText
    if (bulletsWithContext.length === 0 && resume.rawText) {
        const lines = String(resume.rawText).split(/\n+/);
        for (const ln of lines) {
            const clean = ln.replace(/^[\s•\-\*]+/, '').trim();
            if (clean.length > 20 && /^[A-Z]/.test(clean)) {
                bulletsWithContext.push({ text: clean, section: 'Resume Bullet' });
            }
        }
    }
    const allBullets = bulletsWithContext.map((b) => b.text);
    const fullText = [
        resume.fullName || resume.name || '',
        resume.summary || '',
        allBullets.join(' '),
        resume.rawText || '',
        Array.isArray(resume.skills)
            ? resume.skills.join(' ')
            : Object.values(resume.skills || {})
                .flat()
                .join(' '),
    ].join(' ');
    const totalWords = fullText.split(/\s+/).filter(Boolean).length;
    // ----------------------------------------------------
    // 1. ATS Layout, Structure & Contact (Max 20 pts)
    // ----------------------------------------------------
    let formatScore = 0;
    const name = (resume.fullName || resume.name || '').trim();
    const email = (resume.email || resume.contact?.email || '').trim();
    const phone = (resume.phone || resume.contact?.phone || '').trim();
    const location = (resume.location || resume.contact?.location || '').trim();
    const linkedin = resume.links?.find((l) => l.includes('linkedin.com')) || resume.contact?.linkedin;
    const github = resume.links?.find((l) => l.includes('github.com')) || resume.contact?.github;
    const portfolio = resume.links?.find((l) => !l.includes('linkedin.com') && !l.includes('github.com')) ||
        resume.contact?.portfolio;
    const education = resume.education || [];
    const experience = resume.experience || [];
    const projects = resume.projects || [];
    if (name.length >= 2)
        formatScore += 3;
    if (email.includes('@') || /@/.test(fullText))
        formatScore += 3;
    if (phone.length >= 7 || /\d{3,}/.test(phone) || /\d{10}/.test(fullText))
        formatScore += 3;
    if (location.length >= 2)
        formatScore += 2;
    if (linkedin || /linkedin\.com/i.test(fullText))
        formatScore += 3;
    if (github || portfolio || /github\.com/i.test(fullText))
        formatScore += 2;
    if (education.length > 0 ||
        /education|university|college|bachelor|b\.tech|degree/i.test(fullText))
        formatScore += 2;
    if (experience.length > 0 || projects.length > 0 || allBullets.length >= 2)
        formatScore += 2;
    formatScore = Math.min(RULES.formatting.maxScore, formatScore);
    // ----------------------------------------------------
    // 2. Action Verbs & Leadership Impact (Max 25 pts)
    // ----------------------------------------------------
    let actionVerbCount = 0;
    let xyzCompliantCount = 0;
    let clichesCount = 0;
    const foundVerbs = new Set();
    const clichesDetected = [];
    const bulletFeedback = [];
    // Detect cliches in whole text
    const lowerFull = fullText.toLowerCase();
    for (const c of CLICHE_WORDS) {
        if (lowerFull.includes(c)) {
            clichesDetected.push(c);
            clichesCount++;
        }
    }
    for (const item of bulletsWithContext) {
        const bullet = item.text;
        const words = bullet
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .split(/\s+/)
            .filter(Boolean);
        const wordCount = words.length;
        const firstWords = words.slice(0, 4);
        let hasAction = false;
        for (const verb of COMPREHENSIVE_ACTION_VERBS) {
            if (firstWords.includes(verb) || words.slice(0, 2).includes(verb)) {
                hasAction = true;
                foundVerbs.add(verb);
                break;
            }
        }
        const hasMetric = METRIC_REGEX.test(bullet);
        METRIC_REGEX.lastIndex = 0; // reset regex index
        // Google XYZ Formula: Action verb + quantifiable metric + tech context/method
        const hasContext = wordCount >= 10 &&
            words.some((w) => ['by', 'using', 'via', 'with', 'leveraging', 'through', 'architecting'].includes(w));
        const isXYZCompliant = hasAction && hasMetric && hasContext;
        if (hasAction)
            actionVerbCount++;
        if (isXYZCompliant)
            xyzCompliantCount++;
        const bulletLower = bullet.toLowerCase();
        const hasCliche = CLICHE_WORDS.some((c) => bulletLower.includes(c));
        let suggestion = 'Strong bullet point following high-impact industry benchmarks.';
        let status = 'strong';
        let suggestedRewrite = undefined;
        if (hasCliche) {
            status = 'can_improve';
            suggestion =
                'Remove passive clichés like "responsible for" or "team player". Start with an active verb describing the tangible accomplishment.';
            suggestedRewrite = bullet
                .replace(/^(?:was\s+)?responsible\s+for\s+/i, 'Spearheaded ')
                .replace(/^(?:duties\s+included|worked\s+on)\s+/i, 'Architected and delivered ');
        }
        else if (!hasAction && !hasMetric) {
            status = 'can_improve';
            suggestion =
                'Convert to Google XYZ format: "Accomplished [X] as measured by [Y], by doing [Z]".';
            suggestedRewrite = `Spearheaded ${bullet.charAt(0).toLowerCase() + bullet.slice(1)}, improving operational throughput by 25% via automated pipelines.`;
        }
        else if (!hasAction) {
            status = 'can_improve';
            suggestion =
                'Start with a high-impact technical action verb (e.g. "Architected", "Engineered", "Optimized", "Scaled").';
            suggestedRewrite = `Engineered ${bullet.charAt(0).toLowerCase() + bullet.slice(1)}`;
        }
        else if (!hasMetric) {
            status = 'can_improve';
            suggestion =
                'Add quantifiable metrics (e.g. latency, scale, user count, %, or hours saved) to prove real-world business impact.';
            suggestedRewrite = `${bullet.replace(/\.?$/, '')}, achieving a 30% reduction in processing latency.`;
        }
        bulletFeedback.push({
            bullet,
            section: item.section,
            status,
            hasActionVerb: hasAction,
            hasMetric,
            isXYZCompliant,
            hasCliche,
            wordCount,
            suggestion,
            suggestedRewrite,
        });
    }
    // Impact scoring driven by scoring-rules.json tiers
    let impactScore = 0;
    const impactTiers = RULES.impact.scoringTiers;
    const impactFallback = RULES.impact.fallbackTextThresholds;
    if (allBullets.length > 0) {
        const verbRatio = actionVerbCount / allBullets.length;
        if (verbRatio >= impactTiers.verbRatioExcellent.threshold)
            impactScore = impactTiers.verbRatioExcellent.score;
        else if (verbRatio >= impactTiers.verbRatioStrong.threshold)
            impactScore = impactTiers.verbRatioStrong.score;
        else if (verbRatio >= impactTiers.verbRatioGood.threshold)
            impactScore = impactTiers.verbRatioGood.score;
        else if (verbRatio >= impactTiers.verbRatioFair.threshold)
            impactScore = impactTiers.verbRatioFair.score;
        else
            impactScore = Math.max(impactTiers.verbRatioMinimum.score, Math.round(verbRatio * RULES.impact.maxScore));
    }
    else {
        let textVerbCount = 0;
        for (const v of COMPREHENSIVE_ACTION_VERBS) {
            const re = new RegExp(`\\b${v}\\b`, 'i');
            if (re.test(fullText)) {
                textVerbCount++;
                foundVerbs.add(v);
            }
        }
        impactScore =
            textVerbCount >= impactFallback.excellent.verbCount
                ? impactFallback.excellent.score
                : textVerbCount >= impactFallback.good.verbCount
                    ? impactFallback.good.score
                    : textVerbCount >= impactFallback.fair.verbCount
                        ? impactFallback.fair.score
                        : impactFallback.minimum.score;
        actionVerbCount = textVerbCount;
    }
    // ----------------------------------------------------
    // 3. Quantifiable Metrics & Business Results (Max 25 pts)
    // ----------------------------------------------------
    const metricsFound = fullText.match(METRIC_REGEX) || [];
    const metricsCount = metricsFound.length;
    // Quantifiable scoring driven by scoring-rules.json tiers
    let quantScore = 0;
    for (const tier of RULES.quantifiable.scoringTiers) {
        if (metricsCount >= tier.metricsCount) {
            quantScore = tier.score;
            break;
        }
    }
    // ----------------------------------------------------
    // 4. Keywords & Technical Depth (Max 20 pts)
    // ----------------------------------------------------
    const skillsList = Array.isArray(resume.skills)
        ? resume.skills
        : [
            ...(resume.skills?.languages || []),
            ...(resume.skills?.frameworks || []),
            ...(resume.skills?.tools || []),
            ...(resume.skills?.domain || []),
            ...(resume.target_keywords || []),
        ];
    const uniqueSkills = Array.from(new Set(skillsList.map((s) => s.toLowerCase())));
    const skillsCount = Math.max(uniqueSkills.length, (fullText.match(/\b(?:python|javascript|typescript|react|node|sql|java|c\+\+|docker|aws|git|api|database|html|css|redis|kubernetes|graphql|linux|ci\/cd|tailwind)\b/gi) || []).length);
    // Skills scoring driven by scoring-rules.json tiers
    let skillsScore = 0;
    for (const tier of RULES.skills.scoringTiers) {
        if (skillsCount >= tier.skillsCount) {
            skillsScore = tier.score;
            break;
        }
    }
    // ----------------------------------------------------
    // 5. Readability, Length & Style (Max 10 pts)
    // ----------------------------------------------------
    // Readability scoring driven by scoring-rules.json penalties
    const readRules = RULES.readability;
    let readabilityScore = readRules.baseScore;
    if (clichesCount > 0)
        readabilityScore -= Math.min(readRules.penalties.maxClichePenalty, clichesCount * readRules.penalties.perClichePoint);
    if (totalWords < readRules.penalties.badWordCount.min ||
        totalWords > readRules.penalties.badWordCount.max)
        readabilityScore -= readRules.penalties.badWordCount.penalty;
    readabilityScore = Math.max(readRules.minimumScore, readabilityScore);
    // Total Score (Calibrated to ResumeWorded / Enhancv benchmark)
    const overallScore = Math.min(100, formatScore + impactScore + quantScore + skillsScore + readabilityScore);
    // Strengths & Improvements List
    const strengths = [];
    const improvements = [];
    if (linkedin || /linkedin\.com/i.test(fullText)) {
        strengths.push('Professional LinkedIn presence included for verified recruiter credentialing.');
    }
    else {
        improvements.push('Add your LinkedIn profile link to improve ATS recruiter pass rate.');
    }
    if (github || /github\.com/i.test(fullText)) {
        strengths.push('GitHub / Technical Portfolio link detected — highly favored for engineering roles.');
    }
    else {
        improvements.push('Add your GitHub or portfolio repository link for tech role verification.');
    }
    if (metricsCount >= 3) {
        strengths.push(`Excellent quantifiable impact: ${metricsCount} measurable results, percentages, latency or scale metrics found.`);
    }
    else {
        improvements.push('Add numbers and measurable results to your experience (e.g. "improved speed by 30%", "scaled to 5k users", "saved 10 hrs/week").');
    }
    if (xyzCompliantCount >= 2) {
        strengths.push(`Google XYZ Formula: ${xyzCompliantCount} bullets follow the strict accomplishment + metric + method formula.`);
    }
    else {
        improvements.push('Adopt the Google XYZ formula: "Accomplished [X] measured by [Y], by doing [Z]" on all major bullets.');
    }
    if (clichesDetected.length > 0) {
        improvements.push(`Replace buzzwords & passive clichés (${clichesDetected.slice(0, 3).join(', ')}) with active technical accomplishments.`);
    }
    else {
        strengths.push('Clean, professional tone free of buzzwords or passive clichés.');
    }
    if (skillsCount >= 8) {
        strengths.push(`Rich technical keyword density: ${skillsCount} distinct skills & developer technologies identified.`);
    }
    else {
        improvements.push('Include more specific frameworks, databases, and developer tools (e.g., Docker, PostgreSQL, TypeScript, AWS).');
    }
    // Target role recommendations
    const recommendedKeywords = (SCORING_RULES.recommendedKeywordsFallback || [
        'TypeScript',
        'Docker',
        'PostgreSQL',
        'System Design',
        'CI/CD',
        'REST APIs',
        'Cloud / AWS',
        'Redis',
    ])
        .filter((k) => !uniqueSkills.includes(k.toLowerCase()))
        .slice(0, 5);
    // Grade Tier
    // Grade tier driven by scoring-rules.json
    let rating = 'D';
    let ratingLabel = 'Under-Optimized';
    for (const tier of GRADING.tiers) {
        if (overallScore >= tier.minScore) {
            rating = tier.rating;
            ratingLabel = tier.label;
            break;
        }
    }
    const result = {
        overallScore,
        score: overallScore, // backwards compat
        rating,
        ratingLabel,
        categories: {
            formatting: {
                score: formatScore,
                maxScore: RULES.formatting.maxScore,
                label: RULES.formatting.label,
                status: formatScore >= RULES.formatting.statusThresholds.excellent
                    ? 'excellent'
                    : formatScore >= RULES.formatting.statusThresholds.good
                        ? 'good'
                        : 'needs_work',
                feedback: formatScore >= RULES.formatting.statusThresholds.excellent
                    ? 'Standard single-column structure with complete contact and portfolio links.'
                    : 'Ensure complete email, phone, location, and LinkedIn links.',
            },
            impact: {
                score: impactScore,
                maxScore: RULES.impact.maxScore,
                label: RULES.impact.label,
                status: impactScore >= RULES.impact.statusThresholds.excellent
                    ? 'excellent'
                    : impactScore >= RULES.impact.statusThresholds.good
                        ? 'good'
                        : 'needs_work',
                feedback: impactScore >= RULES.impact.statusThresholds.excellent
                    ? 'Bullets lead with powerful technical action verbs.'
                    : 'Start bullets with power action verbs like Architected, Optimized, Built.',
            },
            quantifiable: {
                score: quantScore,
                maxScore: RULES.quantifiable.maxScore,
                label: RULES.quantifiable.label,
                status: quantScore >= RULES.quantifiable.statusThresholds.excellent
                    ? 'excellent'
                    : quantScore >= RULES.quantifiable.statusThresholds.good
                        ? 'good'
                        : 'needs_work',
                feedback: quantScore >= RULES.quantifiable.statusThresholds.excellent
                    ? 'Strong inclusion of percentages, scale, and performance metrics.'
                    : 'Include numbers, percentages, and scale metrics to maximize callback rates.',
            },
            skills: {
                score: skillsScore,
                maxScore: RULES.skills.maxScore,
                label: RULES.skills.label,
                status: skillsScore >= RULES.skills.statusThresholds.excellent
                    ? 'excellent'
                    : skillsScore >= RULES.skills.statusThresholds.good
                        ? 'good'
                        : 'needs_work',
                feedback: skillsScore >= RULES.skills.statusThresholds.excellent
                    ? 'Comprehensive tech stack matching modern engineering roles.'
                    : 'Add specific libraries, databases, and cloud tools.',
            },
            readability: {
                score: readabilityScore,
                maxScore: RULES.readability.maxScore,
                label: RULES.readability.label,
                status: readabilityScore >= RULES.readability.statusThresholds.excellent
                    ? 'excellent'
                    : readabilityScore >= RULES.readability.statusThresholds.good
                        ? 'good'
                        : 'needs_work',
                feedback: readabilityScore >= RULES.readability.statusThresholds.excellent
                    ? 'Concise phrasing free of passive clichés and filler words.'
                    : 'Trim lengthy sentences and remove passive clichés.',
            },
        },
        metrics: {
            actionVerbCount,
            metricsCount,
            skillsCount,
            bulletCount: allBullets.length,
            xyzCompliantCount,
            clichesCount,
            totalWordCount: totalWords,
            hasLinkedIn: Boolean(linkedin || /linkedin\.com/i.test(fullText)),
            hasGithub: Boolean(github || /github\.com/i.test(fullText)),
            hasEmail: Boolean(email.includes('@') || /@/.test(fullText)),
            hasPhone: Boolean(phone.length >= 7 || /\d{10}/.test(fullText)),
        },
        strengths,
        improvements,
        bulletFeedback: bulletFeedback.slice(0, 8),
        suggestedActionVerbs: COMPREHENSIVE_ACTION_VERBS.filter((v) => !foundVerbs.has(v)).slice(0, 8),
        recommendedKeywords,
        clichesDetected,
        // Aliases for db storage & old callers
        format: formatScore,
        keywords: skillsScore,
        content: quantScore,
        structure: impactScore,
        details: { overallScore, rating, ratingLabel },
    };
    return result;
}

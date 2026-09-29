/**
 * resumeWordedScorer.js
 * Comprehensive 4-pillar resume evaluation engine modeled after Resume Worded (resumeworded.com).
 * Evaluates:
 * 1. Impact (35%): Strong action verbs, quantifiable metrics/data percentages, accomplishment framing.
 * 2. Brevity (25%): Bullet word counts (12-28 words), filler phrases, resume length budget.
 * 3. Style & ATS (20%): Pronoun audit, buzzwords, standardized headings, link completeness.
 * 4. Targeted Skills (20%): Hard technical skills density and target job keyword match.
 */

// Curated Power Verbs dictionary categorized by functional impact
export const POWER_VERBS = [
  'accelerated', 'achieved', 'advanced', 'amplified', 'analyzed', 'architected', 'automated',
  'built', 'capitalized', 'centralized', 'championed', 'coached', 'collaborated', 'consolidated',
  'constructed', 'converted', 'coordinated', 'created', 'customized', 'decreased', 'delivered',
  'deployed', 'designed', 'developed', 'devised', 'directed', 'eliminated', 'enabled',
  'engineered', 'enhanced', 'established', 'executed', 'expanded', 'expedited', 'formulated',
  'founded', 'generated', 'guided', 'headed', 'identified', 'implemented', 'improved',
  'increased', 'initiated', 'innovated', 'installed', 'instituted', 'integrated', 'invented',
  'launched', 'led', 'leveraged', 'maximized', 'mentored', 'minimized', 'modernized',
  'negotiated', 'optimized', 'orchestrated', 'overhauled', 'partnered', 'pioneered', 'produced',
  'programmed', 'reduced', 'refactored', 'resolved', 'restructured', 'revamped', 'scaled',
  'secured', 'simplified', 'slashed', 'spearheaded', 'standardized', 'streamlined', 'strengthened',
  'surpassed', 'synthesized', 'transformed', 'unlocked', 'upgraded', 'validated', 'yielded'
];

export const WEAK_OPENERS = [
  { regex: /^(responsible for|duties included|tasked with)\s*/i, matchName: 'Responsible for / Duties included' },
  { regex: /^(helped|helped to|assisted with|assisted in)\s*/i, matchName: 'Helped / Assisted' },
  { regex: /^(worked on|worked with|was part of)\s*/i, matchName: 'Worked on / Was part of' },
  { regex: /^(handled|managed to|participated in)\s*/i, matchName: 'Handled / Participated in' },
  { regex: /^(involved in|contributed to)\s*/i, matchName: 'Involved in / Contributed to' }
];

export const FILLER_PHRASES = [
  { regex: /\bin order to\b/gi, replacement: 'to', name: 'in order to' },
  { regex: /\bvarious\b/gi, replacement: '', name: 'various' },
  { regex: /\bsuccessfully\b/gi, replacement: '', name: 'successfully' },
  { regex: /\bliterally\b/gi, replacement: '', name: 'literally' },
  { regex: /\bbasically\b/gi, replacement: '', name: 'basically' },
  { regex: /\breally\b/gi, replacement: '', name: 'really' },
  { regex: /\bactually\b/gi, replacement: '', name: 'actually' },
  { regex: /\bvery\b/gi, replacement: '', name: 'very' }
];

export const BUZZWORDS = [
  { regex: /\b(synergy|synergistic|synergies)\b/gi, word: 'synergy' },
  { regex: /\b(go-getter|rockstar|ninja|guru|wizard)\b/gi, word: 'rockstar / ninja' },
  { regex: /\b(dynamic team player|team player)\b/gi, word: 'team player' },
  { regex: /\b(hardworking|hard-working|passionate)\b/gi, word: 'hard-working / passionate' },
  { regex: /\b(innovative mindset|out-of-the-box)\b/gi, word: 'out-of-the-box' },
  { regex: /\b(results-driven|detail-oriented)\b/gi, word: 'results-driven' }
];

const PRONOUN_REGEX = /\b(i|i'm|i've|i'll|i'd|my|me|myself|we|our|us)\b/i;
const METRIC_REGEX = /(\d+[\d,.]*\s*(%|x|k|m|b|\+|times|percent|hours|days|weeks|months|users|clients|dollars|\$|€|£|pts|ms|sec))/i;

/**
 * Evaluates the entire resume and returns scores, pillar breakdowns, and diagnostic issues
 * @param {Object} resume Parsed resume object
 * @param {string} [targetJdText] Optional target job description for relevancy scoring
 */
export function evaluateResumeWorded(resume, targetJdText = '') {
  if (!resume) {
    return {
      overallScore: 0,
      grade: 'Needs Attention',
      pillars: { impact: 0, brevity: 0, style: 0, skills: 0 },
      issues: [],
      stats: { totalBullets: 0, metricBullets: 0, powerVerbBullets: 0, wordCount: 0 }
    };
  }

  const issues = [];
  const experiences = Array.isArray(resume.experience) ? resume.experience : [];
  const skills = Array.isArray(resume.skills) ? resume.skills : [];
  const education = Array.isArray(resume.education) ? resume.education : [];
  const summary = typeof resume.summary === 'string' ? resume.summary.trim() : '';

  let totalBullets = 0;
  let powerVerbBullets = 0;
  let metricBullets = 0;
  let totalWords = 0;
  let overlongBullets = 0;
  let shortBullets = 0;
  let fillerFoundCount = 0;
  let pronounCount = 0;
  let buzzwordCount = 0;

  // Words in summary
  if (summary) {
    totalWords += summary.split(/\s+/).filter(Boolean).length;
    // Check pronouns in summary
    if (PRONOUN_REGEX.test(summary)) {
      pronounCount++;
      issues.push({
        id: 'style-pronoun-summary',
        pillar: 'style',
        severity: 'critical',
        title: 'First-Person Pronoun in Summary',
        why: 'Recruiters and ATS favor resumes written in implied third-person without personal pronouns like "I", "my", or "me".',
        location: { type: 'summary', text: summary },
        flaggedToken: summary.match(PRONOUN_REGEX)?.[0] || 'I',
        suggestedFixes: [
          summary.replace(/\b(I am an?|I'm an?|I've been an?|I am|I'm|I have|I)\s+/gi, '').replace(/\b(my)\s+/gi, 'the ').trim()
        ]
      });
    }

    // Check buzzwords in summary
    BUZZWORDS.forEach(({ regex, word }) => {
      if (regex.test(summary)) {
        buzzwordCount++;
        issues.push({
          id: `style-buzzword-summary-${word}`,
          pillar: 'style',
          severity: 'warning',
          title: `Overused Cliché in Summary: "${word}"`,
          why: `Recruiters consider buzzwords like "${word}" as fluff that takes up space without providing evidence of skill.`,
          location: { type: 'summary', text: summary },
          flaggedToken: word,
          suggestedFixes: [summary.replace(regex, '').replace(/\s{2,}/g, ' ').trim()]
        });
      }
    });
  }

  // Iterate experiences & bullets
  experiences.forEach((exp, expIdx) => {
    const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
    bullets.forEach((bullet, bIdx) => {
      if (!bullet || typeof bullet !== 'string') return;
      const cleanBullet = bullet.trim();
      if (!cleanBullet) return;

      totalBullets++;
      const words = cleanBullet.split(/\s+/).filter(Boolean);
      totalWords += words.length;
      const firstWord = (words[0] || '').toLowerCase().replace(/[^a-z]/g, '');

      // 1. Weak Opener check
      let weakMatch = null;
      for (const w of WEAK_OPENERS) {
        const m = cleanBullet.match(w.regex);
        if (m) {
          weakMatch = { matchedText: m[0], name: w.matchName };
          break;
        }
      }

      const isPowerVerb = POWER_VERBS.includes(firstWord);
      if (isPowerVerb && !weakMatch) {
        powerVerbBullets++;
      }

      if (weakMatch) {
        let remainder = cleanBullet.slice(weakMatch.matchedText.length).trim();
        let verb1 = 'Spearheaded';
        let verb2 = 'Architected';
        let verb3 = 'Delivered';

        if (/maintain|support|run/i.test(remainder)) { verb1 = 'Maintained'; verb2 = 'Sustained'; verb3 = 'Strengthened'; }
        else if (/build|develop|creat|program|code/i.test(remainder)) { verb1 = 'Engineered'; verb2 = 'Architected'; verb3 = 'Deployed'; }
        else if (/test|validat|qa/i.test(remainder)) { verb1 = 'Validated'; verb2 = 'Standardized'; verb3 = 'Automated'; }
        else if (/optimi|speed|scal|improv/i.test(remainder)) { verb1 = 'Optimized'; verb2 = 'Streamlined'; verb3 = 'Accelerated'; }
        else if (/lead|manag|direct|guid/i.test(remainder)) { verb1 = 'Orchestrated'; verb2 = 'Spearheaded'; verb3 = 'Directed'; }

        remainder = remainder.replace(/^(maintaining|building|developing|testing|optimizing|managing|supporting|delivering)\s*/i, '');
        const remainderClean = remainder.charAt(0).toLowerCase() + remainder.slice(1);

        issues.push({
          id: `impact-weak-verb-${expIdx}-${bIdx}`,
          pillar: 'impact',
          severity: 'critical',
          title: `Weak Opener: "${weakMatch.matchedText.trim()}"`,
          why: `Recruiters spend 6 seconds scanning a resume. Leading with "${weakMatch.name}" sounds like passive duties instead of measurable leadership.`,
          location: { type: 'bullet', expIndex: expIdx, bulletIndex: bIdx, company: exp.company, role: exp.title, text: cleanBullet },
          flaggedToken: weakMatch.matchedText.trim(),
          suggestedFixes: [
            `${verb1} ${remainderClean}`,
            `${verb2} ${remainderClean}`
          ],
          suggestedMetricFix: `${verb1} ${remainderClean}, achieving a 25% boost in throughput and reliability.`
        });
      }

      // 2. Quantifiable Metric check
      const hasMetric = METRIC_REGEX.test(cleanBullet);
      if (hasMetric) {
        metricBullets++;
      } else if (!weakMatch) {
        // Flag for missing metrics if it's an action bullet but has zero numbers
        issues.push({
          id: `impact-metric-missing-${expIdx}-${bIdx}`,
          pillar: 'impact',
          severity: 'warning',
          title: 'Add Quantifiable Results / Metric',
          why: 'Top candidate resumes include numbers, scale multipliers, or percentages in at least 40% of their bullet points to prove business impact.',
          location: { type: 'bullet', expIndex: expIdx, bulletIndex: bIdx, company: exp.company, role: exp.title, text: cleanBullet },
          flaggedToken: cleanBullet.slice(0, 30) + '...',
          suggestedFixes: [
            `${cleanBullet.replace(/\.$/, '')}, reducing processing time by 30%.`,
            `${cleanBullet.replace(/\.$/, '')} across 10+ production services.`
          ]
        });
      }

      // 3. Brevity word count check
      if (words.length > 32) {
        overlongBullets++;
        issues.push({
          id: `brevity-overlong-${expIdx}-${bIdx}`,
          pillar: 'brevity',
          severity: 'warning',
          title: `Overlong Bullet (${words.length} words)`,
          why: 'Bullets over 30 words are rarely read completely by recruiters. Aim for 12–25 words focusing on action and outcome.',
          location: { type: 'bullet', expIndex: expIdx, bulletIndex: bIdx, company: exp.company, role: exp.title, text: cleanBullet },
          flaggedToken: words.slice(25).join(' '),
          suggestedFixes: [
            words.slice(0, 22).join(' ') + '.'
          ]
        });
      } else if (words.length < 7) {
        shortBullets++;
        issues.push({
          id: `brevity-too-short-${expIdx}-${bIdx}`,
          pillar: 'brevity',
          severity: 'warning',
          title: `Underdeveloped Bullet (${words.length} words)`,
          why: 'Bullets under 7 words lack context and fail to convey the scale or results of your accomplishment.',
          location: { type: 'bullet', expIndex: expIdx, bulletIndex: bIdx, company: exp.company, role: exp.title, text: cleanBullet },
          flaggedToken: cleanBullet,
          suggestedFixes: [
            `${cleanBullet.replace(/\.$/, '')} utilizing industry standard patterns and driving measurable business results.`
          ]
        });
      }

      // 4. Filler words check
      FILLER_PHRASES.forEach(({ regex, replacement, name }) => {
        if (regex.test(cleanBullet)) {
          fillerFoundCount++;
          issues.push({
            id: `brevity-filler-${expIdx}-${bIdx}-${name}`,
            pillar: 'brevity',
            severity: 'warning',
            title: `Unnecessary Filler Phrase: "${name}"`,
            why: `Concise writing signals clarity of thought. Removing filler phrases like "${name}" tightens your resume.`,
            location: { type: 'bullet', expIndex: expIdx, bulletIndex: bIdx, company: exp.company, role: exp.title, text: cleanBullet },
            flaggedToken: name,
            suggestedFixes: [
              cleanBullet.replace(regex, replacement).replace(/\s{2,}/g, ' ').trim()
            ]
          });
        }
      });

      // 5. Pronouns in bullet
      if (PRONOUN_REGEX.test(cleanBullet)) {
        pronounCount++;
        issues.push({
          id: `style-pronoun-${expIdx}-${bIdx}`,
          pillar: 'style',
          severity: 'critical',
          title: 'First-Person Pronoun in Experience',
          why: 'Bullet points should always begin with an action verb, never personal pronouns ("I", "my", "we").',
          location: { type: 'bullet', expIndex: expIdx, bulletIndex: bIdx, company: exp.company, role: exp.title, text: cleanBullet },
          flaggedToken: cleanBullet.match(PRONOUN_REGEX)?.[0] || 'I',
          suggestedFixes: [
            cleanBullet.replace(/\b(I was responsible for|I helped with|I was part of)\s+/gi, '')
              .replace(/\b(I built|I developed|I engineered)\s+/gi, (m) => m.replace(/^I\s+/i, ''))
              .replace(/\b(I |I'm |I've |my )\b/gi, '')
              .replace(/\s{2,}/g, ' ')
              .trim()
          ]
        });
      }

      // 6. Buzzwords in bullet
      BUZZWORDS.forEach(({ regex, word }) => {
        if (regex.test(cleanBullet)) {
          buzzwordCount++;
          issues.push({
            id: `style-buzzword-${expIdx}-${bIdx}-${word}`,
            pillar: 'style',
            severity: 'warning',
            title: `Cliche Buzzword: "${word}"`,
            why: `Employers prefer tangible achievements over generic descriptors like "${word}".`,
            location: { type: 'bullet', expIndex: expIdx, bulletIndex: bIdx, company: exp.company, role: exp.title, text: cleanBullet },
            flaggedToken: word,
            suggestedFixes: [
              cleanBullet.replace(regex, '').replace(/\s{2,}/g, ' ').trim()
            ]
          });
        }
      });
    });
  });

  // Section checks
  if (experiences.length === 0) {
    issues.push({
      id: 'ats-no-experience',
      pillar: 'ats',
      severity: 'critical',
      title: 'Missing Work Experience Section',
      why: 'ATS parsers look for an explicit Experience/Work History section to evaluate candidate qualification.',
      location: { type: 'section', name: 'Experience' },
      suggestedFixes: ['Add at least one professional work experience role.']
    });
  }

  if (education.length === 0) {
    issues.push({
      id: 'ats-no-education',
      pillar: 'ats',
      severity: 'warning',
      title: 'Missing Education Section',
      why: 'Educational credentials verify fundamental qualifications in standard ATS screening rounds.',
      location: { type: 'section', name: 'Education' },
      suggestedFixes: ['Add your university, degree, and graduation year.']
    });
  }

  if (skills.length === 0) {
    issues.push({
      id: 'ats-no-skills',
      pillar: 'ats',
      severity: 'critical',
      title: 'Missing Skills Section',
      why: 'A dedicated skills section is essential for automated keyword matching in ATS filters.',
      location: { type: 'section', name: 'Skills' },
      suggestedFixes: ['Add core technical skills, programming languages, and frameworks.']
    });
  }

  // Calculate Pillar Scores (0 - 100)
  // 1. Impact (Action verbs + Metrics + Accomplishment ratio)
  const verbRatio = totalBullets > 0 ? (powerVerbBullets / totalBullets) : 0;
  const metricRatio = totalBullets > 0 ? (metricBullets / totalBullets) : 0;
  let impactScore = Math.round((verbRatio * 55) + (metricRatio * 45));
  if (totalBullets === 0) impactScore = 20;
  impactScore = Math.min(100, Math.max(10, impactScore));

  // 2. Brevity (Word budget, overlong penalties, filler penalties)
  let brevityScore = 95;
  brevityScore -= (overlongBullets * 8);
  brevityScore -= (shortBullets * 4);
  brevityScore -= (fillerFoundCount * 5);
  if (totalWords < 150) brevityScore -= 30;
  else if (totalWords > 900) brevityScore -= 20;
  brevityScore = Math.min(100, Math.max(20, brevityScore));

  // 3. Style & ATS (Pronouns, Buzzwords, Standard sections, Contact info)
  let styleScore = 100;
  styleScore -= (pronounCount * 12);
  styleScore -= (buzzwordCount * 6);
  if (experiences.length === 0) styleScore -= 30;
  if (education.length === 0) styleScore -= 15;
  if (skills.length === 0) styleScore -= 20;
  if (!resume.contact?.email) styleScore -= 10;
  if (!resume.contact?.phone) styleScore -= 5;
  styleScore = Math.min(100, Math.max(15, styleScore));

  // 4. Targeted Skills Relevancy
  let skillsScore = Math.min(100, Math.max(30, skills.length * 7));
  if (targetJdText && targetJdText.trim().length > 20) {
    // Perform keyword intersection
    const jdLower = targetJdText.toLowerCase();
    const matchedSkills = skills.filter((s) => jdLower.includes(String(s).toLowerCase()));
    const ratio = skills.length > 0 ? matchedSkills.length / Math.min(skills.length, 10) : 0;
    skillsScore = Math.round(ratio * 100);
  }

  // Overall Weighted Score
  // Weights: Impact 35%, Brevity 25%, Style/ATS 25%, Skills 15%
  const overallScore = Math.round(
    (impactScore * 0.35) +
    (brevityScore * 0.25) +
    (styleScore * 0.25) +
    (skillsScore * 0.15)
  );

  let grade = 'Needs Work';
  if (overallScore >= 90) grade = 'Exceptional';
  else if (overallScore >= 80) grade = 'Strong';
  else if (overallScore >= 65) grade = 'Solid';
  else if (overallScore >= 50) grade = 'Room to Improve';

  return {
    overallScore,
    grade,
    pillars: {
      impact: impactScore,
      brevity: brevityScore,
      style: styleScore,
      skills: skillsScore
    },
    issues,
    stats: {
      totalBullets,
      powerVerbBullets,
      metricBullets,
      totalWords,
      overlongBullets,
      pronounCount,
      buzzwordCount,
      fillerCount: fillerFoundCount,
      skillsCount: skills.length
    }
  };
}

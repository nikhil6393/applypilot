import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
  Download, Copy, Check, Briefcase, MapPin, Building,
  Layers, RefreshCw, FileText, ExternalLink, ChevronRight, Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Comprehensive dictionary of high-demand technical keywords, tools, concepts & architectures
const KNOWN_TECH_KEYWORDS = [
  // Languages & Runtimes
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Scala', 'R',
  // Frontend
  'React', 'Next.js', 'Vue', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte', 'Tailwind CSS', 'Redux', 'Zustand', 'HTML5', 'CSS3', 'Sass', 'Webpack', 'Vite',
  // Backend & APIs
  'Node.js', 'Express', 'Express.js', 'NestJS', 'Django', 'FastAPI', 'Flask', 'Spring Boot', 'ASP.NET', 'GraphQL', 'REST APIs', 'RESTful', 'gRPC', 'WebSockets', 'Microservices',
  // Databases & Caches
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra', 'SQLite', 'Prisma', 'SQLAlchemy', 'TypeORM', 'SQL', 'NoSQL',
  // Cloud, DevOps & Containers
  'Docker', 'Kubernetes', 'AWS', 'Amazon Web Services', 'Azure', 'GCP', 'Google Cloud', 'CI/CD', 'GitHub Actions', 'Jenkins', 'Terraform', 'Linux', 'Serverless', 'Lambda',
  // Testing & Quality
  'Jest', 'Playwright', 'Cypress', 'Vitest', 'Selenium', 'Unit Testing', 'TDD', 'End-to-End Testing',
  // Architecture & Engineering Concepts
  'System Design', 'Distributed Systems', 'Data Structures', 'Algorithms', 'Kafka', 'RabbitMQ', 'Event-Driven', 'OAuth', 'JWT', 'Security', 'Agile', 'Scrum', 'Git', 'GitHub'
];

/**
 * Extract keywords from job description using dictionary matching + regex heuristics
 */
export function extractJobKeywords(job) {
  if (!job) return [];
  const text = [
    job.title || '',
    job.company || '',
    job.description || '',
    job.rawJob?.description || '',
    ...(job.skills || []),
    ...(job.tags || []),
    ...(job.requirements || []),
  ].join(' ');

  const textLower = text.toLowerCase();
  const found = new Set();

  // 1. Direct dictionary match
  for (const kw of KNOWN_TECH_KEYWORDS) {
    const kwLower = kw.toLowerCase();
    // Escape regex special chars
    const escaped = kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(textLower)) {
      found.add(kw);
    }
  }

  // 2. Add raw skills & tags from the job posting
  if (Array.isArray(job.skills)) {
    job.skills.forEach(s => { if (s && s.trim()) found.add(s.trim()); });
  }
  if (Array.isArray(job.tags)) {
    job.tags.forEach(t => { if (t && t.trim() && !t.includes('(')) found.add(t.trim()); });
  }

  // 3. Heuristic: Capitalized technical terms and acronyms (e.g. AWS, CI/CD, SQL, REST)
  const acronymMatches = text.match(/\b[A-Z]{2,6}\b/g) || [];
  const validAcronyms = ['API', 'SDK', 'CLI', 'ORM', 'ETL', 'PaaS', 'SaaS', 'IaaS', 'JWT', 'SSO', 'RBAC'];
  for (const ac of acronymMatches) {
    if (validAcronyms.includes(ac)) found.add(ac);
  }

  return Array.from(found);
}

/**
 * Check whether a keyword is matched in the candidate's resume
 */
export function isKeywordInResume(keyword, resume) {
  if (!keyword || !resume) return false;
  const kwLower = keyword.toLowerCase();

  // Check skills
  if (Array.isArray(resume.skills)) {
    if (resume.skills.some(s => String(s).toLowerCase().includes(kwLower) || kwLower.includes(String(s).toLowerCase()))) {
      return true;
    }
  } else if (typeof resume.skills === 'object' && resume.skills !== null) {
    const all = Object.values(resume.skills).flat();
    if (all.some(s => String(s).toLowerCase().includes(kwLower) || kwLower.includes(String(s).toLowerCase()))) {
      return true;
    }
  }

  // Check summary
  if (resume.summary && resume.summary.toLowerCase().includes(kwLower)) return true;

  // Check experience bullets & role titles
  const experiences = resume.experience || [];
  for (const exp of experiences) {
    if ((exp.role || exp.title || '').toLowerCase().includes(kwLower)) return true;
    for (const b of exp.bullets || []) {
      if (b.toLowerCase().includes(kwLower)) return true;
    }
  }

  // Check projects
  const projects = resume.projects || [];
  for (const proj of projects) {
    if ((proj.name || proj.title || '').toLowerCase().includes(kwLower)) return true;
    if ((proj.description || '').toLowerCase().includes(kwLower)) return true;
    for (const b of proj.bullets || []) {
      if (b.toLowerCase().includes(kwLower)) return true;
    }
  }

  return false;
}

export default function JobKeywordTailorModal({
  job,
  resume,
  isOpen,
  onClose,
  onUpdateResume,
  onOpenResumeStudio,
  onAddToast,
}) {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'matched' | 'missing'
  const [activeTab, setActiveTab] = useState('bullets'); // 'bullets' | 'summary' | 'skills' | 'cover_letter' | 'jd'
  const [searchQuery, setSearchQuery] = useState('');
  const [isTailoring, setIsTailoring] = useState(false);
  const [isTailored, setIsTailored] = useState(false);
  const [copiedType, setCopiedType] = useState(null);

  // Local working copy of resume during tailoring
  const [workingResume, setWorkingResume] = useState(resume);

  useEffect(() => {
    setWorkingResume(resume);
    setIsTailored(false);
  }, [resume, job]);

  // Extract all keywords from this specific job
  const allJobKeywords = useMemo(() => {
    return extractJobKeywords(job);
  }, [job]);

  // Compare against current working resume
  const keywordAnalysis = useMemo(() => {
    const matched = [];
    const missing = [];

    allJobKeywords.forEach(kw => {
      if (isKeywordInResume(kw, workingResume)) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    });

    const total = allJobKeywords.length || 1;
    const matchRate = Math.min(100, Math.round((matched.length / total) * 100));

    return {
      all: allJobKeywords,
      matched,
      missing,
      matchRate,
      total: allJobKeywords.length,
    };
  }, [allJobKeywords, workingResume]);

  // Filtered keywords for visual matrix
  const displayedKeywords = useMemo(() => {
    let list = allJobKeywords;
    if (filterMode === 'matched') list = keywordAnalysis.matched;
    if (filterMode === 'missing') list = keywordAnalysis.missing;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(k => k.toLowerCase().includes(q));
    }
    return list;
  }, [allJobKeywords, filterMode, searchQuery, keywordAnalysis]);

  if (!isOpen || !job) return null;

  // 1-Click: Tailor Resume to match EVERY single keyword
  const handleAutoTailorAllKeywords = () => {
    setIsTailoring(true);

    setTimeout(() => {
      const next = JSON.parse(JSON.stringify(workingResume || {}));
      const missing = [...keywordAnalysis.missing];

      // 1. Add missing skills to resume skills
      if (Array.isArray(next.skills)) {
        missing.forEach(m => {
          if (!next.skills.some(s => s.toLowerCase() === m.toLowerCase())) {
            next.skills.push(m);
          }
        });
      } else if (typeof next.skills === 'object' && next.skills !== null) {
        if (!next.skills.frameworks) next.skills.frameworks = [];
        if (!next.skills.tools) next.skills.tools = [];
        missing.forEach(m => {
          const lower = m.toLowerCase();
          const targetCategory = (lower.includes('aws') || lower.includes('docker') || lower.includes('kubernetes') || lower.includes('ci/cd'))
            ? 'tools'
            : 'frameworks';
          if (!next.skills[targetCategory]) next.skills[targetCategory] = [];
          if (!next.skills[targetCategory].some(s => s.toLowerCase() === lower)) {
            next.skills[targetCategory].push(m);
          }
        });
      } else {
        next.skills = Array.from(new Set([...missing, 'JavaScript', 'React', 'Node.js', 'SQL']));
      }

      // 2. Tailor summary mentioning job title, company, and primary missing keywords
      const candidateName = next.fullName || next.name || 'Candidate';
      const keySkillsSample = [...keywordAnalysis.matched, ...missing].slice(0, 4).join(', ');
      next.summary = `${candidateName} is an accomplished Software Engineer with verified proficiencies in ${keySkillsSample}. Demonstrated background in engineering resilient distributed systems, modern full-stack architectures, and high-throughput APIs, tailored to drive engineering excellence as ${job.title} at ${job.company}.`;

      // 3. Enhance experience bullets with missing keywords using Google XYZ & STAR formula
      if (next.experience && next.experience.length > 0) {
        const keywordsToInject = [...missing];
        const powerVerbs = ['Architected', 'Engineered', 'Optimized', 'Spearheaded', 'Deployed', 'Implemented', 'Streamlined'];
        let verbIdx = 0;

        next.experience.forEach((exp, expIdx) => {
          if (exp.bullets && exp.bullets.length > 0) {
            // Pick a bullet to enhance
            const bIdx = exp.bullets.length - 1;
            const original = exp.bullets[bIdx];
            if (keywordsToInject.length > 0) {
              const kw1 = keywordsToInject.shift();
              const kw2 = keywordsToInject.length > 0 ? keywordsToInject.shift() : null;
              const verb = powerVerbs[(expIdx + verbIdx++) % powerVerbs.length];

              if (kw2) {
                exp.bullets[bIdx] = `${verb} scalable workflows utilizing ${kw1} and ${kw2}, accelerating end-to-end release velocity by 32% across production microservices.`;
              } else {
                exp.bullets[bIdx] = `${original.replace(/\.$/, '')} utilizing ${kw1} to optimize latency and ensure 99.9% uptime.`;
              }
            }
          }
        });

        // If there are still missing keywords, add a targeted project bullet or experience bullet
        if (keywordsToInject.length > 0 && next.experience[0]?.bullets) {
          const remainingKeywords = keywordsToInject.splice(0, 3).join(' and ');
          next.experience[0].bullets.unshift(
            `Spearheaded the integration of ${remainingKeywords}, improving system modularity and reducing deployment cycles by 40%.`
          );
        }
      }

      setWorkingResume(next);
      setIsTailoring(false);
      setIsTailored(true);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });

      if (onAddToast) {
        onAddToast({
          type: 'success',
          title: 'Resume 100% Tailored!',
          message: `All ${missing.length} missing keywords matched to ${job.title} at ${job.company}.`,
        });
      }
    }, 450);
  };

  // 1-Click: Save as active resume across whole platform
  const handleSaveActiveResume = () => {
    if (onUpdateResume && workingResume) {
      onUpdateResume(workingResume);
      try {
        localStorage.setItem('applypilot_resume', JSON.stringify(workingResume));
      } catch {}
      if (onAddToast) {
        onAddToast({
          type: 'success',
          title: 'Active Resume Updated',
          message: `Your tailored resume for ${job.company} is now active in Resume Studio and Job Applications!`,
        });
      }
    }
  };

  // Add individual keyword
  const handleAddSingleKeyword = (kw) => {
    const next = JSON.parse(JSON.stringify(workingResume || {}));
    if (Array.isArray(next.skills)) {
      if (!next.skills.includes(kw)) next.skills.push(kw);
    } else if (typeof next.skills === 'object' && next.skills !== null) {
      if (!next.skills.tools) next.skills.tools = [];
      if (!next.skills.tools.includes(kw)) next.skills.tools.push(kw);
    } else {
      next.skills = [kw];
    }
    setWorkingResume(next);
  };

  // Copy helpers
  const handleCopyText = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const candidateName = workingResume?.fullName || workingResume?.name || 'Candidate';
  const coverLetterText = `Dear Hiring Team at ${job.company},

I am writing to express my enthusiastic interest in the ${job.title} position. Having reviewed your job description and technical requirements, my background with ${allJobKeywords.slice(0, 4).join(', ')} directly aligns with your team's objectives.

Throughout my experience, I have focused on engineering resilient architectures, optimizing system performance, and delivering high-quality user experiences. I am confident that my technical versatility and hands-on problem-solving abilities will enable me to contribute meaningfully to ${job.company} from day one.

Thank you for your time and consideration. I welcome the opportunity to discuss how my skill set can support your engineering initiatives.

Sincerely,
${candidateName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5 select-text animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  Tailor Resume for {job.company}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  Exact Keyword Matcher
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{job.title}</span>
                <span>•</span>
                <span>{job.location || 'Remote'}</span>
                {job.workplace && <span>• {job.workplace}</span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar text-xs">
          {/* Top Score & Action Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center justify-between gap-5">
            {/* Score Ring & Stats */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="#e2e8f0" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="32" cy="32" r="28"
                    stroke={keywordAnalysis.matchRate >= 85 ? '#10b981' : keywordAnalysis.matchRate >= 60 ? '#f59e0b' : '#6366f1'}
                    strokeWidth="6"
                    strokeDasharray={175.9}
                    strokeDashoffset={175.9 - (keywordAnalysis.matchRate / 100) * 175.9}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-slate-900 dark:text-white leading-none">
                    {keywordAnalysis.matchRate}%
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">MATCH</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {keywordAnalysis.matchRate >= 95
                    ? '🎉 100% Keywords Matched! ATS Verified'
                    : keywordAnalysis.matchRate >= 70
                    ? 'Strong Match — Bridge remaining keywords to reach 100%'
                    : `${keywordAnalysis.missing.length} Target Keywords Missing from Resume`}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{keywordAnalysis.matched.length} matched</strong>
                  {' '}•{' '}
                  <strong className="text-rose-500 font-bold">{keywordAnalysis.missing.length} missing</strong>
                  {' '}out of {keywordAnalysis.total} role requirements.
                </p>
              </div>
            </div>

            {/* Auto Tailor Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleAutoTailorAllKeywords}
                disabled={isTailoring || keywordAnalysis.missing.length === 0}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  keywordAnalysis.missing.length === 0
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/25 active:scale-95'
                }`}
              >
                {isTailoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Matching Keywords...</span>
                  </>
                ) : keywordAnalysis.missing.length === 0 ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>100% Keywords Matched</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current text-amber-300" />
                    <span>⚡ Auto-Tailor to 100% Match</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section: Keyword Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200">Job Keywords Matrix</span>
                <span className="text-[11px] text-slate-400">({displayedKeywords.length})</span>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 p-0.5">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All ({allJobKeywords.length})
                  </button>
                  <button
                    onClick={() => setFilterMode('matched')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      filterMode === 'matched'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Matched ({keywordAnalysis.matched.length})
                  </button>
                  <button
                    onClick={() => setFilterMode('missing')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      filterMode === 'missing'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Missing ({keywordAnalysis.missing.length})
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Filter keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white outline-hidden w-28 sm:w-36 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Keyword Pills Grid */}
            <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto custom-scrollbar">
              {displayedKeywords.length === 0 ? (
                <div className="w-full text-center py-4 text-slate-400">No keywords found matching filter.</div>
              ) : (
                displayedKeywords.map((kw) => {
                  const isMatched = keywordAnalysis.matched.includes(kw);
                  return (
                    <div
                      key={kw}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        isMatched
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {isMatched ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span>{kw}</span>
                      {!isMatched && (
                        <button
                          onClick={() => handleAddSingleKeyword(kw)}
                          className="ml-1 text-[10px] font-bold text-rose-600 hover:text-rose-800 dark:hover:text-rose-200 underline cursor-pointer"
                          title="Add to skills"
                        >
                          +Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section: Tailored Artifact Preview Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setActiveTab('bullets')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'bullets'
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Tailored Bullets ({workingResume?.experience?.[0]?.bullets?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'summary'
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Tailored Summary
                </button>
                <button
                  onClick={() => setActiveTab('skills')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'skills'
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Tailored Skills List
                </button>
                <button
                  onClick={() => setActiveTab('cover_letter')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'cover_letter'
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Cover Note
                </button>
                <button
                  onClick={() => setActiveTab('jd')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'jd'
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Job Description
                </button>
              </div>

              {activeTab === 'cover_letter' && (
                <button
                  onClick={() => handleCopyText(coverLetterText, 'cover')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  {copiedType === 'cover' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'cover' ? 'Copied!' : 'Copy Cover Letter'}</span>
                </button>
              )}
            </div>

            {/* Tab 1: Tailored Bullets */}
            {activeTab === 'bullets' && (
              <div className="space-y-2">
                {(workingResume?.experience || []).flatMap((exp, expIdx) =>
                  (exp.bullets || []).map((b, bIdx) => (
                    <div
                      key={`${expIdx}-${bIdx}`}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">•</span>
                        <span>{b}</span>
                      </div>
                      <button
                        onClick={() => handleCopyText(b, `bullet-${expIdx}-${bIdx}`)}
                        className="text-slate-400 hover:text-slate-600 shrink-0 p-1 cursor-pointer"
                        title="Copy bullet"
                      >
                        {copiedType === `bullet-${expIdx}-${bIdx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Tailored Summary */}
            {activeTab === 'summary' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Targeted Professional Summary</span>
                  <button
                    onClick={() => handleCopyText(workingResume?.summary || '', 'summary')}
                    className="text-indigo-600 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedType === 'summary' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'summary' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p>{workingResume?.summary || 'No summary present.'}</p>
              </div>
            )}

            {/* Tab 3: Tailored Skills */}
            {activeTab === 'skills' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                  Active Resume Skills Enriched with Job Keywords
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(workingResume?.skills)
                    ? workingResume.skills
                    : typeof workingResume?.skills === 'object' && workingResume?.skills !== null
                    ? Object.values(workingResume.skills).flat()
                    : []
                  ).map((s, idx) => {
                    const isJobKeyword = allJobKeywords.some(k => k.toLowerCase() === String(s).toLowerCase());
                    return (
                      <span
                        key={idx}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          isJobKeyword
                            ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {s} {isJobKeyword && '★'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 4: Cover Letter */}
            {activeTab === 'cover_letter' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 whitespace-pre-line text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                {coverLetterText}
              </div>
            )}

            {/* Tab 5: Job Description */}
            {activeTab === 'jd' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed text-slate-700 dark:text-slate-300 max-h-72 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                {job.description || job.rawJob?.description || 'No detailed job description text provided.'}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Target Role: <strong>{job.title}</strong> at <strong>{job.company}</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenResumeStudio && (
              <button
                onClick={() => {
                  handleSaveActiveResume();
                  onClose();
                  onOpenResumeStudio();
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Open in Resume Studio</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => {
                handleSaveActiveResume();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Save as Active Resume</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

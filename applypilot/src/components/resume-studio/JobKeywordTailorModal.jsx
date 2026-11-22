import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
  Download, Copy, Check, Briefcase, MapPin, Building,
  Layers, RefreshCw, FileText, ExternalLink, ChevronRight, Zap
} from 'lucide-react';

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
  const [copiedType, setCopiedType] = useState(null);

  // Local working copy of resume during tailoring
  const [workingResume, setWorkingResume] = useState(resume);

  useEffect(() => {
    setWorkingResume(resume);
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

    const total = allJobKeywords.length;
    const matchRate = total ? Math.round((matched.length / total) * 100) : null;

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
          message: 'Your current resume is now active in Resume Studio.',
        });
      }
    }
  };

  // Add individual keyword
  const handleAddSingleKeyword = (kw) => {
    if (onAddToast) onAddToast({ type: 'info', title: 'Verify this skill first', message: `Add “${kw}” only if it reflects your real experience.` });
  };

  // Copy helpers
  const handleCopyText = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const candidateName = workingResume?.fullName || workingResume?.name || 'Candidate';
  const coverLetterText = `Dear Hiring Team at ${job.company},

I am applying for the ${job.title} position. Please add a short example of relevant work you personally completed, including the context, your contribution, and any result you can verify.

Job description keywords to review: ${allJobKeywords.join(', ') || 'No keywords detected'}.
Only include keywords that accurately describe your skills and experience.

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
                <span>{job.location || 'Location not provided'}</span>
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
                    strokeDashoffset={175.9 - ((keywordAnalysis.matchRate || 0) / 100) * 175.9}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-slate-900 dark:text-white leading-none">
                    {keywordAnalysis.matchRate === null ? '?' : `${keywordAnalysis.matchRate}%`}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">MATCH</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {keywordAnalysis.total === 0 ? 'No job keywords detected' : `${keywordAnalysis.missing.length} job keywords were not found in the resume`}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{keywordAnalysis.matched.length} matched</strong>
                  {' '}•{' '}
                  <strong className="text-rose-500 font-bold">{keywordAnalysis.missing.length} missing</strong>
                  {' '}out of {keywordAnalysis.total} role requirements.
                </p>
              </div>
            </div>

            <p className="max-w-sm text-xs text-slate-500">Missing keywords are prompts to review. Add them only if they reflect your experience.</p>
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
                          title="Verify this skill before adding it"
                        >
                          Verify
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
                  Experience Bullets ({workingResume?.experience?.[0]?.bullets?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'summary'
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Current Summary
                </button>
                <button
                  onClick={() => setActiveTab('skills')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'skills'
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Current Skills
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

            {/* Tab 2: Current Summary */}
            {activeTab === 'summary' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Current Professional Summary</span>
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
                  Skills currently listed on your resume
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

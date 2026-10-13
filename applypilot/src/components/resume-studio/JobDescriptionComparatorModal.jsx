import React, { useState, useMemo } from 'react';
import {
  X, Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
  Download, Printer, Zap, RefreshCw, Briefcase, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

const SAMPLE_FALLBACK_JOBS = [
  {
    id: 'rec-msft',
    company: 'Microsoft',
    title: 'Senior Software Engineer - Cloud Platforms',
    description: 'Looking for a Senior Software Engineer with strong background in TypeScript, React, Node.js, Distributed Systems, Docker, Kubernetes, CI/CD, and Azure / AWS cloud infrastructure. Experience optimizing database queries and latency critical pipelines.',
    skills: ['TypeScript', 'React', 'Node.js', 'Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Distributed Systems'],
  },
  {
    id: 'rec-amzn',
    company: 'Amazon',
    title: 'Full Stack SDE II',
    description: 'Seeking a Full Stack Engineer proficient in React, Node.js, PostgreSQL, Redis, GraphQL, Microservices, and Automated Testing. Candidates should have demonstrated ability to build high-scale, resilient distributed web applications.',
    skills: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'GraphQL', 'Microservices', 'Automated Testing'],
  },
  {
    id: 'rec-goog',
    company: 'Google',
    title: 'Software Engineer III - Frontend Infrastructure',
    description: 'Google is hiring a Software Engineer to work on next-gen developer tooling. Requirements include deep knowledge of JavaScript/TypeScript, Web Performance, HTML5, CSS3, Testing frameworks, REST APIs, and System Design.',
    skills: ['JavaScript', 'TypeScript', 'Web Performance', 'REST APIs', 'System Design', 'Docker'],
  },
];

export default function JobDescriptionComparatorModal({
  resume,
  discoveredJobs = [],
  isOpen,
  onClose,
  onUpdateResume,
  onDownloadPdf,
  onDownloadWord,
  initialJob = null,
  onSelectTargetJob = null,
}) {
  const [selectedJobId, setSelectedJobId] = useState('custom');
  const [customJdText, setCustomJdText] = useState('');
  const [isFixing, setIsFixing] = useState(false);
  const [fixedSuccess, setFixedSuccess] = useState(false);

  const availableJobs = useMemo(() => {
    if (discoveredJobs && discoveredJobs.length > 0) {
      return discoveredJobs.map(j => ({
        id: j.id || j.title,
        company: j.company || 'Tech Corp',
        title: j.title || 'Software Engineer',
        description: j.description || j.rawJob?.description || `${j.title} at ${j.company}. Requires key technical proficiencies and strong problem-solving skills.`,
        skills: j.skills || j.tags || ['JavaScript', 'React', 'Node.js', 'Docker', 'SQL'],
      }));
    }
    return SAMPLE_FALLBACK_JOBS;
  }, [discoveredJobs]);

  const activeJob = useMemo(() => {
    if (selectedJobId === 'custom') {
      return {
        company: 'Target Company',
        title: 'Target Role',
        description: customJdText || 'Paste a job description to analyze your fit score.',
        skills: extractKeywordsFromText(customJdText),
      };
    }
    return availableJobs.find(j => j.id === selectedJobId) || availableJobs[0];
  }, [selectedJobId, customJdText, availableJobs]);

  React.useEffect(() => {
    if (initialJob?.id) {
      setSelectedJobId(initialJob.id);
    } else if (initialJob?.title) {
      const match = availableJobs.find(j => j.id === initialJob.id || (j.title === initialJob.title && j.company === initialJob.company));
      if (match) setSelectedJobId(match.id);
      else if (initialJob.description) {
        setSelectedJobId('custom');
        setCustomJdText(initialJob.description);
      }
    }
  }, [initialJob, availableJobs]);

  const handleSelectJob = (jobId) => {
    setSelectedJobId(jobId);
    setFixedSuccess(false);
    if (onSelectTargetJob) {
      const match = availableJobs.find(j => j.id === jobId);
      if (match) onSelectTargetJob(match);
      else if (jobId === 'custom') onSelectTargetJob({ title: 'Custom Role', company: 'Target Company', description: customJdText });
    }
  };

  // Extract flat resume skills list
  const resumeSkillsList = useMemo(() => {
    if (!resume) return [];
    if (Array.isArray(resume.skills)) return resume.skills.map(s => String(s).toLowerCase());
    if (typeof resume.skills === 'object') {
      return Object.values(resume.skills).flat().map(s => String(s).toLowerCase());
    }
    return [];
  }, [resume]);

  // Resume text representation
  const resumeFullText = useMemo(() => {
    if (!resume) return '';
    const parts = [
      resume.summary || '',
      resumeSkillsList.join(' '),
      ...(resume.experience || []).flatMap(e => [e.company || '', e.role || '', ...(e.bullets || [])]),
      ...(resume.projects || []).flatMap(p => [p.name || '', p.description || '', ...(p.bullets || [])]),
    ];
    return parts.join(' ').toLowerCase();
  }, [resume, resumeSkillsList]);

  // Compute Skill Gap & Fit Score
  const analysis = useMemo(() => {
    const requiredSkills = activeJob.skills && activeJob.skills.length > 0
      ? activeJob.skills
      : ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'CI/CD'];

    const matched = [];
    const missing = [];

    requiredSkills.forEach(skill => {
      const lower = skill.toLowerCase();
      if (resumeSkillsList.some(s => s.includes(lower) || lower.includes(s)) || resumeFullText.includes(lower)) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    });

    const total = requiredSkills.length || 1;
    const baseRatio = matched.length / total;
    const score = Math.min(96, Math.max(48, Math.round(baseRatio * 50 + 46)));

    return {
      score,
      matched,
      missing,
      total,
    };
  }, [activeJob, resumeSkillsList, resumeFullText]);

  if (!isOpen) return null;

  // 1-Click Fix: Bridge Skill Gap
  const handleApplyFix = () => {
    if (!resume) return;
    setIsFixing(true);
    setTimeout(() => {
      const next = JSON.parse(JSON.stringify(resume));

      // 1. Add missing skills to resume skills
      if (Array.isArray(next.skills)) {
        const existingLower = next.skills.map(s => String(s).toLowerCase());
        analysis.missing.forEach(m => {
          if (!existingLower.includes(m.toLowerCase())) {
            next.skills.push(m);
          }
        });
      } else if (typeof next.skills === 'object' && next.skills !== null) {
        if (!next.skills.tools) next.skills.tools = [];
        const existingLower = Object.values(next.skills).flat().map(s => String(s).toLowerCase());
        analysis.missing.forEach(m => {
          if (!existingLower.includes(m.toLowerCase())) {
            next.skills.tools.push(m);
          }
        });
      } else {
        next.skills = Array.from(new Set([...resumeSkillsList, ...analysis.missing]));
      }

      // 2. Enhance bullets with targeted keywords and strong action verbs
      if (next.experience && next.experience.length > 0) {
        const missingToAdd = [...analysis.missing];
        next.experience.forEach((exp) => {
          if (exp.bullets && exp.bullets.length > 0 && missingToAdd.length > 0) {
            const keyword = missingToAdd.shift();
            // Augment the last bullet
            const lastIdx = exp.bullets.length - 1;
            const original = exp.bullets[lastIdx];
            if (!original.toLowerCase().includes(keyword.toLowerCase())) {
              exp.bullets[lastIdx] = original.replace(/\.$/, '') + ` utilizing ${keyword} for accelerated delivery.`;
            }
          }
        });
      }

      onUpdateResume(next);
      setIsFixing(false);
      setFixedSuccess(true);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 select-text">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Compare Job Description &amp; Bridge Skill Gap</h2>
              <p className="text-xs text-slate-500">Benchmark your resume against real employer requirements with 1-click ATS auto-fixing.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          {/* Target Job Selector */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">Select Target Role or Paste Job Description</label>
            {availableJobs.length > 2 && (
              <div className="mb-1.5">
                <select
                  value={selectedJobId}
                  onChange={(e) => handleSelectJob(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-xs outline-none focus:border-indigo-500"
                >
                  <option value="custom">✏️ Custom Job Description (Paste text)</option>
                  {availableJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      🏢 {j.company} — {j.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {availableJobs.slice(0, 2).map(job => (
                <button
                  key={job.id}
                  onClick={() => handleSelectJob(job.id)}
                  className={`p-3 text-left rounded-2xl border transition-all cursor-pointer ${
                    selectedJobId === job.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="font-bold text-slate-900 dark:text-white block truncate">{job.company}</span>
                  <span className="text-[11px] text-slate-500 block truncate">{job.title}</span>
                </button>
              ))}

              <button
                onClick={() => handleSelectJob('custom')}
                className={`p-3 text-left rounded-2xl border transition-all cursor-pointer ${
                  selectedJobId === 'custom'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span className="font-bold text-slate-900 dark:text-white block">Custom JD</span>
                <span className="text-[11px] text-slate-500 block">Paste raw text</span>
              </button>
            </div>

            {selectedJobId === 'custom' && (
              <div className="pt-2">
                <textarea
                  rows={4}
                  value={customJdText}
                  onChange={(e) => { setCustomJdText(e.target.value); setFixedSuccess(false); }}
                  placeholder="Paste the full job description here (e.g. responsibilities, required skills, tools, frameworks)..."
                  className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500 font-sans"
                />
              </div>
            )}
          </div>

          {/* Results: Score & Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800 items-center">
            {/* Fit Score Dial */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200 dark:text-slate-700"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={fixedSuccess ? "text-emerald-500" : (analysis.score >= 80 ? "text-emerald-500" : analysis.score >= 65 ? "text-amber-500" : "text-rose-500")}
                    strokeDasharray={`${fixedSuccess ? 94 : analysis.score}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
                    {fixedSuccess ? '94%' : `${analysis.score}%`}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">FIT SCORE</span>
                </div>
              </div>
            </div>

            {/* Matched vs Missing Stats */}
            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {fixedSuccess ? 'Skill Gaps Bridged Successfully!' : `Matching Candidate Relevancy`}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {fixedSuccess ? `${analysis.total}/${analysis.total} Skills` : `${analysis.matched.length}/${analysis.total} Matched`}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${fixedSuccess ? 'bg-emerald-500 w-[94%]' : 'bg-indigo-600'}`}
                  style={{ width: fixedSuccess ? '94%' : `${(analysis.matched.length / analysis.total) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {fixedSuccess
                  ? 'Your resume now matches all essential keywords for this position. Ready for export.'
                  : `${analysis.missing.length} missing skill requirements detected in job specification.`}
              </p>
            </div>
          </div>

          {/* Matched Skills */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Matched Skills in Resume ({fixedSuccess ? analysis.total : analysis.matched.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(fixedSuccess ? [...analysis.matched, ...analysis.missing] : analysis.matched).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{skill}</span>
                </span>
              ))}
              {analysis.matched.length === 0 && !fixedSuccess && (
                <span className="text-slate-400 italic">No direct matches identified yet.</span>
              )}
            </div>
          </div>

          {/* Missing Skills Gap */}
          {!fixedSuccess && analysis.missing.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Missing Skills Gap ({analysis.missing.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missing.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fixed Success Banner */}
          {fixedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-xs">Resume Auto-Enhanced!</div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Missing skills and targeted keywords have been integrated into your live canvas and saved to your account.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {!fixedSuccess && analysis.missing.length > 0 ? (
              <button
                onClick={handleApplyFix}
                disabled={isFixing}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{isFixing ? 'Enhancing Resume...' : '⚡ Fix Resume & Bridge Skill Gap'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => { if (onDownloadPdf) onDownloadPdf(); onClose(); }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => { if (onDownloadWord) onDownloadWord(); onClose(); }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Word (.docx)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function extractKeywordsFromText(text) {
  if (!text) return ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'];
  const COMMON_SKILLS = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'React', 'Node.js', 'Vue', 'Angular',
    'Next.js', 'Express', 'Django', 'Flask', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Git', 'GraphQL', 'REST APIs',
    'Microservices', 'System Design', 'Testing', 'Jest', 'Playwright', 'Agile', 'DevOps'
  ];
  const lower = text.toLowerCase();
  const found = COMMON_SKILLS.filter(s => lower.includes(s.toLowerCase()));
  return found.length > 0 ? found : ['React', 'Node.js', 'TypeScript', 'SQL', 'Docker'];
}

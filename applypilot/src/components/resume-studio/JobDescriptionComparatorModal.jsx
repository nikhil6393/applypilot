import React, { useState, useMemo } from 'react';
import {
  X, Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
  Download, Printer, Zap, RefreshCw, Briefcase, FileText
} from 'lucide-react';


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

  const availableJobs = useMemo(() => {
    if (discoveredJobs && discoveredJobs.length > 0) {
      return discoveredJobs.map(j => ({
        id: j.id || j.title,
        company: j.company || 'Company not listed',
        title: j.title || 'Untitled role',
        description: j.description || j.rawJob?.description || '',
        skills: j.skills || j.tags || extractKeywordsFromText(j.description || j.rawJob?.description || ''),
      }));
    }
    return [];
  }, [discoveredJobs]);

  const activeJob = useMemo(() => {
    if (selectedJobId === 'custom') {
      return {
        company: 'Custom job description',
        title: 'Custom role',
        description: customJdText,
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
    const requiredSkills = activeJob.skills || [];

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

    const total = requiredSkills.length;
    const score = total ? Math.round((matched.length / total) * 100) : null;

    return {
      score,
      matched,
      missing,
      total,
    };
  }, [activeJob, resumeSkillsList, resumeFullText]);

  if (!isOpen) return null;

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
                    className={analysis.score >= 80 ? "text-emerald-500" : analysis.score >= 65 ? "text-amber-500" : "text-rose-500"}
                    strokeDasharray={`${analysis.score ?? 0}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
                    {analysis.score === null ? '—' : `${analysis.score}%`}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">FIT SCORE</span>
                </div>
              </div>
            </div>

            {/* Matched vs Missing Stats */}
            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Candidate skill matches
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {analysis.matched.length}/{analysis.total} Matched
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${analysis.total ? (analysis.matched.length / analysis.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {analysis.total ? `${analysis.missing.length} listed skills were not found in the resume text.` : 'Add a job description with recognizable skills to compare.'}
              </p>
            </div>
          </div>

          {/* Matched Skills */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Matched Skills in Resume ({analysis.matched.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.matched.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{skill}</span>
                </span>
              ))}
              {analysis.matched.length === 0 && (
                <span className="text-slate-400 italic">No direct matches identified yet.</span>
              )}
            </div>
          </div>

          {/* Missing Skills Gap */}
          {analysis.missing.length > 0 && (
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
                  <span>Download Word (.doc)</span>
                </button>
            </>
          </div>
        </div>
      </div>
    </div>
  );
}

function extractKeywordsFromText(text) {
  if (!text) return [];
  const COMMON_SKILLS = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'React', 'Node.js', 'Vue', 'Angular',
    'Next.js', 'Express', 'Django', 'Flask', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Git', 'GraphQL', 'REST APIs',
    'Microservices', 'System Design', 'Testing', 'Jest', 'Playwright', 'Agile', 'DevOps'
  ];
  const lower = text.toLowerCase();
  const found = COMMON_SKILLS.filter(s => lower.includes(s.toLowerCase()));
  return found;
}

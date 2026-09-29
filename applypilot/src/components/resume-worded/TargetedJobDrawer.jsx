import React, { useState, useMemo } from 'react';
import { Target, X, Check, Plus, AlertCircle, Sparkles, Zap, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * TargetedJobDrawer.jsx
 * Targeted Resume Matcher modeled after Resume Worded's Targeted Resume feature.
 * Analyzes keyword expression gaps and missing hard skills against target Job Description.
 */
export default function TargetedJobDrawer({
  isOpen,
  onClose,
  resume,
  onUpdateSkills
}) {
  const [jdText, setJdText] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Extract skills and calculate match
  const resumeSkills = useMemo(() => {
    return (Array.isArray(resume?.skills) ? resume.skills : []).map((s) => String(s).toLowerCase());
  }, [resume]);

  const analysis = useMemo(() => {
    if (!jdText || jdText.trim().length < 30) {
      return null;
    }

    const COMMON_TECH = [
      'python', 'javascript', 'typescript', 'react', 'next.js', 'vue', 'angular', 'node.js',
      'express', 'fastapi', 'django', 'flask', 'java', 'spring', 'go', 'golang', 'rust',
      'c++', 'c#', '.net', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
      'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'graphql', 'rest api', 'ci/cd',
      'git', 'github', 'agile', 'scrum', 'jira', 'microservices', 'kafka', 'rabbitmq',
      'spark', 'airflow', 'pandas', 'numpy', 'scikit-learn', 'pytorch', 'tensorflow',
      'llm', 'langchain', 'openai', 'sql', 'nosql', 'linux', 'bash', 'testing', 'jest',
      'cypress', 'playwright', 'vitest', 'figma', 'system design'
    ];

    const jdLower = jdText.toLowerCase();
    const matched = [];
    const missing = [];

    COMMON_TECH.forEach((tech) => {
      // Check if mentioned in JD
      const regex = new RegExp(`\\b${tech.replace('.', '\\.')}\\b`, 'i');
      if (regex.test(jdLower)) {
        if (resumeSkills.some((s) => s.includes(tech) || tech.includes(s))) {
          matched.push(tech);
        } else {
          missing.push(tech);
        }
      }
    });

    const totalIdentified = matched.length + missing.length;
    const matchPct = totalIdentified > 0 ? Math.round((matched.length / totalIdentified) * 100) : 50;

    return {
      matchPct,
      matched,
      missing
    };
  }, [jdText, resumeSkills]);

  if (!isOpen) return null;

  const handleAddSkill = (skill) => {
    const current = Array.isArray(resume?.skills) ? [...resume.skills] : [];
    const formatted = skill.charAt(0).toUpperCase() + skill.slice(1);
    if (!current.map((s) => s.toLowerCase()).includes(skill.toLowerCase())) {
      current.push(formatted);
      onUpdateSkills(current);
      confetti({ particleCount: 20, spread: 40 });
    }
  };

  const handleAddAllMissing = () => {
    if (!analysis?.missing) return;
    const current = Array.isArray(resume?.skills) ? [...resume.skills] : [];
    analysis.missing.forEach((skill) => {
      const formatted = skill.charAt(0).toUpperCase() + skill.slice(1);
      if (!current.map((s) => s.toLowerCase()).includes(skill.toLowerCase())) {
        current.push(formatted);
      }
    });
    onUpdateSkills(current);
    confetti({ particleCount: 45, spread: 60 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Targeted Resume Matcher
              </h3>
              <p className="text-[11px] text-slate-500">
                Resume Worded style job description analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Target Job Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Paste Target Job Description (JD)
            </label>
            <textarea
              rows={6}
              placeholder="Paste the requirements, responsibilities, and qualifications from the target job posting..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {analysis ? (
            <div className="space-y-4 pt-2">
              {/* Match Score Gauge */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    JD Relevancy Score
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {analysis.matchPct}%
                    </span>
                    <span className="text-xs text-slate-400">match</span>
                  </div>
                </div>
                <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      analysis.matchPct >= 75 ? 'bg-emerald-500' : analysis.matchPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${analysis.matchPct}%` }}
                  />
                </div>
              </div>

              {/* Missing Skills */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Missing Hard Skills ({analysis.missing.length})
                  </span>
                  {analysis.missing.length > 0 && (
                    <button
                      onClick={handleAddAllMissing}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add All to Resume
                    </button>
                  )}
                </div>

                {analysis.missing.length === 0 ? (
                  <p className="text-xs text-emerald-600">
                    No critical missing hard skills detected!
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.missing.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => handleAddSkill(skill)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-200 dark:border-rose-900 flex items-center gap-1 hover:bg-rose-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        {skill}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Matched Keywords */}
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-2">
                  <Check className="w-3.5 h-3.5" />
                  Keywords Found in Resume ({analysis.matched.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.matched.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-900 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
              <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Paste a Job Description to Reveal Expression Gaps
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                We'll scan for missing hard skills, ATS keywords, and industry competencies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

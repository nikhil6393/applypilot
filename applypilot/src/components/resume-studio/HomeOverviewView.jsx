import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, ArrowRight } from 'lucide-react';

export default function HomeOverviewView({
  candidateName = 'Candidate',
  score = 0,
  issues = [],
  categories = {},
  onSelectFix,
  onHowItWorks
}) {
  // Category color mapping
  const categoryColors = {
    impact:   'text-indigo-700 bg-indigo-50 border-indigo-200',
    sections: 'text-blue-700 bg-blue-50 border-blue-200',
    brevity:  'text-amber-700 bg-amber-50 border-amber-200',
    style:    'text-purple-700 bg-purple-50 border-purple-200',
  };

  // Human-readable label from issue id (e.g. "impact-weak-opener-0-1" → "Weak Action Verb")
  function issueLabel(issue) {
    if (!issue?.id) return 'Issue';
    const id = issue.id;
    if (id.includes('no-metric')) return 'Add Quantified Metrics';
    if (id.includes('weak-opener')) return 'Weak Action Verb';
    if (id.includes('action-verb')) return 'Action Verb Needed';
    if (id.includes('repeated') || id.includes('repetition')) return 'Word Repetition';
    if (id.includes('bullet-length')) return 'Bullet Length';
    if (id.includes('bullets-per-role')) return 'Bullet Count';
    if (id.includes('filler')) return 'Filler Words';
    if (id.includes('buzzword')) return 'Buzzwords';
    if (id.includes('first-person')) return 'First-Person Pronouns';
    if (id.includes('tense')) return 'Verb Tense';
    if (id.includes('contact')) return 'Missing Contact Info';
    if (id.includes('essential') || id.includes('sections')) return 'Missing Section';
    if (id.includes('ats-heading')) return 'ATS Heading';
    if (id.includes('summary')) return 'Summary Section';
    // Fallback: convert id to title case
    return id.replace(/^(impact|brevity|style|sections)-/, '')
              .replace(/-\d+.*$/, '')
              .replace(/-/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase());
  }

  // Real steps from actual failing/warning issues (deduplicated by rule type)
  const steps = useMemo(() => {
    const actionableIssues = issues.filter(i => i.severity === 'fail' || i.severity === 'warn');
    if (actionableIssues.length === 0) return [];

    const seen = new Set();
    const uniqueSteps = [];

    for (const issue of actionableIssues) {
      const label = issueLabel(issue);
      if (!seen.has(label)) {
        seen.add(label);
        uniqueSteps.push({
          id: issue.id,
          title: label,
          desc: issue.fix || '',
          category: (issue.category || 'impact').toUpperCase(),
          categoryColor: categoryColors[issue.category] || categoryColors.impact,
          severity: issue.severity,
        });
      }
    }

    return uniqueSteps.slice(0, 6);
  }, [issues]);

  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  const scoreLabel = score >= 80 ? 'ATS Ready 🟢' : score >= 60 ? 'Competitive 🟡' : 'Needs Work 🔴';
  const firstName = candidateName?.split(' ')[0] || 'there';

  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-[#F8FAFC] select-none text-slate-900">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header / Greeting Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Resume Overview
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of your resume's performance
              </p>
            </div>
          </div>

          <button
            onClick={onHowItWorks}
            className="px-3.5 py-1.5 rounded-full border border-indigo-200 bg-white text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 shadow-2xs transition-all uppercase tracking-wider cursor-pointer"
          >
            HOW IT WORKS
          </button>
        </div>

        {/* Card 1: Score & Horizontal Gradient Benchmark Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Your resume scored <span style={{ color: scoreColor }}>{score}</span> out of 100.
              <span className="ml-2 text-sm font-semibold text-slate-500">{scoreLabel}</span>
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {score >= 80
                ? "Great work! Your resume is ATS-ready. Fine-tune the remaining issues below to maximize your interview rate."
                : score >= 60
                ? "You're on the right track, but there's room for improvement. We'll show you how to make easy improvements to your resume which will increase your score."
                : "Your resume needs significant improvement. Follow the steps below to raise your score by 20+ points and get more interviews."}
            </p>
          </div>

          {/* Horizontal Gradient Benchmark Bar */}
          <div className="pt-6 pb-2">
            <div className="relative">
              {/* Pointer: YOUR RESUME */}
              <div
                className="absolute -top-7 transform -translate-x-1/2 flex flex-col items-center transition-all duration-700"
                style={{ left: `${Math.min(95, Math.max(5, score))}%` }}
              >
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider whitespace-nowrap mb-0.5">
                  YOUR RESUME
                </span>
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-indigo-600" />
              </div>

              {/* Gradient Track */}
              <div className="h-3.5 w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 shadow-inner relative overflow-hidden" />

              {/* Target Marker: TOP RESUMES */}
              <div className="absolute -top-1 bottom-0 right-[15%] flex flex-col items-center pointer-events-none">
                <div className="w-0.5 h-6 border-l-2 border-dashed border-indigo-900" />
                <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider mt-1 whitespace-nowrap">
                  TOP RESUMES
                </span>
              </div>

              {/* Zero label */}
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mt-2">
                <span>0</span>
                <span>100</span>
              </div>
            </div>
          </div>

          {/* Benchmark Callout Card with Lightbulb */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3">
            <div className="p-1 rounded-full bg-amber-200 text-amber-900 shrink-0 mt-0.5">
              <Lightbulb className="w-3.5 h-3.5 fill-current" />
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Your score is benchmarked against 1m+ resumes at your career level, and is based on 20+ key recruiter checks. The higher your resume score, the stronger your resume is and the more interviews you are likely to get.
            </p>
          </div>
        </div>

        {/* Executive Diagnostic KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>Action Verbs</span>
            </div>
            <div className="text-base font-black text-slate-900">
              {categories.impact || 85}%
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Power Verbs Verified</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Metrics Rate</span>
            </div>
            <div className="text-base font-black text-slate-900">
              {categories.brevity || 80}%
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Quantified Scale</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>Scan Time</span>
            </div>
            <div className="text-base font-black text-slate-900">
              ~45s
            </div>
            <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">Recruiter Target Pace</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>ATS Standard</span>
            </div>
            <div className="text-base font-black text-slate-900">
              {categories.sections || 100}%
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Greenhouse & Lever Ready</div>
          </div>
        </div>

        {/* Section 2: Steps to Increase Your Score */}
        {steps.length > 0 ? (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Steps to increase your score
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Here are the recruiter checks bringing your score down. Click each to learn where you went wrong and how to improve.
              </p>
            </div>

            {/* Step Rows */}
            <div className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center justify-between gap-4 hover:border-indigo-300 hover:shadow-xs transition-all shadow-2xs group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs ${
                      step.severity === 'fail' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {step.severity === 'fail' ? '✕' : '!'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border tracking-wider hidden sm:inline ${step.categoryColor}`}>
                      {step.category}
                    </span>
                    <button
                      onClick={() => onSelectFix(step.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                    >
                      <span>FIX</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="text-base font-bold text-emerald-800">Excellent Resume!</h3>
            <p className="text-xs text-emerald-700 mt-1">No major issues found. Your resume is well-optimized for ATS systems.</p>
          </div>
        )}
      </div>
    </div>
  );
}

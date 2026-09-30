import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, Lightbulb, ArrowRight, Zap, X, AlertTriangle } from 'lucide-react';

/**
 * HomeOverviewView.jsx
 * Exactly reproduces Screenshot 1:
 * - "Good morning, Nikhil. Welcome to your resume review."
 * - "Your resume scored 74 out of 100."
 * - Horizontal multi-color gradient benchmark bar with purple "YOUR RESUME" pointer & "TOP RESUMES" marker
 * - Benchmark callout card
 * - "Steps to increase your score" checklist with [FIX →] buttons
 */
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
    impact:   'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300',
    sections: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
    brevity:  'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
    style:    'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
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

  // Real steps from actual failing/warning issues
  const steps = useMemo(() => {
    const actionableIssues = issues.filter(i => i.severity === 'fail' || i.severity === 'warn');
    if (actionableIssues.length === 0) return [];
    return actionableIssues.slice(0, 6).map(issue => ({
      id: issue.id,
      title: issueLabel(issue),
      desc: issue.fix || '',
      category: (issue.category || 'impact').toUpperCase(),
      categoryColor: categoryColors[issue.category] || categoryColors.impact,
      severity: issue.severity,
    }));
  }, [issues]);

  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  const scoreLabel = score >= 80 ? 'ATS Ready 🟢' : score >= 60 ? 'Competitive 🟡' : 'Needs Work 🔴';
  const firstName = candidateName?.split(' ')[0] || 'there';


  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-950/50 select-none">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header / Greeting Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button className="p-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-900">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-900">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Good morning, {firstName}.
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Welcome to your resume review.
              </p>
            </div>
          </div>

          <button
            onClick={onHowItWorks}
            className="px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-slate-900 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 shadow-2xs transition-all uppercase tracking-wider"
          >
            HOW IT WORKS
          </button>
        </div>

        {/* Card 1: Score & Horizontal Gradient Benchmark Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/90 shadow-sm p-6 sm:p-7 space-y-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Your resume scored <span style={{ color: scoreColor }}>{score}</span> out of 100.
              <span className="ml-2 text-sm font-semibold text-slate-500">{scoreLabel}</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
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
                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider whitespace-nowrap mb-0.5">
                  YOUR RESUME
                </span>
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-indigo-600 dark:border-t-indigo-400" />
              </div>

              {/* Gradient Track */}
              <div className="h-3.5 w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 shadow-inner relative overflow-hidden" />

              {/* Target Marker: TOP RESUMES */}
              <div className="absolute -top-1 bottom-0 right-[15%] flex flex-col items-center pointer-events-none">
                <div className="w-0.5 h-6 border-l-2 border-dashed border-indigo-900 dark:border-white" />
                <span className="text-[9.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mt-1 whitespace-nowrap">
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
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-3">
            <div className="p-1 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0 mt-0.5">
              <Lightbulb className="w-3.5 h-3.5 fill-current" />
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
              Your score is benchmarked against 1m+ resumes at your career level, and is based on 20+ key recruiter checks. The higher your resume score, the stronger your resume is and the more interviews you are likely to get.
            </p>
          </div>
        </div>

        {/* Section 2: Steps to Increase Your Score */}
        {steps.length > 0 ? (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
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
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs ${
                      step.severity === 'fail' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {step.severity === 'fail' ? '✕' : '!'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
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
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-all"
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
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-300">Excellent Resume!</h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">No major issues found. Your resume is well-optimized for ATS systems.</p>
          </div>
        )}
      </div>
    </div>
  );
}

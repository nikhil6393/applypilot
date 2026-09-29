import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, ChevronDown,
  ChevronUp, Sparkles, Check, Info, Lightbulb, Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * FixDetailView.jsx
 * Exactly reproduces Screenshot 2:
 * - "Repetition" title with circular badge "5"
 * - Subtitle: "Avoid repeating action verbs and phrases on your resume"
 * - "2 ISSUES FOUND" section with accordion cards:
 *   - "Change repetitive action verbs" with "Built (4 times)" [Show your lines] & [Show Suggestions]
 *   - "Done? See how your score will improve! [Mark as Fixed]"
 *   - "Remove repetitive phrases"
 * - "CHECKS PASSED" section: "✔️ No repetitive bullet points"
 * - "Recruiter Insights" section
 */
export default function FixDetailView({
  fixId = 'repetition',
  onBackToHome,
  onApplyFix,
  onHighlightLines
}) {
  const [openCard, setOpenCard] = useState('verbs');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFixed, setIsFixed] = useState(false);

  const alternativeVerbs = [
    { verb: 'Engineered', context: 'for software, algorithms, and technical systems' },
    { verb: 'Architected', context: 'for infrastructure, pipelines, and full-stack solutions' },
    { verb: 'Delivered', context: 'for projects, end-to-end features, and milestones' },
    { verb: 'Developed', context: 'for applications, APIs, and client-facing tools' }
  ];

  const handleMarkAsFixed = () => {
    setIsFixed(true);
    confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
    if (onApplyFix) {
      onApplyFix('repetition');
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-950/50 select-none">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Header with Score Circle Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={onBackToHome}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 bg-white dark:bg-slate-900"
                title="Back to Home"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-900">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Repetition
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Avoid repeating action verbs and phrases on your resume
              </p>
            </div>
          </div>

          {/* Right Badge "5" in circle */}
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm shadow-2xs">
            5
          </div>
        </div>

        {/* Section: 2 ISSUES FOUND */}
        <div className="space-y-3">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
            {isFixed ? '1 ISSUE FOUND' : '2 ISSUES FOUND'}
          </span>

          {/* Card 1: Change repetitive action verbs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
            <button
              onClick={() => setOpenCard(openCard === 'verbs' ? '' : 'verbs')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Change repetitive action verbs
                </h3>
              </div>
              {openCard === 'verbs' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openCard === 'verbs' && (
              <div className="px-5 pb-5 pt-1 space-y-4 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                <p className="leading-relaxed">
                  We found that you overused an action verb on your resume, specifically <strong className="text-rose-600 font-bold">Built (4 times)</strong>. Using the same action verb more than 2 times on your resume reduces your resume's impact since it makes it harder for your achievements to stand out.
                </p>

                <p className="leading-relaxed">
                  Review the following words and, where it makes sense, try to replace it with unique action verbs — this shows hiring managers that you have a range of different skill sets.
                </p>

                {/* Repeated Word Item */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">1. Built (4 times)</span>
                  </div>
                  <button
                    onClick={onHighlightLines}
                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Show your lines
                  </button>
                </div>

                {/* Suggestions Trigger */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      Need ideas of action verbs you can replace them with?
                    </span>
                    <button
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition-colors ml-2"
                    >
                      {showSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
                    </button>
                  </div>

                  {showSuggestions && (
                    <div className="mt-2.5 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
                      {alternativeVerbs.map((alt) => (
                        <div key={alt.verb} className="flex items-baseline gap-2 text-xs">
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">• {alt.verb}:</span>
                          <span className="text-slate-600 dark:text-slate-400">{alt.context}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action: Done? See how your score will improve! [Mark as Fixed] */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Done? See how your score will improve!
                  </span>
                  <button
                    onClick={handleMarkAsFixed}
                    disabled={isFixed}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                      isFixed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isFixed ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                    <span>{isFixed ? 'Marked as Fixed (+5 pts)' : 'Mark as Fixed'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Remove repetitive phrases */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
            <button
              onClick={() => setOpenCard(openCard === 'phrases' ? '' : 'phrases')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Remove repetitive phrases
                </h3>
              </div>
              {openCard === 'phrases' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openCard === 'phrases' && (
              <div className="px-5 pb-5 pt-1 space-y-3 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                <p>
                  Ensure multiple bullet points don't begin with the exact same 3-word opening pattern (e.g. "Worked closely with", "Was responsible for").
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section: CHECKS PASSED */}
        <div className="space-y-3">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
            CHECKS PASSED
          </span>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                No repetitive bullet points
              </h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              PASSED
            </span>
          </div>
        </div>

        {/* Section: Recruiter Insights */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
          <div className="text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
            <h4 className="font-bold uppercase tracking-wider text-[11px]">
              Recruiter Insights
            </h4>
            <p className="leading-relaxed text-indigo-900/90 dark:text-indigo-300/90">
              Recruiters read dozens of resumes daily. Overusing the same action verb leads to cognitive fatigue and gives the impression of a limited technical repertoire. Varying your verbs highlights agility and breadth of experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

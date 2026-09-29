import React from 'react';
import {
  Home, Sparkles, FileText, Lock, CheckCircle2, AlertTriangle,
  Zap, UploadCloud, ChevronRight, Target, RefreshCw
} from 'lucide-react';

/**
 * LeftScoreSidebar.jsx
 * Exactly matches the left sidebar from the user's reference screenshots.
 * Houses the circular score dial ("74 OVERALL"), Top Fixes with numeric badges,
 * Completed checks, and Tools.
 */
export default function LeftScoreSidebar({
  score = 74,
  activeTab = 'home',
  onSelectTab,
  activeFix = null,
  onSelectFix,
  repetitionCount = 5,
  onUploadNew
}) {
  const topFixes = [
    { id: 'repetition', label: 'Repetition', badge: repetitionCount, locked: false, badgeColor: 'bg-amber-500 text-white' },
    { id: 'summary', label: 'Summary', badge: null, locked: true },
    { id: 'consistency', label: 'Consistency', badge: null, locked: true },
    { id: 'drive', label: 'Drive', badge: null, locked: true },
    { id: 'growth', label: 'Growth signals', badge: null, locked: true }
  ];

  const completedChecks = [
    { id: 'buzzwords', label: 'Buzzwords', score: 10 },
    { id: 'dates', label: 'Dates', score: 10 },
    { id: 'unnecessary', label: 'Unnecessary sections', score: 10 }
  ];

  // SVG Circular Gauge calculation
  const size = 110;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validScore = Math.min(100, Math.max(0, Math.round(score)));
  const offset = circumference - (validScore / 100) * circumference;

  let strokeColor = '#f59e0b'; // Amber for 70-79
  if (validScore >= 80) strokeColor = '#10b981';
  else if (validScore < 60) strokeColor = '#ef4444';

  return (
    <div className="w-56 xl:w-60 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 select-none overflow-y-auto custom-scrollbar">
      <div>
        {/* Top Circular Score Dial */}
        <div className="p-4 flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800/80">
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                {validScore}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                OVERALL
              </span>
            </div>
          </div>
        </div>

        {/* Home Navigation Button */}
        <div className="p-3">
          <button
            onClick={() => onSelectTab('home')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'home'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>

        {/* TOP FIXES Section */}
        <div className="px-3 pb-3">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 block mb-1.5">
            TOP FIXES
          </span>
          <div className="space-y-0.5">
            {topFixes.map((fix) => {
              const isSelected = activeFix === fix.id && activeTab === 'fix';

              return (
                <button
                  key={fix.id}
                  onClick={() => onSelectFix(fix.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-300 dark:ring-indigo-700'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{fix.label}</span>
                  {fix.badge && (
                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${fix.badgeColor}`}>
                      {fix.badge}
                    </span>
                  )}
                  {fix.locked && (
                    <Lock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onSelectTab('more_issues')}
            className="w-full text-left text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-3 pt-2 block"
          >
            9 MORE ISSUES ➕
          </button>
        </div>

        {/* COMPLETED Section */}
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 block mb-1.5">
            COMPLETED
          </span>
          <div className="space-y-0.5">
            {completedChecks.map((check) => (
              <div
                key={check.id}
                className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
              >
                <span className="truncate">{check.label}</span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {check.score}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onSelectTab('more_checks')}
            className="w-full text-left text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-3 pt-2 block"
          >
            5 MORE CHECKS ➕
          </button>
        </div>

        {/* TOOLS Section */}
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 block mb-1.5">
            TOOLS
          </span>
          <div className="space-y-0.5">
            <button
              onClick={() => onSelectTab('rewriter')}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Resume Rewriter</span>
            </button>
            <button
              onClick={() => onSelectTab('keywords')}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              <span>ATS Keywords</span>
            </button>
            <button
              onClick={() => onSelectTab('magic_write')}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Magic Write</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Upload New & Unlock Report */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
        <button
          onClick={onUploadNew}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
        >
          <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
          <span>Upload New Resume</span>
        </button>

        <button
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1"
        >
          <span>Unlock Full Report</span>
          <span className="text-amber-300">★</span>
        </button>
      </div>
    </div>
  );
}

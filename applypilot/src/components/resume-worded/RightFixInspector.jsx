import React, { useState, useEffect } from 'react';
import {
  Sparkles, Zap, Check, ArrowRight, ArrowLeft, Info,
  CheckCircle2, AlertTriangle, Edit3, Copy, RefreshCw, X
} from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * RightFixInspector.jsx
 * Contextual issue inspection & AI rewrite drawer modeled after Resume Worded.
 * Shows recruiter insights, before/after diffs, and 1-click instant fixes.
 */
export default function RightFixInspector({
  selectedIssue,
  onApplyFix,
  onNextIssue,
  onPrevIssue,
  totalIssuesCount,
  currentIssueIndex,
  onClose,
  scoreData
}) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [manualText, setManualText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (selectedIssue?.location?.text) {
      setManualText(selectedIssue.location.text);
      setIsEditing(false);
    }
  }, [selectedIssue]);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApply = (replacementText) => {
    if (!selectedIssue) return;
    confetti({
      particleCount: 35,
      spread: 55,
      origin: { y: 0.7 }
    });
    onApplyFix(selectedIssue, replacementText);
  };

  // If no issue is selected, display the Overview & Quick Wins dashboard
  if (!selectedIssue) {
    const { overallScore, pillars, issues = [], stats } = scoreData;
    const topQuickWins = issues.slice(0, 3);

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              AI Review Inspector
            </h3>
            <p className="text-[11px] text-slate-500">
              Select any highlighted line or checklist item
            </p>
          </div>
        </div>

        {/* Top 3 Quick Wins */}
        <div className="mt-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Top Quick Wins (+15 Pts Potential)
          </span>
          <div className="mt-2.5 space-y-2.5">
            {topQuickWins.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Great Job! No High-Priority Flags
                </p>
                <p className="text-[11px] text-emerald-600/80 mt-1">
                  Your resume demonstrates strong action verbs and structure.
                </p>
              </div>
            ) : (
              topQuickWins.map((win, idx) => (
                <div
                  key={win.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Quick Win #{idx + 1}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      +4 pts
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {win.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {win.why}
                  </p>
                  {win.suggestedFixes?.[0] && (
                    <button
                      onClick={() => handleApply(win.suggestedFixes[0])}
                      className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      1-Click Auto-Fix
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Resume Vital Signs
          </span>
          <div className="grid grid-cols-2 gap-2 mt-3 text-center">
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 block">Power Verbs</span>
              <span className="text-base font-extrabold text-indigo-600">
                {stats?.powerVerbBullets || 0} / {stats?.totalBullets || 0}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 block">Metrics Found</span>
              <span className="text-base font-extrabold text-emerald-600">
                {stats?.metricBullets || 0} / {stats?.totalBullets || 0}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 block">Total Words</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                {stats?.totalWords || 0}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 block">Skills Detected</span>
              <span className="text-base font-extrabold text-blue-600">
                {stats?.skillsCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Selected Issue View
  const isCritical = selectedIssue.severity === 'critical';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider ${
            isCritical
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          }`}>
            {isCritical ? 'Critical Fix' : 'Suggestion'}
          </span>
          <span className="text-xs text-slate-400 font-semibold">
            {currentIssueIndex + 1} of {totalIssuesCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevIssue}
            disabled={currentIssueIndex <= 0}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            title="Previous Issue"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onNextIssue}
            disabled={currentIssueIndex >= totalIssuesCount - 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            title="Next Issue"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4 flex-1">
        {/* Title */}
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
            {selectedIssue.title}
          </h2>
          {selectedIssue.location?.company && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
              {selectedIssue.location.role} · {selectedIssue.location.company}
            </p>
          )}
        </div>

        {/* Recruiter & ATS Insight Card */}
        <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider block">
                Recruiter & ATS Insight
              </span>
              <p className="text-xs text-indigo-800/90 dark:text-indigo-300/90 mt-1 leading-relaxed">
                {selectedIssue.why}
              </p>
            </div>
          </div>
        </div>

        {/* Original Text with Strikethrough Diff */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Original Phrase in Resume
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              {isEditing ? 'Cancel Edit' : 'Edit Manually'}
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => {
                  handleApply(manualText);
                  setIsEditing(false);
                }}
                className="w-full py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
              >
                Save & Update Resume
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
              <span className="line-through bg-rose-200/80 dark:bg-rose-900/60 px-1 py-0.5 rounded text-rose-900 dark:text-rose-200 font-bold mr-1">
                {selectedIssue.flaggedToken}
              </span>
              {selectedIssue.location?.text
                ? selectedIssue.location.text.replace(selectedIssue.flaggedToken, '')
                : ''}
            </div>
          )}
        </div>

        {/* Recommended Fixes */}
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            AI Recommended Fixes
          </span>

          <div className="space-y-2.5">
            {(selectedIssue.suggestedFixes || []).map((fix, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400 transition-all"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                  <span>Option {idx + 1}: High-Impact Action Rewrite</span>
                  <button
                    onClick={() => handleCopy(fix, idx)}
                    className="hover:text-emerald-900 flex items-center gap-1"
                  >
                    {copiedIndex === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedIndex === idx ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  {fix}
                </p>
                <button
                  onClick={() => handleApply(fix)}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Apply This Fix (+Score)
                </button>
              </div>
            ))}

            {selectedIssue.suggestedMetricFix && (
              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400 transition-all">
                <div className="flex items-center justify-between text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1">
                  <span>Option 3: Metric-Anchored Formula</span>
                  <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 px-1.5 py-0.5 rounded text-[9px]">
                    +Highest ATS
                  </span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedIssue.suggestedMetricFix}
                </p>
                <button
                  onClick={() => handleApply(selectedIssue.suggestedMetricFix)}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Apply Metric Formula (+Score)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

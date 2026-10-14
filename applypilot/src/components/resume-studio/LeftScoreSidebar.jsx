import React, { useMemo, useState } from 'react';
import {
  Home, Sparkles, FileText, CheckCircle2, AlertTriangle,
  Zap, UploadCloud, ChevronRight, Target, RefreshCw, Layers
} from 'lucide-react';

/**
 * Identify the rule family / category from an issue id
 */
export function getIssueRuleType(issue) {
  if (!issue?.id) return 'other';
  const id = issue.id.toLowerCase();
  if (id.includes('no-metric')) return 'no-metric';
  if (id.includes('weak-opener')) return 'weak-opener';
  if (id.includes('action-verb')) return 'action-verb';
  if (id.includes('repeated') || id.includes('repetition')) return 'repetition';
  if (id.includes('bullet-length')) return 'bullet-length';
  if (id.includes('bullets-per-role')) return 'bullets-per-role';
  if (id.includes('filler')) return 'filler';
  if (id.includes('buzzword')) return 'buzzword';
  if (id.includes('first-person')) return 'first-person';
  if (id.includes('tense')) return 'tense';
  if (id.includes('contact')) return 'contact';
  if (id.includes('essential') || id.includes('sections')) return 'sections';
  if (id.includes('ats-heading')) return 'ats-heading';
  if (id.includes('summary')) return 'summary';
  return id.replace(/^(impact|brevity|style|sections)-/, '').replace(/-\d+.*$/, '');
}

/**
 * Human-readable metadata and points for each rule family
 */
export function getRuleTypeMeta(type) {
  switch (type) {
    case 'no-metric':
      return { label: 'Add Metrics', points: 15, desc: 'Add quantifiable metrics and measurable outcomes to bullets' };
    case 'weak-opener':
      return { label: 'Weak Action Verbs', points: 10, desc: 'Replace passive phrases with strong action verbs' };
    case 'action-verb':
      return { label: 'Action Verbs Needed', points: 10, desc: 'Ensure all bullets begin with an approved action verb' };
    case 'repetition':
      return { label: 'Word Repetition', points: 5, desc: 'Avoid repeating the same action verbs across bullets' };
    case 'bullet-length':
      return { label: 'Bullet Length', points: 5, desc: 'Keep bullets between 15 and 30 words for ideal readability' };
    case 'bullets-per-role':
      return { label: 'Bullet Count', points: 5, desc: 'Include 3-6 bullets per professional role' };
    case 'filler':
      return { label: 'Filler Words', points: 5, desc: 'Remove unnecessary filler phrases' };
    case 'buzzword':
      return { label: 'Buzzwords', points: 5, desc: 'Replace generic buzzwords with concrete achievements' };
    case 'first-person':
      return { label: 'First-Person', points: 5, desc: 'Eliminate "I", "me", "my" from resume bullets' };
    case 'tense':
      return { label: 'Verb Tense', points: 5, desc: 'Use past tense for previous roles and present for current' };
    case 'contact':
      return { label: 'Contact Info', points: 10, desc: 'Include email, phone, location, and professional links' };
    case 'sections':
      return { label: 'Missing Section', points: 15, desc: 'Ensure all standard sections are clearly present' };
    case 'ats-heading':
      return { label: 'ATS Headings', points: 10, desc: 'Use standard headings recognized by ATS systems' };
    case 'summary':
      return { label: 'Summary Section', points: 10, desc: 'Craft a targeted, high-impact professional summary' };
    default:
      return {
        label: type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        points: 5,
        desc: 'Review and improve resume structure'
      };
  }
}

/**
 * LeftScoreSidebar.jsx
 * Professional, clean left navigation sidebar:
 * - Circular score dial with animated SVG arc
 * - Consolidated, deduplicated TOP FIXES (never repeating the same rule 5 times!)
 * - Accurate completed checks
 * - Fully interactive TOOLS (Resume Rewriter, ATS Keywords, Magic Write)
 * - Working Full Report modal trigger & Upload New button
 */
export default function LeftScoreSidebar({
  score = 0,
  categories = {},
  issues = [],
  activeTab = 'home',
  onSelectTab,
  activeFix = null,
  onSelectFix,
  repetitionCount = 0,
  onUploadNew,
  onOpenFullReport,
}) {
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [showAllChecks, setShowAllChecks] = useState(false);

  // Group failing/warning issues by rule family so each distinct issue type appears once
  const groupedFixes = useMemo(() => {
    const failingOrWarn = issues.filter(i => i.severity === 'fail' || i.severity === 'warn');
    const groupsMap = new Map();

    failingOrWarn.forEach(issue => {
      const type = getIssueRuleType(issue);
      if (!groupsMap.has(type)) {
        const meta = getRuleTypeMeta(type);
        groupsMap.set(type, {
          id: type,
          type,
          label: meta.label,
          desc: meta.desc,
          issues: [issue],
          severity: issue.severity,
          points: issue.points || meta.points,
        });
      } else {
        const grp = groupsMap.get(type);
        grp.issues.push(issue);
        if (issue.severity === 'fail') grp.severity = 'fail';
        grp.points += (issue.points || 0);
      }
    });

    const list = Array.from(groupsMap.values());
    // Sort: 'fail' first, then by count of issues desc
    list.sort((a, b) => {
      if (a.severity === 'fail' && b.severity !== 'fail') return -1;
      if (b.severity === 'fail' && a.severity !== 'fail') return 1;
      return b.issues.length - a.issues.length;
    });

    return list;
  }, [issues]);

  // Group passing checks
  const groupedChecks = useMemo(() => {
    const passing = issues.filter(i => i.severity === 'pass');
    const seen = new Set();
    const result = [];

    passing.forEach(issue => {
      const type = getIssueRuleType(issue);
      if (!seen.has(type)) {
        seen.add(type);
        const meta = getRuleTypeMeta(type);
        result.push({
          id: type,
          label: `No ${meta.label.toLowerCase()} issues`,
          score: issue.points || meta.points || 10,
        });
      }
    });

    // Add standard ATS passing fallbacks if clean
    if (result.length === 0) {
      result.push(
        { id: 'pass-structure', label: 'ATS standard formatting', score: 10 },
        { id: 'pass-bullets', label: 'No repetitive bullet points', score: 10 }
      );
    }

    return result;
  }, [issues]);

  const displayedFixes = showAllIssues ? groupedFixes : groupedFixes.slice(0, 5);
  const remainingFixesCount = Math.max(0, groupedFixes.length - 5);

  const displayedChecks = showAllChecks ? groupedChecks : groupedChecks.slice(0, 4);
  const remainingChecksCount = Math.max(0, groupedChecks.length - 4);

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
    <div className="w-full lg:w-56 xl:w-60 h-full bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 select-none overflow-y-auto custom-scrollbar z-10 text-slate-800">
      <div>
        {/* Top Circular Score Dial */}
        <div className="p-4 flex flex-col items-center justify-center border-b border-slate-100">
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#e2e8f0"
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
              <span className="text-3xl font-black text-slate-900 leading-none">
                {validScore}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                OVERALL
              </span>
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
              validScore >= 80
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : validScore >= 60
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {validScore >= 80 ? 'ATS Ready 🟢' : validScore >= 60 ? 'Competitive 🟡' : 'Needs Polish 🔴'}
            </span>
          </div>
        </div>

        {/* Category Breakdown Progress Bars */}
        <div className="px-4 py-3 border-b border-slate-100 space-y-2 bg-slate-50/70">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Score Factors</span>
            <span className="text-slate-400 font-semibold">100 Max</span>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Impact', val: categories.impact ?? 85, color: 'bg-indigo-600' },
              { label: 'Brevity', val: categories.brevity ?? 80, color: 'bg-amber-500' },
              { label: 'Style', val: categories.style ?? 90, color: 'bg-purple-600' },
              { label: 'Sections', val: categories.sections ?? 100, color: 'bg-emerald-500' },
            ].map((cat) => (
              <div key={cat.label} className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span className="font-medium">{cat.label}</span>
                  <span className="font-bold text-slate-900">{cat.val}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/90 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(5, cat.val))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Home Navigation Button */}
        <div className="p-3">
          <button
            onClick={() => onSelectTab('home')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-slate-100 text-slate-900 font-extrabold shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4 text-indigo-600" />
            <span>Home Overview</span>
          </button>
        </div>

        {/* TOP FIXES Section (Consolidated & Clean) */}
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              TOP FIXES
            </span>
            {groupedFixes.length > 0 && (
              <span className="text-[10px] font-bold text-slate-400">
                {groupedFixes.length} items
              </span>
            )}
          </div>

          <div className="space-y-0.5">
            {displayedFixes.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 italic">No critical fixes found!</div>
            ) : (
              displayedFixes.map((fix) => {
                const isSelected = activeFix === fix.type && activeTab === 'fix';
                const issueCount = fix.issues.length;

                return (
                  <button
                    key={fix.type}
                    onClick={() => onSelectFix(fix.type, fix)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-200'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{fix.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {issueCount > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                          {issueCount}
                        </span>
                      )}
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        fix.severity === 'fail' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        !
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {remainingFixesCount > 0 && (
            <button
              onClick={() => setShowAllIssues(!showAllIssues)}
              className="w-full text-left text-[11px] font-bold text-indigo-600 hover:underline px-3 pt-2 block cursor-pointer"
            >
              {showAllIssues ? 'SHOW LESS ▲' : `${remainingFixesCount} MORE ISSUES ➕`}
            </button>
          )}
        </div>

        {/* COMPLETED Section */}
        <div className="px-3 pb-3 border-t border-slate-100 pt-3">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 block mb-1.5">
            COMPLETED
          </span>
          <div className="space-y-0.5">
            {displayedChecks.map((check) => (
              <div
                key={check.id}
                className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-600"
              >
                <span className="truncate">{check.label}</span>
                <span className="text-[10px] font-bold text-emerald-600">
                  +{check.score}
                </span>
              </div>
            ))}
          </div>

          {remainingChecksCount > 0 && (
            <button
              onClick={() => setShowAllChecks(!showAllChecks)}
              className="w-full text-left text-[11px] font-bold text-indigo-600 hover:underline px-3 pt-2 block cursor-pointer"
            >
              {showAllChecks ? 'SHOW LESS ▲' : `${remainingChecksCount} MORE CHECKS ➕`}
            </button>
          )}
        </div>

        {/* TOOLS Section (Interactive AI Tools) */}
        <div className="px-3 pb-3 border-t border-slate-100 pt-3">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 block mb-1.5">
            TOOLS
          </span>
          <div className="space-y-0.5">
            <button
              onClick={() => onSelectTab('rewriter')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'tool_rewriter' || activeFix === 'rewriter'
                  ? 'bg-amber-50 text-amber-800 font-bold ring-1 ring-amber-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Resume Rewriter</span>
            </button>
            <button
              onClick={() => onSelectTab('keywords')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'tool_keywords' || activeFix === 'keywords'
                  ? 'bg-indigo-50 text-indigo-800 font-bold ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              <span>ATS Keywords</span>
            </button>
            <button
              onClick={() => onSelectTab('magic_write')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'tool_magic_write' || activeFix === 'magic_write'
                  ? 'bg-blue-50 text-blue-800 font-bold ring-1 ring-blue-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Magic Write</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Upload New & Unlock Report */}
      <div className="p-4 border-t border-slate-200 bg-white space-y-2">
        <button
          onClick={onUploadNew}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all shadow-2xs cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
          <span>Upload New Resume</span>
        </button>

        <button
          onClick={onOpenFullReport}
          className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>View Full ATS Report</span>
          <span className="text-amber-300">★</span>
        </button>
      </div>
    </div>
  );
}

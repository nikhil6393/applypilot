import React, { useState } from 'react';
import { Zap, AlertTriangle, AlertCircle, CheckCircle2, ChevronRight, Sparkles, Target, Layers } from 'lucide-react';
import CircularScoreGauge from './CircularScoreGauge';

/**
 * LeftScoreNavigator.jsx
 * Left sidebar navigation modeled after Resume Worded.
 * Houses the overall score gauge, pillar cards, and categorized issue checklist.
 */
export default function LeftScoreNavigator({
  scoreData,
  selectedIssue,
  onSelectIssue,
  activeFilter,
  setActiveFilter,
  onOpenTargetJob
}) {
  const { overallScore, grade, pillars, issues = [], stats } = scoreData;

  const pillarCards = [
    {
      key: 'impact',
      label: 'Impact',
      score: pillars.impact,
      icon: '💥',
      color: 'indigo',
      desc: 'Action verbs & metrics',
      count: issues.filter((i) => i.pillar === 'impact').length
    },
    {
      key: 'brevity',
      label: 'Brevity',
      score: pillars.brevity,
      icon: '📏',
      color: 'blue',
      desc: 'Bullet length & conciseness',
      count: issues.filter((i) => i.pillar === 'brevity').length
    },
    {
      key: 'style',
      label: 'Style & ATS',
      score: pillars.style,
      icon: '🎨',
      color: 'amber',
      desc: 'Pronouns, clichés & layout',
      count: issues.filter((i) => i.pillar === 'style' || i.pillar === 'ats').length
    },
    {
      key: 'skills',
      label: 'Targeted Skills',
      score: pillars.skills,
      icon: '🎯',
      color: 'emerald',
      desc: 'Technical keyword match',
      count: stats?.skillsCount || 0
    }
  ];

  const filteredIssues = activeFilter === 'all'
    ? issues
    : issues.filter((i) => i.pillar === activeFilter || (activeFilter === 'style' && i.pillar === 'ats'));

  return (
    <div className="flex flex-col h-full bg-slate-50/70 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar">
      {/* Top Section: Score Dial */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Resume Worded Score
          </span>
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
            {issues.length} Fixes Found
          </span>
        </div>
        <CircularScoreGauge score={overallScore} grade={grade} size={145} strokeWidth={11} />
      </div>

      {/* 4 Pillars Overview Cards */}
      <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-200 dark:border-slate-800">
        {pillarCards.map((p) => {
          const isActive = activeFilter === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setActiveFilter(isActive ? 'all' : p.key)}
              className={`p-2.5 rounded-xl border text-left transition-all relative ${
                isActive
                  ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-700 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{p.icon}</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {p.score}%
                </span>
              </div>
              <div className="mt-1 font-semibold text-[12px] text-slate-800 dark:text-slate-200 truncate">
                {p.label}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-slate-400">
                  {p.count} {p.key === 'skills' ? 'skills' : 'flags'}
                </span>
                <div className="w-10 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      p.score >= 80 ? 'bg-emerald-500' : p.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${p.score}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Targeted Job Relevancy Quick Banner */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/30 dark:to-blue-950/20">
        <button
          onClick={onOpenTargetJob}
          className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/60 rounded-xl hover:border-indigo-400 transition-all text-left shadow-sm group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">
                Targeted Resume
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                Match against a job description
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>

      {/* Issues Checklist Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Diagnostic Checklist ({filteredIssues.length})
        </span>
        {activeFilter !== 'all' && (
          <button
            onClick={() => setActiveFilter('all')}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Show All
          </button>
        )}
      </div>

      {/* Issue Items List */}
      <div className="flex-1 p-2 space-y-1.5 overflow-y-auto custom-scrollbar">
        {filteredIssues.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No Issues Found!
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              This category meets Resume Worded standards.
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const isSelected = selectedIssue?.id === issue.id;
            const isCritical = issue.severity === 'critical';

            return (
              <button
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-400 dark:bg-indigo-950/60 dark:border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900/50 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {isCritical ? (
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[12px] font-semibold truncate ${
                      isSelected ? 'text-indigo-950 dark:text-indigo-200 font-bold' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {issue.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${
                        issue.pillar === 'impact'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : issue.pillar === 'brevity'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {issue.pillar}
                      </span>
                      {issue.location?.company && (
                        <span className="text-[10px] text-slate-400 truncate">
                          at {issue.location.company}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                    isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'
                  }`} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

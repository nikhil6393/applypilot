import React from 'react';

/**
 * CircularScoreGauge.jsx
 * Animated circular score indicator modeled after Resume Worded's 0-100 dial.
 */
export default function CircularScoreGauge({ score = 0, grade = 'Needs Work', size = 160, strokeWidth = 12 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validScore = Math.min(100, Math.max(0, Math.round(score)));
  const offset = circumference - (validScore / 100) * circumference;

  // Grade color scheme
  let color = '#EF4444'; // Red
  let trackBg = 'rgba(239, 68, 68, 0.15)';
  let gradeBadgeBg = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900';

  if (validScore >= 90) {
    color = '#10B981'; // Emerald
    trackBg = 'rgba(16, 185, 129, 0.15)';
    gradeBadgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
  } else if (validScore >= 80) {
    color = '#4F46E5'; // Indigo
    trackBg = 'rgba(79, 70, 229, 0.15)';
    gradeBadgeBg = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900';
  } else if (validScore >= 65) {
    color = '#F59E0B'; // Amber
    trackBg = 'rgba(245, 158, 11, 0.15)';
    gradeBadgeBg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackBg}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Value Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease'
            }}
          />
        </svg>

        {/* Center Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {validScore}
          </span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            out of 100
          </span>
        </div>
      </div>

      <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${gradeBadgeBg}`}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {grade}
      </div>
    </div>
  );
}

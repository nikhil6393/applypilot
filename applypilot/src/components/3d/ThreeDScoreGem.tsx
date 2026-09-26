import React from 'react';
import { ShieldCheck, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';

interface ThreeDScoreGemProps {
  score?: number;
  className?: string;
  size?: number;
}

export const ThreeDScoreGem: React.FC<ThreeDScoreGemProps> = ({
  score = 94,
  className = '',
  size = 200,
}) => {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const isHigh = score >= 85;
  const isMedium = score >= 70 && score < 85;

  const strokeColor = isHigh ? '#10B981' : isMedium ? '#2563EB' : '#F59E0B';

  return (
    <div
      className={`relative p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center text-center ${className}`}
      style={{ minWidth: 220 }}
    >
      {/* Top Status */}
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold mb-3">
        <Sparkles className="w-3 h-3 text-emerald-600" />
        <span>{score >= 90 ? 'Top Tier ATS Match' : 'Strong Alignment'}</span>
      </div>

      {/* Radial Gauge */}
      <div className="relative flex items-center justify-center my-1" style={{ width: 140, height: 140 }}>
        <svg width={140} height={140} className="rotate-[-90deg]">
          <circle
            cx={70}
            cy={70}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={10}
          />
          <circle
            cx={70}
            cy={70}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={10}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline">
            <span className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              {score}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-0.5">/100</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
            ATS Score
          </span>
        </div>
      </div>

      {/* Sublabel Metrics */}
      <div className="w-full mt-3 pt-3 border-t border-slate-100 flex items-center justify-around text-[11px]">
        <div className="text-center">
          <div className="font-bold text-slate-900">100%</div>
          <div className="text-[10px] text-slate-500">Format Pass</div>
        </div>
        <div className="h-6 w-[1px] bg-slate-200" />
        <div className="text-center">
          <div className="font-bold text-emerald-600">96%</div>
          <div className="text-[10px] text-slate-500">Keyword Fit</div>
        </div>
      </div>
    </div>
  );
};

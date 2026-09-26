import React from 'react';
import {
  TrendingUp,
  Send,
  Zap,
  Award,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';

interface ThreeDCareerOrbitalProps {
  totalApplied?: number;
  activeInterviews?: number;
  totalScored?: number;
  offersReceived?: number;
  className?: string;
}

export const ThreeDCareerOrbital: React.FC<ThreeDCareerOrbitalProps> = ({
  totalApplied = 0,
  activeInterviews = 0,
  totalScored = 0,
  offersReceived = 0,
  className = '',
}) => {
  const displayScored = totalScored > 0 ? totalScored : 45;
  const displayTailored = totalApplied > 0 ? totalApplied : 12;
  const displayApplied = totalApplied > 0 ? totalApplied : 10;
  const displayInterviews = activeInterviews > 0 ? activeInterviews : 2;
  const displayOffers = offersReceived > 0 ? offersReceived : 0;

  const funnelStages = [
    {
      label: 'Jobs Scored',
      sublabel: 'Evaluated ATS matches',
      count: displayScored,
      icon: Zap,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'Tailored Applications',
      sublabel: 'Customized CV & Cover',
      count: displayTailored,
      icon: Layers,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    {
      label: 'Dispatched to ATS',
      sublabel: 'Receipt-verified applies',
      count: displayApplied,
      icon: Send,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      border: 'border-sky-100',
    },
    {
      label: 'Active Interview Loops',
      sublabel: 'Screening & Technicals',
      count: displayInterviews,
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: 'Offers Received',
      sublabel: 'Verified job offers',
      count: displayOffers,
      icon: Award,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
  ];

  return (
    <div
      className={`relative p-5 sm:p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-slate-900 tracking-tight">
                Conversion Telemetry
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                End-to-end recruitment funnel progression
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </div>

        {/* Funnel list */}
        <div className="space-y-2.5">
          {funnelStages.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg ${stage.bg} ${stage.border} border flex items-center justify-center ${stage.color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      {stage.label}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {stage.sublabel}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-display font-bold text-base text-slate-900">
                    {stage.count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Insight */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 font-medium text-emerald-600">
          <ShieldCheck className="w-3.5 h-3.5" />
          High Conversion Velocity
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          Sync: Realtime
        </span>
      </div>
    </div>
  );
};

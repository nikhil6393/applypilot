import React from 'react';
import { ShieldCheck, Zap, Wifi, Globe, Database } from 'lucide-react';

interface ThreeDRadarScopeProps {
  jobCount?: number;
  isScanning?: boolean;
  className?: string;
  onSelectSampleJob?: (company: string) => void;
}

const COMPANY_GRADIENTS: Record<string, string> = {
  S: 'from-violet-500 to-purple-600',
  G: 'from-blue-500 to-cyan-500',
  V: 'from-slate-700 to-slate-900',
  A: 'from-orange-500 to-red-500',
  M: 'from-emerald-500 to-teal-600',
  N: 'from-sky-500 to-blue-600',
};

function getGradient(letter: string) {
  return COMPANY_GRADIENTS[letter.toUpperCase()] ?? 'from-indigo-500 to-blue-600';
}

const sources = [
  {
    name: 'LinkedIn Realtime',
    status: 'Live',
    latency: '68ms',
    icon: Wifi,
    accentColor: 'bg-violet-500',
    latencyColor: 'bg-violet-50 text-violet-600',
    statusColor: 'text-violet-600',
  },
  {
    name: 'Naukri Core',
    status: 'Syncing',
    latency: '112ms',
    icon: Globe,
    accentColor: 'bg-emerald-500',
    latencyColor: 'bg-emerald-50 text-emerald-600',
    statusColor: 'text-emerald-600',
  },
  {
    name: 'Greenhouse & Lever',
    status: 'Direct API',
    latency: '45ms',
    icon: Database,
    accentColor: 'bg-blue-500',
    latencyColor: 'bg-blue-50 text-blue-600',
    statusColor: 'text-blue-600',
  },
];

const recentDrops = [
  { company: 'Stripe', role: 'Staff Frontend Engineer', match: 97, time: 'Just now' },
  { company: 'Google', role: 'Full Stack Engineer', match: 94, time: '2m ago' },
  { company: 'Vercel', role: 'Platform Systems Engineer', match: 92, time: '5m ago' },
];

function matchColor(pct: number) {
  if (pct >= 95) return 'text-emerald-600 bg-emerald-50';
  if (pct >= 90) return 'text-blue-600 bg-blue-50';
  return 'text-amber-600 bg-amber-50';
}

export const ThreeDRadarScope: React.FC<ThreeDRadarScopeProps> = ({
  jobCount = 42,
  isScanning = false,
  className = '',
  onSelectSampleJob,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl flex flex-col justify-between ${className}`}
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 60%, #eff6ff 100%)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(99,102,241,0.07)',
      }}
    >
      {/* Subtle background accent blob */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
      />

      <div className="relative p-5">
        {/* ── Header ── */}
        <div className="flex items-center justify-between pb-3.5">
          <div className="flex items-center gap-2.5">
            {/* Icon with pulse ring */}
            <div className="relative flex-shrink-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
              >
                <Zap className="w-4 h-4" />
              </div>
              {/* Live pulse ring */}
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900 leading-tight tracking-tight">
                Job Feed
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {jobCount} postings indexed
              </div>
            </div>
          </div>

          {/* Status badge — borderless pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
              isScanning
                ? 'bg-blue-100/70 text-blue-600'
                : 'bg-emerald-100/70 text-emerald-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isScanning ? 'bg-blue-500 animate-spin' : 'bg-emerald-500 animate-pulse'
              }`}
            />
            {isScanning ? 'Polling…' : 'Daemon Active'}
          </div>
        </div>

        {/* ── Source Health Rows ── */}
        <div className="space-y-1.5">
          {sources.map((src, i) => (
            <div
              key={i}
              className="relative flex items-center justify-between px-3 py-2 rounded-xl bg-white/70 hover:bg-white/90 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              {/* Left accent stripe */}
              <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${src.accentColor}`} />

              <div className="flex items-center gap-2 pl-1">
                <span className={`text-[10px] font-semibold ${src.statusColor}`}>
                  ● {src.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-medium ${src.statusColor} opacity-70`}>
                  {src.status}
                </span>
                <span
                  className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-lg ${src.latencyColor}`}
                >
                  {src.latency}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Latest Matches ── */}
        <div className="mt-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-0.5">
            Latest Matches
          </div>

          <div className="space-y-1">
            {recentDrops.map((drop, idx) => (
              <div
                key={idx}
                onClick={() => onSelectSampleJob?.(drop.company)}
                className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/80 transition-all cursor-pointer group"
                style={{
                  animationDelay: `${idx * 80}ms`,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Gradient avatar */}
                  <div
                    className={`w-6 h-6 rounded-lg bg-gradient-to-br ${getGradient(drop.company[0])} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm`}
                  >
                    {drop.company[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors leading-tight">
                      {drop.company}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate leading-tight">
                      {drop.role}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {/* Match pill — borderless, colored bg */}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${matchColor(drop.match)} ${
                      drop.match >= 95 ? 'ring-1 ring-emerald-200' : ''
                    }`}
                  >
                    {drop.match}%
                  </span>
                  <span className="text-[9px] text-slate-350 font-medium whitespace-nowrap text-slate-400">
                    {drop.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
            <ShieldCheck className="w-3 h-3" />
            ATS-filtered · deduplicated
          </span>
          <span className="font-mono text-[9px] text-slate-400 font-medium">
            0% Spam · 0% Dupes
          </span>
        </div>
      </div>
    </div>
  );
};

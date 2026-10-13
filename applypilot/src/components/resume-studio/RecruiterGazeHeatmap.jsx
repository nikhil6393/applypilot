import React from 'react';
import { Eye, Info, CheckCircle2, Sparkles, X, Activity } from 'lucide-react';

/**
 * RecruiterGazeBanner
 * Top Diagnostic Bar for the 6-Second Gaze Simulation
 */
export function RecruiterGazeBanner({ isVisible, onClose }) {
  if (!isVisible) return null;

  return (
    <div className="w-full max-w-[816px] mb-3 p-3.5 rounded-2xl bg-white border border-rose-200 shadow-md text-xs select-none animate-in fade-in slide-in-from-top-2 duration-200 z-30">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-xs">
                Recruiter 6-Second Eye-Tracking Simulation
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                Nielsen Norman F-Pattern
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Simulates how senior technical recruiters scan your resume in the first 6 seconds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {/* Gaze Efficiency Score */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
              Gaze Score
            </span>
            <span className="text-sm font-black text-emerald-600">
              94% (High Impact)
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Close heatmap overlay"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend & Scanning Fixations */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-rose-700">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" />
            ① Identity & Title (1.5s)
          </span>
          <span className="flex items-center gap-1 font-semibold text-amber-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
            ② Current Role (1.8s)
          </span>
          <span className="flex items-center gap-1 font-semibold text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
            ③ Impact Bullets (1.4s)
          </span>
          <span className="flex items-center gap-1 font-semibold text-sky-700">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-2xs" />
            ④ Tech Stack (0.8s)
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            Dead Zone (&lt;0.3s)
          </span>
        </div>

        <span className="text-slate-600 font-medium">
          💡 <strong>Tip:</strong> Keep quantifiable metric numbers in the first 2 lines of each role.
        </span>
      </div>
    </div>
  );
}

/**
 * RecruiterGazeOverlay
 * Radial heatmap overlays positioned over the printed resume paper
 */
export function RecruiterGazeOverlay({ isVisible }) {
  if (!isVisible) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none transition-opacity duration-300"
      style={{ borderRadius: 0 }}
    >
      {/* Semi-transparent focal vignette */}
      <div className="absolute inset-0 bg-slate-900/[0.03]" />

      {/* Eye Tracking Scanpath SVG (Classic F-Pattern scan trail connecting ① -> ② -> ③ -> ④) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        <path
          d="M 220 55 L 140 180 L 360 215 L 140 270 L 320 300 L 140 540"
          fill="none"
          stroke="#E11D48"
          strokeWidth="2.5"
          strokeDasharray="5,4"
        />
      </svg>

      {/* FIXATION 1: Top Name & Contact Info (1.5s) */}
      <div
        className="absolute top-[2.5%] left-[10%] right-[10%] h-[75px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(244, 63, 94, 0.35) 0%, rgba(244, 63, 94, 0.12) 50%, transparent 80%)',
        }}
      />
      <div className="absolute top-[3%] right-[2%] flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider shadow-md">
        <span className="w-3.5 h-3.5 rounded-full bg-white text-rose-700 flex items-center justify-center font-bold text-[8px]">1</span>
        <span>1.5s • Identity</span>
      </div>

      {/* FIXATION 2: Most Recent Role & Company (1.8s) */}
      <div
        className="absolute top-[24%] left-[6%] right-[22%] h-[95px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.38) 0%, rgba(245, 158, 11, 0.14) 55%, transparent 85%)',
        }}
      />
      <div className="absolute top-[25%] right-[2%] flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-600 text-white font-black text-[9px] uppercase tracking-wider shadow-md">
        <span className="w-3.5 h-3.5 rounded-full bg-white text-amber-700 flex items-center justify-center font-bold text-[8px]">2</span>
        <span>1.8s • Current Title</span>
      </div>

      {/* FIXATION 3: Top Impact Bullets 1 & 2 (1.4s) */}
      <div
        className="absolute top-[33%] left-[8%] right-[18%] h-[85px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.32) 0%, rgba(16, 185, 129, 0.10) 55%, transparent 85%)',
        }}
      />
      <div className="absolute top-[34%] right-[2%] flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider shadow-md">
        <span className="w-3.5 h-3.5 rounded-full bg-white text-emerald-700 flex items-center justify-center font-bold text-[8px]">3</span>
        <span>1.4s • Top Metrics</span>
      </div>

      {/* FIXATION 4: Technical Skills Section (0.8s) */}
      <div
        className="absolute bottom-[10%] left-[8%] right-[15%] h-[80px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(14, 165, 233, 0.28) 0%, rgba(14, 165, 233, 0.08) 55%, transparent 85%)',
        }}
      />
      <div className="absolute bottom-[11%] right-[2%] flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-600 text-white font-black text-[9px] uppercase tracking-wider shadow-md">
        <span className="w-3.5 h-3.5 rounded-full bg-white text-sky-700 flex items-center justify-center font-bold text-[8px]">4</span>
        <span>0.8s • Tech Stack</span>
      </div>

      {/* Lower Dead Zone (Recruiters rarely gaze past bullet 3 on older roles in first 6s) */}
      <div
        className="absolute top-[52%] bottom-[22%] left-[4%] right-[4%]"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(100, 116, 139, 0.05) 25%, rgba(100, 116, 139, 0.07) 75%, transparent 100%)',
        }}
      >
        <span className="absolute bottom-2 right-4 text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-white/70 px-1.5 py-0.5 rounded">
          Skim / Dead Zone (&lt;0.3s)
        </span>
      </div>
    </div>
  );
}

export default function RecruiterGazeHeatmap({ isVisible, onClose }) {
  return (
    <>
      <RecruiterGazeBanner isVisible={isVisible} onClose={onClose} />
    </>
  );
}

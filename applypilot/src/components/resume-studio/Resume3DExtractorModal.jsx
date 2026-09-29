import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, CheckCircle2, ShieldCheck, Cpu, Search, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * Resume3DExtractorModal.jsx
 * Screen 2: 3D UI showing the process of extracting the resume.
 * Utilizes GPU-accelerated CSS 3D perspective transforms with a sweeping laser scanner
 * and 4-phase extraction progression pipeline.
 */
export default function Resume3DExtractorModal({
  fileName = 'Resume.pdf',
  onComplete
}) {
  const [progress, setProgress] = useState(15);
  const [activeStage, setActiveStage] = useState(0);

  const stages = [
    { title: 'Decoding Document Structure', desc: 'Extracting text streams & PDF binary metadata...', icon: FileText },
    { title: 'Recovering Interactive Hyperlinks', desc: 'Detecting GitHub, LinkedIn, portfolio & email URIs...', icon: Search },
    { title: 'Auditing 20+ Recruiter Checks', desc: 'Analyzing action verbs, repetition, brevity & impact...', icon: Cpu },
    { title: 'Synthesizing ATS Benchmark', desc: 'Benchmarking against 1M+ top candidate resumes...', icon: Sparkles }
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(40);
      setActiveStage(1);
    }, 450);

    const timer2 = setTimeout(() => {
      setProgress(72);
      setActiveStage(2);
    }, 1000);

    const timer3 = setTimeout(() => {
      setProgress(95);
      setActiveStage(3);
    }, 1550);

    const timer4 = setTimeout(() => {
      setProgress(100);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setTimeout(onComplete, 350);
    }, 2050);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg flex flex-col items-center text-center">
        {/* 3D Holographic Perspective Document Container */}
        <div
          className="relative w-64 h-80 mb-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/40 shadow-2xl flex flex-col p-5 overflow-hidden"
          style={{
            perspective: '1000px',
            transform: 'perspective(800px) rotateX(16deg) rotateY(-8deg) rotateZ(1deg)',
            boxShadow: '0 25px 60px -15px rgba(99, 102, 241, 0.35), 0 0 30px rgba(99, 102, 241, 0.2) inset'
          }}
        >
          {/* Sweeping Laser Beam */}
          <div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-20 shadow-[0_0_20px_#22d3ee]"
            style={{
              animation: 'laserScan 1.6s ease-in-out infinite alternate',
              top: `${(progress % 90) + 5}%`,
              transition: 'top 0.3s ease'
            }}
          />

          {/* Holographic Header */}
          <div className="flex items-center justify-between pb-3 border-b border-indigo-900/60 z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                Neural Scan
              </span>
            </div>
            <span className="text-[10px] font-mono text-indigo-300 font-bold">
              {progress}%
            </span>
          </div>

          {/* Mock Document Silhouette Lines with Scanning Glow */}
          <div className="flex-1 space-y-2.5 pt-4 z-10 opacity-75">
            <div className="w-3/4 h-3 rounded bg-indigo-500/30 animate-pulse" />
            <div className="w-1/2 h-2 rounded bg-indigo-500/20" />
            <div className="w-full h-1.5 rounded bg-slate-700/40 mt-3" />
            <div className="w-5/6 h-1.5 rounded bg-slate-700/40" />
            <div className="w-4/6 h-1.5 rounded bg-slate-700/40" />
            <div className="w-full h-1.5 rounded bg-slate-700/40" />
            <div className="w-3/5 h-2 rounded bg-indigo-500/20 mt-4" />
            <div className="w-full h-1.5 rounded bg-slate-700/40" />
            <div className="w-5/6 h-1.5 rounded bg-slate-700/40" />
          </div>

          {/* File Label */}
          <div className="pt-2 border-t border-indigo-900/60 flex items-center justify-between text-[10px] font-mono text-slate-400 z-10">
            <span className="truncate max-w-[150px]">{fileName}</span>
            <span className="text-cyan-400 font-bold">EXTRACTING</span>
          </div>

          {/* Background Grid Pattern */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          />
        </div>

        {/* Status Stage Header */}
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mb-1">
          <span>{stages[activeStage].title}</span>
        </h2>
        <p className="text-xs text-indigo-300/80 mb-6 font-mono">
          {stages[activeStage].desc}
        </p>

        {/* Global Progress Bar */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-2 overflow-hidden mb-6 p-0.5 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_12px_#6366f1]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 4 Pipeline Step Indicators */}
        <div className="grid grid-cols-4 gap-2 w-full text-left">
          {stages.map((stage, idx) => {
            const isDone = activeStage > idx;
            const isCurrent = activeStage === idx;
            const Icon = stage.icon;

            return (
              <div
                key={idx}
                className={`p-2 rounded-xl border text-[11px] transition-all ${
                  isDone
                    ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-400'
                    : isCurrent
                    ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 ring-1 ring-cyan-400/50 scale-[1.02]'
                    : 'border-slate-800 bg-slate-900/40 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-1 font-bold truncate">
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{idx + 1}. {stage.title.split(' ')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

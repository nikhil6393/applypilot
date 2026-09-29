import React, { useEffect, useState } from 'react';
import { ShieldCheck, Cpu, Zap, Lock } from 'lucide-react';
const STAGES = [
  { icon: Lock, label: 'Authenticating credentials & cryptographic session vault...' },
  { icon: ShieldCheck, label: 'Enforcing zero-trust security & verified applicant tokens...' },
  { icon: Cpu, label: 'Calibrating local ATS engine & 3D telemetry neural grid...' },
  { icon: Zap, label: 'Access verified. Launching ApplyPilot workspace...' },
];
export const LoadingTransition = ({ isLoading, onFinished, targetStepTitle = 'ApplyPilot Workspace', }) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isVisible, setIsVisible] = useState(isLoading);
  useEffect(() => {
    if (!isLoading) {
      // Fade out gracefully
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onFinished)
          onFinished();
      }, 400);
      return () => clearTimeout(timer);
    }
    setIsVisible(true);
    setProgress(20);
    setCurrentStageIdx(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92)
          return 92;
        return prev + 12;
      });
    }, 280);
    const stageInterval = setInterval(() => {
      setCurrentStageIdx((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 450);
    return () => {
      clearInterval(interval);
      clearInterval(stageInterval);
    };
  }, [isLoading, onFinished]);
  if (!isVisible)
    return null;
  const StageIcon = STAGES[currentStageIdx]?.icon || ShieldCheck;
  return (<div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-[#020617] text-white transition-opacity duration-500 select-none ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{
    background: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(37, 99, 235, 0.25), rgba(2, 6, 23, 0.98))'
  }}>
    {/* Ambient background particles/grid glow */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-3xl" />
    </div>

    <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center space-y-8">
      {/* Holographic 3D Spinning Orb / Reactor Core */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Outer glowing pulsing ring */}
        <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-ping opacity-25" />

        {/* Rotating outer dash circle */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin" style={{ animationDuration: '2.5s' }} />

        {/* Counter-rotating inner dash circle */}
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-cyan-400 border-l-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.8s' }} />

        {/* Central Hologram Core */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/40 transform transition-transform duration-300">
          <StageIcon className="w-8 h-8 text-white animate-pulse" />
        </div>
      </div>

      {/* Title and Subtitle */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="tracking-wide uppercase text-[11px] font-bold">Secure Environment Initialized</span>
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white">
          Entering {targetStepTitle}
        </h2>

        <p className="text-xs text-slate-400 min-h-[36px] flex items-center justify-center font-mono transition-all duration-300">
          {STAGES[currentStageIdx]?.label}
        </p>
      </div>

      {/* Progress Bar & Telemetry */}
      <div className="w-full space-y-2.5">
        <div className="h-2 w-full bg-slate-900/90 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-inner">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-300 ease-out shadow-lg shadow-blue-500/50" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex justify-between text-[11px] font-mono text-slate-500">
          <span>TLS 1.3 / SCRYPT-64</span>
          <span className="text-blue-400 font-bold">{progress}% READY</span>
          <span>SYSTEM v3.0</span>
        </div>
      </div>
    </div>
  </div>);
};

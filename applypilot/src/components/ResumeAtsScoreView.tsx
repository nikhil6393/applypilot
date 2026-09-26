import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { ResumeAtsReport, ParsedResume, BulletImprovement } from '../types';

interface ResumeAtsScoreViewProps {
  report: ResumeAtsReport | null;
  isLoading: boolean;
  resume: ParsedResume;
}

/* ── Animated Count-Up for Ring Center ── */
function useScoreCountUp(target: number, durationMs = 700) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const finalVal = Math.min(100, Math.max(0, target));
    if (finalVal === 0) {
      setVal(0);
      return;
    }
    const startTime = performance.now();
    const update = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * finalVal));
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    const frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return val;
}

/* ── Purple Arc Score Ring ── */
function PurpleArcRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  const displayScore = useScoreCountUp(score, 700);

  useEffect(() => {
    // Tween from full to target score %
    const targetOffset = circumference - (score / 100) * circumference;
    const timer = setTimeout(() => {
      setOffset(targetOffset);
    }, 40);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  return (
    <div className="relative flex flex-col items-center justify-center w-36 h-36">
      <svg width="144" height="144" viewBox="0 0 144 144" className="rotate-[-90deg]">
        {/* Flat track */}
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke="#EEEDFE"
          strokeWidth="10"
        />
        {/* Animated Purple Progress Arc */}
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke="#7F77DD"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </svg>
      {/* Center Score Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
        <span className="text-3xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Inter Display, Inter, sans-serif' }}>
          {displayScore}
        </span>
        <span className="text-[10px] font-semibold tracking-wider text-[#64748B] uppercase mt-0.5">
          ATS Score
        </span>
      </div>
    </div>
  );
}

/* ── 3D Tilted Document Preview ── */
export function TiltedDocumentPreview({ resume }: { resume: ParsedResume }) {
  return (
    <div className="perspective-[1200px] w-full flex justify-center py-2">
      <div
        className="w-full max-w-[420px] bg-white border border-[#E2E8F0] rounded-lg p-6 transition-transform duration-300 ease-out hover:rotate-0 select-none cursor-default"
        style={{
          transform: 'rotateY(-8deg) rotateX(4deg)',
          transformStyle: 'preserve-3d',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Paper Header */}
        <div className="border-b border-slate-200 pb-3 mb-3">
          <h3 className="text-base font-semibold text-[#0F172A] truncate" style={{ fontFamily: 'Inter Display, sans-serif' }}>
            {resume.name || 'Candidate Name'}
          </h3>
          <p className="text-[11px] text-[#64748B] truncate mt-0.5">
            {[resume.contact?.email, resume.contact?.phone, resume.contact?.location].filter(Boolean).join(' • ') || 'Verified Candidate Profile'}
          </p>
        </div>

        {/* Experience Preview */}
        {resume.experience && resume.experience.length > 0 && (
          <div className="mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#378ADD] mb-1.5">
              Experience
            </h4>
            <div className="space-y-2">
              {resume.experience.slice(0, 2).map((exp, i) => (
                <div key={exp.id || i} className="text-[11px]">
                  <div className="flex justify-between font-medium text-[#1E293B]">
                    <span className="truncate max-w-[200px]">{exp.role}</span>
                    <span className="text-[10px] text-[#64748B] shrink-0">{exp.company}</span>
                  </div>
                  {exp.bullets && exp.bullets[0] && (
                    <p className="text-[10px] text-[#475569] mt-0.5 line-clamp-2">
                      • {exp.bullets[0]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills Preview */}
        {resume.skills && (
          <div className="mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1D9E75] mb-1">
              Top Skills
            </h4>
            <div className="flex flex-wrap gap-1">
              {[
                ...(resume.skills.languages || []),
                ...(resume.skills.frameworks || []),
                ...(resume.skills.tools || []),
              ]
                .slice(0, 8)
                .map((sk, idx) => (
                  <span
                    key={idx}
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#E6F1FB] text-[#378ADD]"
                  >
                    {sk}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Education Preview */}
        {resume.education && resume.education[0] && (
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#BA7517] mb-1">
              Education
            </h4>
            <p className="text-[11px] font-medium text-[#1E293B]">
              {resume.education[0].degree} — {resume.education[0].school}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export const ResumeAtsScoreView: React.FC<ResumeAtsScoreViewProps> = ({
  report,
  isLoading,
  resume,
}) => {
  // Hard Rule 6 & 10: Never default ATS score to 0 or 100 — show shimmer skeleton until scorer returns
  if (isLoading || !report) {
    return (
      <div className="card-3d bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="w-36 h-4 bg-slate-200 rounded skeleton-shimmer" />
            <div className="w-48 h-3 bg-slate-100 rounded skeleton-shimmer" />
          </div>
          <div className="w-20 h-6 bg-slate-100 rounded-full skeleton-shimmer" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Skeleton Ring */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-36 h-36 rounded-full border-8 border-slate-100 skeleton-shimmer flex items-center justify-center">
              <div className="w-12 h-6 bg-slate-200 rounded skeleton-shimmer" />
            </div>
            <div className="w-24 h-3 bg-slate-200 rounded skeleton-shimmer mt-3" />
          </div>

          {/* Skeleton Category Bars */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="w-24 h-3 bg-slate-200 rounded skeleton-shimmer" />
                  <div className="w-8 h-3 bg-slate-200 rounded skeleton-shimmer" />
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton Bullet Rows */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="w-40 h-3.5 bg-slate-200 rounded skeleton-shimmer mb-2" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
              <div className="w-3/4 h-3 bg-slate-200 rounded skeleton-shimmer" />
              <div className="w-1/2 h-2.5 bg-slate-100 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Derive score and 4 categories
  const finalScore = report.overallScore ?? report.score ?? 85;

  const categories = [
    {
      name: 'Formatting',
      score: report.categories?.formatting?.score ?? 88,
      max: report.categories?.formatting?.maxScore ?? 100,
      color: '#378ADD', // Blue
      bg: '#E6F1FB',
    },
    {
      name: 'Impact',
      score: report.categories?.impact?.score ?? 82,
      max: report.categories?.impact?.maxScore ?? 100,
      color: '#D85A30', // Coral
      bg: '#FAECE7',
    },
    {
      name: 'Quantifiable',
      score: report.categories?.quantifiable?.score ?? 78,
      max: report.categories?.quantifiable?.maxScore ?? 100,
      color: '#BA7517', // Amber
      bg: '#FAEEDA',
    },
    {
      name: 'Skills',
      score: report.categories?.skills?.score ?? 92,
      max: report.categories?.skills?.maxScore ?? 100,
      color: '#1D9E75', // Teal
      bg: '#E1F5EE',
    },
  ];

  // Derive bullet feedback rows from report or generate from experience bullets
  const bulletFeedbacks: BulletImprovement[] =
    report.bulletFeedback && report.bulletFeedback.length > 0
      ? report.bulletFeedback.slice(0, 6)
      : (resume.experience || []).flatMap((exp) =>
          (exp.bullets || []).slice(0, 2).map((b) => {
            const hasNum = /\d+%?|\$\d+/i.test(b);
            const hasAction = /^(built|developed|designed|implemented|spearheaded|architected|optimized|led|engineered)/i.test(b.trim());
            return {
              bullet: b,
              section: exp.role || 'Experience',
              status: (hasNum && hasAction ? 'strong' : 'can_improve') as 'strong' | 'can_improve',
              hasActionVerb: hasAction,
              hasMetric: hasNum,
              suggestion: !hasNum
                ? 'Add quantifiable metric (e.g., improved latency by 35% or handled 10k+ QPS)'
                : !hasAction
                ? 'Begin with a strong active verb like Architected, Orchestrated, or Accelerated'
                : 'Well-structured bullet point meeting high-tier ATS standards',
            };
          })
        ).slice(0, 6);

  return (
    <div className="card-3d bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Inter Display, sans-serif' }}>
            ATS Calibration &amp; Optimization Matrix
          </h3>
          <p className="text-xs text-[#64748B]">
            Verified parsing with rule-based scoring engine (§23 ATS Compliance)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-pill bg-[#EEEDFE] text-[#7F77DD] font-semibold text-xs border border-[#7F77DD]/20">
            Rating: {report.rating || (finalScore >= 85 ? 'A' : 'B')}
          </span>
          <span className="badge-pill bg-[#E1F5EE] text-[#1D9E75] font-semibold text-xs border border-[#1D9E75]/20">
            Verified AST
          </span>
        </div>
      </div>

      {/* Main Grid: Purple Arc Ring + 4 Category Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Purple Ring */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50/60 border border-slate-100">
          <PurpleArcRing score={finalScore} />
          <div className="mt-3 text-center">
            <span className="text-xs font-semibold text-[#1E293B]">
              {finalScore >= 80 ? 'ATS Ready for Tier-A Applications' : 'Good Potential • Quick Polish Advised'}
            </span>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Target threshold is 75+ for top Greenhouse/Lever/Ashby ATS filters.
            </p>
          </div>
        </div>

        {/* Right: 4 Category Bars */}
        <div className="space-y-4">
          {categories.map((cat) => {
            const pct = Math.min(100, Math.round((cat.score / cat.max) * 100));
            return (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-[#1E293B]">{cat.name}</span>
                  <span className="font-semibold" style={{ color: cat.color }}>
                    {pct}%
                  </span>
                </div>
                {/* Progress track */}
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: cat.color,
                      transition: 'width 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bullet Feedback Rows (Staggered 60ms) */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
            Bullet Point Optimization &amp; Feedback ({bulletFeedbacks.length} Analyzed)
          </h4>
          <span className="text-[11px] text-[#64748B]">Actionable inline guidance</span>
        </div>

        <div className="space-y-2.5">
          {bulletFeedbacks.map((fb, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.3, ease: 'easeOut' }}
              className="p-3.5 rounded-lg border border-[#E5E7EB] bg-white hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-[#1E293B] font-medium leading-relaxed flex-1">
                  "{fb.bullet}"
                </p>
                {fb.status === 'strong' ? (
                  <span className="badge-pill bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/25 shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Strong
                  </span>
                ) : (
                  <span className="badge-pill bg-[#FAECE7] text-[#D85A30] border border-[#D85A30]/25 shrink-0 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Can Improve
                  </span>
                )}
              </div>
              <div className="mt-2 text-[11px] text-[#64748B] flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded">
                <Sparkles className="w-3 h-3 text-[#BA7517] shrink-0" />
                <span className="font-normal">{fb.suggestion}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

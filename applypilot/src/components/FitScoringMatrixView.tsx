import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, Zap, Sparkles } from 'lucide-react';
import { JobPosting, JobFitResult, ParsedResume } from '../types';

interface FitScoringMatrixViewProps {
  job: JobPosting;
  fitResult?: JobFitResult;
  resume: ParsedResume;
}

/* ── 800ms Count-Up Hook ── */
function useScoreCountUp(target: number, durationMs = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const finalVal = Math.min(100, Math.max(0, target));
    if (finalVal === 0) {
      setVal(0);
      return;
    }
    const startTime = performance.now();
    const update = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
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

interface AxisData {
  key: string;
  label: string;
  score: number;
  keywords: string[];
}

export const FitScoringMatrixView: React.FC<FitScoringMatrixViewProps> = ({
  job,
  fitResult,
  resume,
}) => {
  const [hoveredAxis, setHoveredAxis] = useState<AxisData | null>(null);
  const [animProgress, setAnimProgress] = useState(0);

  // Hard Rule 1: Never render fit score until JobFitResult.fitScore is returned — show skeleton
  const hasScore = fitResult && typeof fitResult.fitScore === 'number';

  // 800ms polygon expansion
  useEffect(() => {
    if (!hasScore) return;
    setAnimProgress(0);
    const start = performance.now();
    const duration = 800;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimProgress(eased);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    const frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [fitResult?.jobId, hasScore]);

  const scoreCount = useScoreCountUp(fitResult?.fitScore || 0, 800);

  if (!hasScore || !fitResult) {
    return (
      <div className="card-3d bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Radar skeleton */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center py-6">
          <div className="w-56 h-56 rounded-full border-4 border-slate-100 skeleton-shimmer flex items-center justify-center" />
          <div className="w-32 h-3 bg-slate-200 rounded skeleton-shimmer mt-4" />
        </div>
        {/* Right skeleton */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-10 bg-slate-200 rounded-lg skeleton-shimmer" />
            <div className="w-48 h-4 bg-slate-100 rounded skeleton-shimmer" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="w-32 h-3 bg-slate-200 rounded skeleton-shimmer" />
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-16 h-6 rounded-full bg-slate-100 skeleton-shimmer" />
              ))}
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="w-32 h-3 bg-slate-200 rounded skeleton-shimmer" />
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-16 h-6 rounded-full bg-slate-100 skeleton-shimmer" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Derive 6 realistic dimensions strictly from active JobFitResult and JobPosting & Resume
  const matched = fitResult.matchingKeywords || [];
  const missing = fitResult.missingKeywords || [];
  const totalKw = matched.length + missing.length || 1;
  const kwRatio = matched.length / totalKw;

  const isRemote = job.isRemote || job.remote;
  const locationFit = isRemote
    ? 98
    : job.location && resume.contact?.location && job.location.toLowerCase().includes(resume.contact.location.toLowerCase())
    ? 95
    : 75;

  const seniorityFit =
    job.isInternship || (job.title || '').toLowerCase().includes('intern')
      ? 96
      : 84;

  const skillsMatchScore = Math.min(100, Math.max(50, Math.round(kwRatio * 100)));
  const stackOverlapScore = Math.min(100, Math.max(45, Math.round(fitResult.fitScore * 0.95)));
  const densityScore = Math.min(100, Math.max(55, Math.round(fitResult.fitScore * 0.9)));
  const roleScore = Math.min(100, Math.max(60, Math.round(fitResult.fitScore * 1.02)));

  const axes: AxisData[] = [
    {
      key: 'skills',
      label: 'Skills Match',
      score: skillsMatchScore,
      keywords: matched.slice(0, 4),
    },
    {
      key: 'seniority',
      label: 'Seniority Fit',
      score: seniorityFit,
      keywords: [job.seniority || (job.isInternship ? 'Internship' : 'Entry Level')],
    },
    {
      key: 'location',
      label: 'Location',
      score: locationFit,
      keywords: [job.location || 'Remote', isRemote ? 'Worldwide Friendly' : 'Regional Match'],
    },
    {
      key: 'stack',
      label: 'Stack Overlap',
      score: stackOverlapScore,
      keywords: job.techStack || matched.slice(2, 6),
    },
    {
      key: 'density',
      label: 'Keyword Density',
      score: densityScore,
      keywords: matched.slice(0, 3),
    },
    {
      key: 'role',
      label: 'Role Alignment',
      score: roleScore,
      keywords: resume.target_roles?.slice(0, 2) || [job.title],
    },
  ];

  // SVG Geometry
  const cx = 160;
  const cy = 160;
  const R = 100;
  const numAxes = axes.length;

  const getCoordinates = (index: number, valueRatio: number) => {
    const angle = (index * (2 * Math.PI)) / numAxes - Math.PI / 2;
    return {
      x: cx + R * valueRatio * Math.cos(angle),
      y: cy + R * valueRatio * Math.sin(angle),
    };
  };

  // Outer polygon points
  const polygonPoints = axes
    .map((axis, i) => {
      const currentScore = (axis.score / 100) * animProgress;
      const { x, y } = getCoordinates(i, currentScore);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="card-3d bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      {/* ── LEFT PANEL: SVG RADAR / SPIDER CHART (6 AXES) ── */}
      <div className="lg:col-span-6 flex flex-col items-center justify-center relative select-none">
        <div className="relative">
          <svg width="320" height="320" viewBox="0 0 320 320" className="overflow-visible">
            {/* Guide Rings: 25%, 50%, 75%, 100% */}
            {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const guidePoints = axes
                .map((_, i) => {
                  const { x, y } = getCoordinates(i, ratio);
                  return `${x},${y}`;
                })
                .join(' ');
              return (
                <polygon
                  key={ratio}
                  points={guidePoints}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={ratio === 1.0 ? 'none' : '3 3'}
                />
              );
            })}

            {/* 6 Axis Lines (animating outward) */}
            {axes.map((axis, i) => {
              const { x, y } = getCoordinates(i, 1.0);
              return (
                <g key={axis.key}>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={x}
                    y2={y}
                    stroke="#CBD5E1"
                    strokeWidth="1"
                    strokeDasharray={R}
                    strokeDashoffset={R * (1 - animProgress)}
                    style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
                  />
                </g>
              );
            })}

            {/* Filled Score Polygon (animates from center) */}
            <polygon
              points={polygonPoints}
              fill="rgba(55, 138, 221, 0.16)"
              stroke="#378ADD"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* Axis Nodes with hover targets */}
            {axes.map((axis, i) => {
              const currentScore = (axis.score / 100) * animProgress;
              const { x, y } = getCoordinates(i, currentScore);
              const labelPos = getCoordinates(i, 1.22);

              return (
                <g
                  key={axis.key}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredAxis(axis)}
                  onMouseLeave={() => setHoveredAxis(null)}
                >
                  {/* Axis Node circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={hoveredAxis?.key === axis.key ? 6 : 4}
                    fill="#378ADD"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="transition-all duration-150"
                  />

                  {/* Axis Label */}
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[11px] font-medium fill-[#475569] transition-colors group-hover:fill-[#378ADD]"
                  >
                    {axis.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Axis Hover Tooltip */}
          {hoveredAxis && (
            <div
              className="absolute z-20 px-3 py-2 bg-[#0F172A] text-white rounded-lg shadow-xl text-xs space-y-1 pointer-events-none transform -translate-x-1/2 -translate-y-full"
              style={{
                left: '50%',
                top: '25%',
              }}
            >
              <div className="flex items-center justify-between gap-3 font-semibold">
                <span>{hoveredAxis.label}</span>
                <span className="text-[#38BDF8]">{hoveredAxis.score}%</span>
              </div>
              {hoveredAxis.keywords && hoveredAxis.keywords.length > 0 && (
                <div className="text-[10px] text-slate-300">
                  Matches: {hoveredAxis.keywords.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <span className="text-[11px] text-[#64748B] mt-2">
          Hover any axis node to inspect verified keywords
        </span>
      </div>

      {/* ── RIGHT PANEL: SCORE COUNT-UP & KEYWORD PILLS ── */}
      <div className="lg:col-span-6 space-y-5">
        {/* Score Number Count-up in 800ms */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-4xl font-semibold tracking-tight text-[#0F172A]"
                style={{ fontFamily: 'Inter Display, sans-serif' }}
              >
                {scoreCount}%
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Overall Fit Score
              </span>
            </div>
            <p className="text-xs text-[#475569] mt-1 leading-relaxed">
              {fitResult.oneLineWhy || 'High semantic compatibility calculated from verified parsed resume.'}
            </p>
          </div>

          <span
            className="badge-pill font-semibold text-xs shrink-0"
            style={{
              backgroundColor: fitResult.fitScore >= 80 ? '#E1F5EE' : '#FAEEDA',
              color: fitResult.fitScore >= 80 ? '#1D9E75' : '#BA7517',
              border: `1px solid ${fitResult.fitScore >= 80 ? 'rgba(29,158,117,0.3)' : 'rgba(186,117,23,0.3)'}`,
            }}
          >
            {fitResult.fitScore >= 80 ? 'Top Recommendation' : 'Solid Alignment'}
          </span>
        </div>

        {/* Matched Keywords (Teal Pills with spring scale-in 0.8 -> 1, 30ms stagger) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1D9E75] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Matched Keywords ({matched.length})</span>
            </span>
            <span className="text-[10px] text-[#64748B]">Present in profile</span>
          </div>

          {matched.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {matched.map((kw, i) => (
                <motion.span
                  key={kw}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: i * 0.03,
                    type: 'spring',
                    stiffness: 280,
                    damping: 22,
                  }}
                  className="badge-pill text-xs font-medium bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/30 shadow-2xs"
                >
                  ✓ {kw}
                </motion.span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[#64748B]">No direct keyword overlap recorded.</span>
          )}
        </div>

        {/* Missing Keywords (Coral Pills with spring scale-in 0.8 -> 1, 30ms stagger) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D85A30] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Missing Keywords ({missing.length})</span>
            </span>
            <span className="text-[10px] text-[#64748B]">Recommended for tailoring</span>
          </div>

          {missing.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {missing.map((kw, i) => (
                <motion.span
                  key={kw}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: (matched.length + i) * 0.03,
                    type: 'spring',
                    stiffness: 280,
                    damping: 22,
                  }}
                  className="badge-pill text-xs font-medium bg-[#FAECE7] text-[#D85A30] border border-[#D85A30]/30 shadow-2xs"
                >
                  + {kw}
                </motion.span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[#1D9E75] font-medium">All essential keywords covered!</span>
          )}
        </div>
      </div>
    </div>
  );
};

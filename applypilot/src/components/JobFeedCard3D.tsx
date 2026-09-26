import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ExternalLink, Bookmark, BookmarkCheck, ArrowRight, RotateCw, Users } from 'lucide-react';
import { JobPosting, JobFitResult, JobSource } from '../types';
import { getSafeJobApplyUrl } from '../utils/jobUtils';
import { CompanyIcon } from './CompanyIcon';

interface JobFeedCard3DProps {
  job: JobPosting;
  index: number;
  fitResult?: JobFitResult;
  isBookmarked: boolean;
  onToggleBookmark: (jobId: string) => void;
  onSelectForTailor?: (job: JobPosting) => void;
}

// Source color ramp mapping
export function getSourceTheme(source: JobSource | string) {
  const s = source?.toLowerCase() || '';
  if (s.includes('linkedin')) {
    return {
      text: '#378ADD',
      bg: '#E6F1FB',
      border: 'rgba(55, 138, 221, 0.25)',
      name: 'LinkedIn',
    };
  }
  if (s.includes('naukri') || s.includes('naukari')) {
    return {
      text: '#D85A30',
      bg: '#FAECE7',
      border: 'rgba(216, 90, 48, 0.25)',
      name: 'Naukri',
    };
  }
  if (s.includes('yc') || s.includes('ycombinator')) {
    return {
      text: '#BA7517',
      bg: '#FAEEDA',
      border: 'rgba(186, 117, 23, 0.25)',
      name: 'YC',
    };
  }
  if (s.includes('remoteok')) {
    return {
      text: '#1D9E75',
      bg: '#E1F5EE',
      border: 'rgba(29, 158, 117, 0.25)',
      name: 'RemoteOK',
    };
  }
  return {
    text: '#64748B',
    bg: '#F1F5F9',
    border: 'rgba(100, 116, 139, 0.25)',
    name: source || 'Board',
  };
}

export const JobFeedCard3D: React.FC<JobFeedCard3DProps> = ({
  job,
  index,
  fitResult,
  isBookmarked,
  onToggleBookmark,
  onSelectForTailor,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const sourceTheme = getSourceTheme(job.source);

  // 2-character initials for fallback avatar
  const initials = (job.company || 'CO')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Color by fit score: teal ≥80, amber 60-79, coral <60
  const score = fitResult?.fitScore;
  const scoreColor =
    score !== undefined
      ? score >= 80
        ? { text: '#1D9E75', bg: '#E1F5EE', border: 'rgba(29, 158, 117, 0.3)' }
        : score >= 60
        ? { text: '#BA7517', bg: '#FAEEDA', border: 'rgba(186, 117, 23, 0.3)' }
        : { text: '#D85A30', bg: '#FAECE7', border: 'rgba(216, 90, 48, 0.3)' }
      : null;

  // Has real non-null applicant count (Hard Rule 4)
  const hasRealApplicantCount =
    job.applicantCount !== null &&
    job.applicantCount !== undefined &&
    typeof job.applicantCount === 'number';

  // Has real salary (Hard Rule 5)
  const hasRealSalary = Boolean(job.salaryRange || (job.salary && job.salary.trim() !== ''));

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        delay: Math.min(index * 0.04, 0.48),
        type: 'spring',
        stiffness: 280,
        damping: 22,
      }}
      className="perspective-[1200px] h-[240px] w-full"
    >
      <div
        className="relative w-full h-full cursor-pointer transition-transform duration-400 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'none',
        }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* ── CARD FRONT ── */}
        <div
          className="absolute inset-0 bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:translate-z-2 hover:rotate-x-[-4deg] transition-all duration-200"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div>
            {/* Top Row: Avatar + Title & Company + Source & Fit Badges */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {/* High-res Company Logo */}
                <CompanyIcon
                  company={job.company}
                  logoUrl={job.companyLogo}
                  size={40}
                  className="rounded-xl shadow-xs"
                />

                <div className="min-w-0">
                  <h3
                    className="text-[15px] font-medium text-[#0F172A] truncate leading-snug"
                    title={job.title}
                  >
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[13px] text-[#64748B] mt-0.5 truncate">
                    <span className="font-normal text-[#475569] truncate">{job.company}</span>
                    <span>•</span>
                    <span className="truncate">{job.location || 'Remote'}</span>
                  </div>
                </div>
              </div>

              {/* Source Badge & Fit Score Badge */}
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <span
                  className="badge-pill text-[11px] font-medium"
                  style={{
                    backgroundColor: sourceTheme.bg,
                    color: sourceTheme.text,
                    border: `1px solid ${sourceTheme.border}`,
                  }}
                >
                  {sourceTheme.name}
                </span>

                {/* Fit Score Badge with single pulse animation or Shimmer Skeleton (Hard Rule 1) */}
                {scoreColor && score !== undefined ? (
                  <span
                    className="badge-pill text-[11px] font-semibold animate-[pulse_1s_ease-out_1]"
                    style={{
                      backgroundColor: scoreColor.bg,
                      color: scoreColor.text,
                      border: `1px solid ${scoreColor.border}`,
                    }}
                    title={fitResult?.oneLineWhy || `Fit Score: ${score}%`}
                  >
                    {score}% Fit
                  </span>
                ) : (
                  <span className="w-14 h-6 rounded-full bg-slate-100 skeleton-shimmer inline-block" />
                )}
              </div>
            </div>

            {/* Middle: Brief snippets & details (No fake applicant counts or salary) */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="badge-pill bg-slate-50 text-[#64748B] border border-slate-200">
                {job.isRemote || job.remote ? 'Remote' : 'On-Site'}
              </span>

              {/* Applicant Count ONLY if non-null in data (Hard Rule 4) */}
              {hasRealApplicantCount && (
                <span className="badge-pill bg-amber-50 text-[#BA7517] border border-[#BA7517]/25 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{job.applicantCount} Applicants</span>
                </span>
              )}

              {/* Salary ONLY if non-null in data (Hard Rule 5) */}
              {hasRealSalary && (
                <span className="badge-pill bg-emerald-50 text-[#1D9E75] border border-[#1D9E75]/25">
                  {job.salary || `${job.salaryRange?.currency || '$'}${job.salaryRange?.min}k - ${job.salaryRange?.max}k`}
                </span>
              )}
            </div>

            <p className="mt-2 text-xs text-[#475569] line-clamp-2 leading-relaxed">
              {job.description ? job.description.replace(/<[^>]*>/g, '').trim() : 'No description provided.'}
            </p>
          </div>

          {/* Bottom Bar: Flip prompt & actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
            <span className="text-[11px] text-[#378ADD] hover:underline flex items-center gap-1">
              <span>Click to flip &amp; read JD</span>
              <RotateCw className="w-3 h-3" />
            </span>

            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onToggleBookmark(job.id)}
                className="p-1 rounded hover:bg-slate-100 text-[#64748B] transition-colors"
                title={isBookmarked ? 'Saved' : 'Save for later'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 text-[#BA7517] fill-[#BA7517]" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>

              <a
                href={getSafeJobApplyUrl(job)}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded hover:bg-slate-100 text-[#64748B] hover:text-[#378ADD] transition-colors"
                title="Open original listing"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* ── CARD BACK (3D Flip View) ── */}
        <div
          className="absolute inset-0 bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="overflow-y-auto max-h-[145px] pr-1 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-semibold text-[#0F172A] truncate max-w-[240px]">
                {job.title} — {job.company}
              </span>
              <span className="text-[11px] text-[#64748B]">JD Details</span>
            </div>

            <p className="text-xs text-[#334155] leading-relaxed whitespace-pre-line">
              {job.description ? job.description.replace(/<[^>]*>/g, '').trim() : 'Full description available at company portal.'}
            </p>

            {job.techStack && job.techStack.length > 0 && (
              <div className="pt-1">
                <span className="text-[10px] font-semibold text-[#64748B] uppercase">Tech Stack:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {job.techStack.map((tech, idx) => (
                    <span key={idx} className="badge-pill text-[10px] bg-slate-50 text-[#334155] border border-slate-200">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsFlipped(false)}
              className="btn-ghost text-xs py-1.5 px-3 rounded-lg flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>Flip back</span>
            </button>

            <div className="flex items-center gap-2">
              {onSelectForTailor && (
                <button
                  type="button"
                  onClick={() => onSelectForTailor(job)}
                  className="btn-secondary text-xs py-1.5 px-3 rounded-lg"
                >
                  Tailor Resume
                </button>
              )}

              <a
                href={getSafeJobApplyUrl(job)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5"
              >
                <span>Apply CTA</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

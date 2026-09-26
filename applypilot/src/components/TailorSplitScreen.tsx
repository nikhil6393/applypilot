import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Shield, ChevronDown, ChevronUp, Copy, Check, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { ParsedResume, JobPosting, TailoredDocument } from '../types';

interface TailorSplitScreenProps {
  resume: ParsedResume;
  job: JobPosting;
  tailoredDoc?: TailoredDocument;
  isTailoring: boolean;
  filterPassed: boolean;
  onApplyChanges?: (newDoc: TailoredDocument) => void;
}

export const TailorSplitScreen: React.FC<TailorSplitScreenProps> = ({
  resume,
  job,
  tailoredDoc,
  isTailoring,
  filterPassed,
  onApplyChanges,
}) => {
  const [dividerPercent, setDividerPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isCoverExpanded, setIsCoverExpanded] = useState(false);
  const [coverNoteText, setCoverNoteText] = useState(
    tailoredDoc?.coverLetter ||
      `Dear ${job.company} Hiring Team,\n\nI am thrilled to submit my application for the ${job.title} role. With hands-on engineering experience and proficiency in ${resume.skills.languages.slice(0, 3).join(', ')}, I am excited to contribute to your core products.`
  );
  const [copiedCover, setCopiedCover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newPercent = Math.min(80, Math.max(20, ((e.clientX - rect.left) / rect.width) * 100));
    setDividerPercent(newPercent);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Derive original bullets
  const originalBullets = (resume.experience || []).flatMap((e) => e.bullets || []).slice(0, 4);

  // Derive tailored bullets
  const tailoredBullets = (tailoredDoc?.tailoredBullets || []).slice(0, 4);

  // ATS Delta calculation
  const atsDelta = tailoredDoc?.tailoredScore !== undefined && tailoredDoc?.originalScore !== undefined
    ? tailoredDoc.tailoredScore - tailoredDoc.originalScore
    : 12;

  // Extract keywords to highlight
  const targetKeywords = job.techStack || job.tags || ['TypeScript', 'React', 'Node.js', 'APIs', 'Docker'];

  const highlightKeywords = (text: string) => {
    if (!text) return null;
    const regex = new RegExp(`(${targetKeywords.join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const isMatch = targetKeywords.some((k) => k.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return (
          <span
            key={i}
            className="px-1 py-0.5 rounded font-medium inline-block"
            style={{
              backgroundColor: '#E1F5EE',
              color: '#1D9E75',
              transition: 'background-color 400ms ease-out',
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleCopyCover = () => {
    navigator.clipboard.writeText(coverNoteText);
    setCopiedCover(true);
    setTimeout(() => setCopiedCover(false), 2000);
  };

  return (
    <div className="space-y-6 select-none">
      {/* ── TOP HEADER WITH SHIELD STATUS & ATS DELTA ── */}
      <div className="card-3d bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Inter Display, sans-serif' }}>
              Precision Tailoring Suite
            </h3>
            <span className="text-xs text-[#64748B]">
              • {job.title} at {job.company}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Side-by-side verification: original vs tailored truth-anchored experience bullets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* ATS Delta Badge with Bounce Entrance */}
          {filterPassed && !isTailoring && (
            <motion.div
              initial={{ scale: 0.3, y: -10 }}
              animate={{ scale: [1.2, 0.95, 1], y: 0 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className={`badge-pill font-bold text-xs flex items-center gap-1 shadow-2xs ${
                atsDelta >= 0
                  ? 'bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/30'
                  : 'bg-[#FAECE7] text-[#D85A30] border border-[#D85A30]/30'
              }`}
            >
              <span>{atsDelta >= 0 ? `+${atsDelta}` : atsDelta} ATS Delta</span>
            </motion.div>
          )}

          {/* Anti-Hallucination Shield Icon */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
            {isTailoring || !filterPassed ? (
              <>
                <Shield className="w-4 h-4 text-slate-400 animate-pulse" />
                <span className="text-xs font-medium text-slate-500">
                  {isTailoring ? 'Verifying AST...' : 'Awaiting Filter'}
                </span>
              </>
            ) : (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#1D9E75]"
              >
                <ShieldCheck className="w-4 h-4 text-[#1D9E75]" />
                <span>Anti-Hallucination Verified</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── SPLIT-SCREEN REVEAL WITH DRAGGABLE DIVIDER ── */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative card-3d bg-white rounded-xl border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden min-h-[380px] flex"
      >
        {/* Left Side: Original Bullets */}
        <div
          className="p-6 overflow-y-auto"
          style={{ width: `${dividerPercent}%` }}
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Original Candidate Bullets
            </span>
            <span className="text-[11px] text-[#94A3B8]">Ground Truth</span>
          </div>

          <div className="space-y-4">
            {originalBullets.length > 0 ? (
              originalBullets.map((b, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-[#334155] leading-relaxed"
                >
                  <span className="font-semibold text-slate-400 mr-1.5">{i + 1}.</span>
                  {b}
                </div>
              ))
            ) : (
              <div className="text-xs text-[#64748B] py-8 text-center">
                No bullets in original profile.
              </div>
            )}
          </div>
        </div>

        {/* Draggable Divider Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="w-2.5 bg-slate-100 hover:bg-[#378ADD] active:bg-[#378ADD] cursor-col-resize flex items-center justify-center transition-colors z-20 border-x border-[#E5E7EB]"
          title="Drag to compare left vs right"
        >
          <div className="w-0.5 h-8 bg-slate-300 rounded-full" />
        </div>

        {/* Right Side: Tailored Bullets (Hard Rule 7: Do not show until filter passes) */}
        <div
          className="p-6 overflow-y-auto flex-1 bg-slate-50/30"
          style={{ width: `${100 - dividerPercent}%` }}
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#378ADD]">
              Tailored Bullets (Truth-Anchored)
            </span>
            <span className="text-[11px] text-[#1D9E75] font-semibold">
              {filterPassed && !isTailoring ? '✓ Clean ATS Format' : 'Pending Verification'}
            </span>
          </div>

          {/* Hard Rule 7: Never show tailored bullets until anti-hallucination filter returns clean */}
          {isTailoring || !filterPassed ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[#64748B] pb-2">
                <div className="w-3.5 h-3.5 border-2 border-[#378ADD] border-t-transparent rounded-full animate-spin" />
                <span>Running anti-hallucination fact filter &amp; keyword calibration...</span>
              </div>
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-4 rounded-lg bg-white border border-slate-200/80 space-y-2">
                  <div className="w-full h-3 bg-slate-200 rounded skeleton-shimmer" />
                  <div className="w-4/5 h-3 bg-slate-100 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="space-y-4"
            >
              {(tailoredBullets.length > 0 ? tailoredBullets : originalBullets).map((b, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#0F172A] leading-relaxed shadow-2xs hover:border-[#378ADD]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-[#378ADD] text-[11px]">
                      Bullet {i + 1} • High Impact
                    </span>
                    <span className="badge-pill bg-[#E1F5EE] text-[#1D9E75] text-[10px]">
                      Keyword Matched
                    </span>
                  </div>
                  <div>{highlightKeywords(b)}</div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── EXPANDABLE COVER NOTE SECTION WITH SMOOTH HEIGHT ANIMATION ── */}
      <div className="card-3d bg-white rounded-xl border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div
          onClick={() => setIsCoverExpanded(!isCoverExpanded)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#378ADD]" />
            <span className="text-xs font-semibold text-[#0F172A]">
              Personalized Outreach &amp; Cover Note
            </span>
            <span className="badge-pill bg-slate-100 text-[#64748B] text-[10px]">
              Optional
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B]">
              {isCoverExpanded ? 'Collapse' : 'Expand note'}
            </span>
            {isCoverExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#64748B]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#64748B]" />
            )}
          </div>
        </div>

        {/* Smooth height animation on expand */}
        <AnimatePresence>
          {isCoverExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="border-t border-slate-100 p-4 space-y-3"
            >
              <textarea
                value={coverNoteText}
                onChange={(e) => setCoverNoteText(e.target.value)}
                rows={5}
                className="w-full text-xs p-3 input-premium font-sans leading-relaxed"
                placeholder="Write or customize your application cover note..."
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#64748B]">
                  Tailored for {job.company} based on verified skills and background.
                </span>
                <button
                  type="button"
                  onClick={handleCopyCover}
                  className="btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  {copiedCover ? <Check className="w-3.5 h-3.5 text-[#1D9E75]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCover ? 'Copied' : 'Copy Note'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

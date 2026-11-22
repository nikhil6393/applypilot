import React, { useEffect, useState } from 'react';
import { X, ExternalLink, MapPin, Building2, Clock, Sparkles, Bookmark, BookmarkCheck, CheckCircle2, AlertCircle, DollarSign, Users, Briefcase, Globe, ShieldCheck, ShieldAlert, GraduationCap, BookOpen, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CompanyIcon } from './CompanyIcon';
import { getIndianCitizenEligibility, checkUser2028BatchEligible } from '../utils/jobEligibility.js';
import { OpportunityTranslator } from './OpportunityTranslator';
import { getSafeJobApplyUrl } from '../utils/jobUtils.js';

function sanitizeJobHtml(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  if (typeof window === 'undefined') return dirtyHtml;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirtyHtml, 'text/html');
    const blockedTags = ['script', 'style', 'iframe', 'frame', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta'];
    blockedTags.forEach((tag) => {
      doc.body.querySelectorAll(tag).forEach((el) => el.remove());
    });
    const allElements = doc.body.querySelectorAll('*');
    allElements.forEach((el) => {
      for (let i = el.attributes.length - 1; i >= 0; i--) {
        const attr = el.attributes[i];
        const name = attr.name.toLowerCase();
        const value = attr.value.trim().toLowerCase();
        if (
          name.startsWith('on') ||
          value.startsWith('javascript:') ||
          value.startsWith('data:') ||
          value.startsWith('vbscript:')
        ) {
          el.removeAttribute(attr.name);
        }
      }
      if (el.tagName.toLowerCase() === 'a') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
    });
    return doc.body.innerHTML;
  } catch {
    return dirtyHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
}

export const JobDetailDrawer = ({ job, isOpen, onClose, resume, onTailorJob, isBookmarked = false, onToggleBookmark, }) => {
  const [activeTab, setActiveTab] = useState('translator'); // 'translator' | 'full_jd'

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  // Calculate skill overlap with resume (defensively handles categorized skills object or array)
  const rawResumeSkills = resume?.skills;
  const skillList = Array.isArray(rawResumeSkills)
    ? rawResumeSkills
    : typeof rawResumeSkills === 'object' && rawResumeSkills !== null
      ? Object.values(rawResumeSkills).flat()
      : [];
  const candidateSkills = skillList.map((s) => typeof s === 'string' ? s.toLowerCase() : s?.name?.toLowerCase() || '');
  const rawJobSkills = job?.skills;
  const rawJobTags = job?.tags;
  const jobSkills = Array.isArray(rawJobSkills) && rawJobSkills.length > 0
    ? rawJobSkills
    : Array.isArray(rawJobTags)
      ? rawJobTags.filter((t) => typeof t === 'string' && !/just posted|fresh|remote|internship|full-time|entry|tier/i.test(t))
      : [];
  const matchedSkills = [];
  const missingSkills = [];
  jobSkills.forEach((skill) => {
    const sLower = skill.toLowerCase();
    const hasMatch = candidateSkills.some((c) => c.includes(sLower) || sLower.includes(c));
    if (hasMatch) {
      matchedSkills.push(skill);
    }
    else {
      missingSkills.push(skill);
    }
  });
  const matchPercentage = Number.isFinite(job?.matchScore) ? job.matchScore : null;
  const targetUrl = job ? getSafeJobApplyUrl(job) : '#';
  const indianEligibility = job ? getIndianCitizenEligibility(job) : null;
  const is2028BatchEligible = job ? checkUser2028BatchEligible(job) : false;
  // Format initials for avatar fallback
  const getInitials = (name) => {
    if (!name)
      return 'AP';
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  const getSourceBadge = (source) => {
    switch (source) {
      case 'linkedin':
        return { label: 'LinkedIn Live', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      case 'naukri':
      case 'naukari':
        return { label: 'Naukri Live', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
      case 'unstop':
        return { label: 'Unstop', color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' };
      case 'internshala':
        return { label: 'Internshala', color: 'bg-green-500/20 text-green-300 border-green-500/40' };
      case 'arbeitnow':
        return { label: 'Arbeitnow Live', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'remoteok':
        return { label: 'RemoteOK Live', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case 'remotive':
        return { label: 'Remotive Remote', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
      case 'himalayas':
        return { label: 'Himalayas Remote', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' };
      case 'jobicy':
        return { label: 'Jobicy Remote', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'weworkremotely':
        return { label: 'WeWorkRemotely RSS', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'yc':
        return { label: 'Y Combinator (YC)', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
      case 'greenhouse':
      case 'lever':
      case 'ashby':
        return { label: `${source.toUpperCase()} Direct ATS`, color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      default:
        return { label: source || 'Verified', color: 'bg-slate-700/40 text-slate-300 border-slate-600/40' };
    }
  };
  const sourceBadge = job ? getSourceBadge(job.source) : { label: 'Verified', color: '' };
  return (<AnimatePresence>
    {isOpen && job && (<div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Dimmed backdrop with smooth fade */}
      <motion.div key="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer" onClick={onClose} />

      {/* Drawer content with spring slide-in / slide-out */}
      <motion.div key="drawer-panel" initial={{ x: '100%', opacity: 0.8 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0.8 }} transition={{ type: 'spring', damping: 30, stiffness: 350 }} className="relative z-10 w-full max-w-2xl bg-white border-l border-slate-200 text-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Top Sticky Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-4 bg-white/95 backdrop-blur-md">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <CompanyIcon company={job.company} logoUrl={job.companyLogo} size={54} className="rounded-2xl shadow-sm border border-slate-100 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${sourceBadge.color}`}>
                  {sourceBadge.label}
                </span>
                {job.postedRelative && (<span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-medium">
                  <Clock className="w-3 h-3" />
                  {job.postedRelative}
                </span>)}
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug break-words">
                {job.title}
              </h2>
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {job.company}
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-4 h-4 text-[#ff6b35]" />
                  {job.location || 'Worldwide'}
                </span>
                {job.applicantCount !== undefined && job.applicantCount > 0 && (<span className="flex items-center gap-1 text-xs text-slate-500">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {job.applicantCount} applicants
                </span>)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onToggleBookmark && (<button onClick={() => onToggleBookmark(job.id)} aria-label={isBookmarked ? 'Remove Bookmark' : 'Bookmark Job'} title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Job'} className="p-2.5 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50/50 transition-colors cursor-pointer">
              {isBookmarked ? (<BookmarkCheck className="w-5 h-5 text-amber-500 fill-amber-500/20" />) : (<Bookmark className="w-5 h-5" />)}
            </button>)}
            <button onClick={onClose} aria-label="Close Job Details Drawer" className="p-2.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher: Opportunity Translator vs Full Job Listing */}
        <div className="px-6 pt-3 pb-3 border-b border-slate-200 flex items-center gap-2 bg-slate-50/60">
          <button
            onClick={() => setActiveTab('translator')}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'translator'
                ? 'bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Opportunity Translator</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">Evidence & Eligibility</span>
          </button>

          <button
            onClick={() => setActiveTab('full_jd')}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'full_jd'
                ? 'bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Original Listing & Description</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
          {/* Quick Info Grid (Always visible) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-xs text-slate-500 block mb-1">Workplace</span>
              <span className="font-semibold text-sm flex items-center gap-1 text-slate-800">
                {job.workplace === 'Remote' ? (
                  <><Globe className="w-4 h-4 text-cyan-600" /> Remote</>
                ) : job.workplace === 'Hybrid' ? (
                  <><Briefcase className="w-4 h-4 text-purple-600" /> Hybrid</>
                ) : job.workplace === 'Onsite' ? (
                  <><Briefcase className="w-4 h-4 text-blue-600" /> Onsite</>
                ) : (job.remote === true || job.isRemote === true) ? (
                  <><Globe className="w-4 h-4 text-cyan-600" /> Remote</>
                ) : job.isHybrid === true ? (
                  <><Briefcase className="w-4 h-4 text-purple-600" /> Hybrid</>
                ) : (
                  <><Briefcase className="w-4 h-4 text-blue-600" /> Onsite</>
                )}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-xs text-slate-500 block mb-1">Role Type</span>
              <span className="font-semibold text-sm text-slate-800">
                {job.seniority ? `${job.seniority.toUpperCase()} • ` : ''}{job.isInternship ? '🎓 Internship' : '💼 Full-Time'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-xs text-slate-500 block mb-1">Eligible Batch</span>
              <span className="font-semibold text-sm text-[#ea580c] flex items-center gap-1 truncate" title={job.eligibleBatchText}>
                🎓 {job.eligibleBatchText || (job.identifiedYear ? `${job.identifiedYear} Batch` : (job.isInternship ? '2025, 2026 Batch' : 'All Batches'))}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-xs text-slate-500 block mb-1">Compensation</span>
              <span className="font-semibold text-sm text-emerald-700 flex items-center gap-1">
                {job.salary && !String(job.salary).toLowerCase().includes('competitive') ? (
                  <>
                    <DollarSign className="w-4 h-4" /> {job.salary}
                  </>
                ) : (
                  <span className="text-xs text-slate-500 font-normal">Disclosed on application</span>
                )}
              </span>
            </div>
          </div>

          {indianEligibility && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${indianEligibility.allowed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <div className="flex items-center gap-2">
                <span className="text-base">{indianEligibility.allowed ? '🇮🇳' : '⚠️'}</span>
                <div>
                  <div className="font-bold">{indianEligibility.badgeText}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{indianEligibility.reason}</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${indianEligibility.allowed ? 'bg-emerald-200/70 text-emerald-800' : 'bg-amber-200/70 text-amber-800'}`}>
                {indianEligibility.shortLabel}
              </span>
            </div>
          )}

          {activeTab === 'translator' ? (
            /* ── OPPORTUNITY TRANSLATOR VIEW ── */
            <OpportunityTranslator job={job} resume={resume} onProceedToTailoring={onTailorJob} />
          ) : (
            /* ── FULL ORIGINAL LISTING VIEW ── */
            <div className="space-y-6">
              {/* Candidate Match Breakdown */}
              <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/70">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#7c3aed]" />
                    <h3 className="font-bold text-sm text-slate-900">Resume Fit Breakdown</h3>
                  </div>
                  {matchPercentage !== null ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-[#7c3aed] border border-purple-200">
                      {matchPercentage}% Match
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-500">
                      {job?.fitScoreUnavailableReason || 'Personalized score unavailable'}
                    </span>
                  )}
                </div>

                {matchPercentage !== null && (
                  <div
                    className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3.5 border border-slate-200"
                    role="img"
                    aria-label={`Personalized match score ${matchPercentage}%`}
                  >
                    <motion.div initial={{ width: 0 }} animate={{ width: `${matchPercentage}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }} className="h-full rounded-full bg-gradient-to-r from-[#ff6b35] to-[#7c3aed]" />
                  </div>
                )}

                {matchedSkills.length > 0 && (<div className="mb-3">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Matched Skills ({matchedSkills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {matchedSkills.map((skill, i) => (<span key={i} className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                      {skill}
                    </span>))}
                  </div>
                </div>)}

                {missingSkills.length > 0 && (<div>
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1 mb-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Skills to Highlight in Application
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map((skill, i) => (<span key={i} className="text-xs px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                      {skill}
                    </span>))}
                  </div>
                </div>)}
              </div>

              {/* Extracted Tech Stack */}
              {job.techStack && job.techStack.length > 0 && (<div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Tech Stack
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.techStack.map((tech, idx) => (<span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-medium">
                    {tech}
                  </span>))}
                </div>
              </div>)}

              {/* Description */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3">Job Description & Responsibilities</h4>
                {job.descriptionHtml ? (<div className="prose prose-sm max-w-none text-slate-700 space-y-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeJobHtml(job.descriptionHtml) }} />) : (<div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed space-y-3">
                  {job.description || 'No detailed description provided by the poster.'}
                </div>)}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="p-4 border-t border-slate-200 bg-white/95 backdrop-blur-md flex items-center gap-3">
          <motion.a href={targetUrl} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ea580c] hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 cursor-pointer">
            Apply on Official Site
            <ExternalLink className="w-4 h-4" />
          </motion.a>

          {onTailorJob && (<motion.button onClick={() => onTailorJob(job)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="py-3 px-5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-purple-500/20 cursor-pointer">
            <Sparkles className="w-4 h-4 text-amber-300" />
            Tailor Resume
          </motion.button>)}
        </div>
      </motion.div>
    </div>)}
  </AnimatePresence>);
};
export default JobDetailDrawer;

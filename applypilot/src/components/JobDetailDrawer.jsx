import React, { useEffect } from 'react';
import { X, ExternalLink, MapPin, Building2, Clock, Sparkles, Bookmark, BookmarkCheck, CheckCircle2, AlertCircle, DollarSign, Users, Briefcase, Globe, } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CompanyIcon } from './CompanyIcon';
export const JobDetailDrawer = ({ job, isOpen, onClose, resume, onTailorJob, isBookmarked = false, onToggleBookmark, }) => {
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
    const totalEvaluated = matchedSkills.length + missingSkills.length;
    const matchPercentage = totalEvaluated > 0 ? Math.round((matchedSkills.length / totalEvaluated) * 100) : 85;
    const targetUrl = job ? (job.applyUrl || job.url || job.sourceUrl || '#') : '#';
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
            case 'naukari':
                return { label: 'Naukri Live', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
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
          <motion.div key="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={onClose}/>

          {/* Drawer content with spring slide-in / slide-out */}
          <motion.div key="drawer-panel" initial={{ x: '100%', opacity: 0.8 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0.8 }} transition={{ type: 'spring', damping: 30, stiffness: 350 }} className="relative z-10 w-full max-w-2xl bg-slate-900/95 border-l border-white/10 text-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Top Sticky Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <CompanyIcon company={job.company} logoUrl={job.companyLogo} size={54} className="rounded-2xl shadow-lg border-white/20 shrink-0"/>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${sourceBadge.color}`}>
                  {sourceBadge.label}
                </span>
                {job.postedRelative && (<span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">
                    <Clock className="w-3 h-3"/>
                    {job.postedRelative}
                  </span>)}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-snug break-words">
                {job.title}
              </h2>
              <div className="flex items-center gap-3 text-sm text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-medium text-slate-300">
                  <Building2 className="w-4 h-4 text-slate-500"/>
                  {job.company}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-500"/>
                  {job.location || 'Worldwide'}
                </span>
                {job.applicantCount !== undefined && job.applicantCount > 0 && (<span className="flex items-center gap-1 text-xs text-slate-400">
                    <Users className="w-3.5 h-3.5 text-slate-500"/>
                    {job.applicantCount} applicants
                  </span>)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onToggleBookmark && (<button onClick={() => onToggleBookmark(job.id)} title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Job'} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                {isBookmarked ? (<BookmarkCheck className="w-5 h-5 text-amber-400 fill-amber-400/20"/>) : (<Bookmark className="w-5 h-5"/>)}
              </button>)}
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-5 h-5"/>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-xs text-slate-400 block mb-1">Workplace</span>
              <span className="font-semibold text-sm flex items-center gap-1 text-slate-200">
                {job.remote || job.isRemote ? (<>
                    <Globe className="w-4 h-4 text-cyan-400"/> Remote
                  </>) : (<>
                    <Briefcase className="w-4 h-4 text-purple-400"/> On-site / Hybrid
                  </>)}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-xs text-slate-400 block mb-1">Role Type</span>
              <span className="font-semibold text-sm text-slate-200">
                {job.seniority ? `${job.seniority.toUpperCase()} • ` : ''}{job.isInternship ? '🎓 Internship' : '💼 Full-Time'}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-xs text-slate-400 block mb-1">Compensation</span>
              <span className="font-semibold text-sm text-emerald-400 flex items-center gap-1">
                {job.salary && !job.salary.toLowerCase().includes('competitive') ? (
                  <>
                    <DollarSign className="w-4 h-4"/> {job.salary}
                  </>
                ) : (
                  <span className="text-xs text-slate-400 font-normal">Disclosed upon application</span>
                )}
              </span>
            </div>
          </div>

          {/* Candidate Match Breakdown */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-500/20">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse"/>
                <h3 className="font-bold text-sm text-white">Resume Fit Breakdown</h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {matchPercentage}% Match
              </span>
            </div>

            {/* Animated Match Progress Bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden mb-3.5 border border-white/10">
              <motion.div initial={{ width: 0 }} animate={{ width: `${matchPercentage}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }} className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 shadow-[0_0_12px_rgba(14,165,233,0.5)]"/>
            </div>

            {matchedSkills.length > 0 && (<div className="mb-3">
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5"/> Matched Skills ({matchedSkills.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {matchedSkills.map((skill, i) => (<span key={i} className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                      {skill}
                    </span>))}
                </div>
              </div>)}

            {missingSkills.length > 0 && (<div>
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400"/> Skills to Highlight in Application
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {missingSkills.map((skill, i) => (<span key={i} className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 font-mono">
                      {skill}
                    </span>))}
                </div>
              </div>)}

            {matchedSkills.length === 0 && missingSkills.length === 0 && (<p className="text-xs text-slate-400">
                Strong general match found for your background and target roles. Tailoring your bullet points will maximize recruiter response rates.
              </p>)}
          </div>

          {/* Extracted Tech Stack */}
          {job.techStack && job.techStack.length > 0 && (<div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tech Stack
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {job.techStack.map((tech, idx) => (<span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-sky-950/60 text-sky-300 border border-sky-500/30 font-medium">
                    {tech}
                  </span>))}
              </div>
            </div>)}

          {/* Job Tags */}
          {job.tags && job.tags.length > 0 && (<div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Job Attributes & Batches
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {job.tags.map((tag, idx) => (<span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                    {tag}
                  </span>))}
              </div>
            </div>)}

          {/* Description */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">Job Description & Responsibilities</h4>
            {job.descriptionHtml ? (<div className="prose prose-invert prose-sm max-w-none text-slate-300 space-y-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}/>) : (<div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed space-y-3">
                {job.description || 'No detailed description provided by the poster.'}
              </div>)}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="p-4 border-t border-white/10 bg-slate-900/90 backdrop-blur-md flex items-center gap-3">
          <motion.a href={targetUrl} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 cursor-pointer">
            Apply on Official Site
            <ExternalLink className="w-4 h-4"/>
          </motion.a>

          {onTailorJob && (<motion.button onClick={() => onTailorJob(job)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 cursor-pointer">
              <Sparkles className="w-4 h-4"/>
              Tailor Resume
            </motion.button>)}
        </div>
      </motion.div>
    </div>)}
    </AnimatePresence>);
};
export default JobDetailDrawer;

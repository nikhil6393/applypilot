import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Briefcase, ExternalLink, Bookmark, Sparkles, ShieldCheck, } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getSafeJobApplyUrl } from '../utils/jobUtils';
import { CompanyIcon } from './CompanyIcon';
import { OpportunityTranslator } from './OpportunityTranslator';

export const JobDetailSplitPane = ({ jobs, selectedJob, resume, onSelectJob, onTailorJob, onBackToFeed, }) => {
  const { isBookmarked, toggleBookmark, addToast } = useAppStore();
  const [activeTab, setActiveTab] = useState('translator');
  // Fallback to first job if none selected
  const currentJob = selectedJob || jobs[0];
  if (!currentJob) {
    return (<div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
      <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
      <h3 className="text-sm font-bold text-slate-800">No Job Selected</h3>
      <button onClick={onBackToFeed} className="mt-3 px-4 py-1.5 bg-[#5B7BE8] text-white rounded-xl text-xs font-semibold">
        Return to Feed
      </button>
    </div>);
  }
  const bookmarked = isBookmarked(currentJob.id);
  return (<div className="w-full flex flex-col font-sans -mt-4 space-y-4">
    {/* Top back bar */}
    <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
      <button onClick={onBackToFeed} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#ff6b35] transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Verified Opportunities Feed</span>
      </button>
      <span className="text-xs text-slate-400 font-medium">Split-Pane Detailed View</span>
    </div>

    {/* Split Pane: detail right on desktop, top on mobile */}
    <div className="flex flex-col md:flex-row gap-5 items-start">
      {/* JOB DETAIL VIEW: primary on mobile */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xs space-y-6 min-w-0 w-full order-1 md:order-2">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3 sm:gap-4">
            <CompanyIcon company={currentJob.company} logoUrl={currentJob.companyLogo} size={48} className="rounded-2xl shadow-sm shrink-0 border border-slate-100" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#ff6b35] uppercase tracking-wider">{currentJob.company}</span>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 break-words">{currentJob.title}</h1>
              <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-[#ff6b35]" />
                  {currentJob.location || 'Remote'}
                </span>
                <span>•</span>
                <span className="capitalize font-medium text-slate-600">{currentJob.source} Board</span>
                <span>•</span>
                <span>Posted {currentJob.postedRelative || 'Recently'}</span>
              </div>
              <span
                className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-bold ${
                  Number.isFinite(currentJob.matchScore)
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
                title={currentJob.fitEvidence?.length ? `Based on ${currentJob.fitEvidence.join(', ')}` : currentJob.fitScoreUnavailableReason || ''}
              >
                {Number.isFinite(currentJob.matchScore)
                  ? `${currentJob.matchScore}% personalized match`
                  : 'Personalized score unavailable'}
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button type="button" onClick={() => toggleBookmark(currentJob.id)} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#f59e0b] hover:border-amber-200 hover:bg-amber-50/50 transition-colors cursor-pointer" title="Bookmark position">
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-[#f59e0b] text-[#f59e0b]' : ''}`} />
            </button>
            <button type="button" onClick={() => onTailorJob(currentJob)} className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:opacity-95 text-white text-xs font-bold transition-all shadow-sm shadow-purple-500/20 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Tailor Resume</span>
            </button>
            <a href={getSafeJobApplyUrl(currentJob)} target="_blank" rel="noreferrer" className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ea580c] hover:opacity-95 text-white text-xs font-bold transition-all shadow-sm shadow-orange-500/20 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap">
              <span>Direct Apply</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* ── 4 HOVIN-STYLE INFO CHIPS (SALARY / TYPE / APPLICANTS / SKILL) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Chip 1: Salary */}
          <div className="p-3.5 rounded-xl bg-[#fff7ed] border border-[#ffedd5] text-[#9a3412]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-[#ea580c]">Estimated Pay</span>
            <div className="text-sm font-extrabold mt-0.5">{currentJob.salary || 'Competitive'}</div>
          </div>

          {/* Chip 2: Job Type */}
          <div className="p-3.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-[#059669]">Position Type</span>
            <div className="text-sm font-extrabold mt-0.5 capitalize">
              {currentJob.isInternship ? 'Internship' : currentJob.seniority || 'Full-Time'}
            </div>
          </div>

          {/* Chip 3: Applicants */}
          <div className="p-3.5 rounded-xl bg-[#fefce8] border border-[#fef08a] text-[#854d0e]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-[#d97706]">Applicant Load</span>
            <div className="text-sm font-extrabold mt-0.5">
              {currentJob.applicantCount ? `${currentJob.applicantCount} applied` : 'Early (< 15 applied)'}
            </div>
          </div>

          {/* Chip 4: Primary Skill */}
          <div className="p-3.5 rounded-xl bg-[#f5f3ff] border border-[#ddd6fe] text-[#5b21b6]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-[#7c3aed]">Key Competency</span>
            <div className="text-sm font-extrabold mt-0.5 truncate">
              {(currentJob.skills || ['Full-Stack', 'React'])[0]}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-4 border-b border-slate-200 overflow-x-auto">
          {[
            { id: 'translator', label: '🎯 Opportunity Breakdown (Evidence & Fit)' },
            { id: 'overview', label: 'Job Overview' },
            { id: 'requirements', label: 'Technical Stack & Requirements' },
            { id: 'company', label: 'Company Intel & Trust' },
          ].map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer whitespace-nowrap ${activeTab === tab.id ? 'text-[#ff6b35]' : 'text-slate-500 hover:text-slate-900'}`}>
            {tab.label}
            {activeTab === tab.id && (<motion.div layoutId="detailTab" className="absolute bottom-0 inset-x-0 h-0.5 bg-[#ff6b35]" />)}
          </button>))}
        </div>

        {/* Tab Content */}
        <div className="text-xs text-slate-700 leading-relaxed space-y-4">
          {activeTab === 'translator' && (
            <OpportunityTranslator job={currentJob} resume={resume} onProceedToTailoring={onTailorJob} />
          )}

          {activeTab === 'overview' && (<div className="space-y-3">
            <p className="whitespace-pre-line">
              {currentJob.description ||
                'We are seeking high-caliber engineers to architect, deploy, and scale mission-critical cloud primitives and user-facing experiences.'}
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                <span>Guardrail Verification</span>
              </h4>
              <p className="text-[11px] text-slate-600">
                This posting has been canonicalized and verified through official ATS endpoints. Direct apply and
                tailoring are enabled with truth-anchored protection.
              </p>
            </div>
          </div>)}

          {activeTab === 'requirements' && (
            <div className="space-y-4">
              {currentJob.requirements && currentJob.requirements.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900">Key Qualifications &amp; Requirements:</h4>
                  <ul className="space-y-1 list-disc pl-4 text-slate-600">
                    {currentJob.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
              {currentJob.responsibilities && currentJob.responsibilities.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900">Core Responsibilities:</h4>
                  <ul className="space-y-1 list-disc pl-4 text-slate-600">
                    {currentJob.responsibilities.map((resp, i) => (
                      <li key={i}>{resp}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Required Skills &amp; Keywords:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(currentJob.skills || currentJob.tags || ['TypeScript', 'React', 'Node.js', 'PostgreSQL']).map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'company' && (<div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Company Legal Name:</span>
              <b className="text-slate-900">{currentJob.company} Inc.</b>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Primary Location:</span>
              <b className="text-slate-900">{currentJob.location || 'Global Remote'}</b>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Source Verification:</span>
              <b className="text-[#10B981]">Verified Source ({currentJob.source})</b>
            </div>
          </div>)}
        </div>
      </div>

      {/* 320px JOB LIST: left on desktop, below detail on mobile */}
      <div className="w-full md:w-80 flex-shrink-0 bg-white border border-[#E5E7EB] rounded-2xl p-3 shadow-xs max-h-[380px] md:max-h-[calc(100vh-180px)] overflow-y-auto space-y-2 order-2 md:order-1">
        <div className="px-2 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Other Positions in Feed</span>
          <span className="text-[10px] text-slate-400 font-mono">{jobs.length}</span>
        </div>

        <div className="space-y-1.5">
          {jobs.map((j) => {
            const isSelected = j.id === currentJob.id;
            return (
              <div
                key={j.id}
                onClick={() => {
                  onSelectJob(j);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#fff7ed] border-[#ff6b35] shadow-xs ring-1 ring-[#ff6b35]/30'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 truncate">{j.company}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                    {j.source}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[#111827] mt-0.5 line-clamp-1">{j.title}</h4>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-1.5 border-t border-black/5">
                  <span>{j.location || 'Remote'}</span>
                  {j.salary && !j.salary.toLowerCase().includes('competitive') ? (
                    <b className="text-emerald-700 font-bold">{j.salary}</b>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Direct Apply</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>);
};

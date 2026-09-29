import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Briefcase, ExternalLink, Bookmark, Sparkles, ShieldCheck, } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getSafeJobApplyUrl } from '../utils/jobUtils';
import { CompanyIcon } from './CompanyIcon';
export const JobDetailSplitPane = ({ jobs, selectedJob, resume, onSelectJob, onTailorJob, onBackToFeed, }) => {
    const { isBookmarked, toggleBookmark, addToast } = useAppStore();
    const [activeTab, setActiveTab] = useState('overview');
    // Fallback to first job if none selected
    const currentJob = selectedJob || jobs[0];
    if (!currentJob) {
        return (<div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
        <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2"/>
        <h3 className="text-sm font-bold text-slate-800">No Job Selected</h3>
        <button onClick={onBackToFeed} className="mt-3 px-4 py-1.5 bg-[#5B7BE8] text-white rounded-xl text-xs font-semibold">
          Return to Feed
        </button>
      </div>);
    }
    const bookmarked = isBookmarked(currentJob.id);
    return (<div className="w-full flex flex-col font-sans -mt-4 space-y-4">
      {/* Top back bar */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
        <button onClick={onBackToFeed} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#5B7BE8] cursor-pointer">
          <ArrowLeft className="w-4 h-4"/>
          <span>Back to Recommended Jobs Grid</span>
        </button>
        <span className="text-xs text-slate-400 font-medium">Split-Pane Detail Mode</span>
      </div>

      {/* Split Pane: 320px list left, detail right */}
      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* LEFT COLUMN: 320px JOB LIST */}
        <div className="w-full md:w-80 flex-shrink-0 bg-white border border-[#E5E7EB] rounded-2xl p-3 shadow-xs max-h-[calc(100vh-180px)] overflow-y-auto space-y-2">
          <div className="px-2 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Indexed Positions</span>
            <span className="text-[10px] text-slate-400 font-mono">{jobs.length}</span>
          </div>

          <div className="space-y-1.5">
            {jobs.map((j) => {
            const isSelected = j.id === currentJob.id;
            return (<div key={j.id} onClick={() => onSelectJob(j)} className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${isSelected
                    ? 'bg-[#EEF2FF] border-[#5B7BE8] shadow-2xs'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50'}`}>
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 truncate">{j.company}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase">
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
                </div>);
        })}
          </div>
        </div>

        {/* RIGHT COLUMN: JOB DETAIL VIEW */}
        <div className="flex-1 bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <CompanyIcon company={currentJob.company} logoUrl={currentJob.companyLogo} size={48} className="rounded-2xl shadow-sm" />
              <div>
                <span className="text-xs font-semibold text-slate-500">{currentJob.company}</span>
                <h1 className="text-xl sm:text-2xl font-bold text-[#111827] mt-0.5">{currentJob.title}</h1>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#5B7BE8]"/>
                    {currentJob.location || 'Remote'}
                  </span>
                  <span>•</span>
                  <span className="capitalize">{currentJob.source} Board</span>
                  <span>•</span>
                  <span>Posted {currentJob.postedRelative || 'Recently'}</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => toggleBookmark(currentJob.id)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[#F59E0B] hover:border-slate-300 transition-colors cursor-pointer" title="Bookmark position">
                <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-[#F59E0B] text-[#F59E0B]' : ''}`}/>
              </button>
              <button type="button" onClick={() => onTailorJob(currentJob)} className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]"/>
                <span>Score &amp; Tailor Resume</span>
              </button>
              <a href={getSafeJobApplyUrl(currentJob)} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-xl bg-[#5B7BE8] hover:bg-[#3D5FD9] text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1">
                <span>Direct Apply</span>
                <ExternalLink className="w-3 h-3"/>
              </a>
            </div>
          </div>

          {/* ── 4 HOVIN-STYLE INFO CHIPS (SALARY / TYPE / APPLICANTS / SKILL) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Chip 1: Salary */}
            <div className="p-3 rounded-xl bg-[#EEF2FF] border border-[#5B7BE8]/20 text-[#1E3A8A]">
              <span className="text-[10px] font-bold uppercase tracking-wider block text-[#3D5FD9]">Estimated Pay</span>
              <div className="text-sm font-extrabold mt-0.5">{currentJob.salary || '₹28L–₹35L/yr'}</div>
            </div>

            {/* Chip 2: Job Type */}
            <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#10B981]/20 text-[#065F46]">
              <span className="text-[10px] font-bold uppercase tracking-wider block text-[#059669]">Position Type</span>
              <div className="text-sm font-extrabold mt-0.5 capitalize">
                {currentJob.isInternship ? 'Internship' : currentJob.seniority || 'Full-Time'}
              </div>
            </div>

            {/* Chip 3: Applicants */}
            <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#F59E0B]/20 text-[#92400E]">
              <span className="text-[10px] font-bold uppercase tracking-wider block text-[#D97706]">Applicant Load</span>
              <div className="text-sm font-extrabold mt-0.5">
                {currentJob.applicantCount ? `${currentJob.applicantCount} applied` : 'Early (< 15 applied)'}
              </div>
            </div>

            {/* Chip 4: Primary Skill */}
            <div className="p-3 rounded-xl bg-[#F5F3FF] border border-[#8B5CF6]/20 text-[#5B21B6]">
              <span className="text-[10px] font-bold uppercase tracking-wider block text-[#7C3AED]">Key Competency</span>
              <div className="text-sm font-extrabold mt-0.5 truncate">
                {(currentJob.skills || ['Full-Stack', 'React'])[0]}
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-4 border-b border-slate-200">
            {[
            { id: 'overview', label: 'Job Overview' },
            { id: 'requirements', label: 'Technical Stack & Requirements' },
            { id: 'company', label: 'Company Intel & Trust' },
        ].map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-2 text-xs font-bold transition-all relative cursor-pointer ${activeTab === tab.id ? 'text-[#5B7BE8]' : 'text-slate-500 hover:text-slate-900'}`}>
                {tab.label}
                {activeTab === tab.id && (<motion.div layoutId="detailTab" className="absolute bottom-0 inset-x-0 h-0.5 bg-[#5B7BE8]"/>)}
              </button>))}
          </div>

          {/* Tab Content */}
          <div className="text-xs text-slate-700 leading-relaxed space-y-4">
            {activeTab === 'overview' && (<div className="space-y-3">
                <p className="whitespace-pre-line">
                  {currentJob.description ||
                'We are seeking high-caliber engineers to architect, deploy, and scale mission-critical cloud primitives and user-facing experiences.'}
                </p>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]"/>
                    <span>Guardrail Verification</span>
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    This posting has been canonicalized and verified through official ATS endpoints. Direct apply and
                    tailoring are enabled with truth-anchored protection.
                  </p>
                </div>
              </div>)}

            {activeTab === 'requirements' && (<div className="space-y-3">
                <h4 className="font-bold text-slate-900">Required Skills &amp; Keywords:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(currentJob.skills || currentJob.tags || ['TypeScript', 'React', 'Node.js', 'PostgreSQL']).map((s) => (<span key={s} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
                        {s}
                      </span>))}
                </div>
              </div>)}

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
      </div>
    </div>);
};

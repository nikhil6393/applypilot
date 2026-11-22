import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  Building2,
  MapPin,
  Clock,
  Layers,
} from 'lucide-react';
import { analyzeEvidence } from '../utils/opportunityEvidence.js';
import { evaluateOpportunityEligibility } from '../utils/jobEligibility.js';

export const OpportunityTranslator = ({ job, resume, onProceedToTailoring }) => {
  const [confirmedItems, setConfirmedItems] = useState({});

  const evidenceReport = useMemo(() => {
    if (!job) return null;
    return analyzeEvidence(resume, job);
  }, [job, resume]);

  const eligibilityReport = useMemo(() => {
    if (!job) return null;
    return evaluateOpportunityEligibility(job, resume);
  }, [job, resume]);

  const toggleConfirm = (itemId) => {
    setConfirmedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  if (!job) return null;

  const getStatusBadge = (status, isConfirmed) => {
    if (isConfirmed) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <Check className="w-3 h-3" /> Student Confirmed
        </span>
      );
    }
    switch (status) {
      case 'met':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Condition Met
          </span>
        );
      case 'not_met':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400" /> Restriction / Not Met
          </span>
        );
      case 'needs_confirmation':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3 h-3 text-amber-400" /> Needs Confirmation
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/50">
            <HelpCircle className="w-3 h-3 text-slate-400" /> Unknown
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. What This Opportunity Actually Is (Plain English) */}
      <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Layers className="w-4 h-4 text-[#ff6b35]" />
          <h4>Opportunity Translation in Plain English</h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {job.title} at <strong className="text-slate-900">{job.company}</strong> is a{' '}
          <strong className="text-[#ff6b35] font-semibold">{job.isInternship ? 'Student Internship' : 'Full-Time Position'}</strong>{' '}
          ({job.remote ? 'Remote / Work from Anywhere' : job.location || 'On-site'}).
          The employer is seeking candidates who can build and maintain software components using{' '}
          <span className="text-slate-800 font-medium">
            {(job.skills || []).slice(0, 4).join(', ') || 'modern engineering tools'}
          </span>.
        </p>
      </div>

      {/* 2. Evidence-Based Requirement Fit */}
      {evidenceReport && (
        <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-[#7c3aed]" />
              <h4>Evidence-Based Matching</h4>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {evidenceReport.directEvidence.length} Direct • {evidenceReport.partialEvidence.length} Partial • {evidenceReport.unmentioned.length} Unmentioned
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Direct Evidence */}
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Direct Resume Evidence</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Demonstrated in your work history or projects:
              </p>
              {evidenceReport.directEvidence.length > 0 ? (
                <div className="space-y-1.5">
                  {evidenceReport.directEvidence.map((e, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-white border border-emerald-200 text-xs shadow-2xs">
                      <strong className="text-emerald-900 block font-semibold">{e.requirement}</strong>
                      <span className="text-[11px] text-slate-600">{e.citation}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No direct project or work bullets explicitly match required keywords.</p>
              )}
            </div>

            {/* Partial Evidence */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Partial / Skills Mentioned</span>
              </div>
              <p className="text-[11px] text-amber-700">
                Found in your skills list without specific project bullets:
              </p>
              {evidenceReport.partialEvidence.length > 0 ? (
                <div className="space-y-1.5">
                  {evidenceReport.partialEvidence.map((p, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-white border border-amber-200 text-xs shadow-2xs">
                      <strong className="text-amber-900 block font-semibold">{p.requirement}</strong>
                      <span className="text-[11px] text-slate-600">{p.citation}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No isolated skills without projects detected.</p>
              )}
            </div>

            {/* Unmentioned */}
            <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <span>Unmentioned in Resume</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Not found in resume (does <em>not</em> mean you lack the skill):
              </p>
              {evidenceReport.unmentioned.length > 0 ? (
                <div className="space-y-1.5">
                  {evidenceReport.unmentioned.slice(0, 4).map((u, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs">
                      <strong className="text-slate-800 block font-semibold">{u.requirement}</strong>
                      <span className="text-[11px] text-slate-500">{u.note}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-600 italic font-medium">All evaluated requirements have some resume evidence.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Mandatory Eligibility Verification */}
      {eligibilityReport && (
        <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4>Mandatory Eligibility Verification</h4>
            </div>
            <span className="text-xs text-slate-500">Honest Evaluation</span>
          </div>

          <div className="space-y-2.5">
            {eligibilityReport.items.map((item) => {
              const isConfirmed = confirmedItems[item.id];
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-slate-900 text-xs font-bold">{item.title}</strong>
                      {getStatusBadge(item.status, isConfirmed)}
                    </div>
                    <p className="text-slate-700 text-[11px]">
                      <strong className="text-slate-500 font-medium">Requirement:</strong> {item.requirement}
                    </p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>

                  {item.status === 'needs_confirmation' && (
                    <button
                      onClick={() => toggleConfirm(item.id)}
                      aria-label={`Confirm eligibility for ${item.title}`}
                      className={`text-[11px] px-3.5 py-1.5 rounded-lg border font-semibold shrink-0 transition-all cursor-pointer ${
                        isConfirmed ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isConfirmed ? '✓ Confirmed by You' : 'Confirm I Meet This'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/80 text-xs text-slate-700">
            <strong className="text-[#ea580c] block mb-0.5">Eligibility Summary:</strong>
            {eligibilityReport.overallSummary}
          </div>
        </div>
      )}

      {/* 4. Practical Student Next Steps */}
      {evidenceReport?.nextSteps && (
        <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
          <h4 className="text-sm font-bold text-slate-900">Recommended Next Steps for You</h4>
          <div className="space-y-2">
            {evidenceReport.nextSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-[#ea580c] text-[11px] font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div>
                  <strong className="text-slate-900 block font-semibold">{step.action}</strong>
                  <span className="text-slate-500 text-[11px]">{step.description}</span>
                </div>
              </div>
            ))}
          </div>

          {onProceedToTailoring && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onProceedToTailoring(job)}
                className="text-xs flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ea580c] hover:opacity-95 text-white font-bold shadow-sm shadow-orange-500/20 cursor-pointer"
              >
                <span>Improve Resume Honestly For This Role</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import ResumeUploadGateway from './ResumeUploadGateway';
import Resume3DExtractorModal from './Resume3DExtractorModal';
import LeftScoreSidebar from './LeftScoreSidebar';
import HomeOverviewView from './HomeOverviewView';
import FixDetailView from './FixDetailView';
import RightDocumentSheet from './RightDocumentSheet';
import ResumeEditModal from './ResumeEditModal';
import JobDescriptionComparatorModal from './JobDescriptionComparatorModal';
import InterviewArmorModal from './InterviewArmorModal';
import confetti from 'canvas-confetti';
import { scoreResume } from '../../lib/resumeScore/index';
import { useAuth } from '../../context/AuthContext';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Download, Award, Sparkles, Target, ShieldAlert } from 'lucide-react';

/**
 * ExactResumeStudio.jsx
 * Master orchestrator implementing:
 * 1. File / text drop parsing real resume to account and state.
 * 2. 3D holographic laser extraction animation modal.
 * 3. Exact 3-column review studio:
 *    - Left: Overall circular score, Top Fixes, Completed, Tools
 *    - Center: Home Overview vs Fix Detail
 *    - Right: Strict Latin Modern Roman ATS resume sheet with inline highlights
 * 4. In-studio live Resume Editor Modal.
 * 5. Full ATS Audit Report Modal.
 * 6. Job Description Comparator & 1-Click Skill Gap Fixer.
 */
export default function ExactResumeStudio({
  resume,
  onUpdateResume,
  discoveredJobs = [],
  targetJob = null,
  onClearTargetJob,
}) {
  const { updateProfile } = useAuth();
  const [studioState, setStudioState] = useState(resume ? 'studio' : 'upload'); // 'upload' | 'extracting' | 'studio'
  const [uploadedFileName, setUploadedFileName] = useState('Resume.pdf');
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'fix'
  const [activeFixId, setActiveFixId] = useState(null);
  const [highlightWord, setHighlightWord] = useState(null);
  const [isHighlightActive, setIsHighlightActive] = useState(false);
  const [pendingParsedResume, setPendingParsedResume] = useState(null);
  const [activeTargetJob, setActiveTargetJob] = useState(targetJob);

  useEffect(() => {
    if (targetJob) {
      setActiveTargetJob(targetJob);
      setIsCompareModalOpen(true);
    }
  }, [targetJob]);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isArmorModalOpen, setIsArmorModalOpen] = useState(false);

  // Real-time score from the actual resume
  const scoreReport = useMemo(() => scoreResume(resume || {}), [resume]);
  const score = scoreReport.overall;
  const issues = scoreReport.issues || [];
  const categories = scoreReport.categories || {};

  // Count repeated-verb issues for the badge
  const repetitionCount = useMemo(
    () => issues.filter(i => i.id?.startsWith('impact-repeated') || i.id?.startsWith('style-repeated')).length,
    [issues]
  );

  // Derived highlight word from actual repeated-verb issues
  const repeatedVerbIssue = useMemo(
    () => issues.find(i => i.id?.startsWith('impact-repeated') || i.id?.startsWith('style-repeated')),
    [issues]
  );

  // File Upload Handler (PDF, DOCX, TXT)
  const handleFileUpload = (file) => {
    setUploadedFileName(file.name || 'Resume.pdf');
    setStudioState('extracting');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result;
        const token = localStorage.getItem('applypilot_token');
        const res = await fetch('/api/resume/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            fileData: base64,
            fileName: file.name,
            mimeType: file.type || 'application/pdf',
          }),
        });
        const data = await res.json();
        if (data?.resume) {
          setPendingParsedResume(data.resume);
          onUpdateResume(data.resume);
          if (updateProfile) updateProfile({ savedResume: data.resume });
          try {
            localStorage.setItem('applypilot_resume', JSON.stringify(data.resume));
          } catch {}
        }
      } catch (err) {
        console.error('Failed to parse uploaded resume:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Text Upload Handler
  const handleTextUpload = async (text) => {
    setUploadedFileName('Pasted_Resume.txt');
    setStudioState('extracting');
    try {
      const token = localStorage.getItem('applypilot_token');
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text,
          fileName: 'Pasted_Resume.txt',
        }),
      });
      const data = await res.json();
      if (data?.resume) {
        setPendingParsedResume(data.resume);
        onUpdateResume(data.resume);
        if (updateProfile) updateProfile({ savedResume: data.resume });
        try {
          localStorage.setItem('applypilot_resume', JSON.stringify(data.resume));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to parse pasted resume:', err);
    }
  };

  // Sample Load Handler
  const handleLoadSample = () => {
    setUploadedFileName('Nikhil_Singh_Resume.pdf');
    setStudioState('extracting');
  };

  // Extraction Complete Handler
  const handleExtractionComplete = () => {
    if (pendingParsedResume) {
      onUpdateResume(pendingParsedResume);
    }
    setStudioState('studio');
    setActiveTab('home');
  };

  // Switch to Fix Drilldown
  const handleSelectFix = (fixId) => {
    setActiveFixId(fixId);
    setActiveTab('fix');

    // Highlight the repeated word for this fix if applicable
    const issue = issues.find(i => i.id === fixId || i.category === fixId);
    if (issue?.evidence?.word) {
      setHighlightWord(issue.evidence.word);
      setIsHighlightActive(true);
    } else if (fixId === 'repetition' || fixId?.startsWith('impact-repeated') || fixId?.startsWith('style-repeated')) {
      const repIssue = repeatedVerbIssue;
      setHighlightWord(repIssue?.evidence?.word || null);
      setIsHighlightActive(true);
    } else {
      setHighlightWord(null);
      setIsHighlightActive(false);
    }
  };

  // Back to Home Overview
  const handleBackToHome = () => {
    setActiveTab('home');
  };

  // Dynamic 1-Click Fix Handler
  const handleApplyFix = (type, payload) => {
    if (!resume) return;
    const next = JSON.parse(JSON.stringify(resume));
    let changed = false;

    if (type === 'update_bullet' && payload) {
      const { expIdx, bulletIdx, newText } = payload;
      if (next.experience?.[expIdx]?.bullets?.[bulletIdx] !== undefined) {
        next.experience[expIdx].bullets[bulletIdx] = newText;
        changed = true;
      }
    } else if (type === 'update_summary' && typeof payload === 'string') {
      next.summary = payload;
      changed = true;
    } else if (type === 'no-metric' || type === 'metrics') {
      const metricSamples = [
        'increasing throughput by 35% across 10,000+ daily active users',
        'reducing latency by 42ms and ensuring 99.9% uptime',
        'accelerating release cycle by 2.5x with automated CI/CD pipelines',
        'saving 15+ engineering hours per week through modular architecture',
      ];
      let mIdx = 0;
      (next.experience || []).forEach((exp) => {
        (exp.bullets || []).forEach((b, bi) => {
          if (!/\d+%|\d+x|\$\d+|\d+\s?(ms|seconds?|hours?|days?|users?|customers?|requests?)/i.test(b)) {
            exp.bullets[bi] = b.replace(/\.$/, '') + `, ${metricSamples[mIdx++ % metricSamples.length]}.`;
            changed = true;
          }
        });
      });
    } else if (type === 'weak-opener' || type === 'action-verb') {
      const WEAK_OPENER_RE = /^(responsible for|worked on|helped with|assisted in|duties included|participated in|involved in|tasked with|was part of)\s*/i;
      const powerVerbs = ['Engineered', 'Architected', 'Spearheaded', 'Optimized', 'Streamlined', 'Deployed'];
      let vIdx = 0;
      (next.experience || []).forEach((exp) => {
        (exp.bullets || []).forEach((b, bi) => {
          if (WEAK_OPENER_RE.test(b)) {
            exp.bullets[bi] = `${powerVerbs[vIdx++ % powerVerbs.length]} ${b.replace(WEAK_OPENER_RE, '')}`;
            changed = true;
          }
        });
      });
    } else if (type === 'repetition' || type?.startsWith('impact-repeated') || type?.startsWith('style-repeated')) {
      const replacements = ['Engineered', 'Architected', 'Developed', 'Deployed', 'Implemented', 'Optimized'];
      let idx = 0;
      const targetWord = repeatedVerbIssue?.evidence?.word || highlightWord || 'Built';
      const re = new RegExp(`^${targetWord}\\b`, 'i');
      (next.experience || []).forEach((exp) => {
        (exp.bullets || []).forEach((b, bi) => {
          if (re.test(b)) {
            exp.bullets[bi] = b.replace(re, replacements[idx++ % replacements.length]);
            changed = true;
          }
        });
      });
    }

    if (changed) {
      onUpdateResume(next);
      if (updateProfile) updateProfile({ savedResume: next });
      try {
        localStorage.setItem('applypilot_resume', JSON.stringify(next));
      } catch {}
      setIsHighlightActive(false);
      confetti({ particleCount: 50, spread: 65, origin: { y: 0.6 } });
    }
  };

  // Highlight trigger from "Show your lines" button
  const handleHighlightLines = (word) => {
    setIsHighlightActive(true);
    setHighlightWord(word || 'Built');
    const docEl = document.getElementById('resume-printable-document');
    if (docEl) {
      docEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 1. Initial State: Upload Gateway
  if (studioState === 'upload') {
    return (
      <ResumeUploadGateway
        onFileUpload={handleFileUpload}
        onTextUpload={handleTextUpload}
        onLoadSample={handleLoadSample}
      />
    );
  }

  // 2. Extraction State: 3D Laser Scanner
  if (studioState === 'extracting') {
    return (
      <Resume3DExtractorModal
        fileName={uploadedFileName}
        onComplete={handleExtractionComplete}
      />
    );
  }

  // 3. Studio State: Exact 3-Column UI
  const candidateName = resume?.fullName || resume?.name || resume?.contact?.name || 'Candidate';

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] min-h-[700px] w-full bg-[#F8FAFC] text-slate-900 overflow-hidden select-none">
      {/* Target Mode Bar */}
      <div className="px-4 py-2 border-b border-slate-200/90 bg-white flex items-center justify-between text-xs shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          {activeTargetJob ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                Targeting: {activeTargetJob.title} @ {activeTargetJob.company}
              </span>
              <button
                onClick={() => {
                  setActiveTargetJob(null);
                  if (onClearTargetJob) onClearTargetJob();
                }}
                className="text-slate-500 hover:text-slate-800 hover:underline cursor-pointer font-medium text-[11px]"
              >
                ✕ Switch to Master Resume
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Master Resume (Universal ATS Baseline)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsArmorModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300/80 transition-all cursor-pointer shadow-2xs"
            title="Generate Interview Defense Talking Points & STAR Cheat Sheet"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>🛡️ Interview Armor</span>
          </button>

          <button
            onClick={() => setIsCompareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer"
          >
            <Target className="w-3.5 h-3.5" />
            <span>{activeTargetJob ? '⚡ Compare & Tailor to JD' : '🎯 Tailor to Job Description'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Column 1: Left Navigation Sidebar */}
        <LeftScoreSidebar
          score={score}
          categories={categories}
          issues={issues}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'home') setActiveTab('home');
            else if (tab === 'keywords') setIsCompareModalOpen(true);
            else handleSelectFix(tab);
          }}
          activeFix={activeFixId}
          onSelectFix={handleSelectFix}
          repetitionCount={repetitionCount}
          onUploadNew={() => setStudioState('upload')}
          onOpenFullReport={() => setIsReportModalOpen(true)}
        />

        {/* Column 2: Center Dual View (Home Overview vs Fix Detail) */}
        <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden border-r border-slate-200/90 relative bg-[#F8FAFC]">
          {activeTab === 'home' ? (
            <HomeOverviewView
              candidateName={candidateName}
              score={score}
            issues={issues}
            categories={categories}
            onSelectFix={handleSelectFix}
            onHowItWorks={() => setIsReportModalOpen(true)}
          />
        ) : (
          <FixDetailView
            fixId={activeFixId}
            resume={resume}
            issues={issues}
            onBackToHome={handleBackToHome}
            onApplyFix={handleApplyFix}
            onHighlightLines={handleHighlightLines}
            onOpenCompare={() => setIsCompareModalOpen(true)}
            onOpenEdit={() => setIsEditModalOpen(true)}
          />
        )}
      </div>

      {/* Column 3: Right Authentic ATS Resume Sheet */}
      <RightDocumentSheet
        resume={resume}
        highlightWord={highlightWord}
        isHighlightActive={isHighlightActive}
        onOpenRewriter={() => handleSelectFix('rewriter')}
        onOpenMagicWrite={() => handleSelectFix('magic_write')}
        onOpenEdit={() => setIsEditModalOpen(true)}
        onOpenCompare={() => setIsCompareModalOpen(true)}
      />
      </div>

      {/* Live Resume Content Editor Modal */}
      <ResumeEditModal
        resume={resume}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(updated) => {
          onUpdateResume(updated);
          if (updateProfile) updateProfile({ savedResume: updated });
        }}
      />

      {/* Job Description Comparator & Skill Gap Bridge Modal */}
      <JobDescriptionComparatorModal
        resume={resume}
        discoveredJobs={discoveredJobs}
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        initialJob={activeTargetJob}
        onSelectTargetJob={(j) => setActiveTargetJob(j)}
        onUpdateResume={(fixed) => {
          onUpdateResume(fixed);
          if (updateProfile) updateProfile({ savedResume: fixed });
        }}
        onDownloadPdf={async () => {
          const res = await fetch('/api/resume/export/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume }),
          });
          if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${candidateName.replace(/\s+/g, '_')}_Resume.pdf`;
            a.click();
          }
        }}
      />

      {/* Interview Armor & Metric Defense Sheet Modal */}
      <InterviewArmorModal
        resume={resume}
        targetJob={activeTargetJob}
        isOpen={isArmorModalOpen}
        onClose={() => setIsArmorModalOpen(false)}
      />

      {/* Full ATS Audit Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 select-text">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Full ATS Diagnostic Audit Report</h2>
                  <p className="text-xs text-slate-500">Comprehensive breakdown of all ATS screening metrics</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score & Categories */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Impact</span>
                <div className="text-xl font-black text-indigo-600 mt-0.5">{categories.impact || 90}%</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Brevity</span>
                <div className="text-xl font-black text-amber-600 mt-0.5">{categories.brevity || 85}%</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Style</span>
                <div className="text-xl font-black text-purple-600 mt-0.5">{categories.style || 95}%</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Sections</span>
                <div className="text-xl font-black text-emerald-600 mt-0.5">{categories.sections || 100}%</div>
              </div>
            </div>

            {/* Audit Checklist Summary */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">Audit Findings</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {issues.map((iss, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      {iss.severity === 'pass' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span className="text-slate-800">{iss.fix || iss.id}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{iss.severity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

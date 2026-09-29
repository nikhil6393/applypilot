import React, { useState, useMemo } from 'react';
import ResumeUploadGateway from './ResumeUploadGateway';
import Resume3DExtractorModal from './Resume3DExtractorModal';
import LeftScoreSidebar from './LeftScoreSidebar';
import HomeOverviewView from './HomeOverviewView';
import FixDetailView from './FixDetailView';
import RightDocumentSheet from './RightDocumentSheet';
import confetti from 'canvas-confetti';

/**
 * ExactResumeStudio.jsx
 * Master orchestrator implementing the exact 3-step user flow:
 * 1. Shows upload button only if no resume or user chooses upload.
 * 2. 3D holographic laser extraction animation modal on file drop/select.
 * 3. Exact 3-column review studio (Screenshots 1 & 2):
 *    - Left: 74 OVERALL circular dial, Top Fixes, Completed, Tools
 *    - Center: Home (Screenshot 1) vs Fix Detail (Screenshot 2)
 *    - Right: Authentic Nikhil Singh ATS resume sheet with highlighted lines
 */
export default function ExactResumeStudio({
  resume,
  onUpdateResume
}) {
  const [studioState, setStudioState] = useState(resume ? 'studio' : 'upload'); // 'upload' | 'extracting' | 'studio'
  const [uploadedFileName, setUploadedFileName] = useState('Nikhil_Singh_Resume.pdf');
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'fix'
  const [activeFixId, setActiveFixId] = useState('repetition');
  const [highlightWord, setHighlightWord] = useState('Built');
  const [isHighlightActive, setIsHighlightActive] = useState(true);
  const [score, setScore] = useState(74);
  const [repetitionCount, setRepetitionCount] = useState(4);

  // File Upload Handler
  const handleFileUpload = (file) => {
    setUploadedFileName(file.name || 'Resume.pdf');
    setStudioState('extracting');
  };

  // Text Upload Handler
  const handleTextUpload = (text) => {
    setUploadedFileName('Pasted_Resume.txt');
    setStudioState('extracting');
  };

  // Sample Load Handler
  const handleLoadSample = () => {
    setUploadedFileName('Nikhil_Singh_Resume.pdf');
    setStudioState('extracting');
  };

  // Extraction Complete Handler
  const handleExtractionComplete = () => {
    setStudioState('studio');
    setActiveTab('home');
  };

  // Switch to Fix Drilldown
  const handleSelectFix = (fixId) => {
    setActiveFixId(fixId);
    setActiveTab('fix');
    if (fixId === 'repetition') {
      setHighlightWord('Built');
      setIsHighlightActive(true);
    }
  };

  // Back to Home Overview
  const handleBackToHome = () => {
    setActiveTab('home');
  };

  // 1-Click Fix Handler (e.g. from FixDetailView "Mark as Fixed")
  const handleApplyFix = (fixId) => {
    if (!resume) return;

    if (fixId === 'repetition') {
      const next = JSON.parse(JSON.stringify(resume));
      let replacementIndex = 0;
      const replacements = ['Engineered', 'Architected', 'Developed', 'Deployed'];

      // Replace repeated "Built" in experience bullets
      (next.experience || []).forEach((exp) => {
        (exp.bullets || []).forEach((b, bi) => {
          if (/^built\b/i.test(b)) {
            const repl = replacements[replacementIndex % replacements.length];
            replacementIndex++;
            exp.bullets[bi] = b.replace(/^built\b/i, repl);
          }
        });
      });

      // Also replace in projects
      (next.projects || []).forEach((proj) => {
        if (Array.isArray(proj.bullets)) {
          proj.bullets = proj.bullets.map((b) => {
            if (/^built\b/i.test(b)) {
              const repl = replacements[replacementIndex % replacements.length];
              replacementIndex++;
              return b.replace(/^built\b/i, repl);
            }
            return b;
          });
        }
      });

      onUpdateResume(next);
      setScore((s) => Math.min(100, s + 5));
      setRepetitionCount(0);
      setIsHighlightActive(false);
      confetti({ particleCount: 50, spread: 65, origin: { y: 0.6 } });
    }
  };

  // Highlight trigger from "Show your lines" button
  const handleHighlightLines = () => {
    setIsHighlightActive(true);
    setHighlightWord('Built');
    const docEl = document.getElementById('resume-printable-document');
    if (docEl) {
      docEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 1. Initial State: Upload Gateway Only
  if (studioState === 'upload') {
    return (
      <ResumeUploadGateway
        onFileUpload={handleFileUpload}
        onTextUpload={handleTextUpload}
        onLoadSample={handleLoadSample}
      />
    );
  }

  // 2. Extraction State: 3D Holographic Laser Scanner Modal
  if (studioState === 'extracting') {
    return (
      <Resume3DExtractorModal
        fileName={uploadedFileName}
        onComplete={handleExtractionComplete}
      />
    );
  }

  // 3. Studio State: Exact 3-Column UI from Screenshots
  const candidateName = resume?.name || resume?.fullName || resume?.contact?.name || 'Nikhil Singh';

  return (
    <div className="flex h-[calc(100vh-68px)] min-h-[700px] w-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
      {/* Column 1: Left Navigation Sidebar */}
      <LeftScoreSidebar
        score={score}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'home') setActiveTab('home');
          else if (tab === 'more_issues') handleSelectFix('summary');
        }}
        activeFix={activeFixId}
        onSelectFix={handleSelectFix}
        repetitionCount={repetitionCount}
        onUploadNew={() => setStudioState('upload')}
      />

      {/* Column 2: Center Dual View (Home Overview vs Fix Detail) */}
      <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800">
        {activeTab === 'home' ? (
          <HomeOverviewView
            candidateName={candidateName}
            score={score}
            onSelectFix={handleSelectFix}
            onHowItWorks={() => {}}
          />
        ) : (
          <FixDetailView
            fixId={activeFixId}
            onBackToHome={handleBackToHome}
            onApplyFix={handleApplyFix}
            onHighlightLines={handleHighlightLines}
          />
        )}
      </div>

      {/* Column 3: Right Authentic ATS Resume Sheet */}
      <RightDocumentSheet
        resume={resume}
        highlightWord={highlightWord}
        isHighlightActive={isHighlightActive}
        onOpenRewriter={() => handleSelectFix('repetition')}
        onOpenMagicWrite={() => handleSelectFix('summary')}
      />
    </div>
  );
}

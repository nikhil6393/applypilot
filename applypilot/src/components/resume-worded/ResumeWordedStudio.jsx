import React, { useState, useMemo, useEffect } from 'react';
import {
  Download, FileText, Sparkles, Target, Eye, Printer,
  Layers, ArrowLeft, RefreshCw, CheckCircle2, ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import LeftScoreNavigator from './LeftScoreNavigator';
import CenterDocumentViewer from './CenterDocumentViewer';
import RightFixInspector from './RightFixInspector';
import TargetedJobDrawer from './TargetedJobDrawer';
import { evaluateResumeWorded } from '../../lib/resumeWordedScorer';

/**
 * Generate standard MSO Word HTML (.doc) that preserves exact margins, typography, and links.
 */
function generateWordDocument(resume) {
  if (!resume) return '';
  const { contact = {}, experience = [], education = [], skills = [], projects = [], summary } = resume;

  return `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${contact.name || 'Resume'}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 { size: 8.5in 11.0in; margin: 0.7in 0.7in 0.7in 0.7in; mso-header-margin: 0.5in; mso-footer-margin: 0.5in; mso-paper-source: 0; }
    div.Section1 { page: Section1; }
    body { font-family: 'Calibri', 'Aptos', sans-serif; font-size: 11pt; line-height: 1.35; color: #111827; }
    h1 { font-size: 20pt; font-weight: bold; margin-bottom: 2pt; text-align: center; color: #0f172a; text-transform: uppercase; }
    .contact-line { text-align: center; font-size: 10pt; color: #475569; margin-bottom: 14pt; }
    h2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; border-bottom: 1.5pt solid #334155; margin-top: 14pt; margin-bottom: 6pt; color: #0f172a; letter-spacing: 0.5pt; }
    .role-header { font-weight: bold; font-size: 11pt; }
    .company-sub { font-size: 10pt; color: #475569; margin-bottom: 4pt; }
    ul { margin-top: 2pt; margin-bottom: 8pt; padding-left: 20pt; }
    li { margin-bottom: 3pt; }
    a { color: #2563eb; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="Section1">
    <h1>${contact.name || 'Candidate Name'}</h1>
    <div class="contact-line">
      ${[contact.email, contact.phone, contact.location, contact.linkedin, contact.github, contact.portfolio].filter(Boolean).join(' | ')}
    </div>

    ${summary ? `<h2>Professional Summary</h2><p>${summary}</p>` : ''}

    ${experience.length > 0 ? `
      <h2>Professional Experience</h2>
      ${experience.map((exp) => `
        <div style="margin-bottom: 10pt;">
          <table width="100%" style="margin-bottom: 2pt;">
            <tr>
              <td align="left" class="role-header">${exp.title || ''}${exp.company ? ` | ${exp.company}` : ''}</td>
              <td align="right" style="font-size: 10pt; color: #64748b;">${exp.period || exp.startDate || ''}</td>
            </tr>
          </table>
          <ul>
            ${(exp.bullets || []).map((b) => `<li>${b}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    ` : ''}

    ${projects.length > 0 ? `
      <h2>Technical Projects</h2>
      ${projects.map((p) => `
        <div style="margin-bottom: 8pt;">
          <b>${p.name || ''}</b> ${p.link ? `<a href="${p.link}">[Link]</a>` : ''}
          ${p.description ? `<p style="margin: 2pt 0;">${p.description}</p>` : ''}
        </div>
      `).join('')}
    ` : ''}

    ${skills.length > 0 ? `
      <h2>Technical Skills</h2>
      <p>${skills.join(', ')}</p>
    ` : ''}

    ${education.length > 0 ? `
      <h2>Education</h2>
      ${education.map((edu) => `
        <table width="100%">
          <tr>
            <td align="left"><b>${edu.school || ''}</b> ${edu.degree ? `— ${edu.degree}` : ''}</td>
            <td align="right" style="font-size: 10pt; color: #64748b;">${edu.graduationDate || edu.year || ''}</td>
          </tr>
        </table>
      `).join('')}
    ` : ''}
  </div>
</body>
</html>`;
}

/**
 * ResumeWordedStudio.jsx
 * Master 3-column workspace modeled after Resume Worded (resumeworded.com).
 */
export default function ResumeWordedStudio({
  resume,
  onUpdateResume,
  onSwitchToForm
}) {
  const [targetJdOpen, setTargetJdOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [fontFamily, setFontFamily] = useState('Inter');

  // Compute live scores and issues
  const scoreData = useMemo(() => {
    return evaluateResumeWorded(resume);
  }, [resume]);

  const { issues = [], overallScore, grade } = scoreData;

  // Resolve candidate real name
  const candidateName =
    resume?.name ||
    resume?.fullName ||
    resume?.contact?.name ||
    (resume?.contact?.email ? resume.contact.email.split('@')[0].replace(/[._0-9]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() : '') ||
    'Nikhil Singh';

  // Selected issue pointer
  const selectedIssue = useMemo(() => {
    if (!selectedIssueId && issues.length > 0) {
      return issues[0];
    }
    return issues.find((i) => i.id === selectedIssueId) || issues[0] || null;
  }, [issues, selectedIssueId]);

  const currentIssueIndex = useMemo(() => {
    if (!selectedIssue) return -1;
    return issues.findIndex((i) => i.id === selectedIssue.id);
  }, [issues, selectedIssue]);

  const handleSelectIssue = (issue) => {
    setSelectedIssueId(issue.id);
  };

  const handleNextIssue = () => {
    if (currentIssueIndex < issues.length - 1) {
      setSelectedIssueId(issues[currentIssueIndex + 1].id);
    }
  };

  const handlePrevIssue = () => {
    if (currentIssueIndex > 0) {
      setSelectedIssueId(issues[currentIssueIndex - 1].id);
    }
  };

  // 1-Click Apply Fix Handler
  const handleApplyFix = (issue, replacementText) => {
    if (!resume || !issue) return;
    const next = JSON.parse(JSON.stringify(resume));

    if (issue.location?.type === 'bullet') {
      const { expIndex, bulletIndex } = issue.location;
      if (next.experience?.[expIndex]?.bullets?.[bulletIndex] !== undefined) {
        next.experience[expIndex].bullets[bulletIndex] = replacementText;
        onUpdateResume(next);
      }
    } else if (issue.location?.type === 'summary') {
      next.summary = replacementText;
      onUpdateResume(next);
    }

    // Auto-advance to next issue
    if (currentIssueIndex < issues.length - 1) {
      setSelectedIssueId(issues[currentIssueIndex + 1].id);
    }
  };

  // Update skills from Targeted Job Drawer
  const handleUpdateSkills = (newSkills) => {
    const next = { ...resume, skills: newSkills };
    onUpdateResume(next);
  };

  // Format-Preserving Downloads
  const handleDownloadWord = () => {
    const html = generateWordDocument(resume);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidateName.replace(/\s+/g, '_')}_ATS_Calibrated.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    confetti({ particleCount: 40, spread: 50 });
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] min-h-[700px] bg-slate-100 dark:bg-slate-950 select-none">
      {/* Top Header Bar */}
      <header className="h-14 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 z-20">
        {/* Left: Branding & Candidate File */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                ApplyPilot Resume Studio
                <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold px-1.5 py-0.2 rounded">
                  PRO
                </span>
              </span>
              <p className="text-[10px] text-slate-400 truncate max-w-[220px]">
                {candidateName.replace(/\s+/g, '_')}_Resume.pdf
              </p>
            </div>
          </div>
        </div>

        {/* Center: Live Score Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-semibold text-slate-500">
            Overall Score:
          </span>
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
            overallScore >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
            overallScore >= 65 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
          }`}>
            {overallScore} / 100
          </span>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            · {grade}
          </span>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* Targeted Job Relevancy */}
          <button
            onClick={() => setTargetJdOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 transition-all shadow-xs"
          >
            <Target className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Targeted Resume</span>
          </button>

          {/* Form Switcher */}
          {onSwitchToForm && (
            <button
              onClick={onSwitchToForm}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Switch to detailed form input fields"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Form Fields</span>
            </button>
          )}

          <span className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Export PDF */}
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 rounded-xl transition-all shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>PDF</span>
          </button>

          {/* Export Word */}
          <button
            onClick={handleDownloadWord}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Word (.doc)</span>
          </button>
        </div>
      </header>

      {/* 3-Column Master Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column (256px / 288px): Navigator & Score */}
        <div className="w-64 xl:w-72 shrink-0 h-full">
          <LeftScoreNavigator
            scoreData={scoreData}
            selectedIssue={selectedIssue}
            onSelectIssue={handleSelectIssue}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            onOpenTargetJob={() => setTargetJdOpen(true)}
          />
        </div>

        {/* Center Column (Flex): Interactive Document Canvas */}
        <div className="flex-1 h-full min-w-0">
          <CenterDocumentViewer
            resume={resume}
            issues={issues}
            selectedIssue={selectedIssue}
            onSelectIssue={handleSelectIssue}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
          />
        </div>

        {/* Right Column (288px / 320px): Issue Details & AI Auto-Fix */}
        <div className="w-72 xl:w-80 shrink-0 h-full">
          <RightFixInspector
            selectedIssue={selectedIssue}
            onApplyFix={handleApplyFix}
            onNextIssue={handleNextIssue}
            onPrevIssue={handlePrevIssue}
            totalIssuesCount={issues.length}
            currentIssueIndex={currentIssueIndex}
            onClose={() => setSelectedIssueId(null)}
            scoreData={scoreData}
          />
        </div>
      </div>

      {/* Targeted Job Relevancy Drawer */}
      <TargetedJobDrawer
        isOpen={targetJdOpen}
        onClose={() => setTargetJdOpen(false)}
        resume={resume}
        onUpdateSkills={handleUpdateSkills}
      />
    </div>
  );
}

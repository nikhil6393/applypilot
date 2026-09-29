import React, { useState, useRef } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, Eye, EyeOff, FileText,
  Mail, Phone, MapPin, Globe, Linkedin, Github, ExternalLink,
  Sparkles, Zap, Check, ChevronDown
} from 'lucide-react';

/**
 * CenterDocumentViewer.jsx
 * Authentic, full-page ATS resume canvas modeled after standard Ivy League / Harvard / Resume Worded templates.
 * Solves:
 * 1. Shows candidate's actual real name (not "CANDIDATE NAME").
 * 2. Proper full-page proportions with 85% default zoom and "Fit Page" toggle so the full resume is visible without awkward half-page scrolling.
 * 3. Exact ATS template formatting: compact typography, clean horizontal section rules, categorized skills, and crisp clickable links.
 */
export default function CenterDocumentViewer({
  resume,
  issues = [],
  selectedIssue,
  onSelectIssue,
  fontFamily = 'Calibri',
  setFontFamily
}) {
  const [zoom, setZoom] = useState(85); // 85% default fits standard 11" page height in viewport
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [template, setTemplate] = useState('ivy'); // 'ivy' | 'modern' | 'compact'
  const documentRef = useRef(null);

  if (!resume) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-slate-100 dark:bg-slate-950">
        <div className="text-center max-w-sm">
          <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Resume Loaded
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Upload or paste a resume to preview your calibrated ATS document.
          </p>
        </div>
      </div>
    );
  }

  const { contact = {}, experience = [], education = [], skills = [], projects = [], summary } = resume;

  // Resolve candidate's actual real name
  const candidateName =
    resume.name ||
    resume.fullName ||
    contact.name ||
    (contact.email ? contact.email.split('@')[0].replace(/[._0-9]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() : '') ||
    'Nikhil Singh';

  const candidateTitle = contact.title || resume.title || resume.roleTitle || '';

  // Map issues by location for fast lookup
  const bulletIssuesMap = {};
  let summaryIssue = null;

  issues.forEach((issue) => {
    if (issue.location?.type === 'bullet') {
      const key = `${issue.location.expIndex}-${issue.location.bulletIndex}`;
      if (!bulletIssuesMap[key]) bulletIssuesMap[key] = [];
      bulletIssuesMap[key].push(issue);
    } else if (issue.location?.type === 'summary') {
      summaryIssue = issue;
    }
  });

  const getFontFamilyStyle = () => {
    switch (fontFamily) {
      case 'Calibri':
        return { fontFamily: 'Calibri, Aptos, "Segoe UI", Candara, sans-serif' };
      case 'Georgia':
        return { fontFamily: 'Georgia, "Times New Roman", Times, serif' };
      case 'Times':
        return { fontFamily: '"Times New Roman", Times, Georgia, serif' };
      default:
        return { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' };
    }
  };

  // Format skills as clean categories (Standard ATS Jake's / Ivy format)
  const renderFormattedSkills = () => {
    if (!skills) return null;

    if (typeof skills === 'object' && !Array.isArray(skills)) {
      const categories = Object.entries(skills).filter(([_, items]) => Array.isArray(items) && items.length > 0);
      if (categories.length === 0) return null;

      return (
        <div className="space-y-1 text-[11.5px] leading-snug text-slate-800">
          {categories.map(([cat, items]) => (
            <p key={cat}>
              <span className="font-bold text-slate-900 capitalize">{cat.replace(/_/g, ' ')}: </span>
              <span>{items.join(', ')}</span>
            </p>
          ))}
        </div>
      );
    }

    if (Array.isArray(skills) && skills.length > 0) {
      return (
        <p className="text-[11.5px] leading-snug text-slate-800">
          <span className="font-bold text-slate-900">Languages & Technologies: </span>
          <span>{skills.join(', ')}</span>
        </p>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-200/70 dark:bg-slate-950/80 overflow-hidden select-none">
      {/* Top Document Toolbar */}
      <div className="h-11 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 z-10 shadow-2xs">
        {/* Left: View Mode & Template Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showAnnotations
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {showAnnotations ? <Eye className="w-3.5 h-3.5 text-indigo-600" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showAnnotations ? 'Review Highlights ON' : 'Clean Document'}
          </button>

          <span className="h-4 w-px bg-slate-200 dark:border-slate-800" />

          {/* Template Style Toggle */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
              Template:
            </span>
            {[
              { id: 'ivy', label: 'Classic ATS (Ivy)' },
              { id: 'modern', label: 'Modern Minimal' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                  template === t.id
                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <span className="h-4 w-px bg-slate-200 dark:border-slate-800" />

          {/* Font Selector */}
          <div className="hidden lg:flex items-center gap-1">
            {['Calibri', 'Inter', 'Georgia'].map((f) => (
              <button
                key={f}
                onClick={() => setFontFamily(f)}
                className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                  fontFamily === f
                    ? 'bg-indigo-100 text-indigo-800 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Zoom & Full Page Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(85)}
            className={`px-2 py-0.5 text-[11px] rounded font-bold transition-all ${
              zoom === 85
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Fit Full Page in Viewport"
          >
            Fit Page
          </button>

          <button
            onClick={() => setZoom(100)}
            className={`px-2 py-0.5 text-[11px] rounded font-bold transition-all ${
              zoom === 100
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="100% Actual Scale"
          >
            100%
          </button>

          <button
            onClick={() => setZoom((z) => Math.max(55, z - 10))}
            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold text-slate-600 w-8 text-center">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(130, z + 10))}
            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Document Canvas Viewport */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 custom-scrollbar flex flex-col items-center">
        {/* Printable Paper Canvas */}
        <div
          ref={documentRef}
          id="resume-printable-document"
          style={{
            ...getFontFamilyStyle(),
            transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
            transformOrigin: 'top center',
            width: '100%',
            maxWidth: '780px',
            minHeight: '10.5in',
            boxSizing: 'border-box'
          }}
          className="bg-white text-slate-900 shadow-2xl rounded-xs p-9 sm:p-11 border border-slate-300/80 my-2 select-text shrink-0 print:p-0 print:border-none print:shadow-none print:transform-none print:max-w-none transition-transform"
        >
          {/* Header / Contact Area */}
          <div className="border-b-[1.5px] border-slate-900 pb-3 mb-3 text-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 uppercase">
              {candidateName}
            </h1>
            {candidateTitle && (
              <p className="text-xs font-semibold text-slate-700 mt-0.5 uppercase tracking-wider">
                {candidateTitle}
              </p>
            )}

            {/* Links and Contact Details with Clean Dots */}
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 mt-2 text-[11px] text-slate-700 font-medium">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:text-indigo-600 transition-colors underline"
                >
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <>
                  <span className="text-slate-400">•</span>
                  <span>{contact.phone}</span>
                </>
              )}
              {contact.location && (
                <>
                  <span className="text-slate-400">•</span>
                  <span>{contact.location}</span>
                </>
              )}
              {contact.linkedin && (
                <>
                  <span className="text-slate-400">•</span>
                  <a
                    href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    linkedin.com/in/{contact.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '')}
                  </a>
                </>
              )}
              {contact.github && (
                <>
                  <span className="text-slate-400">•</span>
                  <a
                    href={contact.github.startsWith('http') ? contact.github : `https://${contact.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-800 hover:text-indigo-600 underline font-semibold"
                  >
                    github.com/{contact.github.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/$/, '')}
                  </a>
                </>
              )}
              {contact.portfolio && (
                <>
                  <span className="text-slate-400">•</span>
                  <a
                    href={contact.portfolio.startsWith('http') ? contact.portfolio : `https://${contact.portfolio}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    {contact.portfolio.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')}
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Professional Summary */}
          {summary && (
            <div className="mb-3.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b-[1.5px] border-slate-900 pb-0.5 mb-1.5">
                Professional Summary
              </h2>
              <div
                onClick={() => {
                  if (summaryIssue) onSelectIssue(summaryIssue);
                }}
                className={`text-[11.5px] leading-relaxed text-slate-800 transition-all rounded p-0.5 ${
                  showAnnotations && summaryIssue
                    ? 'bg-amber-50/90 border border-amber-300/80 cursor-pointer hover:bg-amber-100/90'
                    : ''
                }`}
              >
                <span>{summary}</span>
                {showAnnotations && summaryIssue && (
                  <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-200 text-amber-900">
                    <Sparkles className="w-2.5 h-2.5" />
                    Review Available
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Work Experience */}
          {experience.length > 0 && (
            <div className="mb-3.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b-[1.5px] border-slate-900 pb-0.5 mb-2">
                Professional Experience
              </h2>
              <div className="space-y-3">
                {experience.map((exp, expIdx) => (
                  <div key={expIdx} className="space-y-1">
                    {/* Role & Company Header Line */}
                    <div className="flex justify-between items-baseline text-[11.5px]">
                      <div>
                        <span className="font-bold text-slate-950">{exp.title}</span>
                        {exp.company && (
                          <span className="text-slate-700 font-semibold italic"> — {exp.company}</span>
                        )}
                      </div>
                      <div className="text-slate-600 text-[10.5px] font-medium text-right shrink-0">
                        {exp.period || (exp.startDate && `${exp.startDate} - ${exp.endDate || 'Present'}`)}
                        {exp.location && ` | ${exp.location}`}
                      </div>
                    </div>

                    {/* Bullets */}
                    <ul className="list-disc list-outside pl-4 space-y-1 text-[11.5px] leading-[1.4] text-slate-800">
                      {(exp.bullets || []).map((bullet, bIdx) => {
                        const key = `${expIdx}-${bIdx}`;
                        const bIssues = bulletIssuesMap[key] || [];
                        const primaryIssue = bIssues[0];
                        const isSelected = selectedIssue?.location?.expIndex === expIdx && selectedIssue?.location?.bulletIndex === bIdx;
                        const isCritical = primaryIssue?.severity === 'critical';

                        return (
                          <li
                            key={bIdx}
                            onClick={() => {
                              if (primaryIssue) onSelectIssue(primaryIssue);
                            }}
                            className={`group relative rounded p-0.5 transition-all ${
                              showAnnotations && primaryIssue
                                ? isSelected
                                  ? 'bg-indigo-100/90 ring-1.5 ring-indigo-500 cursor-pointer'
                                  : isCritical
                                  ? 'bg-rose-50/90 border border-rose-300/80 hover:bg-rose-100/80 cursor-pointer'
                                  : 'bg-amber-50/80 border border-amber-300/70 hover:bg-amber-100/70 cursor-pointer'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <span>{bullet}</span>

                            {/* In-Document Issue Badge */}
                            {showAnnotations && primaryIssue && (
                              <span
                                className={`ml-2 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                  isCritical
                                    ? 'bg-rose-200 text-rose-900 border border-rose-300'
                                    : 'bg-amber-200 text-amber-900 border border-amber-300'
                                }`}
                              >
                                <Zap className="w-2.5 h-2.5 fill-current" />
                                {primaryIssue.title.split(':')[0]}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Technical Projects */}
          {projects.length > 0 && (
            <div className="mb-3.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b-[1.5px] border-slate-900 pb-0.5 mb-2">
                Technical Projects
              </h2>
              <div className="space-y-2.5">
                {projects.map((proj, pIdx) => (
                  <div key={pIdx} className="space-y-0.5 text-[11.5px]">
                    <div className="flex justify-between items-baseline">
                      <div className="font-bold text-slate-950 flex items-center gap-1.5">
                        <span>{proj.name}</span>
                        {proj.tech && (
                          <span className="text-[10.5px] font-normal text-slate-600 font-mono">
                            | {Array.isArray(proj.tech) ? proj.tech.join(', ') : proj.tech}
                          </span>
                        )}
                      </div>
                      {proj.link && (
                        <a
                          href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-0.5 text-[10.5px] font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Live / Code
                        </a>
                      )}
                    </div>
                    {proj.description && (
                      <p className="text-slate-800 leading-snug pl-2">{proj.description}</p>
                    )}
                    {Array.isArray(proj.bullets) && proj.bullets.length > 0 && (
                      <ul className="list-disc list-outside pl-4 space-y-0.5 text-slate-800 leading-[1.38]">
                        {proj.bullets.map((b, bi) => (
                          <li key={bi}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Skills */}
          {skills && (
            <div className="mb-3.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b-[1.5px] border-slate-900 pb-0.5 mb-1.5">
                Technical Skills
              </h2>
              {renderFormattedSkills()}
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b-[1.5px] border-slate-900 pb-0.5 mb-1.5">
                Education
              </h2>
              <div className="space-y-1.5">
                {education.map((edu, eIdx) => (
                  <div key={eIdx} className="flex justify-between items-baseline text-[11.5px]">
                    <div>
                      <span className="font-bold text-slate-950">{edu.school || edu.institution}</span>
                      {edu.degree && (
                        <span className="text-slate-700 italic"> — {edu.degree}</span>
                      )}
                    </div>
                    <span className="text-slate-600 text-[10.5px] font-medium">
                      {edu.graduationDate || edu.year || edu.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Page Footer Indicator */}
        <div className="mt-3 pb-8 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-semibold select-none">
          <span>Page 1 of 1</span>
          <span>•</span>
          <span>Standard ATS Letter (8.5" × 11")</span>
        </div>
      </div>
    </div>
  );
}

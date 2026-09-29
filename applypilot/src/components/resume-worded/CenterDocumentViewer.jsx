import React, { useState, useRef } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, Eye, EyeOff, FileText,
  Mail, Phone, MapPin, Globe, Linkedin, Github, ExternalLink,
  Sparkles, Zap
} from 'lucide-react';

/**
 * CenterDocumentViewer.jsx
 * Interactive resume document canvas modeled after Resume Worded.
 * Features in-document colored annotations, click-to-inspect, and zoom controls.
 */
export default function CenterDocumentViewer({
  resume,
  issues = [],
  selectedIssue,
  onSelectIssue,
  fontFamily = 'Inter',
  setFontFamily
}) {
  const [zoom, setZoom] = useState(100);
  const [showAnnotations, setShowAnnotations] = useState(true);
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
            Upload a resume to experience Resume Worded line-by-line review.
          </p>
        </div>
      </div>
    );
  }

  const { contact = {}, experience = [], education = [], skills = [], projects = [], summary } = resume;

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
        return { fontFamily: 'Calibri, Aptos, Candara, Segoe UI, sans-serif' };
      case 'Georgia':
        return { fontFamily: 'Georgia, Times New Roman, serif' };
      case 'Merriweather':
        return { fontFamily: 'Merriweather, Georgia, serif' };
      default:
        return { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/80 dark:bg-slate-950/80 overflow-hidden">
      {/* Top Document Toolbar */}
      <div className="h-11 px-4 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm flex items-center justify-between shrink-0">
        {/* Left: View & Annotation Toggle */}
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
            {showAnnotations ? 'Review Highlights ON' : 'Clean Preview'}
          </button>

          <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Font Selector */}
          <div className="flex items-center gap-1">
            {['Inter', 'Calibri', 'Georgia'].map((f) => (
              <button
                key={f}
                onClick={() => setFontFamily(f)}
                className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                  fontFamily === f
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(60, z - 10))}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-semibold text-slate-500 w-10 text-center">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(140, z + 10))}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ml-1"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Document Canvas Viewport */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar bg-slate-100/90 dark:bg-slate-950/90">
        <div className="w-full flex justify-center">
          <div
            ref={documentRef}
            id="resume-printable-document"
            style={{
              ...getFontFamilyStyle(),
              transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease',
              width: '100%',
              maxWidth: '780px',
              minHeight: '10.5in',
              boxSizing: 'border-box'
            }}
            className="bg-white text-slate-900 shadow-xl rounded-sm p-8 sm:p-10 border border-slate-200/90 my-2 select-text shrink-0 print:p-0 print:border-none print:shadow-none print:transform-none print:max-w-none"
          >
          {/* Header / Contact Area */}
          <div className="border-b border-slate-300 pb-5 mb-5 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 uppercase">
              {contact.name || 'Candidate Name'}
            </h1>
            {contact.title && (
              <p className="text-sm font-semibold text-slate-700 mt-1 uppercase tracking-wide">
                {contact.title}
              </p>
            )}

            {/* Links and Contact Details */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-600">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {contact.phone}
                </span>
              )}
              {contact.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {contact.location}
                </span>
              )}
              {contact.linkedin && (
                <a
                  href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  <Linkedin className="w-3.5 h-3.5 text-indigo-600" />
                  {contact.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/')}
                </a>
              )}
              {contact.github && (
                <a
                  href={contact.github.startsWith('http') ? contact.github : `https://${contact.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-slate-800 hover:text-indigo-600 transition-colors"
                >
                  <Github className="w-3.5 h-3.5 text-slate-700" />
                  {contact.github.replace(/^https?:\/\/(www\.)?github\.com\//i, 'github.com/')}
                </a>
              )}
              {contact.portfolio && (
                <a
                  href={contact.portfolio.startsWith('http') ? contact.portfolio : `https://${contact.portfolio}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  {contact.portfolio.replace(/^https?:\/\/(www\.)?/i, '')}
                </a>
              )}
            </div>
          </div>

          {/* Professional Summary */}
          {summary && (
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                Professional Summary
              </h2>
              <div
                onClick={() => {
                  if (summaryIssue) onSelectIssue(summaryIssue);
                }}
                className={`text-xs leading-relaxed text-slate-700 transition-all rounded p-1 ${
                  showAnnotations && summaryIssue
                    ? 'bg-amber-50/80 border border-amber-300/80 cursor-pointer hover:bg-amber-100/90'
                    : ''
                }`}
              >
                {summary}
                {showAnnotations && summaryIssue && (
                  <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                    <Sparkles className="w-2.5 h-2.5" />
                    Review Available
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Work Experience */}
          {experience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-3">
                Professional Experience
              </h2>
              <div className="space-y-4">
                {experience.map((exp, expIdx) => (
                  <div key={expIdx} className="space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{exp.title}</span>
                        {exp.company && (
                          <span className="text-slate-600 ml-1.5 font-medium">| {exp.company}</span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px] font-medium text-right shrink-0">
                        {exp.period || (exp.startDate && `${exp.startDate} - ${exp.endDate || 'Present'}`)}
                        {exp.location && ` · ${exp.location}`}
                      </div>
                    </div>

                    <ul className="list-disc list-outside pl-5 space-y-2 text-xs leading-relaxed text-slate-700">
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
                            className={`group relative rounded p-1 transition-all ${
                              showAnnotations && primaryIssue
                                ? isSelected
                                  ? 'bg-indigo-100/90 ring-2 ring-indigo-500 cursor-pointer'
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
                                className={`ml-2 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
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

          {/* Technical Projects */}
          {projects.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-3">
                Key Technical Projects
              </h2>
              <div className="space-y-3">
                {projects.map((proj, pIdx) => (
                  <div key={pIdx} className="space-y-1 text-xs">
                    <div className="flex justify-between items-baseline">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {proj.name}
                        {proj.link && (
                          <a
                            href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline flex items-center gap-0.5 text-[11px] font-normal"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Live / Repo
                          </a>
                        )}
                      </div>
                      {proj.tech && (
                        <span className="text-[11px] text-slate-500 font-mono">
                          {Array.isArray(proj.tech) ? proj.tech.join(', ') : proj.tech}
                        </span>
                      )}
                    </div>
                    {proj.description && (
                      <p className="text-slate-700 leading-relaxed pl-1">{proj.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                Technical Skills & Tools
              </h2>
              <div className="flex flex-wrap gap-1.5 text-xs text-slate-700">
                {skills.map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                Education
              </h2>
              <div className="space-y-2">
                {education.map((edu, eIdx) => (
                  <div key={eIdx} className="flex justify-between items-baseline text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{edu.school}</span>
                      {edu.degree && (
                        <span className="text-slate-600 ml-1.5">· {edu.degree}</span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      {edu.graduationDate || edu.year || edu.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
}

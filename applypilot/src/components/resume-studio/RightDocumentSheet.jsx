import React, { useRef } from 'react';
import {
  Download, Printer, Sparkles, Zap, ExternalLink,
  Mail, Phone, MapPin, Globe, Linkedin, Github, Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * Generate standard MSO Word HTML (.doc) preserving all formatting.
 */
function generateWordDoc(resume) {
  if (!resume) return '';
  const contact = resume.contact || {};
  const experience = resume.experience || [];
  const education = resume.education || [];
  const projects = resume.projects || [];

  return `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${resume.name || 'Resume'}</title>
<style>
  @page { size: 8.5in 11in; margin: 0.65in; }
  body { font-family: 'Calibri', 'Aptos', sans-serif; font-size: 10.5pt; line-height: 1.35; color: #111; }
  h1 { font-size: 18pt; font-weight: bold; text-align: center; margin: 0 0 3pt 0; text-transform: uppercase; }
  .contact { text-align: center; font-size: 9.5pt; color: #475569; margin-bottom: 12pt; }
  h2 { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1.5pt solid #0f172a; margin: 10pt 0 4pt 0; }
  ul { margin: 2pt 0 6pt 16pt; padding: 0; }
  li { margin-bottom: 2pt; }
</style>
</head>
<body>
  <h1>${resume.name || 'Nikhil Singh'}</h1>
  <div class="contact">
    ${[contact.phone, contact.email, contact.location, contact.github, contact.linkedin].filter(Boolean).join(' | ')}
  </div>
  ${resume.summary ? `<h2>Summary</h2><p>${resume.summary}</p>` : ''}
  ${education.length > 0 ? `<h2>Education</h2>${education.map(e => `<p><b>${e.school || ''}</b> — ${e.degree || ''} (${e.graduationDate || ''})</p>`).join('')}` : ''}
  ${experience.length > 0 ? `<h2>Experience</h2>${experience.map(exp => `<div><b>${exp.title || ''}</b> — ${exp.company || ''} (${exp.period || ''})<ul>${(exp.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul></div>`).join('')}` : ''}
  ${projects.length > 0 ? `<h2>Projects</h2>${projects.map(p => `<div><b>${p.name || ''}</b><p>${p.description || ''}</p></div>`).join('')}` : ''}
</body>
</html>`;
}

/**
 * RightDocumentSheet.jsx
 * Exactly reproduces the right column from Screenshots 1 & 2:
 * - Top dark toolbar: "GET PRO 75% OFF", "RESUME REWRITER", "MAGIC WRITE", "PDF", "WORD"
 * - Full-page Harvard/Jake's ATS resume canvas with Nikhil Singh's actual content
 * - Interactive highlights over repetitive words (e.g. "Built" highlighted in coral)
 */
export default function RightDocumentSheet({
  resume,
  highlightWord = 'Built',
  isHighlightActive = true,
  onOpenRewriter,
  onOpenMagicWrite
}) {
  const documentRef = useRef(null);

  if (!resume) return null;

  const contact = resume.contact || {};
  const experience = resume.experience || [];
  const education = resume.education || [];
  const projects = resume.projects || [];
  const skills = resume.skills || [];

  const candidateName = resume.name || resume.fullName || contact.name || 'Nikhil Singh';

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleDownloadWord = () => {
    const html = generateWordDoc(resume);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidateName.replace(/\s+/g, '_')}_Resume.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    confetti({ particleCount: 30, spread: 50 });
  };

  // Helper to render text with highlighted repetitive words
  const renderHighlightedText = (text) => {
    if (!isHighlightActive || !highlightWord || typeof text !== 'string') {
      return text;
    }

    const regex = new RegExp(`\\b(${highlightWord})\\b`, 'gi');
    if (!regex.test(text)) return text;

    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.toLowerCase() === highlightWord.toLowerCase()) {
        return (
          <span
            key={i}
            className="bg-rose-200/90 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 font-bold px-1 rounded mx-0.5 border-b-2 border-rose-500 shadow-2xs"
            title={`Repetitive word: "${part}"`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="w-[480px] xl:w-[560px] 2xl:w-[620px] h-full bg-slate-900 flex flex-col shrink-0 select-none overflow-hidden border-l border-slate-800">
      {/* Top Navy/Dark Toolbar matching screenshot */}
      <div className="h-10 bg-slate-950 px-3 flex items-center justify-between border-b border-slate-800 text-[11px] text-slate-300 font-bold">
        {/* Left: PRO Badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400">★</span>
          <span className="text-white font-extrabold tracking-wider">GET PRO</span>
          <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded">
            75% OFF
          </span>
        </div>

        {/* Right Tools & Exports */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenRewriter}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="hidden xl:inline">RESUME REWRITER</span>
          </button>

          <button
            onClick={onOpenMagicWrite}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span className="hidden xl:inline">MAGIC WRITE</span>
          </button>

          <span className="h-3 w-px bg-slate-800 mx-0.5" />

          {/* Export PDF */}
          <button
            onClick={handleDownloadPdf}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 transition-all"
            title="Download PDF"
          >
            <Printer className="w-3 h-3 text-slate-400" />
            <span>PDF</span>
          </button>

          {/* Export Word */}
          <button
            onClick={handleDownloadWord}
            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition-all"
            title="Download Word (.doc)"
          >
            <Download className="w-3 h-3" />
            <span>Word</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Container with Full Page Aspect */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar bg-slate-200/90 flex justify-center">
        <div
          ref={documentRef}
          id="resume-printable-document"
          style={{
            fontFamily: 'Calibri, Aptos, "Segoe UI", Candara, sans-serif',
            width: '100%',
            maxWidth: '560px',
            minHeight: '800px',
            boxSizing: 'border-box'
          }}
          className="bg-white text-slate-900 shadow-2xl rounded-xs p-6 sm:p-8 border border-slate-300 select-text shrink-0 print:p-0 print:border-none print:shadow-none print:max-w-none text-[10.5px] leading-[1.35]"
        >
          {/* Header */}
          <div className="border-b-[1.5px] border-slate-900 pb-2 mb-2.5 text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-950 uppercase">
              {candidateName}
            </h1>

            {/* Contact Line */}
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-slate-700 font-medium">
              {contact.phone && <span>{contact.phone}</span>}
              {contact.email && (
                <>
                  <span className="text-slate-400">•</span>
                  <a href={`mailto:${contact.email}`} className="text-slate-800 hover:text-indigo-600 underline">
                    {contact.email}
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
                    className="text-slate-800 hover:text-indigo-600 font-semibold underline"
                  >
                    GitHub
                  </a>
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
                    LinkedIn
                  </a>
                </>
              )}
            </div>
          </div>

          {/* SUMMARY */}
          {resume.summary && (
            <div className="mb-2.5">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b-[1.2px] border-slate-900 pb-0.5 mb-1">
                SUMMARY
              </h2>
              <p className="text-slate-800 leading-snug">
                {renderHighlightedText(resume.summary)}
              </p>
            </div>
          )}

          {/* EDUCATION */}
          {education.length > 0 && (
            <div className="mb-2.5">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b-[1.2px] border-slate-900 pb-0.5 mb-1">
                EDUCATION
              </h2>
              <div className="space-y-1">
                {education.map((edu, idx) => (
                  <div key={idx} className="flex justify-between items-baseline">
                    <div>
                      <span className="font-bold text-slate-950">{edu.school || edu.institution}</span>
                      {edu.degree && <span className="italic text-slate-700"> — {edu.degree}</span>}
                    </div>
                    <span className="text-slate-600 text-[9.5px]">
                      {edu.graduationDate || edu.year}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXPERIENCE */}
          {experience.length > 0 && (
            <div className="mb-2.5">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b-[1.2px] border-slate-900 pb-0.5 mb-1">
                EXPERIENCE
              </h2>
              <div className="space-y-2">
                {experience.map((exp, expIdx) => (
                  <div key={expIdx} className="space-y-0.5">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <span className="font-bold text-slate-950">{exp.title}</span>
                        {exp.company && <span className="font-semibold text-slate-700"> | {exp.company}</span>}
                      </div>
                      <span className="text-slate-600 text-[9.5px]">
                        {exp.period || exp.dates}
                      </span>
                    </div>

                    <ul className="list-disc list-outside pl-3.5 space-y-0.5 text-slate-800 leading-snug">
                      {(exp.bullets || []).map((bullet, bIdx) => (
                        <li key={bIdx}>
                          {renderHighlightedText(bullet)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROJECTS */}
          {projects.length > 0 && (
            <div className="mb-2.5">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b-[1.2px] border-slate-900 pb-0.5 mb-1">
                PROJECTS
              </h2>
              <div className="space-y-1.5">
                {projects.map((proj, pIdx) => (
                  <div key={pIdx} className="space-y-0.5">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-950">{proj.name}</span>
                      {proj.tech && (
                        <span className="text-slate-600 text-[9.5px] font-mono">
                          {Array.isArray(proj.tech) ? proj.tech.join(', ') : proj.tech}
                        </span>
                      )}
                    </div>
                    {proj.description && (
                      <p className="text-slate-800 pl-1">{renderHighlightedText(proj.description)}</p>
                    )}
                    {Array.isArray(proj.bullets) && (
                      <ul className="list-disc list-outside pl-3.5 space-y-0.5 text-slate-800 leading-snug">
                        {proj.bullets.map((b, bi) => (
                          <li key={bi}>{renderHighlightedText(b)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TECHNICAL SKILLS */}
          {skills && (
            <div className="mb-2.5">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b-[1.2px] border-slate-900 pb-0.5 mb-1">
                TECHNICAL SKILLS
              </h2>
              {typeof skills === 'object' && !Array.isArray(skills) ? (
                <div className="space-y-0.5 text-[10px] leading-tight text-slate-800">
                  {Object.entries(skills).map(([cat, list]) => (
                    Array.isArray(list) && list.length > 0 ? (
                      <p key={cat}>
                        <span className="font-bold capitalize">{cat}: </span>
                        <span>{list.join(', ')}</span>
                      </p>
                    ) : null
                  ))}
                </div>
              ) : (
                <p className="text-[10px] leading-tight text-slate-800">
                  <span className="font-bold">Skills: </span>
                  <span>{Array.isArray(skills) ? skills.join(', ') : String(skills)}</span>
                </p>
              )}
            </div>
          )}

          {/* CERTIFICATIONS */}
          {resume.certifications && resume.certifications.length > 0 && (
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b-[1.2px] border-slate-900 pb-0.5 mb-1">
                CERTIFICATIONS
              </h2>
              <p className="text-[10px] text-slate-800">
                {resume.certifications.map(c => typeof c === 'string' ? c : `${c.name} (${c.issuer || ''})`).join(' • ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

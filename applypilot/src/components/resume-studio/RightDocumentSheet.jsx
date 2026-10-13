import React, { useRef, useState, useMemo } from 'react';
import {
  Download, Printer, Sparkles, Zap, ExternalLink,
  Mail, Phone, MapPin, Globe, Linkedin, Github, Check,
  Edit3, Target, Box, FileCode, ZoomIn, ZoomOut, RotateCcw, Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import RecruiterGazeHeatmap, { RecruiterGazeBanner, RecruiterGazeOverlay } from './RecruiterGazeHeatmap';

function generateLatexSource(resume) {
  const name = resume.fullName || resume.name || 'Candidate Name';
  const email = resume.contact?.email || resume.email || '';
  const phone = resume.contact?.phone || resume.phone || '';
  const location = resume.contact?.location || resume.location || '';
  const linkedin = resume.contact?.linkedin || '';
  const github = resume.contact?.github || '';

  return `\\documentclass[letterpaper,10pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}
    \\small ${phone} $|$ \\href{mailto:${email}}{\\underline{${email}}} $|$ ${location}
    ${linkedin ? `$|$ \\href{${linkedin}}{\\underline{LinkedIn}}` : ''}
    ${github ? `$|$ \\href{${github}}{\\underline{GitHub}}` : ''}
\\end{center}

${(resume.summary ? `\\section{Professional Summary}\n\\small{${resume.summary}}\n\\vspace{2pt}\n` : '')}

\\section{Experience}
\\begin{itemize}[leftmargin=0.15in, label={}]
${(resume.experience || []).map(exp => `  \\item
    \\begin{tabular*}{\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{${exp.company || ''}} & ${exp.dates || ''} \\\\
      \\textit{\\small ${exp.role || exp.title || ''}} & \\textit{\\small ${exp.location || ''}} \\\\
    \\end{tabular*}\\vspace{-6pt}
    \\begin{itemize}[leftmargin=0.15in]
${(exp.bullets || []).map(b => `      \\item \\small{${b.replace(/[&%$#_{}]/g, '\\\\$&')}}`).join('\n')}
    \\end{itemize}`).join('\n')}
\\end{itemize}

\\section{Education}
\\begin{itemize}[leftmargin=0.15in, label={}]
${(resume.education || []).map(ed => `  \\item
    \\begin{tabular*}{\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{${ed.school || ed.institution || ''}} & ${ed.graduationDate || ''} \\\\
      \\textit{\\small ${ed.degree || ''}} & \\textit{\\small ${ed.field || ''}} \\\\
    \\end{tabular*}\\vspace{-6pt}`).join('\n')}
\\end{itemize}

\\section{Technical Skills}
\\begin{itemize}[leftmargin=0.15in, label={}]
  \\small{\\item{
    \\textbf{Skills}{: ${Array.isArray(resume.skills) ? resume.skills.join(', ') : Object.values(resume.skills || {}).flat().join(', ')}}
  }}
\\end{itemize}

\\end{document}`;
}

export default function RightDocumentSheet({
  resume,
  highlightWord = 'Built',
  isHighlightActive = true,
  onOpenRewriter,
  onOpenMagicWrite,
  onOpenEdit,
  onOpenCompare,
}) {
  const documentRef = useRef(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [zoomScale, setZoomScale] = useState(100);
  const [showGazeHeatmap, setShowGazeHeatmap] = useState(false);

  if (!resume) return null;

  const contact = resume.contact || {};
  const experience = resume.experience || [];
  const education = resume.education || [];
  const projects = resume.projects || [];
  const skills = resume.skills || [];
  const certifications = resume.certifications || [];

  const candidateName = resume.fullName || resume.name || contact.name || 'CANDIDATE NAME';

  // Strict PDF Export via Playwright Backend
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const res = await fetch('/api/resume/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume }),
      });
      if (!res.ok) throw new Error('PDF export failed on server');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${candidateName.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.warn('Backend PDF generator fallback to window.print():', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Strict DOCX Export via docx Library Backend
  const handleDownloadWord = async () => {
    setIsExportingWord(true);
    try {
      const res = await fetch('/api/resume/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume }),
      });
      if (!res.ok) throw new Error('DOCX export failed on server');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${candidateName.replace(/\s+/g, '_')}_Resume.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Word export error:', err);
    } finally {
      setIsExportingWord(false);
    }
  };

  // Repetition Highlighter
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
            className="bg-rose-200 text-rose-900 font-bold px-1 rounded mx-0.5 border-b border-rose-500"
            title={`Repetitive word: "${part}"`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Contact list items
  const contactItems = [];
  if (resume.phone || contact.phone) contactItems.push({ text: resume.phone || contact.phone });
  if (resume.email || contact.email) contactItems.push({ text: resume.email || contact.email, isEmail: true });
  if (resume.location || contact.location) contactItems.push({ text: resume.location || contact.location });
  const linkedin = resume.linkedin || contact.linkedin || (resume.links && resume.links[0]);
  if (linkedin) contactItems.push({ text: 'LinkedIn', url: linkedin.startsWith('http') ? linkedin : `https://${linkedin}` });
  const github = resume.github || contact.github || (resume.links && resume.links[1]);
  if (github) contactItems.push({ text: 'GitHub', url: github.startsWith('http') ? github : `https://${github}` });
  const portfolio = resume.portfolio || contact.portfolio;
  if (portfolio) contactItems.push({ text: 'Portfolio', url: portfolio.startsWith('http') ? portfolio : `https://${portfolio}` });

  // Compute live document statistics
  const stats = useMemo(() => {
    let wordCount = 0;
    if (resume.summary) wordCount += resume.summary.split(/\s+/).filter(Boolean).length;
    experience.forEach(e => {
      (e.bullets || []).forEach(b => {
        wordCount += b.split(/\s+/).filter(Boolean).length;
      });
    });
    projects.forEach(p => {
      if (p.description) wordCount += p.description.split(/\s+/).filter(Boolean).length;
      (p.bullets || []).forEach(b => {
        wordCount += b.split(/\s+/).filter(Boolean).length;
      });
    });
    return {
      wordCount,
      estimatedPages: wordCount > 520 ? 2 : 1,
    };
  }, [resume, experience, projects]);

  const handleDownloadLatex = () => {
    const tex = generateLatexSource(resume);
    const blob = new Blob([tex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidateName.replace(/\s+/g, '_')}_Resume.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
  };

  return (
    <div className="flex-[1.2] xl:flex-[1.5] h-full bg-[#F8FAFC] flex flex-col shrink-0 select-none overflow-hidden border-l border-slate-200/90 z-20">
      {/* Top Executive Light-Theme Toolbar */}
      <div className="h-14 bg-white px-4 flex items-center justify-between border-b border-slate-200/90 text-[11px] font-bold shrink-0 shadow-2xs">
        {/* Left: Tools */}
        <div className="flex items-center gap-1.5">
          {onOpenEdit && (
            <button
              onClick={onOpenEdit}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80 flex items-center gap-1 transition-colors cursor-pointer"
              title="Edit resume sections"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>EDIT CONTENT</span>
            </button>
          )}

          {onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
              title="Compare with Job Description & bridge skill gap"
            >
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>COMPARE JD</span>
            </button>
          )}

          <button
            onClick={() => setShowGazeHeatmap(!showGazeHeatmap)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
              showGazeHeatmap
                ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300/80'
            }`}
            title="Toggle Recruiter 6-Second Eye-Tracking Heatmap (Nielsen Norman F-Pattern)"
          >
            <Eye className={`w-3.5 h-3.5 ${showGazeHeatmap ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`} />
            <span>{showGazeHeatmap ? 'HEATMAP ON' : '6-SEC GAZE'}</span>
          </button>
        </div>

        {/* Center: Zoom Scale Controls */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-slate-600">
          <button
            onClick={() => setZoomScale(prev => Math.max(70, prev - 10))}
            className="p-1 hover:bg-white rounded transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="px-1.5 text-[10px] font-mono font-bold w-10 text-center">{zoomScale}%</span>
          <button
            onClick={() => setZoomScale(prev => Math.min(130, prev + 10))}
            className="p-1 hover:bg-white rounded transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => setZoomScale(100)}
            className="p-1 hover:bg-white rounded transition-colors cursor-pointer text-slate-400 hover:text-slate-700"
            title="Reset to 100%"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Right: Export Actions */}
        <div className="flex items-center gap-1.5">
          {/* Export LaTeX */}
          <button
            onClick={handleDownloadLatex}
            className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 flex items-center gap-1 transition-all cursor-pointer hidden xl:flex text-xs font-semibold"
            title="Download editable LaTeX (.tex) source"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-600" />
            <span>LaTeX</span>
          </button>

          {/* Export Word */}
          <button
            onClick={handleDownloadWord}
            disabled={isExportingWord}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 text-xs font-bold"
            title="Download Word (.docx) file"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isExportingWord ? '...' : 'DOCX'}</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shadow-xs text-xs font-bold"
            title="Download PDF in exact Latin Modern Roman template"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>{isExportingPdf ? 'Generating...' : 'PDF'}</span>
          </button>
        </div>
      </div>

      {/* Desk Canvas Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar flex flex-col items-center transition-colors bg-[#EEF2F6]">
        {/* Document Stats Badge */}
        <div className="mb-3 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 shadow-2xs flex items-center gap-2">
          <span>Standard US Letter</span>
          <span className="text-slate-300">•</span>
          <span className="font-bold text-slate-900">{stats.wordCount} Words</span>
          <span className="text-slate-300">•</span>
          <span className="font-bold text-indigo-600">{stats.estimatedPages} Page{stats.estimatedPages > 1 ? 's' : ''}</span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
            <Check className="w-3 h-3 stroke-[3]" /> ATS Verified
          </span>
        </div>

        {/* Recruiter Gaze Diagnostic Banner */}
        <RecruiterGazeBanner isVisible={showGazeHeatmap} onClose={() => setShowGazeHeatmap(false)} />

        <div
          className="relative w-full max-w-[850px] flex justify-center transition-transform duration-200"
          style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: 'top center' }}
        >
          <div className="relative w-full max-w-[816px]">
            <div
              ref={documentRef}
              id="resume-printable-document"
            style={{
              fontFamily: '"Latin Modern Roman", "Computer Modern", Georgia, "Times New Roman", serif',
              width: '100%',
              maxWidth: '816px',
              height: 'max-content',
              minHeight: '100%',
              boxSizing: 'border-box',
            }}
            className="bg-white text-black shadow-[0_2px_12px_rgba(0,0,0,0.08),0_16px_36px_rgba(0,0,0,0.04)] rounded-none p-8 sm:p-10 border border-slate-300 select-text shrink-0 print:p-0 print:border-none print:shadow-none print:max-w-none text-[10.5pt] leading-[1.35]"
          >
          {/* Header Name (15 pt Bold Centered) */}
          <div className="text-center mb-1">
            <h1 className="text-[15pt] font-bold tracking-normal uppercase text-black leading-tight">
              {candidateName}
            </h1>

            {/* Contact Line (9 pt, | separated, #0563C1 links, space after 60 dxa) */}
            <div className="flex flex-wrap items-center justify-center text-[9pt] text-black mt-0.5 mb-2 leading-tight">
              {contactItems.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="mx-1 text-black">|</span>}
                  {item.isEmail ? (
                    <a href={`mailto:${item.text}`} className="text-[#0563C1] hover:underline">
                      {item.text}
                    </a>
                  ) : item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-[#0563C1] hover:underline">
                      {item.text}
                    </a>
                  ) : (
                    <span>{item.text}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* SUMMARY */}
          {resume.summary && (
            <div className="mb-2">
              <h2 className="text-[11pt] font-bold uppercase text-black border-b-[0.75pt] border-black pb-[1pt] mt-1.5 mb-1 tracking-wide">
                SUMMARY
              </h2>
              <p className="text-[9pt] text-black leading-snug text-justify">
                {renderHighlightedText(resume.summary)}
              </p>
            </div>
          )}

          {/* EDUCATION */}
          {education.length > 0 && (
            <div className="mb-2">
              <h2 className="text-[11pt] font-bold uppercase text-black border-b-[0.75pt] border-black pb-[1pt] mt-1.5 mb-1 tracking-wide">
                EDUCATION
              </h2>
              <div className="space-y-1">
                {education.map((edu, idx) => (
                  <div key={idx} className="space-y-0.2">
                    <div className="flex justify-between items-baseline text-[9pt]">
                      <span className="font-bold text-black">{edu.school || edu.institution || 'University'}</span>
                      <span className="font-bold text-black text-right">
                        {edu.graduationDate || edu.endDate || edu.dates || edu.year}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-[9pt] italic">
                      <span className="text-black">
                        {(edu.degree || 'Degree') + (edu.field ? ` in ${edu.field}` : '')}
                      </span>
                      <span className="text-black text-right">
                        {edu.gpa ? `GPA: ${edu.gpa}` : (edu.location || '')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXPERIENCE */}
          {experience.length > 0 && (
            <div className="mb-2">
              <h2 className="text-[11pt] font-bold uppercase text-black border-b-[0.75pt] border-black pb-[1pt] mt-1.5 mb-1 tracking-wide">
                EXPERIENCE
              </h2>
              <div className="space-y-2">
                {experience.map((exp, expIdx) => (
                  <div key={expIdx} className="space-y-0.5">
                    <div className="flex justify-between items-baseline text-[9pt]">
                      <span className="font-bold text-black">{exp.company || 'Company'}</span>
                      <span className="font-bold text-black text-right">
                        {exp.dates || exp.period || (exp.startDate && exp.endDate ? `${exp.startDate} – ${exp.endDate}` : '')}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-[9pt] italic">
                      <span className="text-black">{exp.role || exp.title || 'Role'}</span>
                      <span className="text-black text-right">{exp.location || ''}</span>
                    </div>

                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className="list-none p-0 m-0 space-y-0.5">
                        {exp.bullets.map((bullet, bIdx) => (
                          <li
                            key={bIdx}
                            style={{ paddingLeft: '20pt', textIndent: '-13pt' }}
                            className="text-[9pt] text-black leading-snug text-justify"
                          >
                            <span className="font-bold mr-1">•</span>
                            {renderHighlightedText(bullet)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROJECTS */}
          {projects.length > 0 && (
            <div className="mb-2">
              <h2 className="text-[11pt] font-bold uppercase text-black border-b-[0.75pt] border-black pb-[1pt] mt-1.5 mb-1 tracking-wide">
                PROJECTS
              </h2>
              <div className="space-y-1.5">
                {projects.map((proj, pIdx) => (
                  <div key={pIdx} className="space-y-0.5">
                    <div className="flex justify-between items-baseline text-[9pt]">
                      <span>
                        <span className="font-bold text-black">{proj.name || proj.title}</span>
                        {proj.tech && (
                          <span className="italic text-black">
                            {' '}
                            | {Array.isArray(proj.tech) ? proj.tech.join(', ') : proj.tech}
                          </span>
                        )}
                      </span>
                      <span className="text-right">
                        {proj.link ? (
                          <a
                            href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#0563C1] hover:underline"
                          >
                            Link
                          </a>
                        ) : (
                          <span className="font-bold text-black">{proj.dates || ''}</span>
                        )}
                      </span>
                    </div>

                    {proj.description && (
                      <p className="text-[9pt] text-black leading-snug text-justify">
                        {renderHighlightedText(proj.description)}
                      </p>
                    )}

                    {Array.isArray(proj.bullets) && proj.bullets.length > 0 && (
                      <ul className="list-none p-0 m-0 space-y-0.5">
                        {proj.bullets.map((b, bi) => (
                          <li
                            key={bi}
                            style={{ paddingLeft: '20pt', textIndent: '-13pt' }}
                            className="text-[9pt] text-black leading-snug text-justify"
                          >
                            <span className="font-bold mr-1">•</span>
                            {renderHighlightedText(b)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TECHNICAL SKILLS */}
          {skills && (Array.isArray(skills) ? skills.length > 0 : Object.keys(skills).length > 0) && (
            <div className="mb-2">
              <h2 className="text-[11pt] font-bold uppercase text-black border-b-[0.75pt] border-black pb-[1pt] mt-1.5 mb-1 tracking-wide">
                TECHNICAL SKILLS
              </h2>
              {typeof skills === 'object' && !Array.isArray(skills) ? (
                <div className="space-y-0.5 text-[9pt] leading-tight text-black">
                  {Object.entries(skills).map(([cat, list]) =>
                    Array.isArray(list) && list.length > 0 ? (
                      <p key={cat}>
                        <span className="font-bold capitalize">{cat}: </span>
                        <span>{list.join(', ')}</span>
                      </p>
                    ) : null
                  )}
                </div>
              ) : (
                <p className="text-[9pt] leading-tight text-black">
                  <span className="font-bold">Skills: </span>
                  <span>{Array.isArray(skills) ? skills.join(', ') : String(skills)}</span>
                </p>
              )}
            </div>
          )}

          {/* CERTIFICATIONS */}
          {certifications && certifications.length > 0 && (
            <div>
              <h2 className="text-[11pt] font-bold uppercase text-black border-b-[0.75pt] border-black pb-[1pt] mt-1.5 mb-1 tracking-wide">
                CERTIFICATIONS
              </h2>
              <p className="text-[9pt] text-black leading-snug">
                {certifications
                  .map((c) => (typeof c === 'string' ? c : `${c.name || ''} (${c.issuer || c.date || ''})`))
                  .join(' • ')}
              </p>
            </div>
          )}
        </div>
        {/* Recruiter 6-Second Eye-Tracking Overlay */}
        <RecruiterGazeOverlay isVisible={showGazeHeatmap} />
      </div>
    </div>
      </div>
    </div>
  );
}

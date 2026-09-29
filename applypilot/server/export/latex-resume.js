/**
 * Escapes candidate and job data before embedding it in the fixed LaTeX layout.
 * Generated content is properly escaped TeX special characters.
 */
export function escapeLatex(value) {
    if (!value)
        return '';
    return String(value)
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/([{}$&#_%])/g, '\\$1')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\^/g, '\\textasciicircum{}');
}
export const DEFAULT_LATEX_TEMPLATE = `\\documentclass[10pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{fontawesome5}
\\usepackage{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\hypersetup{colorlinks=true,urlcolor=blue}

\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{} [\\titlerule]
\\titlespacing{\\section}{0pt}{12pt}{6pt}
\\setlist[itemize]{leftmargin=*,topsep=2pt,itemsep=2pt,parsep=0pt}

\\newcommand{\\headerline}[2]{\\begin{tabular*}{\\textwidth}{@{}l@{\\extracolsep{\\fill}}r@{}} \\textbf{#1} & #2 \\end{tabular*}}
\\newcommand{\\subheaderline}[2]{\\begin{tabular*}{\\textwidth}{@{}l@{\\extracolsep{\\fill}}r@{}} \\textit{#1} & #2 \\end{tabular*}}
\\newcommand{\\bulletitem}[1]{\\item #1}

\\begin{document}

\\begin{center}
    {\\LARGE \\textbf{{FULL_NAME}}} \\\\[4pt]
    \\headerline{\\faMapMarker\\ {LOCATION}}{\\faEnvelope\\ {EMAIL} ~|~ \\faPhone\\ {PHONE}}
    \\headerline{\\faLinkedin\\ {LINKEDIN}}{\\faGithub\\ {GITHUB} ~|~ \\faGlobe\\ {PORTFOLIO}}
\\end{center}

\\section*{PROFESSIONAL SUMMARY}
{{SUMMARY}}

\\section*{EDUCATION}
{{EDUCATION}}

\\section*{EXPERIENCE}
{{EXPERIENCE}}

\\section*{PROJECTS}
{{PROJECTS}}

\\section*{TECHNICAL SKILLS}
{{TECHNICAL_SKILLS}}

\\section*{CERTIFICATIONS}
{{CERTIFICATIONS}}

\\end{document}`;
/**
 * Renders raw LaTeX document by filling the standard template placeholders
 */
export function renderLatexResume(resume, template = DEFAULT_LATEX_TEMPLATE) {
    const name = resume.name || resume.fullName || 'Candidate Name';
    const contact = resume.contact || {};
    const email = contact.email || resume.email || '';
    const phone = contact.phone || resume.phone || '';
    const location = contact.location || resume.location || 'Remote / Worldwide';
    const linkedin = contact.linkedin || (resume.links && resume.links[0]) || 'linkedin.com';
    const github = contact.github || (resume.links && resume.links[1]) || 'github.com';
    const portfolio = contact.portfolio || (resume.links && resume.links[2]) || '';
    const summary = resume.summary || '';
    // 1. Education
    let educationLatex = '';
    if (Array.isArray(resume.education) && resume.education.length > 0) {
        educationLatex = resume.education
            .map((edu) => {
            const school = escapeLatex(edu.school || edu.institution || 'University');
            const date = escapeLatex(edu.graduationDate || edu.endDate || edu.dates || '');
            const degree = escapeLatex(`${edu.degree || ''} ${edu.field ? `in ${edu.field}` : ''}`.trim());
            const gpa = edu.gpa ? escapeLatex(`GPA: ${edu.gpa}`) : '';
            return `\\headerline{${school}}{${date}}\n\\subheaderline{${degree}}{${gpa}}`;
        })
            .join('\n\\vspace{4pt}\n');
    }
    else {
        educationLatex = 'Details available upon request.';
    }
    // 2. Experience
    let experienceLatex = '';
    if (Array.isArray(resume.experience) && resume.experience.length > 0) {
        experienceLatex = resume.experience
            .map((exp) => {
            const company = escapeLatex(exp.company || 'Company');
            const dates = escapeLatex(exp.dates || `${exp.startDate || ''} - ${exp.endDate || ''}`.trim());
            const role = escapeLatex(exp.role || exp.title || 'Software Engineer');
            const loc = escapeLatex(exp.location || '');
            const bullets = (exp.bullets || [])
                .filter(Boolean)
                .map((b) => `  \\item ${escapeLatex(b)}`)
                .join('\n');
            return `\\headerline{${company}}{${dates}}\n\\subheaderline{${role}}{${loc}}\n\\begin{itemize}\n${bullets}\n\\end{itemize}`;
        })
            .join('\n\\vspace{6pt}\n');
    }
    else {
        experienceLatex = 'Hands-on practical engineering and academic project work.';
    }
    // 3. Projects
    let projectsLatex = '';
    if (Array.isArray(resume.projects) && resume.projects.length > 0) {
        projectsLatex = resume.projects
            .map((proj) => {
            const name = escapeLatex(proj.name || 'Project');
            const tech = escapeLatex(Array.isArray(proj.tech) ? proj.tech.join(', ') : proj.tech || '');
            const desc = escapeLatex(proj.description || proj.link || '');
            const bullets = (proj.bullets || [])
                .filter(Boolean)
                .map((b) => `  \\item ${escapeLatex(b)}`)
                .join('\n');
            return `\\headerline{${name}}{${tech}}\n\\subheaderline{${desc}}{}\n\\begin{itemize}\n${bullets}\n\\end{itemize}`;
        })
            .join('\n\\vspace{6pt}\n');
    }
    else {
        projectsLatex = 'Technical implementations and open-source contributions.';
    }
    // 4. Skills
    let skillsLatex = '';
    const skillsObj = resume.skills || {};
    const languages = Array.isArray(skillsObj.languages) ? skillsObj.languages.join(', ') : '';
    const frameworks = Array.isArray(skillsObj.frameworks) ? skillsObj.frameworks.join(', ') : '';
    const tools = Array.isArray(skillsObj.tools) ? skillsObj.tools.join(', ') : '';
    const domain = Array.isArray(skillsObj.domain) ? skillsObj.domain.join(', ') : '';
    if (languages || frameworks || tools || domain) {
        const items = [];
        if (languages)
            items.push(`  \\item \\textbf{Languages:} ${escapeLatex(languages)}`);
        if (frameworks)
            items.push(`  \\item \\textbf{Frameworks \\& Libraries:} ${escapeLatex(frameworks)}`);
        if (tools)
            items.push(`  \\item \\textbf{Tools, Cloud \\& Infrastructure:} ${escapeLatex(tools)}`);
        if (domain)
            items.push(`  \\item \\textbf{Core Competencies:} ${escapeLatex(domain)}`);
        skillsLatex = `\\begin{itemize}\n${items.join('\n')}\n\\end{itemize}`;
    }
    else if (Array.isArray(resume.skills)) {
        skillsLatex = `\\begin{itemize}\n  \\item \\textbf{Technical Skills:} ${escapeLatex(resume.skills.join(', '))}\n\\end{itemize}`;
    }
    else {
        skillsLatex = `\\begin{itemize}\n  \\item \\textbf{Technical Skills:} Software Engineering, Algorithms, Web Technologies\n\\end{itemize}`;
    }
    // 5. Certifications
    let certsLatex = '';
    if (Array.isArray(resume.certifications) && resume.certifications.length > 0) {
        const items = resume.certifications.map((c) => {
            const cName = escapeLatex(typeof c === 'string' ? c : c.name || '');
            const cIssuer = c.issuer ? ` -- ${escapeLatex(c.issuer)}` : '';
            const cDate = c.date ? ` (${escapeLatex(c.date)})` : '';
            return `  \\item ${cName}${cIssuer}${cDate}`;
        });
        certsLatex = `\\begin{itemize}\n${items.join('\n')}\n\\end{itemize}`;
    }
    else {
        certsLatex =
            '\\begin{itemize}\n  \\item Continuous Professional Development & Technical Certifications\n\\end{itemize}';
    }
    let output = template;
    // Replace placeholders (both single and double brace notation)
    output = output.replace(/\{\{?FULL_NAME\}?\}/g, escapeLatex(name));
    output = output.replace(/\{\{?LOCATION\}?\}/g, escapeLatex(location));
    output = output.replace(/\{\{?EMAIL\}?\}/g, escapeLatex(email));
    output = output.replace(/\{\{?PHONE\}?\}/g, escapeLatex(phone));
    output = output.replace(/\{\{?LINKEDIN\}?\}/g, escapeLatex(linkedin));
    output = output.replace(/\{\{?GITHUB\}?\}/g, escapeLatex(github));
    output = output.replace(/\{\{?PORTFOLIO\}?\}/g, escapeLatex(portfolio));
    output = output.replace(/\{\{?SUMMARY\}?\}/g, escapeLatex(summary));
    output = output.replace(/\{\{?EDUCATION\}?\}/g, educationLatex);
    output = output.replace(/\{\{?EXPERIENCE\}?\}/g, experienceLatex);
    output = output.replace(/\{\{?PROJECTS\}?\}/g, projectsLatex);
    output = output.replace(/\{\{?TECHNICAL_SKILLS\}?\}/g, skillsLatex);
    output = output.replace(/\{\{?CERTIFICATIONS\}?\}/g, certsLatex);
    return output;
}
/**
 * Builds standard semantic HTML resume corresponding to the LaTeX layout.
 * Used for live browser rendering, iframe previews, and print.
 */
export function buildLatexResume(resume) {
    const name = resume.name || resume.fullName || 'Candidate';
    const contact = resume.contact || {};
    const email = contact.email || resume.email || '';
    const phone = contact.phone || resume.phone || '';
    const location = contact.location || resume.location || '';
    const linkedin = contact.linkedin || (resume.links && resume.links[0]) || '';
    const github = contact.github || (resume.links && resume.links[1]) || '';
    const portfolio = contact.portfolio || (resume.links && resume.links[2]) || '';
    const summary = resume.summary || '';
    const contactParts = [];
    if (email)
        contactParts.push(`<span>✉ ${email}</span>`);
    if (phone)
        contactParts.push(`<span>☎ ${phone}</span>`);
    if (location)
        contactParts.push(`<span>📍 ${location}</span>`);
    if (linkedin)
        contactParts.push(`<span>🔗 <a href="${linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}" target="_blank" style="color:#2563eb;text-decoration:none;">${linkedin}</a></span>`);
    if (github)
        contactParts.push(`<span>💻 <a href="${github.startsWith('http') ? github : `https://${github}`}" target="_blank" style="color:#2563eb;text-decoration:none;">${github}</a></span>`);
    if (portfolio)
        contactParts.push(`<span>🌐 <a href="${portfolio.startsWith('http') ? portfolio : `https://${portfolio}`}" target="_blank" style="color:#2563eb;text-decoration:none;">Portfolio</a></span>`);
    const skillsObj = resume.skills || {};
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name} - Professional Resume</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      padding: 32px 40px;
      max-width: 820px;
      margin: 0 auto;
    }
    header { text-align: center; margin-bottom: 20px; }
    h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; }
    .contact-bar { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; font-size: 13px; color: #475569; }
    section { margin-bottom: 18px; }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1e3a8a;
      border-bottom: 1.5px solid #2563eb;
      padding-bottom: 3px;
      margin-bottom: 10px;
    }
    .summary-text { font-size: 13.5px; color: #334155; line-height: 1.6; }
    .item-header { display: flex; justify-content: space-between; align-items: baseline; font-size: 14px; font-weight: 700; color: #0f172a; }
    .item-subheader { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; font-style: italic; color: #475569; margin-bottom: 4px; }
    .item-date { font-size: 12px; font-weight: 600; color: #64748b; font-style: normal; }
    ul { margin: 4px 0 10px 20px; font-size: 13px; color: #334155; }
    li { margin-bottom: 3px; line-height: 1.45; }
    .skill-row { font-size: 13px; margin-bottom: 4px; color: #334155; }
    .skill-label { font-weight: 700; color: #0f172a; }
    @media print {
      body { padding: 0; max-width: 100%; }
      @page { margin: 15mm 15mm 15mm 15mm; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${name}</h1>
    <div class="contact-bar">
      ${contactParts.join(' &bull; ')}
    </div>
  </header>

  ${summary
        ? `
  <section>
    <div class="section-title">Professional Summary</div>
    <div class="summary-text">${summary}</div>
  </section>`
        : ''}

  ${Array.isArray(resume.experience) && resume.experience.length > 0
        ? `
  <section>
    <div class="section-title">Experience</div>
    ${resume.experience
            .map((exp) => `
      <div style="margin-bottom: 12px;">
        <div class="item-header">
          <span>${exp.company || 'Organization'}</span>
          <span class="item-date">${exp.dates || `${exp.startDate || ''} - ${exp.endDate || ''}`.trim()}</span>
        </div>
        <div class="item-subheader">
          <span>${exp.role || exp.title || 'Role'}</span>
          <span class="item-date">${exp.location || ''}</span>
        </div>
        ${Array.isArray(exp.bullets) && exp.bullets.length > 0
            ? `
        <ul>
          ${exp.bullets.map((b) => `<li>${b}</li>`).join('')}
        </ul>`
            : ''}
      </div>
    `)
            .join('')}
  </section>`
        : ''}

  ${Array.isArray(resume.projects) && resume.projects.length > 0
        ? `
  <section>
    <div class="section-title">Technical Projects</div>
    ${resume.projects
            .map((proj) => `
      <div style="margin-bottom: 10px;">
        <div class="item-header">
          <span>${proj.name}</span>
          <span class="item-date">${Array.isArray(proj.tech) ? proj.tech.join(' | ') : proj.tech || ''}</span>
        </div>
        ${proj.description ? `<div class="item-subheader"><span>${proj.description}</span></div>` : ''}
        ${Array.isArray(proj.bullets) && proj.bullets.length > 0
            ? `
        <ul>
          ${proj.bullets.map((b) => `<li>${b}</li>`).join('')}
        </ul>`
            : ''}
      </div>
    `)
            .join('')}
  </section>`
        : ''}

  ${Array.isArray(resume.education) && resume.education.length > 0
        ? `
  <section>
    <div class="section-title">Education</div>
    ${resume.education
            .map((edu) => `
      <div style="margin-bottom: 8px;">
        <div class="item-header">
          <span>${edu.school || edu.institution || 'University'}</span>
          <span class="item-date">${edu.graduationDate || edu.endDate || edu.dates || ''}</span>
        </div>
        <div class="item-subheader">
          <span>${edu.degree || ''} ${edu.field ? `in ${edu.field}` : ''}</span>
          <span class="item-date">${edu.gpa ? `GPA: ${edu.gpa}` : ''}</span>
        </div>
      </div>
    `)
            .join('')}
  </section>`
        : ''}

  <section>
    <div class="section-title">Technical Skills</div>
    ${skillsObj.languages ? `<div class="skill-row"><span class="skill-label">Languages:</span> ${Array.isArray(skillsObj.languages) ? skillsObj.languages.join(', ') : skillsObj.languages}</div>` : ''}
    ${skillsObj.frameworks ? `<div class="skill-row"><span class="skill-label">Frameworks & Libraries:</span> ${Array.isArray(skillsObj.frameworks) ? skillsObj.frameworks.join(', ') : skillsObj.frameworks}</div>` : ''}
    ${skillsObj.tools ? `<div class="skill-row"><span class="skill-label">Tools & Cloud:</span> ${Array.isArray(skillsObj.tools) ? skillsObj.tools.join(', ') : skillsObj.tools}</div>` : ''}
    ${skillsObj.domain ? `<div class="skill-row"><span class="skill-label">Core Competencies:</span> ${Array.isArray(skillsObj.domain) ? skillsObj.domain.join(', ') : skillsObj.domain}</div>` : ''}
    ${!skillsObj.languages && Array.isArray(resume.skills) ? `<div class="skill-row"><span class="skill-label">Skills:</span> ${resume.skills.join(', ')}</div>` : ''}
  </section>

  ${Array.isArray(resume.certifications) && resume.certifications.length > 0
        ? `
  <section>
    <div class="section-title">Certifications</div>
    <ul>
      ${resume.certifications
            .map((c) => `
        <li><strong>${typeof c === 'string' ? c : c.name}</strong> ${c.issuer ? `&mdash; ${c.issuer}` : ''} ${c.date ? `(${c.date})` : ''}</li>
      `)
            .join('')}
    </ul>
  </section>`
        : ''}
</body>
</html>`.trim();
}
/** Generates an editable .tex file using the same style values as the supplied resume. */
export function renderTailoredLatex(resume, job, tailoredBullets) {
    const safeSkills = (resume.skills
        ? Array.isArray(resume.skills)
            ? resume.skills
            : [...(resume.skills.languages || []), ...(resume.skills.frameworks || [])]
        : [])
        .slice(0, 28)
        .map(escapeLatex)
        .join(', ') || 'Not specified';
    const target = `${job.title} at ${job.company}`;
    const summary = (resume.summary || '').trim()
        ? `${(resume.summary || '').trim()} Targeted for ${target}.`
        : `Computer Science candidate with practical experience in ${safeSkills.split(',').slice(0, 4).join(',')}. Targeted for ${target}.`;
    const contactParts = [
        resume.phone || (resume.contact && resume.contact.phone),
        resume.email || (resume.contact && resume.contact.email),
        ...(resume.links || []),
    ]
        .filter(Boolean)
        .map(escapeLatex)
        .join(' \\quad\\textbar\\quad ');
    const experience = (resume.experience || [])
        .map((entry, index) => {
        const bullets = index === 0 && tailoredBullets.length > 0 ? tailoredBullets : entry.bullets || [];
        return [
            `\\subheading{${escapeLatex(entry.company || 'Experience')}}{${escapeLatex(entry.dates || '')}}`,
            `\\roleline{${escapeLatex(entry.role || entry.title || '')}}{}`,
            '\\vspace{2pt}',
            [
                '\\begin{tightitemize}',
                ...bullets.map((b) => `  \\item ${escapeLatex(b)}`),
                '\\end{tightitemize}',
            ].join('\n'),
        ].join('\n');
    })
        .join('\n\n');
    const education = (resume.education || [])
        .map((entry) => [
        `\\subheading{${escapeLatex(entry.school || entry.institution || 'Education')}}{${escapeLatex(entry.graduationDate || entry.dates || '')}}`,
        `\\roleline{${escapeLatex(`${entry.degree || ''} ${entry.field ? `in ${entry.field}` : ''}`.trim())}}{}`,
    ].join('\n'))
        .join('\n');
    return `\\documentclass[10pt,letterpaper]{article}
\\usepackage[top=0.14in,bottom=0.10in,left=0.44in,right=0.44in]{geometry}
\\usepackage{lmodern}
\\usepackage[T1]{fontenc}
\\usepackage{fontawesome5}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\usepackage{tabularx}
\\hypersetup{colorlinks=true,linkcolor=black,urlcolor=black}
\\pagestyle{empty}
\\raggedbottom
\\renewcommand{\\normalsize}{\\fontsize{9}{11}\\selectfont}
\\normalsize
\\titleformat{\\section}[block]{\\fontsize{11}{13}\\bfseries}{}{0em}{}[\\vspace{-4pt}\\rule{\\textwidth}{0.5pt}]
\\titlespacing*{\\section}{0pt}{4pt}{1.5pt}
\\setlength{\\parindent}{0pt}
\\newenvironment{tightitemize}{\\begin{itemize}[leftmargin=1em,label=\\textbullet,itemsep=1pt,topsep=2pt,parsep=0pt]}{\\end{itemize}}
\\newcommand{\\subheading}[2]{\\noindent\\textbf{#1}\\hfill\\textbf{#2}\\par}
\\newcommand{\\roleline}[2]{\\noindent\\textit{#1}\\hfill\\textit{#2}\\par}

\\begin{document}
\\begin{center}
{\\fontsize{15}{18}\\bfseries ${escapeLatex(resume.name || resume.fullName || 'Your Name')}}\\\\[3pt]
${contactParts}
\\end{center}

\\section*{SUMMARY}
${escapeLatex(summary)}

\\section*{EDUCATION}
${education || 'Education details available on request.'}

\\section*{EXPERIENCE}
${experience || 'Experience details available on request.'}

\\section*{TECHNICAL SKILLS}
\\textbf{Relevant to ${escapeLatex(target)}:} ${safeSkills}

\\end{document}
`;
}

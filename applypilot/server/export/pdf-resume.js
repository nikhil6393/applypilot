import { chromium } from 'playwright';

/**
 * Generate PDF resume conforming strictly to the exact template specification:
 * - Page size: US Letter (8.5" x 11")
 * - Top margin: 0.14in, Bottom margin: 0.10in, Left: 0.44in, Right: 0.44in
 * - Font: Latin Modern Roman (9pt regular body, 15pt bold name, 11pt bold headers)
 * - Section divider: single solid bottom border 0.75pt (#000000)
 * - Bullets: symbol •, indent 360 dxa, hanging 260 dxa, 0 extra space
 * - Single column, purely paragraph-based layout, no tables
 */
export async function generateStrictPdf(resume) {
    const html = buildResumeHtml(resume);
    let browser = null;
    const executablePath = process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
    try {
        browser = await chromium.launch({
            headless: true,
            executablePath: executablePath || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
        
        // Wait for font rendering if supported with bounded timeout
        try {
            await page.evaluate(async () => {
                if (document.fonts) {
                    await Promise.race([
                        document.fonts.ready,
                        new Promise(resolve => setTimeout(resolve, 1500))
                    ]);
                }
            });
        } catch (_) {}

        const pdfBuffer = await page.pdf({
            format: 'Letter',
            margin: {
                top: '0.14in',
                bottom: '0.10in',
                left: '0.44in',
                right: '0.44in',
            },
            printBackground: true,
            displayHeaderFooter: false,
        });

        await browser.close();
        return pdfBuffer;
    } catch (err) {
        if (browser) await browser.close().catch(() => {});
        throw err;
    }
}

export function buildResumeHtml(resume) {
    if (!resume) resume = {};
    const name = resume.fullName || resume.name || resume.contact?.name || 'CANDIDATE NAME';
    const contact = resume.contact || {};
    const phone = resume.phone || contact.phone || '';
    const email = resume.email || contact.email || '';
    const location = resume.location || contact.location || '';
    const linkedin = resume.linkedin || contact.linkedin || (resume.links && resume.links[0]) || '';
    const github = resume.github || contact.github || (resume.links && resume.links[1]) || '';
    const portfolio = resume.portfolio || contact.portfolio || '';

    const contactItems = [];
    if (phone) contactItems.push(`<span>${escapeHtml(phone)}</span>`);
    if (email) contactItems.push(`<a href="mailto:${escapeHtml(email)}" class="link">${escapeHtml(email)}</a>`);
    if (location) contactItems.push(`<span>${escapeHtml(location)}</span>`);
    if (linkedin) {
        const url = linkedin.startsWith('http') ? linkedin : `https://${linkedin}`;
        contactItems.push(`<a href="${escapeHtml(url)}" target="_blank" class="link">LinkedIn</a>`);
    }
    if (github) {
        const url = github.startsWith('http') ? github : `https://${github}`;
        contactItems.push(`<a href="${escapeHtml(url)}" target="_blank" class="link">GitHub</a>`);
    }
    if (portfolio) {
        const url = portfolio.startsWith('http') ? portfolio : `https://${portfolio}`;
        contactItems.push(`<a href="${escapeHtml(url)}" target="_blank" class="link">Portfolio</a>`);
    }

    const experience = resume.experience || [];
    const education = resume.education || [];
    const projects = resume.projects || [];
    const skills = resume.skills || [];
    const certifications = resume.certifications || [];

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(name)} - Resume</title>
<style>
  @font-face {
    font-family: 'Latin Modern Roman';
    src: url('https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts/Serif/cmunrm.woff') format('woff');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'Latin Modern Roman';
    src: url('https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts/Serif/cmunbx.woff') format('woff');
    font-weight: bold;
    font-style: normal;
  }
  @font-face {
    font-family: 'Latin Modern Roman';
    src: url('https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts/Serif/cmunti.woff') format('woff');
    font-weight: normal;
    font-style: italic;
  }
  @font-face {
    font-family: 'Latin Modern Roman';
    src: url('https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts/Serif/cmunbi.woff') format('woff');
    font-weight: bold;
    font-style: italic;
  }

  @page {
    size: letter;
    margin: 0.14in 0.44in 0.10in 0.44in;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Latin Modern Roman', 'Computer Modern', 'Georgia', 'Times New Roman', serif;
    font-size: 9pt;
    line-height: 1.22;
    color: #000000;
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
  }

  /* Name Title */
  .resume-header {
    text-align: center;
    margin-bottom: 2pt;
  }

  .candidate-name {
    font-size: 15pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    color: #000000;
    line-height: 1.1;
  }

  /* Contact Line */
  .contact-line {
    font-size: 9pt;
    color: #000000;
    margin-top: 2pt;
    margin-bottom: 3.5pt; /* ~60 dxa space after */
    line-height: 1.2;
  }

  .contact-separator {
    margin: 0 4pt;
    color: #000000;
  }

  a.link {
    color: #0563C1;
    text-decoration: none;
  }

  a.link:hover {
    text-decoration: underline;
  }

  /* Section Headers */
  .section-header {
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    color: #000000;
    border-bottom: 0.75pt solid #000000; /* 6 half-points */
    margin-top: 4.5pt;  /* ~80 dxa */
    margin-bottom: 2pt; /* ~30 dxa */
    padding-bottom: 1pt;
    letter-spacing: 0.3pt;
  }

  /* Entry row with tab-stop simulation */
  .entry-block {
    margin-bottom: 2.5pt;
  }

  .entry-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 9pt;
    line-height: 1.2;
  }

  .bold-text {
    font-weight: bold;
    color: #000000;
  }

  .italic-text {
    font-style: italic;
    color: #000000;
  }

  .right-flush {
    text-align: right;
    white-space: nowrap;
    margin-left: 8pt;
  }

  /* Body Paragraphs */
  p.body-text {
    font-size: 9pt;
    color: #000000;
    margin-bottom: 2pt; /* 20-40 dxa */
    line-height: 1.25;
    text-align: justify;
  }

  /* Bullet Lists */
  ul.bullet-list {
    list-style: none;
    padding-left: 0;
    margin: 0;
  }

  li.bullet-item {
    font-size: 9pt;
    line-height: 1.22;
    padding-left: 20pt; /* ~360 dxa indent */
    text-indent: -13pt; /* ~260 dxa hanging indent */
    margin-bottom: 0.8pt; /* 0 extra space */
    color: #000000;
    text-align: justify;
  }

  li.bullet-item::before {
    content: "• ";
    font-weight: bold;
    margin-right: 3pt;
  }
</style>
</head>
<body>

  <!-- Name Title -->
  <div class="resume-header">
    <h1 class="candidate-name">${escapeHtml(name)}</h1>
    <div class="contact-line">
      ${contactItems.join('<span class="contact-separator">|</span>')}
    </div>
  </div>

  <!-- Summary -->
  ${resume.summary ? `
  <div class="section-container">
    <h2 class="section-header">SUMMARY</h2>
    <p class="body-text">${escapeHtml(resume.summary)}</p>
  </div>
  ` : ''}

  <!-- Education -->
  ${education.length > 0 ? `
  <div class="section-container">
    <h2 class="section-header">EDUCATION</h2>
    ${education.map(edu => `
      <div class="entry-block">
        <div class="entry-row">
          <span class="bold-text">${escapeHtml(edu.school || edu.institution || 'University')}</span>
          <span class="bold-text right-flush">${escapeHtml(edu.graduationDate || edu.endDate || edu.dates || edu.year || '')}</span>
        </div>
        <div class="entry-row">
          <span class="italic-text">${escapeHtml((edu.degree || 'Degree') + (edu.field ? ' in ' + edu.field : ''))}</span>
          <span class="italic-text right-flush">${edu.gpa ? 'GPA: ' + escapeHtml(edu.gpa) : (edu.location ? escapeHtml(edu.location) : '')}</span>
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Experience -->
  ${experience.length > 0 ? `
  <div class="section-container">
    <h2 class="section-header">EXPERIENCE</h2>
    ${experience.map(exp => `
      <div class="entry-block">
        <div class="entry-row">
          <span class="bold-text">${escapeHtml(exp.company || 'Company')}</span>
          <span class="bold-text right-flush">${escapeHtml(exp.dates || exp.period || (exp.startDate && exp.endDate ? exp.startDate + ' – ' + exp.endDate : ''))}</span>
        </div>
        <div class="entry-row">
          <span class="italic-text">${escapeHtml(exp.role || exp.title || 'Role')}</span>
          <span class="italic-text right-flush">${escapeHtml(exp.location || '')}</span>
        </div>
        ${exp.bullets && exp.bullets.length > 0 ? `
          <ul class="bullet-list">
            ${exp.bullets.map(b => `<li class="bullet-item">${escapeHtml(b)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Projects -->
  ${projects.length > 0 ? `
  <div class="section-container">
    <h2 class="section-header">PROJECTS</h2>
    ${projects.map(proj => `
      <div class="entry-block">
        <div class="entry-row">
          <span>
            <span class="bold-text">${escapeHtml(proj.name || proj.title || 'Project')}</span>
            ${proj.tech ? `<span class="italic-text"> | ${escapeHtml(Array.isArray(proj.tech) ? proj.tech.join(', ') : proj.tech)}</span>` : ''}
          </span>
          <span class="right-flush">
            ${proj.link ? `<a href="${escapeHtml(proj.link.startsWith('http') ? proj.link : 'https://' + proj.link)}" target="_blank" class="link">Link</a>` : (proj.dates ? `<span class="bold-text">${escapeHtml(proj.dates)}</span>` : '')}
          </span>
        </div>
        ${proj.description ? `<p class="body-text">${escapeHtml(proj.description)}</p>` : ''}
        ${proj.bullets && proj.bullets.length > 0 ? `
          <ul class="bullet-list">
            ${proj.bullets.map(b => `<li class="bullet-item">${escapeHtml(b)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Technical Skills -->
  ${skills && (Array.isArray(skills) ? skills.length > 0 : Object.keys(skills).length > 0) ? `
  <div class="section-container">
    <h2 class="section-header">TECHNICAL SKILLS</h2>
    <div style="margin-top: 1pt;">
      ${typeof skills === 'object' && !Array.isArray(skills) ?
        Object.entries(skills).filter(([_, list]) => Array.isArray(list) && list.length > 0).map(([cat, list]) => `
          <p class="body-text" style="margin-bottom: 1.5pt;">
            <span class="bold-text" style="text-transform: capitalize;">${escapeHtml(cat)}:</span>
            <span>${escapeHtml(list.join(', '))}</span>
          </p>
        `).join('')
        : `
          <p class="body-text">
            <span class="bold-text">Skills:</span>
            <span>${escapeHtml(Array.isArray(skills) ? skills.join(', ') : String(skills))}</span>
          </p>
        `}
    </div>
  </div>
  ` : ''}

  <!-- Certifications -->
  ${certifications.length > 0 ? `
  <div class="section-container">
    <h2 class="section-header">CERTIFICATIONS</h2>
    <p class="body-text" style="margin-top: 1.5pt;">
      ${escapeHtml(certifications.map(c => typeof c === 'string' ? c : `${c.name || ''} (${c.issuer || c.date || ''})`).join(' • '))}
    </p>
  </div>
  ` : ''}

</body>
</html>`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

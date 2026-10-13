import { Document, Packer, Paragraph, TextRun, TabStopPosition, TabStopType, BorderStyle, HeadingLevel, AlignmentType, ExternalHyperlink } from 'docx';

export async function generateStrictDocx(resume) {
    if (!resume) resume = {};
    const defaultFont = "Latin Modern Roman";
    const name = resume.fullName || resume.name || resume.contact?.name || "CANDIDATE NAME";
    const contact = resume.contact || {};
    const phone = resume.phone || contact.phone || '';
    const email = resume.email || contact.email || '';
    const location = resume.location || contact.location || '';
    const linkedin = resume.linkedin || contact.linkedin || (resume.links && resume.links[0]) || '';
    const github = resume.github || contact.github || (resume.links && resume.links[1]) || '';
    const portfolio = resume.portfolio || contact.portfolio || '';

    // Build contact line children with | separators
    const contactChildren = [];
    const addContactItem = (text, isLink = false, linkUrl = '') => {
        if (contactChildren.length > 0) {
            contactChildren.push(new TextRun({ text: " | ", font: defaultFont, size: 18, color: "000000" }));
        }
        if (isLink && linkUrl) {
            contactChildren.push(
                new ExternalHyperlink({
                    children: [
                        new TextRun({
                            text: text,
                            font: defaultFont,
                            size: 18,
                            color: "0563C1",
                            underline: {},
                        }),
                    ],
                    link: linkUrl,
                })
            );
        } else {
            contactChildren.push(new TextRun({ text: text, font: defaultFont, size: 18, color: "000000" }));
        }
    };

    if (phone) addContactItem(phone);
    if (email) addContactItem(email, true, `mailto:${email}`);
    if (location) addContactItem(location);
    if (linkedin) addContactItem("LinkedIn", true, linkedin.startsWith('http') ? linkedin : `https://${linkedin}`);
    if (github) addContactItem("GitHub", true, github.startsWith('http') ? github : `https://${github}`);
    if (portfolio) addContactItem("Portfolio", true, portfolio.startsWith('http') ? portfolio : `https://${portfolio}`);

    const experience = resume.experience || [];
    const education = resume.education || [];
    const projects = resume.projects || [];
    const skills = resume.skills || [];
    const certifications = resume.certifications || [];

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    size: {
                        width: "8.5in",
                        height: "11in",
                    },
                    margin: {
                        top: "0.14in",
                        bottom: "0.10in",
                        left: "0.44in",
                        right: "0.44in",
                    },
                },
            },
            children: [
                // Candidate Name (15 pt Bold Centered)
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: name.toUpperCase(),
                            font: defaultFont,
                            size: 30, // 15pt = 30 half-points
                            bold: true,
                            color: "000000",
                        }),
                    ],
                }),
                
                // Contact line (9 pt | separated, 60 dxa after)
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 60 },
                    children: contactChildren.length > 0 ? contactChildren : [
                        new TextRun({ text: "Contact Info", font: defaultFont, size: 18 })
                    ],
                }),

                // Summary
                ...(resume.summary ? [
                    createSectionHeader("SUMMARY", defaultFont),
                    new Paragraph({
                        spacing: { after: 30 },
                        children: [
                            new TextRun({ text: resume.summary, font: defaultFont, size: 18, color: "000000" })
                        ]
                    })
                ] : []),

                // Education
                ...(education.length > 0 ? [
                    createSectionHeader("EDUCATION", defaultFont),
                    ...education.flatMap(edu => createEducationBlock(edu, defaultFont))
                ] : []),

                // Experience
                ...(experience.length > 0 ? [
                    createSectionHeader("EXPERIENCE", defaultFont),
                    ...experience.flatMap(exp => createExperienceBlock(exp, defaultFont))
                ] : []),

                // Projects
                ...(projects.length > 0 ? [
                    createSectionHeader("PROJECTS", defaultFont),
                    ...projects.flatMap(proj => createProjectBlock(proj, defaultFont))
                ] : []),
                
                // Technical Skills
                ...(skills && (Array.isArray(skills) ? skills.length > 0 : Object.keys(skills).length > 0) ? [
                    createSectionHeader("TECHNICAL SKILLS", defaultFont),
                    createSkillsBlock(skills, defaultFont)
                ] : []),

                // Certifications
                ...(certifications.length > 0 ? [
                    createSectionHeader("CERTIFICATIONS", defaultFont),
                    new Paragraph({
                        spacing: { after: 30 },
                        children: [
                            new TextRun({
                                text: certifications.map(c => typeof c === 'string' ? c : `${c.name || ''} (${c.issuer || c.date || ''})`).join(' • '),
                                font: defaultFont,
                                size: 18,
                                color: "000000",
                            })
                        ]
                    })
                ] : [])
            ],
        }],
    });

    return await Packer.toBuffer(doc);
}

function createSectionHeader(title, font) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 80, after: 30 },
        border: {
            bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 }, // 6 half-points = 0.75 pt
        },
        children: [
            new TextRun({ text: title.toUpperCase(), font: font, size: 22, bold: true, color: "000000" })
        ]
    });
}

function createExperienceBlock(exp, font) {
    const blocks = [];
    const dateStr = exp.dates || exp.period || (exp.startDate && exp.endDate ? `${exp.startDate} – ${exp.endDate}` : '') || '';
    
    // Row 1: Company (Left) + Tab + Date (Right)
    blocks.push(new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        children: [
            new TextRun({ text: exp.company || "Company", font: font, size: 18, bold: true, color: "000000" }),
            ...(dateStr ? [new TextRun({ text: `\t${dateStr}`, font: font, size: 18, bold: true, color: "000000" })] : []),
        ],
    }));

    // Row 2: Role (Left) + Tab + Location (Right)
    const roleStr = exp.role || exp.title || "Role";
    const locStr = exp.location || "";
    if (roleStr || locStr) {
        blocks.push(new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
            children: [
                new TextRun({ text: roleStr, font: font, size: 18, italics: true, color: "000000" }),
                ...(locStr ? [new TextRun({ text: `\t${locStr}`, font: font, size: 18, italics: true, color: "000000" })] : []),
            ],
        }));
    }

    // Bullets (Indent 360, Hanging 260, Space after 0)
    if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach(bullet => {
            blocks.push(new Paragraph({
                bullet: { level: 0 },
                indent: { left: 360, hanging: 260 },
                spacing: { after: 0 },
                children: [
                    new TextRun({ text: bullet, font: font, size: 18, color: "000000" })
                ]
            }));
        });
    }

    blocks.push(new Paragraph({ spacing: { after: 20 } }));
    return blocks;
}

function createEducationBlock(edu, font) {
    const blocks = [];
    const dateStr = edu.graduationDate || edu.endDate || edu.dates || edu.year || '';
    
    blocks.push(new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        children: [
            new TextRun({ text: edu.school || edu.institution || "University", font: font, size: 18, bold: true, color: "000000" }),
            ...(dateStr ? [new TextRun({ text: `\t${dateStr}`, font: font, size: 18, bold: true, color: "000000" })] : []),
        ],
    }));

    const degreeStr = (edu.degree || "Degree") + (edu.field ? ` in ${edu.field}` : "");
    const subRightStr = edu.gpa ? `GPA: ${edu.gpa}` : (edu.location || "");
    blocks.push(new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        children: [
            new TextRun({ text: degreeStr, font: font, size: 18, italics: true, color: "000000" }),
            ...(subRightStr ? [new TextRun({ text: `\t${subRightStr}`, font: font, size: 18, italics: true, color: "000000" })] : []),
        ],
    }));

    blocks.push(new Paragraph({ spacing: { after: 20 } }));
    return blocks;
}

function createProjectBlock(proj, font) {
    const blocks = [];
    const techStr = proj.tech ? ` | ${Array.isArray(proj.tech) ? proj.tech.join(', ') : proj.tech}` : '';
    const rightStr = proj.link || proj.dates || '';

    blocks.push(new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        children: [
            new TextRun({ text: proj.name || proj.title || "Project", font: font, size: 18, bold: true, color: "000000" }),
            ...(techStr ? [new TextRun({ text: techStr, font: font, size: 18, italics: true, color: "000000" })] : []),
            ...(rightStr ? [new TextRun({ text: `\t${rightStr}`, font: font, size: 18, color: "0563C1" })] : []),
        ],
    }));

    if (proj.description) {
        blocks.push(new Paragraph({
            spacing: { after: 20 },
            children: [
                new TextRun({ text: proj.description, font: font, size: 18, color: "000000" })
            ]
        }));
    }

    if (proj.bullets && proj.bullets.length > 0) {
        proj.bullets.forEach(bullet => {
            blocks.push(new Paragraph({
                bullet: { level: 0 },
                indent: { left: 360, hanging: 260 },
                spacing: { after: 0 },
                children: [
                    new TextRun({ text: bullet, font: font, size: 18, color: "000000" })
                ]
            }));
        });
    }

    blocks.push(new Paragraph({ spacing: { after: 20 } }));
    return blocks;
}

function createSkillsBlock(skills, font) {
    if (typeof skills === 'object' && !Array.isArray(skills)) {
        const textRuns = [];
        Object.entries(skills).forEach(([category, list], index) => {
            if (Array.isArray(list) && list.length > 0) {
                if (index > 0) textRuns.push(new TextRun({ text: "  |  ", font: font, size: 18, color: "000000" }));
                textRuns.push(new TextRun({ text: `${category.charAt(0).toUpperCase() + category.slice(1)}: `, font: font, size: 18, bold: true, color: "000000" }));
                textRuns.push(new TextRun({ text: list.join(', '), font: font, size: 18, color: "000000" }));
            }
        });
        return new Paragraph({
            spacing: { after: 30 },
            children: textRuns,
        });
    }

    return new Paragraph({
        spacing: { after: 30 },
        children: [
            new TextRun({ text: "Skills: ", font: font, size: 18, bold: true, color: "000000" }),
            new TextRun({
                text: Array.isArray(skills) ? skills.join(", ") : String(skills),
                font: font,
                size: 18,
                color: "000000",
            })
        ]
    });
}

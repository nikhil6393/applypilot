import { Document, Packer, Paragraph, TextRun, TabStopPosition, TabStopType, BorderStyle, HeadingLevel, PageSize, Alignment, WidthType } from 'docx';

export async function generateStrictDocx(resume) {
    const defaultFont = "Latin Modern Roman";
    
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
                new Paragraph({
                    alignment: Alignment.CENTER,
                    children: [
                        new TextRun({
                            text: resume.fullName || resume.name || "CANDIDATE NAME",
                            font: defaultFont,
                            size: 30, // 15pt = 30 half-points
                            bold: true,
                        }),
                    ],
                }),
                
                new Paragraph({
                    alignment: Alignment.CENTER,
                    spacing: { after: 60 },
                    children: [
                        new TextRun({
                            text: [
                                resume.phone || "Phone",
                                resume.email || "Email",
                                resume.links?.[0] || "LinkedIn",
                                resume.links?.[1] || "GitHub"
                            ].filter(Boolean).join(" | "),
                            font: defaultFont,
                            size: 18,
                        }),
                    ],
                }),

                ...(resume.summary ? [
                    createSectionHeader("SUMMARY", defaultFont),
                    new Paragraph({
                        spacing: { after: 40, line: 240 },
                        children: [
                            new TextRun({ text: resume.summary, font: defaultFont, size: 18 })
                        ]
                    })
                ] : []),

                ...(resume.experience && resume.experience.length > 0 ? [
                    createSectionHeader("EXPERIENCE", defaultFont),
                    ...resume.experience.flatMap(exp => createExperienceBlock(exp, defaultFont))
                ] : []),

                ...(resume.education && resume.education.length > 0 ? [
                    createSectionHeader("EDUCATION", defaultFont),
                    ...resume.education.flatMap(edu => createEducationBlock(edu, defaultFont))
                ] : []),
                
                ...(resume.skills ? [
                    createSectionHeader("TECHNICAL SKILLS", defaultFont),
                    new Paragraph({
                        spacing: { after: 40 },
                        children: [
                            new TextRun({
                                text: Array.isArray(resume.skills) ? resume.skills.join(", ") : 
                                     (resume.skills.languages?.join(", ") + (resume.skills.frameworks?.length ? ", " + resume.skills.frameworks.join(", ") : "")),
                                font: defaultFont,
                                size: 18,
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
        text: title.toUpperCase(),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 80, after: 30 },
        border: {
            bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 },
        },
        children: [
            new TextRun({ text: title.toUpperCase(), font: font, size: 22, bold: true })
        ]
    });
}

function createExperienceBlock(exp, font) {
    const blocks = [];
    blocks.push(new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 10000 }],
        children: [
            new TextRun({ text: exp.company || "Company", font: font, size: 18, bold: true }),
            new TextRun({ text: "\t" + (exp.dates || exp.startDate + " - " + exp.endDate || "Date"), font: font, size: 18, bold: true }),
        ],
    }));

    blocks.push(new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 10000 }],
        children: [
            new TextRun({ text: exp.role || exp.title || "Role", font: font, size: 18, italics: true }),
            new TextRun({ text: "\t" + (exp.location || ""), font: font, size: 18, italics: true }),
        ],
    }));

    if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach(bullet => {
            blocks.push(new Paragraph({
                bullet: { level: 0 },
                indent: { left: 360, hanging: 260 },
                spacing: { after: 0 },
                children: [
                    new TextRun({ text: bullet, font: font, size: 18 })
                ]
            }));
        });
    }

    blocks.push(new Paragraph({ spacing: { after: 20 } }));
    return blocks;
}

function createEducationBlock(edu, font) {
    return [
        new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: 10000 }],
            children: [
                new TextRun({ text: edu.school || edu.institution || "University", font: font, size: 18, bold: true }),
                new TextRun({ text: "\t" + (edu.graduationDate || edu.endDate || edu.dates || ""), font: font, size: 18, bold: true }),
            ],
        }),
        new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: 10000 }],
            children: [
                new TextRun({ text: (edu.degree || "Degree") + (edu.field ? " in " + edu.field : ""), font: font, size: 18, italics: true }),
                new TextRun({ text: "\t" + (edu.gpa ? "GPA: " + edu.gpa : ""), font: font, size: 18, italics: true }),
            ],
        }),
        new Paragraph({ spacing: { after: 20 } })
    ];
}

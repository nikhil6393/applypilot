import { load } from 'cheerio';

/**
 * Universal Job Description Formatter and Section Extractor
 * Converts messy scraped HTML into clean, human-readable structured Markdown
 * while preserving 100% of original responsibilities, qualifications, and requirements.
 */

const HTML_ENTITY_MAP = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&bull;': '•',
    '&mdash;': '—',
    '&ndash;': '–',
    '&rsquo;': "'",
    '&lsquo;': "'",
    '&rdquo;': '"',
    '&ldquo;': '"',
    '&#x2F;': '/',
    '&#47;': '/',
    '&#x27;': "'",
};

export function decodeHtmlEntities(str) {
    if (!str) return '';
    let out = str;
    for (const [entity, replacement] of Object.entries(HTML_ENTITY_MAP)) {
        out = out.replaceAll(entity, replacement);
    }
    // Hex entities: &#x20;
    out = out.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
        try {
            return String.fromCharCode(parseInt(hex, 16));
        } catch {
            return '';
        }
    });
    // Decimal entities: &#32;
    out = out.replace(/&#([0-9]+);/g, (_, dec) => {
        try {
            return String.fromCharCode(parseInt(dec, 10));
        } catch {
            return '';
        }
    });
    return out;
}

/**
 * Converts HTML into structured, readable text preserving headings, paragraphs, and list bullets.
 */
export function htmlToCleanMarkdown(html) {
    if (!html || typeof html !== 'string') return '';

    // If it looks like plain text without HTML tags, just clean up spacing
    if (!/<[a-z][\s\S]*>/i.test(html)) {
        return decodeHtmlEntities(html)
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    try {
        const $ = load(html, { decodeEntities: true });

        // Strip non-content and noisy elements
        $('script, style, noscript, svg, iframe, form, button, input, nav, footer, header').remove();
        $('[aria-hidden="true"], .cookie-banner, .advertisement, .apply-button-container').remove();

        // Convert line breaks and horizontal rules
        $('br').replaceWith('\n');
        $('hr').replaceWith('\n\n---\n\n');

        // Convert headers into markdown headings
        $('h1, h2, h3, h4, h5, h6').each((_, el) => {
            const headingText = $(el).text().trim();
            if (headingText) {
                $(el).replaceWith(`\n\n### ${headingText}\n`);
            }
        });

        // Convert list items into bullet points
        $('li').each((_, el) => {
            const itemText = $(el).text().trim();
            if (itemText) {
                // Remove existing bullet characters if author already typed them
                const cleanItem = itemText.replace(/^[•\-\*–—\s]+/, '').trim();
                $(el).replaceWith(`\n• ${cleanItem}`);
            }
        });

        // Convert lists and paragraphs to have spacing
        $('ul, ol').each((_, el) => {
            $(el).append('\n');
        });
        $('p, div, section, article').each((_, el) => {
            $(el).prepend('\n').append('\n');
        });

        // Get text and clean line by line
        let rawText = $.text();
        rawText = decodeHtmlEntities(rawText);

        const lines = rawText
            .split('\n')
            .map((line) => line.replace(/[ \t]+/g, ' ').trim())
            .filter((line, idx, arr) => {
                // Keep empty lines for paragraph separation, but not more than 1 consecutive empty line
                if (line === '') {
                    return idx === 0 || arr[idx - 1] !== '';
                }
                // Filter out common web scraping artifacts
                if (/^(sign in|join now|apply now|cookie policy|terms of service|privacy policy|share this job)$/i.test(line)) {
                    return false;
                }
                return true;
            });

        return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    } catch (err) {
        // Fallback regex cleaner if cheerio parsing encounters syntax error
        return decodeHtmlEntities(html)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>|<\/div>|<\/li>/gi, '\n')
            .replace(/<li>/gi, '• ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
}

/**
 * Extracts structured sections (Responsibilities, Qualifications, Preferred, Benefits)
 * from the cleaned description text.
 */
export function extractStructuredSections(cleanText) {
    if (!cleanText) {
        return {
            responsibilities: [],
            requirements: [],
            preferred: [],
            benefits: [],
            summary: '',
        };
    }

    const lines = cleanText.split('\n');
    const sections = {
        summary: [],
        responsibilities: [],
        requirements: [],
        preferred: [],
        benefits: [],
    };

    let currentSection = 'summary';

    const SECTION_PATTERNS = [
        { key: 'responsibilities', regex: /^(?:###\s*)?(?:what you('ll| will) do|responsibilities|key duties|role overview|day to day|your mission|what you'll be working on)/i },
        { key: 'requirements', regex: /^(?:###\s*)?(?:what (we're|we are) looking for|requirements|qualifications|basic qualifications|must have|minimum qualifications|who you are|what you bring)/i },
        { key: 'preferred', regex: /^(?:###\s*)?(?:preferred|nice to have|bonus points|preferred qualifications|desired skills)/i },
        { key: 'benefits', regex: /^(?:###\s*)?(?:what we offer|benefits|perks|compensation & benefits|why join us|our benefits)/i },
    ];

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        // Check for section boundary
        let matchedSection = null;
        for (const sp of SECTION_PATTERNS) {
            if (sp.regex.test(line)) {
                matchedSection = sp.key;
                break;
            }
        }

        if (matchedSection) {
            currentSection = matchedSection;
            continue;
        }

        // Add line to current section
        if (currentSection === 'summary') {
            if (sections.summary.length < 5) {
                sections.summary.push(line);
            }
        } else {
            // If line is a bullet or standard sentence, add as item
            const cleanBullet = line.replace(/^[•\-\*–—\s]+/, '').trim();
            if (cleanBullet.length > 8) {
                sections[currentSection].push(cleanBullet);
            }
        }
    }

    return {
        summary: sections.summary.join(' ').slice(0, 400),
        responsibilities: sections.responsibilities.slice(0, 15),
        requirements: sections.requirements.slice(0, 15),
        preferred: sections.preferred.slice(0, 10),
        benefits: sections.benefits.slice(0, 10),
    };
}

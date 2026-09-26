export interface ExtractedLink {
  label: string;
  url: string;
}

export interface LatexSanitizationOutput {
  plainText: string;
  links: ExtractedLink[];
  sectionHeaders: string[];
}

/**
 * Checks if the given raw document text contains LaTeX preamble or formatting macros.
 */
export function isLatexDocument(source: string): boolean {
  if (!source || typeof source !== 'string') return false;
  return /\\documentclass|\\begin\{document\}|\\section\*?\{|\\textbf\{|\\item\b|\\href\{/i.test(
    source
  );
}

/**
 * Sanitizes LaTeX document content while strictly preserving:
 * 1. Hyperlinks (\href{url}{label} and \url{url})
 * 2. Section hierarchy and headers
 * 3. Bullet list item hierarchy
 */
export function sanitizeLatex(source: string): LatexSanitizationOutput {
  if (!source || typeof source !== 'string') {
    return { plainText: '', links: [], sectionHeaders: [] };
  }

  const links: ExtractedLink[] = [];
  const sectionHeaders: string[] = [];

  // Extract all \href links first
  const hrefRegex = /\\href\{([^{}]*)\}\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(source)) !== null) {
    links.push({ url: match[1].trim(), label: match[2].trim() });
  }

  // Extract \url links
  const urlRegex = /\\url\{([^{}]*)\}/g;
  while ((match = urlRegex.exec(source)) !== null) {
    links.push({ url: match[1].trim(), label: match[1].trim() });
  }

  // Extract section headers
  const sectionRegex = /\\(?:section|subsection|subsubsection)\*?\{([^{}]*)\}/g;
  while ((match = sectionRegex.exec(source)) !== null) {
    sectionHeaders.push(match[1].trim());
  }

  if (!isLatexDocument(source)) {
    return { plainText: source.trim(), links, sectionHeaders };
  }

  const plainText = source
    .replace(/%.*$/gm, '') // Remove comments
    .replace(/\\href\{([^{}]*)\}\{([^{}]*)\}/g, '$2 ($1)') // Preserve href as "Label (URL)"
    .replace(/\\url\{([^{}]*)\}/g, '$1') // Preserve URL
    .replace(
      /\\(?:subheading|roleline|resumeItem|resumeSubItem)\{([^{}]*)\}\{([^{}]*)\}/g,
      '\n$1\n$2\n'
    )
    .replace(/\\(?:section|subsection|subsubsection)\*?\{([^{}]*)\}/g, '\n\n=== $1 ===\n')
    .replace(/\\item\s*/g, '\n- ')
    .replace(/\\begin\{(?:itemize|enumerate|description)\}/g, '\n')
    .replace(/\\end\{(?:itemize|enumerate|description)\}/g, '\n')
    .replace(/\\begin\{[^{}]*\}/g, '')
    .replace(/\\end\{[^{}]*\}/g, '')
    .replace(/\\(?:textbf|textit|textrm|texttt|emph|underline|scshape|textsf)\{([^{}]*)\}/g, '$1')
    .replace(/\\fontsize\{[^{}]*\}\{[^{}]*\}/g, '')
    .replace(
      /\\(?:fa[A-Za-z]+|quad|qquad|textbar|cdot|bullet|vspace\*?\{[^{}]*\}|hspace\*?\{[^{}]*\})/g,
      ' '
    )
    .replace(/\\\\(?:\[[^\]]*\])?/g, '\n')
    .replace(/\\([#$%&_{}~^\\])/g, '$1')
    .replace(/\\[A-Za-z]+(?:\[[^\]]*\])?(?:\{[^{}]*\})?/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  return {
    plainText,
    links,
    sectionHeaders,
  };
}

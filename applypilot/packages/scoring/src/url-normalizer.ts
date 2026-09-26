const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'refid',
  'trk',
  'trackingid',
  'position',
  'pagenum',
  'origin',
  'fbclid',
  'gclid',
  'mc_eid',
  'gh_src',
  'lever-source',
  'ashby_jid',
  'src',
  '_ga',
  '_gl',
]);

/**
 * Normalizes a job URL to a canonical format by stripping tracking
 * parameters, standardizing protocol/hostname, and trimming trailing slashes.
 */
export function normalizeCanonicalUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);

    // Standardize protocol and lowercase hostname
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    // Standardize default ports
    if (
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')
    ) {
      parsed.port = '';
    }

    // Clean path (remove duplicate slashes, remove trailing slash unless root)
    let pathname = parsed.pathname.replace(/\/+/g, '/').toLowerCase();
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    // Filter out marketing/tracking parameters
    const cleanedParams = new URLSearchParams();
    const sortedKeys = Array.from(parsed.searchParams.keys()).sort();

    for (const key of sortedKeys) {
      const lowerKey = key.toLowerCase();
      if (!TRACKING_PARAMS.has(lowerKey)) {
        for (const val of parsed.searchParams.getAll(key)) {
          cleanedParams.append(key, val);
        }
      }
    }

    parsed.search = cleanedParams.toString() ? `?${cleanedParams.toString()}` : '';
    parsed.hash = ''; // Drop URL fragments

    return parsed.toString();
  } catch {
    // If not a valid URL (e.g., relative path), do basic sanitization
    return trimmed.replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Strips tracking parameters, affiliate tokens, and session garbage to get the clean canonical URL.
 */
export function cleanCanonicalUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string')
        return '#';
    try {
        const parsed = new URL(rawUrl);
        // Remove UTM and analytics trackers
        const trackers = [
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_term',
            'utm_content',
            'ref',
            'refId',
            'trackingId',
            'fbclid',
            'gclid',
            'src',
            'source',
            'gh_src',
            'lever-source',
        ];
        for (const key of trackers) {
            parsed.searchParams.delete(key);
        }
        // Remove trailing slashes and clean hash
        let clean = parsed.toString();
        if (clean.endsWith('?'))
            clean = clean.slice(0, -1);
        return clean;
    }
    catch {
        return rawUrl.trim();
    }
}
/**
 * Returns the verified canonical job apply or posting URL.
 * Opens the actual job page so the user can verify the original source.
 */
export function getSafeJobApplyUrl(job) {
    const rawUrl = (job.canonicalUrl || job.applyUrl || job.sourceUrl || job.url || '').trim();
    if (!rawUrl || rawUrl === '#')
        return '#';
    return cleanCanonicalUrl(rawUrl);
}
/**
 * Determines timestamp precision category and label strictly adhering to anti-hallucination rules.
 */
export function getTimestampProvenance(job) {
    const kind = job.postedDateKind || (job.source === 'greenhouse' || job.source === 'ashby' || job.source === 'lever'
        ? 'updated'
        : job.postedRelative
            ? 'approximate'
            : job.postedAt && !job.postedAt.includes('T00:00:00')
                ? 'exact'
                : 'unknown');
    switch (kind) {
        case 'exact':
            return {
                kind: 'exact',
                label: 'Exact Time',
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
                tooltip: `Exact original posting time: ${job.postedAt || job.rawPostingTime || 'Confirmed'}`,
            };
        case 'updated':
            return {
                kind: 'updated',
                label: 'Updated by ATS',
                color: 'text-blue-700 bg-blue-50 border-blue-200/80',
                tooltip: `Last updated timestamp on ATS: ${job.rawPostingTime || job.postedRelative || job.postedAt || 'Recent'}`,
            };
        case 'approximate':
            return {
                kind: 'approximate',
                label: 'Approximate',
                color: 'text-amber-700 bg-amber-50 border-amber-200/80',
                tooltip: `Approximate relative time from board: "${job.rawPostingTime || job.postedRelative || 'Recently posted'}"`,
            };
        case 'unknown':
        default:
            return {
                kind: 'unknown',
                label: 'Timestamp Unknown',
                color: 'text-slate-600 bg-slate-100 border-slate-200/80',
                tooltip: 'The original job board does not provide a reliable posting timestamp.',
            };
    }
}
/**
 * Visual badge info for JobVerificationStatus
 */
export function getVerificationBadge(status) {
    const s = status || 'unverified';
    switch (s) {
        case 'verified_active':
            return {
                status: 'verified_active',
                label: 'Verified Active',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                dotClass: 'bg-emerald-500 animate-pulse',
                description: 'Verified live on original job board/ATS. Reached HTTP 200.',
            };
        case 'stale':
            return {
                status: 'stale',
                label: 'Potentially Stale',
                badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
                dotClass: 'bg-amber-500',
                description: 'Posting is older than 30 days or has not updated recently.',
            };
        case 'expired':
            return {
                status: 'expired',
                label: 'Expired / Closed',
                badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
                dotClass: 'bg-rose-500',
                description: 'Confirmed closed or returned 404 on original board.',
            };
        case 'unverified':
        default:
            return {
                status: 'unverified',
                label: 'Unverified',
                badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                dotClass: 'bg-slate-400',
                description: 'Not yet verified against live HTTP endpoints.',
            };
    }
}

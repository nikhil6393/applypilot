import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  ExternalLink,
  ShieldCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Sparkles,
  Sliders,
  ChevronRight,
  Info,
  Building,
  MapPin,
  Calendar,
  Zap,
  Globe,
  DollarSign,
  GraduationCap,
  Bookmark,
  BookmarkCheck,
  Share2,
  Check,
  CheckCircle2,
} from 'lucide-react';
import type { JobPosting, ParsedResume } from '../types';
import { getSafeJobApplyUrl, getTimestampProvenance, getVerificationBadge } from '../utils/jobUtils';
import { CompanyIcon } from './CompanyIcon';
import { ApplyPilotLogo } from './ApplyPilotLogo';
import { useAppStore } from '../store/appStore';

interface LiveJobsPageProps {
  resume: ParsedResume | null;
  onSelectJobForDetail: (job: JobPosting) => void;
  onSelectJobForTailoring: (job: JobPosting) => void;
}

export const LiveJobsPage: React.FC<LiveJobsPageProps> = ({
  resume,
  onSelectJobForDetail,
  onSelectJobForTailoring,
}) => {
  const { bookmarkedJobIds, toggleBookmark, isBookmarked, addToast } = useAppStore();

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    resume?.target_roles?.[0] || 'Software Engineer'
  );
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<'1h' | '4h' | '12h' | '24h' | '72h'>('24h');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [jobTypeFilter, setJobTypeFilter] = useState<'all' | 'internship' | 'fulltime'>('all');
  const [visaSponsoredOnly, setVisaSponsoredOnly] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  const [verifyingMap, setVerifyingMap] = useState<Record<string, boolean>>({});
  const [verificationResults, setVerificationResults] = useState<
    Record<string, { status: string; httpStatus?: number; latencyMs?: number; reason?: string }>
  >({});
  const [duplicatesCount, setDuplicatesCount] = useState(0);

  const fetchLiveJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const hours =
        selectedTimeWindow === '1h'
          ? 1
          : selectedTimeWindow === '4h'
            ? 4
            : selectedTimeWindow === '12h'
              ? 12
              : selectedTimeWindow === '24h'
                ? 24
                : 72;

      const q = encodeURIComponent(searchQuery.trim());
      const res = await fetch(`/api/jobs/live?query=${q}&limit=60&postedWithinHours=${hours}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        setJobs(data.items);
        setDuplicatesCount(data.duplicatesDetected || 0);
      } else {
        setJobs([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch live verifiable jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveJobs();
  }, [selectedTimeWindow]);

  const handleVerifyUrl = async (job: JobPosting, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getSafeJobApplyUrl(job);
    if (!url || url === '#') return;

    setVerifyingMap((prev) => ({ ...prev, [job.id]: true }));
    try {
      const res = await fetch('/api/jobs/verify-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, jobId: job.id }),
      });
      const data = await res.json();
      setVerificationResults((prev) => ({
        ...prev,
        [job.id]: {
          status: data.status,
          httpStatus: data.httpStatus,
          latencyMs: data.latencyMs,
          reason: data.reason,
        },
      }));
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, verificationStatus: data.status } : j))
      );
      if (data.status === 'verified_active') {
        addToast({
          title: 'URL Verified Active',
          message: `${job.company} posting responds with HTTP 200 OK (${data.latencyMs || 120}ms)`,
          type: 'success',
        });
      }
    } catch (err: any) {
      setVerificationResults((prev) => ({
        ...prev,
        [job.id]: {
          status: 'unverified',
          reason: err.message || 'Verification check timed out',
        },
      }));
    } finally {
      setVerifyingMap((prev) => ({ ...prev, [job.id]: false }));
    }
  };

  const handleCopyLink = (job: JobPosting, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getSafeJobApplyUrl(job);
    if (navigator.clipboard && url) {
      navigator.clipboard.writeText(url);
      setCopiedJobId(job.id);
      addToast({
        title: 'Apply Link Copied',
        message: `Direct link for ${job.title} at ${job.company} copied to clipboard`,
        type: 'info',
      });
      setTimeout(() => setCopiedJobId(null), 2000);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (verifiedOnly && j.verificationStatus !== 'verified_active') return false;
    if (jobTypeFilter === 'internship' && !j.isInternship && !/\bintern\b/i.test(j.title)) return false;
    if (jobTypeFilter === 'fulltime' && (j.isInternship || /\bintern\b/i.test(j.title))) return false;
    if (visaSponsoredOnly && !j.visaSponsorship) return false;
    if (remoteOnly && !j.remote && !j.isRemote && !/\bremote\b/i.test(j.location || '')) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* ── Top Header Banner with Live Stats ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 p-8 shadow-2xl text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Real-Time Live Feed • Anti-Stale Radar Active</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Live Verified Job Radar</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every job is verified with fresh headers from original company career boards.
              Auto-resolves company logos, filters out stale expired links, and confirms live ATS availability.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 text-center shadow-lg">
              <span className="block text-2xl font-black text-emerald-400">{filteredJobs.length}</span>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Active Postings</span>
            </div>
            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 text-center shadow-lg">
              <span className="block text-2xl font-black text-cyan-400">
                {jobs.filter((j) => j.visaSponsorship).length}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Visa Sponsored</span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 text-center shadow-lg">
              <span className="block text-2xl font-black text-amber-400">
                {duplicatesCount > 0 ? duplicatesCount : jobs.filter((j) => j.duplicateCount && j.duplicateCount > 0).length}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Cross-Posted</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Control, Search & Filter Bar ── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
        {/* Search Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLiveJobs()}
              placeholder="Search live jobs by title, company, or tech stack (e.g. React, Full Stack, Python)..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            onClick={fetchLiveJobs}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Feed</span>
          </button>
        </div>

        {/* Filters & Toggles Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Freshness buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Freshness:
            </span>
            {(['1h', '4h', '12h', '24h', '72h'] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => setSelectedTimeWindow(tw)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedTimeWindow === tw
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tw === '72h' ? 'Last 3 Days' : `< ${tw}`}
              </button>
            ))}
          </div>

          {/* Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setJobTypeFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                jobTypeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setJobTypeFilter('internship')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                jobTypeFilter === 'internship'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Internships Only
            </button>
            <button
              onClick={() => setJobTypeFilter('fulltime')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                jobTypeFilter === 'fulltime'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Full-Time Only
            </button>
          </div>

          {/* Quick Attribute Toggles */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-blue-500" /> Remote
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visaSponsoredOnly}
                onChange={(e) => setVisaSponsoredOnly(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Visa Sponsored
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Verified Active
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-slate-100 animate-pulse rounded-3xl border border-slate-200" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredJobs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
            <Radio className="w-7 h-7 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No postings matching active radar filters</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Try broadening your freshness window or clearing attributes. ApplyPilot continuously polls verified sources in the background.
          </p>
          <button
            onClick={() => {
              setSelectedTimeWindow('72h');
              setVerifiedOnly(false);
              setJobTypeFilter('all');
              setVisaSponsoredOnly(false);
              setRemoteOnly(false);
            }}
            className="mt-4 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
          >
            Reset Filters &amp; Broaden to 3 Days
          </button>
        </div>
      )}

      {/* ── High-Impact Job Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJobs.map((job) => {
          const timeBadge = getTimestampProvenance(job);
          const verificationBadge = getVerificationBadge(job.verificationStatus);
          const vResult = verificationResults[job.id];
          const isVerifying = verifyingMap[job.id];
          const directUrl = getSafeJobApplyUrl(job);
          const isSaved = isBookmarked(job.id);
          const isCopied = copiedJobId === job.id;

          const skillsToShow = (job.skills && job.skills.length > 0)
            ? job.skills.slice(0, 4)
            : (job.tags || []).slice(0, 4);

          return (
            <motion.div
              key={job.id}
              whileHover={{ y: -3 }}
              onClick={() => onSelectJobForDetail(job)}
              className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-blue-400 hover:shadow-xl shadow-xs transition-all flex flex-col justify-between cursor-pointer group space-y-4"
            >
              <div className="space-y-3">
                {/* Header: Company Logo, Name, Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Auto-resolved Company Logo */}
                    <CompanyIcon
                      company={job.company}
                      logoUrl={job.companyLogo}
                      size={46}
                      className="rounded-2xl shadow-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-500 uppercase tracking-wider truncate">
                          {job.company}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                          {job.source}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mt-0.5">
                        {job.title}
                      </h3>
                    </div>
                  </div>

                  {/* Bookmark Button */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleBookmark(job.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title={isSaved ? 'Remove bookmark' : 'Bookmark job'}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4 text-blue-600 fill-blue-600" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Attribute Pills: Visa Sponsorship, Batch, Location, Time */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {/* Visa Sponsorship Badge */}
                  {job.visaSponsorship && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Visa Sponsored
                    </span>
                  )}

                  {/* Graduation Batch Badge */}
                  {job.batchYear && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                      <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                      Batch {job.batchYear}
                    </span>
                  )}

                  {/* Location Chip */}
                  <span className="inline-flex items-center gap-1 text-slate-700 px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-semibold">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {job.location || 'Remote'}
                  </span>

                  {/* Freshness Clock Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-medium border text-[11px] ${timeBadge.color}`}
                    title={timeBadge.tooltip}
                  >
                    <Clock className="w-3 h-3" />
                    {timeBadge.label}: {job.rawPostingTime || job.postedRelative || job.postedAt?.split('T')[0] || 'Recent'}
                  </span>

                  {/* Cross-board Badge */}
                  {job.duplicateCount && job.duplicateCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                      <Layers className="w-3 h-3" />
                      Cross-posted ({job.duplicateCount + 1})
                    </span>
                  ) : null}
                </div>

                {/* Description Snippet */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                  {job.description}
                </p>

                {/* Tech Skills Chips */}
                {skillsToShow.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {skillsToShow.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/80"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Live Verification Diagnostic feedback if checked */}
                {vResult && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-800 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Header Verification: {vResult.status}
                      </span>
                      {vResult.latencyMs && (
                        <span className="text-emerald-700 font-mono font-bold">{vResult.latencyMs}ms latency</span>
                      )}
                    </div>
                    {vResult.reason && <p className="text-slate-500 font-medium">{vResult.reason}</p>}
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {job.salary || (job.isInternship ? 'Stipend: ₹25k-50k/mo' : 'Competitive Market Pay')}
                  </span>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleVerifyUrl(job, e)}
                    disabled={isVerifying}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Run live HTTP head check to ensure the link has not expired"
                  >
                    <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin text-emerald-600' : ''}`} />
                    <span>{isVerifying ? 'Checking...' : 'Check Live'}</span>
                  </button>

                  <button
                    onClick={(e) => handleCopyLink(job, e)}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Copy Apply URL"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectJobForTailoring(job);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Tailor</span>
                  </button>

                  <a
                    href={directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm transition-all cursor-pointer"
                    title={`Open authentic job posting: ${directUrl}`}
                  >
                    <span>Apply</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

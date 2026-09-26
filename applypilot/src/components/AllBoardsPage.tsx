import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Search,
  RefreshCw,
  ExternalLink,
  Shield,
  Zap,
  Globe,
  Sliders,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
} from 'lucide-react';
import type { JobPosting, JobSource, ParsedResume } from '../types';
import { getSafeJobApplyUrl, getTimestampProvenance, getVerificationBadge } from '../utils/jobUtils';

interface BoardDefinition {
  id: JobSource;
  name: string;
  category: 'ATS' | 'Professional' | 'Startups' | 'Campus / Interns';
  description: string;
  supportsKeywords: boolean;
  supportsRemote: boolean;
  rateLimitPerMin: number;
}

const SUPPORTED_BOARDS: BoardDefinition[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'Professional',
    description: 'Real-time public guest job search API with freshness window',
    supportsKeywords: true,
    supportsRemote: true,
    rateLimitPerMin: 35,
  },
  {
    id: 'naukari',
    name: 'Naukri.com',
    category: 'Professional',
    description: 'Indian tech and software engineer listings (verified slugs only)',
    supportsKeywords: true,
    supportsRemote: true,
    rateLimitPerMin: 25,
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    category: 'ATS',
    description: 'Official direct ATS boards API (Airbnb, Stripe, Figma, etc.)',
    supportsKeywords: true,
    supportsRemote: true,
    rateLimitPerMin: 60,
  },
  {
    id: 'lever',
    name: 'Lever.co',
    category: 'ATS',
    description: 'Direct company postings on Lever recruitment engine',
    supportsKeywords: true,
    supportsRemote: true,
    rateLimitPerMin: 50,
  },
  {
    id: 'ashby',
    name: 'Ashby HQ',
    category: 'ATS',
    description: 'Modern high-growth startup ATS with verified live applications',
    supportsKeywords: true,
    supportsRemote: true,
    rateLimitPerMin: 60,
  },
  {
    id: 'remoteok',
    name: 'RemoteOK',
    category: 'Startups',
    description: 'Official public API for worldwide remote software roles',
    supportsKeywords: true,
    supportsRemote: true,
    rateLimitPerMin: 30,
  },
  {
    id: 'arbeitnow',
    name: 'Arbeitnow',
    category: 'Startups',
    description: 'Verified remote & EU/Global tech hiring feeds with direct apply',
    supportsKeywords: true,
    supportsRemote: true,
    rateLimitPerMin: 45,
  },
  {
    id: 'yc',
    name: 'Y Combinator',
    category: 'Startups',
    description: 'Official Hacker News Firebase API for YC startup hiring',
    supportsKeywords: true,
    supportsRemote: true,
    rateLimitPerMin: 60,
  },
  {
    id: 'internshala',
    name: 'Internshala',
    category: 'Campus / Interns',
    description: 'Campus student & fresher software engineering internships',
    supportsKeywords: true,
    supportsRemote: true,
    rateLimitPerMin: 20,
  },
  {
    id: 'unstop',
    name: 'Unstop',
    category: 'Campus / Interns',
    description: 'Hackathon hiring, corporate challenges & student programs',
    supportsKeywords: true,
    supportsRemote: true,
    rateLimitPerMin: 25,
  },
];

interface AllBoardsPageProps {
  resume: ParsedResume | null;
  onSelectJobForDetail: (job: JobPosting) => void;
  onSelectJobForTailoring: (job: JobPosting) => void;
}

export const AllBoardsPage: React.FC<AllBoardsPageProps> = ({
  resume,
  onSelectJobForDetail,
  onSelectJobForTailoring,
}) => {
  const [activeBoardFilter, setActiveBoardFilter] = useState<JobSource | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState(
    resume?.target_roles?.[0] || 'Software Engineer'
  );
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [syncingBoard, setSyncingBoard] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<Record<string, { count: number; lastSynced?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing jobs on mount
  useEffect(() => {
    fetchAggregatedJobs();
  }, [activeBoardFilter]);

  const fetchAggregatedJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const sourceParam = activeBoardFilter !== 'all' ? `&source=${activeBoardFilter}` : '';
      const q = encodeURIComponent(searchQuery.trim());
      const res = await fetch(`/api/jobs?limit=100&query=${q}${sourceParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = data.items || [];
      setJobs(items);

      // Compute board counts
      const counts: Record<string, { count: number }> = {};
      for (const item of items) {
        counts[item.source] = {
          count: (counts[item.source]?.count || 0) + 1,
        };
      }
      setSyncStats((prev) => ({ ...prev, ...counts }));
    } catch (err: any) {
      setError(err.message || 'Failed to load aggregated jobs');
    } finally {
      setLoading(false);
    }
  };

  const syncSpecificBoard = async (boardId: JobSource) => {
    setSyncingBoard(boardId);
    setError(null);
    try {
      const q = encodeURIComponent(searchQuery.trim());
      const res = await fetch(`/api/jobs/scrape?source=${boardId}&query=${q}&limit=25`);
      const data = await res.json();
      if (data.jobs && Array.isArray(data.jobs)) {
        // Merge fresh jobs
        setJobs((prev) => {
          const existingIds = new Set(prev.map((j) => j.id));
          const newOnes = data.jobs.filter((j: JobPosting) => !existingIds.has(j.id));
          return [...newOnes, ...prev];
        });
        setSyncStats((prev) => ({
          ...prev,
          [boardId]: {
            count: data.jobs.length,
            lastSynced: new Date().toLocaleTimeString(),
          },
        }));
      }
    } catch (err: any) {
      setError(`Failed to sync ${boardId}: ${err.message}`);
    } finally {
      setSyncingBoard(null);
    }
  };

  const syncAllBoards = async () => {
    setSyncingBoard('ALL');
    setError(null);
    try {
      const q = encodeURIComponent(searchQuery.trim());
      const res = await fetch(`/api/jobs/scrape?query=${q}&limit=50`);
      const data = await res.json();
      if (data.jobs && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      }
    } catch (err: any) {
      setError(`All boards sync failed: ${err.message}`);
    } finally {
      setSyncingBoard(null);
      fetchAggregatedJobs();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-indigo-500/20 p-8 shadow-2xl text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              10-Board Meta Aggregation Architecture
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              All Job Boards & ATS Feeds
            </h1>
            <p className="text-sm sm:text-base text-indigo-100/80 max-w-2xl leading-relaxed">
              Query simultaneously across direct corporate ATS pipelines (Greenhouse, Lever, Ashby), professional networks (LinkedIn, Naukri), startup communities (RemoteOK, Arbeitnow, Y Combinator), and campus channels (Internshala, Unstop).
            </p>
          </div>

          <button
            onClick={syncAllBoards}
            disabled={syncingBoard !== null}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncingBoard === 'ALL' ? 'animate-spin' : ''}`} />
            {syncingBoard === 'ALL' ? 'Syncing All 10 Boards...' : 'Sync All Boards'}
          </button>
        </div>
      </div>

      {/* Board Adapter Carousel / Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Connected Board Adapters ({SUPPORTED_BOARDS.length})
          </span>
          <button
            onClick={() => setActiveBoardFilter('all')}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
              activeBoardFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Show All ({jobs.length} jobs)
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {SUPPORTED_BOARDS.map((board) => {
            const isSelected = activeBoardFilter === board.id;
            const isSyncing = syncingBoard === board.id;
            const stats = syncStats[board.id];

            return (
              <div
                key={board.id}
                onClick={() => setActiveBoardFilter(board.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {board.category}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        syncSpecificBoard(board.id);
                      }}
                      disabled={syncingBoard !== null}
                      title={`Sync ${board.name} live`}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 mt-1">{board.name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{board.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {stats ? `${stats.count} jobs` : '0 jobs'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {board.rateLimitPerMin}/min
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAggregatedJobs()}
            placeholder="Search keywords across all boards (e.g. SDE, Frontend, Intern, Full Stack)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <button
          onClick={fetchAggregatedJobs}
          disabled={loading}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all disabled:opacity-50"
        >
          Search All
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Results grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No jobs aggregated for this query</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Click &quot;Sync All Boards&quot; above to fetch genuine postings from all 10 adapters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const timeBadge = getTimestampProvenance(job);
            const verificationBadge = getVerificationBadge(job.verificationStatus);
            const directUrl = getSafeJobApplyUrl(job);

            return (
              <motion.div
                key={job.id}
                whileHover={{ y: -2 }}
                onClick={() => onSelectJobForDetail(job)}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm flex-shrink-0">
                        {job.companyLogo ? (
                          <img src={job.companyLogo} alt={job.company} className="w-8 h-8 rounded-lg object-contain" />
                        ) : (
                          job.company?.slice(0, 2).toUpperCase() || 'JB'
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          {job.company}
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                            {job.source}
                          </span>
                        </h4>
                        <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {job.title}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${verificationBadge.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${verificationBadge.dotClass}`} />
                      {verificationBadge.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium border ${timeBadge.color}`}>
                      <Clock className="w-3 h-3" />
                      {timeBadge.label}: {job.rawPostingTime || job.postedRelative || job.postedAt?.split('T')[0] || 'Recent'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
                      {job.location || 'Remote'}
                    </span>
                    {job.salary && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        {job.salary}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {job.id.slice(0, 14)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectJobForTailoring(job);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all"
                    >
                      <Sparkles className="w-3 h-3" /> Tailor
                    </button>

                    <a
                      href={directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                    >
                      Original Post <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Search,
  MapPin,
  Building2,
  Trash2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Briefcase,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { CompanyIcon } from './CompanyIcon';
import { JobDetailDrawer } from './JobDetailDrawer';
import JobKeywordTailorModal from './resume-studio/JobKeywordTailorModal';
import { getSafeJobApplyUrl } from '../utils/jobUtils';
import { useAppStore } from '../store/appStore';
import './JobFeedExact.css';

export function PastScrapedScreen({
  resume,
  onNavigateToFeed,
  onNavigateToResume,
  onUpdateResume,
  isAdmin = false,
  token,
}) {
  const { addToast } = useAppStore();

  const [dbJobs, setDbJobs] = useState([]);
  const [stats, setStats] = useState({ totalJobs: 0, totalCompanies: 0, sources: {}, latestScraped: null });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Drawers and Modals
  const [selectedDrawerJob, setSelectedDrawerJob] = useState(null);
  const [tailorModalJob, setTailorModalJob] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch Database Stats & Jobs directly from SQLite via backend API (NO localStorage)
  const fetchDbData = async () => {
    setLoading(true);
    try {
      const [jobsRes, statsRes] = await Promise.all([
        fetch('/api/jobs?limit=500'),
        fetch('/api/jobs/database-stats'),
      ]);

      const jobsData = await jobsRes.json();
      const statsData = await statsRes.json();

      setDbJobs(jobsData.items || []);
      if (statsData.success) {
        setStats({
          totalJobs: statsData.totalJobs || (jobsData.items ? jobsData.items.length : 0),
          totalCompanies: statsData.totalCompanies || 0,
          sources: statsData.sources || {},
          latestScraped: statsData.latestScraped || null,
        });
      }
    } catch (err) {
      console.error('Failed to fetch past scraped database jobs:', err);
      if (addToast) {
        addToast({
          title: 'Database Sync',
          message: 'Unable to reach backend SQLite store.',
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbData();
  }, []);

  // Delete Job from Database directly
  const handleDeleteJob = async (jobId, company, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${company}" posting from the backend database?`)) return;

    setDeletingId(jobId);
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = res.status === 204 ? {} : await res.json();
      if (data.success) {
        setDbJobs((prev) => prev.filter((j) => j.id !== jobId));
        setStats((prev) => ({
          ...prev,
          totalJobs: Math.max(0, prev.totalJobs - 1),
        }));
        if (addToast) {
          addToast({
            title: 'Job Removed',
            message: `Deleted from backend SQLite database.`,
            type: 'success',
          });
        }
      }
    } catch (err) {
      console.error('Error deleting job from DB:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered and Sorted Jobs
  const filteredJobs = useMemo(() => {
    return dbJobs.filter((job) => {
      // Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const titleMatch = (job.title || '').toLowerCase().includes(q);
        const compMatch = (job.company || '').toLowerCase().includes(q);
        const skillsMatch = Array.isArray(job.skills) && job.skills.some((s) => s.toLowerCase().includes(q));
        if (!titleMatch && !compMatch && !skillsMatch) return false;
      }

      // Source Filter
      if (selectedSource !== 'all') {
        const jobSrc = (job.source || '').toLowerCase();
        if (jobSrc !== selectedSource.toLowerCase()) return false;
      }

      // Location Filter
      if (selectedLocation !== 'all') {
        const loc = (job.location || '').toLowerCase();
        if (selectedLocation === 'remote' && !job.remote && !loc.includes('remote')) return false;
        if (selectedLocation === 'india' && !loc.includes('india')) return false;
        if (selectedLocation === 'noida' && !loc.includes('noida')) return false;
        if (selectedLocation === 'bengaluru' && !loc.includes('bengaluru') && !loc.includes('bangalore')) return false;
      }

      // Job Type
      if (selectedType !== 'all') {
        const isIntern = job.isIntern || job.employmentType === 'internship' || /\bintern/i.test(job.title || '');
        if (selectedType === 'internship' && !isIntern) return false;
        if (selectedType === 'fulltime' && isIntern) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'recent') {
        const tA = new Date(a.postedAt || a.fetchedAt || 0).getTime();
        const tB = new Date(b.postedAt || b.fetchedAt || 0).getTime();
        return tB - tA;
      }
      if (sortBy === 'company') {
        return (a.company || '').localeCompare(b.company || '');
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });
  }, [dbJobs, searchTerm, selectedSource, selectedLocation, selectedType, sortBy]);

  const uniqueSources = useMemo(() => {
    const set = new Set();
    dbJobs.forEach((j) => {
      if (j.source) set.add(j.source.toLowerCase());
    });
    return Array.from(set);
  }, [dbJobs]);

  return (
    <div className="past-scraped-view w-full max-w-[1500px] mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* ── Top Header Banner ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800/80 mb-6 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
              <Database className="w-3.5 h-3.5" />
              <span>SQLite Persistent Database • Zero Browser Storage</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Past Scraped Archive
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every job discovered during your previous live scraping runs is stored in your local SQLite database. 
              Search the shared archive and tailor a resume for an archived role.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
            <button
              onClick={fetchDbData}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Database</span>
            </button>
            <button
              onClick={() => onNavigateToFeed && onNavigateToFeed()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
            >
              <span>⚡ Live Job Feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Metric Badges Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3.5 border border-slate-700/60">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total in Database</div>
            <div className="text-2xl font-black text-white mt-1">{stats.totalJobs || dbJobs.length}</div>
            <div className="text-[10.5px] text-emerald-400 font-medium mt-0.5">● Cached & Ready</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3.5 border border-slate-700/60">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Indexed Companies</div>
            <div className="text-2xl font-black text-white mt-1">{stats.totalCompanies || new Set(dbJobs.map(j => j.company)).size}</div>
            <div className="text-[10.5px] text-indigo-300 font-medium mt-0.5">Across India & Global</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3.5 border border-slate-700/60">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Platforms</div>
            <div className="text-2xl font-black text-white mt-1">{Object.keys(stats.sources).length || uniqueSources.length}</div>
            <div className="text-[10.5px] text-purple-300 font-medium mt-0.5 truncate">
              {Object.keys(stats.sources).slice(0, 3).join(', ') || 'LinkedIn, Naukri, ...'}
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3.5 border border-slate-700/60">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Storage Engine</div>
            <div className="text-2xl font-black text-amber-400 mt-1">SQLite</div>
            <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">Local Server File (db.sqlite)</div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls Bar ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm mb-6 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter past jobs by role, company, or skills (e.g. React, Intern, Amazon)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="all">All Sources ({uniqueSources.length})</option>
            {uniqueSources.map((src) => (
              <option key={src} value={src}>
                {src.charAt(0).toUpperCase() + src.slice(1)}
              </option>
            ))}
          </select>

          {/* Location Filter */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="all">All Locations</option>
            <option value="india">India (Pan-India)</option>
            <option value="remote">Remote Only</option>
            <option value="noida">Noida / NCR</option>
            <option value="bengaluru">Bengaluru</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="all">All Role Types</option>
            <option value="internship">Internships Only</option>
            <option value="fulltime">Full-time Only</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="recent">Sort: Most Recent</option>
            <option value="company">Sort: Company Name</option>
            <option value="title">Sort: Job Title</option>
          </select>
        </div>

        {/* Results summary bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredJobs.length}</strong> of{' '}
            <strong className="text-slate-800">{dbJobs.length}</strong> past scraped database records
          </span>
          {(searchTerm || selectedSource !== 'all' || selectedLocation !== 'all' || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSource('all');
                setSelectedLocation('all');
                setSelectedType('all');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Job Cards Grid ── */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800">Connecting to SQLite Database...</h3>
          <p className="text-xs text-slate-500 mt-1">Retrieving archived job records from backend store.</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-bold">
            🗄️
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">No Past Scraped Jobs Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {dbJobs.length === 0
                ? "Your database currently has no saved jobs. Perform a Live Search on the Job Feed to discover and automatically capture new postings into SQLite."
                : "No past postings matched your search filters. Try clearing your search keyword or selecting 'All Sources'."}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => onNavigateToFeed && onNavigateToFeed()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold shadow-md hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>⚡ Go to Live Job Feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const isIntern = job.isIntern || job.employmentType === 'internship' || /\bintern/i.test(job.title || '');
            const safeApplyUrl = job.applyUrl && job.applyUrl !== '#' ? job.applyUrl : getSafeJobApplyUrl(job);

            return (
              <div
                key={job.id}
                onClick={() => setSelectedDrawerJob(job)}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-indigo-300 hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer relative"
              >
                <div>
                  {/* Top Bar: Company Logo & Source Tag */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <CompanyIcon
                        company={job.company}
                        logoUrl={job.companyLogo}
                        className="w-11 h-11 rounded-xl shadow-xs"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {job.company}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="line-clamp-1">{job.location || 'Remote / Unspecified'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Source Platform Badge */}
                    <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 capitalize shrink-0">
                      {job.source || 'Scraped'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                    {job.title}
                  </h3>

                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isIntern ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {isIntern ? '🎓 Internship' : '💼 Full-Time'}
                    </span>

                    {job.remote && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        🌐 Remote
                      </span>
                    )}

                    {job.eligibleBatchText && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        🎓 {job.eligibleBatchText}
                      </span>
                    )}
                  </div>

                  {/* Skills Chips */}
                  {Array.isArray(job.skills) && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {job.skills.slice(0, 4).map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-100"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400">
                          +{job.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Row: Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1.5">
                    {/* Tailor Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTailorModalJob(job);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1 transition-all cursor-pointer"
                      title="Tailor resume against this archived job"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Tailor</span>
                    </button>

                    {isAdmin && <button
                      onClick={(e) => handleDeleteJob(job.id, job.company, e)}
                      disabled={deletingId === job.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Delete this record from SQLite database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>}
                  </div>

                  {/* Apply Official Link */}
                  <a
                    href={safeApplyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-indigo-600 text-white flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  >
                    <span>Apply</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      {selectedDrawerJob && (
        <JobDetailDrawer
          job={selectedDrawerJob}
          isOpen={Boolean(selectedDrawerJob)}
          onClose={() => setSelectedDrawerJob(null)}
          resume={resume}
          onTailorJob={(j) => {
            setTailorModalJob(j);
            setSelectedDrawerJob(null);
          }}
          isBookmarked={false}
          onToggleBookmark={() => {}}
        />
      )}

      {/* Direct Job Keyword Tailor Modal */}
      {tailorModalJob && (
        <JobKeywordTailorModal
          job={tailorModalJob}
          resume={resume}
          isOpen={Boolean(tailorModalJob)}
          onClose={() => setTailorModalJob(null)}
          onUpdateResume={onUpdateResume}
          onOpenResumeStudio={() => {
            setTailorModalJob(null);
            if (onNavigateToResume) onNavigateToResume();
          }}
          onAddToast={addToast}
        />
      )}
    </div>
  );
}

export default PastScrapedScreen;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Sparkles,
  Building2,
  Globe,
  DollarSign,
  Clock,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Check,
  ChevronDown,
  Calendar,
  Zap,
  GraduationCap,
  Ghost,
  ShieldCheck,
  Flame,
  ArrowUpDown,
  X,
  Briefcase,
  User,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../context/AuthContext';
import { JobDetailDrawer } from './JobDetailDrawer';
import { classifyJobType, compareJobsByApplicantsAndRecency, compareJobsBySort, getSafeJobApplyUrl, isRecommendedJob, matchesJobLocation, matchesJobRole, resolveSearchRole, sortJobsByFit } from '../utils/jobUtils';
import { createFitScoringPayload } from '../utils/jobFitScoring.js';
import { CompanyIcon, FirstAlphabetLogo } from './CompanyIcon';
import JobKeywordTailorModal from './resume-studio/JobKeywordTailorModal';
import { semanticMatchJob } from '../../shared/roleTaxonomy.js';
import { getIndianCitizenEligibility } from '../utils/jobEligibility.js';
import './JobFeedExact.css';

/* ── Helpers for Scraper Deduplication & Freshness ── */
const getJobMinutesAgo = (job) => {
  if (!job) return Infinity;
  const rawDate = job.postedDate || job.postedAt || job.rawJob?.postedDate || job.rawJob?.postedAt || job.created_at || job.rawJob?.created_at;
  if (rawDate) {
    const timeMs = new Date(rawDate).getTime();
    if (!isNaN(timeMs)) {
      if (timeMs > Date.now()) return Infinity;
      return Math.max(0, Math.floor((Date.now() - timeMs) / 60000));
    }
  }
  const rel = (job.postedRelative || job.postedAgo || '').toLowerCase();
  if (rel.includes('just now') || rel.includes('second') || rel.includes('few seconds')) return 1;
  const minMatch = rel.match(/(\d+)\s*(?:m|min|minute)(?!o)/);
  if (minMatch) return parseInt(minMatch[1], 10);
  const hrMatch = rel.match(/(\d+)\s*(?:h|hr|hour)/);
  if (hrMatch) return parseInt(hrMatch[1], 10) * 60;
  if (rel.includes('today')) return 360;
  const dayMatch = rel.match(/(\d+)\s*(?:d|day)/);
  if (dayMatch) return parseInt(dayMatch[1], 10) * 1440;
  if (rel.includes('yesterday')) return 1440;
  const wkMatch = rel.match(/(\d+)\s*(?:w|wk|week)/);
  if (wkMatch) return parseInt(wkMatch[1], 10) * 10080;
  if (rel.includes('month') || rel.includes('mo')) return 43200;
  return Infinity;
};

const classifySeniority = (job) => {
  const declared = String(job.rawJob?.seniority || job.seniority || '').toLowerCase();
  if (['entry', 'junior', 'mid', 'senior', 'lead', 'principal'].includes(declared)) {
    return ['entry', 'junior'].includes(declared) ? 'entry' : ['lead', 'principal'].includes(declared) ? 'senior' : declared;
  }
  const title = job.title || '';
  if (/\b(intern|fresher|graduate|entry|junior|jr\.|associate|trainee|new grad)\b/i.test(title)) return 'entry';
  if (/\b(mid[- ]level|intermediate)\b/i.test(title)) return 'mid';
  if (/\b(senior|sr\.|lead|principal|staff|manager|director|head|vp|architect)\b/i.test(title)) return 'senior';
  return null;
};

const hasBatchEvidence = (job) =>
  (Array.isArray(job.eligibleBatches) && job.eligibleBatches.length > 0) ||
  Boolean(job.eligibleBatchText && job.eligibleBatchText !== 'All Batches Eligible');
const isGenericRemoteLocation = (location) =>
  /^(?:remote|work\s+from\s+home|wfh|anywhere|worldwide|global)(?:[\s,\/-]*(?:remote|work\s+from\s+home|wfh|anywhere|worldwide|global))*$/i.test(String(location || '').trim());

const formatPostingTime = (mins) => {
  if (mins <= 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  if (mins < 10080) return `${Math.floor(mins / 1440)}d ago`;
  if (mins < 43200) return `${Math.floor(mins / 10080)}w ago`;
  return 'Active';
};

const getJobDedupKey = (job) => {
  const rawUrl = job.applyUrl || job.sourceUrl || job.url || '';
  const normUrl = rawUrl.split('?')[0].trim().toLowerCase();
  const id = job.id ? String(job.id).trim() : '';
  const source = (job.source || 'unknown').toLowerCase();
  if (id && !id.startsWith('job-') && !id.startsWith('live-') && id.length > 3) {
    return `${source}:${id}`;
  }
  if (normUrl && normUrl.length > 10) {
    return `${source}:${normUrl}`;
  }
  return `${source}:${(job.title || '').toLowerCase()}:${(job.company || '').toLowerCase()}`;
};

const mergeJobsDeduped = (existing, incoming) => {
  const map = new Map();
  for (const j of existing || []) {
    map.set(getJobDedupKey(j), j);
  }
  for (const j of incoming || []) {
    map.set(getJobDedupKey(j), j);
  }
  const merged = Array.from(map.values());
  merged.sort((a, b) => getJobMinutesAgo(a) - getJobMinutesAgo(b));
  return merged;
};

/* ── Company Logo Renderer with Monogram First Alphabet Fallback ── */
function CompanyLogo({ type, company, logoUrl }) {
  return (
    <div className="jlogo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 0 }}>
      <CompanyIcon
        company={company}
        logoUrl={logoUrl}
        size={38}
        className="!border-0 !shadow-none !rounded-lg"
      />
    </div>
  );
}

export function DiscoveryStep({
  resume,
  discoveredJobs = [],
  onJobsDiscovered,
  onProceedToScoring,
  onSelectJobForDetail,
  onSelectJobForTailoring,
  initialSearchTerm = '',
  onUpdateResume,
  onNavigateToResume,
}) {
  const { user, token } = useAuth();
  const userName = user?.name || 'there';
  const {
    bookmarkedJobIds,
    toggleBookmark,
    isBookmarked,
    appliedJobIds,
    markJobApplied,
    addToast,
    setClientScreen,
    searchRole,
    searchLocation: storeLocation,
    setSearchParams,
  } = useAppStore();

  // Active Tab: 'all' | 'matched' | 'saved' | 'applied'
  const [activeTab, setActiveTab] = useState('all');
  const [tailorModalJob, setTailorModalJob] = useState(null);

  // View Layout: 'list' | 'grid'
  const [viewLayout, setViewLayout] = useState('list');

  // Hero filter chip toggle
  const [activeHeroChip, setActiveHeroChip] = useState(null);

  // Search input & Location (synced with appStore / initialSearchTerm / localStorage)
  const [searchTerm, setSearchTerm] = useState(() => searchRole || initialSearchTerm || localStorage.getItem('applypilot_search_role') || '');
  const [searchLocation, setSearchLocation] = useState(() => storeLocation || localStorage.getItem('applypilot_search_location') || '');
  
  // Decoupled active applied filters — prevents heavy feed re-sorting while user is simply typing in inputs
  const [activeSearchTerm, setActiveSearchTerm] = useState(() => searchRole || initialSearchTerm || localStorage.getItem('applypilot_search_role') || '');
  const [activeSearchLocation, setActiveSearchLocation] = useState(() => storeLocation || localStorage.getItem('applypilot_search_location') || '');

  useEffect(() => {
    if (searchRole !== undefined && searchRole !== searchTerm) {
      setSearchTerm(searchRole);
      setActiveSearchTerm(searchRole);
    }
  }, [searchRole]);

  useEffect(() => {
    if (storeLocation !== undefined && storeLocation !== searchLocation) {
      setSearchLocation(storeLocation);
      setActiveSearchLocation(storeLocation);
    }
  }, [storeLocation]);

  useEffect(() => {
    if (initialSearchTerm && !searchRole) {
      setSearchTerm(initialSearchTerm);
      setActiveSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Smooth auto-sync with 350ms debounce: typing remains instantaneous and responsive without locking feed
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearchTerm(searchTerm);
      if (setSearchParams) {
        setSearchParams(searchTerm, searchLocation);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, searchLocation, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearchLocation(searchLocation);
      if (setSearchParams) {
        setSearchParams(searchTerm, searchLocation);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchLocation, searchTerm, setSearchParams]);

  // Filter dropdown states (streamlined for tech roles and recency-first)
  const [jobTypeFilter, setJobTypeFilter] = useState('All Jobs');
  const [experienceFilter, setExperienceFilter] = useState(user?.preferences?.experienceLevel || 'All Levels');
  const [platformFilter, setPlatformFilter] = useState('All Platforms');
  const [workplaceFilter, setWorkplaceFilter] = useState(user?.preferences?.workplaceType || 'All');
  const [batchFilter, setBatchFilter] = useState('All Batches');
  const [postedFilter, setPostedFilter] = useState('Past 7 Days');
  const [sortBy, setSortBy] = useState('Newest First');
  const [relevanceFilter, setRelevanceFilter] = useState('All Matches');
  const [first50Only, setFirst50Only] = useState(false);
  const [hideGhostJobs, setHideGhostJobs] = useState(false);
  const [batch2028Only, setBatch2028Only] = useState(false);
  const [foreignRemoteOnly, setForeignRemoteOnly] = useState(false);
  const [isLiveScraping, setIsLiveScraping] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [fitResults, setFitResults] = useState({});
  const [isScoringFit, setIsScoringFit] = useState(false);
  const [fitScoringError, setFitScoringError] = useState('');
  const [fitRetry, setFitRetry] = useState(0);
  
  // Persist hasSearched so results never vanish when switching tabs
  const [hasSearched, setHasSearched] = useState(() => {
    return Boolean(
      (discoveredJobs && discoveredJobs.length > 0) ||
      searchRole ||
      storeLocation ||
      localStorage.getItem('applypilot_search_role') ||
      (initialSearchTerm && initialSearchTerm.length > 0)
    );
  });

  useEffect(() => {
    if (discoveredJobs && discoveredJobs.length > 0 && !hasSearched) {
      setHasSearched(true);
    }
  }, [discoveredJobs, hasSearched]);

  // ── Role Search Autocomplete Suggestions ──
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const roleSuggestionsRef = useRef(null);

  const POPULAR_ROLES = useMemo(() => [
    'Software Engineer Intern',
    'Frontend Developer',
    'Backend Engineer',
    'Full Stack Developer',
    'React Developer',
    'Python Developer',
    'Data Analyst Intern',
    'Machine Learning Intern',
    'DevOps Engineer',
    'Mobile App Developer',
    'Product Management Intern',
    'Cybersecurity Analyst',
    'Cloud Engineer',
  ], []);

  const resumeDerivedRoles = useMemo(() => {
    const roles = new Set();
    if (resume?.target_roles && Array.isArray(resume.target_roles)) {
      resume.target_roles.forEach((r) => {
        if (r && typeof r === 'string') roles.add(r.trim());
      });
    }
    if (resume?.experience && Array.isArray(resume.experience)) {
      resume.experience.forEach((e) => {
        if (e.title && typeof e.title === 'string') roles.add(e.title.trim());
        if (e.role && typeof e.role === 'string') roles.add(e.role.trim());
      });
    }
    const skills = [
      ...(resume?.skills?.languages || []),
      ...(resume?.skills?.frameworks || []),
    ];
    if (skills.some((s) => typeof s === 'string' && /react/i.test(s))) roles.add('React Developer');
    if (skills.some((s) => typeof s === 'string' && /python/i.test(s))) roles.add('Python Developer');
    if (skills.some((s) => typeof s === 'string' && /node/i.test(s))) roles.add('Backend Engineer');
    if (skills.some((s) => typeof s === 'string' && /data|sql/i.test(s))) roles.add('Data Analyst');
    return Array.from(roles);
  }, [resume]);

  const filteredRoleSuggestions = useMemo(() => {
    const trimmed = (searchTerm || '').toLowerCase().trim();
    const candidateList = [];

    // First add resume-specific suggestions
    resumeDerivedRoles.forEach((r) => {
      if (!trimmed || r.toLowerCase().includes(trimmed)) {
        candidateList.push({ role: r, source: 'From your resume' });
      }
    });

    // Then add popular suggestions without duplicates
    POPULAR_ROLES.forEach((r) => {
      if (!candidateList.some((item) => item.role.toLowerCase() === r.toLowerCase())) {
        if (!trimmed || r.toLowerCase().includes(trimmed)) {
          candidateList.push({ role: r, source: 'Trending' });
        }
      }
    });

    return candidateList.slice(0, 8);
  }, [searchTerm, resumeDerivedRoles, POPULAR_ROLES]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleSuggestionsRef.current && !roleSuggestionsRef.current.contains(e.target)) {
        setShowRoleSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (jobTypeFilter !== 'All Jobs') count++;
    if (experienceFilter !== 'All Levels') count++;
    if (platformFilter !== 'All Platforms') count++;
    if (workplaceFilter !== 'All') count++;
    if (batchFilter !== 'All Batches') count++;
    if (postedFilter !== 'All Time') count++;
    if (relevanceFilter !== 'All Matches') count++;
    if (sortBy !== 'Fewest Applicants First') count++;
    if (first50Only) count++;
    if (hideGhostJobs) count++;
    if (batch2028Only) count++;
    if (foreignRemoteOnly) count++;
    return count;
  }, [jobTypeFilter, experienceFilter, platformFilter, workplaceFilter, batchFilter, postedFilter, relevanceFilter, sortBy, first50Only, hideGhostJobs, batch2028Only, foreignRemoteOnly]);


  // Drawer state
  const [selectedDrawerJob, setSelectedDrawerJob] = useState(null);

  // Kebab menu state: jobId -> boolean
  const [openKebabId, setOpenKebabId] = useState(null);

  // ═══════════════════════════════════════════════════════════
  // ── BACKGROUND SCRAPER ENGINES & REAL-TIME STREAMING STATE ──
  // ═══════════════════════════════════════════════════════════
  const [isSearching, setIsSearching] = useState(false);
  const [scrapeNotification, setScrapeNotification] = useState(null);
  const [isMonitorActive, setIsMonitorActive] = useState(true);
  const [liveMonitorAlert, setLiveMonitorAlert] = useState(null);
  const [streamingSource, setStreamingSource] = useState(null);
  const [streamStats, setStreamStats] = useState({ linkedin: 0, naukri: 0, total: 0 });
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const newJobIdsRef = useRef(new Set());
  const accumulatedJobsRef = useRef(new Map());
  const searchStreamRef = useRef(null);
  // Rendered card count (progressive rendering — start with 80, load more on scroll)
  const [renderedCount, setRenderedCount] = useState(80);
  const jobsScrollRef = useRef(null);

  // Clean up search SSE stream on component unmount
  useEffect(() => {
    return () => {
      if (searchStreamRef.current) {
        searchStreamRef.current.close();
        searchStreamRef.current = null;
      }
      
    };
  }, []);

  // Infinite scroll: load 40 more cards when nearing bottom
  useEffect(() => {
    const el = jobsScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        setRenderedCount(prev => prev + 40);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // 1. Fetch pre-verified past jobs from SQLite/store in background on mount
  const fetchQueueJobs = async (targetRole, sourceOverride, targetLocation) => {
    try {
      setIsLoadingQueue(true);
      const queryRole = targetRole !== undefined ? targetRole : (searchTerm.trim() || resume?.target_roles?.[0] || '');
      const effectiveSource = sourceOverride !== undefined ? sourceOverride : '';
      const effectiveLocation = targetLocation !== undefined ? targetLocation : searchLocation.trim();
      const params = new URLSearchParams();
      if (queryRole) params.append('query', queryRole);
      if (effectiveSource) params.append('source', effectiveSource);
      if (effectiveLocation && !/^(anywhere|worldwide|global|all)$/i.test(effectiveLocation)) {
        params.append('location', effectiveLocation);
      }
      params.append('limit', '500');
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        const tagged = data.items.map((j) => ({
          ...j,
          isQueue: true,
          isPastScraped: true,
          isLive: false,
        }));
        if (onJobsDiscovered) {
          onJobsDiscovered((prev) => mergeJobsDeduped(prev || [], tagged));
        }
      }
    } catch (err) {
      console.warn('Could not fetch queue jobs in background:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    // Automatically load verified jobs from SQLite store on initial mount so Job Feed is immediately active
    fetchQueueJobs();
    setHasSearched(true);
  }, []);


  // 2. Real-Time Background Monitor SSE Stream listener (/api/monitor/stream)
  useEffect(() => {
    let eventSource = null;
    try {
      eventSource = new EventSource('/api/monitor/stream');
      eventSource.addEventListener('new_jobs', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.jobs && Array.isArray(data.jobs) && data.jobs.length > 0) {
            const freshOnly = data.jobs.filter((j) => getJobMinutesAgo(j) <= 1440);
            if (freshOnly.length === 0) return;
            setLiveMonitorAlert(`Auto-detected ${freshOnly.length} new postings in the background!`);
            if (addToast) {
              addToast({
                title: 'New Postings Auto-Detected',
                message: `Discovered ${freshOnly.length} live postings in background.`,
                type: 'success',
              });
            }
          }
        } catch { }
      });
      eventSource.addEventListener('status', (e) => {
        try {
          const data = JSON.parse(e.data);
          setIsMonitorActive(Boolean(data.isRunning));
        } catch { }
      });
    } catch (e) {
      console.warn('Monitor stream connection issue:', e);
    }
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [addToast]);

  // Real-Time SSE Stream Search across all platforms
  const startStreamSearch = async (overrideLocation, overrideRoles, overrideFilters = {}) => {
    setIsSearching(true);
    setIsLiveScraping(true);
    setStreamStats({ linkedin: 0, total: 0 });
    const locToUse = overrideLocation !== undefined ? overrideLocation : searchLocation.trim();
    const rolesToUse = overrideRoles !== undefined ? overrideRoles : searchTerm.trim();
    const effectiveRoles = resolveSearchRole(rolesToUse, resume?.target_roles?.[0]);
    const effectiveLoc = (!locToUse || /anywhere|global|worldwide/i.test(locToUse)) ? 'Worldwide' : locToUse;

    const effJobType = overrideFilters.jobTypeFilter !== undefined ? overrideFilters.jobTypeFilter : jobTypeFilter;
    const effWorkplace = overrideFilters.workplaceFilter !== undefined ? overrideFilters.workplaceFilter : workplaceFilter;
    const effBatch = overrideFilters.batchFilter !== undefined ? overrideFilters.batchFilter : batchFilter;
    const effPlatform = overrideFilters.platformFilter !== undefined ? overrideFilters.platformFilter : platformFilter;
    const effPosted = overrideFilters.postedFilter !== undefined ? overrideFilters.postedFilter : postedFilter;

    accumulatedJobsRef.current = new Map();
    newJobIdsRef.current = new Set();

    const rolesParam = encodeURIComponent(effectiveRoles);
    const locationParam = encodeURIComponent(effectiveLoc);
    const timeParam = {
      'All Time': 'all',
      'Past 24 Hours': '24h',
      'Past 3 Days': '3d',
      'Past 7 Days': '7d',
      '0 min to 1 Week': '7d',
    }[effPosted] || '7d';
    const isInternSearch = effJobType === 'Internship' || /\b(intern|internship|trainee|co-?op)\b/i.test(effectiveRoles);
    const jobTypeParam = isInternSearch ? 'internship' : (effJobType === 'Full Time' ? 'fulltime' : 'any');
    const remoteParam = effWorkplace === 'Remote' ? 'true' : 'false';
    const workplaceParam = effWorkplace.toLowerCase();
    const batchParam = effBatch !== 'All Batches' ? effBatch.replace(/\D/g, '') : '';
    const platformParam = effPlatform !== 'All Platforms'
      ? effPlatform.toLowerCase()
      : '';

    const url = `/api/jobs/stream-search?roles=${rolesParam}&location=${locationParam}&timeWindow=${timeParam}&jobType=${jobTypeParam}&remoteOnly=${remoteParam}&workplaceType=${workplaceParam}&batchYear=${batchParam}&source=${platformParam}`;

    // Abort any existing search stream before starting a new one
    if (searchStreamRef.current) {
      searchStreamRef.current.close();
      searchStreamRef.current = null;
    }

    try {
      const eventSource = new EventSource(url);
      searchStreamRef.current = eventSource;
      const publishResults = () => {
        const results = Array.from(accumulatedJobsRef.current.values()).sort(compareJobsByApplicantsAndRecency);
        if (onJobsDiscovered) onJobsDiscovered(results);
        return results.length;
      };
      let publishThrottleTimer = null;
      const throttlePublish = () => {
        if (publishThrottleTimer) return;
        publishThrottleTimer = setTimeout(() => {
          publishThrottleTimer = null;
          publishResults();
        }, 250);
      };

      const activeBoards = new Set();
      eventSource.addEventListener('source_start', (e) => {
        try {
          const data = JSON.parse(e.data);
          const label = data.label || data.source;
          if (label) {
            activeBoards.add(label);
            if (activeBoards.size > 1) {
              setStreamingSource(`${activeBoards.size} Boards in parallel (${Array.from(activeBoards).slice(0, 3).join(', ')}...)`);
            } else {
              setStreamingSource(label);
            }
          }
        } catch { }
      });

      eventSource.addEventListener('source_done', (e) => {
        try {
          const data = JSON.parse(e.data);
          const label = data.label || data.source;
          if (label) activeBoards.delete(label);
          if (activeBoards.size > 1) {
            setStreamingSource(`${activeBoards.size} Boards still searching...`);
          } else if (activeBoards.size === 1) {
            setStreamingSource(Array.from(activeBoards)[0]);
          }
        } catch { }
      });

      eventSource.addEventListener('job', (e) => {
        try {
          const data = JSON.parse(e.data);
          const job = data.job;
          if (!job || !job.id) return;
          const isCached = data.source === 'cached_verified' || Boolean(job.cached_verified);
          const taggedJob = {
            ...job,
            isLive: !isCached,
            isQueue: Boolean(isCached || job.isQueue),
            isPastScraped: Boolean(isCached || job.isQueue),
          };
          accumulatedJobsRef.current.set(getJobDedupKey(taggedJob), taggedJob);
          newJobIdsRef.current.add(taggedJob.id);
          const src = (taggedJob.source || '').toLowerCase();
          setStreamStats((prev) => ({
            linkedin: src.includes('linkedin') ? prev.linkedin + 1 : prev.linkedin,
            naukri: src.includes('nauk') ? (prev.naukri || 0) + 1 : (prev.naukri || 0),
            total: prev.total + 1,
          }));
          throttlePublish();
        } catch { }
      });

      eventSource.addEventListener('source_error', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.source === 'linkedin' && data.fallback === 'search_index' && addToast) {
            addToast({ title: 'LinkedIn throttled', message: 'Using search index fallback — results still incoming.', type: 'info', duration: 5000 });
          }
        } catch { }
      });

      eventSource.addEventListener('complete', (e) => {
        if (publishThrottleTimer) {
          clearTimeout(publishThrottleTimer);
          publishThrottleTimer = null;
        }
        setStreamingSource(null);
        setIsSearching(false);
        setIsLiveScraping(false);
        const resultCount = publishResults();
        try {
          const data = JSON.parse(e.data);
          if (addToast) {
            addToast({
              title: 'Live Scrape Search Complete',
              message: `Found ${resultCount || data.totalJobs || 0} postings. Lowest applicant counts appear first.`,
              type: 'success',
            });
          }
        } catch { }
        eventSource.close();
        if (searchStreamRef.current === eventSource) {
          searchStreamRef.current = null;
        }
      });

      eventSource.addEventListener('error', () => {
        if (publishThrottleTimer) {
          clearTimeout(publishThrottleTimer);
          publishThrottleTimer = null;
        }
        setStreamingSource(null);
        setIsSearching(false);
        setIsLiveScraping(false);
        publishResults();
        eventSource.close();
        if (searchStreamRef.current === eventSource) {
          searchStreamRef.current = null;
        }
      });
    } catch (e) {
      console.warn('Stream search initiation error:', e);
      setIsSearching(false);
      setIsLiveScraping(false);
    }
  };

  // Close kebab on outside click
  useEffect(() => {
    const handleOutside = () => setOpenKebabId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const payload = createFitScoringPayload(resume, user, discoveredJobs, {
      location: activeSearchLocation,
      workplace: workplaceFilter,
      jobType: jobTypeFilter,
    });

    setFitResults({});
    setFitScoringError('');
    setIsScoringFit(false);

    if (isLiveScraping || payload.jobs.length === 0) {
      return () => {
        active = false;
        controller.abort();
      };
    }
    if (!token) {
      setFitScoringError('Sign in to calculate personalized match scores.');
      return () => {
        active = false;
        controller.abort();
      };
    }

    const timer = window.setTimeout(async () => {
      setIsScoringFit(true);
      try {
        const response = await fetch('/api/scoring/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.results || typeof data.results !== 'object') {
          throw new Error(data.error || 'Could not calculate match scores.');
        }
        if (active) setFitResults(data.results);
      } catch (error) {
        if (active && error.name !== 'AbortError') {
          setFitScoringError(error.message || 'Could not calculate match scores.');
        }
      } finally {
        if (active) setIsScoringFit(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    resume,
    user,
    token,
    discoveredJobs,
    activeSearchLocation,
    workplaceFilter,
    jobTypeFilter,
    isLiveScraping,
    fitRetry,
  ]);

  // Merge default specification jobs with real database/discovered jobs
  // Memoize raw job mapping so typing in search/location NEVER re-maps raw jobs or re-executes regexes
  const mappedRealJobs = useMemo(() => {
    return (discoveredJobs || []).map((j, idx) => {
      const fitResult = fitResults[j.id || `real-job-${idx}`];
      const score = Number.isFinite(fitResult?.fitScore) ? fitResult.fitScore : null;

      const displayTitle = (j.title || '').trim();
      const eligibleBatches = Array.isArray(j.eligibleBatches)
        ? j.eligibleBatches
        : Array.isArray(j.rawJob?.eligibleBatches)
          ? j.rawJob.eligibleBatches
          : Array.isArray(j.raw?.eligibleBatches)
            ? j.raw.eligibleBatches
            : undefined;
      const identifiedYear = eligibleBatches?.find((year) => /^\d{4}$/.test(String(year))) || null;

      // Filter out spam, bpo and telemarketing while allowing all legitimate tech, creative, product, design, marketing, data and business roles
      const titleLower = displayTitle.toLowerCase();
      const spamPatterns = /\b(telecaller|telesales|bpo|call\s*center|cashier|cook|chef|barista|waiter|delivery\s*(?:boy|partner)|housekeeping|plumber|electrician|security\s*guard)\b/i;
      if (spamPatterns.test(titleLower)) {
        return null;
      }

      // Compute exact relative posting time (0 min to 1 week)
      const mins = getJobMinutesAgo(j);
      const displayPostedAgo = Number.isFinite(mins) ? formatPostingTime(mins) : 'Date unavailable';

      // Actual posted time formatted (Date / Time)
      const rawPostedDate = j.postedAt || j.postedDate;
      let actualPostedTimeFormatted = '';
      if (rawPostedDate) {
        try {
          const d = new Date(rawPostedDate);
          if (!isNaN(d.getTime())) {
            actualPostedTimeFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } catch { }
      }

      const actualSalaryRaw = j.salary ?? (j.salaryMin != null
        ? (j.salaryMax != null ? `${j.salaryMin} – ${j.salaryMax}` : String(j.salaryMin))
        : (j.stipend ?? null));
      const displaySalary = actualSalaryRaw && !/competitive|doe|negotiable|as per market/i.test(String(actualSalaryRaw))
        ? String(actualSalaryRaw)
        : null;

      // Clean display Job ID
      let cleanJobId = j.id ? String(j.id).replace(/^(job-|live-|real-job-)/i, '').trim() : '';
      if (!cleanJobId || cleanJobId.length < 3) {
        cleanJobId = Math.abs(getJobDedupKey(j).split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)).toString(16).substring(0, 8);
      }

      const eligibleBatchText = j.eligibleBatchText && j.eligibleBatchText !== 'All Batches Eligible'
        ? j.eligibleBatchText
        : eligibleBatches?.length
          ? eligibleBatches.includes('All Batches')
            ? 'All Batches Eligible'
            : eligibleBatches.join(', ') + ' Batch'
          : '';

      const tagsList = Array.isArray(j.skills) && j.skills.length > 0
        ? j.skills
        : Array.isArray(j.tags)
          ? j.tags
          : [];
      const rawType = String(j.employmentType || j.rawJob?.employmentType || '').toLowerCase();
      const roleType = rawType === 'internship' || /\b(intern|internship|co-?op|trainee)\b/i.test(displayTitle)
        ? 'Internship'
        : rawType === 'full-time'
          ? 'Full Time'
          : rawType === 'contract'
            ? 'Contract'
            : rawType === 'part-time'
              ? 'Part Time'
              : 'Unspecified';
      const rawWorkplace = j.workplace || j.rawJob?.workplace || j.workMode || j.rawJob?.workMode;
      const descSnippet = String(j.description || j.rawJob?.description || '').slice(0, 3000);
      const workplaceLocText = `${rawWorkplace || ''} ${j.location || ''} ${displayTitle} ${tagsList.join(' ')}`;
      const hasExplicitNoRemote = /\b(not\s*(?:eligible\s*for|open\s*to)?\s*remote|no\s*remote|not\s*a\s*remote\s*(?:role|position|job)|remote\s*(?:work\s*)?is\s*not\s*(?:permitted|allowed|available|offered|eligible|supported)|on[- ]?site\s*only|in[- ]?person\s*only|must\s*be\s*(?:on[- ]?site|in[- ]?person|in[- ]?office|located\s*in\s*our))\b/i.test(`${workplaceLocText} ${descSnippet}`);
      const isHybrid = !hasExplicitNoRemote && Boolean(
        rawWorkplace === 'Hybrid' ||
        j.isHybrid === true ||
        /\bhybrid\b/i.test(workplaceLocText) ||
        /\b(hybrid\s*(?:model|role|schedule|work)|in[- ]office\s*\d+\s*days)\b/i.test(descSnippet)
      );
      const isRemote = !hasExplicitNoRemote && !isHybrid && Boolean(
        rawWorkplace === 'Remote' ||
        ((j.remote === true || j.isRemote === true || j.rawJob?.remote === true) && !hasExplicitNoRemote) ||
        /\b(remote|wfh|work\s*from\s*home|anywhere|worldwide|virtual)\b/i.test(workplaceLocText) ||
        /\b(100%\s*remote|fully\s*remote|strictly\s*remote|remote\s*first|work\s*from\s*anywhere)\b/i.test(descSnippet)
      );
      const workplace = isHybrid ? 'Hybrid' : (isRemote ? 'Remote' : 'Onsite');
      const matchReasons = Array.isArray(j.matchReasons)
        ? j.matchReasons.filter(Boolean)
        : j.matchReason
          ? [String(j.matchReason)]
          : [];
      const unverifiedFilters = Array.isArray(j.unverifiedFilters) ? j.unverifiedFilters : [];

      return {
        id: j.id || `real-job-${idx}`,
        displayId: cleanJobId,
        title: displayTitle,
        company: j.company || 'Company unavailable',
        location: j.location || 'Location unavailable',
        postedAgo: displayPostedAgo,
        postedAt: j.postedAt || j.postedDate,
        actualPostedTimeFormatted,
        tags: tagsList.slice(0, 3),
        extraTagsCount: Math.max(0, tagsList.length - 3),
        roleType,
        salary: displaySalary,
        workplace,
        matchScore: score,
        matchLabel: score == null ? '' : `${score}% Match`,
        fitEvidence: Array.isArray(fitResult?.evidence)
          ? fitResult.evidence.map((item) => typeof item === 'string' ? item : item?.description).filter(Boolean)
          : [],
        fitScoreUnavailableReason: fitResult?.unavailableReason || fitScoringError || null,
        matchReasons,
        matchDesc: matchReasons.join(' · '),
        applyUrl: getSafeJobApplyUrl ? getSafeJobApplyUrl(j) : (j.applyUrl || j.sourceUrl || '#'),
        source: j.source || 'Unknown source',
        logoType: (j.company || '').toLowerCase().replace(/\s+/g, ''),
        rawJob: j,
        identifiedYear,
        eligibleBatches: eligibleBatches || (identifiedYear ? [identifiedYear] : undefined),
        eligibleBatchText,
        indianCitizenEligibility: getIndianCitizenEligibility(j),
        isUserBatchEligible: Boolean(j.isUserBatchEligible),
        is2028Eligible: Boolean(j.is2028Eligible || eligibleBatches?.includes('2028')),
        isForeignRemote: Boolean(j.isForeignRemote || j.foreignRegion),
        foreignRegion: j.foreignRegion || null,
        isActiveIntake: Boolean(j.isActiveIntake),
        employmentType: j.employmentType,
        seniority: j.seniority,
        remote: j.remote,
        salaryCurrency: j.salaryCurrency || j.salary_currency,
        isIntern: roleType === 'Internship',
        unverifiedFilters: [...unverifiedFilters],
        isLive: true,
      };
    }).filter(Boolean);
  }, [discoveredJobs, fitResults, fitScoringError]);

  const allAvailableJobs = useMemo(() => {
    // Return jobs if user has searched OR if we have discoveredJobs from previous scrape / cache
    if (!hasSearched && (!discoveredJobs || discoveredJobs.length === 0)) return [];

    const seenMap = new Map();
    for (const rj of mappedRealJobs) {
      if (!rj) continue;
      const key = `${(rj.company || 'Unknown').toLowerCase()}:${(rj.title || 'Untitled').toLowerCase()}`;
      if (!seenMap.has(key)) {
        seenMap.set(key, rj);
      }
    }

    const combined = Array.from(seenMap.values());
    combined.sort((a, b) => getJobMinutesAgo(a) - getJobMinutesAgo(b));
    return combined;
  }, [hasSearched, mappedRealJobs, discoveredJobs]);

  // Filtered jobs based on all working filter controls
  const filteredJobs = useMemo(() => {
    const list = allAvailableJobs
      .map((job) => ({ ...job, unverifiedFilters: [...(job.unverifiedFilters || [])] }))
      .filter((job) => {
      const markUnverified = (field) => {
        if (!job.unverifiedFilters.includes(field)) job.unverifiedFilters.push(field);
      };
      const matchScoreKnown = Number.isFinite(job.matchScore);
      const postingAge = getJobMinutesAgo(job);
      const locationKnown = Boolean(job.location && job.location !== 'Location unavailable' && !isGenericRemoteLocation(job.location));
      const jobType = classifyJobType(job);
      const seniority = classifySeniority(job);

      // Tab filter
      if (activeTab === 'saved' && !bookmarkedJobIds.has(job.id)) return false;
      if (activeTab === 'applied' && !appliedJobIds.has(job.id)) return false;

      // Hero chips filter
      if (activeHeroChip === 'AI Matched Jobs') {
        if (!isRecommendedJob(job, activeSearchTerm)) return false;
      }
      if (activeHeroChip === 'Top Companies' && !['Google', 'Microsoft', 'Amazon', 'TCS', 'Accenture', 'Meta', 'Apple'].some(c => (job.company || '').toLowerCase().includes(c.toLowerCase()))) return false;
      if (activeHeroChip === 'Remote Friendly') {
        if (job.workplace === 'Unverified') markUnverified('workplace');
        else if (job.workplace !== 'Remote' && job.workplace !== 'Hybrid') return false;
      }
      if (activeHeroChip === 'High Salary') {
        if (!job.salary) markUnverified('salary');
        else if (!/(?:\d+(?:\.\d+)?\s*(?:lpa|lakh|lakhs)|(?:₹|\$|€)\s*\d{2,}|(?:35|40)k)/i.test(job.salary)) return false;
      }
      if (activeHeroChip === 'New Opportunities') {
        if (!Number.isFinite(postingAge)) markUnverified('posted date');
        else if (postingAge > 2880) return false;
      }

      // Search keyword (Semantic Role Taxonomy + Synonyms + Direct Text Match)
      if (activeSearchTerm.trim()) {
        const matchesRole = matchesJobRole(job, activeSearchTerm);
        if (!matchesRole) {
          const sem = semanticMatchJob(job, activeSearchTerm);
          if (!sem.matched) {
            return false;
          }
        }
      }

      // Keep unknown location data visible, but never let it masquerade as a verified match.
      if (!foreignRemoteOnly && activeSearchLocation && activeSearchLocation.trim() &&
        !/^(anywhere|global|worldwide|all|any)$/i.test(activeSearchLocation.trim())) {
        const searchIsRemote = /\b(remote|wfh|work from home|telecommute)\b/i.test(activeSearchLocation);
        const hasSearchLocationEvidence = locationKnown || (searchIsRemote && job.workplace === 'Remote');
        if (!hasSearchLocationEvidence) markUnverified('location');
        else if (!matchesJobLocation(job, activeSearchLocation)) return false;
      }

      const isInternshipMode = jobTypeFilter === 'Internship' ||
        /\b(intern|internship|trainee|co-?op)\b/i.test(activeSearchTerm);
      if (isInternshipMode) {
        if (!jobType) markUnverified('job type');
        else if (jobType !== 'internship') return false;
      }

      if (jobTypeFilter !== 'All Jobs' && !isInternshipMode) {
        const desiredType = jobTypeFilter === 'Full Time' ? 'full-time' : jobTypeFilter.toLowerCase();
        if (!jobType) markUnverified('job type');
        else if (jobType !== desiredType) return false;
      }

      // Batch / Eligible Year filter
      if (batchFilter && batchFilter !== 'All Batches') {
        const yr = String(batchFilter);
        if (!hasBatchEvidence(job)) markUnverified('batch');
        else if (!(job.eligibleBatches || []).includes(yr) &&
          !(job.eligibleBatches || []).includes('All Batches') &&
          !(job.eligibleBatchText || '').includes(yr) &&
          !(job.eligibleBatchText || '').includes('All Batches')) return false;
      }

      // Relevance / Match Score filter
      const minimumMatchScore = {
        '90%+ High Match': 90,
        '80%+ AI Matched': 80,
        '70%+ Good Match': 70,
        '60%+ Potential Match': 60,
      }[relevanceFilter];
      if (minimumMatchScore) {
        if (!matchScoreKnown) markUnverified('match score');
        else if (job.matchScore < minimumMatchScore) return false;
      }

      // Experience Level filter
      const desiredSeniority = experienceFilter === 'Entry Level' || experienceFilter === 'Fresher & Intern' || experienceFilter === 'Entry Level (0-1 yr)'
        ? 'entry'
        : experienceFilter === 'Mid Level' || experienceFilter === 'Junior (1-3 yrs)'
          ? 'mid'
          : experienceFilter === 'Senior Level' || experienceFilter === 'Senior Level (3+ yrs)'
            ? 'senior'
            : null;
      if (desiredSeniority) {
        if (!seniority) markUnverified('seniority');
        else if (seniority !== desiredSeniority) return false;
      }

      // Platform Source filter
      if (platformFilter !== 'All Platforms') {
        const pLower = platformFilter.toLowerCase();
        const jobSource = (job.source || '').toLowerCase();
        const sourcePatterns = {
          linkedin: /linkedin/,
          internshala: /internshala/,
          naukri: /naukri|naukari/,
          greenhouse: /greenhouse/,
          lever: /lever/,
          ashby: /ashby/,
          smartrecruiters: /smartrecruiters/,
          'yc startups': /yc/,
          unstop: /unstop/,
          simplifyjobs: /simplify/,
          remoteok: /remoteok/,
          remotive: /remotive/,
          arbeitnow: /arbeitnow/,
          weworkremotely: /wework/,
          himalayas: /himalaya/,
          jobicy: /jobicy/,
          'working nomads': /working/,
          freehire: /freehire/,
        };
        const sourcePattern = sourcePatterns[pLower];
        if (!jobSource || jobSource === 'unknown source') markUnverified('source');
        else if (sourcePattern && !sourcePattern.test(jobSource)) return false;
      }

      // Workplace filter
      if (workplaceFilter !== 'All') {
        if (job.workplace === 'Unverified') markUnverified('workplace');
        else if (job.workplace !== workplaceFilter) return false;
      }

      // Posted Within filter (Recency-first)
      // When "Most Relevant" is selected, user explicitly specified: "it can be any posted time i dont care"
      // So do not filter out top reputed companies based on 7-day or 24-hr windows
      if (!batch2028Only && !foreignRemoteOnly) {
        const maxAge = postedFilter === '0 min to 1 Week' || postedFilter === 'Past 7 Days'
          ? 10080
          : postedFilter === 'Past 24 Hours'
            ? 1440
            : postedFilter === 'Past 3 Days'
              ? 4320
              : null;
        if (maxAge) {
          if (!Number.isFinite(postingAge)) markUnverified('posted date');
          else if (postingAge > maxAge) return false;
        }
      }

      if (first50Only && !batch2028Only && !foreignRemoteOnly) {
        if (!Number.isFinite(postingAge)) markUnverified('posted date');
        else if (postingAge > 120) return false;
      }
      if (hideGhostJobs) {
        if (!Number.isFinite(postingAge)) markUnverified('posted date');
        else if (postingAge > 43200) return false;
      }

      if (batch2028Only) {
        if (hasBatchEvidence(job)) {
          if (!(job.is2028Eligible || (job.eligibleBatches || []).includes('2028') || (job.eligibleBatches || []).includes('All Batches'))) return false;
        } else {
          markUnverified('batch');
        }
      }

      if (foreignRemoteOnly) {
        const loc = (job.location || '').toLowerCase();
        const hasForeignEvidence = job.isForeignRemote || job.foreignRegion || job.salaryCurrency === 'USD' ||
          /\b(us|usa|united states|europe|uk|london|berlin|germany|france|singapore|canada|toronto)\b/i.test(loc);
        const hasLocalEvidence = /\b(india|bengaluru|bangalore|hyderabad|pune|mumbai|chennai|delhi|gurugram|noida)\b/i.test(loc);
        if (job.workplace === 'Unverified' || (!hasForeignEvidence && !hasLocalEvidence)) {
          markUnverified(job.workplace === 'Unverified' ? 'workplace' : 'location');
        } else if (job.workplace !== 'Remote' || !hasForeignEvidence || hasLocalEvidence) {
          return false;
        }
      }

      return true;
    });

    if (activeTab === 'matched' || activeHeroChip === 'AI Matched Jobs' || sortBy === 'Most Relevant') {
      return sortJobsByFit(list);
    }

    return list.sort((a, b) => compareJobsBySort(a, b, sortBy));
  }, [allAvailableJobs, activeTab, activeHeroChip, activeSearchTerm, activeSearchLocation, jobTypeFilter, experienceFilter, platformFilter, workplaceFilter, batchFilter, postedFilter, relevanceFilter, sortBy, bookmarkedJobIds, appliedJobIds]);

  // Reset rendered count when filters change (so we re-start from top 80)
  useEffect(() => { setRenderedCount(80); }, [filteredJobs.length]);

  // Counts for tabs - computed from actual available jobs
  const tabCounts = useMemo(() => {
    if (!hasSearched && (!discoveredJobs || discoveredJobs.length === 0)) {
      return { total: 0, matched: 0, saved: bookmarkedJobIds.size, applied: appliedJobIds.size };
    }
    const total = allAvailableJobs.length;
    const matched = allAvailableJobs.filter((job) => isRecommendedJob(job, activeSearchTerm)).length;
    const saved = bookmarkedJobIds.size;
    const applied = appliedJobIds.size;
    return { total, matched, saved, applied };
  }, [hasSearched, allAvailableJobs, activeSearchTerm, bookmarkedJobIds, appliedJobIds, discoveredJobs]);

  // Handlers
  const handleApply = (job, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const safeUrl = getSafeJobApplyUrl ? getSafeJobApplyUrl(job.rawJob || job) : (job.applyUrl || '#');
    if (safeUrl && safeUrl !== '#') {
      window.open(safeUrl, '_blank', 'noopener,noreferrer');
    }
    if (addToast) {
      addToast({
        title: safeUrl && safeUrl !== '#' ? 'Employer application opened' : 'Application link unavailable',
        message: safeUrl && safeUrl !== '#' ? 'Apply on the employer site, then update your application status in your tracker.' : 'This listing does not have a verified application URL.',
        type: safeUrl && safeUrl !== '#' ? 'info' : 'error',
      });
    }
  };

  const handleMarkApplied = async (job, e) => {
    e.stopPropagation();
    const raw = job.rawJob || job;
    const applyUrl = getSafeJobApplyUrl(raw);
    if (!applyUrl || applyUrl === '#') {
      addToast?.({ title: 'Application link unavailable', message: 'A verified employer URL is required to track this job.', type: 'error' });
      return;
    }
    try {
      const response = await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId: String(raw.id || job.id), jobTitle: raw.title || job.title, company: raw.company || job.company, applyUrl, status: 'applied' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update application status.');
      markJobApplied?.(job.id);
      addToast?.({ title: 'Application status updated', message: 'Marked as applied based on your confirmation.', type: 'success' });
    } catch (err) {
      addToast?.({ title: 'Could not update status', message: err.message, type: 'error' });
    }
  };

  const handleSave = async (job, e) => {
    e.stopPropagation();
    const raw = job.rawJob || job;
    const applyUrl = getSafeJobApplyUrl(raw);
    try {
      if (bookmarkedJobIds.has(job.id)) {
        const response = await fetch('/api/tracker?status=saved', { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load saved jobs.');
        const record = (data.items || []).find((item) => String(item.jobId) === String(raw.id || job.id));
        if (record) {
          const deletion = await fetch(`/api/tracker/${encodeURIComponent(record.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          if (!deletion.ok) throw new Error('Could not remove saved job.');
        }
      } else {
        if (!applyUrl || applyUrl === '#') throw new Error('A verified employer URL is required to save this job.');
        const response = await fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ jobId: String(raw.id || job.id), jobTitle: raw.title || job.title, company: raw.company || job.company, applyUrl, status: 'saved' }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not save this job.');
      }
      toggleBookmark(job.id);
    } catch (err) {
      addToast?.({ title: 'Saved jobs update failed', message: err.message, type: 'error' });
    }
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSearchLocation('');
    setActiveSearchTerm('');
    setActiveSearchLocation('');
    setJobTypeFilter('All Jobs');
    setExperienceFilter('All Levels');
    setPlatformFilter('All Platforms');
    setWorkplaceFilter('All');
    setBatchFilter('All Batches');
    setPostedFilter('Past 7 Days');
    setSortBy('Newest First');
    setRelevanceFilter('All Matches');
    setFirst50Only(false);
    setHideGhostJobs(false);
    setBatch2028Only(false);
    setForeignRemoteOnly(false);
    setActiveHeroChip(null);
    setActiveTab('all');
  };

  const handleSearchSubmit = (filterOverrides = {}) => {
    setHasSearched(true);
    const effTerm = filterOverrides.searchTerm !== undefined ? filterOverrides.searchTerm : searchTerm;
    const effLoc = filterOverrides.searchLocation !== undefined ? filterOverrides.searchLocation : searchLocation;
    const activeTerm = resolveSearchRole(effTerm, resume?.target_roles?.[0]);
    setActiveSearchTerm(activeTerm);
    setActiveSearchLocation(effLoc);
    if (setSearchParams) {
      setSearchParams(effTerm, effLoc);
    }
    // One cross-source stream produces one complete result batch.
    startStreamSearch(effLoc, effTerm, filterOverrides);
  };

  return (
    <main className="content">
      {/* ===== CENTER ===== */}
      <div>
        {/* HERO */}
        <section className="hero" style={{ padding: '22px 28px', marginBottom: 16 }}>
          <div className="hero-grid">
            <div className="hero-left">
              <h1 className="hero-title" style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>Job &amp; Internship Feed</h1>
              <p className="sub2" style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                Search real-time engineering, product, and tech roles across verified company boards and platforms.
              </p>
            </div>
          </div>
        </section>

        {/* ALL FILTERS */}
        <section className="card filters-container">
          <div className="filters-header-row">
            <div className="filters-title-group">
              <SlidersHorizontal size={15} className="filters-header-icon" />
              <h2>Filter & Search</h2>
              <span className="results-count-badge">
                {!hasSearched ? 'Ready to Search' : `${filteredJobs.length} ${filteredJobs.length === 1 ? 'Job' : 'Jobs'} Found`}
              </span>
            </div>

            <div className="filters-header-actions">
              <button
                type="button"
                className="btn-clear-filters"
                onClick={handleClearAllFilters}
                title="Reset all active filters"
              >
                <RotateCcw size={12} />
                <span>Reset All</span>
              </button>
            </div>
          </div>

          {/* Unified Command Search Bar */}
          <div className="command-bar-wrapper">
            {/* Search Input */}
            <div className="fsearch-wrap" ref={roleSuggestionsRef}>
              <div className="fsearch">
                <Search size={15} className="fsearch-icon" />
                <input
                  value={searchTerm}
                  onFocus={() => setShowRoleSuggestions(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowRoleSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setShowRoleSuggestions(false);
                      setActiveSearchTerm(searchTerm);
                      setHasSearched(true);
                      handleSearchSubmit();
                    } else if (e.key === 'Escape') {
                      setShowRoleSuggestions(false);
                    }
                  }}
                  placeholder="Search role, skills, or tech stack (e.g. SDE Intern, React, Python)..."
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="btn-input-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm('');
                      setActiveSearchTerm('');
                      setShowRoleSuggestions(true);
                    }}
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Automatic Role Suggestions Dropdown */}
              {showRoleSuggestions && filteredRoleSuggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
                    zIndex: 60,
                    overflow: 'hidden',
                    padding: '6px 0',
                  }}
                >
                  <div style={{ padding: '6px 14px 4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Role Suggestions</span>
                    <span style={{ fontSize: '10px', fontWeight: 500, color: '#cbd5e1' }}>Select or type</span>
                  </div>
                  {filteredRoleSuggestions.map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchTerm(item.role);
                        setShowRoleSuggestions(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#1e293b',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Briefcase size={14} style={{ color: item.source === 'From your resume' ? '#10b981' : '#64748b' }} />
                        <span>{item.role}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: item.source === 'From your resume' ? '#ecfdf5' : '#f1f5f9',
                          color: item.source === 'From your resume' ? '#059669' : '#64748b',
                        }}
                      >
                        {item.source}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="command-divider" />

            {/* Location Input */}
            <div className="flocation-wrap">
              <div className="flocation">
                <MapPin size={15} className="flocation-icon" />
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setActiveSearchLocation(searchLocation);
                      handleSearchSubmit();
                    }
                  }}
                  placeholder="Location or Hub (e.g. India, Remote, Bengaluru)..."
                />
                {searchLocation && (
                  <button
                    type="button"
                    className="btn-input-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchLocation('');
                      setActiveSearchLocation('');
                    }}
                    title="Clear location"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="command-actions">
              <button
                type="button"
                className="btn-search"
                onClick={handleSearchSubmit}
                disabled={isLiveScraping || isSearching}
                title="Search job boards using all selected filters"
              >
                <Search size={14} />
                <span>{isLiveScraping || isSearching ? 'Searching...' : 'Search'}</span>
              </button>
            </div>
          </div>

          {/* Mobile Fast Filter Chips (Naukri Style) */}
          <div className="mobile-naukri-chips-bar">
            <button
              type="button"
              className={`mn-chip ${jobTypeFilter === 'Internship' ? 'active' : ''}`}
              onClick={() => {
                const next = jobTypeFilter === 'Internship' ? 'All Jobs' : 'Internship';
                setJobTypeFilter(next);
              }}
            >
              🎓 Internships
            </button>

            <button
              type="button"
              className={`mn-chip ${first50Only ? 'active' : ''}`}
              onClick={() => setFirst50Only(prev => !prev)}
            >
              ⚡ First 50 (&lt;2h)
            </button>

            <button
              type="button"
              className={`mn-chip ${batch2028Only ? 'active' : ''}`}
              onClick={() => setBatch2028Only(prev => !prev)}
            >
              📅 2028 Batch
            </button>

            <button
              type="button"
              className={`mn-chip ${foreignRemoteOnly ? 'active' : ''}`}
              onClick={() => setForeignRemoteOnly(prev => !prev)}
            >
              🌐 Global Remote
            </button>

            <button
              type="button"
              className={`mn-chip ${hideGhostJobs ? 'active' : ''}`}
              onClick={() => setHideGhostJobs(prev => !prev)}
            >
              👻 Hide Ghost
            </button>

            <button
              type="button"
              className={`mn-chip ${activeHeroChip === 'Top Companies' ? 'active' : ''}`}
              onClick={() => setActiveHeroChip(activeHeroChip === 'Top Companies' ? null : 'Top Companies')}
            >
              ⭐ Top Companies
            </button>
          </div>

          {/* Mobile Filter Toggle Accordion Button */}
          <div className="mobile-filter-toggle-row">
            <button
              type="button"
              className={`btn-mobile-filter-toggle ${showMobileFilters ? 'active' : ''}`}
              onClick={() => setShowMobileFilters(prev => !prev)}
            >
              <SlidersHorizontal size={13} />
              <span>{showMobileFilters ? 'Hide Advanced Filters' : 'More Filters (Experience, Batch, Platform)'}</span>
              {activeFiltersCount > 0 && (
                <span className="mobile-filter-count-badge">{activeFiltersCount}</span>
              )}
              <ChevronDown size={14} className={`mobile-toggle-caret ${showMobileFilters ? 'open' : ''}`} />
            </button>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                className="btn-mobile-clear-filters"
                onClick={handleClearAllFilters}
                title="Reset all filters"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Unified Streamlined Filter Ribbon Grid */}
          <div className={`f-grid ${showMobileFilters ? 'mobile-expanded' : 'mobile-collapsed'}`}>
            {/* 1. Job Type */}
            <div className="fdrop">
              <Briefcase size={14} className="fdrop-icon" />
              <div className="fdrop-text">
                <span className="lbl">Job Type</span>
                <span className="val">{jobTypeFilter}</span>
              </div>
              <ChevronDown size={12} className="caret" />
              <select
                value={jobTypeFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setJobTypeFilter(val);
                }}
              >
                <option value="All Jobs">All Jobs</option>
                <option value="Full Time">Full Time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            {/* 2. Experience Level */}
            <div className="fdrop">
              <User size={14} className="fdrop-icon" />
              <div className="fdrop-text">
                <span className="lbl">Experience</span>
                <span className="val">{experienceFilter}</span>
              </div>
              <ChevronDown size={12} className="caret" />
              <select
                value={experienceFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setExperienceFilter(val);
                }}
              >
                <option value="All Levels">All Levels</option>
                <option value="Entry Level">Entry Level</option>
                <option value="Mid Level">Mid Level</option>
                <option value="Senior Level">Senior Level</option>
              </select>
            </div>

            {/* 3. Platform */}
            <div className="fdrop">
              <Globe size={14} className="fdrop-icon" />
              <div className="fdrop-text">
                <span className="lbl">Platform</span>
                <span className="val">{platformFilter}</span>
              </div>
              <ChevronDown size={12} className="caret" />
              <select
                value={platformFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setPlatformFilter(val);
                }}
              >
                <option value="All Platforms">All Platforms</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Internshala">Internshala</option>
                <option value="Unstop">Unstop</option>
                <option value="SimplifyJobs">SimplifyJobs</option>
                <option value="Greenhouse">Greenhouse</option>
                <option value="Lever">Lever</option>
                <option value="Ashby">Ashby</option>
                <option value="SmartRecruiters">SmartRecruiters</option>
                <option value="YC Startups">YC Startups</option>
                <option value="RemoteOK">RemoteOK</option>
                <option value="Remotive">Remotive</option>
                <option value="Arbeitnow">Arbeitnow</option>
                <option value="WeWorkRemotely">WeWorkRemotely</option>
                <option value="Himalayas">Himalayas</option>
                <option value="Jobicy">Jobicy</option>
                <option value="Working Nomads">Working Nomads</option>
                <option value="FreeHire">FreeHire</option>
                <option value="Naukri">Naukri</option>
              </select>
            </div>

            {/* 4. Remote / Onsite */}
            <div className="fdrop">
              <MapPin size={14} className="fdrop-icon" />
              <div className="fdrop-text">
                <span className="lbl">Workplace</span>
                <span className="val">{workplaceFilter}</span>
              </div>
              <ChevronDown size={12} className="caret" />
              <select
                value={workplaceFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setWorkplaceFilter(val);
                }}
              >
                <option value="All">All</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">Onsite</option>
              </select>
            </div>

            {/* 5. Batch */}
            <div className="fdrop">
              <Calendar size={14} className="fdrop-icon" />
              <div className="fdrop-text">
                <span className="lbl">Batch</span>
                <span className="val">{batchFilter}</span>
              </div>
              <ChevronDown size={12} className="caret" />
              <select
                value={batchFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setBatchFilter(val);
                }}
              >
                <option value="All Batches">All Batches</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028 (Your Batch)</option>
              </select>
            </div>

            {/* 6. Posted Within */}
            <div className="fdrop">
              <Clock size={14} className="fdrop-icon" />
              <div className="fdrop-text">
                <span className="lbl">Posted Within</span>
                <span className="val">{postedFilter}</span>
              </div>
              <ChevronDown size={12} className="caret" />
              <select value={postedFilter} onChange={(e) => setPostedFilter(e.target.value)}>
                <option value="0 min to 1 Week">0 min to 1 Week</option>
                <option value="Past 24 Hours">Past 24 Hours</option>
                <option value="Past 3 Days">Past 3 Days</option>
                <option value="Past 7 Days">Past 7 Days</option>
                <option value="All Time">All Time</option>
              </select>
            </div>

            {/* 7. Relevance */}
            <div className="fdrop">
              <SlidersHorizontal size={14} className="fdrop-icon" />
              <div className="fdrop-text">
                <span className="lbl">Relevance</span>
                <span className="val">{relevanceFilter}</span>
              </div>
              <ChevronDown size={12} className="caret" />
              <select value={relevanceFilter} onChange={(e) => setRelevanceFilter(e.target.value)}>
                <option value="All Matches">All Matches</option>
                <option value="90%+ High Match">90%+ High Match</option>
                <option value="80%+ AI Matched">80%+ AI Matched</option>
                <option value="70%+ Good Match">70%+ Good Match</option>
                <option value="60%+ Potential Match">60%+ Potential Match</option>
              </select>
            </div>

            {/* 8. Sort By */}
            <div className="fdrop">
              <ArrowUpDown size={14} className="fdrop-icon" />
              <div className="fdrop-text">
                <span className="lbl">Sort By</span>
                <span className="val">{sortBy}</span>
              </div>
              <ChevronDown size={12} className="caret" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="Fewest Applicants First">Fewest Applicants First</option>
                <option value="Newest First">Newest First</option>
                <option value="Most Relevant">Most Relevant</option>
                <option value="Highest Match">Highest Match</option>
                <option value="A to Z (Job Title)">A to Z (Title)</option>
                <option value="A to Z (Company)">A to Z (Company)</option>
                <option value="Z to A">Z to A</option>
                <option value="Eligible Batch">Eligible Batch</option>
              </select>
            </div>
          </div>

          <div className={`filters-subbar ${showMobileFilters ? 'mobile-expanded' : 'mobile-collapsed'}`}>
            <div className="filters-status-summary">
              <span className="summary-dot" />
              <span>Hydrated with verified live openings from Supabase Cloud</span>
            </div>
          </div>
        </section>

        {/* TABS ROW */}
        <div className="tabs-row">
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="7" width="18" height="14" rx="3" />
              <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </svg>
            All Jobs
            <span className="cnt">{tabCounts.total}</span>
          </button>

          <button
            className={`tab ${activeTab === 'matched' ? 'active' : ''}`}
            onClick={() => setActiveTab('matched')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M12 3l1.8 3.8L18 8.6l-3 2.9.7 4.2L12 13.7l-3.7 2 .7-4.2-3-2.9 4.2-1.8z" />
            </svg>
            Recommended
            <span className="cnt c-green">{tabCounts.matched}</span>
          </button>

          <button
            className={`tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 2.5c0 4-4 7.5-9 11.5z" />
            </svg>
            Saved
            <span className="cnt c-pink">{tabCounts.saved}</span>
          </button>

          <button
            className={`tab ${activeTab === 'applied' ? 'active' : ''}`}
            onClick={() => setActiveTab('applied')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 3 10 14" />
              <path d="M21 3 14 21l-4-7-7-4z" />
            </svg>
            Applied
            <span className="cnt c-blue">{tabCounts.applied}</span>
          </button>

          <button
            className="tab"
            style={{ marginLeft: 6, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}
            onClick={() => setClientScreen('past_scraped')}
            title="Browse past jobs captured in backend SQLite database"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            Past Scraped
            <span className="cnt" style={{ background: '#e0e7ff', color: '#4338ca' }}>DB</span>
          </button>

          <div className="tabs-right">
            <div className="seg">
              <button
                className={viewLayout === 'list' ? 'on' : ''}
                onClick={() => setViewLayout('list')}
                title="List View"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="8" height="8" rx="1.5" />
                  <rect x="13" y="3" width="8" height="8" rx="1.5" />
                  <rect x="3" y="13" width="8" height="8" rx="1.5" />
                  <rect x="13" y="13" width="8" height="8" rx="1.5" />
                </svg>
              </button>
              <button
                className={viewLayout === 'grid' ? 'on' : ''}
                onClick={() => setViewLayout('grid')}
                title="Grid View"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            <span>Showing {filteredJobs.length} jobs</span>

          </div>
        </div>

        {/* Real-time Live Scraping Active Notification Banner */}
        {(isSearching || isLiveScraping) && (
          <div className="live-scraping-active-banner">
            <div className="live-scraping-header">
              <div className="live-pulse-container">
                <span className="live-pulse-dot"></span>
                <span className="live-pulse-ring"></span>
              </div>
              <div className="live-scraping-info">
                <h4>⚡ Live Scraping Active: "{searchTerm || 'All Tech Roles'}" {searchLocation ? `in "${searchLocation}"` : ''}</h4>
                <p>
                  Searching all posting dates across {platformFilter !== 'All Platforms' ? platformFilter : 'LinkedIn, Internshala, Unstop, Naukri & ATS boards'} matching your filters...
                </p>
              </div>
            </div>
            <div className="live-scraping-tags">
              <span className="live-tag">🎯 Role: {searchTerm || 'All Tech'}</span>
              <span className="live-tag">📍 Location: {searchLocation || 'Worldwide'}</span>
              <span className="live-tag">💼 Type: {jobTypeFilter}</span>
              <span className="live-tag">🏢 Workplace: {workplaceFilter}</span>
              <span className="live-tag">🎓 Batch: {batchFilter}</span>
              {streamingSource && <span className="live-tag live-source-tag">📡 Scraping: {streamingSource}</span>}
              <span className="live-tag live-count-tag">Discovered so far: {streamStats.total}</span>
            </div>
          </div>
        )}

        {isScoringFit && (
          <div role="status" className="fit-scoring-status">
            Calculating personalized match scores from your resume and profile…
          </div>
        )}
        {fitScoringError && (
          <div role="alert" className="fit-scoring-status fit-scoring-error">
            <span>{fitScoringError}</span>
            <button type="button" onClick={() => setFitRetry((retry) => retry + 1)}>
              Retry scoring
            </button>
          </div>
        )}

        {/* DEDICATED ISOLATED JOBS SCROLL CONTAINER */}
        <div className="jobs-scroll-wrapper" id="jobs-scroll-viewport" ref={jobsScrollRef}>
          <div className={`jobs ${viewLayout === 'grid' ? 'grid-layout' : ''}`}>
            {!hasSearched && (!discoveredJobs || discoveredJobs.length === 0) ? (
              <div className="card empty-search-hero-card" style={{ padding: '48px 24px', textAlign: 'center', background: '#ffffff', borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #ffede6 0%, #fee2e2 100%)', color: '#ff6b35', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26, boxShadow: '0 4px 14px rgba(255, 107, 53, 0.2)' }}>
                  🚀
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                  Search &amp; Discover Live Opportunities
                </div>
                <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 8, maxWidth: 500, margin: '8px auto 0', lineHeight: 1.6 }}>
                  Enter your target role or skills above, choose your preferred location and filters, then tap <b>Search</b> to fetch live verified postings across job boards.
                </p>

                <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 620, margin: '22px auto 0' }}>
                  <span style={{ width: '100%', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 2 }}>Quick Search Suggestions:</span>
                  {[
                    { role: 'Software Engineer Intern', loc: 'India' },
                    { role: 'Frontend Developer', loc: 'Remote' },
                    { role: 'Data Analyst', loc: 'Bengaluru' },
                    { role: 'Product Manager', loc: 'India' },
                    { role: 'Python Developer', loc: 'Remote' },
                  ].map((item) => (
                    <button
                      key={item.role + item.loc}
                      type="button"
                      onClick={() => {
                        setSearchTerm(item.role);
                        setSearchLocation(item.loc);
                      }}
                      style={{
                        padding: '7px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '999px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#334155',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      🔍 {item.role} • {item.loc}
                    </button>
                  ))}
                </div>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="card" style={{ padding: '44px 24px', textAlign: 'center', background: '#ffffff', borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 24 }}>
                  🔍
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>No jobs found matching active criteria</div>
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 6, maxWidth: 520, margin: '6px auto 0', lineHeight: 1.5 }}>
                  {batch2028Only && foreignRemoteOnly
                    ? 'No jobs match both 2028 Batch and Foreign Remote simultaneously with your current location/recency criteria.'
                    : 'Your active search term, location, or recency filter narrowed down all available postings.'}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 18 }}>
                  {batch2028Only && (
                    <button
                      className="apl"
                      style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 12, background: '#7c3aed', color: '#fff', cursor: 'pointer' }}
                      onClick={() => {
                        setForeignRemoteOnly(false);
                        setFirst50Only(false);
                        setSearchLocation('');
                        setPostedFilter('All Time');
                        setActiveTab('all');
                      }}
                    >
                      🎓 Show All 2028 Internships ({allAvailableJobs.filter(j => j.is2028Eligible || (j.eligibleBatches || []).includes('2028') || (j.eligibleBatches || []).includes('All Batches')).length})
                    </button>
                  )}
                  {foreignRemoteOnly && (
                    <button
                      className="apl"
                      style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 12, background: '#2563eb', color: '#fff', cursor: 'pointer' }}
                      onClick={() => {
                        setBatch2028Only(false);
                        setFirst50Only(false);
                        setSearchLocation('');
                        setPostedFilter('All Time');
                        setActiveTab('all');
                      }}
                    >
                      🌍 Show All Foreign Remote ({allAvailableJobs.filter(j => j.isForeignRemote || j.foreignRegion || j.workplace === 'Remote' || j.salaryCurrency === 'USD').length})
                    </button>
                  )}
                  <button
                    className="apl"
                    style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 12, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    onClick={handleClearAllFilters}
                  >
                    ↺ Reset All Filters
                  </button>
                </div>
              </div>
            ) : (
              filteredJobs.slice(0, renderedCount).map((job) => {
                const isSaved = isBookmarked(job.id);
                const isApplied = appliedJobIds.has(job.id);
                const jobMins = getJobMinutesAgo(job);
                const timeBadgeClass = !Number.isFinite(jobMins) ? 'standard' : jobMins <= 60 ? 'fresh' : jobMins <= 1440 ? 'recent' : 'standard';
                const semanticMatch = activeSearchTerm.trim() ? semanticMatchJob(job, activeSearchTerm) : null;
                const matchReasons = job.matchReasons.length
                  ? job.matchReasons
                  : semanticMatch?.matched
                    ? [`Role match: ${semanticMatch.badge || 'matched title or skills'}`]
                    : [];

                return (
                  <article
                    key={job.id}
                    className="job cursor-pointer"
                    onClick={() => {
                      const detailJob = { ...(job.rawJob || {}), ...job };
                      if (onSelectJobForDetail) {
                        onSelectJobForDetail(detailJob);
                      } else {
                        setSelectedDrawerJob(detailJob);
                      }
                    }}
                  >
                    <div className="jleft-body">
                      {/* Logo */}
                      <CompanyLogo type={job.logoType} company={job.company} logoUrl={job.rawJob?.companyLogo || job.companyLogo} />

                      {/* Job Details */}
                      <div className="jt">
                        <div className="jtitle-row">
                          <h4>{job.title}</h4>
                          {job.matchScore != null && (
                            <span
                              className="fit-score-badge"
                              title={job.fitEvidence.length ? `Based on ${job.fitEvidence.join(', ')}` : 'Personalized resume and profile match'}
                            >
                              {job.matchScore}% match
                            </span>
                          )}
                          <span className={`jtime-badge ${timeBadgeClass}`} title={job.actualPostedTimeFormatted ? `Posted ${job.actualPostedTimeFormatted}` : job.postedAgo}>
                            <span className="time-dot"></span>
                            {job.postedAgo}
                          </span>
                        </div>
                        <div className="meta1">
                          <b>{job.company}</b>
                          <span>{job.location}</span>
                          {job.actualPostedTimeFormatted && <span className="meta-time">Posted {job.actualPostedTimeFormatted}</span>}
                        </div>

                        {job.unverifiedFilters.length > 0 && (
                          <div className="jbatch-row">
                            <span className="source-tag">Unverified: {job.unverifiedFilters.join(', ')}</span>
                          </div>
                        )}

                        <div className="jmeta2">
                          {job.roleType !== 'Unspecified' && <span>{job.roleType}</span>}
                          {job.salary && <span className="salary-highlight">{job.roleType === 'Internship' ? 'Stipend: ' : 'Salary: '}{job.salary}</span>}
                          <span className="workplace-pill">Work mode: {job.workplace}</span>
                          {job.source && (
                            <span className="source-tag">Source: {job.source}</span>
                          )}
                          {job.indianCitizenEligibility && (
                            <span
                              className={`citizen-badge ${job.indianCitizenEligibility.badgeClass || (job.indianCitizenEligibility.allowed ? 'citizen-allowed' : 'citizen-restricted')}`}
                              title={job.indianCitizenEligibility.reason}
                            >
                              {job.indianCitizenEligibility.badgeText}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="jright">
                      <div className="match-title">Match reasons</div>
                      {matchReasons.length > 0
                        ? <div className="mdesc">{matchReasons.join(' · ')}</div>
                        : <div className="mdesc">No match details provided by the source.</div>}
                    </div>

                    {/* Actions Column */}
                    <div className="jactions-col">
                      <div className="kebab-wrap" style={{ position: 'relative' }}>
                        <button
                          className="kebab"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenKebabId(openKebabId === job.id ? null : job.id);
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="1.7" />
                            <circle cx="12" cy="12" r="1.7" />
                            <circle cx="12" cy="19" r="1.7" />
                          </svg>
                        </button>

                        {openKebabId === job.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 24,
                              background: '#fff',
                              border: '1px solid var(--line)',
                              borderRadius: 10,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                              zIndex: 20,
                              minWidth: 160,
                              padding: '6px 0',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--ink)' }}
                              onClick={() => {
                                setOpenKebabId(null);
                                if (onSelectJobForDetail) onSelectJobForDetail(job.rawJob || job);
                              }}
                            >
                              View Job Details
                            </div>
                            <div
                              style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--ink)' }}
                              onClick={() => {
                                setOpenKebabId(null);
                                setTailorModalJob(job.rawJob || job);
                              }}
                            >
                              Tailor Resume for Role
                            </div>
                            <div
                              style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer', color: '#db2777' }}
                              onClick={(e) => {
                                setOpenKebabId(null);
                                handleSave(job, e);
                              }}
                            >
                              {isSaved ? 'Remove from Saved' : 'Save this Job'}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="jactions-buttons-group">
                        <button
                          className="btn-tailor-job"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTailorModalJob(job.rawJob || job);
                          }}
                          title="Tailor resume to match every single keyword for this role"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3l1.8 3.8L18 8.6l-3 2.9.7 4.2L12 13.7l-3.7 2 .7-4.2-3-2.9 4.2-1.8z" />
                          </svg>
                          <span>Tailor</span>
                        </button>

                        <button
                          className={`save ${isSaved ? 'saved' : ''}`}
                          onClick={(e) => handleSave(job, e)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill={isSaved ? '#db2777' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 2.5c0 4-4 7.5-9 11.5z" />
                          </svg>
                          {isSaved ? 'Saved' : 'Save'}
                        </button>

                        <a
                          href={job.applyUrl && job.applyUrl !== '#' ? job.applyUrl : getSafeJobApplyUrl(job.rawJob || job)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="apl"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (addToast) {
                              addToast({
                                title: 'Employer application opened',
                                message: 'Opening the employer site does not mark this job as applied. Update the status after submitting.',
                                type: 'info',
                              });
                            }
                          }}
                        >
                          Open application
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12h15M13 6l6 6-6 6" />
                          </svg>
                        </a>
                        {!isApplied && <button type="button" className="save" onClick={(e) => handleMarkApplied(job, e)}>Mark applied</button>}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>

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
          isBookmarked={selectedDrawerJob ? isBookmarked(selectedDrawerJob.id) : false}
          onToggleBookmark={(id) => toggleBookmark(id)}
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
            else if (onProceedToScoring) onProceedToScoring();
          }}
          onAddToast={addToast}
        />
      )}
    </main>
  );
}

export default DiscoveryStep;

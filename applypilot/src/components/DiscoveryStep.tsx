import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  MapPin,
  ExternalLink,
  RotateCw,
  Briefcase,
  Globe,
  Zap,
  ArrowRight,
  Clock,
  Users,
  GraduationCap,
  SlidersHorizontal,
  Flame,
  PlusCircle,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Building2,
  ChevronDown,
  Sparkle,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

import { JobPosting, ParsedResume, JobSource } from '../types';
import { getSafeJobApplyUrl } from '../utils/jobUtils';
import { JobDetailDrawer } from './JobDetailDrawer';
import { CompanyIcon } from './CompanyIcon';
import { useAppStore } from '../store/appStore';

interface DiscoveryStepProps {
  resume: ParsedResume;
  discoveredJobs: JobPosting[];
  onJobsDiscovered: (jobs: JobPosting[]) => void;
  onProceedToScoring: () => void;
  onSelectJobForDetail?: (job: JobPosting) => void;
  onSelectJobForTailoring?: (job: JobPosting) => void;
}

import {
  ALL_DOMAINS,
  DomainDefinition,
  detectDomainFromQuery,
  SOFTWARE_ENGINEER_INTERN_ROLES,
  SOFTWARE_ENGINEER_FULLTIME_ROLES,
} from '../../shared/domains';

const POPULAR_TECH_ROLES = [
  'Software Engineer Intern',
  'Software Engineer',
  'Full Stack Developer Intern',
  'Full Stack Developer',
  'React Developer Intern',
  'Frontend Developer',
  'Backend Developer',
  'Node.js Developer Intern',
  'Systems Engineer Intern',
  'Web Developer Intern',
];

export const DiscoveryStep: React.FC<DiscoveryStepProps> = ({
  resume,
  discoveredJobs,
  onJobsDiscovered,
  onProceedToScoring,
  onSelectJobForDetail,
  onSelectJobForTailoring,
}) => {
  const { bookmarkedJobIds, toggleBookmark, isBookmarked, addToast, setSelectedJob, setClientScreen } =
    useAppStore();

  const [isSearching, setIsSearching] = useState(false);
  const [isScrapingLinkedIn, setIsScrapingLinkedIn] = useState(false);
  const [isScrapingNaukri, setIsScrapingNaukri] = useState(false);
  const [scrapeNotification, setScrapeNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Background monitor state
  const [isMonitorActive, setIsMonitorActive] = useState(true);
  const [liveMonitorAlert, setLiveMonitorAlert] = useState<string | null>(null);

  // Job Detail Slide-Over Drawer State
  const [selectedDrawerJob, setSelectedDrawerJob] = useState<JobPosting | null>(null);

  // 90s Live Auto-Refresh State
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  // Real-time stream state
  const [streamingSource, setStreamingSource] = useState<string | null>(null);
  const [streamStats, setStreamStats] = useState<{
    linkedin: number;
    naukari: number;
    total: number;
  }>({ linkedin: 0, naukari: 0, total: 0 });
  const newJobIdsRef = useRef<Set<string>>(new Set());
  const accumulatedJobsRef = useRef<Map<string, JobPosting>>(new Map());

  // Search inputs
  const [searchRoles, setSearchRoles] = useState(
    resume.target_roles?.[0] || 'Software Engineer Intern'
  );
  const [searchLocation, setSearchLocation] = useState(
    resume.contact?.location || 'India'
  );
  const [jobType, setJobType] = useState<string>('internship');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [batchYear, setBatchYear] = useState<string>('any');
  const [seniorityLevel, setSeniorityLevel] = useState<string>('any');
  const [activeRoleSubFilter, setActiveRoleSubFilter] = useState<string>('all');
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');

  // Role suggestions dropdown state
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleInputRef = useRef<HTMLDivElement>(null);

  // Custom Job Link / Description Scraper State
  const [showCustomScraper, setShowCustomScraper] = useState(false);
  const [customJobUrl, setCustomJobUrl] = useState('');
  const [customJobRawText, setCustomJobRawText] = useState('');
  const [isScrapingCustom, setIsScrapingCustom] = useState(false);
  const [scraperSuccessMsg, setScraperSuccessMsg] = useState<string | null>(null);
  const [scraperErrorMsg, setScraperErrorMsg] = useState<string | null>(null);

  // Smart Freshness & Workplace Filtering
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '3d' | '7d'>('all');
  const [workplaceFilter, setWorkplaceFilter] = useState<'all' | 'remote' | 'hybrid' | 'onsite'>('all');
  const [lowApplicantsOnly, setLowApplicantsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'low_applicants' | 'batch_2028' | 'company'>('newest');

  // Close role dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleInputRef.current && !roleInputRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to extract minutes ago from job object
  const getJobMinutesAgo = (job: JobPosting): number => {
    const rawDate = job.postedDate || (job as any).postedAt;
    if (rawDate) {
      const timeMs = new Date(rawDate).getTime();
      if (!isNaN(timeMs)) {
        return Math.max(0, Math.floor((Date.now() - timeMs) / 60000));
      }
    }
    const rel = (job.postedRelative || '').toLowerCase();
    if (rel.includes('just now') || rel.includes('second') || rel.includes('sec')) return 0;
    const minMatch = rel.match(/(\d+)\s*(?:m|min)(?!o)/);
    if (minMatch) return parseInt(minMatch[1], 10);
    const hrMatch = rel.match(/(\d+)\s*h/);
    if (hrMatch) return parseInt(hrMatch[1], 10) * 60;
    if (rel.includes('today')) return 120;
    const dayMatch = rel.match(/(\d+)\s*d/);
    if (dayMatch) return parseInt(dayMatch[1], 10) * 1440;
    return 2880;
  };

  const getJobDedupKey = (job: Partial<JobPosting> & { url?: string }): string => {
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

  const mergeJobsDeduped = (existing: JobPosting[], incoming: JobPosting[]): JobPosting[] => {
    const map = new Map<string, JobPosting>();
    for (const j of existing) {
      map.set(getJobDedupKey(j), j);
    }
    for (const j of incoming) {
      map.set(getJobDedupKey(j), j);
    }
    const merged = Array.from(map.values());
    merged.sort((a, b) => getJobMinutesAgo(a) - getJobMinutesAgo(b));
    return merged;
  };

  // 1. Real-Time Background Monitor SSE Stream listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/monitor/stream');

      eventSource.addEventListener('new_jobs', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.jobs && Array.isArray(data.jobs) && data.jobs.length > 0) {
            const freshOnly = data.jobs.filter((j: any) => getJobMinutesAgo(j) <= 1440);
            if (freshOnly.length === 0) return;
            setLiveMonitorAlert(
              `Auto-detected ${freshOnly.length} new postings in the background!`
            );
            setTimeout(() => setLiveMonitorAlert(null), 5000);
            onJobsDiscovered(mergeJobsDeduped(discoveredJobs, freshOnly));
          }
        } catch {}
      });

      eventSource.addEventListener('status', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          setIsMonitorActive(Boolean(data.isRunning));
        } catch {}
      });
    } catch (e) {
      console.warn('Monitor stream connection issue:', e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [discoveredJobs, onJobsDiscovered]);

  // 2. Direct Real-Time LinkedIn Scraper
  const handleScrapeLinkedInLive = async () => {
    setIsScrapingLinkedIn(true);
    setScrapeNotification(null);
    const internOnly = jobType === 'internship' || jobType === 'any';
    const query =
      searchRoles.trim() || resume.target_roles?.join(', ') || 'Software Engineer Intern';
    const rawLoc = searchLocation.trim();
    const loc = (!rawLoc || /anywhere|global|worldwide/i.test(rawLoc)) ? 'Worldwide' : rawLoc;

    try {
      const res = await fetch('/api/jobs/scrape-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location: loc,
          internshipsOnly: internOnly,
          jobType,
          timeWindow: '24h',
          limit: 35,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.jobs)) {
        const scraped: JobPosting[] = data.jobs;
        const fresh = scraped.filter((j) => getJobMinutesAgo(j) <= 1440);
        onJobsDiscovered(mergeJobsDeduped(discoveredJobs, fresh));

        setScrapeNotification({
          type: 'success',
          message: `Scraped ${fresh.length} real-time LinkedIn postings in "${loc}".`,
        });
      } else {
        throw new Error(data.error || 'Failed to fetch live LinkedIn postings');
      }
    } catch (err: any) {
      setScrapeNotification({
        type: 'error',
        message: err.message || 'Error connecting to LinkedIn real-time scraper.',
      });
    } finally {
      setIsScrapingLinkedIn(false);
    }
  };

  // 3. Direct Real-Time Naukri Scraper
  const handleScrapeNaukriLive = async () => {
    setIsScrapingNaukri(true);
    setScrapeNotification(null);
    const query =
      searchRoles.trim() || resume.target_roles?.join(', ') || 'Software Engineer Intern';
    const rawLoc = searchLocation.trim();
    const loc = (!rawLoc || /anywhere|global|worldwide/i.test(rawLoc)) ? 'Worldwide' : rawLoc;

    try {
      const res = await fetch('/api/jobs/scrape-naukri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location: loc,
          jobType,
          limit: 25,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.jobs)) {
        const scraped: JobPosting[] = data.jobs;
        const fresh = scraped.filter((j) => getJobMinutesAgo(j) <= 1440);
        onJobsDiscovered(mergeJobsDeduped(discoveredJobs, fresh));

        setScrapeNotification({
          type: 'success',
          message: `Scraped ${fresh.length} real-time Naukri postings in "${loc}".`,
        });
      } else {
        throw new Error(data.error || 'Failed to scrape Naukri postings');
      }
    } catch (err: any) {
      setScrapeNotification({
        type: 'error',
        message: err.message || 'Error scraping Naukri platform.',
      });
    } finally {
      setIsScrapingNaukri(false);
    }
  };

  // 4. Real-Time SSE Stream Search across all platforms
  const startStreamSearch = async (overrideLocation?: string, overrideRoles?: string) => {
    setIsSearching(true);
    setStreamStats({ linkedin: 0, naukari: 0, total: 0 });
    const locToUse = overrideLocation !== undefined ? overrideLocation : searchLocation.trim();
    const rolesToUse = overrideRoles !== undefined ? overrideRoles : searchRoles.trim();
    const rawRoles =
      rolesToUse || (resume.target_roles && resume.target_roles[0]) || 'Software Engineer Intern';
    const effectiveRoles = rawRoles.includes(',') ? rawRoles.split(',')[0].trim() : rawRoles.trim();
    const effectiveLoc = (!locToUse || /anywhere|global|worldwide/i.test(locToUse))
      ? 'Worldwide'
      : locToUse;

    accumulatedJobsRef.current = new Map();
    newJobIdsRef.current = new Set();
    onJobsDiscovered([]);

    const rolesParam = encodeURIComponent(effectiveRoles);
    const locationParam = encodeURIComponent(effectiveLoc);
    const timeParam = timeFilter === 'all' || !timeFilter ? 'all' : timeFilter;
    const url = `/api/jobs/stream-search?roles=${rolesParam}&location=${locationParam}&timeWindow=${timeParam}&remoteOnly=${remoteOnly}&jobType=${jobType}&batchYear=${batchYear}&seniorityLevel=${seniorityLevel}&workplaceType=${workplaceFilter}`;

    const eventSource = new EventSource(url);

    eventSource.addEventListener('source_start', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.source) {
          setStreamingSource(data.label || data.source);
        }
      } catch {}
    });

    eventSource.addEventListener('job', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        const job: JobPosting = data.job;
        if (!job || !job.id) return;

        const dedupKey = getJobDedupKey(job);
        accumulatedJobsRef.current.set(dedupKey, job);
        newJobIdsRef.current.add(job.id);

        const sorted = (Array.from(accumulatedJobsRef.current.values()) as JobPosting[]).sort(
          (a, b) => getJobMinutesAgo(a) - getJobMinutesAgo(b)
        );
        onJobsDiscovered(sorted);

        const src = (job.source || '').toLowerCase();
        setStreamStats((prev) => ({
          linkedin: src.includes('linkedin') ? prev.linkedin + 1 : prev.linkedin,
          naukari: src.includes('naukari') || src.includes('naukri') ? prev.naukari + 1 : prev.naukari,
          total: prev.total + 1,
        }));
      } catch {}
    });

    eventSource.addEventListener('complete', (e: any) => {
      setStreamingSource(null);
      setIsSearching(false);
      try {
        const data = JSON.parse(e.data);
        if (data.totalJobs) {
          setScrapeNotification({
            type: 'success',
            message: `Discovered ${data.totalJobs} live postings across verified engineering boards.`,
          });
        }
      } catch {}
      eventSource.close();
    });

    eventSource.addEventListener('error', () => {
      setStreamingSource(null);
      setIsSearching(false);
      eventSource.close();
    });
  };

  // 5. Scrape custom URL or JD text
  const handleScrapeCustomJob = async () => {
    if (!customJobUrl.trim() && !customJobRawText.trim()) {
      setScraperErrorMsg('Please provide a job URL or paste description text.');
      return;
    }

    setIsScrapingCustom(true);
    setScraperErrorMsg(null);
    setScraperSuccessMsg(null);

    try {
      const res = await fetch('/api/jobs/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: customJobUrl.trim() || undefined,
          rawText: customJobRawText.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.job) {
        setScraperSuccessMsg(`Successfully parsed "${data.job.title}" at ${data.job.company}!`);
        onJobsDiscovered(mergeJobsDeduped(discoveredJobs, [data.job]));
        setCustomJobUrl('');
        setCustomJobRawText('');
        setTimeout(() => {
          setShowCustomScraper(false);
          setScraperSuccessMsg(null);
        }, 2000);
      } else {
        setScraperErrorMsg(data.error || 'Could not parse job from input.');
      }
    } catch (err: any) {
      setScraperErrorMsg(err.message || 'Failed to extract custom job.');
    } finally {
      setIsScrapingCustom(false);
    }
  };

  const activeDomain = useMemo(() => {
    if (selectedDomainId !== 'all') {
      const found = ALL_DOMAINS.find((d) => d.domainId === selectedDomainId);
      if (found) return found;
    }
    return detectDomainFromQuery(searchRoles);
  }, [selectedDomainId, searchRoles]);

  const isInternMode = useMemo(() => {
    return jobType === 'internship' || /\b(intern|internship|trainee|co-?op)\b/i.test(searchRoles);
  }, [jobType, searchRoles]);

  const activeDomainRoles = useMemo(() => {
    if (!activeDomain) return [];
    return isInternMode ? activeDomain.internRoles : activeDomain.fulltimeRoles;
  }, [activeDomain, isInternMode]);

  const activeDomainKeyword = useMemo(() => {
    if (!activeDomain) return searchRoles;
    return isInternMode ? activeDomain.internKeyword : activeDomain.fulltimeKeyword;
  }, [activeDomain, isInternMode, searchRoles]);

  const handleSelectDomain = (domainId: string) => {
    setSelectedDomainId(domainId);
    setActiveRoleSubFilter('all');
    if (domainId === 'all') {
      return;
    }
    const dom = ALL_DOMAINS.find((d) => d.domainId === domainId);
    if (dom) {
      const targetKeyword = isInternMode ? dom.internKeyword : dom.fulltimeKeyword;
      setSearchRoles(targetKeyword);
      startStreamSearch(searchLocation, targetKeyword);
    }
  };

  // Role suggestions filtered
  const filteredRoleSuggestions = useMemo(() => {
    const input = searchRoles.toLowerCase().trim();
    const suggestions = [
      'Software Engineer Intern',
      'Software Engineer',
      ...activeDomainRoles,
      ...(resume.target_roles || []),
      ...ALL_DOMAINS.flatMap((d) => [d.internKeyword, d.fulltimeKeyword]),
      ...SOFTWARE_ENGINEER_INTERN_ROLES,
      ...SOFTWARE_ENGINEER_FULLTIME_ROLES,
      ...POPULAR_TECH_ROLES,
    ];
    const unique = Array.from(new Set(suggestions));
    if (!input) return unique.slice(0, 10);
    return unique.filter((r) => r.toLowerCase().includes(input)).slice(0, 10);
  }, [searchRoles, resume.target_roles, activeDomainRoles]);

  // Combined Filters Logic
  const filteredJobs = useMemo(() => {
    return discoveredJobs.filter((job) => {
      if (selectedSourceFilter === 'bookmarked') {
        if (!bookmarkedJobIds.has(job.id)) return false;
      } else if (selectedSourceFilter !== 'all') {
        if ((job.source || '').toLowerCase() !== selectedSourceFilter.toLowerCase()) {
          return false;
        }
      }

      if (activeRoleSubFilter !== 'all') {
        const subLower = activeRoleSubFilter.toLowerCase().replace(/[–—\-]/g, ' ');
        const tLower = (job.title || '').toLowerCase().replace(/[–—\-]/g, ' ');
        const dLower = (job.description || '').toLowerCase();
        const skillStr = (job.skills || []).join(' ').toLowerCase();
        if (!tLower.includes(subLower) && !dLower.includes(subLower)) {
          const tokens = subLower
            .split(/\s+/)
            .filter((x) => x.length > 2 && !['intern', 'developer', 'engineer', 'full', 'stack'].includes(x));
          if (tokens.length > 0 && !tokens.some((tok) => tLower.includes(tok) || dLower.includes(tok) || skillStr.includes(tok))) {
            return false;
          }
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const titleMatch = (job.title || '').toLowerCase().includes(q);
        const compMatch = (job.company || '').toLowerCase().includes(q);
        const locMatch = (job.location || '').toLowerCase().includes(q);
        const skillMatch = (job.skills || []).some((s) => s.toLowerCase().includes(q));
        const tagMatch = (job.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !compMatch && !locMatch && !skillMatch && !tagMatch) return false;
      }

      const titleLower = (job.title || '').toLowerCase();
      if (jobType === 'internship') {
        const isIntern =
          job.isInternship ||
          /\b(intern|internship|co-?op|trainee)\b/i.test(titleLower + ' ' + (job.tags || []).join(' '));
        const isSenior = /\b(senior|sr\.|lead|principal|staff|manager|director)\b/i.test(titleLower);
        if (!isIntern || isSenior) return false;
      } else if (jobType === 'fulltime') {
        const isIntern = job.isInternship || /\b(intern|internship|co-?op)\b/i.test(job.title);
        if (isIntern) return false;
      }

      const minAgo = getJobMinutesAgo(job);
      if (timeFilter === '24h' && minAgo > 1440) return false;
      if (timeFilter === '3d' && minAgo > 4320) return false;
      if (timeFilter === '7d' && minAgo > 10080) return false;

      const isRem = Boolean(job.remote || job.isRemote) || /\bremote\b/i.test(job.location || '');
      const isHyb = /\bhybrid\b/i.test(job.location || '');
      const isOnsite = !isRem && !isHyb;

      if (workplaceFilter === 'remote' && !isRem) return false;
      if (workplaceFilter === 'hybrid' && !isHyb) return false;
      if (workplaceFilter === 'onsite' && !isOnsite) return false;

      if (lowApplicantsOnly && (typeof job.applicantCount !== 'number' || job.applicantCount >= 10)) {
        return false;
      }

      return true;
    });
  }, [
    discoveredJobs,
    selectedSourceFilter,
    searchTerm,
    jobType,
    timeFilter,
    workplaceFilter,
    lowApplicantsOnly,
    bookmarkedJobIds,
  ]);

  const categoryCounts = useMemo(() => {
    let all = discoveredJobs.length;
    let count24h = 0;
    let count3d = 0;
    let count7d = 0;
    let countRemote = 0;
    let countHybrid = 0;
    let countOnsite = 0;
    let countLowApps = 0;

    for (const j of discoveredJobs) {
      const min = getJobMinutesAgo(j);
      if (min <= 1440) count24h++;
      if (min <= 4320) count3d++;
      if (min <= 10080) count7d++;

      const isRem = Boolean(j.remote || j.isRemote) || /\bremote\b/i.test(j.location || '');
      const isHyb = /\bhybrid\b/i.test(j.location || '');
      if (isRem) countRemote++;
      if (isHyb) countHybrid++;
      if (!isRem && !isHyb) countOnsite++;

      if (typeof j.applicantCount === 'number' && j.applicantCount < 10) countLowApps++;
    }

    return { all, count24h, count3d, count7d, countRemote, countHybrid, countOnsite, countLowApps };
  }, [discoveredJobs]);

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      if (sortBy === 'low_applicants') {
        return (a.applicantCount || 999) - (b.applicantCount || 999);
      }
      if (sortBy === 'company') {
        return a.company.localeCompare(b.company);
      }
      return getJobMinutesAgo(a) - getJobMinutesAgo(b);
    });
  }, [filteredJobs, sortBy]);

  const getFreshnessBadge = (job: JobPosting) => {
    const minAgo = getJobMinutesAgo(job);
    if (minAgo <= 2) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Just Now
        </span>
      );
    }
    if (minAgo < 60) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-2 py-0.5 rounded-md">
          <Clock className="w-3 h-3 text-emerald-600" />
          {minAgo}m ago
        </span>
      );
    }
    if (minAgo < 1440) {
      const hrs = Math.floor(minAgo / 60);
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
          <Clock className="w-3 h-3 text-slate-400" />
          {hrs}h ago
        </span>
      );
    }
    const days = Math.floor(minAgo / 1440);
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
        <Clock className="w-3 h-3 text-slate-400" />
        {days}d ago
      </span>
    );
  };

  const getSourceBadge = (source: JobSource | string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('linkedin')) {
      return (
        <span className="text-[10px] font-semibold tracking-wide text-[#0077b5] bg-blue-50/80 border border-[#0077b5]/20 px-2 py-0.5 rounded uppercase">
          LinkedIn
        </span>
      );
    }
    if (s.includes('naukari') || s.includes('naukri')) {
      return (
        <span className="text-[10px] font-semibold tracking-wide text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded uppercase">
          Naukri
        </span>
      );
    }
    if (s.includes('greenhouse')) {
      return (
        <span className="text-[10px] font-semibold tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">
          Greenhouse
        </span>
      );
    }
    if (s.includes('lever')) {
      return (
        <span className="text-[10px] font-semibold tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded uppercase">
          Lever
        </span>
      );
    }
    if (s.includes('ashby')) {
      return (
        <span className="text-[10px] font-semibold tracking-wide text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase">
          Ashby
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold tracking-wide text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase">
        {source}
      </span>
    );
  };

  const getCompanyInitials = (company: string) => {
    if (!company) return 'CO';
    return company
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      {/* ── 1. HEADER SECTION (CLEAN & REFINED FINTECH AESTHETICS) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Ingestion Stream
            </span>

            {isMonitorActive && (
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                • Background monitor active
              </span>
            )}

            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium cursor-pointer transition-colors ${
                autoRefreshEnabled
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {autoRefreshEnabled ? 'Auto-Refresh (90s) ON' : 'Auto-Refresh (90s) OFF'}
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Job &amp; Internship Feed
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Aggregated real-time opportunities from LinkedIn, Naukri, Greenhouse, Lever, Ashby, and verified startup boards.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCustomScraper(!showCustomScraper)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Custom URL / JD</span>
          </button>

          {discoveredJobs.length > 0 && (
            <button
              onClick={onProceedToScoring}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#5B7BE8] hover:bg-[#3D5FD9] shadow-xs cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Batch Fit-Score ({discoveredJobs.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrape Notifications */}
      {scrapeNotification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
            scrapeNotification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {scrapeNotification.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-medium">{scrapeNotification.message}</span>
          </div>
          <button
            onClick={() => setScrapeNotification(null)}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 2. COLLAPSIBLE CUSTOM JOB URL / JD PARSER ── */}
      {showCustomScraper && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <LinkIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Custom Requisition Parser</h3>
                <p className="text-xs text-slate-500">
                  Parse any direct job URL (LinkedIn, Naukri, Greenhouse, Lever, Ashby) or paste raw text.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCustomScraper(false)}
              className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Direct Job Link</label>
              <input
                type="url"
                value={customJobUrl}
                onChange={(e) => setCustomJobUrl(e.target.value)}
                placeholder="https://www.linkedin.com/jobs/view/... or Greenhouse link"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Or Paste Description Text</label>
              <textarea
                value={customJobRawText}
                onChange={(e) => setCustomJobRawText(e.target.value)}
                placeholder="Paste role requirements, tech stack, and responsibilities here..."
                rows={2}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white resize-none transition-all"
              />
            </div>
          </div>

          {scraperErrorMsg && (
            <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{scraperErrorMsg}</span>
            </div>
          )}

          {scraperSuccessMsg && (
            <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>{scraperSuccessMsg}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleScrapeCustomJob}
              disabled={isScrapingCustom || (!customJobUrl.trim() && !customJobRawText.trim())}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isScrapingCustom ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting Job Posting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Parse &amp; Ingest Job</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── 3. DOMAIN SELECTION RIBBON (ALL DOMAINS) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              Engineering Domains ({ALL_DOMAINS.length})
            </span>
            <span className="text-[11px] font-medium text-slate-400 hidden md:inline">
              • Select any domain to scrape all covered roles in real time
            </span>
          </div>
          <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
            <span className="text-slate-500 font-normal">Active:</span>
            <span className="font-bold underline decoration-blue-300">
              {activeDomain ? activeDomain.domainName : 'All Domains'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => handleSelectDomain('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedDomainId === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>🌐</span>
            <span>All Domains</span>
          </button>
          {ALL_DOMAINS.map((dom) => {
            const isSelected =
              selectedDomainId === dom.domainId ||
              (selectedDomainId === 'all' && activeDomain?.domainId === dom.domainId);
            const roleCount = isInternMode ? dom.internRoles.length : dom.fulltimeRoles.length;
            return (
              <button
                key={dom.domainId}
                type="button"
                onClick={() => handleSelectDomain(dom.domainId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs font-bold ring-2 ring-blue-400/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium'
                }`}
              >
                <span>{dom.icon}</span>
                <span>{dom.shortName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-blue-700 text-blue-100 font-bold' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {roleCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. SEARCH & SCRAPER CONTROL COMMAND DECK ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Scraper Triggers Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Scrapers:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleScrapeLinkedInLive}
              disabled={isScrapingLinkedIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 ${isScrapingLinkedIn ? 'animate-spin' : ''} text-[#0077b5]`} />
              <span>LinkedIn (Live)</span>
            </button>

            <button
              onClick={handleScrapeNaukriLive}
              disabled={isScrapingNaukri}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 ${isScrapingNaukri ? 'animate-spin' : ''} text-orange-500`} />
              <span>Naukri (Live)</span>
            </button>

            <button
              onClick={() => startStreamSearch()}
              disabled={isSearching || isScrapingLinkedIn || isScrapingNaukri}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Scrape All Boards</span>
            </button>
          </div>
        </div>

        {/* Primary Search Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Target Role with Auto-Suggest */}
          <div className="md:col-span-6 lg:col-span-5 relative" ref={roleInputRef}>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Target Role / Keywords</span>
              <span className="text-[11px] text-blue-600 font-normal">auto-suggest</span>
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchRoles}
                onChange={(e) => {
                  setSearchRoles(e.target.value);
                  setIsRoleDropdownOpen(true);
                }}
                onFocus={() => setIsRoleDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') startStreamSearch();
                }}
                placeholder="e.g. Software Engineer, React Developer..."
                className="w-full pl-9 pr-3 h-9 text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Suggestions Dropdown */}
            {isRoleDropdownOpen && filteredRoleSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl shadow-lg z-30 overflow-hidden bg-white border border-slate-200">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Suggested Roles
                </div>
                {filteredRoleSuggestions.map((role, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchRoles(role);
                      setIsRoleDropdownOpen(false);
                      startStreamSearch(searchLocation, role);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>{role}</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location Input */}
          <div className="md:col-span-4 lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location (City / Remote)</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') startStreamSearch();
                }}
                placeholder="e.g. Bangalore, India, Remote..."
                className="w-full pl-9 pr-3 h-9 text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="md:col-span-2 lg:col-span-3">
            <button
              type="button"
              onClick={() => startStreamSearch()}
              disabled={isSearching}
              className="w-full h-9 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 bg-[#5B7BE8] hover:bg-[#3D5FD9] text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Jobs</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dropdowns & Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Type */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">Type:</span>
              <select
                value={jobType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setJobType(newType);
                  if (activeDomain) {
                    const newKw = newType === 'internship' ? activeDomain.internKeyword : activeDomain.fulltimeKeyword;
                    setSearchRoles(newKw);
                    setTimeout(() => startStreamSearch(searchLocation, newKw), 50);
                  } else {
                    setTimeout(() => startStreamSearch(), 50);
                  }
                }}
                className="h-7 px-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs font-medium cursor-pointer outline-none"
              >
                <option value="any">All Types</option>
                <option value="internship">Internship</option>
                <option value="fulltime">Full-Time</option>
                <option value="contract">Contract</option>
              </select>
            </div>

            {/* Level */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">Level:</span>
              <select
                value={seniorityLevel}
                onChange={(e) => {
                  setSeniorityLevel(e.target.value);
                  setTimeout(() => startStreamSearch(), 50);
                }}
                className="h-7 px-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs font-medium cursor-pointer outline-none"
              >
                <option value="any">All Levels</option>
                <option value="internship">Internship</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior</option>
              </select>
            </div>

            {/* Batch */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">Batch:</span>
              <select
                value={batchYear}
                onChange={(e) => {
                  setBatchYear(e.target.value);
                  setTimeout(() => startStreamSearch(), 50);
                }}
                className="h-7 px-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs font-medium cursor-pointer outline-none"
              >
                <option value="any">All Batches</option>
                <option value="2028">2028 Batch</option>
                <option value="2027">2027 Batch</option>
                <option value="2026">2026 Batch</option>
                <option value="2025">2025 Batch</option>
                <option value="2024">2024 Batch</option>
              </select>
            </div>
          </div>

          {/* Quick Preset Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
            <span className="text-[11px] text-slate-400 font-medium shrink-0">Quick:</span>
            {[
              'Software Engineer Intern',
              'Software Engineer',
              'Full Stack Developer',
              'Frontend Developer',
              'Backend Developer',
              'AI Engineer',
              'Remote',
              'Bangalore',
              'India',
            ].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  if (tag === 'Remote' || tag === 'Bangalore' || tag === 'India') {
                    setSearchLocation(tag);
                    startStreamSearch(tag, searchRoles);
                  } else {
                    setSearchRoles(tag);
                    startStreamSearch(searchLocation, tag);
                  }
                }}
                className="px-2.5 py-0.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer shrink-0"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        </div>

      {/* ── 4. SECONDARY FILTER TOOLBAR & SORTING ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* In-feed search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter current results by keyword, tech skill, company..."
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end md:self-auto text-xs">
            <span className="text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold cursor-pointer outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="low_applicants">Fewest Applicants</option>
              <option value="company">Company (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Badges Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Freshness Tabs */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/80">
              {[
                { id: 'all', label: `All (${categoryCounts.all})` },
                { id: '24h', label: `24h (${categoryCounts.count24h})` },
                { id: '3d', label: `3d (${categoryCounts.count3d})` },
                { id: '7d', label: `7d (${categoryCounts.count7d})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTimeFilter(tab.id as any)}
                  className={`px-2 py-1 rounded-md text-xs transition-all cursor-pointer ${
                    timeFilter === tab.id
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Workplace Tabs */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/80">
              {[
                { id: 'all', label: 'All Modes' },
                { id: 'remote', label: `Remote (${categoryCounts.countRemote})` },
                { id: 'hybrid', label: `Hybrid (${categoryCounts.countHybrid})` },
                { id: 'onsite', label: `Onsite (${categoryCounts.countOnsite})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setWorkplaceFilter(tab.id as any)}
                  className={`px-2 py-1 rounded-md text-xs transition-all cursor-pointer ${
                    workplaceFilter === tab.id
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Few Applicants Toggle */}
            <button
              onClick={() => setLowApplicantsOnly(!lowApplicantsOnly)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                lowApplicantsOnly
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-500" />
              <span>&lt; 10 Applicants ({categoryCounts.countLowApps})</span>
            </button>
          </div>

          {/* Board Selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 font-medium">Board:</span>
            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium cursor-pointer outline-none"
            >
              <option value="all">All Sources</option>
              <option value="linkedin">LinkedIn</option>
              <option value="naukari">Naukri</option>
              <option value="greenhouse">Greenhouse</option>
              <option value="lever">Lever</option>
              <option value="ashby">Ashby</option>
              <option value="remoteok">RemoteOK</option>
              <option value="bookmarked">Saved Roles ({bookmarkedJobIds.size})</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 5. LIVE STREAMING PROGRESS BANNER ── */}
      {isSearching && (
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <RotateCw className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
            <div className="text-xs text-blue-950 font-medium">
              Streaming postings from {streamingSource || 'verified boards'}...{' '}
              <span className="font-bold">({streamStats.total} discovered)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. JOB CARDS GRID ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Showing <strong className="text-slate-900">{sortedJobs.length}</strong> matching roles
          </span>
          <span>{sortBy === 'newest' ? 'Sorted: Newest First' : 'Filtered Feed'}</span>
        </div>

        {sortedJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">No postings matching active filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria or trigger live scraping above.
            </p>
            <button
              onClick={() => {
                setTimeFilter('all');
                setWorkplaceFilter('all');
                setLowApplicantsOnly(false);
                setSelectedSourceFilter('all');
                startStreamSearch();
              }}
              className="px-4 py-2 rounded-xl bg-[#5B7BE8] text-white text-xs font-semibold hover:bg-[#3D5FD9] transition-colors cursor-pointer shadow-xs"
            >
              Scrape All Sources Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {sortedJobs.map((job) => {
              const isSaved = isBookmarked(job.id);
              const targetApplyUrl = getSafeJobApplyUrl(job);
              const skillsToShow = (job.skills && job.skills.length > 0)
                ? job.skills.slice(0, 4)
                : (job.tags || []).slice(0, 4);

              return (
                <div
                  key={job.id}
                  onClick={() => {
                    setSelectedDrawerJob(job);
                    if (onSelectJobForDetail) onSelectJobForDetail(job);
                  }}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    {/* Top Row: Company & Source Badges */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CompanyIcon
                          company={job.company}
                          logoUrl={job.companyLogo}
                          size={36}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {job.company}
                          </h4>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{job.location || 'Remote / Worldwide'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {getSourceBadge(job.source)}
                        {getFreshnessBadge(job)}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(job.id);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title={isSaved ? 'Remove from saved' : 'Save position'}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Job Title */}
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {job.title}
                    </h3>

                    {/* Description preview */}
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {job.description || 'Verified engineering requisition available on official company career board.'}
                    </p>

                    {/* Tech Skills Chips */}
                    {skillsToShow.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {skillsToShow.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/60"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] font-semibold text-slate-700">
                      {job.salary || (job.isInternship ? 'Stipend: ₹25k-45k/mo' : 'Competitive Market Pay')}
                    </span>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {onSelectJobForTailoring && (
                        <button
                          onClick={() => onSelectJobForTailoring(job)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Tailor Resume
                        </button>
                      )}

                      <a
                        href={targetApplyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-white font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Apply</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-Over Detail Drawer */}
      <JobDetailDrawer
        job={selectedDrawerJob}
        isOpen={Boolean(selectedDrawerJob)}
        onClose={() => setSelectedDrawerJob(null)}
        resume={resume}
        onTailorJob={(j) => {
          setSelectedDrawerJob(null);
          if (onSelectJobForTailoring) onSelectJobForTailoring(j);
        }}
        isBookmarked={selectedDrawerJob ? isBookmarked(selectedDrawerJob.id) : false}
        onToggleBookmark={(id) => toggleBookmark(id)}
      />
    </div>
  );
};

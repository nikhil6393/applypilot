import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, MapPin, ExternalLink, RotateCw, Briefcase, Zap, ArrowRight, Clock, SlidersHorizontal, Flame, PlusCircle, Link as LinkIcon, Check, AlertCircle, Bookmark, BookmarkCheck, ArrowUpRight, } from 'lucide-react';
import { getSafeJobApplyUrl } from '../utils/jobUtils';
import { JobDetailDrawer } from './JobDetailDrawer';
import { CompanyIcon } from './CompanyIcon';
import { useAppStore } from '../store/appStore';
import { ALL_DOMAINS, detectDomainFromQuery, SOFTWARE_ENGINEER_INTERN_ROLES, SOFTWARE_ENGINEER_FULLTIME_ROLES, } from '../../shared/domains';
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
export const DiscoveryStep = ({ resume, discoveredJobs, onJobsDiscovered, onProceedToScoring, onSelectJobForDetail, onSelectJobForTailoring, }) => {
    const { bookmarkedJobIds, toggleBookmark, isBookmarked, addToast, setSelectedJob, setClientScreen } = useAppStore();
    const [isSearching, setIsSearching] = useState(false);
    const [isScrapingLinkedIn, setIsScrapingLinkedIn] = useState(false);
    const [isScrapingNaukri, setIsScrapingNaukri] = useState(false);
    const [scrapeNotification, setScrapeNotification] = useState(null);
    // Background monitor state
    const [isMonitorActive, setIsMonitorActive] = useState(true);
    const [liveMonitorAlert, setLiveMonitorAlert] = useState(null);
    // Job Detail Slide-Over Drawer State
    const [selectedDrawerJob, setSelectedDrawerJob] = useState(null);
    // 90s Live Auto-Refresh State
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
    // Real-time stream state
    const [streamingSource, setStreamingSource] = useState(null);
    const [streamStats, setStreamStats] = useState({ linkedin: 0, naukari: 0, total: 0 });
    const newJobIdsRef = useRef(new Set());
    const accumulatedJobsRef = useRef(new Map());
    // View Scope: 'all' (All List) | 'live' (Real-Time Live) | 'queue' (Past in Queue)
    const [viewScope, setViewScope] = useState('all');
    const [isLoadingQueue, setIsLoadingQueue] = useState(false);
    // Search inputs
    const [searchRoles, setSearchRoles] = useState(resume.target_roles?.[0] || 'Software Engineer Intern');
    const [searchLocation, setSearchLocation] = useState(resume.contact?.location || 'India');
    const [jobType, setJobType] = useState('internship');
    const [remoteOnly, setRemoteOnly] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSourceFilter, setSelectedSourceFilter] = useState('all');
    const [batchYear, setBatchYear] = useState('any');
    const [seniorityLevel, setSeniorityLevel] = useState('any');
    const [activeRoleSubFilter, setActiveRoleSubFilter] = useState('all');
    const [selectedDomainId, setSelectedDomainId] = useState('all');
    // Role suggestions dropdown state
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const roleInputRef = useRef(null);
    // Custom Job Link / Description Scraper State
    const [showCustomScraper, setShowCustomScraper] = useState(false);
    const [customJobUrl, setCustomJobUrl] = useState('');
    const [customJobRawText, setCustomJobRawText] = useState('');
    const [isScrapingCustom, setIsScrapingCustom] = useState(false);
    const [scraperSuccessMsg, setScraperSuccessMsg] = useState(null);
    const [scraperErrorMsg, setScraperErrorMsg] = useState(null);
    // Smart Freshness & Workplace Filtering
    const [timeFilter, setTimeFilter] = useState('all');
    const [workplaceFilter, setWorkplaceFilter] = useState('all');
    const [lowApplicantsOnly, setLowApplicantsOnly] = useState(false);
    const [sortBy, setSortBy] = useState('newest');

    // Fetch pre-verified past jobs from SQLite/store on mount or per source
    const fetchQueueJobs = async (targetRole, sourceOverride) => {
        try {
            setIsLoadingQueue(true);
            const queryRole = targetRole || searchRoles.trim() || resume?.target_roles?.[0] || 'Software Engineer Intern';
            const effectiveSource = sourceOverride !== undefined
                ? sourceOverride
                : (selectedSourceFilter !== 'all' && selectedSourceFilter !== 'bookmarked' ? selectedSourceFilter : '');
            const sourceParam = effectiveSource ? `&source=${encodeURIComponent(effectiveSource)}` : '';
            const res = await fetch(`/api/jobs?query=${encodeURIComponent(queryRole)}${sourceParam}&limit=80`);
            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }
            const data = await res.json();
            if (data && Array.isArray(data.items) && data.items.length > 0) {
                const tagged = data.items.map((j) => ({
                    ...j,
                    isQueue: true,
                    isLive: false,
                }));
                onJobsDiscovered((prev) => mergeJobsDeduped(prev || [], tagged));
            }
        } catch (err) {
            console.warn('Could not fetch queue jobs:', err);
        } finally {
            setIsLoadingQueue(false);
        }
    };

    useEffect(() => {
        if (!discoveredJobs || discoveredJobs.length === 0) {
            fetchQueueJobs();
            // Pre-seed LinkedIn past queue positions so LinkedIn view is immediately populated
            fetchQueueJobs(undefined, 'linkedin');
        }
    }, []);

    // When switching board filter to LinkedIn, ensure LinkedIn queue jobs are fetched if not present
    useEffect(() => {
        if (selectedSourceFilter === 'linkedin') {
            const hasLinkedIn = (discoveredJobs || []).some((j) => (j.source || '').toLowerCase().includes('linkedin'));
            if (!hasLinkedIn) {
                fetchQueueJobs(undefined, 'linkedin');
            }
        }
    }, [selectedSourceFilter]);
    // Close role dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (roleInputRef.current && !roleInputRef.current.contains(e.target)) {
                setIsRoleDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    // Helper to extract minutes ago from job object
    const getJobMinutesAgo = (job) => {
        const rawDate = job.postedDate || job.postedAt;
        if (rawDate) {
            const timeMs = new Date(rawDate).getTime();
            if (!isNaN(timeMs)) {
                return Math.max(0, Math.floor((Date.now() - timeMs) / 60000));
            }
        }
        const rel = (job.postedRelative || '').toLowerCase();
        if (rel.includes('just now') || rel.includes('second') || rel.includes('sec'))
            return 0;
        const minMatch = rel.match(/(\d+)\s*(?:m|min)(?!o)/);
        if (minMatch)
            return parseInt(minMatch[1], 10);
        const hrMatch = rel.match(/(\d+)\s*h/);
        if (hrMatch)
            return parseInt(hrMatch[1], 10) * 60;
        if (rel.includes('today'))
            return 120;
        const dayMatch = rel.match(/(\d+)\s*d/);
        if (dayMatch)
            return parseInt(dayMatch[1], 10) * 1440;
        return 2880;
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
        let eventSource = null;
        try {
            eventSource = new EventSource('/api/monitor/stream');
            eventSource.addEventListener('new_jobs', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.jobs && Array.isArray(data.jobs) && data.jobs.length > 0) {
                        const freshOnly = data.jobs.filter((j) => getJobMinutesAgo(j) <= 1440);
                        if (freshOnly.length === 0)
                            return;
                        setLiveMonitorAlert(`Auto-detected ${freshOnly.length} new postings in the background!`);
                        setTimeout(() => setLiveMonitorAlert(null), 5000);
                        onJobsDiscovered(mergeJobsDeduped(discoveredJobs, freshOnly));
                    }
                }
                catch { }
            });
            eventSource.addEventListener('status', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    setIsMonitorActive(Boolean(data.isRunning));
                }
                catch { }
            });
        }
        catch (e) {
            console.warn('Monitor stream connection issue:', e);
        }
        return () => {
            if (eventSource)
                eventSource.close();
        };
    }, [discoveredJobs, onJobsDiscovered]);
    // 2. Direct Real-Time LinkedIn Scraper
    const handleScrapeLinkedInLive = async () => {
        setIsScrapingLinkedIn(true);
        setScrapeNotification(null);
        setSelectedSourceFilter('linkedin'); // Auto-focus LinkedIn view
        const internOnly = jobType === 'internship' || jobType === 'any';
        const query = searchRoles.trim() || resume.target_roles?.join(', ') || 'Software Engineer Intern';
        const rawLoc = searchLocation.trim();
        const loc = (!rawLoc || /anywhere|global|worldwide/i.test(rawLoc)) ? 'Worldwide' : rawLoc;
        try {
            // 1. Concurrently fetch past LinkedIn queue jobs from database
            const queuePromise = fetch(`/api/jobs?source=linkedin&query=${encodeURIComponent(query)}&limit=60`)
                .then((r) => r.json())
                .catch(() => ({ items: [] }));

            // 2. Fetch real-time live scraped LinkedIn jobs
            const scrapePromise = fetch('/api/jobs/scrape-linkedin', {
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
            }).then((r) => r.json());

            const [queueData, scrapeData] = await Promise.all([queuePromise, scrapePromise]);

            let merged = discoveredJobs || [];
            if (queueData.items && Array.isArray(queueData.items) && queueData.items.length > 0) {
                const queueJobs = queueData.items.map((j) => ({ ...j, isQueue: true, isLive: false }));
                merged = mergeJobsDeduped(merged, queueJobs);
            }

            if (scrapeData.success && Array.isArray(scrapeData.jobs)) {
                const fresh = scrapeData.jobs
                    .filter((j) => getJobMinutesAgo(j) <= 1440)
                    .map((j) => ({ ...j, isLive: true, isQueue: false, source: 'linkedin' }));
                merged = mergeJobsDeduped(merged, fresh);
                onJobsDiscovered(merged);
                setScrapeNotification({
                    type: 'success',
                    message: `Discovered ${fresh.length} real-time LinkedIn postings in "${loc}". Past LinkedIn queue is loaded!`,
                });
            } else {
                onJobsDiscovered(merged);
                throw new Error(scrapeData.error || 'Failed to fetch live LinkedIn postings');
            }
        }
        catch (err) {
            setScrapeNotification({
                type: 'error',
                message: err.message || 'Error connecting to LinkedIn real-time scraper.',
            });
        }
        finally {
            setIsScrapingLinkedIn(false);
        }
    };
    // 3. Direct Real-Time Naukri Scraper
    const handleScrapeNaukriLive = async () => {
        setIsScrapingNaukri(true);
        setScrapeNotification(null);
        const query = searchRoles.trim() || resume.target_roles?.join(', ') || 'Software Engineer Intern';
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
                const scraped = data.jobs;
                const fresh = scraped
                    .filter((j) => getJobMinutesAgo(j) <= 1440)
                    .map((j) => ({ ...j, isLive: true, isQueue: false }));
                onJobsDiscovered(mergeJobsDeduped(discoveredJobs, fresh));
                setScrapeNotification({
                    type: 'success',
                    message: `Scraped ${fresh.length} real-time Naukri postings in "${loc}".`,
                });
            }
            else {
                throw new Error(data.error || 'Failed to scrape Naukri postings');
            }
        }
        catch (err) {
            setScrapeNotification({
                type: 'error',
                message: err.message || 'Error scraping Naukri platform.',
            });
        }
        finally {
            setIsScrapingNaukri(false);
        }
    };
    // 4. Real-Time SSE Stream Search across all platforms
    const startStreamSearch = async (overrideLocation, overrideRoles) => {
        setIsSearching(true);
        setSelectedSourceFilter('all'); // Show all boards including LinkedIn
        setViewScope('all'); // Show all postings together
        setStreamStats({ linkedin: 0, naukari: 0, total: 0 });
        const locToUse = overrideLocation !== undefined ? overrideLocation : searchLocation.trim();
        const rolesToUse = overrideRoles !== undefined ? overrideRoles : searchRoles.trim();
        const rawRoles = rolesToUse || (resume.target_roles && resume.target_roles[0]) || 'Software Engineer Intern';
        const effectiveRoles = rawRoles.includes(',') ? rawRoles.split(',')[0].trim() : rawRoles.trim();
        const effectiveLoc = (!locToUse || /anywhere|global|worldwide/i.test(locToUse))
            ? 'Worldwide'
            : locToUse;
        accumulatedJobsRef.current = new Map();
        newJobIdsRef.current = new Set();
        // Retain pre-verified queue jobs so user has instant results while live scrapers run
        if (Array.isArray(discoveredJobs) && discoveredJobs.length > 0) {
            for (const j of discoveredJobs) {
                const dedupKey = getJobDedupKey(j);
                accumulatedJobsRef.current.set(dedupKey, { ...j, isQueue: true });
            }
        }
        const rolesParam = encodeURIComponent(effectiveRoles);
        const locationParam = encodeURIComponent(effectiveLoc);
        const timeParam = timeFilter === 'all' || !timeFilter ? 'all' : timeFilter;
        const url = `/api/jobs/stream-search?roles=${rolesParam}&location=${locationParam}&timeWindow=${timeParam}&remoteOnly=${remoteOnly}&jobType=${jobType}&batchYear=${batchYear}&seniorityLevel=${seniorityLevel}&workplaceType=${workplaceFilter}`;
        const eventSource = new EventSource(url);
        eventSource.addEventListener('source_start', (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.source) {
                    setStreamingSource(data.label || data.source);
                }
            }
            catch { }
        });
        eventSource.addEventListener('job', (e) => {
            try {
                const data = JSON.parse(e.data);
                const job = data.job;
                if (!job || !job.id)
                    return;
                const isCached = data.source === 'cached_verified' || Boolean(job.cached_verified);
                const taggedJob = {
                    ...job,
                    isLive: !isCached,
                    isQueue: Boolean(isCached || job.isQueue),
                };
                const dedupKey = getJobDedupKey(taggedJob);
                accumulatedJobsRef.current.set(dedupKey, taggedJob);
                newJobIdsRef.current.add(taggedJob.id);
                const sorted = Array.from(accumulatedJobsRef.current.values()).sort((a, b) => getJobMinutesAgo(a) - getJobMinutesAgo(b));
                onJobsDiscovered(sorted);
                const src = (taggedJob.source || '').toLowerCase();
                setStreamStats((prev) => ({
                    linkedin: src.includes('linkedin') ? prev.linkedin + 1 : prev.linkedin,
                    naukari: src.includes('naukari') || src.includes('naukri') ? prev.naukari + 1 : prev.naukari,
                    total: prev.total + 1,
                }));
            }
            catch { }
        });
        eventSource.addEventListener('complete', (e) => {
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
            }
            catch { }
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
            }
            else {
                setScraperErrorMsg(data.error || 'Could not parse job from input.');
            }
        }
        catch (err) {
            setScraperErrorMsg(err.message || 'Failed to extract custom job.');
        }
        finally {
            setIsScrapingCustom(false);
        }
    };
    const activeDomain = useMemo(() => {
        if (selectedDomainId !== 'all') {
            const found = ALL_DOMAINS.find((d) => d.domainId === selectedDomainId);
            if (found)
                return found;
        }
        return detectDomainFromQuery(searchRoles);
    }, [selectedDomainId, searchRoles]);
    const isInternMode = useMemo(() => {
        return jobType === 'internship' || /\b(intern|internship|trainee|co-?op)\b/i.test(searchRoles);
    }, [jobType, searchRoles]);
    const activeDomainRoles = useMemo(() => {
        if (!activeDomain)
            return [];
        return isInternMode ? activeDomain.internRoles : activeDomain.fulltimeRoles;
    }, [activeDomain, isInternMode]);
    const activeDomainKeyword = useMemo(() => {
        if (!activeDomain)
            return searchRoles;
        return isInternMode ? activeDomain.internKeyword : activeDomain.fulltimeKeyword;
    }, [activeDomain, isInternMode, searchRoles]);
    const handleSelectDomain = (domainId) => {
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
        if (!input)
            return unique.slice(0, 10);
        return unique.filter((r) => r.toLowerCase().includes(input)).slice(0, 10);
    }, [searchRoles, resume.target_roles, activeDomainRoles]);
    // Combined Filters Logic
    const filteredJobs = useMemo(() => {
        return discoveredJobs.filter((job) => {
            if (viewScope === 'live' && !job.isLive) {
                return false;
            }
            if (viewScope === 'queue' && job.isLive && !job.isQueue) {
                return false;
            }
            if (selectedSourceFilter === 'bookmarked') {
                if (!bookmarkedJobIds.has(job.id))
                    return false;
            }
            else if (selectedSourceFilter !== 'all') {
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
                if (!titleMatch && !compMatch && !locMatch && !skillMatch && !tagMatch)
                    return false;
            }
            const titleLower = (job.title || '').toLowerCase();
            if (jobType === 'internship') {
                const isIntern = job.isInternship ||
                    /\b(intern|internship|co-?op|trainee)\b/i.test(titleLower + ' ' + (job.tags || []).join(' '));
                const isSenior = /\b(senior|sr\.|lead|principal|staff|manager|director)\b/i.test(titleLower);
                if (!isIntern || isSenior)
                    return false;
            }
            else if (jobType === 'fulltime') {
                const isIntern = job.isInternship || /\b(intern|internship|co-?op)\b/i.test(job.title);
                if (isIntern)
                    return false;
            }
            const minAgo = getJobMinutesAgo(job);
            if (timeFilter === '24h' && minAgo > 1440)
                return false;
            if (timeFilter === '3d' && minAgo > 4320)
                return false;
            if (timeFilter === '7d' && minAgo > 10080)
                return false;
            const isRem = Boolean(job.remote || job.isRemote) || /\bremote\b/i.test(job.location || '');
            const isHyb = /\bhybrid\b/i.test(job.location || '');
            const isOnsite = !isRem && !isHyb;
            if (workplaceFilter === 'remote' && !isRem)
                return false;
            if (workplaceFilter === 'hybrid' && !isHyb)
                return false;
            if (workplaceFilter === 'onsite' && !isOnsite)
                return false;
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
        // Pool for view scope counts respects selectedSourceFilter
        const sourceScopedJobs = selectedSourceFilter === 'all'
            ? discoveredJobs
            : selectedSourceFilter === 'bookmarked'
                ? discoveredJobs.filter((j) => bookmarkedJobIds.has(j.id))
                : discoveredJobs.filter((j) => (j.source || '').toLowerCase().includes(selectedSourceFilter.toLowerCase()));

        let all = sourceScopedJobs.length;
        let countLive = 0;
        let countQueue = 0;
        let count24h = 0;
        let count3d = 0;
        let count7d = 0;
        let countRemote = 0;
        let countHybrid = 0;
        let countOnsite = 0;
        let countLowApps = 0;
        for (const j of sourceScopedJobs) {
            if (j.isLive)
                countLive++;
            if (j.isQueue || !j.isLive)
                countQueue++;
            const min = getJobMinutesAgo(j);
            if (min <= 1440)
                count24h++;
            if (min <= 4320)
                count3d++;
            if (min <= 10080)
                count7d++;
            const isRem = Boolean(j.remote || j.isRemote) || /\bremote\b/i.test(j.location || '');
            const isHyb = /\bhybrid\b/i.test(j.location || '');
            if (isRem)
                countRemote++;
            if (isHyb)
                countHybrid++;
            if (!isRem && !isHyb)
                countOnsite++;
            if (typeof j.applicantCount === 'number' && j.applicantCount < 10)
                countLowApps++;
        }
        return { all, countLive, countQueue, count24h, count3d, count7d, countRemote, countHybrid, countOnsite, countLowApps };
    }, [discoveredJobs, selectedSourceFilter, bookmarkedJobIds]);
    const sortedJobs = useMemo(() => {
        return [...filteredJobs].sort((a, b) => {
            // Real-Time Live postings always show at the top!
            const aIsLive = a.isLive ? 1 : 0;
            const bIsLive = b.isLive ? 1 : 0;
            if (aIsLive !== bIsLive) {
                return bIsLive - aIsLive; // Real-time scraped postings at top
            }
            if (sortBy === 'low_applicants') {
                return (a.applicantCount || 999) - (b.applicantCount || 999);
            }
            if (sortBy === 'company') {
                return a.company.localeCompare(b.company);
            }
            return getJobMinutesAgo(a) - getJobMinutesAgo(b);
        });
    }, [filteredJobs, sortBy]);
    const getFreshnessBadge = (job) => {
        const minAgo = getJobMinutesAgo(job);
        if (minAgo <= 2) {
            return (<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
          Just Now
        </span>);
        }
        if (minAgo < 60) {
            return (<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-2 py-0.5 rounded-md">
          <Clock className="w-3 h-3 text-emerald-600"/>
          {minAgo}m ago
        </span>);
        }
        if (minAgo < 1440) {
            const hrs = Math.floor(minAgo / 60);
            return (<span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
          <Clock className="w-3 h-3 text-slate-400"/>
          {hrs}h ago
        </span>);
        }
        const days = Math.floor(minAgo / 1440);
        return (<span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
        <Clock className="w-3 h-3 text-slate-400"/>
        {days}d ago
      </span>);
    };
    const getSourceBadge = (source) => {
        const s = (source || '').toLowerCase();
        if (s.includes('linkedin')) {
            return (<span className="text-[10px] font-semibold tracking-wide text-[#0077b5] bg-blue-50/80 border border-[#0077b5]/20 px-2 py-0.5 rounded uppercase">
          LinkedIn
        </span>);
        }
        if (s.includes('naukari') || s.includes('naukri')) {
            return (<span className="text-[10px] font-semibold tracking-wide text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded uppercase">
          Naukri
        </span>);
        }
        if (s.includes('greenhouse')) {
            return (<span className="text-[10px] font-semibold tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">
          Greenhouse
        </span>);
        }
        if (s.includes('lever')) {
            return (<span className="text-[10px] font-semibold tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded uppercase">
          Lever
        </span>);
        }
        if (s.includes('ashby')) {
            return (<span className="text-[10px] font-semibold tracking-wide text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase">
          Ashby
        </span>);
        }
        return (<span className="text-[10px] font-semibold tracking-wide text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase">
        {source}
      </span>);
    };
    const getCompanyInitials = (company) => {
        if (!company)
            return 'CO';
        return company
            .split(/\s+/)
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };
    return (<div className="w-full max-w-7xl mx-auto space-y-2.5 pb-16 font-sans">
      {/* ── 1. COMPACT HEADER SECTION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200/80">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Job &amp; Internship Feed
          </h1>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            • Real-time opportunities from LinkedIn, Naukri, Greenhouse, Lever &amp; Ashby
          </span>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowCustomScraper(!showCustomScraper)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs cursor-pointer transition-all">
            <PlusCircle className="w-3.5 h-3.5 text-slate-500"/>
            <span>Custom URL / JD</span>
          </button>

          {discoveredJobs.length > 0 && (<button onClick={onProceedToScoring} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#5B7BE8] hover:bg-[#3D5FD9] shadow-2xs cursor-pointer transition-all">
              <Sparkles className="w-3.5 h-3.5"/>
              <span>Batch Fit-Score ({discoveredJobs.length})</span>
              <ArrowRight className="w-3.5 h-3.5"/>
            </button>)}
        </div>
      </div>

      {/* Scrape Notifications */}
      {scrapeNotification && (<div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${scrapeNotification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
          <div className="flex items-center gap-2">
            {scrapeNotification.type === 'success' ? (<Check className="w-4 h-4 text-emerald-600 flex-shrink-0"/>) : (<AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0"/>)}
            <span className="font-medium">{scrapeNotification.message}</span>
          </div>
          <button onClick={() => setScrapeNotification(null)} className="text-xs font-bold text-slate-400 hover:text-slate-700 px-1 cursor-pointer">
            ✕
          </button>
        </div>)}

      {/* ── 2. COLLAPSIBLE CUSTOM JOB URL / JD PARSER ── */}
      {showCustomScraper && (<div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <LinkIcon className="w-3.5 h-3.5"/>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Custom Requisition Parser</h3>
                <p className="text-[11px] text-slate-500">
                  Parse any direct job URL (LinkedIn, Naukri, Greenhouse, Lever, Ashby) or paste raw text.
                </p>
              </div>
            </div>
            <button onClick={() => setShowCustomScraper(false)} className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer">
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Direct Job Link</label>
              <input type="url" value={customJobUrl} onChange={(e) => setCustomJobUrl(e.target.value)} placeholder="https://www.linkedin.com/jobs/view/... or Greenhouse link" className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"/>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Or Paste Description Text</label>
              <textarea value={customJobRawText} onChange={(e) => setCustomJobRawText(e.target.value)} placeholder="Paste role requirements, tech stack, and responsibilities here..." rows={2} className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white resize-none transition-all"/>
            </div>
          </div>

          {scraperErrorMsg && (<div className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500"/>
              <span>{scraperErrorMsg}</span>
            </div>)}

          {scraperSuccessMsg && (<div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500"/>
              <span>{scraperSuccessMsg}</span>
            </div>)}

          <div className="flex justify-end">
            <button onClick={handleScrapeCustomJob} disabled={isScrapingCustom || (!customJobUrl.trim() && !customJobRawText.trim())} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50">
              {isScrapingCustom ? (<>
                  <RotateCw className="w-3.5 h-3.5 animate-spin"/>
                  <span>Extracting Job Posting...</span>
                </>) : (<>
                  <Sparkles className="w-3.5 h-3.5"/>
                  <span>Parse &amp; Save Job</span>
                </>)}
            </button>
          </div>
        </div>)}

      {/* ── 3. UNIFIED COMMAND & SEARCH DECK (COMPACT & HIGHLY INTERACTIVE) ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-xs space-y-2">
        {/* Row 1: Unified Search Hero & Source Triggers */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
          {/* Main Integrated Search Bar */}
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center bg-slate-50/90 hover:bg-slate-50 border border-slate-200 rounded-xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all overflow-visible relative">
            {/* Target Role Input with Auto-Suggest */}
            <div className="flex-1 relative flex items-center min-w-0" ref={roleInputRef}>
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none"/>
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
                placeholder="Target role or keyword..."
                className="w-full pl-8 pr-2.5 h-9 text-xs text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none"
              />

              {/* Suggestions Dropdown */}
              {isRoleDropdownOpen && filteredRoleSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 rounded-xl shadow-xl z-40 overflow-hidden bg-white border border-slate-200 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>{role}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400"/>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Inline Divider */}
            <div className="hidden sm:block w-px h-5 bg-slate-200"/>

            {/* Location Input */}
            <div className="sm:w-52 relative flex items-center border-t sm:border-t-0 border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none"/>
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') startStreamSearch();
                }}
                placeholder="Location (e.g. India, Remote)..."
                className="w-full pl-8 pr-2.5 h-9 text-xs text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Search Submit Button */}
            <div className="p-1">
              <button
                type="button"
                onClick={() => startStreamSearch()}
                disabled={isSearching}
                className="w-full sm:w-auto px-3.5 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSearching ? (
                  <RotateCw className="w-3 h-3 animate-spin"/>
                ) : (
                  <Search className="w-3 h-3"/>
                )}
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Quick Source Triggers */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleScrapeLinkedInLive}
              disabled={isScrapingLinkedIn}
              className="flex items-center gap-1.5 px-2.5 h-9 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
            >
              <RotateCw className={`w-3 h-3 ${isScrapingLinkedIn ? 'animate-spin' : ''} text-[#0077b5]`}/>
              <span>LinkedIn</span>
            </button>

            <button
              onClick={handleScrapeNaukriLive}
              disabled={isScrapingNaukri}
              className="flex items-center gap-1.5 px-2.5 h-9 rounded-xl border border-slate-200 bg-white hover:bg-orange-50/50 hover:border-orange-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
            >
              <RotateCw className={`w-3 h-3 ${isScrapingNaukri ? 'animate-spin' : ''} text-orange-500`}/>
              <span>Naukri</span>
            </button>

            <button
              onClick={() => startStreamSearch()}
              disabled={isSearching || isScrapingLinkedIn || isScrapingNaukri}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
            >
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400"/>
              <span>All Sources</span>
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Filters & In-Feed Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
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
                  onClick={() => setTimeFilter(tab.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
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
                  onClick={() => setWorkplaceFilter(tab.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    workplaceFilter === tab.id
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Type Dropdown */}
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
              className="h-6 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-md text-[11px] font-medium cursor-pointer outline-none transition-colors"
            >
              <option value="any">Type: All</option>
              <option value="internship">Internship</option>
              <option value="fulltime">Full-Time</option>
              <option value="contract">Contract</option>
            </select>

            {/* Level Dropdown */}
            <select
              value={seniorityLevel}
              onChange={(e) => {
                setSeniorityLevel(e.target.value);
                setTimeout(() => startStreamSearch(), 50);
              }}
              className="h-6 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-md text-[11px] font-medium cursor-pointer outline-none transition-colors"
            >
              <option value="any">Level: All</option>
              <option value="internship">Intern</option>
              <option value="entry">Entry</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
            </select>

            {/* Batch Dropdown */}
            <select
              value={batchYear}
              onChange={(e) => {
                setBatchYear(e.target.value);
                setTimeout(() => startStreamSearch(), 50);
              }}
              className="h-6 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-md text-[11px] font-medium cursor-pointer outline-none transition-colors"
            >
              <option value="any">Batch: All</option>
              <option value="2028">2028</option>
              <option value="2027">2027</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>

            {/* Board Selector */}
            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="h-6 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-800 font-medium cursor-pointer outline-none transition-colors text-[11px]"
            >
              <option value="all">Board: All Sources</option>
              <option value="linkedin">LinkedIn</option>
              <option value="naukari">Naukri</option>
              <option value="greenhouse">Greenhouse</option>
              <option value="lever">Lever</option>
              <option value="ashby">Ashby</option>
              <option value="remoteok">RemoteOK</option>
              <option value="bookmarked">Saved Roles ({bookmarkedJobIds.size})</option>
            </select>

            {/* Few Applicants Toggle */}
            <button
              onClick={() => setLowApplicantsOnly(!lowApplicantsOnly)}
              className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                lowApplicantsOnly
                  ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <Flame className="w-2.5 h-2.5 text-amber-500" />
              <span>&lt; 10 Applicants ({categoryCounts.countLowApps})</span>
            </button>
          </div>

          {/* In-feed quick search + Sort */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-40">
              <Search className="w-2.5 h-2.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="In-feed filter..."
                className="w-full text-[11px] bg-slate-50 border border-slate-200 text-slate-900 rounded-md pl-6 pr-2 py-0.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-[11px] bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-slate-800 font-medium cursor-pointer outline-none"
            >
              <option value="newest">Sort: Newest</option>
              <option value="low_applicants">Fewest Apps</option>
              <option value="company">Company A-Z</option>
            </select>
          </div>
        </div>

        {/* Row 3: Quick Role Chips (Interactive Pill Buttons) */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] py-0.5 pt-1 border-t border-slate-100 scrollbar-none">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0 mr-1">
            Quick:
          </span>
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
          ].map((tag) => {
            const isRoleActive = searchRoles.toLowerCase() === tag.toLowerCase();
            const isLocActive = searchLocation.toLowerCase() === tag.toLowerCase();
            const isActive = isRoleActive || isLocActive;
            return (
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
                className={`px-2 py-0.5 rounded-md border text-[10px] font-medium transition-all cursor-pointer shrink-0 flex items-center gap-1 active:scale-95 ${
                  isActive
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold shadow-2xs'
                    : 'bg-slate-50/80 hover:bg-blue-50/40 border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-200'
                }`}
              >
                <span>{tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 5. LIVE STREAMING PROGRESS BANNER ── */}
      {isSearching && (<div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <RotateCw className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0"/>
            <div className="text-xs text-blue-950 font-medium">
              Streaming postings from {streamingSource || 'verified boards'}...{' '}
              <span className="font-bold">({streamStats.total} discovered)</span>
            </div>
          </div>
        </div>)}

      {/* ── 6. JOB CARDS GRID ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 px-1">
          {/* View Mode: All List / Live / Directory */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/90 shadow-2xs gap-0.5">
            <button
              type="button"
              onClick={() => setViewScope('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewScope === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All Roles</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                viewScope === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {categoryCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewScope('live')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewScope === 'live'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Verified Live</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                viewScope === 'live' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {categoryCounts.countLive}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewScope('queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewScope === 'queue'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-indigo-700'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-indigo-200" />
              <span>Curated Directory</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                viewScope === 'queue' ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {categoryCounts.countQueue}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {isLoadingQueue && (
              <span className="text-xs text-indigo-600 flex items-center gap-1">
                <RotateCw className="w-3 h-3 animate-spin" /> Loading roles...
              </span>
            )}
            <span>
              Showing <strong className="text-slate-900">{sortedJobs.length}</strong> matching roles
              {categoryCounts.countLive > 0 && (
                <span className="text-emerald-600 font-medium ml-1">
                  ({categoryCounts.countLive} Live • {categoryCounts.countQueue} Curated)
                </span>
              )}
            </span>
            <span>{sortBy === 'newest' ? 'Sorted: Newest' : 'Filtered Feed'}</span>
          </div>
        </div>

        {sortedJobs.length === 0 ? (<div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto"/>
            <h3 className="font-bold text-slate-900 text-sm">No postings matching active filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria or trigger live scraping above.
            </p>
            <button onClick={() => {
                setTimeFilter('all');
                setWorkplaceFilter('all');
                setLowApplicantsOnly(false);
                setSelectedSourceFilter('all');
                startStreamSearch();
            }} className="px-4 py-2 rounded-xl bg-[#5B7BE8] text-white text-xs font-semibold hover:bg-[#3D5FD9] transition-colors cursor-pointer shadow-xs">
              Search All Sources Now
            </button>
          </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedJobs.map((job, index) => {
                const isSaved = isBookmarked(job.id);
                const targetApplyUrl = getSafeJobApplyUrl(job);
                const skillsToShow = (job.skills && job.skills.length > 0)
                    ? job.skills.slice(0, 4)
                    : (job.tags || []).slice(0, 4);
                const hasExplicitSalary = Boolean(
                  job.salary &&
                  !job.salary.toLowerCase().includes('competitive') &&
                  !job.salary.toLowerCase().includes('market')
                );

                // Featured: every 3rd card or live jobs get premium gold treatment
                const isFeatured = index % 3 === 0 || job.isLive;

                // Skill chip colors cycling through soft accessible tones
                const chipColors = [
                  'bg-blue-50 text-blue-700 border-blue-200/70',
                  'bg-violet-50 text-violet-700 border-violet-200/70',
                  'bg-teal-50 text-teal-700 border-teal-200/70',
                  'bg-rose-50 text-rose-700 border-rose-200/70',
                ];

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 16, scale: 0.975 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.045, 0.28), ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -4, scale: 1.01, transition: { type: 'spring', stiffness: 340, damping: 24 } }}
                    whileTap={{ scale: 0.993 }}
                    onClick={() => {
                        setSelectedDrawerJob(job);
                        if (onSelectJobForDetail) onSelectJobForDetail(job);
                    }}
                    className={`relative rounded-2xl overflow-hidden cursor-pointer group flex flex-col justify-between transition-all duration-300
                      ${isFeatured
                        ? 'bg-gradient-to-br from-white via-amber-50/40 to-yellow-50/30 border-2 border-amber-300/60 shadow-[0_4px_24px_-4px_rgba(251,191,36,0.18),0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_40px_-8px_rgba(251,191,36,0.3),0_6px_16px_-4px_rgba(0,0,0,0.08)] hover:border-amber-400/80'
                        : 'bg-gradient-to-br from-white via-slate-50/80 to-blue-50/20 border border-slate-200/90 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_40px_-8px_rgba(59,130,246,0.18),0_6px_16px_-4px_rgba(59,130,246,0.06)] hover:border-blue-300/70'
                      }`}
                  >
                    {/* Featured: gold shimmer top bar */}
                    {isFeatured && (
                      <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
                    )}
                    {/* Regular: blue bar sweeps in on hover */}
                    {!isFeatured && (
                      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                    )}
                    {/* Ambient corner glow on hover */}
                    <div className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-0 group-hover:opacity-100 ${isFeatured ? 'bg-amber-300/20' : 'bg-blue-400/10'}`} />

                    <div className="relative p-4 space-y-3">
                      {/* Header: company logo + info + badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <motion.div
                            whileHover={{ scale: 1.08, rotate: -2 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className={`p-1.5 rounded-xl shrink-0 border shadow-sm transition-all duration-300
                              ${isFeatured
                                ? 'bg-white border-amber-200/80 group-hover:shadow-md group-hover:shadow-amber-200/50'
                                : 'bg-white border-slate-200/80 group-hover:shadow-md group-hover:shadow-blue-100/80'}`}
                          >
                            <CompanyIcon company={job.company} logoUrl={job.companyLogo} size={30}/>
                          </motion.div>
                          <div className="min-w-0">
                            {isFeatured && (
                              <motion.div
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(index * 0.045, 0.28) + 0.12 }}
                                className="inline-flex items-center gap-1 mb-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-yellow-400 shadow-sm"
                              >
                                <span className="text-[8.5px] font-black tracking-widest text-amber-900 uppercase">✦ Featured</span>
                              </motion.div>
                            )}
                            <h4 className={`text-xs font-bold tracking-tight truncate transition-colors ${isFeatured ? 'text-slate-800 group-hover:text-amber-700' : 'text-slate-800 group-hover:text-blue-600'}`}>
                              {job.company}
                            </h4>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium truncate mt-0.5">
                              <MapPin className="w-2.5 h-2.5 shrink-0"/>
                              <span className="truncate">{job.location || 'Remote / Worldwide'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                          {job.isLive ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300/80 px-2 py-0.5 rounded-full">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full">
                              <Briefcase className="w-2.5 h-2.5" />
                              Verified
                            </span>
                          )}
                          {getSourceBadge(job.source)}
                          {getFreshnessBadge(job)}
                          <motion.button
                            whileHover={{ scale: 1.22, rotate: 8 }}
                            whileTap={{ scale: 0.82 }}
                            onClick={(e) => { e.stopPropagation(); toggleBookmark(job.id); }}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-all cursor-pointer"
                            title={isSaved ? 'Remove from saved' : 'Save position'}
                          >
                            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 fill-amber-500"/> : <Bookmark className="w-3.5 h-3.5"/>}
                          </motion.button>
                        </div>
                      </div>

                      {/* Job Title */}
                      <div className="flex items-start justify-between gap-1">
                        <h3 className={`text-sm font-extrabold tracking-tight line-clamp-1 transition-colors ${isFeatured ? 'text-slate-900 group-hover:text-amber-800' : 'text-slate-900 group-hover:text-blue-700'}`}>
                          {job.title}
                        </h3>
                        <ArrowUpRight className={`w-3.5 h-3.5 shrink-0 opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300 ${isFeatured ? 'text-amber-500' : 'text-blue-500'}`} />
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {job.description || 'Verified engineering requisition available on official company career board.'}
                      </p>

                      {/* Skills Chips */}
                      {skillsToShow.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {skillsToShow.map((skill, idx) => (
                            <motion.span
                              key={idx}
                              whileHover={{ y: -2, scale: 1.08 }}
                              className={`px-2 py-0.5 rounded-lg text-[9.5px] font-semibold border transition-all cursor-default
                                ${isFeatured
                                  ? 'bg-amber-50 text-amber-800 border-amber-200/80 group-hover:bg-amber-100'
                                  : chipColors[idx % chipColors.length]}`}
                            >
                              {skill}
                            </motion.span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className={`px-4 pb-3.5 pt-2.5 border-t flex items-center justify-between gap-2 ${isFeatured ? 'border-amber-200/50 bg-amber-50/30' : 'border-slate-100 bg-slate-50/40'}`}>
                      <div>
                        {hasExplicitSalary ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {job.salary}
                          </span>
                        ) : (
                          <div className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-lg border ${isFeatured ? 'text-amber-700 bg-amber-50 border-amber-200/60' : 'text-slate-500 bg-slate-100/80 border-slate-200/60'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isFeatured ? 'bg-amber-400' : 'bg-blue-400'}`} />
                            <span>Direct Application</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {onSelectJobForTailoring && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => onSelectJobForTailoring(job)}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[10.5px] border transition-all flex items-center gap-1 cursor-pointer
                              ${isFeatured
                                ? 'bg-white text-amber-700 border-amber-300/80 hover:bg-amber-500 hover:text-white hover:border-transparent shadow-sm hover:shadow-md hover:shadow-amber-400/30'
                                : 'bg-white text-blue-600 border-blue-200/80 hover:bg-blue-600 hover:text-white hover:border-transparent shadow-sm hover:shadow-md hover:shadow-blue-400/30'}`}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Tailor</span>
                          </motion.button>
                        )}
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.94 }}
                          href={targetApplyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3 py-1 rounded-lg text-white font-bold text-[10.5px] flex items-center gap-1 transition-all cursor-pointer
                            ${isFeatured
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-md shadow-amber-300/30 hover:shadow-lg hover:shadow-amber-400/40'
                              : 'bg-gradient-to-r from-[#3D5FD9] to-[#5B7BE8] hover:from-[#2d4fc9] hover:to-[#4a6ad8] shadow-md shadow-blue-400/25 hover:shadow-lg hover:shadow-blue-500/35'}`}
                        >
                          <span>Apply Now</span>
                          <ExternalLink className="w-2.5 h-2.5"/>
                        </motion.a>
                      </div>
                    </div>
                  </motion.div>
                );
          </div>)}

      </div>


      {/* Slide-Over Detail Drawer */}
      <JobDetailDrawer job={selectedDrawerJob} isOpen={Boolean(selectedDrawerJob)} onClose={() => setSelectedDrawerJob(null)} resume={resume} onTailorJob={(j) => {
            setSelectedDrawerJob(null);
            if (onSelectJobForTailoring)
                onSelectJobForTailoring(j);
        }} isBookmarked={selectedDrawerJob ? isBookmarked(selectedDrawerJob.id) : false} onToggleBookmark={(id) => toggleBookmark(id)}/>
    </div>);
};

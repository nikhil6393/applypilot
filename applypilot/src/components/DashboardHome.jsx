import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Calendar,
  CheckCircle2,
  Bookmark,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Briefcase,
  Star,
  Award,
  Bell,
  Zap,
} from 'lucide-react';
import './DribbbleDashboard.css';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/appStore';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { getSafeJobApplyUrl } from '../utils/jobUtils';

export const DashboardHome = ({
  resume,
  discoveredJobs = [],
  fitResults = {},
  tailoredDocs = {},
  onNavigateToStep,
}) => {
  const { user, token } = useAuth();
  const {
    bookmarkedJobIds,
    appliedJobIds,
    setBookmarkedJobIds,
    setSelectedJob,
    addToast,
  } = useAppStore();
  const [trackerStats, setTrackerStats] = useState({});
  useEffect(() => {
    if (!token) return;
    fetch('/api/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data) => { if (data.success) setTrackerStats(data.data?.statusBreakdown || {}); })
      .catch(() => {});
  }, [token]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  const dashboardSkills = Array.isArray(resume?.skills)
    ? resume.skills.map((skill) => typeof skill === 'string' ? skill : skill?.name).filter(Boolean)
    : Object.values(resume?.skills || {}).flat().map((skill) => typeof skill === 'string' ? skill : skill?.name).filter(Boolean);
  const profileFields = [user?.name, user?.email, user?.phone || resume?.contact?.phone, user?.location || resume?.contact?.location, user?.roleTitle || resume?.targetRole, resume?.summary, dashboardSkills.length, resume?.experience?.length].filter(Boolean).length;
  const profileCompletion = Math.round((profileFields / 8) * 100);

  // Stats calculation
  const appliedCount = appliedJobIds?.size || 0;
  const savedCount = bookmarkedJobIds?.size || 0;

  // Use top real discovered jobs or curated fallback
  const displayJobs = React.useMemo(() => {
    if (discoveredJobs && discoveredJobs.length > 0) {
      const themes = ['logo-orange', 'logo-violet', 'logo-emerald', 'logo-blue'];
      return discoveredJobs.slice(0, 4).map((j, idx) => ({
        id: j.id || `disc-${idx}`,
        company: j.company || 'Company not provided',
        title: j.title || 'Untitled role',
        workplace: j.workplace || (j.isRemote ? 'Remote' : 'Workplace not provided'),
        roleType: j.roleType || 'Type not provided',
        location: j.location || 'Location not provided',
        exp: j.experienceLevel || 'Experience not provided',
        salary: j.salary || 'Salary not provided',
        posted: j.postedTime || 'Recently',
        logoTheme: themes[idx % themes.length],
        rawJob: j,
      }));
    }
    return [];
  }, [discoveredJobs]);

  const handleApplyClick = (job) => {
    if (job.rawJob && setSelectedJob) {
      setSelectedJob(job.rawJob);
      if (onNavigateToStep) onNavigateToStep('job_detail');
    } else if (onNavigateToStep) {
      onNavigateToStep('discovery');
    }
  };

  const handleBookmarkClick = async (e, job) => {
    e.stopPropagation();
    if (!token) return addToast?.({ title: 'Sign in required', message: 'Sign in to save jobs to your account.', type: 'error' });
    const raw = job.rawJob || job;
    const jobId = String(raw.id || job.id);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      if (bookmarkedJobIds?.has(job.id)) {
        const response = await fetch('/api/tracker?status=saved', { headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load saved jobs.');
        const record = (data.items || []).find((item) => String(item.jobId) === jobId);
        if (!record) throw new Error('Saved job was not found in your account.');
        const deleted = await fetch(`/api/tracker/${encodeURIComponent(record.id)}`, { method: 'DELETE', headers });
        if (!deleted.ok) throw new Error('Could not remove saved job.');
      } else {
        const applyUrl = getSafeJobApplyUrl(raw);
        if (!applyUrl || applyUrl === '#') throw new Error('A verified employer URL is required to save this job.');
        const response = await fetch('/api/tracker', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, jobTitle: raw.title || job.title, company: raw.company || job.company, applyUrl, status: 'saved' }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not save this job.');
      }
      const next = new Set(bookmarkedJobIds || []);
      if (next.has(job.id)) next.delete(job.id);
      else next.add(job.id);
      setBookmarkedJobIds?.(next);
      addToast?.({ title: next.has(job.id) ? 'Role saved' : 'Saved role removed', message: 'Your saved jobs are up to date.', type: 'success' });
    } catch (error) {
      addToast?.({ title: 'Saved jobs update failed', message: error.message, type: 'error' });
    }
  };

  return (
    <div className="dribbble-dashboard">
      <div className="dribbble-container">
        {/* ── 1. Hero Welcome Header with SheKunj Sunset Glow ── */}
        <motion.div
          className="dribbble-hero"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="dribbble-hero-left">
            <div className="dribbble-hero-avatar-wrap">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name || 'User'} className="dribbble-hero-avatar" />
              ) : (
                <div className="dribbble-hero-avatar-fallback">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="dribbble-hero-status-dot" title="Profile Active" />
            </div>

            <div className="dribbble-hero-titles">
              <h1>
                {greeting}, {firstName} 👋
              </h1>
              <p>Your personalized career progression and application overview for today.</p>
            </div>
          </div>

          <div className="dribbble-hero-actions">
            <button
              className="dribbble-btn-secondary"
              onClick={() => onNavigateToStep && onNavigateToStep('resume')}
            >
              Resume Studio
            </button>
            <button
              className="dribbble-btn-primary"
              onClick={() => onNavigateToStep && onNavigateToStep('discovery')}
            >
              Explore Job Feed
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* ── 2. Top Metric Cards (SheKunj Multi-Color Identity) ── */}
        <div className="dribbble-stats-grid">
          {/* Card 1: Applications Sent (SheKunj Sunset Orange) */}
          <motion.div
            className="dribbble-stat-card theme-orange"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            onClick={() => onNavigateToStep && onNavigateToStep('saved_jobs')}
          >
            <div className="dribbble-stat-header">
              <div className="dribbble-stat-icon-wrap">
                <Send className="w-5 h-5" />
              </div>
              <span className="dribbble-stat-pill">
                Tracker total
              </span>
            </div>
            <div className="dribbble-stat-body">
              <div className="dribbble-stat-number">
                <AnimatedNumber value={appliedCount} />
              </div>
              <div className="dribbble-stat-label">Applications Sent</div>
            </div>
          </motion.div>

          {/* Card 2: Interviews Scheduled (SheKunj Electric Violet) */}
          <motion.div
            className="dribbble-stat-card theme-violet"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <div className="dribbble-stat-header">
              <div className="dribbble-stat-icon-wrap">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="dribbble-stat-pill">
                {trackerStats.INTERVIEWING || 0} tracked
              </span>
            </div>
            <div className="dribbble-stat-body">
              <div className="dribbble-stat-number">
                <AnimatedNumber value={trackerStats.INTERVIEWING || 0} />
              </div>
              <div className="dribbble-stat-label">Interviews Scheduled</div>
            </div>
          </motion.div>

          {/* Card 3: Profile Match Strength (SheKunj Fresh Mint Teal) */}
          <motion.div
            className="dribbble-stat-card theme-emerald"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            onClick={() => onNavigateToStep && onNavigateToStep('scoring')}
          >
            <div className="dribbble-stat-header">
              <div className="dribbble-stat-icon-wrap">
                <Award className="w-5 h-5" />
              </div>
              <span className="dribbble-stat-pill">
                High Visibility
              </span>
            </div>
            <div className="dribbble-stat-body">
              <div className="dribbble-stat-number">
                <AnimatedNumber value={profileCompletion} suffix="%" />
              </div>
              <div className="dribbble-stat-label">Profile Strength</div>
            </div>
          </motion.div>

          {/* Card 4: Saved Roles (SheKunj Warm Golden Amber) */}
          <motion.div
            className="dribbble-stat-card theme-amber"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            onClick={() => onNavigateToStep && onNavigateToStep('saved_jobs')}
          >
            <div className="dribbble-stat-header">
              <div className="dribbble-stat-icon-wrap">
                <Bookmark className="w-5 h-5" />
              </div>
              <span className="dribbble-stat-pill">
                4 closing soon
              </span>
            </div>
            <div className="dribbble-stat-body">
              <div className="dribbble-stat-number">
                <AnimatedNumber value={savedCount} />
              </div>
              <div className="dribbble-stat-label">Saved Opportunities</div>
            </div>
          </motion.div>
        </div>

        {/* ── 3. Main Two-Column Layout ── */}
        <div className="dribbble-main-layout">
          {/* ── LEFT MAIN COLUMN ── */}
          <div className="dribbble-main-col">
            {/* 3A: Application Activity & Weekly Trends */}
            <motion.div
              className="dribbble-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.22 }}
            >
              <div className="dribbble-card-header">
                <div>
                  <h3 className="dribbble-card-title">Weekly Application Activity</h3>
                  <p className="dribbble-card-subtitle">Counts come from your application tracker.</p>
                </div>
                <div className="dribbble-chart-legend">
                  <span>
                    <span className="dribbble-legend-dot" style={{ background: '#ff6b35' }} /> Submissions
                  </span>
                </div>
              </div>

              <div className="dribbble-chart-wrap">
                <div className="dribbble-bar-group min-h-24 items-center justify-center">
                  <p className="text-sm text-slate-500">Weekly activity history is not available yet.</p>
                </div>

                <div className="dribbble-pipeline-grid">
                  <div className="dribbble-pipeline-box pipe-submitted">
                    <div className="dribbble-pipeline-num">{appliedCount}</div>
                    <div className="dribbble-pipeline-name">Submitted</div>
                  </div>
                  <div className="dribbble-pipeline-box pipe-review">
                    <div className="dribbble-pipeline-num">{trackerStats.VIEWED || 0}</div>
                    <div className="dribbble-pipeline-name">Under Review</div>
                  </div>
                  <div className="dribbble-pipeline-box pipe-interviews">
                    <div className="dribbble-pipeline-num">{trackerStats.INTERVIEWING || 0}</div>
                    <div className="dribbble-pipeline-name">Interviews</div>
                  </div>
                  <div className="dribbble-pipeline-box pipe-offers">
                    <div className="dribbble-pipeline-num">{trackerStats.OFFERED || 0}</div>
                    <div className="dribbble-pipeline-name">Offers</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 3B: Curated Opportunities List */}
            <motion.div
              className="dribbble-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.26 }}
            >
              <div className="dribbble-card-header">
                <div>
                  <h3 className="dribbble-card-title">Curated Opportunities</h3>
                  <p className="dribbble-card-subtitle">
                    Hand-picked positions matching your seniority and core skills
                  </p>
                </div>
                <button
                  className="dribbble-card-action-link"
                  onClick={() => onNavigateToStep && onNavigateToStep('discovery')}
                >
                  View All Roles ({discoveredJobs?.length || 0})
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="dribbble-jobs-list">
                {displayJobs.map((job) => {
                  const isSaved = bookmarkedJobIds?.has(job.id);
                  return (
                    <div
                      key={job.id}
                      className="dribbble-job-item"
                      onClick={() => handleApplyClick(job)}
                    >
                      <div className="dribbble-job-main">
                        <div className={`dribbble-company-logo ${job.logoTheme || 'logo-orange'}`}>
                          {job.company.charAt(0)}
                        </div>
                        <div className="dribbble-job-info">
                          <h4>{job.title}</h4>
                          <p>
                            {job.company} • {job.location}
                          </p>
                          <div className="dribbble-job-tags">
                            <span className="dribbble-job-tag tag-workplace">{job.workplace}</span>
                            <span className="dribbble-job-tag">{job.roleType}</span>
                            <span className="dribbble-job-tag tag-salary">{job.salary}</span>
                            <span className="dribbble-job-tag">{job.exp}</span>
                          </div>
                        </div>
                      </div>

                      <div className="dribbble-job-actions">
                        <button
                          className="dribbble-btn-icon"
                          title={isSaved ? 'Remove Bookmark' : 'Save Job'}
                          onClick={(e) => handleBookmarkClick(e, job)}
                          style={{
                            color: isSaved ? '#ea580c' : undefined,
                            background: isSaved ? '#fff7ed' : undefined,
                            borderColor: isSaved ? '#fed7aa' : undefined,
                          }}
                        >
                          <Bookmark
                            className="w-4 h-4"
                            fill={isSaved ? '#ea580c' : 'none'}
                          />
                        </button>
                        <button
                          className="dribbble-btn-apply"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyClick(job);
                          }}
                        >
                          View Role
                        </button>
                      </div>
                    </div>
                  );
                })}
                {displayJobs.length === 0 && <p className="p-4 text-sm text-slate-500">Search the job feed to see opportunities here.</p>}
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT SIDEBAR COLUMN ── */}
          <div className="dribbble-side-col">
            {/* Profile Overview Card */}
            <motion.div
              className="dribbble-card dribbble-profile-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.28 }}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'User'}
                  className="dribbble-profile-avatar-lg"
                />
              ) : (
                <div className="dribbble-profile-avatar-fallback-lg">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <h4 className="dribbble-profile-name">{user?.name || 'Your profile'}</h4>
              <p className="dribbble-profile-role">{user?.roleTitle || resume?.targetRole || 'Role not set'}</p>

              <div className="dribbble-profile-progress-wrap">
                <div className="dribbble-profile-progress-header">
                  <span>Profile Completion</span>
                  <span className="text-orange-600 font-extrabold">{profileCompletion}%</span>
                </div>
                <div className="dribbble-progress-track">
                  <div className="dribbble-progress-bar" style={{ width: `${profileCompletion}%` }} />
                </div>
              </div>

              <button
                className="dribbble-btn-secondary w-full justify-center"
                onClick={() => onNavigateToStep && onNavigateToStep('resume')}
              >
                Update Career Profile
              </button>
            </motion.div>

            {/* Upcoming Interviews & Schedule */}
            <motion.div
              className="dribbble-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.32 }}
            >
              <div className="dribbble-card-header">
                <div>
                  <h3 className="dribbble-card-title">Upcoming Schedule</h3>
                  <p className="dribbble-card-subtitle">Interviewing applications in your tracker</p>
                </div>
                <Calendar className="w-4 h-4 text-orange-500" />
              </div>

              <div className="dribbble-schedule-list">
                <p className="p-4 text-sm text-slate-500">Interview dates are not stored in the tracker yet.</p>
              </div>
            </motion.div>

            {/* Verified Skills */}
            <motion.div
              className="dribbble-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.36 }}
            >
              <div className="dribbble-card-header">
                <div>
                  <h3 className="dribbble-card-title">Core Competencies</h3>
                  <p className="dribbble-card-subtitle">Verified in your active profile</p>
                </div>
                <button
                  className="dribbble-card-action-link"
                  onClick={() => onNavigateToStep && onNavigateToStep('scoring')}
                >
                  Skill Studio
                </button>
              </div>

              <div className="dribbble-skill-cloud">
                {dashboardSkills.map((skill, index) => (
                  <span key={`${skill}-${index}`} className="dribbble-skill-pill chip-blue">
                    {skill}
                  </span>
                ))}
                {dashboardSkills.length === 0 && <p className="text-xs text-slate-500">Add skills to your profile to see them here.</p>}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardHome;

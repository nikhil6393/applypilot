import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './DashboardExact.css';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/appStore';
import { CompanyIcon } from './CompanyIcon';
import { Interactive3DTilt } from './3d/Interactive3DTilt';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { useCountUp } from '../hooks/useCountUp';

const DEFAULT_RECOMMENDED_JOBS = [
  {
    id: 'rec-msft',
    company: 'Microsoft',
    title: 'Software Engineer',
    workplace: 'Hybrid',
    roleType: 'Full-time',
    location: 'Bengaluru, India',
    exp: '3-5 yrs',
    salary: '₹ 12L – 18L',
  },
  {
    id: 'rec-amzn',
    company: 'Amazon',
    title: 'Frontend Developer',
    workplace: 'Remote',
    roleType: 'Full-time',
    location: 'Hyderabad, India',
    exp: '2-4 yrs',
    salary: '₹ 8L – 12L',
  },
  {
    id: 'rec-goog',
    company: 'Google',
    title: 'SDE I',
    workplace: 'Onsite',
    roleType: 'Full-time',
    location: 'Bengaluru, India',
    exp: '0-2 yrs',
    salary: '₹ 10L – 15L',
  },
  {
    id: 'rec-tcs',
    company: 'TCS',
    title: 'System Engineer',
    workplace: 'Hybrid',
    roleType: 'Full-time',
    location: 'Pune, India',
    exp: '1-3 yrs',
    salary: '₹ 6L – 10L',
  },
];

export const DashboardHome = ({
  resume,
  discoveredJobs = [],
  fitResults = {},
  tailoredDocs = {},
  onNavigateToStep,
}) => {
  const { user, updateProfile } = useAuth();
  const {
    bookmarkedJobIds,
    appliedJobIds,
    toggleBookmark,
    setSelectedJob,
    addToast,
    lastScraperSync,
    isScraperRunning,
    triggerScraperRun,
  } = useAppStore();
  const avatarInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/webp', 0.88);
          if (updateProfile) {
            updateProfile({ avatar: dataUrl }).then(() => {
              if (addToast) {
                addToast({
                  type: 'success',
                  title: 'Photo Updated',
                  message: 'Your profile picture has been saved to your account.',
                });
              }
            }).catch((err) => {
              console.error('Avatar upload error:', err);
            }).finally(() => {
              setIsUploadingAvatar(false);
            });
          } else {
            setIsUploadingAvatar(false);
          }
        }
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const navigate = (step) => {
    if (onNavigateToStep) onNavigateToStep(step);
  };

  const displayName = user?.name || resume?.basics?.name || 'Nikhil';
  const appliedCount = appliedJobIds?.size ?? 0;
  const savedCount = bookmarkedJobIds?.size ?? 0;
  const resumeScore = Math.round(
    resume?.atsScore?.overallScore ||
    resume?.atsScore ||
    (resume?.skills?.length ? Math.min(94, 65 + resume.skills.length * 2) : 78)
  );

  const displayRecommendedJobs = useMemo(() => {
    if (discoveredJobs && discoveredJobs.length > 0) {
      return discoveredJobs.slice(0, 4).map((j, idx) => ({
        id: j.id || `job-rec-${idx}`,
        company: j.company || 'Tech Corp',
        title: j.title || 'Software Engineer',
        workplace: j.remote ? 'Remote' : (j.workplace || 'Hybrid'),
        roleType: j.roleType || (j.isInternship ? 'Internship' : 'Full-time'),
        location: j.location || 'India',
        exp: j.experience || '0-2 yrs',
        salary: j.salary || '₹ 8L – 16L',
        rawJob: j,
      }));
    }
    return DEFAULT_RECOMMENDED_JOBS;
  }, [discoveredJobs]);

  const animatedResumeScore = useCountUp(resumeScore, 1400);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const greetIcon = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙';
  const firstName = String(displayName).trim().split(/\s+/)[0] || 'there';
  const prettyName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const heroStats = [
    { label: 'Applied Jobs', value: appliedCount, color: '#2563eb', bg: '#e4eefe', step: 'saved_jobs', icon: <path d="M6 3h12v18l-6-4.5L6 21z M9.5 8.5l2 2 3.5-4" /> },
    { label: 'Saved Jobs', value: savedCount, color: '#8b5cf6', bg: '#f3e9fe', step: 'saved_jobs', icon: <path d="M6 3h12v18l-6-4.5L6 21z" /> },
    { label: 'Skill Gaps', value: 2, color: '#d97706', bg: '#fdf1dd', step: 'scoring', icon: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /></> },
    { label: 'Profile Strength', value: resumeScore, suffix: '%', color: '#16a34a', bg: '#e4f6ec', step: 'resume', icon: <path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7z M9 12l2 2 4-4" /> },
  ];

  return (
    <main className="content">
      {/* ===== CENTER COLUMN ===== */}
      <div>
        {/* COMPACT HERO BANNER */}
        <section className="hero hero-compact">
          <div className="hero-copy">
            <div className="hero-greet">
              {greetIcon} {greeting}, {prettyName} 👋
            </div>
            <h1 className="hero-title">
              Better Skills. Bigger<br />Opportunities.
            </h1>
            <p className="hero-sub">
              Your personalized career dashboard to help you find the right jobs, build in-demand skills and grow faster.
            </p>

            <div className="hero-stats">
              {heroStats.map((s) => (
                <button key={s.label} type="button" className="hero-stat" onClick={() => navigate(s.step)}>
                  <span className="hs-ic" style={{ background: s.bg, color: s.color }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      {s.icon}
                    </svg>
                  </span>
                  <span className="hs-txt">
                    <b><AnimatedNumber value={s.value} suffix={s.suffix || ''} /></b>
                    <small>{s.label}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <motion.img
            src="/dashboard-hero.webp"
            alt="Career dashboard illustration"
            className="hero-img"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            draggable={false}
          />
        </section>

        {/* SKILL OVERVIEW + TOP CATEGORIES */}
        <div className="row2">
          <section className="card skill-card">
            <h2 className="sec">Skill Overview</h2>
            <p className="sub">Your current skills and how they match with industry demand.</p>
            <div className="skill-grid">
              <div className="panel">
                <div
                  className="donut-big transition-all duration-75"
                  style={{
                    background: `conic-gradient(#22c55e 0 ${animatedResumeScore}%, #e9edf5 ${animatedResumeScore}% 100%)`,
                  }}
                >
                  <div className="cnt">
                    <div className="pct"><AnimatedNumber value={resumeScore} suffix="%" /></div>
                    <div className="cap">Overall Match</div>
                  </div>
                </div>
                <div className="legend">
                  <div className="lg g"><span className="dot"></span>Matched Skills<b>34</b></div>
                  <div className="lg r"><span className="dot"></span>Missing Skills<b>16</b></div>
                  <div className="lg p"><span className="dot"></span>Optional Skills<b>5</b></div>
                </div>
                <div className="skill-actions">
                  <button className="vsg" onClick={() => navigate('scoring')}>
                    View Skill Gap
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="growth">
                <h4>Skill Growth</h4>
                <div className="g12"><AnimatedNumber value={12} prefix="+ " suffix="%" /></div>
                <div className="gcap">in last 3 months</div>
                <svg width="100%" height="110" viewBox="0 0 260 110" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#7c6cf6" stopOpacity=".28" />
                      <stop offset="1" stopColor="#7c6cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d="M6 78 36 72 66 64 96 68 126 56 156 60 186 42 216 34 252 18 V110 H6 Z"
                    fill="url(#ga)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                  <motion.path
                    d="M6 78 36 72 66 64 96 68 126 56 156 60 186 42 216 34 252 18"
                    fill="none"
                    stroke="#5b4df0"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                  <g fill="#fff" stroke="#5b4df0" strokeWidth="2">
                    <circle cx="6" cy="78" r="3.5" /><circle cx="36" cy="72" r="3.5" /><circle cx="66" cy="64" r="3.5" />
                    <circle cx="96" cy="68" r="3.5" /><circle cx="126" cy="56" r="3.5" /><circle cx="156" cy="60" r="3.5" />
                    <circle cx="186" cy="42" r="3.5" /><circle cx="216" cy="34" r="3.5" /><circle cx="252" cy="18" r="3.5" />
                  </g>
                </svg>
              </div>
            </div>
          </section>

          <section className="card cats">
            <h2 className="sec">Top Skill Categories</h2>
            <div style={{ marginTop: 8 }}>
              <div className="cat">
                <span className="ic" style={{ background: '#efeefe', color: '#5b4df0' }}>&lt;/&gt;</span>
                <span className="flex-1">Programming Languages</span>
                <span className="pct"><AnimatedNumber value={42} suffix="%" /></span>
              </div>
              <div className="cat">
                <span className="ic" style={{ background: '#f3e9fe', color: '#8b5cf6' }}>◫</span>
                <span className="flex-1">Frameworks &amp; Libraries</span>
                <span className="pct"><AnimatedNumber value={55} suffix="%" /></span>
              </div>
              <div className="cat">
                <span className="ic" style={{ background: '#fdf1dd', color: '#d97706' }}>⛁</span>
                <span className="flex-1">Data &amp; Databases</span>
                <span className="pct"><AnimatedNumber value={38} suffix="%" /></span>
              </div>
              <div className="cat">
                <span className="ic" style={{ background: '#e4f6ec', color: '#16a34a' }}>⚙</span>
                <span className="flex-1">Tools &amp; DevOps</span>
                <span className="pct"><AnimatedNumber value={28} suffix="%" /></span>
              </div>
              <div className="cat">
                <span className="ic" style={{ background: '#fde9f3', color: '#db2777' }}>✿</span>
                <span className="flex-1">System Design</span>
                <span className="pct"><AnimatedNumber value={25} suffix="%" /></span>
              </div>
            </div>
            <div className="vd">
              <button className="link" onClick={() => navigate('scoring')}>
                View Details
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </section>
        </div>

        {/* RECOMMENDED JOBS */}
        <section className="card jobs" style={{ padding: 18, marginTop: 18 }}>
          <div className="jobs-head">
            <div>
              <h2 className="sec">Recommended Job Opportunities</h2>
              <p className="sub">Based on your skills, profile and career preferences.</p>
            </div>
            <button className="link" onClick={() => navigate('discovery')}>
              View All Jobs
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <div className="jobs-grid">
            {displayRecommendedJobs.map((job) => (
              <div
                key={job.id}
                className="job cursor-pointer"
                onClick={() => {
                  if (job.rawJob && setSelectedJob) setSelectedJob(job.rawJob);
                  navigate('job_detail');
                }}
              >
                <div className="job-top">
                  <CompanyIcon company={job.company} size={22} />
                  <span className="co">{job.company}</span>
                  <button
                    className="bkm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (toggleBookmark) toggleBookmark(job.id);
                    }}
                    title="Bookmark Job"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={bookmarkedJobIds?.has(job.id) ? '#5b4df0' : 'none'}
                      stroke={bookmarkedJobIds?.has(job.id) ? '#5b4df0' : 'currentColor'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 3h12v18l-6-4.5L6 21z" />
                    </svg>
                  </button>
                </div>
                <h4>{job.title}</h4>
                <div className="jtags">
                  <span className="jtag g">{job.roleType}</span>
                  <span className="jtag b">{job.workplace}</span>
                </div>
                <div className="jloc">📍 {job.location} &nbsp;•&nbsp; {job.exp}</div>
                <div className="jsal">{job.salary}</div>
                <button
                  className="apl"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (job.rawJob && setSelectedJob) setSelectedJob(job.rawJob);
                    navigate('job_detail');
                  }}
                >
                  Apply Now
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12h15M13 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* LEARNING PATHS + SKILL GAP SUMMARY */}
        <div className="row3">
          <section className="card paths">
            <div className="jobs-head">
              <div>
                <h2 className="sec">Learning Paths</h2>
                <p className="sub">Personalized learning paths to bridge your skill gaps.</p>
              </div>
              <button className="link" onClick={() => navigate('scoring')}>
                View All Paths
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <div className="paths-grid">
              <div className="path" onClick={() => navigate('scoring')} title="View React learning path">
                <div className="path-top">
                  <span className="logo" style={{ background: '#e4f6ec' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#087ea4" strokeWidth="1.4">
                      <circle cx="12" cy="12" r="1.8" fill="#087ea4" stroke="none" />
                      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" />
                      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)" />
                      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)" />
                    </svg>
                  </span>
                  <div>
                    <b>React for Beginners</b>
                    <small>4 weeks • Beginner</small>
                  </div>
                </div>
                <div className="pbar">
                  <div className="track"><i style={{ width: '60%' }}></i></div>
                  <span>60%</span>
                </div>
              </div>

              <div className="path" onClick={() => navigate('scoring')} title="View System Design learning path">
                <div className="path-top">
                  <span className="logo" style={{ background: '#efeefe' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5b4df0" strokeWidth="1.6" strokeLinecap="round">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                  </span>
                  <div>
                    <b>System Design Basics</b>
                    <small>3 weeks • Intermediate</small>
                  </div>
                </div>
                <div className="pbar">
                  <div className="track"><i style={{ width: '40%' }}></i></div>
                  <span>40%</span>
                </div>
              </div>

              <div className="path" onClick={() => navigate('scoring')} title="View Node.js learning path">
                <div className="path-top">
                  <span className="logo" style={{ background: '#e4f6ec' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="#539e43" />
                      <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff" fontFamily="Inter,sans-serif">JS</text>
                    </svg>
                  </span>
                  <div>
                    <b>Node.js Development</b>
                    <small>4 weeks • Intermediate</small>
                  </div>
                </div>
                <div className="pbar">
                  <div className="track"><i style={{ width: '25%' }}></i></div>
                  <span>25%</span>
                </div>
              </div>

              <div className="path" onClick={() => navigate('scoring')} title="View AWS Cloud learning path">
                <div className="path-top">
                  <span className="logo" style={{ background: '#fdeee0' }}>
                    <svg width="26" height="18" viewBox="0 0 40 28">
                      <text x="20" y="12" textAnchor="middle" fontSize="9" fontWeight="800" fill="#232f3e" fontFamily="Inter,sans-serif">aws</text>
                      <path d="M8 18c4 3 8 4.5 12 4.5 4.4 0 8.5-1.6 11.8-3.8" fill="none" stroke="#FF9900" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M29.8 17.6l2 1.2-.4 2" fill="none" stroke="#FF9900" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <b>AWS Cloud Essentials</b>
                    <small>4 weeks • Beginner</small>
                  </div>
                </div>
                <div className="pbar">
                  <div className="track"><i style={{ width: '10%' }}></i></div>
                  <span>10%</span>
                </div>
              </div>
            </div>
          </section>

          <section className="card gap">
            <h2 className="sec">Skill Gap Summary</h2>
            <p className="sub">2 key areas need focus</p>
            <div style={{ marginTop: 6 }}>
              <div className="gap-row cursor-pointer" onClick={() => navigate('scoring')} title="Analyze System Design gap">
                <span className="ic" style={{ background: '#fde9f3' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 8.7l5.4-.8z" />
                  </svg>
                </span>
                <div>
                  <b>System Design</b>
                  <small>You are 2 levels behind</small>
                </div>
                <span className="chip high">● High</span>
              </div>
              <div className="gap-row cursor-pointer" onClick={() => navigate('scoring')} title="Analyze DSA gap">
                <span className="ic" style={{ background: '#fdf1dd' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 8.7l5.4-.8z" />
                  </svg>
                </span>
                <div>
                  <b>Data Structures &amp; Algorithms</b>
                  <small>You are 1 level behind</small>
                </div>
                <span className="chip med">● Medium</span>
              </div>
            </div>
            <button className="gap-btn" onClick={() => navigate('scoring')}>
              View Detailed Analysis
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </section>
        </div>
      </div>

      {/* ===== RIGHT RAIL ===== */}
      <aside className="rail">
        {/* Your Profile */}
        <Interactive3DTilt maxTilt={5} scale={1.015} glare={true} glareOpacity={0.12}>
          <div className="card rc h-full">
            <div className="rhead">
              <h2 className="sec">Your Profile</h2>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8a8fa8" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M9.5 9.3a2.5 2.5 0 0 1 4.9.6c0 1.6-2.4 1.9-2.4 3.1" />
                <circle cx="12" cy="16.4" r=".4" fill="#8a8fa8" />
              </svg>
            </div>
            <p className="sub">Complete your profile to get better recommendations.</p>
            <div className="pf-top">
              <div
                className="relative group cursor-pointer shrink-0"
                onClick={() => avatarInputRef.current?.click()}
                title="Click to upload profile photo"
              >
                <img
                  className="av ring-2 ring-indigo-500/30 group-hover:ring-indigo-500 transition-all object-cover rounded-full"
                  src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                  alt={user?.name || displayName}
                  style={{ width: 46, height: 46 }}
                />
                <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </div>
              <div>
                <b>{user?.name || displayName}</b>
                <span>{user?.roleTitle || user?.targetRole || 'Software Developer'}</span>
              </div>
            </div>
            <div className="rlabel">
              <span>Profile Strength</span>
              <b><AnimatedNumber value={resumeScore} suffix="%" /></b>
            </div>
            <div className="bar">
              <i style={{ width: `${animatedResumeScore}%`, background: 'linear-gradient(90deg,#60a5fa,#3b82f6)', transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}></i>
            </div>
            <button className="link cpl" onClick={() => navigate('settings')}>
              Edit Profile
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </Interactive3DTilt>

        {/* Your Progress */}
        <Interactive3DTilt maxTilt={5} scale={1.015} glare={true} glareOpacity={0.12}>
          <div className="card rc h-full">
            <div className="rhead">
              <h2 className="sec">Your Progress</h2>
              <button className="link" onClick={() => navigate('analytics')}>
                View Details
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <div className="donuts">
              <div className="donut">
                <div className="ring" style={{ background: `conic-gradient(#22c55e 0 ${Math.min(100, appliedCount * 12)}%,#e9edf5 ${Math.min(100, appliedCount * 12)}% 100%)` }}>
                  <span className="pct"><AnimatedNumber value={Math.min(100, appliedCount * 12)} suffix="%" /></span>
                </div>
                <small>Jobs<br />Completed</small>
              </div>
              <div className="donut">
                <div className="ring" style={{ background: `conic-gradient(#10b981 0 ${resumeScore}%,#e9edf5 ${resumeScore}% 100%)` }}>
                  <span className="pct"><AnimatedNumber value={resumeScore} suffix="%" /></span>
                </div>
                <small>Resume<br />Optimized</small>
              </div>
              <div className="donut">
                <div className="ring" style={{ background: `conic-gradient(#38bdf8 0 ${Math.min(95, 55 + (resume?.skills?.length || 4) * 4)}%,#e9edf5 ${Math.min(95, 55 + (resume?.skills?.length || 4) * 4)}% 100%)` }}>
                  <span className="pct"><AnimatedNumber value={Math.min(95, 55 + (resume?.skills?.length || 4) * 4)} suffix="%" /></span>
                </div>
                <small>Skills<br />Improved</small>
              </div>
              <div className="donut">
                <div className="ring" style={{ background: `conic-gradient(#f43f5e 0 ${Math.min(100, appliedCount * 10)}%,#e9edf5 ${Math.min(100, appliedCount * 10)}% 100%)` }}>
                  <span className="pct"><AnimatedNumber value={Math.min(100, appliedCount * 10)} suffix="%" /></span>
                </div>
                <small>Applications<br />Sent</small>
              </div>
            </div>
          </div>
        </Interactive3DTilt>

        {/* Quick Actions */}
        <Interactive3DTilt maxTilt={5} scale={1.015} glare={true} glareOpacity={0.12}>
          <div className="card rc h-full">
          <h2 className="sec">Quick Actions</h2>
          <div className="qa-grid">
            <div className="qa" onClick={() => navigate('discovery')}>
              <span className="ic" style={{ background: '#e4eefe' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.8-3.8" />
                </svg>
              </span>
              <div>
                <b>Explore Jobs</b>
                <span>Find your next role</span>
              </div>
            </div>
            <div className="qa" onClick={() => navigate('scoring')}>
              <span className="ic" style={{ background: '#fde9f3' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="m15.5 8.5-2 5-5 2 2-5z" />
                </svg>
              </span>
              <div>
                <b>Check Skill Gap</b>
                <span>Know what to learn</span>
              </div>
            </div>
            <div className="qa" onClick={() => navigate('resume')}>
              <span className="ic" style={{ background: '#e4eefe' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="3" width="14" height="18" rx="3" />
                  <path d="M9 8h6M9 12h6M9 16h3" />
                </svg>
              </span>
              <div>
                <b>Tailor Resume</b>
                <span>Make it job specific</span>
              </div>
            </div>
            <div className="qa cursor-pointer" onClick={() => navigate('saved_jobs')}>
              <span className="ic" style={{ background: '#f3e9fe' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7v5l3.5 2" />
                </svg>
              </span>
              <div>
                <b>Track Applications</b>
                <span>View your progress</span>
              </div>
            </div>
          </div>
        </div>
      </Interactive3DTilt>

        {/* Recent Activity */}
        <div className="card rc">
          <div className="rhead">
            <h2 className="sec">Recent Activity</h2>
            <button className="link" onClick={() => navigate('saved_jobs')}>
              View All
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <div className="acts">
            <div className="act cursor-pointer" onClick={() => navigate('saved_jobs')} title="View applied jobs">
              <span className="ic" style={{ background: '#eef0fd', color: '#5b4df0' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 3 10 14" />
                  <path d="M21 3 14 21l-4-7-7-4z" />
                </svg>
              </span>
              <div>
                <p>Applied to {appliedCount > 0 ? `${appliedCount} verified position${appliedCount > 1 ? 's' : ''}` : 'Software Developer role'}</p>
                <time>Active in Tracker</time>
              </div>
            </div>
            <div className="act cursor-pointer" onClick={() => navigate('saved_jobs')} title="View saved bookmarks">
              <span className="ic" style={{ background: '#fde9f3', color: '#db2777' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 2.5c0 4-4 7.5-9 11.5z" />
                </svg>
              </span>
              <div>
                <p>{savedCount > 0 ? `${savedCount} job${savedCount > 1 ? 's' : ''} saved in shortlist` : 'Saved jobs ready for review'}</p>
                <time>Shortlist ready</time>
              </div>
            </div>
            <div className="act cursor-pointer" onClick={() => navigate('scoring')} title="View skill gap assessment">
              <span className="ic" style={{ background: '#e4f6ec', color: '#16a34a' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="7" width="18" height="13" rx="3" />
                  <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  <path d="m9.5 13.5 2 2 3.5-4" />
                </svg>
              </span>
              <div>
                <p>Skill gap analysis evaluated</p>
                <time>Targeting Top Companies</time>
              </div>
            </div>
            <div className="act cursor-pointer" onClick={() => navigate('resume')} title="View resume ATS score">
              <span className="ic" style={{ background: '#e4eefe', color: '#2563eb' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="3" width="14" height="18" rx="3" />
                  <path d="M9 8h6M9 12h6M9 16h3" />
                </svg>
              </span>
              <div>
                <p>Resume ATS Score: {resumeScore}%</p>
                <time>Synced with profile</time>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Indexer Engine Status */}
        <div className="card rc" style={{ background: 'linear-gradient(135deg, #fafbfe 0%, #f4f6fe 100%)', border: '1px solid #dfe3f5' }}>
          <div className="rhead">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)' }} />
              <h2 className="sec" style={{ fontSize: 13 }}>Live Scraper Engine</h2>
            </div>
            <button className="link" onClick={() => navigate('scraper_status')}>
              Manage
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <p className="sub" style={{ fontSize: 11, marginTop: 4 }}>8 active adapters monitoring LinkedIn, YC, Greenhouse &amp; Naukri.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '9px 12px', background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
            <div>
              <small style={{ fontSize: 10, color: 'var(--muted)', display: 'block' }}>Last Sync</small>
              <b style={{ fontSize: 12, color: 'var(--ink)' }}>{lastScraperSync || 'Just now'}</b>
            </div>
            <button
              type="button"
              onClick={() => {
                if (triggerScraperRun) triggerScraperRun('all');
              }}
              disabled={isScraperRunning}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #d4d0f9',
                background: isScraperRunning ? '#f3f4f6' : '#efeefe',
                color: 'var(--primary)',
                cursor: isScraperRunning ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              {isScraperRunning ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

      </aside>
    </main>
  );
};

export default DashboardHome;

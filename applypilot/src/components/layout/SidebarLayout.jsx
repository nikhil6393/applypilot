import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../store/appStore';
import { Menu, X } from 'lucide-react';
import '../DashboardExact.css';

/* ---------------- Sidebar Component ---------------- */
function Sidebar({ currentScreen, onSelectScreen, onClose, jobCount, className = '', isMobile = false }) {
  const { notifications, setIsNotificationDrawerOpen } = useAppStore();
  const navItems = [
    {
      id: 'analytics',
      label: 'Dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      ),
    },
    {
      id: 'discovery',
      label: 'Job Feed',
      badge: jobCount ? String(jobCount) : null,
      badgeClass: 'pur',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="6" width="18" height="14" rx="3" />
          <circle cx="12" cy="12.5" r="3" />
          <path d="M8.5 6l1.2-2h4.6l1.2 2" />
        </svg>
      ),
    },
    {
      id: 'scoring',
      label: 'Skill Gap',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      id: 'resume',
      label: 'Resume Studio',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M14.5 7.5l2 2L10 16l-2.6.6L8 14z" />
        </svg>
      ),
    },
    {
      id: 'saved_jobs',
      label: 'Saved Jobs',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12v18l-6-4.5L6 21z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09c-.68 0-1.3.4-1.51.97z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className={`sidebar ${className} ${isMobile ? 'is-mobile-drawer' : ''}`}>
      <div className="brand cursor-pointer" onClick={() => { onSelectScreen('analytics'); if (onClose) onClose(); }}>
        <img
          src="/applypilot-logo.png"
          alt="ApplyPilot"
          style={{ width: 34, height: 34, objectFit: 'contain' }}
          className="shrink-0 drop-shadow-[0_2px_8px_rgba(59,109,247,0.25)]"
        />
        <span className="brand-name">
          Apply<span>Pilot</span>
        </span>
        <span className="pro">ACCOUNT</span>
        {onClose && (
          <button onClick={onClose} aria-label="Close navigation" className="ml-auto text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="nav">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id || (currentScreen === 'analytics' && item.id === 'analytics');
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectScreen(item.id);
                if (onClose) onClose();
              }}
              className={isActive ? 'active' : ''}
            >
              {item.icon}
              {item.label}
              {item.badge && <span className={`badge ${item.badgeClass}`}>{item.badge}</span>}
            </button>
          );
        })}
      </nav>
      <button type="button" onClick={() => setIsNotificationDrawerOpen(true)} className="mx-4 mb-3 rounded-xl border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
        Notifications{notifications.some((item) => !item.read) ? ` (${notifications.filter((item) => !item.read).length} unread)` : ''}
      </button>

      <div className="p-4 mt-auto rounded-2xl bg-gradient-to-br from-orange-50/70 via-white to-purple-50/40 border border-orange-200/80 shadow-sm text-left">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-orange-500/25">
              AP
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Career tools</div>
              <div className="text-[10.5px] text-slate-500 font-semibold">Workspace</div>
            </div>
          </div>
          <p className="text-[11.5px] text-slate-600 mb-3 leading-relaxed">
            Tailor resumes, track applications & discover verified jobs.
          </p>
          <button
            onClick={() => onSelectScreen('resume')}
            className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/30 cursor-pointer"
          >
            <span>Resume Studio</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
    </aside>
  );
}

/* ---------------- Topbar Component ---------------- */
function Topbar({ currentScreen, onOpenMobile, onSearch, onSelectScreen }) {
  const { user } = useAuth();
  const { notifications, setIsNotificationDrawerOpen } = useAppStore();
  const userName = user?.name || 'Account';
  const [query, setQuery] = useState('');

  const SCREEN_INFO = {
    analytics: { title: 'Dashboard', sub: 'Performance & job market intelligence', icon: '📊' },
    discovery: { title: 'Job Feed', sub: 'Live scraped job & internship requisitions', icon: '💼' },
    scoring: { title: 'Skill Gap Analysis', sub: 'Target role benchmarking & match analysis', icon: '🎯' },
    resume: { title: 'Resume Studio', sub: 'Deterministic LaTeX tailoring & ATS scanner', icon: '📄' },
    tailor: { title: 'Resume Studio', sub: 'Zero-hallucination bullet customization', icon: '📄' },
    saved_jobs: { title: 'Saved Jobs', sub: 'Your shortlisted opportunities pipeline', icon: '⭐' },
    settings: { title: 'Profile Settings', sub: 'Preferences, career goals & guardrails', icon: '⚙️' },
    profile_settings: { title: 'Profile Settings', sub: 'Preferences, career goals & guardrails', icon: '⚙️' },
    scraper_status: { title: 'Live Scrapers', sub: 'Real-time daemon synchronization telemetry', icon: '⚡' },
    job_detail: { title: 'Job Details', sub: 'Comprehensive breakdown and tailor preview', icon: '🔍' },
  };

  const activeInfo = SCREEN_INFO[currentScreen] || { title: 'Workspace', sub: 'ApplyPilot career automation', icon: '🚀' };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      if (onSearch) onSearch(query.trim());
      if (onSelectScreen) onSelectScreen('discovery');
    }
  };

  return (
    <header className="topbar lg:hidden">
      <div className="flex items-center gap-3">
        {onOpenMobile && (
          <button
            onClick={onOpenMobile}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="text-sm font-bold text-slate-800">ApplyPilot</span>
      </div>

      <div className="top-right flex items-center gap-2.5">
        <button
          className="bell"
          onClick={() => setIsNotificationDrawerOpen(true)}
          title="Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9" />
            <path d="M10 20a2.2 2.2 0 0 0 4 0" />
          </svg>
          {notifications.some((item) => !item.read) && <span className="dot" />}
        </button>
        <div
          className="user cursor-pointer flex items-center gap-2 px-2 py-1 rounded-full hover:bg-slate-100/80 transition-colors"
          onClick={() => onSelectScreen && onSelectScreen('settings')}
          title="Account Settings"
        >
          {user?.avatar ? <img className="av object-cover rounded-full ring-2 ring-indigo-500/20 shrink-0" src={user.avatar} alt={userName} style={{ width: 32, height: 32 }} /> : <span className="av rounded-full ring-2 ring-indigo-500/20 shrink-0 flex items-center justify-center" aria-label={userName}>{userName.charAt(0).toUpperCase()}</span>}
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════ MAIN SIDEBAR LAYOUT ═══════════════════ */
export function SidebarLayout({
  currentScreen,
  onSelectScreen,
  onSearch,
  jobCount,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="exact-dashboard-wrapper relative min-h-screen" style={{ background: "var(--bg, #FAFAFA)", color: "var(--ink, #0D0D12)" }}>
      {/* Landing Page Ambient Aurora Mesh & Subtle Dot-Grid */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="aurora-blob aurora-blob-1" style={{ top: "-10%", left: "15%", opacity: 0.55 }} />
        <div className="aurora-blob aurora-blob-2" style={{ top: "35%", right: "-8%", opacity: 0.5 }} />
        <div className="aurora-blob aurora-blob-3" style={{ bottom: "-10%", left: "30%", opacity: 0.45 }} />
        <div className="dot-grid absolute inset-0 opacity-30" />
      </div>

      <div className="app relative z-10" style={{ background: "transparent" }}>
        {/* Desktop Sidebar */}
        <Sidebar
          currentScreen={currentScreen}
          onSelectScreen={onSelectScreen}
          jobCount={jobCount}
          className="desktop-sidebar hidden lg:flex"
        />

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed left-0 top-0 bottom-0 z-50 lg:hidden bg-white shadow-2xl w-[270px] max-w-[85vw]"
              >
                <Sidebar
                  currentScreen={currentScreen}
                  onSelectScreen={onSelectScreen}
                  onClose={() => setMobileOpen(false)}
                  jobCount={jobCount}
                  isMobile={true}
                  className="mobile-sidebar flex"
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Area */}
        <div className="main">
          <Topbar
            currentScreen={currentScreen}
            onOpenMobile={() => setMobileOpen(true)}
            onSearch={onSearch}
            onSelectScreen={onSelectScreen}
          />
          {children}
        </div>
      </div>
    </div>
  );
}

export default SidebarLayout;

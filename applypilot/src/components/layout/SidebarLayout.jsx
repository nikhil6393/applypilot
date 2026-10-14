import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Menu, X } from 'lucide-react';
import { Interactive3DTilt } from '../3d/Interactive3DTilt';
import '../DashboardExact.css';

/* ---------------- Sidebar Component ---------------- */
function Sidebar({ currentScreen, onSelectScreen, onClose, jobCount, className = '', isMobile = false }) {
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
      badge: jobCount ? String(jobCount) : '49',
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
      badge: 'New',
      badgeClass: 'green',
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
      badge: '12',
      badgeClass: 'pur',
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
        <span className="pro">PRO</span>
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

      {/* When on Skill Gap screen, show exact gapcard from design */}
      {currentScreen === 'scoring' ? (
        <Interactive3DTilt maxTilt={7} scale={1.02} glare={true} glareOpacity={0.15}>
          <div className="gapcard">
            <svg className="dart" viewBox="0 0 110 110">
              <path d="M18 96 56 58" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity=".9" />
              <circle cx="62" cy="48" r="26" fill="rgba(255,255,255,.16)" />
              <circle cx="62" cy="48" r="17" fill="#fff" />
              <circle cx="62" cy="48" r="9.5" fill="#7c6cf6" />
              <circle cx="62" cy="48" r="3.5" fill="#fff" />
              <path d="M62 48 44 30" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
              <path d="M40 24l7 1.4-2.6 7.2-4.4-4.2z" fill="#ef4444" />
              <path d="M20 22l1.8 3.8 3.8 1.8-3.8 1.8-1.8 3.8-1.8-3.8-3.8-1.8 3.8-1.8z" fill="#fff" opacity=".85" />
              <path d="M92 24l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z" fill="#fff" opacity=".6" />
            </svg>
            <h4>
              Close the<br />Skill Gap
            </h4>
            <div className="tag">Get hired faster!</div>
            <p>Find what skills you're missing, see top companies, and get personalized learning paths.</p>
            <button className="exp" onClick={() => onSelectScreen('scoring')}>
              Explore Learning
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </Interactive3DTilt>
      ) : (
        <Interactive3DTilt maxTilt={7} scale={1.02} glare={true} glareOpacity={0.15}>
          <div className="level">
            <svg className="rocket" viewBox="0 0 90 90">
              <path d="M30 62 14 78" stroke="#c9c2fa" strokeWidth="3" strokeLinecap="round" />
              <path d="M20 58c10-26 30-40 52-44-2 22-14 44-38 54z" fill="#fff" />
              <path d="M20 58c10-26 30-40 52-44-1 11-4.5 22-11 32L34 62z" fill="#e8e5fb" />
              <circle cx="55" cy="32" r="6.5" fill="#5b4df0" /><circle cx="55" cy="32" r="3" fill="#fff" />
              <path d="M20 58c-7-1-12 1-14 8 7 2 12 0 14-8z" fill="#f97316" />
              <path d="M42 64c-4 2-6 6-5 12 6-1 9-5 5-12z" fill="#fb923c" />
              <circle cx="16" cy="24" r="2.4" fill="#fff" opacity=".85" />
              <circle cx="30" cy="12" r="1.8" fill="#fff" opacity=".7" />
              <path d="M78 56l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6z" fill="#fff" opacity=".9" />
            </svg>
            <h4>
              Level Up<br />Your Career
            </h4>
            <p>Better skills. Stronger resume. Higher chances.</p>
            <button className="plans" onClick={() => onSelectScreen('resume')}>
              Explore Plans
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </Interactive3DTilt>
      )}
    </aside>
  );
}

/* ---------------- Topbar Component ---------------- */
function Topbar({ onOpenMobile, onSearch, onSelectScreen }) {
  const { user } = useAuth();
  const userName = user?.name && user.name !== 'Alex Chen' ? user.name : 'Nikhil K';
  const [query, setQuery] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      if (onSearch) onSearch(query.trim());
      if (onSelectScreen) onSelectScreen('discovery');
    }
  };

  return (
    <header className="topbar">
      {onOpenMobile && (
        <button onClick={onOpenMobile} className="lg:hidden p-1.5 rounded-xl border border-[#e8eaf3] bg-white text-[#565b78]">
          <Menu className="w-5 h-5" />
        </button>
      )}
      <div className="flex-1" />
      <div className="top-right">
        <button className="bell" onClick={() => onSelectScreen && onSelectScreen('analytics')}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9" />
            <path d="M10 20a2.2 2.2 0 0 0 4 0" />
          </svg>
          <span className="dot">3</span>
        </button>
        <div className="user cursor-pointer" onClick={() => onSelectScreen && onSelectScreen('settings')}>
          <img
            className="av object-cover rounded-full ring-1 ring-slate-200"
            src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
            alt={userName}
            style={{ width: 36, height: 36 }}
          />
          <b>{userName}</b>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8a8fa8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
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
    <div className="exact-dashboard-wrapper relative">
      {/* 3D Kinetic Ambient Background */}

      <div className="app relative z-10">
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

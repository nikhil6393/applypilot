import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Sparkles, BarChart3, Zap, Settings, ChevronRight, Bookmark, Bell, Shield, } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/appStore';
import { ApplyPilotLogo } from './ApplyPilotLogo';
export const Navbar = ({ currentStep, onSelectStep, jobCount, scoredCount, tailoredCount, }) => {
  const { user, setIsAuthModalOpen, setIsSettingsModalOpen, setAuthModalTab } = useAuth();
  const { notifications, setIsNotificationDrawerOpen, bookmarkedJobIds, setAppMode, isScraperRunning, } = useAppStore();
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const navItems = [
    { id: 'analytics', label: 'Dashboard', icon: BarChart3 },
    { id: 'discovery', label: 'Job Feed', icon: Search, badge: jobCount > 0 ? jobCount : undefined, liveDot: true },
    { id: 'scoring', label: 'Fit Score', icon: Zap, badge: scoredCount > 0 ? scoredCount : undefined },
    { id: 'tailor', label: 'Bulk Tailor', icon: Sparkles, badge: tailoredCount > 0 ? tailoredCount : undefined },
    { id: 'saved_jobs', label: 'Saved', icon: Bookmark, badge: bookmarkedJobIds.size > 0 ? bookmarkedJobIds.size : undefined },
  ];
  return (<motion.header initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }} className="sticky top-1.5 z-40 px-3 mb-2">
    <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-2xl bg-white/90 border border-slate-200/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-colors duration-200">
      {/* Brand Emblem */}
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} id="nav-logo-btn" onClick={() => onSelectStep(currentStep === 'landing' ? 'analytics' : 'landing')} className="flex items-center gap-2 group flex-shrink-0 cursor-pointer" title="JobPulse Telemetry Platform">
        <ApplyPilotLogo size={36} showText={true} badgeText="PRO" />
      </motion.button>

      {/* Clean Segmented Navigation */}
      <nav className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 border border-slate-200/60">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentStep === item.id;
          return (<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} key={item.id} id={`nav-step-${item.id}`} onClick={() => onSelectStep(item.id)} className={`relative px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${isActive
            ? 'text-slate-900 font-semibold'
            : 'text-slate-600 hover:text-slate-900'}`}>
            {isActive && (<motion.div layoutId="activeNavTab" className="absolute inset-0 rounded-lg bg-white border border-slate-200/80 shadow-xs" transition={{ type: 'spring', stiffness: 450, damping: 32 }} />)}
            <Icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? 'text-[#5B7BE8]' : 'text-slate-400'}`} />
            <span className="relative z-10 whitespace-nowrap">{item.label}</span>

            {/* Scraper Live pulsing green dot next to "Jobs" nav item as requested in prompt */}
            {item.liveDot && (<span className="relative z-10 w-2 h-2 rounded-full bg-[#10B981] animate-pulse" title="Real-time scraper stream active" />)}

            {item.badge !== undefined && (<span className={`ml-0.5 text-[10px] font-sans font-semibold px-1.5 py-0.2 rounded-full relative z-10 ${isActive
              ? 'bg-[#EEF2FF] text-[#3D5FD9]'
              : 'bg-white border border-slate-200/80 text-slate-500'}`}>
              {item.badge}
            </span>)}
          </motion.button>);
        })}
      </nav>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Resume Studio Quick Access */}
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} id="header-resume-studio-btn" onClick={() => onSelectStep('resume')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${currentStep === 'resume'
          ? 'bg-[#EEF2FF] text-[#3D5FD9] border border-[#5B7BE8]/25 shadow-xs font-bold'
          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'}`}>
          <FileText className="w-3.5 h-3.5 text-[#5B7BE8]" />
          <span className="hidden sm:inline">Resume Studio</span>
        </motion.button>

        {/* Notifications Bell */}
        <button onClick={() => setIsNotificationDrawerOpen(true)} className="relative p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-600 transition-colors cursor-pointer" title="Telemetry notifications">
          <Bell className="w-3.5 h-3.5" />
          {unreadNotifs > 0 && (<span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F43F5E] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
            {unreadNotifs}
          </span>)}
        </button>

        {/* Switch to Admin Portal Button (Restricted to Administrators) */}
        {user?.role === 'admin' && (<button onClick={() => {
          window.location.hash = 'admin/admin_dashboard';
          setAppMode('admin');
        }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer" title="Switch to Admin Management Portal">
          <Shield className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="hidden md:inline">Admin</span>
        </button>)}

        {/* User Profile & Settings */}
        {user ? (<motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} id="header-profile-settings-btn" type="button" onClick={() => setIsSettingsModalOpen(true)} className="flex items-center gap-2 p-1 pr-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 shadow-2xs transition-all cursor-pointer group" title="Profile & Settings">
          <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-lg object-cover border border-[#5B7BE8]/20" onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%235B7BE8"/><circle cx="50" cy="38" r="18" fill="%23ffffff"/><path d="M22 86c0-15 12-25 28-25s28 10 28 25" fill="%23ffffff"/></svg>';
          }} />
          <span className="text-xs font-semibold hidden sm:inline text-slate-800">
            {user.name.split(' ')[0]}
          </span>
          <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
        </motion.button>) : (<motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} id="header-login-btn" onClick={() => {
          setAuthModalTab('login');
          setIsAuthModalOpen(true);
        }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#5B7BE8] hover:bg-[#3D5FD9] text-white cursor-pointer transition-all shadow-sm">
          <span>Sign In</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.button>)}
      </div>
    </div>
  </motion.header>);
};

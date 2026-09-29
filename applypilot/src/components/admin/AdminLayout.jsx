import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Briefcase, Radio, Users, Send, BarChart3, Shield, Settings, ArrowLeft, Type, FlaskConical, Menu, X, } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { AdminDashboard } from './AdminDashboard';
import { AdminJobManager } from './AdminJobManager';
import { AdminScraperControl } from './AdminScraperControl';
import { AdminUserManager } from './AdminUserManager';
import { AdminApplicationOversight } from './AdminApplicationOversight';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminAuditLog } from './AdminAuditLog';
import { AdminSystemSettings } from './AdminSystemSettings';
import { AdminContentControl } from './AdminContentControl';
import { AdminTestLab } from './AdminTestLab';
export const AdminLayout = () => {
    const { adminScreen, setAdminScreen, setAppMode, setClientScreen } = useAppStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    // Sync route with window hash so refresh or direct URL works smoothly
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash.startsWith('admin/')) {
            const screen = hash.replace('admin/', '');
            if ([
                'admin_dashboard',
                'admin_jobs',
                'admin_scrapers',
                'admin_users',
                'admin_applications',
                'admin_analytics',
                'admin_audit',
                'admin_settings',
                'admin_content',
                'admin_testlab',
            ].includes(screen)) {
                setAdminScreen(screen);
            }
        }
    }, [setAdminScreen]);
    const handleNavSelect = (key) => {
        setAdminScreen(key);
        window.location.hash = `admin/${key}`;
        setIsMobileMenuOpen(false);
    };
    const navItems = [
        { key: 'admin_dashboard', label: 'Overview & Health', icon: LayoutDashboard },
        { key: 'admin_jobs', label: 'Job Manager', icon: Briefcase },
        { key: 'admin_scrapers', label: 'Scrapers & Circuits', icon: Radio },
        { key: 'admin_users', label: 'Candidate Users', icon: Users },
        { key: 'admin_applications', label: 'Dispatch Oversight', icon: Send },
        { key: 'admin_analytics', label: 'Conversion Analytics', icon: BarChart3 },
        { key: 'admin_audit', label: 'Audit Log & Ledger', icon: Shield },
        { key: 'admin_content', label: 'Dynamic Copy / Words', icon: Type, badge: 'Live' },
        { key: 'admin_testlab', label: 'Scrapers & AI Test Lab', icon: FlaskConical, badge: 'Probes' },
        { key: 'admin_settings', label: 'System Settings', icon: Settings },
    ];
    return (<div className="min-h-screen bg-[#F1F3F9] text-[#111827] flex flex-col font-sans">
      {/* Top Admin Header Bar */}
      <header className="sticky top-0 z-50 bg-[#111827] h-12 flex items-center px-4 md:px-8 border-b border-[#2D3748] shadow-md justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu toggle */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-white/80 hover:text-white p-1" title="Toggle Menu">
            {isMobileMenuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
          </button>

          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse hidden sm:block"/>
          <span className="text-white font-bold text-sm tracking-tight flex items-center gap-1.5">
            ✦ ApplyPilot <span className="text-[10px] bg-[#EEF2FF] text-[#3D5FD9] px-2 py-0.5 rounded-full font-extrabold">ADMIN PORTAL</span>
          </span>
        </div>

        <button onClick={() => {
            window.location.hash = '';
            setAppMode('client');
            setClientScreen('analytics');
        }} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5"/>
          <span className="hidden sm:inline">Exit to Candidate Workspace</span>
          <span className="sm:hidden">Exit</span>
        </button>
      </header>

      {/* Admin Body: Sidebar + Main Canvas */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6 relative">
        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (<motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="fixed inset-y-12 left-0 z-40 w-64 bg-white border-r border-[#E5E7EB] shadow-2xl p-4 md:hidden flex flex-col space-y-1 overflow-y-auto">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Management Suite
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = adminScreen === item.key;
                return (<button key={item.key} onClick={() => handleNavSelect(item.key)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${isActive
                        ? 'bg-[#EEF2FF] text-[#3D5FD9] font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#3D5FD9]' : 'text-slate-400'}`}/>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                        {item.badge}
                      </span>)}
                  </button>);
            })}
            </motion.div>)}
        </AnimatePresence>

        {/* Desktop Left Admin Nav (240px) */}
        <aside className="hidden md:block w-60 flex-shrink-0 bg-white border border-[#E5E7EB] rounded-2xl p-3 shadow-xs self-start sticky top-16 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Management Suite
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = adminScreen === item.key;
            return (<button key={item.key} onClick={() => handleNavSelect(item.key)} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${isActive
                    ? 'bg-[#EEF2FF] text-[#3D5FD9] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#3D5FD9]' : 'text-slate-400'}`}/>
                  <span>{item.label}</span>
                </div>
                {item.badge && (<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                    {item.badge}
                  </span>)}
              </button>);
        })}
        </aside>

        {/* Main Admin Screen View */}
        <main className="flex-1 min-w-0">
          {adminScreen === 'admin_dashboard' && <AdminDashboard />}
          {adminScreen === 'admin_jobs' && <AdminJobManager />}
          {adminScreen === 'admin_scrapers' && <AdminScraperControl />}
          {adminScreen === 'admin_users' && <AdminUserManager />}
          {adminScreen === 'admin_applications' && <AdminApplicationOversight />}
          {adminScreen === 'admin_analytics' && <AdminAnalytics />}
          {adminScreen === 'admin_audit' && <AdminAuditLog />}
          {adminScreen === 'admin_content' && <AdminContentControl />}
          {adminScreen === 'admin_testlab' && <AdminTestLab />}
          {adminScreen === 'admin_settings' && <AdminSystemSettings />}
        </main>
      </div>
    </div>);
};

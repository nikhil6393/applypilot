import React from 'react';
import { useAppStore } from '../../store/appStore';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Briefcase, Cpu, Users, Eye, BarChart3, History, Settings, ArrowLeft, LogOut, } from 'lucide-react';
export const AdminSidebar = () => {
  const { activeAdminScreen, setActiveAdminScreen, setIsAdminMode } = useAppStore();
  const { user, logout } = useAuth();
  const navItems = [
    { key: 'admin_dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { key: 'admin_jobs', label: 'Job Manager', icon: Briefcase },
    { key: 'admin_scrapers', label: 'Scraper Control', icon: Cpu },
    { key: 'admin_users', label: 'User Manager', icon: Users },
    { key: 'admin_applications', label: 'Application Oversight', icon: Eye },
    { key: 'admin_analytics', label: 'Analytics & Insights', icon: BarChart3 },
    { key: 'admin_audit', label: 'Immutable Audit Log', icon: History },
    { key: 'admin_settings', label: 'System Settings', icon: Settings },
  ];
  return (<aside className="w-[240px] flex-shrink-0 bg-white border-r border-[#E5E7EB] min-h-screen flex flex-col select-none z-30">
    {/* Brand Header with Admin Red Badge */}
    <div className="h-16 px-5 border-b border-[#E5E7EB] flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-b from-[#161D2C] to-[#080C14] border-t border-white/20 border-x border-[#1E293B] border-b border-black/80 flex items-center justify-center shadow-xs">
          <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
            <ellipse cx="16" cy="24.5" rx="8" ry="2.5" fill="#000000" opacity="0.6" />
            <path d="M6 20.2V22.6L16 26.2V23.8Z" fill="#034B75" />
            <path d="M26 20.2V22.6L16 26.2V23.8Z" fill="#012A45" />
            <path d="M16 3.8L6 20.2L16 16.8V3.8Z" fill="#0284C7" />
            <path d="M16 3.8L26 20.2L16 16.8V3.8Z" fill="#0369A1" />
            <line x1="16" y1="3.8" x2="16" y2="16.8" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
            <polygon points="16,8.5 12.8,13.5 16,15.6" fill="#FFFFFF" />
            <polygon points="16,8.5 19.2,13.5 16,15.6" fill="#7DD3FC" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-extrabold text-gray-900 tracking-tight leading-none">Apply<span className="text-[#0284C7]">Pilot</span></h1>
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#FAECE7] text-[#D85A30] border border-[#F3C9BD]">
              Admin
            </span>
          </div>
          <span className="text-[10px] text-gray-500 font-medium">Ops & Governance</span>
        </div>
      </div>
    </div>

    {/* Nav List */}
    <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
      <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Administration</div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeAdminScreen === item.key;
        return (<button key={item.key} onClick={() => setActiveAdminScreen(item.key)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
          ? 'bg-[#EEEDFE] text-[#3C3489] font-semibold'
          : 'text-gray-600 hover:bg-[#F9FAFB] hover:text-gray-900'}`}>
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#7F77DD]' : 'text-gray-400'}`} />
            <span>{item.label}</span>
          </div>
        </button>);
      })}

      {/* Back to Client Mode */}
      <div className="pt-6 px-1">
        <button onClick={() => setIsAdminMode(false)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#E6F1FB] text-[#0C447C] border border-[#BCD8F6] hover:bg-[#d9ecfa] transition-colors">
          <ArrowLeft className="w-4 h-4 text-[#378ADD]" />
          Return to Candidate App
        </button>
      </div>
    </div>

    {/* Admin User Footer */}
    <div className="p-3 border-t border-[#E5E7EB] bg-[#F8FAFC]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" alt="Admin" className="w-8 h-8 rounded-lg object-cover border border-[#E5E7EB] flex-shrink-0" />
          <div className="min-w-0 text-left">
            <p className="text-xs font-semibold text-gray-900 truncate">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-gray-500 truncate">role=admin</p>
          </div>
        </div>
        <button onClick={logout} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors" title="Sign Out" aria-label="Sign Out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  </aside>);
};

import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Search,
  ChevronRight,
  Calendar,
  X,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

interface AppTopBarProps {
  onSearch?: (query: string) => void;
  dateRange?: string;
  onDateRangeChange?: (range: string) => void;
}

export const AppTopBar: React.FC<AppTopBarProps> = ({
  onSearch,
  dateRange = '30d',
  onDateRangeChange,
}) => {
  const {
    activeClientScreen,
    activeAdminScreen,
    isAdminMode,
    notifications,
    setIsNotificationDrawerOpen,
    impersonatingUser,
    setImpersonatingUser,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getBreadcrumbs = () => {
    if (isAdminMode) {
      const adminTitles: Record<string, string> = {
        'admin-dashboard': 'Overview & Scraper Health',
        'admin-jobs': 'Job Postings Repository',
        'admin-scrapers': 'Scraper Adapters Control',
        'admin-users': 'Candidate Directory',
        'admin-applications': 'Global Application Audit',
        'admin-analytics': 'Platform Performance',
        'admin-audit': 'Immutable Event Logs',
        'admin-settings': 'System & AI Configuration',
      };
      return [
        { label: 'Admin', path: 'admin-dashboard' },
        { label: adminTitles[activeAdminScreen] || 'Management' },
      ];
    }

    const clientTitles: Record<string, string> = {
      dashboard: 'Executive Dashboard',
      discovery: 'Opportunity Discovery',
      detail: 'Job Intelligence Detail',
      resume: 'Resume Studio & ATS Analysis',
      scoring: 'Fit Scoring Matrix',
      tailor: 'Resume & Cover Letter Tailoring',
      saved: 'Bookmarked Opportunities',
      profile: 'Candidate Profile & Guardrails',
      auth: 'Authentication & Onboarding',
      notifications: 'Notification History',
    };

    return [
      { label: 'Candidate Portal' },
      { label: clientTitles[activeClientScreen] || 'Workspace' },
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Impersonation Banner if active */}
      {impersonatingUser && (
        <div className="bg-[#D85A30] text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
            <span>
              Viewing as candidate: <strong className="underline">{impersonatingUser.name}</strong> ({impersonatingUser.email}) — Read-Only Mode
            </span>
          </div>
          <button
            onClick={() => setImpersonatingUser(null)}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded text-[11px] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Exit View
          </button>
        </div>
      )}

      <div className="h-16 px-6 flex items-center justify-between gap-4">
        {/* Breadcrumb Left */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 font-medium" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.label}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              <span className={idx === breadcrumbs.length - 1 ? 'font-semibold text-gray-900' : 'hover:text-gray-700'}>
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </nav>

        {/* Global Search and Actions Right */}
        <div className="flex items-center gap-3">
          {/* Global Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-64 md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isAdminMode
                  ? 'Search jobs, users, CONF-ID...'
                  : 'Search roles, skills, companies...'
              }
              className="w-full h-9 pl-9 pr-3 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#378ADD] focus:bg-white transition-all"
            />
          </form>

          {/* Admin Date Range Picker Pill */}
          {isAdminMode && onDateRangeChange && (
            <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => onDateRangeChange(r)}
                  className={`px-2 py-1 rounded font-medium transition-colors ${
                    dateRange === r ? 'bg-white text-gray-900 shadow-sm border border-[#E5E7EB]' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Notification Bell with Badge */}
          <button
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] transition-colors"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D85A30] text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

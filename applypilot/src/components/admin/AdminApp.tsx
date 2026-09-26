import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { AdminSidebar } from '../layout/AdminSidebar';
import { AppTopBar } from '../layout/AppTopBar';
import { AdminDashboard } from './AdminDashboard';
import { AdminJobManager } from './AdminJobManager';
import { AdminScraperControl } from './AdminScraperControl';
import { AdminUserManager } from './AdminUserManager';
import { AdminApplicationOversight } from './AdminApplicationOversight';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminAuditLog } from './AdminAuditLog';
import { AdminSystemSettings } from './AdminSystemSettings';

export const AdminApp: React.FC = () => {
  const { activeAdminScreen } = useAppStore();
  const [dateRange, setDateRange] = useState('30d');

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-gray-900 font-sans">
      {/* Admin Sidebar (240px white with red badge) */}
      <AdminSidebar />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopBar dateRange={dateRange} onDateRangeChange={setDateRange} />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {activeAdminScreen === 'admin-dashboard' && <AdminDashboard />}
          {activeAdminScreen === 'admin-jobs' && <AdminJobManager />}
          {activeAdminScreen === 'admin-scrapers' && <AdminScraperControl />}
          {activeAdminScreen === 'admin-users' && <AdminUserManager />}
          {activeAdminScreen === 'admin-applications' && <AdminApplicationOversight />}
          {activeAdminScreen === 'admin-analytics' && <AdminAnalytics />}
          {activeAdminScreen === 'admin-audit' && <AdminAuditLog />}
          {activeAdminScreen === 'admin-settings' && <AdminSystemSettings />}
        </main>
      </div>
    </div>
  );
};

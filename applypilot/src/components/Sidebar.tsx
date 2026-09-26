import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Search,
  Zap,
  Sparkles,
  Send,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { StepKey } from './Navbar';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentStep: StepKey;
  onSelectStep: (step: StepKey) => void;
  jobCount?: number;
  scoredCount?: number;
  tailoredCount?: number;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentStep,
  onSelectStep,
  jobCount = 0,
  scoredCount = 0,
  tailoredCount = 0,
  onOpenSettings,
}) => {
  const { user } = useAuth();

  const navItems: { id: StepKey; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'analytics', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'resume', label: 'Resume Studio', icon: FileText },
    { id: 'discovery', label: 'Job Feed', icon: Search, badge: jobCount > 0 ? jobCount : undefined },
    { id: 'scoring', label: 'Fit Score', icon: Zap, badge: scoredCount > 0 ? scoredCount : undefined },
    { id: 'tailor', label: 'Bulk Tailor', icon: Sparkles, badge: tailoredCount > 0 ? tailoredCount : undefined },
  ];

  const userName = user?.name || 'Nikhil Sharma';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <aside
      className="w-[240px] shrink-0 h-screen sticky top-0 bg-white border-r border-[#E5E7EB] flex flex-col justify-between z-30 select-none"
      style={{ width: '240px' }}
    >
      {/* Top Header with Wordmark Only (No Icon) */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <span className="font-display font-semibold text-xl tracking-tight text-[#0F172A]">
            ApplyPilot
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E6F1FB] text-[#378ADD]">
            PRO
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentStep === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectStep(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-[#E6F1FB] text-[#378ADD]'
                  : 'text-[#475569] hover:bg-[#F9FAFB] hover:text-[#0F172A]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-[#378ADD]' : 'text-[#64748B]'
                  }`}
                  strokeWidth={1.8}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                    isActive
                      ? 'bg-[#378ADD] text-white'
                      : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User Area */}
      <div className="p-3 border-t border-[#E5E7EB] bg-white">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F9FAFB] transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#E6F1FB] text-[#378ADD] font-bold text-xs flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[#0F172A] truncate">
                {userName}
              </div>
              <div className="text-[11px] text-[#64748B] truncate">
                {user?.email || 'nikhil900285@gmail.com'}
              </div>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Account Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

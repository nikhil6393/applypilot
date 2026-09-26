import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Trash2, ExternalLink, Zap, Shield, Briefcase } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export const NotificationDrawer: React.FC = () => {
  const {
    notifications,
    isNotificationDrawerOpen,
    setIsNotificationDrawerOpen,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    setClientScreen,
  } = useAppStore();

  if (!isNotificationDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="w-full max-w-sm bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#5B7BE8]" />
            <span className="font-bold text-sm text-[#111827]">Live Telemetry &amp; Alerts</span>
          </div>
          <button
            onClick={() => setIsNotificationDrawerOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action strip */}
        <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <button
            onClick={markAllNotificationsRead}
            className="hover:text-[#5B7BE8] font-semibold cursor-pointer"
          >
            Mark all read
          </button>
          <button
            onClick={clearNotifications}
            className="hover:text-[#F43F5E] font-semibold cursor-pointer"
          >
            Clear all
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <span>No notifications in current session</span>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  markNotificationRead(n.id);
                  if (n.linkStep) {
                    setClientScreen(n.linkStep);
                    setIsNotificationDrawerOpen(false);
                  }
                }}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  n.read
                    ? 'bg-slate-50/70 border-slate-200/60 text-slate-600'
                    : 'bg-[#EEF2FF]/60 border-[#5B7BE8]/30 text-slate-900 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] truncate flex items-center gap-1.5">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#5B7BE8]" />}
                    {n.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{n.message}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

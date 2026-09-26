import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Type,
  Sliders,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  CheckCircle2,
  Radio,
  ToggleLeft,
  ToggleRight,
  Shield,
  Megaphone,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export const AdminContentControl: React.FC = () => {
  const { addToast } = useAppStore();

  const [heroTitle, setHeroTitle] = useState('Find Your Next Opportunity');
  const [heroSubtitle, setHeroSubtitle] = useState('Verified tech roles aggregated across LinkedIn, Naukri, Greenhouse, Lever, Ashby, and top startup networks.');
  const [findJobsButtonText, setFindJobsButtonText] = useState('Find Jobs');
  const [liveIndexBadgeText, setLiveIndexBadgeText] = useState('Live Job Index');
  const [bannerAlert, setBannerAlert] = useState('🔥 High hiring volume detected: 60+ fresh software & AI engineering positions indexed today!');
  const [bannerAlertEnabled, setBannerAlertEnabled] = useState(true);

  // Feature Flags
  const [flags, setFlags] = useState({
    enableLiveScraping: true,
    enableEasyApply: true,
    enableAutoRefresh: true,
    enableCustomScraper: true,
    maintenanceMode: false,
    strictBatchFilter: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load active server configuration on mount
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/admin/content/words')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.content) {
          setHeroTitle(data.content.heroTitle || 'Find Your Next Opportunity');
          setHeroSubtitle(data.content.heroSubtitle || '');
          setFindJobsButtonText(data.content.findJobsButtonText || 'Find Jobs');
          setLiveIndexBadgeText(data.content.liveIndexBadgeText || 'Live Job Index');
          setBannerAlert(data.content.bannerAlert || '');
          setBannerAlertEnabled(data.content.bannerAlertEnabled ?? true);
        }
        if (data.featureFlags) {
          setFlags((prev) => ({ ...prev, ...data.featureFlags }));
        }
      })
      .catch((err) => console.warn('Could not load server content config:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/content/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroTitle,
          heroSubtitle,
          findJobsButtonText,
          liveIndexBadgeText,
          bannerAlert,
          bannerAlertEnabled,
          featureFlags: flags,
        }),
      });

      const data = await res.json();
      if (data.success) {
        addToast({
          title: 'Live Content & Words Updated',
          message: 'Changes published and broadcasted to candidate workspace feeds',
          type: 'success',
        });
      } else {
        addToast({ title: 'Save Warning', message: data.error, type: 'warning' });
      }
    } catch (err: any) {
      addToast({ title: 'Save Error', message: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setHeroTitle('Find Your Next Opportunity');
    setHeroSubtitle('Verified tech roles aggregated across LinkedIn, Naukri, Greenhouse, Lever, Ashby, and top startup networks.');
    setFindJobsButtonText('Find Jobs');
    setLiveIndexBadgeText('Live Job Index');
    setBannerAlert('🔥 High hiring volume detected: 60+ fresh software & AI engineering positions indexed today!');
    setBannerAlertEnabled(true);
    setFlags({
      enableLiveScraping: true,
      enableEasyApply: true,
      enableAutoRefresh: true,
      enableCustomScraper: true,
      maintenanceMode: false,
      strictBatchFilter: false,
    });
    addToast({ title: 'Defaults Restored', message: 'Click Save to push defaults to server', type: 'info' });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#EEF2FF] text-[#3D5FD9]">
              <Type className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-[#111827]">Dynamic Section &amp; Word Testing Controls</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            A/B test different copy, headlines, badge text, and call-to-actions live on candidate screens without code deployment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5B7BE8] to-[#3D5FD9] hover:from-[#4b6cdb] hover:to-[#2b4ec7] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Publishing Changes...' : 'Save & Publish Copy ⚡'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Word & Copy Customization Form */}
        <div className="space-y-5">
          {/* 1. Hero Section Wording */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Type className="w-4 h-4 text-[#5B7BE8]" />
              <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                Hero Section Headline &amp; Subtitle Testing
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Primary Hero Title (h1)
                </label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="e.g. Find Your Next Opportunity"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Hero Subtitle Description
                </label>
                <textarea
                  rows={2}
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  placeholder="Subtitle explaining the aggregated job sources..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none text-slate-800 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Search CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={findJobsButtonText}
                    onChange={(e) => setFindJobsButtonText(e.target.value)}
                    placeholder="Find Jobs"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Live Status Badge Text
                  </label>
                  <input
                    type="text"
                    value={liveIndexBadgeText}
                    onChange={(e) => setLiveIndexBadgeText(e.target.value)}
                    placeholder="Live Job Index"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Real-time Announcement Banner */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                  Live Announcement Banner
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBannerAlertEnabled(!bannerAlertEnabled)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer"
              >
                <span>{bannerAlertEnabled ? 'Enabled' : 'Disabled'}</span>
                {bannerAlertEnabled ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">
                Banner Message (Broadcasted to all candidates)
              </label>
              <input
                type="text"
                value={bannerAlert}
                onChange={(e) => setBannerAlert(e.target.value)}
                placeholder="Alert text displayed at the top of candidate feeds..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium"
              />
            </div>
          </div>

          {/* 3. Section Feature Flags */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                Section Feature Flags &amp; Toggles
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { key: 'enableLiveScraping', label: 'Live Scrapers SSE Feed', desc: 'Allows streaming real-time jobs' },
                { key: 'enableEasyApply', label: 'Playwright Auto-Apply', desc: 'Automated 1-click bot submission' },
                { key: 'enableAutoRefresh', label: '90s Auto-Sync Crons', desc: 'Background polling interval' },
                { key: 'enableCustomScraper', label: 'Custom URL Importer', desc: 'Precision JD text scraper' },
                { key: 'strictBatchFilter', label: 'Strict Batch 2024-2028', desc: 'Enforce undergrad filter' },
                { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Read-only candidate access' },
              ].map((flag) => {
                const isEnabled = (flags as any)[flag.key];
                return (
                  <div
                    key={flag.key}
                    onClick={() => setFlags((prev) => ({ ...prev, [flag.key]: !isEnabled }))}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{flag.label}</div>
                      <div className="text-[11px] text-slate-500">{flag.desc}</div>
                    </div>
                    {isEnabled ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulated Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Candidate Feed Preview (What Users See)
            </h3>
          </div>

          <div className="p-6 bg-slate-100/90 border border-slate-300 rounded-2xl shadow-inner space-y-4">
            {/* Live Banner Preview */}
            {bannerAlertEnabled && bannerAlert && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs"
              >
                <span>{bannerAlert}</span>
                <span className="text-[10px] font-bold bg-emerald-200/60 px-2 py-0.5 rounded-full text-emerald-800">
                  LIVE
                </span>
              </motion.div>
            )}

            {/* Simulated Hero Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {liveIndexBadgeText} | 60 active
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Auto-Sync (90s) On</span>
              </div>

              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {heroTitle}
              </h1>

              <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                {heroSubtitle}
              </p>

              {/* Simulated Search Box */}
              <div className="pt-2 flex items-center gap-2">
                <div className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400">
                  Search positions by role or keywords...
                </div>
                <div className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs">
                  {findJobsButtonText}
                </div>
              </div>
            </div>

            {/* Feature Flags Status Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Active Feature Flags Policy
              </span>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className={`px-2 py-0.5 rounded-md font-semibold ${flags.enableLiveScraping ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  Live Scraping: {flags.enableLiveScraping ? 'ON' : 'OFF'}
                </span>
                <span className={`px-2 py-0.5 rounded-md font-semibold ${flags.enableEasyApply ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  Auto-Apply Bot: {flags.enableEasyApply ? 'ON' : 'OFF'}
                </span>
                <span className={`px-2 py-0.5 rounded-md font-semibold ${flags.maintenanceMode ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  Maintenance: {flags.maintenanceMode ? 'ACTIVE' : 'NORMAL'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

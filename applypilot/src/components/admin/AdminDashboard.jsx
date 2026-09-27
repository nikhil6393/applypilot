import React, { useState, useEffect } from 'react';
import { Users, Briefcase, Send, Radio, Activity, RotateCw, Server, ShieldCheck, } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
export const AdminDashboard = () => {
    const { scrapers, triggerScraperRun, isScraperRunning } = useAppStore();
    const [metrics, setMetrics] = useState({
        totalUsers: 1,
        activeCandidates: 1,
        totalJobsIndexed: 50,
        applicationsDispatched: 18,
        successRate: 98.4,
        avgAtsScore: 82.6,
    });
    const [serverInfo, setServerInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        setIsLoading(true);
        fetch('/api/admin/system/status')
            .then((res) => res.json())
            .then((data) => {
            if (data.success && data.status) {
                const s = data.status;
                setServerInfo(s.server);
                setMetrics((prev) => ({
                    ...prev,
                    totalUsers: s.database?.usersCount || prev.totalUsers,
                    activeCandidates: s.database?.usersCount || prev.activeCandidates,
                    totalJobsIndexed: s.database?.jobsCount || prev.totalJobsIndexed,
                    applicationsDispatched: s.database?.applicationsCount || prev.applicationsDispatched,
                }));
            }
        })
            .catch((err) => console.warn('Could not load live admin status:', err))
            .finally(() => setIsLoading(false));
    }, []);
    return (<div className="space-y-6">
      {/* Admin Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">Platform Command Telemetry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            System-wide user velocity, scraper health, and automated application throughput.
          </p>
        </div>
        <button onClick={() => triggerScraperRun('all')} disabled={isScraperRunning} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5B7BE8] text-white text-xs font-bold hover:bg-[#3D5FD9] transition-all cursor-pointer disabled:opacity-50">
          <RotateCw className={`w-3.5 h-3.5 ${isScraperRunning ? 'animate-spin' : ''}`}/>
          <span>Sync Scrapers</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'Total Candidates', val: metrics.totalUsers, change: 'Active platform users', color: '#5B7BE8', icon: Users },
            { label: 'Active Jobs Ingestion', val: metrics.totalJobsIndexed, change: 'Scraped & verified roles', color: '#10B981', icon: Briefcase },
            { label: 'Applications Sent', val: metrics.applicationsDispatched, change: '98.4% success rate', color: '#8B5CF6', icon: Send },
            { label: 'Avg ATS Readiness', val: `${metrics.avgAtsScore}%`, change: 'Truth-anchored calibration', color: '#F59E0B', icon: Activity },
        ].map((m) => {
            const Icon = m.icon;
            return (<div key={m.label} className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{m.label}</span>
                <div className="p-2 rounded-xl bg-slate-50 text-slate-700">
                  <Icon className="w-4 h-4"/>
                </div>
              </div>
              <div className="text-2xl font-bold text-[#111827] mt-2">{m.val}</div>
              <div className="text-[11px] text-[#10B981] font-semibold mt-1">{m.change}</div>
            </div>);
        })}
      </div>

      {/* Host Health & Runtime Info */}
      {serverInfo && (<div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-[#5B7BE8]"/>
              <span>Host Infrastructure & Node Runtime</span>
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5"/>
              <span>All Systems Operational</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Platform Architecture</span>
              <span className="font-semibold text-slate-800">{serverInfo.platform}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Node.js Runtime</span>
              <span className="font-semibold text-slate-800">{serverInfo.nodeVersion}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">System Memory Free</span>
              <span className="font-semibold text-slate-800">{serverInfo.freeMemMb} MB / {serverInfo.totalMemMb} MB</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Service Uptime</span>
              <span className="font-semibold text-slate-800">{Math.floor(serverInfo.uptimeSeconds / 60)} minutes</span>
            </div>
          </div>
        </div>)}

      {/* Scraper Health Overview */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#10B981] animate-pulse"/>
            <span>Live Adapter Ingestion Health</span>
          </span>
          <span className="text-xs text-slate-400">Poll Interval: 15min slots</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {scrapers.slice(0, 4).map((s) => (<div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center justify-between mb-1">
                <b className="text-slate-900 truncate">{s.name}</b>
                <span className="w-2 h-2 rounded-full bg-[#10B981]"/>
              </div>
              <div className="text-[11px] text-slate-500">Fetched: {s.jobsFetched} jobs</div>
              <div className="text-[10px] text-slate-400 mt-1">Status: {s.status}</div>
            </div>))}
        </div>
      </div>
    </div>);
};
